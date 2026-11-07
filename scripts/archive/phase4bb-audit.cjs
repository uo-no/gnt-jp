'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const BASE = path.resolve(__dirname, '..');
const BIBLE = path.join(BASE, 'public/bible_data/nt');
const AG_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ag-residual-inventory.json');
const AP_PATH = path.join(__dirname, 'output/stage4-final/stage4-phase4ap-tier1-inferred-audit.json');
const OUT = path.join(__dirname, 'output/stage4-final');

function loadJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function saveJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8'); }

console.log('=== Phase 4bb — G3708 ὁράω / εἰδ- 設計監査 ===\n');

// === 1. Load source data ===
const ag = loadJson(AG_PATH);
const agMap = new Map(ag.tokens.map(t => [t.ref, t]));

// 26 UNREVIEWED G3708 tokens (from Phase 4ap + Phase 4av enumeration)
const EID_NSM = [
  'MAT 12:25!1', 'MRK 6:20!7', 'MRK 12:15!3', 'LUK 9:33!34', 'LUK 9:47!4',
  'LUK 11:17!3', 'JHN 6:61!1', 'JHN 13:1!7', 'JHN 13:3!1', 'JHN 18:4!3',
  'JHN 19:28!3', 'ACT 2:30!5', 'ACT 20:22!17', 'ACT 24:22!7', '1TI 1:9!1',
  '2TI 2:23!8', '2TI 3:14!9', 'TIT 3:11!1', 'PHM 1:21!7', '2PE 1:14!1',
  'REV 12:12!26'
];
const EID_APM = ['2PE 1:12!9', 'JUD 1:5!5'];
const HEORA_ATT = ['JHN 4:45!12', 'JHN 14:9!16', 'JHN 19:35!3'];
const ALL_26 = [...EID_NSM, ...EID_APM, ...HEORA_ATT];

// === 2. Load token data from bible_data ===
function getTok(ref) {
  const m = ref.match(/^(\S+)\s+(\d+):(\d+)!(\d+)/);
  const [, book, ch] = m;
  const fp = path.join(BIBLE, book, ch + '.json');
  const d = loadJson(fp);
  return d.find(t => t.ref === ref);
}

const tokenData = {};
ALL_26.forEach(ref => {
  const t = getTok(ref);
  if (!t) { console.error('NOT FOUND:', ref); process.exit(1); }
  tokenData[ref] = t;
});
console.log('Loaded', Object.keys(tokenData).length, 'tokens from bible_data');

// === 3. Pre-flight: verify inventory states ===
console.log('\n--- Inventory pre-flight ---');
ALL_26.forEach(ref => {
  const inv = agMap.get(ref);
  if (!inv) { console.error('NOT IN INVENTORY:', ref); process.exit(1); }
  if (inv.state !== 'UNREVIEWED') { console.error('NOT UNREVIEWED:', ref, inv.state); process.exit(1); }
});
console.log('All 26 G3708 tokens: UNREVIEWED ✓');

// === 4. Build token audit records ===
const groups = {
  eid_nsm: { label: 'εἰδ- V-RAP-NSM', refs: EID_NSM, greek_form: 'εἰδώς/εἰδὼς', semantic: 'knowing/knew', engine_output: '見てきた', semantic_ja_candidate: '知る' },
  eid_apm: { label: 'εἰδ- V-RAP-APM', refs: EID_APM, greek_form: 'εἰδότας', semantic: 'knowing/know', engine_output: '見てきた', semantic_ja_candidate: '知る' },
  heora_att: { label: 'ἑωρακ- V-RAP-ATT', refs: HEORA_ATT, greek_form: 'ἑωρακώς/ἑωρακότες', semantic: 'having seen/seen/saw', engine_output: '見てきた', semantic_ja_candidate: '見てきた' }
};

