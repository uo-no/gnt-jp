#!/usr/bin/env node
/**
 * concept-audit.cjs — Concept データ品質監査（Pattern Search Phase 4-4）
 *
 * 実行: node scripts/concept-audit.cjs
 * 出力: scripts/output/concept-audit.{md,json} ＋ コンソール要約
 * 終了コード: FAIL が1件でもあれば 1
 *
 * 目的: search-concepts.json が 30〜50 概念へ拡張されても破綻しないよう、
 *       wallace-coverage.cjs と同じ思想でデータ整合性を機械監査する。
 *
 * 監査レイヤー専用（読み取りのみ）:
 *   検索処理・UI・データモデルには一切影響しない。
 *   参照するのは search-concepts.json（監査対象）と
 *   lemma_dict.json / search-patterns.json / syntax-registry.json（照合用・参照のみ）。
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT    = path.join(__dirname, 'output');

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

/* --input <path>: 監査対象の差し替え（検出ルール自体の自己テスト用。既定は本番データ） */
const _argIdx = process.argv.indexOf('--input');
const CONCEPTS_PATH = (_argIdx !== -1 && process.argv[_argIdx + 1])
    ? path.resolve(process.argv[_argIdx + 1])
    : path.join(PUBLIC, 'assets', 'data', 'search-concepts.json');

const conceptsFile = readJson(CONCEPTS_PATH);
const lemmaDict    = readJson(path.join(PUBLIC, 'bible_data', 'lemma_dict.json'));
const patternsFile = readJson(path.join(PUBLIC, 'assets', 'data', 'search-patterns.json'));
const registry     = readJson(path.join(PUBLIC, 'assets', 'data', 'syntax-registry.json'));
const clusterIndex = readJson(path.join(PUBLIC, 'assets', 'data', 'index', 'domains-cluster-index.json'));
const domainLabels = readJson(path.join(PUBLIC, 'assets', 'data', 'index', 'semantic-domain-labels.json'));

const concepts   = Array.isArray(conceptsFile.concepts) ? conceptsFile.concepts : [];
const patternIds = new Set((patternsFile.patterns || []).map(p => p.id));

/* Wallace Registry の全 typeId → label_ja（参照のみ。search-tool の _synGetTypeDef と同じ走査） */
const registryTypes = new Map();
for (const cat of Object.values(registry.categories || {})) {
    for (const sc of (cat.subcategories || [])) {
        for (const t of (sc.types || [])) {
            if (t.id) registryTypes.set(t.id, t.label_ja || '');
        }
    }
}

/* ── 収集器 ── */
const fails = [], warnings = [], infos = [];
const FAIL = m => fails.push(m);
const WARN = m => warnings.push(m);
const INFO = m => infos.push(m);

const ARRAY_FIELDS = ['aliases', 'terms', 'patterns', 'domains', 'syntaxTypes', 'related', 'children'];
const TERM_AXES    = new Set(['lemma', 'japanese', 'strong', 'morph']);

/* ── 1. Schema Validation ── */
for (const c of concepts) {
    const tag = c && c.id ? c.id : '(id欠落)';
    if (!c || typeof c.id !== 'string' || !c.id) FAIL(`[schema] id が欠落/型違い: ${JSON.stringify(c).slice(0, 60)}`);
    if (!c || typeof c.label !== 'string' || !c.label) FAIL(`[schema] ${tag}: label が欠落/型違い`);
    for (const f of ARRAY_FIELDS) {
        if (!Array.isArray(c?.[f])) FAIL(`[schema] ${tag}: ${f} が配列でない`);
    }
    if (Array.isArray(c?.terms) && c.terms.length === 0) FAIL(`[schema] ${tag}: terms が空（必須）`);
}

/* ── 2. ID 重複 ── */
const idSeen = new Map();
for (const c of concepts) {
    if (!c?.id) continue;
    idSeen.set(c.id, (idSeen.get(c.id) || 0) + 1);
}
for (const [id, n] of idSeen) if (n > 1) FAIL(`[id] 重複: ${id}（${n}回）`);
const ids = new Set(idSeen.keys());

