/* role-reading-adapter.js
 * 「語の役割で読む」アダプタ: SR JSON（構文木）を、role-reading-layout が
 * 消費するシム木へ変換する。写像は作業スペースのエディタが Lowfat XML から
 * 読む属性（class/role/rule/type、rk-* 手動オフセット）と等価になるよう作る。
 *
 * - type: clause→wg[class=cl], phrase.np→wg[class=np], phrase.pp→pp,
 *   phrase.adjp→adjp, phrase.vp→vp, group→wg[type=group], token→w
 * - construction.sourceRule → wg の rule 属性
 * - function.canonical → role 属性（SUBJECT=s, PREDICATE=v, COPULA=vc,
 *   OBJECT=o, OBJECT2=o2, INDIRECT_OBJECT=o2, COMPLEMENT=p。
 *   ADVERBIAL は節の SLOT ではないので付けない＝修飾として扱われる）
 * - token の class は morph_raw の接頭辞から（N=noun, V=verb, A=adj, T=det,
 *   PREP=prep, CONJ=conj, ADV=adv, P/D/R=pron）
 * - rk-* オフセット（rk-offsets/{BOOK}.json）: 語は xml:id、wg は配下
 *   トークンの範囲キー「先頭ID…末尾ID」で引く。
 */
(function (global) {
  'use strict';

  var ROLE_MAP = {
    SUBJECT: 's', PREDICATE: 'v', COPULA: 'vc',
    OBJECT: 'o', OBJECT2: 'o2', INDIRECT_OBJECT: 'o2', COMPLEMENT: 'p'
  };
  var MORPH_CLASS = {
    N: 'noun', V: 'verb', A: 'adj', T: 'det', PREP: 'prep',
    CONJ: 'conj', ADV: 'adv', P: 'pron', D: 'pron', R: 'pron'
  };

  function morphClass(morphRaw) {
    if (!morphRaw) return '';
    var prefix = String(morphRaw).split('-')[0];
    return MORPH_CLASS[prefix] || '';
  }

  /* SR ノード → シム木。parent を設定し、トークンメタを tokenMeta に集める。 */
  function buildShim(node, parent, tokenMeta) {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'token') {
      var ev = node.evidence || {};
      var id = ev.nodeId || '';
      var shimW = {
        tag: 'w', attrs: {}, children: [], parent: parent,
        text: node.text || '', id: id
      };
      if (id) shimW.attrs['xml:id'] = id;
      var mc = morphClass(ev.morph_raw);
      if (mc) shimW.attrs['class'] = mc;
      tokenMeta.set(id, {
        id: id, text: node.text || '', ref: ev.ref || '',
        rawMorph: ev.morph_raw || ''
      });
      return shimW;
    }
    var shim = { tag: 'wg', attrs: {}, children: [], parent: parent, text: '', id: '' };
    if (node.type === 'clause') shim.attrs['class'] = 'cl';
    else if (node.type === 'group') shim.attrs['type'] = 'group';
    else if (typeof node.type === 'string' && node.type.indexOf('phrase.') === 0) {
      shim.attrs['class'] = node.type.slice('phrase.'.length);
    }
    var rule = node.construction && node.construction.sourceRule;
    if (rule) shim.attrs['rule'] = rule;
    var fn = node.function && node.function.canonical;
    if (fn && ROLE_MAP[fn]) shim.attrs['role'] = ROLE_MAP[fn];
    var children = node.children || [];
    for (var i = 0; i < children.length; i++) {
      var c = buildShim(children[i], shim, tokenMeta);
      if (c) shim.children.push(c);
    }
    return shim;
  }

  /* wg の配下トークン範囲キー（先頭ID…末尾ID） */
  function tokenRangeKey(shim) {
    var first = null, last = null;
    (function walk(n) {
      if (n.tag === 'w' && n.id) { if (!first) first = n.id; last = n.id; }
      for (var i = 0; i < (n.children || []).length; i++) walk(n.children[i]);
    })(shim);
    return first ? (first + '…' + last) : null;
  }

  /* オフセット JSON を シム木へ適用する（語: rk-x/rk-y、wg: rk-dx/rk-dy） */
  function applyOffsets(shim, offsets) {
    if (!offsets) return;
    (function walk(n) {
      if (n.tag === 'w') {
        var o = offsets.words && offsets.words[n.id];
        if (o) {
          if (o.x != null && o.y != null) { n.attrs['rk-x'] = String(o.x); n.attrs['rk-y'] = String(o.y); }
          if (o.w != null) n.attrs['rk-w'] = String(o.w);
        }
      } else {
        var key = tokenRangeKey(n);
        var g = key && offsets.groups && offsets.groups[key];
        if (g) {
          if (g.dx != null) n.attrs['rk-dx'] = String(g.dx);
          if (g.dy != null) n.attrs['rk-dy'] = String(g.dy);
        }
      }
      for (var i = 0; i < (n.children || []).length; i++) walk(n.children[i]);
    })(shim);
  }

  /* SR 章データ → { sentences: [{ref, root, tokenMeta}] } */
  function buildChapter(srData, offsets) {
    var out = [];
    var sentences = (srData && srData.sentences) || [];
    for (var i = 0; i < sentences.length; i++) {
      var tokenMeta = new Map();
      var rootShim = buildShim(sentences[i].root, null, tokenMeta);
      if (!rootShim) continue;
      var sentenceShim = { tag: 'sentence', attrs: {}, children: [rootShim], parent: null, text: '', id: '' };
      rootShim.parent = sentenceShim;
      applyOffsets(sentenceShim, offsets);
      out.push({ ref: sentences[i].ref || '', root: sentenceShim, tokenMeta: tokenMeta });
    }
    return { sentences: out };
  }

  global.RoleReadingAdapter = { buildChapter: buildChapter };
})(window);