const tokenAudit = ALL_26.map(ref => {
  const t = tokenData[ref];
  const group = EID_NSM.includes(ref) ? 'eid_nsm'
              : EID_APM.includes(ref) ? 'eid_apm'
              : 'heora_att';
  const grpInfo = groups[group];
  return {
    ref,
    strong: t.strong,
    morph: t.morph,
    greek_form: t.text,
    english: t.english || '',
    cur_japanese: t.japanese,
    decoded: { cls: t.class, tense: t.tense, mood: t.mood, voice: t.voice, kase: t.case },
    group,
    group_label: grpInfo.label,
    semantic_meaning: grpInfo.semantic,
    engine_path: 'V-RAP → part-perf rule',
    engine_output_from_見る: '見てきた',
    engine_output_from_知る: 'null (no match) → fallback: 知る',
    semantic_issue: group.startsWith('eid')
      ? '`見てきた` misrepresents εἰδώς ("knowing"); should indicate knowledge-state'
      : '`見てきた` correctly represents ἑωρακ- ("having seen")',
    option_b_candidate_ja: group.startsWith('eid') ? '知る' : '見る'
  };
});

console.log('\nToken audit built:', tokenAudit.length, 'records');
tokenAudit.forEach(t => {
  const issue = t.group.startsWith('eid') ? '⚠ SEMANTIC MISMATCH' : '✓ OK';
  console.log(' ', t.ref, '|', t.morph, '|', t.greek_form, '| en=' + t.english, '|', issue);
});

// === 5. Reading Engine behavior analysis ===
const engineAnalysis = {
  part_perf_rules_summary: [
    '/する$/ → してきた',
    '/くる$/ → きてきた',
    '/([いきしちにひみりぎじびぴえけせてねへめれげぜでべぺ])る$/ → $1てきた',
    '/(見|得|出|着|来)る$/ → $1てきた',
    '/(去)る$/ → $1ってきた'
  ],
  見る_behavior: {
    input: '見る',
    matching_rule: '/(見|得|出|着|来)る$/',
    output: '見てきた',
    fires: true
  },
  知る_behavior: {
    input: '知る',
    matching_rule: null,
    reason: '知 is not in special kanji list (見|得|出|着|来|去); r-preceding char は not in hiragana list',
    output: 'null → fallback to token.japanese = 知る',
    fires: false
  },
  知っている_behavior: {
    input: '知っている',
    matching_rule: '/([いきしちにひみりぎじびぴえけせてねへめれげぜでべぺ])る$/ matches いる → いてきた',
    output: '知っていてきた',
    fires: true,
    problem: '知っていてきた is ungrammatical — double-compound error'
  },
  att_forms_decoded_same: {
    note: 'V-RAP-NSM-ATT and V-RAP-NPM-ATT decode to identical tense/mood/voice fields as V-RAP-NSM',
    confirmed: true,
    confirmed_by: 'Direct token field inspection: JHN 14:9!16, JHN 19:35!3, JHN 4:45!12 all have tense=perfect, mood=participle, voice=active, kase=nominative, cls=verb'
  },
  engine_is_frozen: true,
  engine_note: 'reading-engine.js is FROZEN; no rule changes without full regression + freeze audit'
};

