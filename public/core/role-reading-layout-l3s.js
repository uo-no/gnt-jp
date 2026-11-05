/* role-reading-layout-l3s.js

 * StudyPanel 第3層「語の関係」局所図専用のレイアウト・エンジン（段差版）。
 * role-reading-layout-l3.js（2026-10-31 凍結版）のコピーに、読みやすさの
 * 2点を組み込んだもの（2026-11-05、ユーザーの設計承認済み）:
 *
 * 1. 段差: stack() で、節マーカーのラベル［…］が前置するグループを
 *    ラベルの行から一段（ROW+GAPV）下げて配置する。対等な並列（vo）は
 *    従来どおり横並び。手動オフセット（rk-dy）のあるグループは段差なし。
 *    配置・高さ・経路がすべてエンジン内で一貫する。
 * 2. 下線回避（_avoidUnderlineRuns）: 水平な線分が無関係な語の下線と
 *    同じ高さで重なる／直下を並走する場合に、空いたレーンへ迂回させる
 *    （端点は動かさない）。layoutChapter の最終段で e.d に書き戻す。
 *
 * 読書モード「語の役割で読む」は現行の role-reading-layout.js を使う。
 * 凍結版 role-reading-layout-l3.js はそのまま残し、本ファイルへの切替は
 * index.html の _buildLocalRelationFrame の参照差し替えのみで行う。
 */
/* role-reading-layout.js
 * 「語の役割で読む」レイアウト・エンジン。
 * 作業スペースの Lowfat 文構造エディタ（rk-diagram-m3.html）の配置コア
 * （put/place/clause/stack/phrase/mods/resolve、Phase 1〜6 の SP 折り返しと
 * 実効 spWrapW を含む）を、DOM ではなくシム木（role-reading-adapter が生成）
 * の上で動作するよう移植したもの。配置ロジックはエディタと同一。
 *
 * シム木ノード: { tag:'sentence'|'wg'|'w', attrs:{...}, children:[], parent, text, id }
 * 座標の正は作業スペース側であり、本モジュールはその再現のみを行う。
 */
