/* CSPでインラインの onclick が使えないため、data-act 属性でクリックを振り分ける。
   元のインライン handler と同じく、クリックされた要素から親方向へ順に処理する（バブリング相当）。 */
(function () {
  const ACTIONS = {
    toggleXsc: (arg) => toggleXsc(arg),
    selectToken: (arg) => selectToken(Number(arg)),
    toggleCandidateItem: (arg) => toggleCandidateItem(arg),
    toggleId: (arg) => { const el = document.getElementById(arg); if (el) el.classList.toggle('open'); },
    copyShareUrl: () => copyShareUrl(),
    navTo: (arg, ev) => navTo(arg, ev)
  };
  document.addEventListener('click', (ev) => {
    for (let el = ev.target; el && el !== document; el = el.parentElement) {
      const act = el.dataset && el.dataset.act;
      if (act && ACTIONS[act]) ACTIONS[act](el.dataset.arg, ev);
    }
  });
})();
