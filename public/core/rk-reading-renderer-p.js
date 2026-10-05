/**
 * rk-reading-renderer-p.js  Phase M
 *
 * Progressive RK Reading Mode.
 *
 * UX loop:
 *   State 0 — collapsed: sentence text inline, words are tappable
 *   State 1 — word focus: connection panel shows direct structural links
 *   State 2 — branch expand: tap a child node to reveal its children
 *   Collapse: tap focused word again, or tap elsewhere in text area
 *
 * Data pipeline: same as horizontal/vertical renderers.
 *   adaptSentence() → RKReadingRenderer.loadWords() → renderProgressiveView()
 *
 * Exports: window.RKReadingRendererP = { renderProgressiveView }
 */

(function (global) {
  'use strict';

  // ── Role labels (subset for display) ─────────────────────────────────────
  const RL = {
    subj: '主語', verb: '主動詞', obj: '直接目的語', pred: '述語',
    clause: '従属節', cverb: '並列節', iobj: '間接目的語', obj2: '第二目的語',
    relcl: '関係節', advcl: '副詞節', appos: '同格',
    det: '冠詞', adj: '形容詞', adv: '副詞', neg: '否定辞',
    prep: '前置詞', pobj: '前置詞目的語', gen: '属格',
    conj: '接続詞', cmark: '節標識', coord: '並列', poss: '所有',
    demo: '指示', voc: '呼格', auxv: '助動詞', advn: '副詞名詞句',
  };

  // ── CSS injection (once per page) ────────────────────────────────────────
  let _cssInjected = false;
  function _injectCSS() {
    if (_cssInjected || typeof document === 'undefined') return;
    _cssInjected = true;
    const s = document.createElement('style');
    s.id = 'prk-styles';
    s.textContent = `
.prk-view { padding: 0 0 40px; }
.prk-sentence { margin: 0 0 32px; }
.prk-ref { font-size: 11px; color: var(--sub, #888); margin-bottom: 6px; letter-spacing: .03em; }
.prk-text { line-height: 2.2; font-size: 16px; color: var(--ink, #1a1a1a); }
.prk-word {
  display: inline;
  padding: 1px 2px;
  border-radius: 3px;
  transition: background .12s;
  user-select: none;
}
.prk-word.interactive { cursor: pointer; }
.prk-word.interactive:hover { background: rgba(0,0,0,.05); }
.prk-word.focused { background: rgba(80,120,200,.13); border-radius: 3px; }
.prk-det { font-size: 12px; color: var(--sub, #888); }
.prk-conj { color: var(--link, #9b59b6); }
.prk-verb { color: var(--core, #2563eb); font-weight: 500; }
.prk-sep { display: inline; }
/* Connection panel */
.prk-conn {
  margin-top: 10px;
  background: var(--surface, #f8f8f8);
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 10px;
  padding: 14px 16px 10px;
  font-size: 14px;
}
.prk-conn-header {
  display: flex; align-items: baseline; gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0,0,0,.07);
  margin-bottom: 10px;
}
.prk-conn-self { font-size: 18px; color: var(--ink, #1a1a1a); font-weight: 600; }
.prk-conn-role { font-size: 11px; color: var(--sub, #888); }
.prk-conn-study {
  margin-left: auto;
  background: none; border: 1px solid rgba(0,0,0,.15);
  border-radius: 5px; padding: 2px 10px;
  font-size: 12px; cursor: pointer; color: var(--ink, #333);
}
.prk-conn-study:hover { background: rgba(0,0,0,.05); }
/* Parent row */
.prk-parent {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 10px; font-size: 13px; color: var(--sub, #666);
}
.prk-parent-arrow { font-size: 11px; opacity: .5; }
.prk-parent-word { color: var(--ink, #333); }
/* Children list */
.prk-kids { }
.prk-kid {
  margin: 4px 0;
  border-left: 2px solid rgba(0,0,0,.08);
  padding-left: 10px;
}
.prk-kid-row {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 0; cursor: default;
}
.prk-kid-word { font-size: 15px; color: var(--ink, #222); }
.prk-kid-role { font-size: 11px; color: var(--sub, #888); }
.prk-expand-btn {
  background: none; border: 1px solid rgba(0,0,0,.15);
  border-radius: 4px; padding: 1px 7px; font-size: 12px;
  cursor: pointer; color: var(--sub, #666); margin-left: auto;
  flex-shrink: 0;
}
.prk-expand-btn:hover { background: rgba(0,0,0,.05); }
.prk-kid-study {
  background: none; border: none; font-size: 11px;
  color: var(--sub, #888); cursor: pointer; padding: 0 4px;
  flex-shrink: 0;
}
.prk-kid-study:hover { color: var(--ink, #333); }
/* Grandchildren indented under expanded child */
.prk-grandkids {
  margin-top: 4px;
  border-left: 2px solid rgba(0,0,0,.05);
  padding-left: 10px;
}
.prk-gk-row {
  display: flex; align-items: center; gap: 6px;
  padding: 2px 0; font-size: 13px;
}
.prk-gk-word { color: var(--ink, #444); }
.prk-gk-role { font-size: 10px; color: var(--sub, #aaa); }
    `.trim();
    document.head.appendChild(s);
  }

  // ── Build child adjacency map ─────────────────────────────────────────────
  function _buildKids(words) {
    const m = new Map();
    for (const w of words) {
      if (!m.has(w.h)) m.set(w.h, []);
      m.get(w.h).push(w);
    }
    return m;
  }

  // ── Render one sentence section ───────────────────────────────────────────
  function _renderSection(sentence, words, clickMap, refToBd) {
    const sec = document.createElement('section');
    sec.className = 'prk-sentence';

    // Verse reference
    const refEl = document.createElement('div');
    refEl.className = 'prk-ref';
    refEl.textContent = (sentence.ref || '').replace(/^\S+\s+/, '');
    sec.appendChild(refEl);

    // Text area
    const textEl = document.createElement('div');
    textEl.className = 'prk-text';
    sec.appendChild(textEl);

    // Connection panel (initially hidden)
    const connEl = document.createElement('div');
    connEl.className = 'prk-conn';
    connEl.hidden = true;
    sec.appendChild(connEl);

    // ── Per-section state ────────────────────────────────────────────────
    const kids = _buildKids(words);
    let focusI = null;
    const expanded = new Set(); // expanded child word indices

    // ── Word spans ───────────────────────────────────────────────────────
    words.forEach((w, idx) => {
      const cd = clickMap.get(w.i);
      const isInteractive = !!(cd && cd.ref);

      const span = document.createElement('span');
      span.className = 'prk-word' +
        (isInteractive ? ' interactive' : '') +
        (w.r === 'det' || w.r === 'cmark' ? ' prk-det' : '') +
        (w.r === 'conj' ? ' prk-conj' : '') +
        (['verb','cverb','clause','relcl','advcl'].includes(w.r) ? ' prk-verb' : '');
      span.dataset.i = w.i;
      span.textContent = w.gl || w.g || '—';

      if (isInteractive) {
        span.addEventListener('click', e => {
          e.stopPropagation();
          if (focusI === w.i) {
            focusI = null; expanded.clear();
          } else {
            focusI = w.i; expanded.clear();
          }
          _update();
        });
      }

      // Separator: space between words
      if (idx > 0) {
        const sep = document.createElement('span');
        sep.className = 'prk-sep';
        sep.textContent = ' ';
        textEl.appendChild(sep);
      }
      textEl.appendChild(span);
    });

    // ── Update display after state change ─────────────────────────────────
    function _update() {
      // Highlight focused word span
      textEl.querySelectorAll('.prk-word').forEach(s => {
        s.classList.toggle('focused', +s.dataset.i === focusI);
      });

      if (focusI == null) {
        connEl.hidden = true;
        connEl.innerHTML = '';
        return;
      }

      connEl.hidden = false;
      connEl.innerHTML = '';

      const fw = words.find(w => w.i === focusI);
      if (!fw) return;

      // Header: focused word + study button
      const hdr = document.createElement('div');
      hdr.className = 'prk-conn-header';

      const selfSpan = document.createElement('span');
      selfSpan.className = 'prk-conn-self';
      selfSpan.textContent = fw.gl || fw.g;
      hdr.appendChild(selfSpan);

      const roleSpan = document.createElement('span');
      roleSpan.className = 'prk-conn-role';
      roleSpan.textContent = RL[fw.r] || fw.r;
      hdr.appendChild(roleSpan);

      const cd = clickMap.get(fw.i);
      if (cd && cd.ref) {
        const btn = document.createElement('button');
        btn.className = 'prk-conn-study';
        btn.textContent = '調べる';
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const bd = refToBd.get(cd.ref);
          if (bd) {
            if (typeof _setInspectDataFromElToken === 'function') _setInspectDataFromElToken(bd);
            if (typeof _setStudyTarget === 'function') _setStudyTarget(cd.ref, bd.verseId);
          }
          if (typeof openStudyPanel === 'function') openStudyPanel(cd.greek, cd.rawMorph, cd.ref, cd.lemma);
        });
        hdr.appendChild(btn);
      }
      connEl.appendChild(hdr);

      // Parent row (go up one level)
      if (fw.h > 0) {
        const pw = words.find(w => w.i === fw.h);
        if (pw) {
          const pr = document.createElement('div');
          pr.className = 'prk-parent';
          pr.innerHTML =
            `<span class="prk-parent-arrow">↑</span>` +
            `<span class="prk-parent-word">${pw.gl || pw.g}</span>` +
            `<span class="prk-conn-role">${RL[pw.r] || pw.r}</span>`;
          connEl.appendChild(pr);
        }
      }

      // Children list
      const childList = kids.get(fw.i) || [];
      if (childList.length > 0) {
        const kidsEl = document.createElement('div');
        kidsEl.className = 'prk-kids';
        childList.forEach(child => kidsEl.appendChild(_kidNode(child)));
        connEl.appendChild(kidsEl);
      }
    }

    // ── Render one child node ──────────────────────────────────────────────
    function _kidNode(w) {
      const node = document.createElement('div');
      node.className = 'prk-kid';

      const row = document.createElement('div');
      row.className = 'prk-kid-row';

      const wspan = document.createElement('span');
      wspan.className = 'prk-kid-word';
      wspan.textContent = w.gl || w.g;
      row.appendChild(wspan);

      const rspan = document.createElement('span');
      rspan.className = 'prk-kid-role';
      rspan.textContent = RL[w.r] || w.r;
      row.appendChild(rspan);

      const grandkids = kids.get(w.i) || [];
      const isExp = expanded.has(w.i);

      if (grandkids.length > 0) {
        const expBtn = document.createElement('button');
        expBtn.className = 'prk-expand-btn';
        expBtn.textContent = isExp ? '‹' : '›';
        expBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (expanded.has(w.i)) expanded.delete(w.i);
          else expanded.add(w.i);
          _update();
        });
        row.appendChild(expBtn);
      }

      const ccd = clickMap.get(w.i);
      if (ccd && ccd.ref) {
        const sb = document.createElement('button');
        sb.className = 'prk-kid-study';
        sb.textContent = '調べ';
        sb.addEventListener('click', e => {
          e.stopPropagation();
          const bd = refToBd.get(ccd.ref);
          if (bd) {
            if (typeof _setInspectDataFromElToken === 'function') _setInspectDataFromElToken(bd);
            if (typeof _setStudyTarget === 'function') _setStudyTarget(ccd.ref, bd.verseId);
          }
          if (typeof openStudyPanel === 'function') openStudyPanel(ccd.greek, ccd.rawMorph, ccd.ref, ccd.lemma);
        });
        row.appendChild(sb);
      }

      node.appendChild(row);

      // Grandchildren (one more level)
      if (isExp && grandkids.length > 0) {
        const gkEl = document.createElement('div');
        gkEl.className = 'prk-grandkids';
        grandkids.forEach(gk => {
          const gr = document.createElement('div');
          gr.className = 'prk-gk-row';
          gr.innerHTML =
            `<span class="prk-gk-word">${gk.gl || gk.g}</span>` +
            `<span class="prk-gk-role">${RL[gk.r] || gk.r}</span>`;
          // Study button for grandchild
          const gccd = clickMap.get(gk.i);
          if (gccd && gccd.ref) {
            const gsb = document.createElement('button');
            gsb.className = 'prk-kid-study';
            gsb.textContent = '調べ';
            gsb.addEventListener('click', e => {
              e.stopPropagation();
              const bd = refToBd.get(gccd.ref);
              if (bd) {
                if (typeof _setInspectDataFromElToken === 'function') _setInspectDataFromElToken(bd);
                if (typeof _setStudyTarget === 'function') _setStudyTarget(gccd.ref, bd.verseId);
              }
              if (typeof openStudyPanel === 'function') openStudyPanel(gccd.greek, gccd.rawMorph, gccd.ref, gccd.lemma);
            });
            gr.appendChild(gsb);
          }
          gkEl.appendChild(gr);
        });
        node.appendChild(gkEl);
      }

      return node;
    }

    return sec;
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function renderProgressiveView(app, srData, elData) {
    _injectCSS();

    const wrap = document.createElement('div');
    wrap.className = 'sd-view prk-view';
    wrap.setAttribute('aria-label', 'Progressive RK 読書モード');

    if (!srData || !Array.isArray(srData.sentences) || !srData.sentences.length) {
      const e = document.createElement('div');
      e.className = 'sd-empty';
      e.textContent = 'この章の構文データがありません。';
      wrap.appendChild(e);
      app.innerHTML = '';
      app.appendChild(wrap);
      return;
    }

    if (!window.RKReadingAdapter || !window.RKReadingRenderer) {
      const e = document.createElement('div');
      e.className = 'sd-empty';
      e.textContent = 'RK アダプターが読み込まれていません。';
      wrap.appendChild(e);
      app.innerHTML = '';
      app.appendChild(wrap);
      return;
    }

    const bdTokenMap = RKReadingAdapter.buildTokenMap(elData);

    const refToBd = new Map();
    for (const tok of bdTokenMap.values()) {
      if (tok && tok.ref) refToBd.set(tok.ref, tok);
    }

    for (const sentence of srData.sentences) {
      let rows, clickMap, words;
      try {
        rows     = RKReadingAdapter.adaptSentence(sentence, bdTokenMap);
        clickMap = RKReadingAdapter.buildClickMap(sentence, bdTokenMap);
        words    = RKReadingRenderer.loadWords(rows);
      } catch (err) {
        const e = document.createElement('div');
        e.className = 'sd-empty';
        e.textContent = 'エラー: ' + String(err);
        wrap.appendChild(e);
        continue;
      }

      wrap.appendChild(_renderSection(sentence, words, clickMap, refToBd));
    }

    app.innerHTML = '';
    app.appendChild(wrap);
  }

  global.RKReadingRendererP = { renderProgressiveView };

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
