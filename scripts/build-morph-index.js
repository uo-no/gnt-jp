#!/usr/bin/env node
/**
 * build-morph-index.js — morph-search.html 用の語形/レンマ事前インデックス生成
 *
 * 目的:
 *   morph-search.html は従来、語形/レンマを1つ検索するだけでも
 *   全書物（NT27書+OT39書、約451MB・616,644トークン）を毎回ロードしていた。
 *   本スクリプトはビルド時に1回だけ bible_data 全体をスキャンし、
 *   正規化済みレンマ/語形をキーとした軽量インデックスを事前生成する。
 *   morph-search.html は実行時、該当する1ファイルのみをfetchすればよくなる。
 *
 * 出力構造:
 *   morph-index/lemma/{hexKey}.json … TokenEntry[]（normalizeGreek(lemma) が hexKey の語の全出現）
 *   morph-index/word/{hexKey}.json  … TokenEntry[]（normalizeGreek(word||normalized||text) が hexKey の語の全出現）
 *   {hexKey} は正規化後キーの各文字の Unicode コードポイント（16進4桁、大文字）を連結したもの。
 *   ASCII以外の文字をファイル名に使わないことで、ファイルシステム/Git/URLの
 *   いずれでも安全に扱える。
 *
 *   先頭1文字だけでバケット化する方式も検討したが、実データで検証した結果
 *   1ファイルが70MBを超えるケース（頻出語の影響で同じ先頭文字の語がまとめて
 *   肥大化する）が確認されたため、正規化キー単位（1キー=1ファイル）に変更した。
 *
 * 実行:
 *   node build-morph-index.js
 *
 * morph-search.html の matchEntry 系ロジック（normalizeGreek）と
 * 完全に同じ正規化規則を使用しなければ結果が変わってしまうため、
 * normalizeGreek はここで独立に再実装せず、本ファイル内で
 * morph-search.html と一字一句同じ定義を保持する（手動同期が必要な箇所）。
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const BOOKS_JSON = path.join(ROOT, 'books.json');
const OUT_DIR    = path.join(ROOT, 'morph-index');

if (!fs.existsSync(BOOKS_JSON)) {
    console.error(`[ERROR] books.json が見つかりません: ${BOOKS_JSON}`);
    process.exit(1);
}
const booksMaster = JSON.parse(fs.readFileSync(BOOKS_JSON, 'utf8'));
const ALL_BOOKS = [...booksMaster.NT, ...booksMaster.OT].map(b => ({ key: b.key, ch: b.chapters }));
const NT_BOOKS  = new Set(booksMaster.NT.map(b => b.key));

/* ── normalizeGreek: morph-search.html と同一実装（必ず同期を保つこと） ── */
function normalizeGreek(str) {
    return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[⸀⸁⸂⸃⌈⌉.,;:·]/g,'').replace(/ς/g,'σ').toLowerCase().trim();
}

/* ── hexEncodeKey: morph-search.html と同一実装（必ず同期を保つこと） ── */
function hexEncodeKey(normalizedKey) {
    let out = '';
    for (const ch of normalizedKey) {
        out += ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
    }
    return out || '0000';
}

function bibleDataPath(bookKey, ch) {
    const sub = NT_BOOKS.has(bookKey) ? 'nt' : 'lxx';
    return path.join(ROOT, 'bible_data', sub, bookKey, `${ch}.json`);
}

function main() {
    const startTime = Date.now();
    const lemmaIndex = new Map(); // normLemma -> Entry[]
    const wordIndex  = new Map(); // normWord  -> Entry[]

    function pushInto(map, key, entry) {
        let arr = map.get(key);
        if (!arr) { arr = []; map.set(key, arr); }
        arr.push(entry);
    }

    let totalTokens = 0;
    let totalChapters = 0;
    let failedChapters = 0;

    for (const b of ALL_BOOKS) {
        for (let c = 1; c <= b.ch; c++) {
            const filePath = bibleDataPath(b.key, c);
            let data;
            try {
                data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (e) {
                console.error(`[ERROR] 読み込み失敗: ${filePath} — ${e.message}`);
                failedChapters++;
                continue;
            }
            if (!Array.isArray(data)) {
                console.error(`[ERROR] 配列ではない: ${filePath}`);
                failedChapters++;
                continue;
            }
            totalChapters++;
            for (const entry of data) {
                entry._bookKey = b.key;
                const normLemma = normalizeGreek(entry.lemma || '');
                pushInto(lemmaIndex, normLemma, entry);
                const normWord = normalizeGreek(entry.word || entry.normalized || entry.text || '');
                pushInto(wordIndex, normWord, entry);
                totalTokens++;
            }
        }
    }

    console.log(`[INFO] 章数: ${totalChapters}（失敗 ${failedChapters}）, トークン数: ${totalTokens}`);
    if (failedChapters > 0) {
        console.error(`[ERROR] ${failedChapters} 章の読み込みに失敗しました。インデックスは不完全です。`);
    }

    fs.mkdirSync(path.join(OUT_DIR, 'lemma'), { recursive: true });
    fs.mkdirSync(path.join(OUT_DIR, 'word'),  { recursive: true });

    function writeIndex(map, subdir) {
        for (const [key, arr] of map) {
            const outPath = path.join(OUT_DIR, subdir, `${hexEncodeKey(key)}.json`);
            fs.writeFileSync(outPath, JSON.stringify(arr));
        }
        return map.size;
    }

    const lemmaFileCount = writeIndex(lemmaIndex, 'lemma');
    const wordFileCount  = writeIndex(wordIndex, 'word');

    console.log(`[OK] lemma ファイル: ${lemmaFileCount}, word ファイル: ${wordFileCount}`);
    console.log(`[OK] 出力先: ${OUT_DIR}`);
    console.log(`[OK] 完了: ${((Date.now() - startTime) / 1000).toFixed(1)}秒`);

    if (failedChapters > 0) process.exitCode = 1;
}

main();