(function (global) {
  'use strict';

  var ctx = null;
  function measure(t) {
    if (!ctx) {
      ctx = document.createElement('canvas').getContext('2d');
      ctx.font = '22px "GFS Didot","Palatino Linotype",Georgia,serif';
    }
    return ctx.measureText(t).width;
  }

  var SLOT = { s: 1, v: 2, vc: 2, o: 3, o2: 3, p: 4 };
  var NONHEAD = new Set(['det', 'prep', 'conj']);
  var ROW = 38, IND = 30, GAPV = 8, GAPH = 60, PADX = 3, SP_MIN_WE = 150;
  var GEN_TH = 1000;

  /* ---- 実行時状態（layoutChapter ごとに初期化） ---- */
  var words, edges, EW, HM, GM, b2Pairs;
  var spWrapW = null;    // SP自動折り返し幅（null=折り返しなし=PC）
  var spWrapEff = null;  // 実効折り返し幅
  var detInline = true;
  var b2UL = false;

  function A(n, a) { var v = n.attrs ? n.attrs[a] : undefined; return v === undefined ? null : v; }
  function kids(n) { return n.children || []; }

  function put(el, x, y) {
    var t = A(el, 'unicode') || el.text || '';
    var w = { el: el, id: A(el, 'xml:id') || el.id || ('w' + words.length), text: t, w: measure(t), x: x, y: y, ay: y, ax: x };
    var rx = A(el, 'rk-x'), ry = A(el, 'rk-y');
    if (rx !== null && ry !== null) { w.x = +rx; w.y = +ry; w.manual = true; }
    var rw = A(el, 'rk-w'); w.ew = rw !== null && isFinite(+rw) ? +rw : 0;
    words.push(w); EW.set(el, w);
    return { head: w, tail: w, lead: w, w: w.w + 10, h: ROW };
  }

  function place(n, x, y, pre) {
    var _we0 = spWrapEff;
    if (spWrapW !== null) { var _r = spWrapW - x; spWrapEff = _r > SP_MIN_WE ? _r : SP_MIN_WE; }
    var _pr;
    if (n.tag === 'w') _pr = put(n, x, y);
    else {
      var ks = kids(n);
      if (!ks.length) _pr = { head: null, w: 0, h: 0 };
      else if (ks.some(function (k) { return SLOT[A(k, 'role')]; })) _pr = clause(ks, x, y);
      else {
        var isCl = function (k) { return k.tag === 'w' ? A(k, 'class') === 'conj' : (A(k, 'class') === 'cl' || A(k, 'type') === 'group' || /Conj/.test(A(k, 'rule') || '')); };
        if (n.tag === 'sentence' || (ks.some(function (k) { return k.tag === 'wg'; }) && ks.every(isCl))) _pr = stack(ks, x, y);
        else _pr = phrase(ks, x, y, pre);
      }
    }
    spWrapEff = _we0; return _pr;
  }

  function dyOf(k) { if (!k || k.tag !== 'wg') return 0; var v = parseFloat(A(k, 'rk-dy')); return isFinite(v) ? v : 0; }
  function dxOf(k) { if (!k || k.tag !== 'wg') return 0; var v = parseFloat(A(k, 'rk-dx')); return isFinite(v) ? v : 0; }

  function stack(ks, x, y) {
    var myWE = spWrapEff; var cy = y, nom = y, W = 0, first = null, fl = null, tail = null, conj = null;
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i];
      if (k.tag === 'w') { var nx = ks.slice(i + 1).find(function (c) { return c.tag === 'wg'; }); conj = put(k, x, Math.max(nom + dyOf(nx), cy)); continue; }
      /* 段差（L3S）: 節マーカーのラベル［…］が前置するグループは、ラベルの行から
         一段（ROW+GAPV）下げて配置する。対等な並列（vo）は clause 側の話で無関係。
         手動オフセット（rk-dy）があるグループは手動配置を優先して段差を付けない。 */
      var stepDy = (conj && dyOf(k) === 0 && /^［.*］$/.test(conj.head.text || '')) ? (ROW + GAPV) : 0;
      var py = Math.max(nom + dyOf(k), cy) + stepDy, cx = (conj ? x + conj.w + 40 : x) + dxOf(k), n0 = words.length, r = place(k, cx, py);
      if (!r.head) continue;
      var spW = false;
      if (myWE !== null && x >= 0 && conj && cx > x && cx - x + r.w > myWE) {
        var dy = ROW + 34, dx = x - cx;
        words.slice(n0).forEach(function (w) { w.x += dx; w.y += dy; w.ay += dy; if (!w.manual) w.ax += dx; });
        spW = true;
      }
      if (!first) {
        first = r.head; fl = conj ? conj.head : (r.lead || r.head);
        var row = words.slice(n0).filter(function (w) { return w.ay === py; }); if (conj) row.push(conj.head);
        tail = row.length ? row.reduce(function (m, w) { return w.x + w.w > m.x + m.w ? w : m; }, row[0]) : (r.tail || r.head);
      }
      GM.set(k, { nom: nom, py: py, floor: cy, conj: conj ? conj.head : null });
      if (conj) { edges.push({ a: conj.head, b: r.head, kind: 'dash', grp: k }); conj = null; }
      if (spW) { W = Math.max(W, r.w); var hh1 = Math.max(r.h, ROW) + 34; cy = py + (ROW + 34) + hh1; nom += hh1; }
      else { W = Math.max(W, cx - x + r.w); var hh2 = Math.max(r.h, ROW) + 34; cy = py + hh2; nom += hh2; }
    }
    return { head: first, tail: tail || first, lead: fl || first, w: W, h: Math.max(cy - y - 34, ROW) };
  }

  function mods(head, list, x, y0) {
    var myWE = spWrapEff; var cy = y0, nom = y0, W = 0;
    for (var ki = 0; ki < list.length; ki++) {
      var k = list[ki];
      var py = Math.max(nom + dyOf(k), cy); var px = x + IND + dxOf(k); var n0 = words.length; var r = place(k, px, py);
      if (!r.head) continue;
      var noInd = false;
      if (myWE !== null && x >= 0 && px - x + r.w > myWE) { var dx = x - px; words.slice(n0).forEach(function (w) { w.x += dx; if (!w.manual) w.ax += dx; }); noInd = true; }
      edges.push({ a: head, b: r.lead || r.head, kind: 'mod', grp: k.tag === 'wg' ? k : null });
      if (k.tag === 'wg') GM.set(k, { nom: nom, py: py, floor: cy, conj: null });
      W = Math.max(W, noInd ? r.w : IND + r.w); var hh = Math.max(r.h, ROW) + GAPV; cy = py + hh; nom += hh;
    }
    return { w: W, h: cy - y0 };
  }

  function clause(ks, x, y) {
    var myWE = spWrapEff;
    var slots = ks.filter(function (k) { return SLOT[A(k, 'role')]; }).sort(function (a, b) { return SLOT[A(a, 'role')] - SLOT[A(b, 'role')]; });
    var extra = ks.filter(function (k) { return slots.indexOf(k) === -1; });
    var cx = x, H = ROW, prev = null, pt = null, first = null, fl = null, last = null, vseen = false, vTail = null;
    var rowH = ROW, rowY = 0, maxW = 0;
    for (var si = 0; si < slots.length; si++) {
      var k = slots[si]; var role = A(k, 'role');
      var n0 = words.length;
      var r = place(k, cx, y + rowY); if (!r.head) continue;
      var curX = cx, curRY = rowY;
      if (spWrapW !== null && x >= 0 && cx > x && cx + r.w > spWrapW) {
        var dy = rowH + 34, dx = x - cx;
        words.slice(n0).forEach(function (w) { w.x += dx; w.y += dy; w.ay += dy; if (!w.manual) w.ax += dx; });
        curX = x; curRY = rowY + dy; rowY += dy; rowH = r.h;
      } else { rowH = Math.max(rowH, r.h); }
      if (!first) { first = r.head; fl = r.lead || r.head; }
      if (prev) { var bN = r.lead || r.head; var src = (vTail && SLOT[role] !== 2 && Math.abs((bN.y || 0) - (pt.y || 0)) > 200) ? vTail : pt; edges.push({ a: src, b: bN, kind: role === 'p' ? 'vp' : SLOT[role] === 2 ? 'sv' : 'vo' }); }
      if (SLOT[role] === 2 && extra.length && !vseen) {
        vseen = true;
        if (myWE !== null) { var _r2 = spWrapW - curX; spWrapEff = _r2 > SP_MIN_WE ? _r2 : SP_MIN_WE; }
        var m = mods(r.head, extra, curX, y + curRY + r.h); spWrapEff = myWE; r.w = Math.max(r.w, m.w); r.h += m.h; rowH = Math.max(rowH, r.h);
      }
      cx = curX + r.w + GAPH; maxW = Math.max(maxW, curX - x + r.w);
      last = { r: r, x: curX, ry: curRY }; prev = r.head; pt = r.tail || r.head; if (SLOT[role] === 2) vTail = pt; H = Math.max(H, curRY + r.h);
    }
    if (extra.length && !vseen && last) {
      if (myWE !== null) { var _r3 = spWrapW - last.x; spWrapEff = _r3 > SP_MIN_WE ? _r3 : SP_MIN_WE; }
      var m2 = mods(prev, extra, last.x, y + last.ry + last.r.h); spWrapEff = myWE;
      if (spWrapW === null) cx = last.x + Math.max(last.r.w, m2.w) + GAPH; else maxW = Math.max(maxW, last.x - x + Math.max(last.r.w, m2.w));
      H = Math.max(H, last.ry + last.r.h + m2.h);
    }
    return { head: first, tail: pt, lead: fl || first, w: spWrapW !== null ? maxW : Math.max(cx - x - GAPH, 0), h: H };
  }

  function hgt(n) { if (HM.has(n)) return HM.get(n); var v = hgt_(n); HM.set(n, v); return v; }
  function hMods(list) { var cy = 0; for (var i = 0; i < list.length; i++) { var h = hgt(list[i]); if (!h) continue; cy += Math.max(h, ROW) + GAPV; } return cy; }
  function hgt_(n) {
    if (n.tag === 'w') return ROW;
    var ks = kids(n); if (!ks.length) return 0;
    if (ks.some(function (k) { return SLOT[A(k, 'role')]; })) {
      var slots = ks.filter(function (k) { return SLOT[A(k, 'role')]; }).sort(function (a, b) { return SLOT[A(a, 'role')] - SLOT[A(b, 'role')]; });
      var extra = ks.filter(function (k) { return slots.indexOf(k) === -1; });
      var H = ROW, vseen = false, lastH = null;
      for (var i = 0; i < slots.length; i++) { var h = hgt(slots[i]); if (!h) continue; if (SLOT[A(slots[i], 'role')] === 2 && extra.length && !vseen) { vseen = true; h += hMods(extra); } lastH = h; H = Math.max(H, h); }
      if (extra.length && !vseen && lastH !== null) H = Math.max(H, lastH + hMods(extra));
      return H;
    }
    var isCl = function (k) { return k.tag === 'w' ? A(k, 'class') === 'conj' : (A(k, 'class') === 'cl' || A(k, 'type') === 'group' || /Conj/.test(A(k, 'rule') || '')); };
    if (n.tag === 'sentence' || (ks.some(function (k) { return k.tag === 'wg'; }) && ks.every(isCl))) {
      var cy = 0; for (var j = 0; j < ks.length; j++) { if (ks[j].tag === 'w') continue; var h2 = hgt(ks[j]); if (!h2) continue; cy += Math.max(h2, ROW) + 34; }
      return Math.max(cy - 34, ROW);
    }
    return hPhrase(ks);
  }
  function hPhrase(ks) {
    var pi = ks.findIndex(function (k) { return k.tag === 'w' && A(k, 'class') === 'prep'; });
    if (pi >= 0 && ks.length > 1) return Math.max(hPhrase(ks.filter(function (_, i) { return i !== pi; })), ROW);
    var hi = ks.findIndex(function (k) { return k.tag === 'w' && !NONHEAD.has(A(k, 'class')); });
    if (hi < 0) hi = ks.findIndex(function (k) { return k.tag === 'wg'; });
    if (hi < 0) hi = 0;
    if (hi >= 0 && ks[hi].tag === 'w' && A(ks[hi], 'class') === 'adj') { var ni = ks.findIndex(function (k) { return k.tag === 'w' && A(k, 'class') === 'noun'; }); if (ni >= 0) hi = ni; }
    if (ks.length >= 2 && ks[0].parent && A(ks[0].parent, 'rule') === 'ofNPNP') hi = ks.length - 1;
    if (detInline && ks[hi] && ks[hi].tag === 'wg' && A(ks[hi], 'rule') === 'NPofNP') {
      var rest_ = ks.filter(function (_, i) { return i !== hi; });
      if (rest_.length > 0 && rest_.every(function (k) { return k.tag === 'w' && A(k, 'class') === 'det'; })) {
        var fk = kids(ks[hi])[0];
        if (fk && fk.tag === 'w' && !NONHEAD.has(A(fk, 'class'))) return hgt(ks[hi]);
      }
    }
    if (detInline && ks[hi] && ks[hi].tag === 'wg' && A(ks[hi], 'rule') === 'NPDetAdj') {
      var rest2 = ks.filter(function (_, i) { return i !== hi; });
      if (rest2.length > 0 && rest2.every(function (k) { return k.tag === 'w' && A(k, 'class') === 'det'; })) {
        var fk2 = kids(ks[hi])[0];
        var ih = fk2 && fk2.tag === 'wg' && A(fk2, 'rule') === 'NPofNP' ? kids(fk2)[0] : null;
        if ((fk2 && fk2.tag === 'w' && !NONHEAD.has(A(fk2, 'class'))) || (ih && ih.tag === 'w' && !NONHEAD.has(A(ih, 'class')))) return hgt(ks[hi]);
      }
    }
    if (detInline && ks[hi] && ks[hi].tag === 'wg' && A(ks[hi], 'class') === 'cl') {
      var rest3 = ks.filter(function (_, i) { return i !== hi; });
      if (rest3.length > 0 && rest3.every(function (k) { return k.tag === 'w' && A(k, 'class') === 'det'; })) return hgt(ks[hi]);
    }
    return hgt(ks[hi]) + hMods(ks.filter(function (_, i) { return i !== hi; }));
  }

  function phrase(ks, x, y, pre) {
    pre = pre || []; var myWE = spWrapEff;
    var pi = ks.findIndex(function (k) { return k.tag === 'w' && A(k, 'class') === 'prep'; });
    if (pi >= 0 && ks.length > 1) {
      var n0 = words.length; var p = put(ks[pi], x, y); var nxX = x + p.w + 14;
      if (myWE !== null) { var _r = spWrapW - nxX; spWrapEff = _r > SP_MIN_WE ? _r : SP_MIN_WE; }
      var r = phrase(ks.filter(function (_, i) { return i !== pi; }), nxX, y); spWrapEff = myWE;
      if (spWrapW !== null && x >= 0 && nxX + r.w > spWrapW) {
        var dy = ROW + 34, dx = x - nxX;
        words.slice(n0 + 1).forEach(function (w) { w.x += dx; w.y += dy; w.ay += dy; if (!w.manual) w.ax += dx; });
        if (r.head) edges.push({ a: p.head, b: r.lead || r.head, kind: 'cont' });
        return { head: p.head, lead: p.head, tail: r.tail || r.head || p.head, w: p.w + 14 + r.w, h: dy + r.h };
      }
      if (r.head) edges.push({ a: p.head, b: r.lead || r.head, kind: 'cont' });
      return { head: p.head, lead: p.head, tail: r.tail || r.head || p.head, w: p.w + 14 + r.w, h: Math.max(r.h, ROW) };
    }
    var hi = ks.findIndex(function (k) { return k.tag === 'w' && !NONHEAD.has(A(k, 'class')); });
    if (hi < 0) hi = ks.findIndex(function (k) { return k.tag === 'wg'; });
    if (hi < 0) hi = 0;
    if (hi >= 0 && ks[hi].tag === 'w' && A(ks[hi], 'class') === 'adj') { var ni = ks.findIndex(function (k) { return k.tag === 'w' && A(k, 'class') === 'noun'; }); if (ni >= 0) hi = ni; }
    if (ks.length >= 2 && ks[0].parent && A(ks[0].parent, 'rule') === 'ofNPNP') hi = ks.length - 1;
    var rest = ks.filter(function (_, i) { return i !== hi; });
    var short = rest.filter(function (k) { return k.tag === 'w'; });
    var long = rest.filter(function (k) { return k.tag === 'wg'; });
    var isWg = ks[hi].tag === 'wg';
    var hoist = isWg && short.length > 0 && ks[0].parent && A(ks[0].parent, 'rule') === 'NPofNP' && A(ks[hi], 'rule') === 'Np-Appos' && hgt(ks[hi]) >= GEN_TH;
    if (!hoist && pre.length === 0) {
      if (detInline && ks[hi].tag === 'w' && rest.length > 0 && rest.every(function (k) { return k.tag === 'w' && A(k, 'class') === 'det'; })) {
        var cx1 = x, firstDr1 = null;
        for (var d1 = 0; d1 < rest.length; d1++) { var dr1 = put(rest[d1], cx1, y); if (!firstDr1) firstDr1 = dr1; cx1 += dr1.head.w + 14; }
        var hr1 = place(ks[hi], cx1, y);
        if (b2UL && firstDr1) b2Pairs.push({ det: firstDr1.head, noun: hr1.head, el: null });
        return { head: hr1.head, lead: EW.get(rest[0]) || hr1.head, tail: hr1.tail || hr1.head, w: cx1 - x + hr1.w, h: hr1.h, usedPre: true };
      }
      if (detInline && ks[hi].tag === 'wg' && A(ks[hi], 'rule') === 'AdjpNp' && rest.length > 0 && rest.every(function (k) { return k.tag === 'w' && A(k, 'class') === 'det'; }) && kids(ks[hi]).every(function (c) { return c.tag === 'w'; })) {
        var cx2 = x, firstDr2 = null;
        for (var d2 = 0; d2 < rest.length; d2++) { var dr2 = put(rest[d2], cx2, y); if (!firstDr2) firstDr2 = dr2; cx2 += dr2.head.w + 14; }
        var hr2 = place(ks[hi], cx2, y);
        if (b2UL && firstDr2) b2Pairs.push({ det: firstDr2.head, noun: hr2.head, el: null });
        return { head: hr2.head, lead: EW.get(rest[0]) || hr2.head, tail: hr2.tail || hr2.head, w: cx2 - x + hr2.w, h: hr2.h, usedPre: true };
      }
      if (detInline && ks[hi].tag === 'wg' && A(ks[hi], 'rule') === 'NPofNP' && rest.length > 0 && rest.every(function (k) { return k.tag === 'w' && A(k, 'class') === 'det'; })) {
        var npKids = kids(ks[hi]); var npHead = npKids[0];
        if (npHead && npHead.tag === 'w' && !NONHEAD.has(A(npHead, 'class'))) {
          var cx3 = x, firstDr3 = null;
          for (var d3 = 0; d3 < rest.length; d3++) { var dr3 = put(rest[d3], cx3, y); if (!firstDr3) firstDr3 = dr3; cx3 += dr3.head.w + 14; }
          var hr3 = place(ks[hi], cx3, y);
          if (b2UL && firstDr3) b2Pairs.push({ det: firstDr3.head, noun: hr3.head, el: null });
          return { head: hr3.head, lead: EW.get(rest[0]) || hr3.head, tail: hr3.tail || hr3.head, w: cx3 - x + hr3.w, h: hr3.h, usedPre: true };
        }
      }
      if (detInline && ks[hi].tag === 'wg' && A(ks[hi], 'rule') === 'NPDetAdj' && rest.length > 0 && rest.every(function (k) { return k.tag === 'w' && A(k, 'class') === 'det'; })) {
        var npKids2 = kids(ks[hi]); var npHead2 = npKids2[0];
        var npInner = npHead2 && npHead2.tag === 'wg' && A(npHead2, 'rule') === 'NPofNP' ? kids(npHead2)[0] : null;
        if ((npHead2 && npHead2.tag === 'w' && !NONHEAD.has(A(npHead2, 'class'))) || (npInner && npInner.tag === 'w' && !NONHEAD.has(A(npInner, 'class')))) {
          var cx4 = x, firstDr4 = null;
          for (var d4 = 0; d4 < rest.length; d4++) { var dr4 = put(rest[d4], cx4, y); if (!firstDr4) firstDr4 = dr4; cx4 += dr4.head.w + 14; }
          var hr4 = place(ks[hi], cx4, y);
          if (b2UL && firstDr4) b2Pairs.push({ det: firstDr4.head, noun: hr4.head, el: null });
          return { head: hr4.head, lead: EW.get(rest[0]) || hr4.head, tail: hr4.tail || hr4.head, w: cx4 - x + hr4.w, h: hr4.h, usedPre: true };
        }
      }
      if (detInline && ks[hi].tag === 'wg' && A(ks[hi], 'class') === 'cl' && rest.length > 0 && rest.every(function (k) { return k.tag === 'w' && A(k, 'class') === 'det'; })) {
        var cx5 = x, firstDr5 = null;
        for (var d5 = 0; d5 < rest.length; d5++) { var dr5 = put(rest[d5], cx5, y); if (!firstDr5) firstDr5 = dr5; cx5 += dr5.head.w + 14; }
        var hr5 = place(ks[hi], cx5, y);
        if (b2UL && firstDr5) b2Pairs.push({ det: firstDr5.head, noun: hr5.head, el: null });
        return { head: hr5.head, lead: EW.get(rest[0]) || hr5.head, tail: hr5.tail || hr5.head, w: cx5 - x + hr5.w, h: hr5.h, usedPre: true };
      }
      var hr = place(ks[hi], x, y), m = mods(hr.head, rest, x, y + hr.h);
      return { head: hr.head, lead: hr.lead || hr.head, tail: hr.tail || hr.head, w: Math.max(hr.w, m.w), h: hr.h + m.h, usedPre: true };
    }
    var hr6, m6;
    if (isWg) {
      hr6 = place(ks[hi], x, y, pre.concat(hoist ? short : []));
      if (hr6.usedPre) { m6 = mods(hr6.head, hoist ? long : rest, x, y + hr6.h); }
      else { m6 = mods(hr6.head, pre.concat(hoist ? short.concat(long) : rest), x, y + hr6.h); }
    } else {
      hr6 = place(ks[hi], x, y); m6 = mods(hr6.head, pre.concat(rest), x, y + hr6.h);
    }
    return { head: hr6.head, lead: hr6.lead || hr6.head, tail: hr6.tail || hr6.head, w: Math.max(hr6.w, m6.w), h: hr6.h + m6.h, usedPre: true };
  }

  function resolve() {
    var R = function (w) { return { l: w.x - 6, r: w.x + w.w + 6, t: w.y - 26, b: w.y + 10 }; };
    var au = words.filter(function (w) { return !w.manual; }).sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    var idx = new Map(au.map(function (w, i) { return [w, i]; }));
    for (var pass = 0; pass < 8; pass++) {
      var ch = false;
      for (var ai = 0; ai < au.length; ai++) {
        var a = au[ai];
        for (var oi = 0; oi < words.length; oi++) {
          var o = words[oi];
          if (o === a || (!o.manual && idx.get(o) > idx.get(a))) continue;
          var p = R(a), q = R(o);
          if (p.l < q.r && q.l < p.r && p.t < q.b && q.t < p.b) { a.x = o.x + o.w + 14; ch = true; }
        }
      }
      if (!ch) break;
    }
  }

  /* ── 複数行エッジの迂回ルーティング ─────────────────────────────
   * 複数行にまたがる mod / dash を直線で結ぶと、途中の行の語の字形を
   * 横切ってしまう（日本語ラベルは幅が広く、列間隔 IND=30 に対して
   * 字形がはみ出すため、素直な縦チャネルも空いていないことがある）。
   * そこで文の全語の字形ボックスを避ける縦チャネルを実測で探し、
   * 「横移動（アンダーライン高さ）→ 縦に降りる → 最後に斜め/横に入る」
   * 経路を e.d として事前計算する。直線より交差が減らない場合は直線のまま。 */
  function _inkBox(w) { return { l: w.x - 1, r: w.x + w.w + 1, t: w.y - 19, b: w.y + 3 }; }
  function _segHits(x1, y1, x2, y2, r) {
    var inX = function (x) { return x >= r.l && x <= r.r; }, inY = function (y) { return y >= r.t && y <= r.b; };
    if (inX(x1) && inY(y1) || inX(x2) && inY(y2)) return true;
    if (x1 === x2) return inX(x1) && Math.max(Math.min(y1, y2), r.t) <= Math.min(Math.max(y1, y2), r.b) && !(Math.max(y1, y2) < r.t || Math.min(y1, y2) > r.b);
    if (y1 === y2) return inY(y1) && !(Math.max(x1, x2) < r.l || Math.min(x1, x2) > r.r);
    var dx = x2 - x1, dy = y2 - y1, t0 = 0, t1 = 1, p, q, u;
    var clip = function (pp, qq) { if (pp === 0) return qq >= 0; u = qq / pp; if (pp < 0) { if (u > t1) return false; if (u > t0) t0 = u; } else { if (u < t0) return false; if (u < t1) t1 = u; } return true; };
    return clip(-dx, x1 - r.l) && clip(dx, r.r - x1) && clip(-dy, y1 - r.t) && clip(dy, r.b - y1) && t0 <= t1;
  }
  function _countHits(segs, boxes) {
    var n = 0;
    for (var i = 0; i < boxes.length; i++) for (var j = 0; j < segs.length; j++) if (_segHits(segs[j][0], segs[j][1], segs[j][2], segs[j][3], boxes[i])) { n++; break; }
    return n;
  }
  function _parsePath(d) {
    var toks = d.match(/[MLVH]|-?\d+(?:\.\d+)?/g), segs = [], i = 0, cx = 0, cy = 0, cmd = null;
    while (i < toks.length) {
      if (/^[MLVH]$/.test(toks[i])) { cmd = toks[i++]; continue; }
      var v = parseFloat(toks[i++]);
      if (cmd === 'M') { cx = v; cy = parseFloat(toks[i++]); cmd = 'L'; }
      else if (cmd === 'L') { segs.push([cx, cy, v, parseFloat(toks[i])]); cx = v; cy = parseFloat(toks[i++]); }
      else if (cmd === 'V') { segs.push([cx, cy, cx, v]); cy = v; }
      else if (cmd === 'H') { segs.push([cx, cy, v, cy]); cx = v; }
    }
    return segs;
  }
  /* e.d 未設定時に edgePath が返す既定経路のセグメント（比較の基準）。 */
  function _defaultSegs(e) { return _parsePath(edgePath({ kind: e.kind, a: e.a, b: e.b })); }
  /* 語ブロック（字形＋下線プラットフォーム、左右3のマージン）。
     線がプラットフォームを斜め・縦に切り抜けるのも「被り」として扱う。 */
  function _blockBox(w) { return { l: w.x - 3, r: w.x + w.w + 3, t: w.y - 19, b: w.y + 4 }; }
  function _segHitsB(x1, y1, x2, y2, r) {
    /* ベースライン（下線の高さ）上の水平移動は共有インフラとして除外。
       一点接触（区間の長さゼロ）もヒットにしない。 */
    if (y1 === y2 && y1 === r.b) return false;
    var dx = x2 - x1, dy = y2 - y1, t0 = 0, t1 = 1, u;
    var clip = function (p, q) { if (p === 0) return q >= 0; u = q / p; if (p < 0) { if (u > t1) return false; if (u > t0) t0 = u; } else { if (u < t0) return false; if (u < t1) t1 = u; } return true; };
    if (!(clip(-dx, x1 - r.l) && clip(dx, r.r - x1) && clip(-dy, y1 - r.t) && clip(dy, r.b - y1))) return false;
    return t1 - t0 > 1e-9;
  }
  /* [字形ヒット数, ブロックヒット数] を返す。辞書順で比較する
     （字形ヒットを増やしてブロックヒットを減らす交換はしない）。 */
  function _count2(segs, ink, blk) {
    var ni = 0, nb = 0;
    for (var i = 0; i < ink.length; i++) {
      for (var j = 0; j < segs.length; j++) if (_segHits(segs[j][0], segs[j][1], segs[j][2], segs[j][3], ink[i])) { ni++; break; }
      for (var k = 0; k < segs.length; k++) if (_segHitsB(segs[k][0], segs[k][1], segs[k][2], segs[k][3], blk[i])) { nb++; break; }
    }
    return [ni, nb];
  }
  function _better2(c, best) { return c[0] < best[0] || (c[0] === best[0] && c[1] < best[1]); }

  function _routeLongEdges(sent) {
    var boxes = sent.words.map(_inkBox);
    var blocks = sent.words.map(_blockBox);
    for (var ei = 0; ei < sent.edges.length; ei++) {
      var e = sent.edges[ei];
      var a = e.a, b = e.b, ay = a.y + 4, by = b.y + 4;
      var dy = Math.abs(by - ay);
      /* 端点の語も障害物に含めて既定経路を数える。到達の斜め線が
         自分自身の接続先の字形の角を切るケースをここで拾う。 */
      var defC = _count2(_defaultSegs(e), boxes, blocks);
      if (defC[0] === 0 && defC[1] === 0) continue;
      if (e.kind === 'sv' || e.kind === 'vo' || e.kind === 'vp' || e.kind === 'cont') {
        var ar = a.x + a.w + 4, bl = b.x - 4;
        var bestC = defC, bestDD = null;
        var candS = [ar, bl];
        for (var cs = 0; cs < boxes.length; cs++) { candS.push(boxes[cs].l - 3); candS.push(boxes[cs].r + 3); }
        var seenS = {};
        for (var ks = 0; ks < candS.length; ks++) {
          var X = Math.round(candS[ks]);
          if (seenS[X]) continue; seenS[X] = 1;
          var px = (X + bl) / 2;
          var segs = [];
          if (X !== ar) segs.push([ar, ay, X, ay]);
          segs.push([X, ay, X, by]);
          if (X !== bl) segs.push([X, by, bl, by]);
          if (e.kind !== 'cont') segs.push([px, by - 24, px, e.kind === 'sv' ? by + 10 : by]);
          var cc = _count2(segs, boxes, blocks);
          if (_better2(cc, bestC)) { bestC = cc; bestDD = 'M' + ar + ',' + ay + (X !== ar ? 'H' + X : '') + 'V' + by + (X !== bl ? 'H' + bl : '') + (e.kind !== 'cont' ? 'M' + px + ',' + (by - 24) + 'L' + px + ',' + (e.kind === 'sv' ? by + 10 : by) : ''); if (cc[0] === 0 && cc[1] === 0) break; }
        }
        if (bestDD) e.d = bestDD;
        continue;
      }
      if (e.kind !== 'mod' && e.kind !== 'dash') continue;
      var preC = defC, preD = null;
      if (e.kind === 'dash' && dy <= 46) {
        /* 近距離の dash: 既定の斜め線は両端の語の角を切りやすい。
           下線より下を水平に進んで接続先の脇で立ち上がる直交経路と、
           上を迂回する帽子型を候補に、最も交差の少ないものを選ぶ。 */
        var sxD = a.x + a.w / 2, txD = b.x + b.w / 2, syD = ay + 6, tyD = by - 24;
        var vxSet = [b.x - 6, b.x + b.w + 6, a.x + a.w + 6, a.x - 6];
        for (var vd = 0; vd < boxes.length; vd++) { vxSet.push(boxes[vd].l - 3); vxSet.push(boxes[vd].r + 3); }
        var seenD = {};
        for (var kd = 0; kd < vxSet.length; kd++) {
          var vx = Math.round(vxSet[kd]);
          if (seenD[vx]) continue; seenD[vx] = 1;
          var segsD = [[sxD, syD, vx, syD], [vx, syD, vx, tyD], [vx, tyD, txD, tyD]];
          var cD = _count2(segsD, boxes, blocks);
          if (_better2(cD, preC)) { preC = cD; preD = 'M' + sxD + ',' + syD + 'H' + vx + 'V' + tyD + 'H' + txD; if (cD[0] === 0 && cD[1] === 0) break; }
        }
        if (preC[0] > 0 || preC[1] > 0) {
          var hatSegs = [[sxD, syD, sxD, by - 30], [sxD, by - 30, txD, by - 30], [txD, by - 30, txD, tyD]];
          var cHat = _count2(hatSegs, boxes, blocks);
          if (_better2(cHat, preC)) { preC = cHat; preD = 'M' + sxD + ',' + syD + 'V' + (by - 30) + 'H' + txD + 'V' + tyD; }
        }
        if (preC[0] === 0 && preC[1] === 0) { e.d = preD; continue; }
        if (dy <= 8) { if (preD) e.d = preD; continue; }
        /* 直交で解消しきれなければ、その結果を持ってチャネル経路へ進む */
      }
      var isMod = e.kind === 'mod';
      var sx = isMod ? a.x + Math.min(14, a.w) : a.x + a.w / 2;
      var sy = isMod ? ay : ay + 6;
      var tx = isMod ? b.x - PADX : b.x + b.w / 2;
      var ty = isMod ? by : by - 24;
      var others = boxes, othersB = blocks;
      var bestC2 = preC, bestD = preD;
      var yMid = isMod ? (by > ay ? by - 30 : by + 30) : ty;
      var cand = [sx, tx, a.x + 4, b.x - PADX - 6];
      for (var ci = 0; ci < others.length; ci++) { cand.push(others[ci].l - 3); cand.push(others[ci].r + 3); }
      var lo = Math.min(a.x, b.x) - 260, hi = Math.max(a.x + a.w, b.x + b.w) + 80;
      var seen = {};
      for (var k = 0; k < cand.length; k++) {
        var X = Math.round(cand[k]);
        if (X < lo || X > hi || seen[X]) continue; seen[X] = 1;
        var segs = [];
        if (X !== sx) segs.push([sx, sy, X, sy]);
        segs.push([X, sy, X, yMid]);
        segs.push([X, yMid, tx, ty]);
        var c2 = _count2(segs, others, othersB);
        if (_better2(c2, bestC2)) { bestC2 = c2; bestD = 'M' + sx + ',' + sy + (X !== sx ? 'H' + X : '') + 'V' + yMid + 'L' + tx + ',' + ty; if (c2[0] === 0 && c2[1] === 0) break; }
      }
      if (bestD) e.d = bestD;
      /* 単一チャネルで解消できない mod は、行間の水平回廊でチャネルを
         乗り換える2チャネル経路を試す（V→回廊H→V→斜め）。 */
      if (isMod && (bestC2[0] > 0 || bestC2[1] > 0)) {
        var yTop = Math.min(sy, ty), yBot = Math.max(sy, ty);
        var bases = [];
        for (var bi = 0; bi < others.length; bi++) { var bb = Math.round(others[bi].t + 19); if (bases.indexOf(bb) < 0) bases.push(bb); }
        bases.sort(function (p, q) { return p - q; });
        var corridors = [];
        for (var ci2 = 0; ci2 + 1 < bases.length; ci2++) {
          if (bases[ci2 + 1] - bases[ci2] >= 24) {
            var yc = Math.floor((bases[ci2] + 3 + bases[ci2 + 1] - 19) / 2) + 4;
            if (yc > yTop + 20 && yc < yBot - 20) corridors.push(yc);
          }
        }
        var cand2 = [sx, tx];
        for (var cj = 0; cj < others.length; cj++) { cand2.push(others[cj].l - 3); cand2.push(others[cj].r + 3); }
        var seen2 = {}, Xs = [];
        for (var kk = 0; kk < cand2.length; kk++) { var Xv = Math.round(cand2[kk]); if (Xv < lo || Xv > hi || seen2[Xv]) continue; seen2[Xv] = 1; Xs.push(Xv); }
        var budget = 260000, found2 = null;
        outer:
        for (var co = 0; co < corridors.length; co++) {
          var yC = corridors[co];
          for (var x1i = 0; x1i < Xs.length; x1i++) {
            var X1 = Xs[x1i];
            var segA = []; if (X1 !== sx) segA.push([sx, sy, X1, sy]); segA.push([X1, sy, X1, yC]);
            budget -= segA.length * others.length * 2; if (budget < 0) break outer;
            var cA = _count2(segA, others, othersB);
            if (cA[0] > 0 || cA[1] > 0) continue;
            for (var x2i = 0; x2i < Xs.length; x2i++) {
              var X2 = Xs[x2i];
              var segB = []; if (X2 !== X1) segB.push([X1, yC, X2, yC]); segB.push([X2, yC, X2, yMid]); segB.push([X2, yMid, tx, ty]);
              budget -= segB.length * others.length * 2; if (budget < 0) break outer;
              var cB = _count2(segB, others, othersB);
              if (cB[0] === 0 && cB[1] === 0) {
                found2 = 'M' + sx + ',' + sy + (X1 !== sx ? 'H' + X1 : '') + 'V' + yC + (X2 !== X1 ? 'H' + X2 : '') + 'V' + yMid + 'L' + tx + ',' + ty;
                break outer;
              }
            }
          }
        }
        if (found2) e.d = found2;
        else {
          /* 最終手段: バンド（行）ごとに空きチャネルを動的計画法でつなぐ。
             系図のような超長距離でも、行間の回廊でチャネルを乗り換えながら降りる。
             バンドの遮断区間は語ブロック（プラットフォーム込み）で取る。 */
          var allB = [];
          for (var bq = 0; bq < sent.words.length; bq++) { var yq = sent.words[bq].y; if (allB.indexOf(yq) < 0) allB.push(yq); }
          var loB = Math.min(a.y, b.y), hiB = Math.max(a.y, b.y);
          var bandY = allB.filter(function (Y) { return Y > loB && Y < hiB; });
          bandY.sort(function (p, q) { return by > ay ? p - q : q - p; });
          /* 近すぎる行は1バンドにまとめる（インク帯が重なるため回廊が作れない） */
          var bands = [];
          for (var bg = 0; bg < bandY.length; bg++) {
            if (bands.length && Math.abs(bandY[bg] - bands[bands.length - 1][bands[bands.length - 1].length - 1]) < 24) bands[bands.length - 1].push(bandY[bg]);
            else bands.push([bandY[bg]]);
          }
          if (bands.length > 0 && bands.length <= 220) {
            var blocked = bands.map(function (grp) {
              return othersB.filter(function (bx) { return grp.indexOf(Math.round(bx.t + 19)) >= 0; }).map(function (bx) { return [bx.l, bx.r]; });
            });
            var corY = bands.map(function (grp, gi) {
              var prevY = gi === 0 ? a.y : bands[gi - 1][bands[gi - 1].length - 1];
              return by > ay
                ? Math.floor((prevY + 3 + grp[0] - 19) / 2) + 4
                : Math.floor((prevY - 19 + grp[grp.length - 1] + 3) / 2) + 4;
            });
            var candX = function (gi) {
              var set = [sx, tx], iv = blocked[gi];
              for (var iv2 = 0; iv2 < iv.length; iv2++) { set.push(iv[iv2][0] - 1); set.push(iv[iv2][1] + 1); }
              var out = [], seen3 = {};
              for (var s3 = 0; s3 < set.length; s3++) { var xv = Math.round(set[s3]); if (xv < lo - 40 || xv > hi + 40 || seen3[xv]) continue; seen3[xv] = 1; out.push(xv); }
              return out;
            };
            var hitAt = function (gi, X) { var iv = blocked[gi]; for (var q2 = 0; q2 < iv.length; q2++) if (X > iv[q2][0] && X < iv[q2][1]) return 1; return 0; };
            var INF = 1e9;
            var dpPrev = new Map(), par = [];
            var xs0 = candX(0);
            for (var x0 = 0; x0 < xs0.length; x0++) dpPrev.set(xs0[x0], hitAt(0, xs0[x0]) * 10000 + (xs0[x0] !== sx ? 1 : 0));
            par.push(new Map());
            for (var gi2 = 1; gi2 < bands.length; gi2++) {
              var xs = candX(gi2), dpCur = new Map(), parCur = new Map();
              dpPrev.forEach(function (cost, Xp) {
                for (var xc = 0; xc < xs.length; xc++) {
                  var Xn = xs[xc], add = hitAt(gi2, Xn) * 10000;
                  if (Xn !== Xp) {
                    add += 1;
                    /* 回廊での横移動が字形・ブロックに触れないこと */
                    var hseg = [[Math.min(Xp, Xn), corY[gi2], Math.max(Xp, Xn), corY[gi2]]];
                    var cH = _count2(hseg, others, othersB);
                    if (cH[0] > 0 || cH[1] > 0) return;
                  }
                  var nc = cost + add;
                  if (!dpCur.has(Xn) || nc < dpCur.get(Xn)) { dpCur.set(Xn, nc); parCur.set(Xn, Xp); }
                }
              });
              par.push(parCur); dpPrev = dpCur;
            }
            var bestX = null, bestC = INF;
            dpPrev.forEach(function (cost, Xl) {
              var cF = _count2([[Xl, yMid, tx, ty]], others, othersB);
              var c2v = cost + cF[0] * 10000 + cF[1];
              if (c2v < bestC) { bestC = c2v; bestX = Xl; }
            });
            if (bestX !== null && bestC < bestC2[0] * 10000 + bestC2[1]) {
              var chain = [bestX];
              for (var gb = bands.length - 1; gb >= 1; gb--) { chain.unshift(par[gb].get(chain[0])); }
              var dStr = 'M' + sx + ',' + sy, curX = sx;
              for (var gc = 0; gc < chain.length; gc++) {
                var target = chain[gc], yTo = gc === 0 ? corY[0] : corY[gc];
                if (gc === 0) { if (target !== curX) { dStr += 'H' + target; curX = target; } dStr += 'V' + yTo; }
                else { dStr += 'V' + corY[gc]; if (target !== curX) { dStr += 'H' + target; curX = target; } }
              }
              dStr += 'V' + yMid + 'L' + tx + ',' + ty;
              e.d = dStr;
            }
          }
        }
      }
    }
    _spreadLeftChannels(sent);
  }

  /* 左端チャネルの分散（局所図向け）: 最も左の語より左側に長い縦線を
     持つ辺が複数あると、縦線同士が数単位の間隔で重なり・連なり、
     枠の左端で判別できなくなる。長い順に優先し、近接する縦線は
     左へ12単位ずつ逃がして最低12の間隔を空ける。対象は実効経路
     （e.d があればそれ、なければ edgePath の既定形）。左側は語の
     ない余白だが、念のため元の経路より字形・ブロック交差が悪化
     しない場合だけ採用する。 */
  function _shiftChannelX(d, X0, X1) {
    var subs = d.split('M').filter(function (x) { return x.length; });
    if (!subs.length) return null;
    var segs = _parsePath('M' + subs[0]);
    var touched = false;
    var nsegs = segs.map(function (sg) {
      var a = sg[0] === X0 ? X1 : sg[0], c = sg[2] === X0 ? X1 : sg[2];
      if (a !== sg[0] || c !== sg[2]) touched = true;
      return [a, sg[1], c, sg[3]];
    });
    if (!touched) return null;
    /* 縦線で終わる形（帰還の横線なし）は、元の到達点までの横線を補う */
    var last = segs[segs.length - 1];
    var nlast = nsegs[nsegs.length - 1];
    if (last && last[0] === last[2] && nlast[2] !== last[2]) {
      nsegs.push([nlast[2], nlast[3], last[2], last[3]]);
    }
    var out = 'M' + nsegs[0][0] + ',' + nsegs[0][1];
    for (var i = 0; i < nsegs.length; i++) out += 'L' + nsegs[i][2] + ',' + nsegs[i][3];
    /* 目盛り（sv/vo/vp の別サブパス）は帰還の横線の中央へ付け直す */
    if (subs.length > 1) {
      var ret = null;
      for (var j = nsegs.length - 1; j >= 0; j--) { var sg2 = nsegs[j]; if (sg2[1] === sg2[3] && sg2[0] !== sg2[2]) { ret = sg2; break; } }
      var tsegs = _parsePath('M' + subs[1]);
      if (ret && tsegs.length === 1) {
        var px = Math.round((ret[0] + ret[2]) / 2);
        out += 'M' + px + ',' + tsegs[0][1] + 'L' + px + ',' + tsegs[0][3];
      } else {
        out += 'M' + subs.slice(1).join('M');
      }
    }
    return out;
  }
  function _spreadLeftChannels(sent) {
    var boxes = sent.words.map(_inkBox);
    var blocks = sent.words.map(_blockBox);
    var minWX = Infinity;
    sent.words.forEach(function (w) { if (w.x < minWX) minWX = w.x; });
    var items = [];
    sent.edges.forEach(function (e) {
      var effD = e.d || edgePath(e);
      var segs = _parsePath(effD);
      for (var i = 0; i < segs.length; i++) {
        var sg = segs[i];
        if (sg[0] === sg[2] && Math.abs(sg[3] - sg[1]) >= 60 && sg[0] <= minWX + 6) {
          items.push({ e: e, d: effD, X: sg[0], y1: Math.min(sg[1], sg[3]), y2: Math.max(sg[1], sg[3]), span: Math.abs(sg[3] - sg[1]) });
          break;
        }
      }
    });
    items.sort(function (p, q) { return q.span - p.span; });
    var placed = [];
    items.forEach(function (it) {
      var X = it.X, guard = 0;
      var conflicts = function (x) {
        return placed.some(function (p) {
          if (Math.abs(p.X - x) >= 12) return false;
          var gap = Math.max(it.y1, p.y1) - Math.min(it.y2, p.y2);
          return gap < 30;
        });
      };
      while (conflicts(X) && guard++ < 6) X -= 12;
      if (X !== it.X) {
        var nd = _shiftChannelX(it.d, it.X, X);
        if (nd) {
          var cN = _count2(_parsePath(nd), boxes, blocks);
          var cO = _count2(_parsePath(it.d), boxes, blocks);
          if (cN[0] <= cO[0] && cN[1] <= cO[1]) { it.e.d = nd; it.d = nd; it.X = X; }
        }
      }
      placed.push(it);
    });
  }

  /* エディタの draw() の pd() を移植（線の経路生成）。 */
  function edgePath(e) {
    if (e.d) return e.d;
    var a = e.a, b = e.b, ay = a.y + 4, by = b.y + 4;
    if (e.kind === 'mod') {
      var sx = a.x + Math.min(14, a.w), tx = b.x - PADX;
      if (Math.abs(tx - sx) > 150 && Math.abs(by - ay) > 40) return 'M' + sx + ',' + ay + 'V' + by + 'H' + tx;
      return 'M' + sx + ',' + ay + 'L' + tx + ',' + by;
    }
    if (e.kind === 'dash') {
      var sx2 = a.x + a.w / 2, tx2 = b.x + b.w / 2;
      if (Math.abs(tx2 - sx2) > 150 && Math.abs(by - ay) > 40) return 'M' + sx2 + ',' + (ay + 6) + 'V' + (by - 24) + 'H' + tx2;
      return 'M' + sx2 + ',' + (ay + 6) + 'L' + tx2 + ',' + (by - 24);
    }
    var ar = a.x + a.w + 4, bl = b.x - 4, d = 'M' + ar + ',' + ay + 'L' + bl + ',' + by;
    if (e.kind === 'cont') return d;
    var px = (ar + bl) / 2, py = (ay + by) / 2;
    if (e.kind === 'sv') return d + 'M' + px + ',' + (py - 24) + 'L' + px + ',' + (py + 10);
    if (e.kind === 'vo') return d + 'M' + px + ',' + (py - 24) + 'L' + px + ',' + py;
    return d + 'M' + (px + 9) + ',' + (py - 24) + 'L' + (px - 3) + ',' + py;
  }

  /* ── 下線回避（案2） ─────────────────────────────────────────
   * 水平な線分が「当事者でない語の下線と同一高さで重なる」または
   * 「下線の直下（8以内）を並走する」場合に、空いている高さへ
   * 迂回させる。同じ始点の語から同じ高さで出る区間は「共有の幹」
   * として1本のレーンにまとめて移す。迂回先は字形ボックス・他の
   * 下線・既配置の水平線と衝突しない候補から選び、文の表示範囲
   * （語の上下20以内）に収まるものだけを使う。置けない場合は
   * 元のまま残す。端点は動かさない。 */
  function _avParse(d) {
    var toks = d.match(/[MLVH]|-?\d+(?:\.\d+)?/g) || [];
    var subs = [], cur = null, cmd = null, x = 0, y = 0, i = 0;
    while (i < toks.length) {
      var t = toks[i];
      if (/^[MLVH]$/.test(t)) { cmd = t; i++; continue; }
      var v = parseFloat(t);
      if (cmd === 'M') { cur = [[v, parseFloat(toks[i + 1])]]; subs.push(cur); x = v; y = parseFloat(toks[i + 1]); i += 2; cmd = 'L'; }
      else if (cmd === 'L') { cur.push([v, parseFloat(toks[i + 1])]); x = v; y = parseFloat(toks[i + 1]); i += 2; }
      else if (cmd === 'H') { cur.push([v, y]); x = v; i++; }
      else if (cmd === 'V') { cur.push([x, v]); y = v; i++; }
      else i++;
    }
    return subs;
  }
  function _avPath(subs) {
    return subs.map(function (pts) {
      return pts.map(function (p, j) { return (j === 0 ? 'M' : 'L') + p[0] + ',' + p[1]; }).join('');
    }).join('');
  }
  function _avUlSpan(w) { return [w.x - 3, w.x + w.w + 3 + (w.ew || 0)]; }
  function _avOverlap(a1, a2, b1, b2) { return Math.min(a2, b2) - Math.max(a1, b1); }
  function _avFlagOf(e, words, y1, xa, xb) {
    var victim = null, kind = null;
    for (var wi = 0; wi < words.length; wi++) {
      var w = words[wi];
      if (w === e.a || w === e.b) continue;
      var us = _avUlSpan(w);
      var ov = _avOverlap(xa, xb, us[0], us[1]);
      if (ov <= 0) continue;
      var dy = y1 - (w.y + 4);
      if (Math.abs(dy) < 0.6 && ov > 10) return { victim: w, kind: 'coincident' };
      if (dy > 0.6 && dy <= 8 && ov > 30 && !victim) { victim = w; kind = 'parallel'; }
    }
    return victim ? { victim: victim, kind: kind } : null;
  }
  function _avChannelOK(ny, spans, e, words, placedH) {
    for (var si = 0; si < spans.length; si++) {
      var sp = spans[si];
      for (var wi = 0; wi < words.length; wi++) {
        var w = words[wi];
        var us = _avUlSpan(w);
        var ov = _avOverlap(sp.xa, sp.xb, us[0], us[1]);
        var uly = w.y + 4;
        if (ov > 0) {
          if (Math.abs(ny - uly) < 0.6) return false;
          var dy = ny - uly;
          if (dy > 0.6 && dy <= 8 && ov > 30) return false;
        }
        if (ny > w.y - 17 && ny < w.y - 0.5 && _avOverlap(sp.xa, sp.xb, w.x - 1, w.x + w.w + 1) > 0) return false;
      }
      var jxs = [sp.x1, sp.x2];
      for (var ji = 0; ji < jxs.length; ji++) {
        var jx = jxs[ji];
        var ylo = Math.min(sp.oy, ny), yhi = Math.max(sp.oy, ny);
        for (var wj = 0; wj < words.length; wj++) {
          var w2 = words[wj];
          if (w2 === e.a || w2 === e.b) continue;
          if (jx > w2.x - 1 && jx < w2.x + w2.w + 1 && yhi > w2.y - 17 && ylo < w2.y + 4) return false;
        }
      }
    }
    for (var pi = 0; pi < placedH.length; pi++) {
      var p = placedH[pi];
      for (var sj = 0; sj < spans.length; sj++) {
        var sp2 = spans[sj];
        var ov2 = _avOverlap(sp2.xa, sp2.xb, p.x1, p.x2);
        if (ov2 <= 0) continue;
        if (Math.abs(ny - p.y) < 0.6) return false;
        if (Math.abs(ny - p.y) <= 3 && ov2 > 30) return false;
      }
    }
    return true;
  }
  function _avApplyMove(sub, j, ny) {
    var p = sub[j], q = sub[j + 1];
    var oy = p[1], x1 = p[0], x2 = q[0];
    var verticalApproach = j > 0 && sub[j - 1][0] === x1;
    var nextPt = j + 2 < sub.length ? sub[j + 2] : null;
    var verticalDepart = nextPt && nextPt[0] === x2;
    var out = [];
    for (var k = 0; k < j; k++) out.push(sub[k]);
    if (verticalApproach) out.push([x1, ny]);
    else { out.push([x1, oy]); out.push([x1, ny]); }
    out.push([x2, ny]);
    if (nextPt) {
      if (!verticalDepart) out.push([x2, oy]);
      for (var k2 = j + 2; k2 < sub.length; k2++) out.push(sub[k2]);
    } else {
      out.push([x2, oy]);
    }
    sub.length = 0;
    for (var m = 0; m < out.length; m++) sub.push(out[m]);
  }
  function _avRegisterMove(placedH, f, ny) {
    for (var k = placedH.length - 1; k >= 0; k--) {
      var p = placedH[k];
      if (p.own === f.ei && Math.abs(p.y - f.y1) < 0.01 && p.x1 === f.xa && p.x2 === f.xb) placedH.splice(k, 1);
    }
    placedH.push({ y: ny, x1: f.xa, x2: f.xb, own: f.ei });
  }
  function _avoidUnderlineRuns(sent) {
    var words = sent.words;
    if (!words.length) return;
    var minWY = Infinity, maxWY = -Infinity;
    words.forEach(function (w) { if (w.y < minWY) minWY = w.y; if (w.y > maxWY) maxWY = w.y; });
    var work = sent.edges.map(function (e, ei) { return { e: e, ei: ei, subs: _avParse(e.d || edgePath(e)), changed: false }; });
    var placedH = [];
    work.forEach(function (w) {
      for (var si = 0; si < w.subs.length; si++) {
        var sub = w.subs[si];
        for (var j = 0; j + 1 < sub.length; j++) {
          if (sub[j][1] === sub[j + 1][1] && sub[j][0] !== sub[j + 1][0]) {
            placedH.push({ y: sub[j][1], x1: Math.min(sub[j][0], sub[j + 1][0]), x2: Math.max(sub[j][0], sub[j + 1][0]), own: w.ei });
          }
        }
      }
    });
    var flagged = [];
    work.forEach(function (w) {
      w.subs.forEach(function (sub, si) {
        for (var j = 0; j + 1 < sub.length; j++) {
          var x1 = sub[j][0], y1 = sub[j][1], x2 = sub[j + 1][0], y2 = sub[j + 1][1];
          if (y1 !== y2 || x1 === x2) continue;
          var xa = Math.min(x1, x2), xb = Math.max(x1, x2);
          var f = _avFlagOf(w.e, words, y1, xa, xb);
          if (f) flagged.push({ ei: w.ei, si: si, j: j, y1: y1, xa: xa, xb: xb, x1: x1, x2: x2, kind: f.kind, aId: w.e.a.id, sub: sub });
        }
      });
    });
    var groups = new Map();
    flagged.forEach(function (f) {
      var key = f.aId + '@' + f.y1;
      if (!groups.has(key)) groups.set(key, { key: key, items: [], kind: f.kind, y1: f.y1 });
      groups.get(key).items.push(f);
    });
    function laneFor(items, kind, y1) {
      var cands = kind === 'coincident' ? [12, 18, -24, 24, -30, 30, -36, 36] : [10, 16, -30, 22, -36, 28];
      for (var ci = 0; ci < cands.length; ci++) {
        var ny = y1 + cands[ci];
        if (ny < minWY - 20 || ny > maxWY + 20) continue;
        var spans = items.map(function (f) { return { xa: f.xa, xb: f.xb, x1: f.x1, x2: f.x2, oy: f.y1 }; });
        var ok = true;
        for (var fi = 0; fi < items.length; fi++) {
          if (!_avChannelOK(ny, spans, work[items[fi].ei].e, words, placedH)) { ok = false; break; }
        }
        if (ok) return ny;
      }
      return null;
    }
    groups.forEach(function (g) {
      var ny = laneFor(g.items, g.kind, g.y1);
      if (ny === null) {
        g.items.forEach(function (f) {
          var single = laneFor([f], f.kind, f.y1);
          if (single === null) return;
          _avApplyMove(f.sub, f.j, single);
          work[f.ei].changed = true;
          _avRegisterMove(placedH, f, single);
        });
        return;
      }
      var sorted = g.items.slice().sort(function (a, b) { return (a.ei - b.ei) || (a.si - b.si) || (b.j - a.j); });
      var lastSub = null;
      sorted.forEach(function (f) {
        var jj = f.j;
        if (lastSub === f.sub) {
          jj = -1;
          for (var k = 0; k + 1 < f.sub.length; k++) {
            if (f.sub[k][1] === f.sub[k + 1][1] && f.sub[k][1] === f.y1 &&
                Math.min(f.sub[k][0], f.sub[k + 1][0]) === f.xa && Math.max(f.sub[k][0], f.sub[k + 1][0]) === f.xb) { jj = k; break; }
          }
          if (jj < 0) return;
        }
        _avApplyMove(f.sub, jj, ny);
        work[f.ei].changed = true;
        _avRegisterMove(placedH, f, ny);
        lastSub = f.sub;
      });
    });
    work.forEach(function (w) { if (w.changed) w.e.d = _avPath(w.subs); });
  }

  /* 章単位レイアウト: 文シム木の配列 → 文ごとの {words, edges, w, h, y0} */
  function layoutChapter(sentenceRoots, opts) {
    words = []; edges = []; EW = new Map(); HM = new Map(); GM = new Map(); b2Pairs = [];
    spWrapW = opts && opts.spWrapW != null ? opts.spWrapW : null;
    spWrapEff = null;
    var out = [];
    var cy = 24;
    for (var i = 0; i < sentenceRoots.length; i++) {
      var w0 = words.length, e0 = edges.length;
      var r = place(sentenceRoots[i], 0, cy);
      out.push({ words: words.slice(w0), edges: edges.slice(e0), w: r ? r.w : 0, h: r ? r.h : 0, y0: cy });
      cy += (r ? r.h : 0) + 70;
    }
    resolve();
    for (var oi = 0; oi < out.length; oi++) { _routeLongEdges(out[oi]); _avoidUnderlineRuns(out[oi]); }
    return { sentences: out, height: cy };
  }

  global.RoleReadingLayoutL3S = {
    layoutChapter: layoutChapter,
    edgePath: edgePath,
    PADX: PADX,
    ROW: ROW
  };
})(window);
