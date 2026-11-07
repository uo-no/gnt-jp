'use strict';
const fs = require('fs'), path = require('path');
const OUT = path.join(__dirname, 'output/stage4-final');

// G848 欠陥記録の修正: F-3APM 分析結果を反映
const fp = path.join(OUT, 'stage4-phase4bd-g848-defect-record.json');
const rec = JSON.parse(fs.readFileSync(fp, 'utf8'));

// 修正: 欠陥492件 / 再帰として正当1件（JHN 20:10!5）
rec.f3apm_analysis_correction = {
  original_count: { defect: 491, possibly_legitimate: 2 },
  corrected_count: { defect: 492, legitimate_reflexive: 1 },
  correction_note: 'MRK 9:16!7（αὑτούς F-3APM）は文脈上「彼らと議論する」の意味で人称代名詞用法。気息記号はあるが意味は再帰的でない。欠陥側に算入。JHN 20:10!5（αὑτοὺς F-3APM）はπρὸς αὑτοὺς の意味が「自分たちのところへ（家へ）」で JA1955「自分の家に帰って行った」と一致。japanese="自分" が正当。ただしこのトークンは inventory 未収録。',
  inventory_note: 'JHN 20:10!5 は inventory 未収録（過去フェーズ処理済み）。MRK 9:16!7 は HOLD_DATA_QUALITY 済み。',
};
rec.defect_summary_corrected = {
  total_bible_data: 493,
  legitimate_reflexive: 1,  // JHN 20:10!5 (未収録、処理済み)
  defect_confirmed: 492,    // 491(P-APM/ASF/APF) + 1(MRK 9:16 F-3APM)
  inventory_hold_dq: 437,
  not_in_inventory: 56,
};

fs.writeFileSync(fp, JSON.stringify(rec, null, 2), 'utf8');
console.log('G848 欠陥記録を修正しました。');
console.log('  欠陥確定: 492件（P-APM/ASF/APF 491件 + F-3APM MRK 9:16!7 1件）');
console.log('  再帰として正当: 1件（JHN 20:10!5、inventory 未収録）');
