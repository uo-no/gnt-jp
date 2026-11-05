#!/usr/bin/env node
/**
 * concept-gap-audit.cjs — Concept Library Gap 監査（Phase 8-3）
 *
 * 実行: node scripts/concept-gap-audit.cjs [--nt-only]
 * 出力: scripts/output/concept-gap-audit.{md,json}
 *
 * 目的: 既存 30 Concept がカバーしていない神学的テーマを抽出し、
 *   「独立 Concept として追加すべき候補」と
 *   「alias で十分なもの / 採用しないもの」を判別するための材料を作る。
 *
 * このツールは Concept を自動生成しない（候補の提示・データ提供のみ）。
 * 読み取り専用: search-concepts.json / bible_data のみ参照。
 * 検索ロジック・UI・Runtime には一切触れない。
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT   = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const OUT    = path.join(__dirname, 'output');

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const conceptsFile = readJson(path.join(PUBLIC, 'assets', 'data', 'search-concepts.json'));
const concepts = conceptsFile.concepts || [];

/* ── 既存カバー状態を構築 ── */
const registeredLemmas = new Set();
const conceptOfLemma   = new Map(); // lemma → concept id
for (const c of concepts) {
    for (const t of (c.terms || [])) {
        if (t.axis === 'lemma') {
            registeredLemmas.add(t.value);
            if (!conceptOfLemma.has(t.value)) conceptOfLemma.set(t.value, c.id);
        }
    }
}
const totalAliases = concepts.reduce((a, c) => a + (c.aliases || []).length, 0);
const totalTerms   = concepts.reduce((a, c) => a + (c.terms || []).length, 0);

/* ── NT コーパス走査 ── */
const NT_DIR = path.join(PUBLIC, 'bible_data', 'nt');
const ntBooks = fs.readdirSync(NT_DIR).filter(b => !b.startsWith('.'));

const lemmaFreq  = new Map(); // lemma → {n, gloss, cls, books:Set}
let totalNtTokens = 0;

for (const book of ntBooks) {
    const bDir = path.join(NT_DIR, book);
    const chaps = fs.readdirSync(bDir).filter(f => f.endsWith('.json'));
    for (const ch of chaps) {
        const toks = readJson(path.join(bDir, ch, '..', ch));
        for (const t of readJson(path.join(bDir, ch))) {
            totalNtTokens++;
            if (!t.lemma) continue;
            if (!lemmaFreq.has(t.lemma)) lemmaFreq.set(t.lemma, { n: 0, gloss: '', cls: '', books: new Set() });
            const e = lemmaFreq.get(t.lemma);
            e.n++;
            if (!e.gloss && t.japanese && !t.japanese.includes('読み込み')) e.gloss = t.japanese;
            if (!e.cls && t.class) e.cls = String(t.class);
            const bk = (t.ref || '').split(' ')[0];
            if (bk) e.books.add(bk);
        }
    }
}