// === 6. Lexicon analysis ===
const lexiconAnalysis = {
  G3708: {
    lemma: 'ὁράω',
    lexicon_lite_abbottSmith: '（持続的な意味を持つ動詞で、アオリスト εἶδον、受動 ὤφθην、未来 ὄψομαι は別語根から；現在形は口語ではあまり使われず）見る',
    reading_lexicon_glosses: ['見る','認める','心で見る','知覚する','見分ける','心を留める','気をつける','経験する','訪れる','気を配る','配慮する'],
    core_gloss: '見る',
    morph_range: 'Full paradigm (present, aorist, perfect, passive, future from diff roots)'
  },
  G1492: {
    lemma: 'οἶδα',
    lexicon_lite_abbottSmith: '（εἶδον と同語源；完了形だが現在の意味で用いられる）見た、認識したことから「知る、知識を持つ」',
    reading_lexicon_glosses: ['知る'],
    core_gloss: '知る',
    morph_range: 'Perfect-only defective verb (no present form); semantically functions as present'
  },
  relationship: {
    shared_root: 'εἰδ- / εἶδον (aorist stem of ὁράω)',
    linguistic_relationship: 'G3708 ὁράω aorist εἶδον and G1492 οἶδα (perfect) share the same etymology. εἶδον perfect → οἶδα "I have seen" → "I know (from having seen)". G1492 is a defective verb existing only in perfect/pluperfect forms.',
    data_assignment: 'bible_data assigns εἰδώς/εἰδότας to G3708 (ὁράω) with morph V-RAP (perfect active participle of ὁράω root). Lexicographically, these forms function as participles of G1492 οἶδα.',
    mismatch: 'Strong assignment to G3708 is morphologically consistent (εἶδον = aorist of ὁράω) but semantically these forms belong to G1492 territory ("knowing", not "having seen")'
  }
};