/* ── 3. Alias 重複（label も発火語なので同じ名前空間で衝突検査） ── */
const aliasOwners = new Map();   // 発火語 → [conceptId]
for (const c of concepts) {
    if (!c?.id) continue;
    const fireWords = [c.label, ...(Array.isArray(c.aliases) ? c.aliases : [])].filter(Boolean);
    for (const w of fireWords) {
        if (!aliasOwners.has(w)) aliasOwners.set(w, []);
        aliasOwners.get(w).push(c.id);
    }
}
for (const [w, owners] of aliasOwners) {
    if (owners.length > 1) FAIL(`[alias] 発火語「${w}」が複数概念で衝突: ${owners.join(', ')}`);
}

/* ── 3.5 Alias 品質検査（Phase 6-1）──
   aliases は「日本語の概念揺れ」を吸収する高信頼な発火語のみを置く。
   型・空文字・前後空白・同一概念内の重複（label 含む）は FAIL。
   1文字 alias は曖昧になりやすいため WARNING（label の1文字漢字は対象外）。 */
for (const c of concepts) {
    if (!c?.id) continue;
    const seen = new Set([c.label]);
    for (const a of (Array.isArray(c.aliases) ? c.aliases : [])) {
        if (typeof a !== 'string') { FAIL(`[alias-q] ${c.id}: 文字列でない alias: ${JSON.stringify(a).slice(0, 40)}`); continue; }
        if (a.trim() === '')       { FAIL(`[alias-q] ${c.id}: 空の alias`); continue; }
        if (a !== a.trim())        { FAIL(`[alias-q] ${c.id}: 前後に空白のある alias: "${a}"`); continue; }
        if (seen.has(a))           { FAIL(`[alias-q] ${c.id}: 同一概念内で重複する発火語: "${a}"`); continue; }
        seen.add(a);
        if ([...a].length === 1) WARN(`[alias-q] ${c.id}: 1文字 alias "${a}" は曖昧になりやすい（要検討）`);
    }
}

/* ── 4. Term 存在確認 ── */
let termChecked = 0;
for (const c of concepts) {
    for (const t of (Array.isArray(c?.terms) ? c.terms : [])) {
        if (!t || !TERM_AXES.has(t.axis)) {
            FAIL(`[term] ${c.id}: 不明な axis: ${JSON.stringify(t).slice(0, 60)}`);
            continue;
        }
        if (t.axis === 'lemma') {
            termChecked++;
            if (!(t.value in lemmaDict)) FAIL(`[term] ${c.id}: lemma_dict に存在しない lemma: ${t.value}`);
        }
    }
}

/* ── 5. Related Integrity ── */
for (const c of concepts) {
    for (const r of (Array.isArray(c?.related) ? c.related : [])) {
        if (!ids.has(r)) FAIL(`[related] ${c.id} → 存在しない概念 ID: ${r}`);
    }
}

/* ── 6. Related Symmetry Report（FAILにしない） ── */
const symmetric = [], oneWay = [];
{
    const relSet = new Set();
    for (const c of concepts) {
        for (const r of (Array.isArray(c?.related) ? c.related : [])) relSet.add(`${c.id}→${r}`);
    }
    const reported = new Set();
    for (const edge of relSet) {
        const [a, b] = edge.split('→');
        const key = [a, b].sort().join('↔');
        if (reported.has(key)) continue;
        reported.add(key);
        if (relSet.has(`${b}→${a}`)) symmetric.push(`${a} ↔ ${b}`);
        else { oneWay.push(`${a} → ${b}`); INFO(`[related] 片方向: ${a} → ${b}`); }
    }
}

/* ── 7. Children Cycle Detection ── */
{
    const childMap = new Map(concepts.filter(c => c?.id).map(c => [c.id, Array.isArray(c.children) ? c.children : []]));
    for (const c of concepts) {
        for (const ch of (Array.isArray(c?.children) ? c.children : [])) {
            if (!ids.has(ch)) FAIL(`[children] ${c.id} → 存在しない子概念 ID: ${ch}`);
        }
    }
    const state = new Map();   // 0=未訪問 1=訪問中 2=完了
    function dfs(id, trail) {
        if (state.get(id) === 1) {
            FAIL(`[children] 循環検出: ${[...trail, id].join(' → ')}`);
            return;
        }
        if (state.get(id) === 2) return;
        state.set(id, 1);
        for (const ch of (childMap.get(id) || [])) {
            if (ids.has(ch)) dfs(ch, [...trail, id]);
        }
        state.set(id, 2);
    }
    for (const id of ids) dfs(id, []);
}

