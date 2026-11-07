#!/usr/bin/env node
/**
 * build-ja1955-ledger.cjs
 *
 * ja1955-nt-audit.json を正本として、修正判断・適用状況を追跡できる
 * 監査台帳 ja1955-nt-ledger.json を生成する。
 *
 * 既存の candidates / needsReview をそのまま保持し、各候補に
 * status / currentJapanese / proposedJapanese / ja1955Evidence /
 * decisionReason / reviewedAt / appliedCommit を追加する。
 *
 * 実行: node scripts/build-ja1955-ledger.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── 設定 ──────────────────────────────────────────────────────────────────

const AUDIT_JSON   = path.join(__dirname, 'output/ja1955-nt-audit.json');
const LEDGER_JSON  = path.join(__dirname, 'output/ja1955-nt-ledger.json');

// PR #471 でorigin/mainに適用済みのNT全体確認済みトークン（G3986×11 + G5278×5）
// ref → { after, commit, reviewedAt }
const APPLIED_NT_WIDE = {
  // G3986（誘惑→試錬）11件
  'JAS 1:2!7':    { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  '1CO 10:13!1':  { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  '1CO 10:13!24': { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  '1PE 1:6!11':   { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  '1PE 4:12!9':   { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  '2PE 2:9!5':    { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  'GAL 4:14!3':   { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  'HEB 3:8!14':   { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  'LUK 8:13!26':  { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  'LUK 22:28!10': { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  'REV 3:10!15':  { after: '試錬', commit: '6738af25', reviewedAt: '2026-10-29' },
  // G5278（忍耐する→耐え忍ぶ）5件
  'MAT 10:22!12': { after: '耐え忍ぶ', commit: '6738af25', reviewedAt: '2026-10-29' },
  'MAT 24:13!3':  { after: '耐え忍ぶ', commit: '6738af25', reviewedAt: '2026-10-29' },
  'MRK 13:13!12': { after: '耐え忍ぶ', commit: '6738af25', reviewedAt: '2026-10-29' },
  '2TI 2:10!4':   { after: '耐え忍ぶ', commit: '6738af25', reviewedAt: '2026-10-29' },
  '2TI 2:12!2':   { after: '耐え忍ぶ', commit: '6738af25', reviewedAt: '2026-10-29' },
};

// PR #471 パイロット（JAS 1:12–15）16件 ── audit.candidates に存在しないため別管理
const PILOT_APPLIED = [
  { ref: 'JAS 1:12!2',  strong: 'G435',  text: 'ἀνήρ',       before: '男',       after: '人',       reason: 'JA1955「人であったので」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:12!4',  strong: 'G5278', text: 'ὑπομείνας',  before: '忍耐する', after: '耐え忍ぶ',  reason: 'JA1955「耐え忍ぶ者は」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:12!5',  strong: 'G3986', text: 'πειρασμόν',  before: '誘惑',     after: '試錬',      reason: 'JA1955「試錬に耐えた者」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:13!2',  strong: 'G3985', text: 'πειράζομαι', before: '試みる',   after: '誘惑する',  reason: 'JA1955「誘惑されると言ってはならない」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:13!7',  strong: 'G3985', text: 'πειράζεται', before: '試みる',   after: '誘惑する',  reason: 'JA1955「神は悪に誘惑されるようなかたではない」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:13!14', strong: 'G3985', text: 'πειράζει',   before: '試みる',   after: '誘惑する',  reason: 'JA1955「神はだれをも誘惑されない」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:13!15', strong: 'G1161', text: 'δέ',          before: '［転換語句］', after: 'また', reason: 'JA1955「また神はだれをも誘惑されない」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:13!16', strong: 'G846',  text: 'αὐτός',       before: '彼',       after: '自ら',      reason: 'JA1955「ご自身もだれをも誘惑されない」（reflexive）', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:14!1',  strong: 'G1538', text: 'ἕκαστος',     before: '各自',     after: 'それぞれ',  reason: 'JA1955「おのおの」→「それぞれ」JA1955確認', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:14!3',  strong: 'G3985', text: 'πειράζεται',  before: '試みる',   after: '誘惑する',  reason: 'JA1955「自分の欲に引かれ、誘惑される」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:14!7',  strong: 'G1939', text: 'ἐπιθυμίας',   before: '欲望',     after: '欲',        reason: 'JA1955「自分の欲に引かれ」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:14!8',  strong: 'G1828', text: 'ἐξελκόμενος', before: '引き出す', after: '引く',      reason: 'JA1955「引かれ、誘惑される」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:15!3',  strong: 'G1939', text: 'ἐπιθυμία',    before: '欲望',     after: '欲',        reason: 'JA1955「欲がはらんで罪を生む」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:15!4',  strong: 'G4815', text: 'συλλαβοῦσα',  before: '捕らえる', after: 'はらむ',    reason: 'JA1955「欲がはらんで」（妊娠文脈）', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:15!5',  strong: 'G5088', text: 'τίκτει',      before: '産む',     after: '生む',      reason: 'JA1955「罪を生む」', commit: '6738af25', reviewedAt: '2026-10-29' },
  { ref: 'JAS 1:15!10', strong: 'G658',  text: 'ἀποτελεσθεῖσα', before: '完成する', after: '熟する', reason: 'JA1955「罪が熟して死を生む」', commit: '6738af25', reviewedAt: '2026-10-29' },
];

// Strong番号別の補正判定（ja1955-nt-audit-final.md に基づく）
const STRONG_STATUS = {
  'G5278': { status: '修正済み',    decisionReason: 'JA1955テキストに「耐え忍ぶ」を直接確認。全5件適用済み（PR #471）' },
  'G3986': { status: '修正済み',    decisionReason: 'JA1955テキストに「試錬」を直接確認。NT全体11件適用済み（PR #471）' },
  'G1939': { status: '要個別確認',  decisionReason: 'JHN 8:44（偽陽性）1件を除く28件が候補。JA1955「欲」「情欲」等の文脈確認が必要' },
  'G1538': { status: '要個別確認',  decisionReason: '35件候補。token位置での文脈確認推奨' },
  'G435':  { status: '要個別確認',  decisionReason: '116件候補。数量表現（五千人等）の偽ヒット除去後に適用可否判定が必要' },
  'G3985': { status: '要個別確認',  decisionReason: '1件のみ（保守ルール）。文脈確認推奨' },
  'G846':  { status: '要個別確認',  decisionReason: 'reflexive文脈のみ適用可。文脈確認必要' },
  'G1161': { status: '対象外（今回）', decisionReason: '303件。節内token対応の照合なしに一括適用不可。token-level照合が別途必要' },
  'G5088': { status: '対象外（今回）', decisionReason: 'NT他箇所は産む/生れる文脈、変更不適。JAS 1:15のみ（適用済み）' },
  'G658':  { status: '対象外（今回）', decisionReason: 'JAS 1:15のみ適用（適用済み）' },
  'G1828': { status: '対象外（今回）', decisionReason: 'JAS 1:14のみ（適用済み）' },
  'G4815': { status: '対象外（今回）', decisionReason: '捕える文脈が主。妊娠文脈はみごもる/宿す。JAS 1:15のみ（適用済み）' },
};

// ── メイン ────────────────────────────────────────────────────────────────

const audit = JSON.parse(fs.readFileSync(AUDIT_JSON, 'utf8'));

// candidates に status フィールドを付与
const enrichedCandidates = audit.candidates.map(c => {
  const applied = APPLIED_NT_WIDE[c.ref];
  if (applied) {
    return {
      ...c,
      status: '修正済み',
      currentJapanese: applied.after,
      proposedJapanese: applied.after,
      ja1955Evidence: c.ja1955_verse || '',
      decisionReason: (STRONG_STATUS[c.strong] || {}).decisionReason || c.reason,
      reviewedAt: applied.reviewedAt,
      appliedCommit: applied.commit,
    };
  }
  const strongInfo = STRONG_STATUS[c.strong] || {};
  return {
    ...c,
    status: strongInfo.status || '未確認',
    currentJapanese: c.japanese_before,
    proposedJapanese: c.japanese_proposed,
    ja1955Evidence: c.ja1955_verse || '',
    decisionReason: strongInfo.decisionReason || c.reason,
    reviewedAt: null,
    appliedCommit: null,
  };
});

// 統計
const statusCounts = {};
for (const c of enrichedCandidates) {
  statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
}

const ledger = {
  _meta: {
    version: 1,
    generated: '2026-10-30',
    source: 'ja1955-nt-audit.json (2026-10-29)',
    description: 'JA1955 NT全体監査台帳。候補ごとに修正判断・適用状況を追跡する。',
    fields: {
      status: '未確認 | 確認済み | 修正承認 | 修正済み | 保留 | 対象外（今回）| 要個別確認',
      currentJapanese: '現在のorigin/mainの値',
      proposedJapanese: '修正候補値',
      ja1955Evidence: '口語訳の対応箇所テキスト',
      decisionReason: '修正または維持の判断理由',
      reviewedAt: '確認日（YYYY-MM-DD）',
      appliedCommit: '反映したコミットSHA',
    },
  },
  stats: {
    ...audit.stats,
    statusCounts,
    appliedInPR471: {
      pilot: PILOT_APPLIED.length,
      ntWide: Object.keys(APPLIED_NT_WIDE).length,
      total: PILOT_APPLIED.length + Object.keys(APPLIED_NT_WIDE).length,
      commit: '6738af25',
    },
  },
  // NT全体監査候補（509件）に status 付与
  candidates: enrichedCandidates,
  // PR #471 パイロット適用記録（audit.candidates には含まれない）
  pilotApplied: PILOT_APPLIED.map(p => ({
    ...p,
    status: '修正済み',
    source: 'pilot/JAS 1:12-15',
    currentJapanese: p.after,
  })),
  // 要確認トークン（パイロット12ルール外）
  needsReviewCount: audit.needsReview.length,
  needsReviewNote: '105,063件はパイロット12ルール外。別監査サイクルで対応。audit.jsonのneedsReviewを参照。',
};

fs.writeFileSync(LEDGER_JSON, JSON.stringify(ledger, null, 2), 'utf8');
console.log('台帳生成完了:', LEDGER_JSON);
console.log('Status集計:');
for (const [s, n] of Object.entries(statusCounts)) {
  console.log(' ', s, ':', n, '件');
}
console.log('パイロット適用記録:', PILOT_APPLIED.length, '件');