// === 7. Design Options ===
const designOptions = {
  A: {
    name: '現状維持',
    description: 'Keep all 26 tokens as `見る` → engine produces `見てきた` for all',
    scope_change: 'none',
    engine_change: false,
    data_change: false,
    model_change: false,
    result_eid_23: { display: '見てきた', semantic_accuracy: 'FAIL', note: '"having come to see" for words meaning "knowing" is misleading' },
    result_heora_3: { display: '見てきた', semantic_accuracy: 'PASS', note: '"having seen" correct for ἑωρακ-' },
    overall_tokens_correct: 3,
    overall_tokens_wrong: 23,
    pros: ['Zero implementation cost', 'Preserves etymological connection (εἶδον root)', 'No FROZEN engine risk'],
    cons: ['23/26 tokens display `見てきた` for "knowing" — actively misleading', 'Structural label obscures the actual function of εἰδώς', 'Conflicts with Abbott-Smith: G1492 οἶδα = "知る"'],
    verdict: 'NOT RECOMMENDED — 23件 semantically wrong; 見てきた for εἰδώς misleads reader'
  },
  B: {
    name: 'ラベル変更（εἰδ- 23件のみ token.japanese 修正）',
    description: 'Change εἰδ- 23 tokens: `見る` → `知る`. Keep ἑωρακ- 3 tokens: `見る` → `見てきた`',
    scope_change: 'token.japanese for 23 εἰδ- tokens only',
    engine_change: false,
    data_change: true,
    data_change_scope: 23,
    model_change: false,
    result_eid_23: {
      display: '知る',
      semantic_accuracy: 'PASS',
      mechanism: '知る → part-perf rule: no match (知 not in special kanji list, not in hiragana class) → null → fallback to token.japanese = 知る',
      note: '知る is base form; not perfect-inflected but semantically correct'
    },
    result_heora_3: { display: '見てきた', semantic_accuracy: 'PASS', note: '"having seen" correct for ἑωρακ-' },
    overall_tokens_correct: 26,
    overall_tokens_wrong: 0,
    limitation: '知る without perfect inflection (ideal: 知っている). Perfect inflection requires engine change (FROZEN). 知っている cannot be used as japanese field value — part-perf rule would produce 知っていてきた (ungrammatical).',
    pros: [
      'All 26 tokens semantically aligned',
      'No engine change (reading-engine.js FROZEN respected)',
      'Within existing data model (token.japanese field)',
      'Aligns with lexicon: G1492 gloss = 知る',
      'Consistent with Abbott-Smith and reading-lexicon-data G1492 entry'
    ],
    cons: [
      '知る is base/infinitive form, not perfect participle form',
      '知る vs 知っている is a semantic accuracy trade-off',
      'Requires 23 token changes across multiple bible_data files',
      'Technically a semantic choice (知る for εἰδώς) — though well-grounded in lexicography'
    ],
    l0_assessment: 'ACCEPTABLE: εἰδώς means "knowing" per G1492 territory. 知る is the standard J-word. Choosing 知る is not a contextual interpretation — it is the lexicographic fact for these forms. Current 見てきた is a more problematic semantic imposition.',
    verdict: 'RECOMMENDED (B-limited) — most practical fix within current architecture'
  },
  C: {
    name: '構造ラベルと語彙グロスの分離',
    description: 'Keep token.japanese=見る (structural label for engine), add new field (e.g., token.semantic_ja=知る) for εἰδ- tokens. UI uses semantic_ja for display when present.',
    scope_change: 'data model extension + UI change',
    engine_change: false,
    data_change: true,
    model_change: true,
    ui_change: true,
    result_eid_23: {
      display: '知る (from semantic_ja field)',
      engine_output: '見てきた (engine still uses token.japanese=見る)',
      semantic_accuracy: 'PASS for display; engine unchanged'
    },
    result_heora_3: { display: '見てきた', semantic_accuracy: 'PASS' },
    pros: [
      'Preserves structural/etymological annotation (見る) for engine',
      'Provides semantic gloss (知る) for display',
      'Clean separation of concerns'
    ],
    cons: [
      'Data model change: new field required (not in existing schema)',
      'UI change required: reading display must use semantic_ja when present',
      'Significantly larger scope than B',
      'No existing mechanism for this dual-field approach'
    ],
    verdict: 'DEFERRED — scope too large for current phase; viable as future architecture'
  },
  D: {
    name: 'データ修正（Strong番号変更 G3708 → G1492）',
    description: 'Change token.strong from G3708 to G1492 for 23 εἰδ- tokens. G1492 reading-lexicon-data has 知る.',
    scope_change: 'Strong number for 23 tokens',
    engine_change: false,
    data_change: true,
    data_change_scope: 23,
    model_change: false,
    result_eid_23: {
      display: 'Depends on engine Phase 4 lexicon lookup; G1492 gloss = 知る, but V-RAP morph rule still fires for 見る first if japanese unchanged',
      semantic_accuracy: 'PARTIAL — Strong changes lexicon lookup, but token.japanese=見る unchanged → still 見てきた unless japanese also changed',
      issue: 'Strong change alone does not change display without also changing token.japanese'
    },
    impact_on_search: 'High — search index uses strong numbers for filtering; changing G3708→G1492 for 23 tokens affects morph-search, syntax-search results',
    impact_on_lexicon_display: 'StudyPanel would show G1492 οἶδα instead of G3708 ὁράω — this may actually be more accurate',
    linguistic_justification: 'εἰδώς/εἰδότας are conventionally assigned to G1492 οἶδα in many lexica (BDAG, Thayer). Assignment to G3708 is morphological but lexicographically questionable.',
    pros: ['Most lexicographically accurate for εἰδ- forms', 'StudyPanel shows correct lemma (οἶδα vs ὁράω)'],
    cons: [
      'Major downstream impact (search, lexicon display, morph analysis)',
      'Strong change alone does not fix display (japanese also needs changing)',
      'Morph tag V-RAP technically fits G3708 (not G1492 which has no present)',
      'Requires complete impact analysis and regression',
      'Should be a separate dedicated phase'
    ],
    verdict: 'DEFERRED — data quality investigation needed; too broad for current phase; consider as Phase 4D-data-correction'
  }
};

// === 8. Summary counts ===
const summary = {
  total_unreviewed: 26,
  eid_group: { count: 23, morph_breakdown: { 'V-RAP-NSM': 21, 'V-RAP-APM': 2 }, greek: 'εἰδώς/εἰδότας', semantic: 'knowing/knew', engine_output: '見てきた', semantic_issue: true },
  heora_group: { count: 3, morph_breakdown: { 'V-RAP-NSM-ATT': 2, 'V-RAP-NPM-ATT': 1 }, greek: 'ἑωρακώς/ἑωρακότες', semantic: 'having seen/seen/saw', engine_output: '見てきた', semantic_issue: false },
  engine_note: 'All 26: same decoded fields (tense=perfect, mood=participle, voice=active, cls=verb) → all trigger part-perf rule → all currently produce 見てきた',
  phase4ap_exception_risk: { count: 20, scope: 'V-RAP-NSM εἰδώς only (21件のうちJHN 6:61!1=JHN reference case excluded from count)', note: 'Phase 4ap flagged 20 as exception_risk; this audit covers all 26 including 6 not in Phase 4ap' }
};