/* ── 候補定義（人手で定義した神学テーマ） ── */
// recommendation: 'independent_candidate' | 'conditional_candidate' | 'alias_sufficient' | 'reject_ambiguity'
const CANDIDATES = [
    {
        id_candidate: 'forgiveness',
        label: '赦し',
        label_reading: 'ゆるし',
        lemmas: ['ἄφεσις', 'ἀφίημι', 'ἄφεμα'],
        related_existing: ['sin', 'salvation', 'grace', 'redemption', 'reconciliation'],
        overlap_note: 'sin/salvation と隣接するが、「罪の赦し」は NT の核心的宣言であり独立した意味域を持つ。grace（χάρις）は神の好意・賜物の概念、redemption（ἀπολύτρωσις）は身代金的解放であり、赦し（ἄφεσις）は負債・罪責の免除という固有の神学語。',
        recommendation: 'independent_candidate',
        priority: 1,
    },
    {
        id_candidate: 'worship',
        label: '礼拝',
        label_reading: 'れいはい',
        lemmas: ['προσκυνέω', 'λατρεύω', 'σέβομαι', 'εὐσέβεια', 'θρησκεία'],
        related_existing: ['holy', 'prayer', 'glory', 'thanksgiving'],
        overlap_note: 'prayer（祈り）は δέομαι/προσεύχομαι。礼拝（προσκυνέω）は「ひれ伏す/崇拝する」の行為動詞で、NT では神・イエスへの応答として固有の意味域を持つ。holy は状態/性質の概念であり重複は低い。',
        recommendation: 'independent_candidate',
        priority: 1,
    },
    {
        id_candidate: 'witness',
        label: '証し',
        label_reading: 'あかし',
        lemmas: ['μαρτυρέω', 'μαρτυρία', 'μάρτυς', 'μαρτύριον'],
        related_existing: ['mission', 'gospel', 'truth'],
        overlap_note: 'mission（κηρύσσω: 布告する）と意味が近いが、witness（μαρτυρέω: 見聞きしたことを証言する）は認識論的・法的な証言という固有の意味域を持つ。ヨハネ文書での使用が特に多く独立テーマとして成立。',
        recommendation: 'independent_candidate',
        priority: 1,
    },
    {
        id_candidate: 'temptation',
        label: '誘惑・試練',
        label_reading: 'ゆうわく・しれん',
        lemmas: ['πειρασμός', 'πειράζω', 'ἐκπειράζω', 'δοκιμή', 'δοκιμάζω'],
        related_existing: ['faith', 'perseverance', 'obedience'],
        overlap_note: 'perseverance（ὑπομονή）と意味が隣接するが、temptation は「誘惑する/試みる」という行為者と対象の関係概念。faith の文脈で不可欠であり、主の祈りの「試みに遭わせないで」等も含む。',
        recommendation: 'independent_candidate',
        priority: 1,
    },
    {
        id_candidate: 'gods-will',
        label: '御心',
        label_reading: 'みこころ',
        lemmas: ['θέλημα'],
        related_existing: ['obedience', 'prayer', 'god'],
        overlap_note: '62 例と中頻度。「神の御心」は Pauline 神学の中心概念で、obedience（ὑπακοή: 命令への服従）とは異なる。「御心が行われますように」（主の祈り）等の文脈での独立性が高い。βουλή（計画）も近義だが別概念。',
        recommendation: 'independent_candidate',
        priority: 2,
    },
    {
        id_candidate: 'law',
        label: '律法',
        label_reading: 'りっぽう',
        lemmas: ['νόμος', 'νομικός', 'νομοθεσία', 'νόμιμος'],
        related_existing: ['righteousness', 'grace', 'faith', 'sin'],
        overlap_note: '193 例と高頻度。ローマ書・ガラテヤ書で「律法 vs 恵み」「律法 vs 信仰」という対立構造を形成する独立概念。righteousness（義）は律法の目的/結果、grace（恵み）は律法の対置概念であり、律法自体は独自の意味域を持つ。',
        recommendation: 'independent_candidate',
        priority: 1,
    },
    {
        id_candidate: 'death',
        label: '死',
        label_reading: 'し',
        lemmas: ['θάνατος', 'ἀποθνῄσκω', 'νεκρός', 'θνητός'],
        related_existing: ['resurrection', 'sin', 'eternal-life'],
        overlap_note: '359 例超と高頻度。resurrection（復活）の対概念として独立。sin（罪）の結果・帰結として言及されるが、死自体が救済論の出発点となる独立概念（「死んで葬られ、三日目に復活」等）。',
        recommendation: 'independent_candidate',
        priority: 1,
    },
    {
        id_candidate: 'judgment',
        label: '裁き',
        label_reading: 'さばき',
        lemmas: ['κρίσις', 'κρίμα', 'κρίνω', 'κριτής', 'καταδικάζω'],
        related_existing: ['righteousness', 'sin', 'god'],
        overlap_note: '189 例超と高頻度。神の裁き・最後の審判は NT 全体で反復される主要テーマ。righteousness（義）は裁きの基準であり、裁き自体とは区別される独立概念。',
        recommendation: 'independent_candidate',
        priority: 1,
    },
    {
        id_candidate: 'promise',
        label: '約束',
        label_reading: 'やくそく',
        lemmas: ['ἐπαγγελία', 'ἐπαγγέλλομαι'],
        related_existing: ['hope', 'faith', 'eternal-life', 'gospel'],
        overlap_note: '67 例。アブラハムへの約束、聖霊の約束など NT の covenant promise は神学的に独立。hope（ἐλπίς: 期待・望み）は主観的態度であり、promise（ἐπαγγελία: 神の宣言・保証）は客観的な神の行為として区別される。',
        recommendation: 'independent_candidate',
        priority: 2,
    },
    {
        id_candidate: 'wisdom',
        label: '知恵',
        label_reading: 'ちえ',
        lemmas: ['σοφία', 'σοφός', 'σοφίζω', 'σύνεσις', 'φρόνησις'],
        related_existing: ['truth', 'righteousness'],
        overlap_note: '70 例。Pauline 神学での「神の知恵 vs 人の知恵」（コリント１・２章）は独立概念。truth（ἀλήθεια: 真理/事実）とは異なり、知恵（σοφία）は認識能力・判断力の次元。',
        recommendation: 'independent_candidate',
        priority: 2,
    },
    {
        id_candidate: 'mercy',
        label: '憐れみ',
        label_reading: 'あわれみ',
        lemmas: ['ἔλεος', 'ἐλεέω', 'ἐλεήμων', 'οἰκτίρμων', 'οἰκτιρμός'],
        related_existing: ['grace', 'love'],
        overlap_note: '37 例。grace（χάρις）は「受ける価値のない者への好意」、mercy（ἔλεος）は「苦難にある者への同情・介入」という微妙な区別があり、神学的には独立。ただし grace と重複する文脈も多い（conditional_candidate の余地）。',
        recommendation: 'conditional_candidate',
        priority: 2,
    },
    {
        id_candidate: 'covenant',
        label: '契約',
        label_reading: 'けいやく',
        lemmas: ['διαθήκη'],
        related_existing: ['gospel', 'grace', 'promise', 'redemption'],
        overlap_note: '33 例。旧・新契約の対比（コリント２:3章・へブル書）は神学的に独立。ただし promise（ἐπαγγελία）が独立 Concept になれば関連が重なる。promise とペアで検討すべき。',
        recommendation: 'conditional_candidate',
        priority: 2,
    },
    {
        id_candidate: 'fellowship',
        label: '交わり',
        label_reading: 'まじわり',
        lemmas: ['κοινωνία', 'κοινωνός', 'κοινωνέω', 'κοινός'],
        related_existing: ['church', 'love'],
        overlap_note: '37 例。church（ἐκκλησία: 召された集会）は組織概念、fellowship（κοινωνία: 分かち合い・共有）は関係性・交わりの概念として区別される。ただし頻度が低いため独立 Concept としての入口の強さは中程度。',
        recommendation: 'conditional_candidate',
        priority: 3,
    },
    {
        id_candidate: 'gift',
        label: '賜物',
        label_reading: 'たまもの',
        lemmas: ['χάρισμα', 'δωρεά', 'δόμα', 'δῶρον'],
        related_existing: ['grace', 'holy-spirit'],
        overlap_note: 'χάρισμα は既存 grace の term として登録済み。schema_note（v7）で「将来独立 Concept 候補」として明示。霊の賜物（πνευματικά χαρίσματα）は holy-spirit と grace の交差点にある独立テーマ。grace から分離する神学的根拠はあるが、χάρισμa の登録解除が必要。',
        recommendation: 'conditional_candidate',
        priority: 3,
    },
    {
        id_candidate: 'inheritance',
        label: '相続・嗣業',
        label_reading: 'そうぞく・しぎょう',
        lemmas: ['κληρονομία', 'κληρονόμος', 'κληρονομέω', 'κλῆρος'],
        related_existing: ['promise', 'hope', 'eternal-life', 'kingdom'],
        overlap_note: '47 例（4 lemma 合計）。OT の「約束の地」から NT の「神の国を受け継ぐ」への展開は固有の意味域。ただし promise/eternal-life/kingdom との重複概念が多く、独立後の差別化が課題。',
        recommendation: 'conditional_candidate',
        priority: 3,
    },
    {
        id_candidate: 'flesh',
        label: '肉・肉体',
        label_reading: 'にく・にくたい',
        lemmas: ['σάρξ'],
        related_existing: ['sin', 'holy-spirit', 'holy'],
        overlap_note: '147 例と高頻度だが意味が多義的: ①肉体（物理的身体）②人間本性③罪の原動力（肉の欲）④肉なるキリスト。Pauline 神学での「肉 vs 霊」対立は独立テーマだが、文脈なしの「肉」では概念入口として曖昧すぎる。',
        recommendation: 'reject_ambiguity',
        priority: 0,
    },
    {
        id_candidate: 'world',
        label: '世界・世',
        label_reading: 'せかい・よ',
        lemmas: ['κόσμος', 'αἰών'],
        related_existing: ['sin', 'eternal-life', 'kingdom'],
        overlap_note: 'κόσμος 185 例・αἰών 122 例と高頻度だが、双方とも意味が広く「物理的世界・人類・悪の世界秩序・現代」等を包含。κόσμος を「世の中（悪の支配）」として登録しても、読者が期待するコンテンツと一致する保証がない。',
        recommendation: 'reject_ambiguity',
        priority: 0,
    },
    {
        id_candidate: 'mystery',
        label: '奥義',
        label_reading: 'おうぎ',
        lemmas: ['μυστήριον'],
        related_existing: ['gospel', 'wisdom', 'church'],
        overlap_note: '26 例。Pauline 用語として「キリストにある神の奥義」「異邦人が相続人となる奥義」等で重要だが、単独 Concept としては頻度・適用範囲ともに限定的。wisdom が独立した場合、関連概念として位置づける方が自然。',
        recommendation: 'reject_ambiguity',
        priority: 0,
    },
    {
        id_candidate: 'time-season',
        label: '時・季節',
        label_reading: 'とき・きせつ',
        lemmas: ['καιρός', 'χρόνος'],
        related_existing: ['perseverance', 'hope'],
        overlap_note: 'καιρός 85 例・χρόνος 53 例と頻出だが意味域が広く「タイミング・機会・時代・時間」等を包含。終末論的「時」の概念は重要だが、parousia（来臨）として別途扱う方が適切。',
        recommendation: 'reject_ambiguity',
        priority: 0,
    },
];