/* ── 8. Pattern Integrity ── */
for (const c of concepts) {
    for (const pid of (Array.isArray(c?.patterns) ? c.patterns : [])) {
        if (!patternIds.has(pid)) FAIL(`[pattern] ${c.id} → search-patterns.json に存在しない ID: ${pid}`);
    }
}

/* ── 9. Syntax Type Integrity（＋ label 写しのずれを WARNING） ── */
for (const c of concepts) {
    for (const s of (Array.isArray(c?.syntaxTypes) ? c.syntaxTypes : [])) {
        const id    = typeof s === 'string' ? s : s?.id;
        const label = typeof s === 'object' && s ? s.label : null;
        if (!id) { FAIL(`[syntax] ${c.id}: id の無い syntaxTypes 項目: ${JSON.stringify(s).slice(0, 60)}`); continue; }
        if (!registryTypes.has(id)) { FAIL(`[syntax] ${c.id} → Wallace Registry に存在しない typeId: ${id}`); continue; }
        const regLabel = registryTypes.get(id);
        if (label && regLabel && label !== regLabel) {
            WARN(`[syntax] ${c.id}: label 写しが registry とずれている: "${label}" ≠ "${regLabel}"（${id}）`);
        }
    }
}

/* ── 9.5 Domain Integrity（Phase 5-2 / 5-3）──
   【責務の確認】domains は「内部メタデータ」である（Phase 5-3 方針）:
     - ユーザー検索の入口ではない（検索UIに domain 入口を作らない）
     - resolveTerm に domain 軸を追加してはならない
     - 検索結果・件数に影響してはならない
     - 将来の用途は Concept Insight での意味情報表示（表示のみ）に限る
   本監査はデータ整合性のみを見る:
   domains の各コードが domains-cluster-index.json に実在するか（FAIL）。
   {id, label} 形式で label 写しを持つ場合は semantic-domain-labels.json の
   subdomains[id].title と一致するか（ずれは WARNING — syntaxTypes と同方針）。
   ※ ラベル正典はクラスタ索引側。semantic-domain-labels.json のタイトルには
     クラスタとのずれが確認されているため、コードのみの登録を推奨する。 */
const _subLabels = domainLabels.subdomains || {};
for (const c of concepts) {
    for (const d of (Array.isArray(c?.domains) ? c.domains : [])) {
        const id    = typeof d === 'string' ? d : d?.id;
        const label = typeof d === 'object' && d ? d.label : null;
        if (!id) { FAIL(`[domain] ${c.id}: id の無い domains 項目: ${JSON.stringify(d).slice(0, 60)}`); continue; }
        if (!clusterIndex[id]) { FAIL(`[domain] ${c.id} → domains-cluster-index に存在しない domain: ${id}`); continue; }
        if (label) {
            const t = _subLabels[id] && _subLabels[id].title;
            if (t && label !== t) WARN(`[domain] ${c.id}: label 写しが semantic-domain-labels とずれている: "${label}" ≠ "${t}"（${id}）`);
            if (!t) WARN(`[domain] ${c.id}: ${id} は semantic-domain-labels にタイトルが無い（label 写し "${label}" は検証不能）`);
        }
    }
}

/* ── 10. Orphan Concept（WARNING） ── */
const referenced = new Set();
for (const c of concepts) {
    for (const r of (Array.isArray(c?.related) ? c.related : [])) referenced.add(r);
    for (const ch of (Array.isArray(c?.children) ? c.children : [])) referenced.add(ch);
}
const orphans = [...ids].filter(id => !referenced.has(id));
for (const o of orphans) WARN(`[orphan] related / children からどこからも参照されていない: ${o}`);

/* ── 集計・出力 ── */
const summary = {
    generated: new Date().toISOString(),
    concepts: concepts.length,
    terms: concepts.reduce((a, c) => a + (Array.isArray(c?.terms) ? c.terms.length : 0), 0),
    patternLinks: concepts.reduce((a, c) => a + (Array.isArray(c?.patterns) ? c.patterns.length : 0), 0),
    syntaxLinks: concepts.reduce((a, c) => a + (Array.isArray(c?.syntaxTypes) ? c.syntaxTypes.length : 0), 0),
    domainLinks: concepts.reduce((a, c) => a + (Array.isArray(c?.domains) ? c.domains.length : 0), 0),
    lemmaTermsChecked: termChecked,
    fails: fails.length,
    warnings: warnings.length,
    infos: infos.length,
    relatedSymmetric: symmetric,
    relatedOneWay: oneWay,
    orphans,
    failList: fails,
    warningList: warnings,
    infoList: infos,
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'concept-audit.json'), JSON.stringify(summary, null, 2) + '\n');

