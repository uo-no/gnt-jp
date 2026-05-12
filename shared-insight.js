/**
 * shared-insight.js
 * iframe版3タブ共通の軽量読解支援ユーティリティ
 *
 * 設計方針：
 *   - full-search.htmlのanalyzePatterns完全移植は禁止
 *   - side-panel幅（280px〜420px）で成立する軽量版
 *   - データロード後に呼び出す想定
 *   - 各タブが必要な関数だけ呼べばよい疎結合設計
 *
 * 使用タブ：
 *   - morph-search.html  : calcDistribution, lightweightReadingHint
 *   - syntax-search.html : lightweightPatternSummary
 *   - semantic-search.html: calcDistribution（将来）
 */

/* ═══════════════════════════════════════════════════
   1. calcDistribution
   書物別ヒット数を集計して降順配列で返す
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array} matched - matchEntry()済みのエントリ配列
 * @param {Object} BOOK_JP - 書物コード→日本語名マップ
 * @returns {Array<{key:string, label:string, count:number}>}
 */
function calcDistribution(matched, BOOK_JP) {
    const counts = {};
    matched.forEach(e => {
        // _bookKey は fetch時に付与済み、なければ ref の先頭を使う
        const bk = e._bookKey
            || (String(e.ref || '').match(/^([A-Z0-9]+)/) || [])[1]
            || '?';
        counts[bk] = (counts[bk] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({
            key,
            label: (BOOK_JP && BOOK_JP[key]) || key,
            count,
        }));
}

/* ═══════════════════════════════════════════════════
   2. renderDistBar
   書物別分布をコンパクトなHTMLバーで返す（挿入用）
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array} matched
 * @param {Object} BOOK_JP
 * @param {number} [limit=8] 表示上限書物数
 * @returns {string} HTML文字列
 */
function renderDistBar(matched, BOOK_JP, limit) {
    limit = limit || 8;
    const dist  = calcDistribution(matched, BOOK_JP);
    const total = matched.length;
    if (!dist.length) return '';
    const max = dist[0].count;

    const rows = dist.slice(0, limit).map(d => {
        const pct = Math.round(d.count / max * 100);
        return `<div style="display:flex;align-items:center;gap:7px;margin-bottom:4px;">
            <span style="width:60px;font-size:0.68rem;color:var(--text-sub);text-align:right;flex-shrink:0;">${d.label}</span>
            <div style="flex:1;height:4px;background:var(--bg-panel,#f5f5f7);border-radius:2px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;border-radius:2px;background:var(--accent,#5a6e82);transition:width .4s;"></div>
            </div>
            <span style="font-size:0.65rem;color:var(--text-hint,#aaa);width:24px;text-align:right;flex-shrink:0;">${d.count}</span>
        </div>`;
    }).join('');

    return `<div style="
            border:1px solid var(--border,rgba(0,0,0,.07));
            border-radius:10px;
            padding:10px 13px;
            background:var(--bg,#fff);
            margin-bottom:12px;
        ">
        <div style="font-size:0.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
                    color:var(--text-hint,#aaa);margin-bottom:8px;">書物別分布（全${total}件）</div>
        ${rows}
    </div>`;
}

/* ═══════════════════════════════════════════════════
   3. lightweightPatternSummary
   Morphタブ向け：法+時制の組み合わせから
   「よく見られる構文パターン」を1〜2行で返す
   full-searchのanalyzePatterns の超軽量版
   ═══════════════════════════════════════════════════ */
const _PATTERN_HINTS = {
    'aorist+indicative':  '過去の一回的出来事。主語＋動詞＋目的語の基本語順が多い。',
    'present+indicative': '継続・習慣。主語省略が多く、前節の主語が継続することが多い。',
    'imperfect+indicative': '過去の継続。物語文脈で線的な進行を表す。',
    'perfect+indicative': '現在も続く完了状態。νεκρός・πεπίστευκα等の結果状態語と共起多い。',
    'aorist+imperative':  '即時的命令。否定はμή＋アオリスト接続法（禁止）。',
    'present+imperative': '継続的命令。否定はμή＋現在命令（〜するのをやめよ）。',
    'aorist+subjunctive': '接続詞依存。ἵνα（目的）・ἐάν（条件）・ὅταν（時間）を先に確認。',
    'present+subjunctive':'同上。継続ニュアンスが付加される。',
    'aorist+participle':  '先行動作。冠詞→名詞的、格一致名詞→形容詞的、それ以外→副詞的。',
    'present+participle': '同時動作。付帯状況が最多。主節との時間的関係を確認。',
    'perfect+participle': '結果状態の継続。完了動作の状態を名詞・副詞的に表す。',
    'aorist+infinitive':  '目的・補語用法が多い。支配動詞の種類が意味を決める。',
    'present+infinitive': '継続目的・補語。ἄρχεσθαι・θέλειν等と共起多い。',
};

/**
 * @param {string} tense
 * @param {string} mood
 * @returns {string|null} パターンヒント文字列、未登録ならnull
 */
function lightweightPatternSummary(tense, mood) {
    const key = [tense, mood].filter(Boolean).join('+');
    return _PATTERN_HINTS[key] || null;
}

/* ═══════════════════════════════════════════════════
   4. lightweightReadingHint
   Morphタブ向け：検索件数＋書物分布から
   「この語形の使われ方の傾向」を1カード分のHTMLで返す
   ═══════════════════════════════════════════════════ */
/**
 * @param {Array} matched - マッチ済みエントリ
 * @param {string} tense
 * @param {string} mood
 * @param {Object} BOOK_JP
 * @returns {string} HTML文字列（空なら''）
 */
function lightweightReadingHint(matched, tense, mood, BOOK_JP) {
    if (!matched.length) return '';

    const patternHint = lightweightPatternSummary(tense, mood);
    const dist        = calcDistribution(matched, BOOK_JP);
    const total       = matched.length;

    // 分布から傾向を判定
    let distNote = '';
    if (dist.length === 1) {
        distNote = `${dist[0].label}のみに登場（限定的）`;
    } else if (dist.length >= 2 && dist[0].count / total >= 0.4) {
        distNote = `${dist[0].label}に集中（${Math.round(dist[0].count / total * 100)}%）`;
    } else if (dist.length >= 4) {
        distNote = `${dist.length}書物に分布（比較的一般的）`;
    }

    const lines = [];
    if (patternHint) lines.push(patternHint);
    if (distNote)    lines.push(distNote);

    if (!lines.length) return '';

    return `<div style="
            padding:9px 13px;
            background:var(--accent-light,rgba(90,110,130,.09));
            border:1px solid var(--accent-mid,rgba(90,110,130,.20));
            border-left:3px solid var(--accent,#5a6e82);
            border-radius:9px;
            margin-bottom:12px;
            font-size:0.77rem;
            line-height:1.7;
            color:var(--text,#1d1d1f);
        ">
        <div style="font-size:0.58rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;
                    color:var(--accent,#5a6e82);margin-bottom:4px;">この語形の傾向</div>
        ${lines.map(l => `<div>${l}</div>`).join('')}
    </div>`;
}

/* ═══════════════════════════════════════════════════
   5. insertInsightCard
   morph-search.html の renderResults() 末尾から呼び出す
   quick-insight エリアに分布＋パターンヒントを挿入する
   ═══════════════════════════════════════════════════ */
/**
 * @param {string} containerId - 挿入先要素のid
 * @param {Array}  matched
 * @param {string} tense
 * @param {string} mood
 * @param {Object} BOOK_JP
 */
function insertInsightCard(containerId, matched, tense, mood, BOOK_JP) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const hint = lightweightReadingHint(matched, tense, mood, BOOK_JP);
    const bar  = matched.length >= 3
        ? renderDistBar(matched, BOOK_JP, 6)
        : '';

    el.innerHTML  = hint + bar;
    el.style.display = (hint || bar) ? 'block' : 'none';
}