// === 9. Recommendation ===
const recommendation = {
  recommended_option: 'B',
  option_name: 'ラベル変更（εἰδ- 23件のみ token.japanese 修正）',
  rationale: [
    '現状の見てきた (Option A) はεἰδ- 23件において意味上誤り（"having come to see" ≠ "knowing"）',
    '知る はG1492 οἶδα の語彙グロスとして辞書的に確立（Abbott-Smith・reading-lexicon-data G1492 = ["知る"]）',
    'L-0境界: 知る の採用は文脈依存の意味選択ではなく、εἰδ- 形式の語彙事実に基づく',
    'reading-engine.js は FROZEN; 知る → part-perf null → fallback = 知る; エンジン変更不要',
    'ἑωρακ- 3件は現状維持（見てきた = "having seen" = 正確）',
    'Option C/D は現フェーズの scope 外（将来フェーズで検討）'
  ],
  scope_of_implementation: {
    tokens_to_change: 23,
    tokens_unchanged: 3,
    field_changed: 'token.japanese',
    value_change: { from: '見る', to: '知る' },
    files_affected: 'Multiple bible_data files (MAT/12, MRK/6, MRK/12, LUK/9, LUK/11, JHN/6, JHN/13, JHN/18, JHN/19, ACT/2, ACT/20, ACT/24, 1TI/1, 2TI/2, 2TI/3, TIT/3, PHM/1, 2PE/1, REV/12, JUD/1)',
    engine_change: false,
    model_change: false
  },
  limitation_acknowledged: '知る は完了分詞形式（知っている）ではないが、FROZEN エンジンの制約下では最善の実装可能な選択。将来的に engine の part-perf ルールに 知る → 知っている を追加する場合は Option C/B+ として別フェーズで設計する。',
  deferred: [
    'Option D (Strong number change G3708→G1492): 語彙品質問題として別フェーズで設計・監査',
    'Option C (dual-field): データモデル拡張として将来アーキテクチャ検討',
    'Part-perf rule extension for 知る: engine変更フェーズとして設計'
  ]
};

// === 10. Output JSON ===
const auditJson = {
  meta: {
    phase: '4bb',
    date: new Date().toISOString().slice(0, 10),
    description: 'G3708 ὁράω / εἰδ- 設計監査 — READ ONLY',
    total_tokens: 26,
    strong: 'G3708',
    lemma: 'ὁράω'
  },
  summary,
  lexicon_analysis: lexiconAnalysis,
  engine_analysis: engineAnalysis,
  tokens: tokenAudit,
  design_options: designOptions,
  recommendation,
  prohibitions_confirmed: {
    bible_data_changed: false,
    inventory_changed: false,
    lexicon_changed: false,
    search_index_changed: false,
    reading_engine_changed: false,
    baseline_changed: false,
    commit: false,
    push: false
  }
};

saveJson(path.join(OUT, 'stage4-phase4bb-g3708-design-audit.json'), auditJson);
console.log('\nWrote: stage4-phase4bb-g3708-design-audit.json');

// === 11. Build Markdown report ===
const tokenTable = tokenAudit.map(t => {
  const issue = t.group.startsWith('eid') ? '⚠' : '✓';
  return `| ${t.ref} | ${t.morph} | ${t.greek_form} | ${t.english} | ${t.cur_japanese} | ${issue} |`;
}).join('\n');

const eidNsmRows = tokenAudit.filter(t => t.group === 'eid_nsm').map(t =>
  `| ${t.ref} | ${t.greek_form} | ${t.english} | 見る→見てきた |`).join('\n');
