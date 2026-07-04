/* ============================================================
   book-master.js
   書物マスターの単一参照ポイント（ブラウザ用）。
   morph-search.html / search-tool.html / syntax-search.html は
   書物キー・章数・コード・日本語名・グループのいかなる定義も
   ローカルに持たず、必ずこのモジュール経由で books.json を読む。

   提供される API（window.BookMaster）:
     await BookMaster.load()          -> マスターデータ一式を返す（キャッシュ済みなら即時）
     BookMaster.folderFor(key)        -> 'nt' | 'lxx'
     BookMaster.pathFor(key, ch)      -> './bible_data/{folder}/{key}/{ch}.json'
     BookMaster.buildChapterTasks()   -> [{key, ch, path}, ...] 全書物全章
     BookMaster.fetchJSON(path)       -> fetch を行い、失敗を必ず可視化して null を返す
     BookMaster.verifyCoverage(cb)    -> 各書物の「宣言章数+1」を probe し、
                                          実際にデータが存在する（=宣言不足）場合に cb で通知
     BookMaster.getFailedFetches()    -> 失敗パス一覧のコピー
     BookMaster.onFailure(cb)         -> 失敗発生時に呼ばれるリスナーを登録
   ============================================================ */
(function () {
    'use strict';

    if (window.BookMaster) return; // 二重読み込み防止（同一ページ内）

    window.__failedFetches = window.__failedFetches || [];

    let _masterPromise = null;
    let _failureListeners = [];

    function notifyFailure(detail) {
        window.__failedFetches.push(detail);
        console.error('[BookMaster] fetch failed', detail);
        for (const fn of _failureListeners) {
            try { fn(detail); } catch (e) { console.error('[BookMaster] failure listener threw', e); }
        }
    }

    async function load() {
        if (_masterPromise) return _masterPromise;
        _masterPromise = fetch('../books.json')
            .then(r => {
                if (!r.ok) throw new Error(`books.json fetch failed: HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                const all = [...data.NT, ...data.OT];
                const byKey = new Map(all.map(b => [b.key, b]));
                const ntKeys = new Set(data.NT.map(b => b.key));
                const codeToKey = new Map(all.map(b => [b.code, b.key]));
                return {
                    raw: data,
                    NT: data.NT,
                    OT: data.OT,
                    ALL: all,
                    groups: data.groups,
                    corpora: data.corpora,
                    byKey,
                    ntKeys,
                    codeToKey,
                };
            })
            .catch(err => {
                notifyFailure({ path: '../books.json', error: String(err) });
                _masterPromise = null; // 失敗を永久キャッシュしない。次回呼び出しで再fetchできるようにする
                throw err; // books.json が無ければ検索は成立しないため再throw
            });
        return _masterPromise;
    }

    function requireLoaded() {
        if (!_masterPromise) {
            throw new Error('[BookMaster] load() が完了する前に使用されました');
        }
    }

    function folderForSync(master, key) {
        return master.ntKeys.has(key) ? master.corpora.NT : master.corpora.OT;
    }

    async function folderFor(key) {
        const master = await load();
        return folderForSync(master, key);
    }

    async function pathFor(key, ch) {
        const master = await load();
        return `../bible_data/${folderForSync(master, key)}/${key}/${ch}.json`;
    }

    async function buildChapterTasks() {
        const master = await load();
        const tasks = [];
        for (const b of master.ALL) {
            const folder = folderForSync(master, b.key);
            for (let c = 1; c <= b.chapters; c++) {
                tasks.push({ key: b.key, ch: c, path: `../bible_data/${folder}/${b.key}/${c}.json` });
            }
        }
        return tasks;
    }

    /* fetch を行い、失敗を必ず記録・可視化する。サイレント化禁止。 */
    async function fetchJSON(path) {
        try {
            const res = await fetch(path);
            if (!res.ok) {
                notifyFailure({ path, status: res.status });
                return null;
            }
            const data = await res.json();
            return data;
        } catch (err) {
            notifyFailure({ path, error: String(err) });
            return null;
        }
    }

    /* 宣言章数の1つ先の章が実際に取得できてしまう場合 = books.json の章数が不足している。
       ブラウザはファイルシステムを直接スキャンできないため、境界プローブで代替検証する。 */
    async function verifyCoverage(onAnomaly) {
        const master = await load();
        for (const b of master.ALL) {
            const folder = folderForSync(master, b.key);
            const probePath = `../bible_data/${folder}/${b.key}/${b.chapters + 1}.json`;
            try {
                const res = await fetch(probePath, { method: 'HEAD' });
                if (res.ok) {
                    /* SPA サーバは存在しないパスに HTML フォールバック (200+text/html) を返す。
                       content-type が JSON でない場合は実データではないため偽陽性として除外する。 */
                    const ct = res.headers.get('content-type') || '';
                    if (!ct.includes('json')) continue;
                    const detail = { key: b.key, declaredChapters: b.chapters, probedChapter: b.chapters + 1 };
                    console.error('[BookMaster] books.json の章数が不足している可能性があります', detail);
                    if (onAnomaly) onAnomaly(detail);
                }
            } catch (_) {
                /* probe 自体の失敗（CORS等でHEAD不可な静的サーバ）は不整合の証拠にはならないため無視 */
            }
        }
    }

    function getFailedFetches() {
        return window.__failedFetches.slice();
    }

    function onFailure(cb) {
        _failureListeners.push(cb);
    }

    /* 失敗件数・失敗ファイル一覧（折りたたみ）・章数不整合をDOMに描く共通UI。
       各ページはコンテナ要素を1つ用意して渡すだけでよい。 */
    function attachWarningPanel(containerEl) {
        if (!containerEl) return;
        const coverageAnomalies = [];
        containerEl.style.display = 'none';

        function render() {
            const failed = getFailedFetches();
            const total = failed.length + coverageAnomalies.length;
            if (total === 0) { containerEl.style.display = 'none'; return; }
            containerEl.style.display = '';
            const failedList = failed.map(f =>
                `<li>${f.path}${f.status ? ` (HTTP ${f.status})` : ''}${f.error ? ` — ${f.error}` : ''}</li>`
            ).join('');
            const anomalyList = coverageAnomalies.map(a =>
                `<li>${a.key}: books.json は ${a.declaredChapters} 章と宣言しているが、第${a.probedChapter}章のデータが存在します（章数不足の疑い）</li>`
            ).join('');
            containerEl.innerHTML = `
                <details style="border:1px solid #c00;background:#fff3f3;padding:8px 12px;border-radius:6px;font-size:0.8rem;color:#900;">
                    <summary style="cursor:pointer;font-weight:bold;">
                        データ取得の警告: 失敗 ${failed.length} 件 / 章数不整合の疑い ${coverageAnomalies.length} 件
                    </summary>
                    ${failed.length ? `<div style="margin-top:6px;">取得に失敗したファイル:</div><ul style="margin:4px 0 0 1.2em;">${failedList}</ul>` : ''}
                    ${coverageAnomalies.length ? `<div style="margin-top:6px;">books.json の章数不整合の疑い:</div><ul style="margin:4px 0 0 1.2em;">${anomalyList}</ul>` : ''}
                </details>`;
        }

        onFailure(render);
        load().then(() => verifyCoverage(detail => { coverageAnomalies.push(detail); render(); }));
        render();
    }

    window.BookMaster = {
        load,
        folderFor,
        pathFor,
        buildChapterTasks,
        fetchJSON,
        verifyCoverage,
        getFailedFetches,
        onFailure,
        attachWarningPanel,
        requireLoaded,
    };
})();