/* ── 各候補に頻度データを付与 ── */
for (const c of CANDIDATES) {
    let n = 0;
    const glosses = [];
    const books = new Set();
    for (const l of c.lemmas) {
        const e = lemmaFreq.get(l);
        if (e) {
            n += e.n;
            if (e.gloss) glosses.push(`${l}=${e.gloss}`);
            for (const b of e.books) books.add(b);
        }
    }
    c.frequency = n;
    c.books_count = books.size;
    c.glosses = glosses;
    c.registered_lemmas = c.lemmas.filter(l => registeredLemmas.has(l));
}

/* ── FAIL/WARNING 判定 ── */
const fails = [];
const warnings = [];

for (const c of CANDIDATES) {
    if (c.recommendation === 'independent_candidate' && c.frequency === 0) {
        fails.push(`FAIL: ${c.id_candidate} frequency=0 (lemma 参照不能の可能性)`);
    }
    if (c.recommendation === 'independent_candidate' && c.frequency < 10) {
        warnings.push(`WARNING: ${c.id_candidate} frequency=${c.frequency} (低頻度・独立 Concept として弱い可能性)`);
    }
    if (c.registered_lemmas.length > 0 && c.recommendation === 'independent_candidate') {
        warnings.push(`WARNING: ${c.id_candidate} に登録済み lemma が含まれる: ${c.registered_lemmas.join(', ')}`);
    }
}

