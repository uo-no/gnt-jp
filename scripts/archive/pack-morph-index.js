#!/usr/bin/env node
/**
 * pack-morph-index.js — morph-index を 2 文字プレフィックスバケットに再構成
 *
 * 目的:
 *   Cloudflare Pages の 20,000 ファイル制限に対応するため、
 *   word/ と lemma/ の個別キー単位 JSON（計 57,000 ファイル超）を
 *   「先頭 2 文字プレフィックス単位のバケットファイル」に統合する。
 *
 * 出力形式:
 *   通常  : morph-index/{type}/{prefix8}.json
 *             → { "hexKey1": [...TokenEntry], "hexKey2": [...] }
 *   大容量 : morph-index/{type}/{prefix8}/index.json + part_N.json
 *             → index.json: { "parts": ["part_1.json", ...] }
 *             → part_N.json: { "hexKey": [...TokenEntry], ... }
 *
 * 規則:
 *   - prefix8 = hexKey の先頭 8 文字（先頭 2 ギリシャ文字に相当）
 *   - hexKey が 8 文字未満（1 文字語）の場合は hexKey 自身が prefix8
 *   - バケット JSON のバイトサイズが SIZE_LIMIT を超えたら自動分割
 *   - 既存の split 形式（index.json + part_N.json / array）も正しく読み込む
 *
 * 実行:
 *   node scripts/pack-morph-index.js
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MORPH_DIR  = path.join(PUBLIC_DIR, 'morph-index');
const SIZE_LIMIT = 8 * 1024 * 1024; // 8MB

// ── データ読み込み ──────────────────────────────────────────────────

/**
 * 個別キーファイル（旧形式）からデータを読み込む。
 *
 * 優先順位:
 *   1. {hexKey}.json が配列 → 個別キーファイルとして採用
 *   2. {hexKey}/ ディレクトリの parts が全て配列 → オリジナル split として採用
 *   3. 上記以外（オブジェクト形式のバケットファイル/ディレクトリ）→ null
 *
 * ポイント: git checkout 後に残る未追跡バケットファイル/ディレクトリは
 * オブジェクト形式なので自動スキップされる。
 *
 * @returns {Array|null} TokenEntry の配列、または採用不可の場合 null
 */
function readKeyData(typeDir, hexKey) {
    /* 1. 単体ファイルを優先確認（オリジナル個別キーファイル or 未追跡バケットファイル） */
    const singleFile = path.join(typeDir, `${hexKey}.json`);
    if (fs.existsSync(singleFile)) {
        const data = JSON.parse(fs.readFileSync(singleFile, 'utf8'));
        if (Array.isArray(data)) return data; // 個別キーファイル（配列）→ 採用
        /* オブジェクトの場合はバケットファイル → スルーして split dir を確認 */
    }

    /* 2. split ディレクトリを確認（オリジナル split or 未追跡バケット split） */
    const splitDir  = path.join(typeDir, hexKey);
    const indexFile = path.join(splitDir, 'index.json');
    if (fs.existsSync(indexFile)) {
        const idx = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
        if (Array.isArray(idx.parts)) {
            const parts = idx.parts.map(p =>
                JSON.parse(fs.readFileSync(path.join(splitDir, p), 'utf8'))
            );
            /* 全 part が配列 → オリジナル split → 採用 */
            if (parts.every(p => Array.isArray(p))) return parts.flat();
            /* part がオブジェクト → バケット split ディレクトリ → スキップ */
        }
    }

    return null;
}

// ── バケット分割 ────────────────────────────────────────────────────

/**
 * バケットオブジェクトを SIZE_LIMIT 以内の part 配列に分割する。
 *
 * 通常ケース: 複数キーをサイズ上限でグループ化。
 * 特殊ケース: 単一キーの値（配列）が SIZE_LIMIT を超える場合、
 *             同一キーを持つ複数の part に配列を分割する。
 *             クライアント側で同キーの配列を concat してマージする。
 */
function splitBucket(bucketObj) {
    const totalJson = JSON.stringify(bucketObj);
    if (Buffer.byteLength(totalJson, 'utf8') <= SIZE_LIMIT) return [bucketObj];

    const parts   = [];
    let current   = {};
    let curSize   = 2; // {}

    for (const [k, v] of Object.entries(bucketObj)) {
        const kJson   = JSON.stringify(k);
        const vJson   = JSON.stringify(v);
        const kSize   = Buffer.byteLength(kJson, 'utf8');
        const vSize   = Buffer.byteLength(vJson, 'utf8');
        const entrySize = kSize + 1 + vSize; // "key":value

        if (entrySize > SIZE_LIMIT) {
            /* 単一キーの値が上限超 → current をフラッシュして配列を均等分割 */
            if (Object.keys(current).length > 0) {
                parts.push(current);
                current = {};
                curSize = 2;
            }
            const usable = SIZE_LIMIT - kSize - 10; // キーと区切り分を引く
            const N      = Math.ceil(vSize / usable);
            const stride = Math.ceil(v.length / N);
            for (let i = 0; i < v.length; i += stride) {
                parts.push({ [k]: v.slice(i, i + stride) });
            }
        } else {
            /* 通常エントリ: current に収まらなければフラッシュ */
            const sep = Object.keys(current).length > 0 ? 1 : 0;
            if (Object.keys(current).length > 0 && curSize + sep + entrySize > SIZE_LIMIT) {
                parts.push(current);
                current = {};
                curSize = 2;
            }
            current[k] = v;
            curSize += (Object.keys(current).length > 1 ? 1 : 0) + entrySize;
        }
    }
    if (Object.keys(current).length > 0) parts.push(current);
    return parts;
}