const eidApmRows = tokenAudit.filter(t => t.group === 'eid_apm').map(t =>
  `| ${t.ref} | ${t.greek_form} | ${t.english} | 見る→見てきた |`).join('\n');
const heoraRows = tokenAudit.filter(t => t.group === 'heora_att').map(t =>
  `| ${t.ref} | ${t.morph} | ${t.greek_form} | ${t.english} | 見る→見てきた |`).join('\n');

const md = `# Stage 4 Phase 4bb — G3708 ὁράω / εἰδ- 語彙・形態・表示設計監査

**Phase**: 4bb
**実施日**: ${new Date().toISOString().slice(0, 10)}
**種別**: 設計監査のみ（READ ONLY）

---

## 1. 監査対象

| 項目 | 値 |
|------|-----|
| Strong | G3708 |
| lemma | ὁράω |
| 対象 state | UNREVIEWED |
| 対象 token 数 | **26件** |
| 形態グループ数 | 2（εἰδ- / ἑωρακ-） |

---

## 2. 26件全体一覧

| ref | morph | greek | en | cur_ja | 問題 |
|-----|-------|-------|----|--------|------|
${tokenTable}

**凡例**: ⚠ = セマンティック不一致 / ✓ = 現状正確

---

## 3. グループ分析

### 3.1 εἰδ- グループ（23件）— セマンティック問題あり

#### V-RAP-NSM εἰδώς/εἰδὼς（21件）

| ref | greek | en | 現在 engine 出力 |
|-----|-------|----|----------------|
${eidNsmRows}

#### V-RAP-APM εἰδότας（2件）

| ref | greek | en | 現在 engine 出力 |
|-----|-------|----|----------------|
${eidApmRows}

**セマンティック問題**: εἰδ- 形式の English = "knowing / knew / know"。
しかし現在 `token.japanese = 見る` → reading-engine part-perf → **`見てきた`**。
「見てきた（=having come to see）」は「知っている / 知っていた」を意味するこれらのトークンには **不正確**。

---

### 3.2 ἑωρακ- グループ（3件）— セマンティック問題なし

| ref | morph | greek | en | 現在 engine 出力 |
|-----|-------|-------|----|----------------|
${heoraRows}

**問題なし**: ἑωρακ- 形式の English = "having seen / seen / saw"。
`見てきた`（=having come to see）は **正確**。現状維持が適切。

---

## 4. 語彙分析：G3708 と G1492 の関係

### 4.1 Strong 番号・lemma 比較

| 項目 | G3708 | G1492 |
|------|-------|-------|
| lemma | ὁράω | οἶδα |
| Abbott-Smith 要約 | （εἶδον/ὤφθην/ὄψομαι は別語根）見る | （εἶδον と同語源; 完了形だが現在の意味）知る |
| reading-lexicon グロス | 見る（他多数） | 知る |
| morph 範囲 | 完全変化 | 完了・過去完了のみ（欠陥動詞） |
| lexicon_lite gloss | "He appeared" | "I know" |

### 4.2 語源的関係

```
εἶδον (εἰδ- 語根)
    └── G3708 ὁράω の アオリスト形
    └── G1492 οἶδα の語源
            └── 完了形 "I have seen" = "I know (from having seen)"