const totalFail = fails.length;
const totalWarn = warnings.length;

/* ── JSON 出力 ── */
const report = {
    meta: {
        date: new Date().toISOString().slice(0, 10),
        conceptsFile: 'assets/data/search-concepts.json',
        version: conceptsFile.version,
        totalConcepts: concepts.length,
        totalAliases,
        totalTerms,
        ntTokensScanned: totalNtTokens,
        fail: totalFail,
        warnings: totalWarn,
    },
    summary: {
        independent_candidate: CANDIDATES.filter(c => c.recommendation === 'independent_candidate').length,
        conditional_candidate: CANDIDATES.filter(c => c.recommendation === 'conditional_candidate').length,
        alias_sufficient: CANDIDATES.filter(c => c.recommendation === 'alias_sufficient').length,
        reject_ambiguity: CANDIDATES.filter(c => c.recommendation === 'reject_ambiguity').length,
    },
    candidates: CANDIDATES.map(c => ({
        id_candidate: c.id_candidate,
        label: c.label,
        lemmas: c.lemmas,
        frequency: c.frequency,
        books_count: c.books_count,
        glosses: c.glosses,
        registered_lemmas: c.registered_lemmas,
        related_existing: c.related_existing,
        overlap_note: c.overlap_note,
        recommendation: c.recommendation,
        priority: c.priority,
    })),
    fails,
    warnings,
};