// ── バケット書き込み ────────────────────────────────────────────────

/**
 * バケットオブジェクトをファイルに書き込む。
 * SIZE_LIMIT 超過時は {prefix}/index.json + part_N.json に分割。
 */
function writeBucket(outDir, prefix, bucketObj) {
    const json = JSON.stringify(bucketObj);
    const size = Buffer.byteLength(json, 'utf8');

    if (size <= SIZE_LIMIT) {
        fs.writeFileSync(path.join(outDir, `${prefix}.json`), json, 'utf8');
        return { totalFiles: 1, split: false };
    }

    // 分割
    const parts    = splitBucket(bucketObj);
    const splitDir = path.join(outDir, prefix);
    fs.mkdirSync(splitDir, { recursive: true });

    const partNames = parts.map((partObj, i) => {
        const name = `part_${i + 1}.json`;
        fs.writeFileSync(path.join(splitDir, name), JSON.stringify(partObj), 'utf8');
        return name;
    });
    fs.writeFileSync(
        path.join(splitDir, 'index.json'),
        JSON.stringify({ parts: partNames }),
        'utf8'
    );

    return { totalFiles: 1 + partNames.length, split: true, partCount: parts.length };
}

// ── ディレクトリ単位処理 ────────────────────────────────────────────

function packDirectory(typeName) {
    const typeDir = path.join(MORPH_DIR, typeName);
    const t0 = Date.now();

    // 既存キーを列挙
    const allKeys = new Map(); // hexKey -> 'file' | 'dir'
    for (const entry of fs.readdirSync(typeDir)) {
        const full = path.join(typeDir, entry);
        if (entry.endsWith('.json') && fs.statSync(full).isFile()) {
            allKeys.set(entry.slice(0, -5), 'file');
        } else if (fs.statSync(full).isDirectory()) {
            const idxPath = path.join(full, 'index.json');
            if (fs.existsSync(idxPath)) allKeys.set(entry, 'dir');
        }
    }
    console.log(`[${typeName}] ${allKeys.size} キー検出`);

    // プレフィックスでグループ化
    const prefixGroups = new Map();
    for (const key of allKeys.keys()) {
        const prefix = key.length >= 8 ? key.slice(0, 8) : key;
        if (!prefixGroups.has(prefix)) prefixGroups.set(prefix, []);
        prefixGroups.get(prefix).push(key);
    }
    console.log(`[${typeName}] ${prefixGroups.size} バケットに集約`);

    // 一時ディレクトリに書き出し（ソースと分離して安全に処理）
    const tmpDir = path.join(MORPH_DIR, `${typeName}_tmp`);
    if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    let totalFiles = 0;
    let splitCount = 0;
    let bucketsDone = 0;

    for (const [prefix, keys] of [...prefixGroups].sort()) {
        // バケットオブジェクト構築
        const bucketObj = {};
        for (const key of keys.sort()) {
            const data = readKeyData(typeDir, key);
            if (data !== null) bucketObj[key] = data;
        }
        if (Object.keys(bucketObj).length === 0) continue;

        const result = writeBucket(tmpDir, prefix, bucketObj);
        totalFiles += result.totalFiles;
        if (result.split) splitCount++;

        bucketsDone++;
        if (bucketsDone % 50 === 0) {
            process.stdout.write(`  [${typeName}] ${bucketsDone}/${prefixGroups.size} 処理済...\r`);
        }
    }
    process.stdout.write('\n');

    /* 安全チェック: tmpDir が空の場合はソースデータ異常として中断 */
    const tmpJson = fs.readdirSync(tmpDir, { recursive: true })
        .filter(f => String(f).endsWith('.json')).length;
    if (tmpJson === 0) {
        fs.rmSync(tmpDir, { recursive: true });
        console.error(`[${typeName}] [ERROR] 有効なバケットが0件でした。ソースデータを確認してください。`);
        console.error(`[${typeName}]         個別キーファイルが存在しない可能性があります（git checkout で復元してください）。`);
        process.exitCode = 1;
        return 0;
    }

    // 旧ディレクトリを一時ディレクトリで置き換え
    fs.rmSync(typeDir, { recursive: true });
    fs.renameSync(tmpDir, typeDir);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`[${typeName}] 完了: ${totalFiles} ファイル（分割バケット ${splitCount} 件）[${elapsed}秒]`);
    return totalFiles;
}

// ── エントリポイント ────────────────────────────────────────────────

const tStart = Date.now();
console.log('[INFO] morph-index バケット化 開始');
console.log(`[INFO] 対象: ${MORPH_DIR}`);
console.log(`[INFO] バケット上限: ${SIZE_LIMIT / 1024 / 1024}MB`);

const lemmaFiles = packDirectory('lemma');
const wordFiles  = packDirectory('word');

const total   = lemmaFiles + wordFiles;
const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
console.log(`[OK] 全完了: lemma=${lemmaFiles}, word=${wordFiles}, 計=${total} ファイル [${elapsed}秒]`);