const md = [];
md.push('# Concept Audit — search-concepts.json 品質監査');
md.push('');
md.push(`生成: ${summary.generated}`);
md.push('');
md.push('## Summary');
md.push('');
md.push('| 項目 | 値 |');
md.push('|---|---|');
md.push(`| Concepts | ${summary.concepts} |`);
md.push(`| Terms | ${summary.terms} |`);
md.push(`| Patterns | ${summary.patternLinks} |`);
md.push(`| Syntax Links | ${summary.syntaxLinks} |`);
md.push(`| Domain Links | ${summary.domainLinks} |`);
md.push(`| **FAIL** | ${fails.length} |`);
md.push(`| WARNING | ${warnings.length} |`);
md.push(`| INFO | ${infos.length} |`);
md.push('');
md.push('## 監査項目別結果');
md.push('');
md.push('| # | 項目 | 結果 |');
md.push('|---|---|---|');
const has = tag => fails.some(f => f.startsWith(`[${tag}]`));
md.push(`| 1 | Schema Validation | ${has('schema') ? 'FAIL' : 'PASS'} |`);
md.push(`| 2 | ID 重複 | ${has('id') ? 'FAIL' : 'PASS'} |`);
md.push(`| 3 | Alias 重複（label 含む発火語衝突） | ${has('alias') ? 'FAIL' : 'PASS'} |`);
md.push(`| 3.5 | Alias 品質（型・空・空白・概念内重複） | ${has('alias-q') ? 'FAIL' : 'PASS'} |`);
md.push(`| 4 | Term 存在確認（lemma ${termChecked} 件を lemma_dict と照合） | ${has('term') ? 'FAIL' : 'PASS'} |`);
md.push(`| 5 | Related Integrity | ${has('related') ? 'FAIL' : 'PASS'} |`);
md.push(`| 6 | Related Symmetry | 双方向 ${symmetric.length} / 片方向 ${oneWay.length}（報告のみ） |`);
md.push(`| 7 | Children Cycle Detection | ${has('children') ? 'FAIL' : 'PASS'} |`);
md.push(`| 8 | Pattern Integrity | ${has('pattern') ? 'FAIL' : 'PASS'} |`);
md.push(`| 9 | Syntax Type Integrity | ${has('syntax') ? 'FAIL' : 'PASS'} |`);
md.push(`| 9.5 | Domain Integrity（cluster-index 実在＋label 写し照合） | ${has('domain') ? 'FAIL' : 'PASS'} |`);
md.push(`| 10 | Orphan Concept | ${orphans.length} 件（WARNING） |`);
md.push('');
if (symmetric.length || oneWay.length) {
    md.push('## Related グラフ');
    md.push('');
    for (const s of symmetric) md.push(`- symmetric: ${s}`);
    for (const o of oneWay)    md.push(`- one-way:   ${o}`);
    md.push('');
}
if (fails.length)    { md.push('## FAIL 一覧');    md.push(''); for (const f of fails)    md.push(`- ❌ ${f}`); md.push(''); }
if (warnings.length) { md.push('## WARNING 一覧'); md.push(''); for (const w of warnings) md.push(`- ⚠️ ${w}`); md.push(''); }
if (infos.length)    { md.push('## INFO 一覧');    md.push(''); for (const i of infos)    md.push(`- ${i}`);   md.push(''); }
md.push(`**総合判定: ${fails.length === 0 ? '✅ PASS' : '❌ FAIL（' + fails.length + '件）'}**`);
fs.writeFileSync(path.join(OUT, 'concept-audit.md'), md.join('\n') + '\n');

console.log(`Concept Audit: ${summary.concepts} 概念 / FAIL ${fails.length} / WARNING ${warnings.length} / INFO ${infos.length}`);
for (const f of fails)    console.log('  FAIL  ' + f);
for (const w of warnings) console.log('  WARN  ' + w);
console.log(`出力: scripts/output/concept-audit.{md,json}`);
process.exit(fails.length ? 1 : 0);