fs.writeFileSync(path.join(OUT, 'concept-gap-audit.json'), JSON.stringify(report, null, 2) + '\n');

/* ── MD 出力 ── */
const fmt = n => String(n).padStart(4);
const indent = s => s.split('\n').map(l => '  ' + l).join('\n');

const section = (title, rows, cols) => {
    const header = '| ' + cols.join(' | ') + ' |';
    const sep    = '|' + cols.map(() => '---|').join('');
    const lines  = rows.map(r => '| ' + cols.map(c => String(r[c] ?? '')).join(' | ') + ' |');
    return `### ${title}\n\n${header}\n${sep}\n${lines.join('\n')}\n`;
};

const independent = CANDIDATES.filter(c => c.recommendation === 'independent_candidate').sort((a, b) => a.priority - b.priority || b.frequency - a.frequency);
const conditional = CANDIDATES.filter(c => c.recommendation === 'conditional_candidate').sort((a, b) => a.priority - b.priority || b.frequency - a.frequency);
const rejected    = CANDIDATES.filter(c => c.recommendation === 'reject_ambiguity');

let md = `# Concept Gap Audit — Phase 8-3

**作成日:** ${report.meta.date}
**対象:** search-concepts.json v${report.meta.version}
**方針:** JSON 変更なし。候補発見・判断材料の提供のみ。

---

## Current Library

| 項目 | 値 |
|---|---|
| Concept 数 | ${report.meta.totalConcepts} |
| Alias 数 | ${report.meta.totalAliases} |
| Term 数 | ${report.meta.totalTerms} |
| NT トークン走査数 | ${report.meta.ntTokensScanned.toLocaleString()} |

---

## Gap Analysis

### 調査方法

1. 全 NT トークンを走査し lemma ごとの出現数・書巻数を集計
2. 既存 Concept の terms（lemma axis）でカバーされていない語を抽出
3. 神学的独立性・頻度・既存 Concept との境界を手動評価
4. recommendation を 4 段階で分類

### Recommendation 基準

| 分類 | 基準 |
|---|---|
| independent_candidate | 独立した神学的意味域・十分な頻度・既存 alias では意味が広すぎる |
| conditional_candidate | 独立の余地はあるが隣接 Concept との境界整理が必要 |
| alias_sufficient | 既存 Concept の alias 追加で対応可能 |
| reject_ambiguity | 意味が広すぎる・神学的文脈が一意に定まらない |

---

## Recommended New Concepts（independent_candidate）

${independent.map(c => {
    const reg = c.registered_lemmas.length > 0 ? `\n  ⚠️ 登録済み lemma: ${c.registered_lemmas.join(', ')}` : '';
    return `### ${c.label}（id: \`${c.id_candidate}\`）Priority ${c.priority}

| 項目 | 値 |
|---|---|
| Label | ${c.label}（${c.label_reading}） |
| Lemmas | ${c.lemmas.join(', ')} |
| NT 出現数 | ${c.frequency} |
| 登場書巻数 | ${c.books_count} |
| 主な日本語グロス | ${c.glosses.join(' / ')} |
| 関連既存 Concept | ${c.related_existing.join(', ')} |

**境界評価:** ${c.overlap_note}${reg}
`;
}).join('\n---\n\n')}

---

## Conditional Candidates（conditional_candidate）

| id | label | lemmas | NT 出現数 | 関連既存 | 理由 |
|---|---|---|---|---|---|
${conditional.map(c =>
    `| ${c.id_candidate} | ${c.label} | ${c.lemmas.join(', ')} | ${c.frequency} | ${c.related_existing.join(', ')} | ${c.overlap_note.slice(0, 60)}… |`
).join('\n')}

${conditional.map(c => `### ${c.label}（conditional）