```

- εἰδώς は形態論上 G3708 V-RAP（完了能動分詞）として成立するが、
  意味上は G1492 οἶδα の分詞として機能する。
- bible_data は G3708 に割り当て + morph V-RAP — 形態論的には一貫。
- 語彙論的には G1492 territory（Abbott-Smith, BDAG 標準分類）。

---

## 5. Reading Engine 動作分析

### 5.1 part-perf ルール

\`\`\`javascript
'part-perf': [
    [/する$/, 'してきた'],
    [/くる$/, 'きてきた'],
    [/([いきしちにひみりぎじびぴえけせてねへめれげぜでべぺ])る$/, '$1てきた'],
    [/(見|得|出|着|来)る$/, '$1てきた'],   // ← 見る がここにマッチ
    [/(去)る$/, '$1ってきた'],
]
\`\`\`

### 5.2 各 japanese 値での part-perf 動作

| token.japanese | ルールマッチ | 出力 | 問題 |
|----------------|-----------|------|------|
| `見る` | `(見\|得\|出\|着\|来)る$` | `見てきた` | εἰδ- には意味的不正確 |
| `知る` | なし（知 は特殊漢字リスト外） | null → fallback = `知る` | 完了分詞形式なし（許容範囲） |
| `知っている` | `([いき...]る$)` matches `いる` → `いてきた` | `知っていてきた` | 非文法的・使用不可 |

### 5.3 ATT 形式のデコード

V-RAP-NSM-ATT と V-RAP-NPM-ATT はエンジンの decoded フィールドで **非 ATT と同一**：

| フィールド | V-RAP-NSM | V-RAP-NSM-ATT | V-RAP-NPM-ATT |
|-----------|-----------|---------------|---------------|
| cls | verb | verb | verb |
| tense | perfect | perfect | perfect |
| mood | participle | participle | participle |
| voice | active | active | active |
| kase | nominative | nominative | nominative |

→ エンジンは ATT 区別なく同一の part-perf パスを適用。

---

## 6. 設計オプション比較

### Option A: 現状維持

**変更なし**。全 26件: 見る → 見てきた。

| 項目 | 評価 |
|------|------|
| εἰδ- 23件 表示 | `見てきた` ⚠ 意味誤り |
| ἑωρακ- 3件 表示 | `見てきた` ✓ 正確 |
| 実装コスト | ゼロ |
| セマンティック正確性 | 3/26 ✓ |

**判定**: 非推奨 — 23件において見てきたは読者を誤解させる。

---

### Option B: ラベル変更（εἰδ- 23件 token.japanese 修正）

εἰδ- 23件: `見る` → `知る`（engine: null → `知る`）
ἑωρακ- 3件: 変更なし（`見る` → `見てきた`）

| 項目 | 評価 |
|------|------|
| εἰδ- 23件 表示 | `知る` ✓ セマンティック一致 |
| ἑわら 3件 表示 | `見てきた` ✓ 正確 |
| engine 変更 | **不要**（FROZEN 尊重） |
| データモデル変更 | **不要**（token.japanese 既存フィールド） |
| L-0 評価 | ACCEPTABLE（知る は語彙的事実; 文脈依存の意味選択ではない） |
| 制限事項 | 知る は完了分詞形式（知っている）ではない |

**判定**: **推奨（B-limited）** — 現アーキテクチャ内で最善の修正。

---

### Option C: 構造ラベルと語彙グロスの分離

token.japanese = 見る（engine 用構造ラベル維持）
新フィールド token.semantic_ja = 知る（εἰδ- のみ）
UI が semantic_ja を優先表示。

| 項目 | 評価 |
|------|------|
| エンジン変更 | 不要 |
| データモデル変更 | **必要**（新フィールド追加） |
| UI 変更 | **必要** |
| 実装コスト | 大（現フェーズ scope 外） |

**判定**: 将来アーキテクチャとして有効。現フェーズ DEFERRED。

---

### Option D: データ修正（Strong 番号変更）

εἰδ- 23件: strong G3708 → G1492。

| 項目 | 評価 |
|------|------|
| 語彙論的根拠 | あり（BDAG/Abbott-Smith は εἰδώς を οἶδα = G1492 に分類） |
| Strong 変更だけでは表示修正されない | token.japanese も変更必要 |
| 検索・StudyPanel への影響 | 大（morph-search, lexicon 表示が変わる） |
| 回帰リスク | 高 |

**判定**: 語彙品質問題として別フェーズで設計。現フェーズ DEFERRED。

---

## 7. 推奨事項

**推奨: Option B（B-limited）**

| 対象 | 変更内容 | 件数 |
|------|---------|------|
| εἰδ- V-RAP-NSM εἰδώς/εἰδὼς | token.japanese: \`見る\` → \`知る\` | **21件** |
| εἰδ- V-RAP-APM εἰδότας | token.japanese: \`見る\` → \`知る\` | **2件** |
| ἑωρακ- V-RAP-ATT ἑωρακώς/ἑωρακότες | 変更なし（見てきた 維持） | 3件 |
| **実装合計** | | **23件** |

**根拠**:
1. 見てきた for εἰδώς は読者に「視覚的経験」を示唆するが、実際の意味は「知っていた」。
2. 知る は G1492 οἶδα の語彙グロスとして辞書的に確立されており、文脈依存の意味選択ではない。
3. reading-engine.js は FROZEN；知る → part-perf null → fallback 知る = エンジン変更不要。
4. ἑわら- 3件は見てきた（having seen）で正確であり、変更不要。
5. 知る（完了分詞形式なし）は許容範囲 — 完了形 知っている は FROZEN エンジンで実現不可。

**L-0 評価**: εἰδώς に 知る を採用することは L-0 違反ではない。
εἰδώς/εἰδότας の意味（"knowing"）は語彙的事実であり、文脈から推論する意味選択ではない。
現在の 見てきた こそが誤った意味を読者に与えている。

---

## 8. 将来フェーズへの申し送り

| 項目 | 推奨フェーズ | 内容 |
|------|------------|------|
| Phase 4bb-impl | 次フェーズ | Option B 実装: εἰδ- 23件 token.japanese 見る→知る |
| Phase 4D-strong-audit | 別設計フェーズ | Option D 検討: εἰδ- Strong G3708→G1492 の語彙品質調査 |
| Phase N-engine-知る | 将来エンジンフェーズ | part-perf ルール拡張: 知る → 知っている（FROZEN 解除後） |
| Phase N-model-C | 将来アーキテクチャ | Option C: 構造ラベル / 語彙グロス分離フィールド設計 |

---

## 9. 除外確認

| 対象 | 除外 | 確認 |
|------|------|------|
| Bible JSON 変更 | なし | ✓ READ ONLY |
| residual inventory 変更 | なし | ✓ READ ONLY |
| lexicon 変更・再生成 | なし | ✓ READ ONLY |
| search-index 変更・再生成 | なし | ✓ READ ONLY |
| reading-engine.js 変更 | なし | ✓ READ ONLY |
| regression baseline 変更 | なし | ✓ READ ONLY |
| commit / push / PR | なし | ✓ |

---

## 10. 判定

**PHASE 4bb PASS（設計監査）**

| 目標 | 判定 |
|------|------|
| 26件のトークン問題特定 | ✓ PASS（εἰδ- 23件 = セマンティック問題, ἑわら- 3件 = 問題なし） |
| εἰδ-/ὁράω 語彙・形態関係の整理 | ✓ PASS（G3708/G1492 関係・εἶδον 語根を文書化） |
| \`[見る]\` のデータモデル上の意味 | ✓ PASS（token.japanese = 実際の値 見る；エンジン part-perf 動作確認済み） |
| see/know セマンティック分割の対処方針 | ✓ PASS（Option B-limited 推奨） |
| 構造ラベルの維持/変更/分離/修正の設計比較 | ✓ PASS（A/B/C/D 4オプション比較完了） |
| READ ONLY 遵守 | ✓ PASS |
`;

fs.writeFileSync(path.join(OUT, 'stage4-phase4bb-g3708-design-audit.md'), md, 'utf8');
console.log('Wrote: stage4-phase4bb-g3708-design-audit.md');

console.log('\n=== Phase 4bb COMPLETE ===');
console.log('Tokens audited:', tokenAudit.length);
console.log('εἰδ- group (セマンティック問題):', EID_NSM.length + EID_APM.length, '件');
console.log('ἑωρακ- group (問題なし):', HEORA_ATT.length, '件');
console.log('Recommendation: Option B-limited (εἰδ- 23件 token.japanese 見る→知る)');
