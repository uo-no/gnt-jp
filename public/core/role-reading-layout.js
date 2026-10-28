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
      var py = Math.max(nom + dyOf(k), cy), cx = (conj ? x + conj.w + 40 : x) + dxOf(k), n0 = words.length, r = place(k, cx, py);
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

  /* エディタの draw() の pd() を移植（線の経路生成）。 */
  function edgePath(e) {
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
    return { sentences: out, height: cy };
  }

  global.RoleReadingLayout = {
    layoutChapter: layoutChapter,
    edgePath: edgePath,
    PADX: PADX,
    ROW: ROW
  };
})(window);