${c.overlap_note}
`).join('\n')}

---

## Rejected Candidates（reject_ambiguity）

| id | label | lemmas | NT 出現数 | 不採用理由 |
|---|---|---|---|---|
${rejected.map(c =>
    `| ${c.id_candidate} | ${c.label} | ${c.lemmas.join(', ')} | ${c.frequency} | ${c.overlap_note.slice(0, 80)}… |`
).join('\n')}

---

## Collision Report

既存 Concept / Alias との衝突確認（candidates の lemma が既登録かどうか）:

| Candidate | 登録済み lemma | 既存 Concept | 対応 |
|---|---|---|---|
${CANDIDATES.filter(c => c.registered_lemmas.length > 0).map(c =>
    c.registered_lemmas.map(l => `| ${c.id_candidate} | ${l} | ${conceptOfLemma.get(l)} | 独立化には既存 terms からの除外が必要 |`).join('\n')
).join('\n') || '| — | — | — | 衝突なし |'}

---

## Summary

| 分類 | 件数 |
|---|---|
| independent_candidate（追加推奨） | ${report.summary.independent_candidate} |
| conditional_candidate（条件付き） | ${report.summary.conditional_candidate} |
| alias_sufficient | ${report.summary.alias_sufficient} |
| reject_ambiguity（採用しない） | ${report.summary.reject_ambiguity} |
| **合計評価候補** | **${CANDIDATES.length}** |

---

## FAIL / WARNING

${fails.length === 0 && warnings.length === 0 ? '**FAIL 0 / WARNING 0**' : ''}
${fails.map(f => `- ❌ ${f}`).join('\n')}
${warnings.map(w => `- ⚠️ ${w}`).join('\n')}

---

## Phase 8-4 追加推奨（Priority 1）

以下の 8 Concept が Priority 1 として独立追加を推奨する。
いずれも NT 頻出・神学的独立性が高く・既存 alias では対応困難。

| id | label | 主 lemma | NT 出現数 | 理由一言 |
|---|---|---|---|---|
${independent.filter(c => c.priority === 1).map(c =>
    `| ${c.id_candidate} | ${c.label} | ${c.lemmas[0]} | ${c.frequency} | ${c.overlap_note.split('。')[0]}。 |`
).join('\n')}

Priority 2（独立の余地あり・隣接整理後に追加）:

| id | label | 主 lemma | NT 出現数 |
|---|---|---|---|
${independent.filter(c => c.priority === 2).map(c =>
    `| ${c.id_candidate} | ${c.label} | ${c.lemmas[0]} | ${c.frequency} |`
).join('\n')}

---

## Notes

- frequency はNT 137K トークン走査の実測値。LXX は含まない。
- frequency は concept の terms に加える lemma の合計（例: forgiveness = ἄφεσις + ἀφίημι の合計）。
- 既存 Concept に登録済み lemma（χάρισμα / χαρίζομαι）を含む候補（gift）は、独立化に際して grace の terms から除外する必要がある。
- 「境界評価」は神学的な判断根拠を記録したもので、機械的ルールではない。
- Concept の追加は scripts/concept-audit.cjs + scripts/concept-coverage-audit.cjs を通すこと。
`;

fs.writeFileSync(path.join(OUT, 'concept-gap-audit.md'), md);

/* ── コンソール要約 ── */
console.log('Concept Gap Audit:',
    `${concepts.length} 既存 / ${CANDIDATES.length} 評価候補`,
    `/ independent ${report.summary.independent_candidate}`,
    `/ conditional ${report.summary.conditional_candidate}`,
    `/ rejected ${report.summary.reject_ambiguity}`,
    `/ FAIL ${totalFail} / WARNING ${totalWarn}`
);
if (totalFail > 0) {
    for (const f of fails) console.error('  ' + f);
}
if (totalWarn > 0) {
    for (const w of warnings) console.warn('  ' + w);
}
console.log('出力: scripts/output/concept-gap-audit.{md,json}');
process.exit(totalFail > 0 ? 1 : 0);
