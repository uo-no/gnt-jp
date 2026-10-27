// morphgnt.json (112MB) を、書ごとの軽量JSON (data/MAT.json など) に変換します。
// 使い方:  node build-data.js [morphgnt.jsonのパス]
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || path.join(__dirname, 'morphgnt.json');
const outDir = path.join(__dirname, 'data');

if (!fs.existsSync(src)) {
  console.error(`❌ ${src} が見つかりません。先に bundle.js を実行するか、パスを指定してください。`);
  process.exit(1);
}

const TENSE  = { present: 'P', imperfect: 'I', future: 'F', aorist: 'A', perfect: 'X', pluperfect: 'Y' };
const VOICE  = { active: 'A', middle: 'M', passive: 'P' };
const MOOD   = { indicative: 'I', imperative: 'D', subjunctive: 'S', optative: 'O', infinitive: 'N', participle: 'P' };
const NUMBER = { singular: 'S', plural: 'P', dual: 'D' };

// 動詞なら "PAI3S" のような5文字コード（時制・態・法・人称・数。該当なしは "-"）、それ以外は ""
// morph文字列(V-2AAS-3S など)ではなく、データ内の tense/voice/mood フィールドを使うので
// 第2アオリストや ἰδού のような品詞が「小辞」扱いのものも正しく拾えます。
function verbCode(t) {
  if (!t.tense) return '';
  return (TENSE[t.tense] || '-') + (VOICE[t.voice] || '-') + (MOOD[t.mood] || '-') +
         (t.person || '-') + (NUMBER[t.number] || '-');
}

console.log('🔄 読み込み中...');
const all = JSON.parse(fs.readFileSync(src, 'utf-8'));

const books = {};
for (const t of all) {
  const b = (books[t.book] ||= {});
  const c = (b[Number(t.chapter)] ||= {});
  (c[Number(t.verse)] ||= []).push({ i: Number(t.tokenIndex), row: [t.text || '', t.after || '', t.japanese || t.gloss || '', verbCode(t), t.lemma || ''] });
}

fs.mkdirSync(outDir, { recursive: true });
let total = 0;
for (const [book, chapters] of Object.entries(books)) {
  const out = {};
  for (const [ch, verses] of Object.entries(chapters)) {
    out[ch] = {};
    for (const [vs, toks] of Object.entries(verses)) {
      out[ch][vs] = toks.sort((a, b) => a.i - b.i).map(x => x.row);
      total += toks.length;
    }
  }
  fs.writeFileSync(path.join(outDir, `${book}.json`), JSON.stringify(out), 'utf-8');
}
console.log(`✨ 完了: ${Object.keys(books).length} 冊 / ${total} 語 → data/*.json`);

// ── 統語論ビュー用: 章ごとの詳細データ (data/syn/<書>/<章>.json) ────────────────
// syntax/ の解析ツールが 1 章分だけを読み込めるように、必要なフィールドだけを残した
// トークンオブジェクトの配列を書きます（空の値は省略）。
const SYN_KEYS = ['ref', 'text', 'normalized', 'lemma', 'class', 'type', 'morph', 'person', 'number',
  'gender', 'case', 'tense', 'voice', 'mood', 'degree', 'after', 'japanese', 'gloss'];
const synDir = path.join(outDir, 'syn');
fs.rmSync(synDir, { recursive: true, force: true });
const byChapter = {};
for (const t of all) (byChapter[`${t.book}/${Number(t.chapter)}`] ||= []).push(t);
let synFiles = 0;
for (const [key, toks] of Object.entries(byChapter)) {
  toks.sort((a, b) => Number(a.verse) - Number(b.verse) || Number(a.tokenIndex) - Number(b.tokenIndex));
  const rows = toks.map(t => {
    const o = {};
    for (const k of SYN_KEYS) {
      const v = t[k];
      if (v === undefined || v === null || v === '') continue;
      if (k === 'normalized' && v === t.text) continue; // text と同じなら省略（cleanText が text にフォールバックする）
      o[k] = v;
    }
    return o;
  });
  const file = path.join(synDir, `${key}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(rows), 'utf-8');
  synFiles++;
}
console.log(`✨ 統語論ビュー用: ${synFiles} 章 → data/syn/<書>/<章>.json`);
