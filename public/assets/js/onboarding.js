/**
 * onboarding.js — 静かなオンボーディング（CSS統合版）
 * CSSをJS内で動的注入。このファイル1つで完結。
 *
 * 改訂履歴
 *  Rev.1  初回30秒を純粋な発見体験に：レベル/目的質問削除、バナー2.5秒化、
 *          ヒント1文化、UI同時表示禁止、ob-hint トースト化、CTA安全化
 *  Rev.2  触って理解するUX：ヒントレイヤー下部トースト統一、ValueSummary体験接続化、
 *          Flow CTA ボタン化、EmptyState超短文化、「読めなくても大丈夫」追加
 *  Rev.3  また開きたくなる設計：2回目訪問OB、WordInsight後で読む保存、
 *          Flow体験強化、神学安全性免責、専門用語レイヤー構造整理
 *  Rev.4  JOH 3:16 onboarding追加：ROM完了後にJHN3へ継続。
 *          「知っている節が深く読める」体験。οὕτωςpulse→prose→compare補助→Flow→完了。
 *  Rev.5  モバイルオンボーディング修正：Compare排除・Flow単独体験化。
 *          STEP4のActivateFlowCompare/forceShowCompareOnMobileをopenFlowTabに変更。
 *          STEP6のDOMターゲットをverse-pair-rightから#word-list-view .wlv-chipに変更。
 *          onFlowTabOpenedのGAR17_CLICKEDガードを削除。
 *  Rev.9  モバイルStudyPanel・章ビュー3箇所でチップが光らないバグ修正：
 *          ob-pulse アニメーションを box-shadow → outline + background パルスに変更。
 *          box-shadow は will-change:transform のコンポジットレイヤーでクリップされ
 *          かつ白背景上で background:white が不可視だったため。
 *          _pulseGarInFlow の4秒タイムアウト廃止 → _cancelPulse() まで永続発光。
 *          _cancelPulse に querySelectorAll('.ob-pulse') の全消しを追加。
 *          _attachPulseToGar のフォールバックに text === 'for' 完全一致条件を追加。
 *          data-* 属性なし・英語テキストのみの環境でも γάρ チップが光るようになった。
 *          口語訳スタート→読解フロー移行バグ修正：
 *          _closeMobileStudyPanelAndGoFlow のパネル閉鎖検知を #app.mobile-study-open に修正。
 *          _goToStep(FLOW) 直呼び→AppBridge.openFlowTab() 経由に変更し実際の画面切り替えを保証。
 *          読解フロースタート→onFlowTabOpened 誤発火バグ修正：
 *          transA=FLOW 起動時に render()→_setRightMode('flow')→onFlowTabOpened() が
 *          onPageRendered() より先に呼ばれ FLOW ステップへ飛ぶ問題を、
 *          onboardingStep>=1 ガードで抑止。
 */

(function () {
    'use strict';

    /* ══════════════════════════════════════════════════
       CSS 注入
       ══════════════════════════════════════════════════ */
    const _css = `
.ob-hint {
    position: fixed;
    z-index: 9000;
    pointer-events: none;
    user-select: none;
    background: rgba(29,29,31,0.78);
    border-radius: 20px;
    padding: 7px 16px;
    max-width: min(260px, 86vw);
    font-family: 'Noto Serif JP', 'Georgia', serif;
    font-size: 0.76rem;
    font-weight: 500;
    line-height: 1.5;
    letter-spacing: 0.01em;
    color: rgba(255,255,255,0.92);
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.35s cubic-bezier(0.4,0,0.2,1),
                transform 0.35s cubic-bezier(0.4,0,0.2,1);
}
.ob-hint.ob-hint--visible {
    opacity: 1;
    transform: translateY(0);
}
.ob-hint.ob-hint--fade {
    opacity: 0;
    transform: translateY(-3px);
}
.ob-hint--bottom-center {
    left: 50%;
    transform: translateX(-50%) translateY(4px);
}
.ob-hint--bottom-center.ob-hint--visible {
    transform: translateX(-50%) translateY(0);
}
.ob-hint--bottom-center.ob-hint--fade {
    transform: translateX(-50%) translateY(-3px);
}
/* Rev.9: box-shadow spread グロー → outline + background パルスに変更。
   理由①: will-change:transform の StudyPanel コンポジットレイヤーで
           box-shadow がクリップされ視認できなかった。
   理由②: 白背景パネル上で background:rgba(255,255,255,1) が透明と同化し見えなかった。
   outline は別レイヤーに描画されクリップされず、background の濃淡パルスで
   どの背景色の上でも視認できるようにする。 */
@keyframes ob-pulse-gentle {
    0%   { background: rgba(90,110,130,0.00);
           outline: 2px solid rgba(90,110,130,0.00);
           outline-offset: 0px; }
    35%  { background: rgba(90,110,130,0.13);
           outline: 2px solid rgba(90,110,130,0.55);
           outline-offset: 3px; }
    100% { background: rgba(90,110,130,0.00);
           outline: 2px solid rgba(90,110,130,0.00);
           outline-offset: 0px; }
}
.ob-pulse {
    animation: ob-pulse-gentle 2.2s ease-in-out 0.2s infinite;
    animation-fill-mode: both;
    cursor: pointer !important;
    text-decoration-line: underline;
    text-decoration-color: rgba(90,110,130,0.80);
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
    transition: text-decoration-color 0.2s;
}
.ob-flow-hint {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin: 0 16px 16px;
    padding: 11px 14px;
    border-radius: 10px;
    background: rgba(245,245,247,0.80);
    border: 0.5px solid rgba(0,0,0,0.07);
    font-family: 'Noto Serif JP', 'Georgia', serif;
    font-size: 0.75rem;
    line-height: 1.65;
    color: rgba(29,29,31,0.72);
    letter-spacing: 0.01em;
    opacity: 0;
    transition: opacity 0.5s ease;
    pointer-events: none;
}
.ob-flow-hint.ob-flow-hint--visible { opacity: 1; }
.ob-flow-hint-icon {
    font-size: 0.9rem;
    opacity: 0.45;
    flex-shrink: 0;
    margin-top: 1px;
}
.ob-mobile-hint {
    position: fixed;
    bottom: calc(env(safe-area-inset-bottom, 16px) + 72px);
    left: 50%;
    transform: translateX(-50%) translateY(6px);
    z-index: 9100;
    pointer-events: none;
    background: rgba(255,255,255,0.98);
    border: 1px solid rgba(90,110,130,0.20);
    border-radius: 20px;
    box-shadow: 0 6px 28px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    padding: 12px 22px;
    max-width: min(300px, 86vw);
    width: max-content;
    font-family: 'Noto Serif JP', 'Georgia', serif;
    font-size: 0.82rem;
    font-weight: 500;
    color: rgba(29,29,31,0.88);
    letter-spacing: 0.01em;
    text-align: center;
    line-height: 1.65;
    opacity: 0;
    transition: opacity 0.45s ease,
                transform 0.45s cubic-bezier(0.4,0,0.2,1);
}
.ob-mobile-hint--visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

/* ── フォーカスオーバーレイ（光る語だけ押せる状態） ── */
.ob-focus-panel {
    position: fixed;
    z-index: 8000;
    background: rgba(0, 0, 0, 0.38);
    pointer-events: all;
    transition: opacity 0.35s ease;
}
.ob-focus-ring {
    position: fixed;
    z-index: 8001;
    border-radius: 8px;
    outline: 2px solid rgba(90, 110, 130, 0.55);
    pointer-events: none;
    transition: opacity 0.35s ease;
}
/* ─────────────────────────────
   Unified Onboarding Card
───────────────────────────── */
#ob-value-summary {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 16px) + 84px);
    transform: translateX(-50%) translateY(8px);
    z-index: 9200;
    width: min(360px, 92vw);
    background: rgba(255,255,255,0.98);
    border: 1px solid rgba(90,110,130,0.18);
    border-radius: 20px;
    box-shadow: 0 10px 36px rgba(0,0,0,0.14);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    padding: 22px;
    font-family: 'Noto Serif JP', 'Georgia', serif;
    opacity: 0;
    transition:
        opacity .35s ease,
        transform .35s cubic-bezier(0.4,0,0.2,1);
}

#ob-value-summary.ob-visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}

.ob-card-title {
    font-size: .95rem;
    font-weight: 700;
    line-height: 1.5;
    color: rgba(29,29,31,.92);
    margin-bottom: 10px;
    letter-spacing: .01em;
}

.ob-card-body {
    font-size: .82rem;
    line-height: 1.85;
    color: rgba(29,29,31,.72);
    letter-spacing: .01em;
}

.ob-card-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 18px;
}

.ob-btn {
    min-height: 46px;
    border: none;
    border-radius: 12px;
    background: rgba(90,110,130,.10);
    color: rgba(29,29,31,.88);
    font-family: 'Noto Serif JP', 'Georgia', serif;
    font-size: .82rem;
    font-weight: 600;
    letter-spacing: .01em;
    cursor: pointer;
    transition:
        background .18s ease,
        transform .12s ease;
}

.ob-btn:hover {
    background: rgba(90,110,130,.16);
}

.ob-btn:active {
    transform: scale(.98);
}

.ob-text-btn {
    border: none;
    background: transparent;
    color: rgba(29,29,31,.45);
    font-family: 'Noto Serif JP', 'Georgia', serif;
    font-size: .72rem;
    cursor: pointer;
}

/* ── TASK 8: 非同期待機インジケーター ── */
@keyframes ob-loading-dots {
    0%, 100% { opacity: 0.2; }
    50%       { opacity: 0.7; }
}
#ob-flow-loading {
    animation: ob-loading-dots 1.4s ease-in-out infinite;
}
`;

    (function _injectCSS() {
        const style = document.createElement('style');
        style.id = 'ob-styles';
        style.textContent = _css;
        if (document.head) {
            document.head.appendChild(style);
        } else {
            document.addEventListener('DOMContentLoaded', function () {
                document.head.appendChild(style);
            });
        }
    })();

    /* ── 定数 ─────────────────────────────────────────── */
    const STORAGE_KEY          = 'app_onboarding';
    const HINT_AUTO_DISMISS_MS = 5000;
    const PULSE_DELAY_MS       = 1800;
    const ONBOARDING_VERSE     = { book: 'ROM', chapter: 1, verse: 16 }; // 固定聖句

    const OB_STEP = {
        WELCOME:              'welcome',              // STEP1: 16節パルス
        VERSE16_GAR:          'verse16_gar',          // STEP2: 16節γάρパルス
        GAR16_CLICKED:        'gar16_clicked',        // STEP3: γάρ押下演出→続きボタン
        VERSE17_GAR:          'verse17_gar',          // STEP4: 17節γάρパルス
        GAR17_CLICKED:        'gar17_clicked',        // STEP5: γάρ押下演出→流れボタン
        FLOW:                 'flow',                 // STEP6: Flow表示
        COMPLETE:             'complete',             // 既存互換（alias）
        // ── JOH 3:16 onboarding ──
        JOHN316_READING:      'john316_reading',      // JOH-1: 読む時間（3.5秒自動）
        JOHN316_HOUTOS:       'john316_houtos',       // JOH-2: οὕτωςパルス
        JOHN316_WORD_CLICKED: 'john316_word_clicked', // JOH-3: prose + compare CTA
        JOHN316_COMPARE:      'john316_compare',      // JOH-4: compare補助
        JOHN316_FLOW:         'john316_flow',         // JOH-5: 愛→御子→信じる者→命
        FINAL_COMPLETE:       'final_complete',       // 全onboarding完了
    };
    
    /* ── 状態のデフォルト ────────────────────────────── */
    const DEFAULT_STATE = {
        currentStep:            OB_STEP.WELCOME,
        firstLaunch:            true,
        wordClicked:            false,
        openedStudy:            false,
        flowSeen:               false,
        mobileStudySeen:        false,
        onboardingStep:         0,
        wordsClickedCount:      0,
        onboardingComplete:     false,
        onboardingSkipped:      false,
        experiencedReader:      false,
        levelAsked:             false,
        achievedFirstWord:      false,
        achievedFirstCompare:   false,
        achievedFirstFlow:      false,
        purposeAsked:           false,
        purpose:                null,
        visitCount:             0,
        returnNudgeSeen:        false,
        // 新フロー用
        verse16Opened:          false, // 16節を開いた
        gar16Clicked:           false, // 16節γάρを押した
        verse17Opened:          false, // 17節を開いた
        gar17Clicked:           false, // 17節γάρを押した
        // ── JOH 3:16 onboarding ──
        john316ReadingSeen:     false,
        john316WordClicked:     false,
        john316CompareSeen:     false,
        john316FlowSeen:        false,
    };

    let _state             = null;
    let _hintTimer         = null;
    let _readingStepTimer  = null;   // JOHN316_READING 自動進行タイマー
    let _pulseEl           = null;
    let _activeHintEl      = null;
    let _currentHintId     = null;
    let _isProcessingClick = false;
    let _lastClickedEl     = null;
    let _cardRepositionCleaner = null; // cleanup fn for near-anchor card repositioning

    /* ── 状態管理（Public APIより先に定義） ─────────── */
    function _loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return { ...DEFAULT_STATE };
            return Object.assign({ ...DEFAULT_STATE }, JSON.parse(raw));
        } catch (_) { return { ...DEFAULT_STATE }; }
    }

    function _saveState() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_state)); }
        catch (_) {}
    }

    /* ── 即時初期化（Public APIが呼ばれる前に完了させる） */
    try {
        const _raw = localStorage.getItem(STORAGE_KEY);
        _state = _loadState();

        if (!_raw) {
            // localStorageに記録なし＝真の初回訪問。firstLaunchをtrueのまま保持。
            _saveState();
        } else {
            // 2回目以降の訪問。firstLaunchをfalseに確定。
            _state.firstLaunch = false;
            // 未完了 & 途中離脱（step >= 1）→ step を 0 に戻して再スタート
            if (!_state.onboardingComplete && !_state.onboardingSkipped && _state.onboardingStep >= 1) {
                _state.onboardingStep = 0;
            }
            _saveState();
        }
    } catch (e) {
        console.error('[AppOnboarding] init error:', e);
        _state = { ...DEFAULT_STATE };
    }

    /* ── オンボーディング未完了時のURLガード ──────────────
       stepに応じて ROM 1 または JHN 3 へ誘導する。
       ※ onboardingStep === 0 はオンボーディング未開始（または途中離脱後リセット）。
          この状態ではユーザーが自由に箇所を選べるようガードを発動しない。
    ───────────────────────────────────────────────── */
    (function _guardOnboardingUrl() {
        try {
            if (_state.onboardingComplete || _state.onboardingSkipped) return;
            // 実際にオンボーディングが進行中（step >= 1）のときだけガードする
            if (_state.onboardingStep === 0 && !_state.firstLaunch) return;
            var p = new URLSearchParams(window.location.search);
            var book = p.get('book') || 'ROM';
            var ch   = p.get('ch')   || '1';

            // JOH 3:16 onboarding steps は JHN 3 で動作する
            var _jhnSteps = [
                OB_STEP.JOHN316_READING,
                OB_STEP.JOHN316_HOUTOS,
                OB_STEP.JOHN316_WORD_CLICKED,
                OB_STEP.JOHN316_COMPARE,
                OB_STEP.JOHN316_FLOW,
                OB_STEP.FINAL_COMPLETE,
            ];
            var _isJhnStep = _jhnSteps.indexOf(_state.currentStep) !== -1;

            if (_isJhnStep) {
                // JHN 3 以外ならリダイレクト
                if (book !== 'JHN' || ch !== '3') {
                    p.set('book', 'JHN');
                    p.set('ch', '3');
                    p.set('mode', 'single');
                    window.location.replace('?' + p.toString());
                }
                return;
            }

            // ROM onboarding steps は ROM 1 で動作する
            if (book !== 'ROM' || ch !== '1') {
                // ROM 1章・single モードにリセット（transA はそのまま）
                p.set('book', 'ROM');
                p.set('ch', '1');
                p.delete('transB');
                p.set('mode', 'single');
                window.location.replace('?' + p.toString());
            }
        } catch (_) {}
    })();

    /* ══════════════════════════════════════════════════
       Public API  ── STEP8: App.onboarding へ移行
       ══════════════════════════════════════════════════ */
    window.App = window.App || {};
    window.App.onboarding = {

        init() {
            /* 即時初期化済みのため no-op。DOMContentLoadedからの呼び出し用に残す。 */
        },

        showHint(message, opts = {}) {
            _showHint(message, opts);
        },

        markSeen(key) {
            if (key in _state) {
                _state[key] = true;
                _saveState();
            }
        },

        reset() {
            localStorage.removeItem(STORAGE_KEY);
            _state = { ...DEFAULT_STATE };
            console.info('[AppOnboarding] reset. Reload to see onboarding again.');
        },

        // 設定画面の「チュートリアルをもう一度」から呼ぶ（F3-B）
        resetAndReload() {
            localStorage.removeItem(STORAGE_KEY);
            _state = { ...DEFAULT_STATE };
            location.reload();
        },

        getState() {
            // 読み取り専用コピーを返す（外部からの直接書き換えを防ぐ）
            return Object.assign({}, _state);
        },

        // デバッグ情報出力
        debug() {
            const info = {
                currentPhase:       _state.onboardingStep,
                wordsClickedCount:  _state.wordsClickedCount,
                onboardingComplete: _state.onboardingComplete,
                onboardingSkipped:  _state.onboardingSkipped,
                experiencedReader:  _state.experiencedReader,
                purpose:            _state.purpose,
                visitCount:         _state.visitCount,
                returnNudgeSeen:    _state.returnNudgeSeen,
                anchorFound:        !!_getOnboardingAnchor(),
                activeHint:         !!_activeHintEl,
            };
            if (console.table) { console.table(info); } else { console.log('[AppOnboarding] debug', info); }
            return info;
        },

        onPageRendered() {
            _clearHint();
            _cancelPulse();

            _state.visitCount = (_state.visitCount || 0) + 1;
            _saveState();

            if (!_state.onboardingComplete) {
                if (_state.onboardingStep === 0 && _state.firstLaunch) {
                    // 真の初回訪問のみオンボーディングを開始
                    _state.firstLaunch = false;
                    _state.onboardingStep = 1;
                    _saveState();
                    _goToStep(OB_STEP.WELCOME);
                }

                // WELCOME ステップのとき、ページロード時点でStudy Panelがすでに開いていれば
                // onStudyPanelOpened が呼ばれないため、手動で通知して STEP2 へ進める
                else if (_state.currentStep === OB_STEP.WELCOME && !_state.verse16Opened) {
                    var _appState = (window.App && window.App.bridge && window.App.bridge.getAppState) ? window.App.bridge.getAppState() : null;
                    var _appMode = (_appState && _appState.mode) || '';
                    var _vNum    = (_appState && _appState.selectedVerse && _appState.selectedVerse.vNum) || null;
                    if ((_appMode === 'study' || _appMode === 'browsing') && _vNum) {
                        setTimeout(function() {
                            window.App.onboarding.onStudyPanelOpened(window.innerWidth <= 900, String(_vNum));
                        }, 400);
                    } else {
                        // Study Panelが閉じていれば通常通り WELCOME カードを表示
                        _goToStep(OB_STEP.WELCOME);
                    }
                }

                // JOH: JOHN316_READING — JHN 3ページ到達後にカードを表示
                // 3.5秒後に _obOpenVerse16ForJoh() で 3:16節を自動クリックし、
                // _obOpenVerse16ForJoh 内で直接 JOHN316_HOUTOS へ遷移する
                else if (_state.currentStep === OB_STEP.JOHN316_READING) {
                    requestAnimationFrame(function() {
                        requestAnimationFrame(function() {
                            _goToStep(OB_STEP.JOHN316_READING);
                        });
                    });
                }

                // JOH: JOHN316_COMPARE — リロード後の復帰時にcompareを再発火
                else if (_state.currentStep === OB_STEP.JOHN316_COMPARE) {
                    requestAnimationFrame(function() {
                        requestAnimationFrame(function() {
                            _goToStep(OB_STEP.JOHN316_COMPARE);
                        });
                    });
                }

            } else {
                if (_state.visitCount === 2 && !_state.returnNudgeSeen) {
                    setTimeout(_showReturnNudge, 1800);
                }
            }
        },

        onWordClicked(clickedEl) {
            if (_state.onboardingComplete) return;
            if (_state.onboardingSkipped) return;
            if (_isProcessingClick) return;
            _isProcessingClick = true;

            _lastClickedEl = clickedEl || null;

            try {
                // クリックされた語のgreekを取得
                var greek = '';
                if (clickedEl) {
                    greek = (clickedEl.dataset && clickedEl.dataset.greek)
                        ? clickedEl.dataset.greek
                        : (clickedEl.title || '');
                }
                // Rev.6: data-greek が空の環境では data-strongs="G1063" で γάρ を判定
                var strongs = clickedEl
                    ? ((clickedEl.dataset && clickedEl.dataset.strongs) || clickedEl.getAttribute('data-strongs') || '')
                    : '';
                var isGar = (greek === 'γάρ' || greek === 'γὰρ' || greek === 'γαρ')
                         || (strongs === 'G1063' || strongs === '1063');

                // STEP2: 16節γάρを待っている → γάρが押された
                if (_state.currentStep === OB_STEP.VERSE16_GAR && isGar && !_state.gar16Clicked) {
                    _state.gar16Clicked = true;
                    _state.wordsClickedCount += 1;
                    _state.wordClicked = true;
                    _state.levelAsked = true;
                    _state.purposeAsked = true;
                    _saveState();
                    _cancelPulse();
                    _hideOnboardingCard();

                    // STEP3演出: 前後文ハイライト→接続ライン→カード
                    _showGar16ConnectionEffect(clickedEl, function() {
                        setTimeout(function() {
                            _goToStep(OB_STEP.GAR16_CLICKED);
                        }, 900);
                    });
                    return;
                }


                // JOH: JOHN316_HOUTOS で οὕτως が押された
                var _greekNorm = greek.normalize ? greek.normalize('NFC') : greek;
                var isHoutos = (_greekNorm === 'οὕτως' || _greekNorm === 'Οὕτως'
                             || _greekNorm === 'οὑτως'  || _greekNorm === 'Οὑτως');
                if (_state.currentStep === OB_STEP.JOHN316_HOUTOS && isHoutos && !_state.john316WordClicked) {
                    _state.john316WordClicked = true;
                    _saveState();
                    _cancelPulse();
                    _hideOnboardingCard();

                    setTimeout(function() {
                        _goToStep(OB_STEP.JOHN316_WORD_CLICKED);
                    }, 600);
                    return;
                }

            } finally {
                _isProcessingClick = false;
            }
        },

        onStudyPanelOpened(isMobile, vNum) {
            if (_state.onboardingComplete) return;
            if (_state.onboardingSkipped) return;

            var num = parseInt(vNum, 10);

            // STEP1: WELCOMEステップで16節が開いた
            if (_state.currentStep === OB_STEP.WELCOME && num === 16 && !_state.verse16Opened) {
                _state.verse16Opened = true;
                _saveState();
                _cancelPulse();
                _hideOnboardingCard();

                // γάρを探してパルス付与
                setTimeout(function() {
                    _goToStep(OB_STEP.VERSE16_GAR);
                }, 400);
                return;
            }

            // STEP4: GAR16_CLICKEDステップで17節が開いた（自動遷移後）
            if (_state.currentStep === OB_STEP.GAR16_CLICKED && num === 17 && !_state.verse17Opened) {
                _state.verse17Opened = true;
                _saveState();
                _cancelPulse();
                _hideOnboardingCard();

                setTimeout(function() {
                    _goToStep(OB_STEP.VERSE17_GAR);
                }, 400);
                return;
            }

            // JOH: JHN 3:16 の StudyPanel が開いた → JOHN316_HOUTOS へ遷移。
            // ① JOHN316_READING ステップから来た場合（正規ルート）
            // ② currentStep が JHN 向けでない場合（ROM 未完のまま直接 JHN 3:16 を開いた）
            //    → book が JHN であれば ROM onboarding をスキップして HOUTOS へ進む。
            // AppState.location は非同期描画後に確定するため URL から直接取得する
            var _urlBook = new URLSearchParams(window.location.search).get('book') || '';
            var _bridgeState = (!_urlBook && window.App && window.App.bridge && window.App.bridge.getAppState) ? window.App.bridge.getAppState() : null;
            var _curBook = (_urlBook)
                || (_bridgeState && _bridgeState.location && _bridgeState.location.book
                    ? _bridgeState.location.book.key : '');
            var _isJhnContext = (_curBook === 'JHN');
            var _jhnOnboardingSteps = [
                OB_STEP.JOHN316_READING, OB_STEP.JOHN316_HOUTOS,
                OB_STEP.JOHN316_WORD_CLICKED, OB_STEP.JOHN316_COMPARE,
                OB_STEP.JOHN316_FLOW, OB_STEP.FINAL_COMPLETE,
            ];
            var _isAlreadyJhnStep = _jhnOnboardingSteps.indexOf(_state.currentStep) !== -1;

            if (num === 16 && _isJhnContext && (_state.currentStep === OB_STEP.JOHN316_READING || !_isAlreadyJhnStep)) {
                _hideOnboardingCard();
                // ROM onboarding 途中からのスキップ時は currentStep を確実に更新
                setTimeout(function() {
                    _goToStep(OB_STEP.JOHN316_HOUTOS);
                }, 300);
                return;
            }

            // JOH: JOHN316_HOUTOS ステップでは節クリック待機をしない。
            // onboarding進行条件は οὕτως 押下のみ（onWordClicked で処理）。
        },

        onFlowTabOpened() {
            // Rev.5: GAR17_CLICKED ステップのガードを削除。
            // _renderVerse17GarStep の「流れを見る」ボタンが openFlowTab() を呼び、
            // Flow タブが開いた後ここを通って _goToStep(OB_STEP.FLOW) へ進む。
            if (_state.achievedFirstFlow) return;
            // Rev.8: transA=FLOW で起動した場合、render() から _setRightMode('flow') が呼ばれ
            // onFlowTabOpened() が onPageRendered() より先に発火してしまう。
            // VERSE17_GAR / GAR17_CLICKED ステップ（または _closeMobileStudyPanelAndGoFlow 後）
            // でのみ FLOW ステップへ進む。それ以外のステップ（WELCOME 等）では無視する。
            var _readyForFlow = (
                _state.currentStep === OB_STEP.VERSE17_GAR ||
                _state.currentStep === OB_STEP.GAR17_CLICKED ||
                _state.onboardingStep >= 1   // 何らかのステップが進行中であることを確認
            );
            if (!_readyForFlow) return;
            _state.achievedFirstFlow = true;
            _saveState();
            setTimeout(function() {
                _goToStep(OB_STEP.FLOW);
            }, 500);
        },

    }; // end window.App.onboarding

    /* 互換エイリアス（既存の window.AppOnboarding 参照を壊さない） */
    window.AppOnboarding = window.App.onboarding;

    /* ── Unified Onboarding Card ────────────────────── */
    /* ── カード近傍配置ヘルパー ─────────────────────────
       設計方針:
         ① スクロール親がある（StudyPanel 等）→ position:absolute で親内に注入。
            absolute はコンテンツに追従するため iOS momentum scroll でもズレない。
         ② スクロール親なし（window スクロール）→ position:fixed + scroll/resize 追従。
       どちらのケースも:
         - アンカーが viewport 上半分 → カードを下側
         - アンカーが viewport 下半分 → カードを上側（入らなければ逆を試す）
         - top を [SAFE_T, vh - safeAreaBottom - MARGIN - cardH] にクランプ
    ─────────────────────────────────────────────── */

    /* env(safe-area-inset-bottom) を px 値で返す。
       probe 要素経由で env() を評価することで --sab CSS変数が未定義でも動作。
       viewport-fit=cover が設定されている場合にのみ実際のノッチ高さを返す。 */
    function _readSafeAreaBottom() {
        var probe = document.createElement('div');
        probe.style.cssText = 'position:fixed;bottom:0;height:0;width:0;' +
            'padding-bottom:env(safe-area-inset-bottom,0px);' +
            'visibility:hidden;pointer-events:none;';
        document.body.appendChild(probe);
        var val = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
        probe.remove();
        return val;
    }

    /* 最も近いスクロール可能な祖先を返す（なければ null）。
       document.body は除外（window スクロールと区別）。 */
    function _getScrollParent(el) {
        var p = el.parentElement;
        while (p && p !== document.body) {
            var s = window.getComputedStyle(p);
            if (/auto|scroll/.test(s.overflow + s.overflowY) && p.scrollHeight > p.clientHeight) {
                return p;
            }
            p = p.parentElement;
        }
        return null;
    }

    /* アンカー要素をスクロール容器内で fraction の位置へ移動する。
       scrollIntoView ではなく scrollTop の直接計算を使うことで、
       fraction の正確な制御と StudyPanel 内部スクロールの両方に対応する。 */
    function _scrollAnchorToViewport(anchorEl, fraction) {
        if (!anchorEl) return;
        fraction = fraction !== undefined ? fraction : 0.30;
        /* getBoundingClientRect().top は現在のビューポート座標。
           target Y = vh * fraction になるよう delta を計算する。 */
        var rect  = anchorEl.getBoundingClientRect();
        var delta = rect.top - window.innerHeight * fraction;
        var sc    = _getScrollParent(anchorEl);
        if (sc) {
            sc.scrollTo({ top: sc.scrollTop + delta, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: window.scrollY + delta, behavior: 'smooth' });
        }
    }

    /* アンカー要素の上または下にカードを配置し、リスナーを登録する。
       返却はなし。_cardRepositionCleaner にクリーンアップ関数をセット。 */
    function _positionCardNear(cardEl, anchorEl) {
        if (_cardRepositionCleaner) {
            _cardRepositionCleaner();
            _cardRepositionCleaner = null;
        }

        var MARGIN = 16;
        var SAFE_T = 58;  // ヘッダー下端の安全マージン（px）
        var safeB  = _readSafeAreaBottom();
        var sc     = _getScrollParent(anchorEl);

        if (sc) {
            /* ── ① スクロール親内 absolute 配置 ──────────────────────
               absolute は sc の content に追従するため、iOS momentum
               scroll 中でもカードとアンカーのズレが発生しない。        */

            // sc が positioned でなければ relative に昇格させる
            if (getComputedStyle(sc).position === 'static') {
                sc.style.position = 'relative';
            }
            if (cardEl.parentNode !== sc) sc.appendChild(cardEl);
            cardEl.style.position = 'absolute';
            cardEl.style.bottom   = 'auto';

            function _placeAbs() {
                var scRect   = sc.getBoundingClientRect();
                var anchorR  = anchorEl.getBoundingClientRect();
                var vh       = window.innerHeight;
                var cardH    = cardEl.offsetHeight || 120;
                var anchorH  = anchorEl.offsetHeight;
                /* sc.clientTop = ボーダー上端幅。
                   position:absolute の top:0 は sc のパディング上端（ボーダー内側）が起点。
                   ビューポートY ⟷ absTop の変換:
                     ビューポートY = scRect.top + sc.clientTop + absTop - sc.scrollTop
                     absTop = ビューポートY - scRect.top - sc.clientTop + sc.scrollTop */
                var scBorderT  = sc.clientTop || 0;
                var scOriginVp = scRect.top + scBorderT; // absolute 座標の viewport Y 原点

                /* アンカーの absolute 座標（sc コンテンツ内、スクロール考慮） */
                var anchorInSc = anchorR.top - scOriginVp + sc.scrollTop;

                var anchorMidVp = anchorR.top + anchorH / 2;

                /* 下側候補 absTop と、そのカード下端の viewport Y */
                var topBel     = anchorInSc + anchorH + MARGIN;
                var botViewBel = scOriginVp + topBel - sc.scrollTop + cardH;
                var belFits    = botViewBel <= vh - safeB - MARGIN;

                /* 上側候補 absTop と、そのカード上端の viewport Y */
                var topAbo     = anchorInSc - MARGIN - cardH;
                var topViewAbo = scOriginVp + topAbo - sc.scrollTop;
                var aboFits    = topViewAbo >= SAFE_T;

                var absTop;
                if (anchorMidVp < vh * 0.50) {
                    /* アンカー上半分 → まず下を試す */
                    if (belFits) {
                        absTop = topBel;
                    } else if (aboFits) {
                        absTop = topAbo;
                    } else {
                        /* どちらも収まらない → viewport 下端でクランプした下側 */
                        var maxAbsBel = (vh - safeB - MARGIN - cardH) - scOriginVp + sc.scrollTop;
                        absTop = Math.max(0, Math.min(topBel, maxAbsBel));
                    }
                } else {
                    /* アンカー下半分 → まず上を試す */
                    if (aboFits) {
                        absTop = topAbo;
                    } else if (belFits) {
                        absTop = topBel;
                    } else {
                        /* どちらも収まらない → SAFE_T でクランプした上側 */
                        var minAbsAbo = SAFE_T - scOriginVp + sc.scrollTop;
                        absTop = Math.max(0, Math.max(topAbo, minAbsAbo));
                    }
                }

                /* 最終クランプ: コンテンツ内で負にならない */
                absTop = Math.max(0, absTop);
                cardEl.style.top = absTop + 'px';
            }

            _placeAbs();
            /* absolute なのでパネルスクロールには追従不要。リサイズ時のみ再計算。 */
            window.addEventListener('resize', _placeAbs, { passive: true });

            _cardRepositionCleaner = function() {
                window.removeEventListener('resize', _placeAbs);
            };

        } else {
            /* ── ② window スクロール → fixed 配置 ───────────────────── */
            if (cardEl.parentNode !== document.body) {
                document.body.appendChild(cardEl);
            }
            cardEl.style.position = 'fixed';
            cardEl.style.bottom   = 'auto';

            function _placeFixed() {
                var r      = anchorEl.getBoundingClientRect();
                var vh     = window.innerHeight;
                var cardH  = cardEl.offsetHeight || 120;
                var midY   = r.top + r.height / 2;

                var maxTop  = vh - safeB - MARGIN - cardH;  // 最下限
                var topBel  = r.bottom + MARGIN;             // 下側候補
                var topAbo  = r.top - MARGIN - cardH;        // 上側候補
                var belFits = topBel + cardH <= vh - safeB - MARGIN;
                var aboFits = topAbo >= SAFE_T;

                var topVal;
                if (midY < vh * 0.50) {
                    /* アンカー上半分 → まず下を試す */
                    if (belFits)        { topVal = topBel; }
                    else if (aboFits)   { topVal = topAbo; }
                    else                { topVal = Math.max(SAFE_T, maxTop); }
                } else {
                    /* アンカー下半分 → まず上を試す */
                    if (aboFits)        { topVal = topAbo; }
                    else if (belFits)   { topVal = topBel; }
                    else                { topVal = Math.max(SAFE_T, maxTop); }
                }

                /* viewport 内クランプ（長いカードが画面外へ出ないよう保証） */
                topVal = Math.max(SAFE_T, Math.min(topVal, maxTop));
                cardEl.style.top = topVal + 'px';
            }

            _placeFixed();
            window.addEventListener('scroll',  _placeFixed, { passive: true, capture: true });
            window.addEventListener('resize',  _placeFixed, { passive: true });

            _cardRepositionCleaner = function() {
                window.removeEventListener('scroll', _placeFixed, true);
                window.removeEventListener('resize', _placeFixed);
            };
        }
    }

    function _renderOnboardingCard(config) {
        // 前回の近傍配置リスナーをクリーンアップ
        if (_cardRepositionCleaner) {
            _cardRepositionCleaner();
            _cardRepositionCleaner = null;
        }

        let el = document.getElementById('ob-value-summary');

        if (!el) {
            el = document.createElement('div');
            el.id = 'ob-value-summary';
            document.body.appendChild(el);
        }

        // フェードアウト中でも即座に新コンテンツで上書き
        delete el.dataset.hiding;
        el.classList.remove('ob-visible');

        el.innerHTML = `
            <div class="ob-card-title">
                ${config.title || ''}
            </div>

            <div class="ob-card-body">
                ${config.body || ''}
            </div>

            ${
                config.actions
                ? `
                    <div class="ob-card-actions">
                        ${config.actions}
                    </div>
                `
                : ''
            }
        `;

        var anchorEl = config.anchorEl || null;
        if (anchorEl) {
            // アンカー近傍配置：一旦画面外へ隠し、layout取得後に正確な位置へ
            el.style.top    = '-9999px';
            el.style.bottom = 'auto';
            requestAnimationFrame(function() {
                // offsetHeight が確定した状態で配置
                // _positionCardNear 内でスクロール親への移動・position 設定も行う
                _positionCardNear(el, anchorEl);
                requestAnimationFrame(function() {
                    el.classList.add('ob-visible');
                });
            });
        } else {
            // デフォルト：CSS の position:fixed + bottom 固定値にまかせる。
            // 前ステップで sc に移動されていた場合は body に戻す。
            if (el.parentNode !== document.body) {
                document.body.appendChild(el);
            }
            el.style.position = '';  // CSS の position:fixed に復帰
            el.style.top      = '';
            el.style.bottom   = '';
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    el.classList.add('ob-visible');
                });
            });
        }

        return el;
    }

    function _hideOnboardingCard() {
        // 近傍配置リスナーをクリーンアップ
        if (_cardRepositionCleaner) {
            _cardRepositionCleaner();
            _cardRepositionCleaner = null;
        }
        const el = document.getElementById('ob-value-summary');
        if (!el) return;
        el.classList.remove('ob-visible');
        el.dataset.hiding = 'true';
        setTimeout(function() {
            // まだ同じ要素が DOM にあり、新しいカードに置き換わっていなければ削除
            if (el.parentNode && el.dataset.hiding === 'true') {
                el.remove();
            }
        }, 350);
    }

    /* ── 状態遷移 ────────────────────────────────────── */
    function _goToStep(step) {
        // READING タイマーが残っていればキャンセル（ユーザー操作 or 別経路で遷移）
        if (_readingStepTimer !== null) {
            clearTimeout(_readingStepTimer);
            _readingStepTimer = null;
        }

        _state.currentStep = step;
        _saveState();

        switch(step) {

            case OB_STEP.WELCOME:
                return _renderWelcomeStep();

            case OB_STEP.VERSE16_GAR:
                return _renderVerse16GarStep();

            case OB_STEP.GAR16_CLICKED:
                return _renderGar16ClickedStep();

            case OB_STEP.VERSE17_GAR:
                return _renderVerse17GarStep();

            case OB_STEP.GAR17_CLICKED:
                return _renderGar17ClickedStep();

            case OB_STEP.FLOW:
                return _renderFlowStep();

            case OB_STEP.COMPLETE:
                return _renderCompleteStep();

            case OB_STEP.JOHN316_READING:
                return _renderJohn316ReadingStep();

            case OB_STEP.JOHN316_HOUTOS:
                return _renderJohn316HoutosStep();

            case OB_STEP.JOHN316_WORD_CLICKED:
                return _renderJohn316WordClickedStep();

            case OB_STEP.JOHN316_COMPARE:
                return _renderJohn316CompareStep();

            case OB_STEP.JOHN316_FLOW:
                return _renderJohn316FlowStep();

            case OB_STEP.FINAL_COMPLETE:
                return _renderFinalCompleteStep();
        }
    }

    /* ── Step Renderers ─────────────────────────────── */

    // STEP1: 先に16節へスクロール＆クリック → スクロール完了後にカード表示
    // スクロール中にカードが流れないよう、画面が静止してから価値提示する
    function _renderWelcomeStep() {
        _autoOpenVerse16();
    }

    // _autoOpenVerse16 がスクロール＆クリックした後、
    // onStudyPanelOpened から STEP2 へ遷移する前にカードを表示する
    // （カードはSTEP2の _renderVerse16GarStep が担うため、STEP1では出さない）
    
    // ROM 1:16 を自動クリックして Study Panel を開く（新規追加）
    function _autoOpenVerse16() {
        var attempt = 0;
        function _tryOpen() {
            var blocks = document.querySelectorAll('.verse-pair-left, .verse-block');
            var block16 = null;
            for (var i = 0; i < blocks.length; i++) {
                var vEl = blocks[i].querySelector('.v-num');
                if (vEl && vEl.textContent.trim() === '16') {
                    block16 = blocks[i];
                    break;
                }
            }
            if (block16) {
                block16.scrollIntoView({ behavior: 'smooth', block: 'start' });
                setTimeout(function() { block16.click(); }, 400);
                return;
            }
            if (attempt < 10) {
                attempt++;
                setTimeout(_tryOpen, 200);
            } else {
                console.warn('[Onboarding] verse 16 block not found for auto-open');
            }
        }
        setTimeout(_tryOpen, 300);
    }

    // STEP2: 16節γάρにパルス・カード
    // STEP1のスクロールが完了し画面が静止した後に表示される
    function _renderVerse16GarStep() {
        _attachPulseToGar();
        _showGarSurroundGlow();

        // γάρ要素が DOM に確定するのを待ってからスクロール→カード表示
        setTimeout(function() {
            var garEl = document.querySelector('[data-ob-gar-anchor="true"]');
            if (garEl) _scrollAnchorToViewport(garEl, 0.30);

            // スクロール完了後にカードをアンカー近傍へ配置
            setTimeout(function() {
                var garEl = document.querySelector('[data-ob-gar-anchor="true"]');
                _renderOnboardingCard({
                    title: '翻訳では見えにくい "文のつながり" があります',
                    body:  '光っている語を押してみてください',
                    anchorEl: garEl,
                });
            }, 380);
        }, 150);
    }

    // STEP3: γάρ押下後 → 演出→「続きも見てみる」ボタン
    function _renderGar16ClickedStep() {
            _renderOnboardingCard({
            title: '日本語訳聖書では見えにくかったつながりがあります',
            body:  '原文では、小さな語で文が続いています。次の節でも見てみましょう。',
            actions: `
                <button id="ob-continue-btn" class="ob-btn">
                    次の節へ
                </button>
            `
        });
        
        document.getElementById('ob-continue-btn')
            ?.addEventListener('click', function() {
                _hideOnboardingCard();
                _goToVerse17();
            });
    }

    // STEP4: 17節γάρにパルス・カード・「流れを見る」ボタン（STEP5を統合）
    // Rev.5: Compare起動を廃止。AppBridge.openFlowTab() でFlow単独表示へ遷移。
    function _renderVerse17GarStep() {
        _attachPulseToGar();
        _showGarSurroundGlow();

        // γάρ要素確定後にスクロール→カードをアンカー近傍へ配置
        setTimeout(function() {
            var garEl = document.querySelector('[data-ob-gar-anchor="true"]');
            if (garEl) _scrollAnchorToViewport(garEl, 0.30);

            setTimeout(function() {
                var garEl = document.querySelector('[data-ob-gar-anchor="true"]');
                _renderOnboardingCard({
                    title: 'ここでも「なぜなら」が隠れていました',
                    body:  '文が、理由を重ねながら続いています。原文では、その流れが見えやすくなります。',
                    actions: `
                        <button id="ob-flow-btn" class="ob-btn">
                            語の流れを見てみましょう →
                        </button>
                    `,
                    anchorEl: garEl,
                });

                document.getElementById('ob-flow-btn')
                    ?.addEventListener('click', function() {
                        _cancelPulse();
                        _hideOnboardingCard();
                        setTimeout(function() {
                            var isMobile = window.innerWidth <= 900;

                            if (isMobile) {
                                // Rev.7: モバイルは Study Panel を閉じて章ビューの Flow に戻る。
                                _closeMobileStudyPanelAndGoFlow();
                                return;
                            }

                            // デスクトップ：従来通り AppBridge 経由で Flow 表示
                            if (window.AppBridge && window.AppBridge.openFlowTab) {
                                window.AppBridge.openFlowTab();
                            } else if (window.AppBridge && window.AppBridge.activateFlowCompare) {
                                window.AppBridge.activateFlowCompare().then(function() {
                                    _scrollToOnboardingVerse();
                                    _state.achievedFirstFlow = true;
                                    _saveState();
                                    setTimeout(function() { _goToStep(OB_STEP.FLOW); }, 800);
                                });
                            } else {
                                _state.achievedFirstFlow = true;
                                _saveState();
                                _goToStep(OB_STEP.FLOW);
                            }
                        }, 600);
                    });
            }, 380);
        }, 150);
    }

    // STEP5 (GAR17_CLICKED) は STEP4 に統合済み。_goToStep での互換のため空関数を残す。
    function _renderGar17ClickedStep() {}

    // モバイルで compare-mode の右列を強制表示（JOH onboarding 用。ROM Flow では使用しない）
    function _forceShowCompareOnMobile() {
        if (document.getElementById('ob-mobile-compare-override')) return;
        var style = document.createElement('style');
        style.id = 'ob-mobile-compare-override';
        style.textContent = [
            '#main-reading-area.compare-mode {',
            '    grid-template-columns: 1fr 1fr !important;',
            '}',
            '#main-reading-area.compare-mode #parallel-text-area,',
            '#main-reading-area.compare-mode .verse-pair-right,',
            '#main-reading-area.compare-mode .verse-grid-spacer-right,',
            '#main-reading-area.compare-mode .verse-grid-footer-right {',
            '    display: block !important;',
            '}',
        ].join('\n');
        document.head.appendChild(style);
    }

    function _clearMobileCompareOverride() {
        var el = document.getElementById('ob-mobile-compare-override');
        if (el) el.remove();
    }

    // Rev.8: モバイルで Study Panel を閉じ、AppBridge.openFlowTab() で読解フロー画面へ切り替える。
    // ① AppBridge.closeStudyPanel() でパネルを閉じる（#app.mobile-study-open を除去）。
    // ② #app.mobile-study-open クラスの消滅を待って AppBridge.openFlowTab() を呼ぶ。
    //    openFlowTab() が transA='FLOW' に切り替えて再描画し、onFlowTabOpened() を呼ぶ。
    //    onFlowTabOpened() → _goToStep(OB_STEP.FLOW) → _renderFlowStep() でチップがパルスする。
    // ③ history.back() は URL 遷移でオンボーディング状態が壊れるため使わない。
    function _closeMobileStudyPanelAndGoFlow() {
        _state.achievedFirstFlow = true;
        _saveState();

        // ── パネルを閉じる ───────────────────────────────────────
        if (window.AppBridge && window.AppBridge.closeStudyPanel) {
            window.AppBridge.closeStudyPanel();
        } else {
            var backBtn = _findStudyPanelBackButton();
            if (backBtn) backBtn.click();
            // history.back() は使わない
        }

        // ── パネル閉鎖を待って読解フロー画面へ切り替え ──────────
        // モバイルパネルの開閉は #app.mobile-study-open クラスで管理されている。
        var waitAttempt = 0;
        function _waitClosed() {
            var appEl     = document.getElementById('app');
            var panelOpen = appEl && appEl.classList.contains('mobile-study-open');

            if (!panelOpen || waitAttempt >= 30) {
                setTimeout(function() {
                    if (window.AppBridge && window.AppBridge.openFlowTab) {
                        // openFlowTab() 内で onFlowTabOpened() が呼ばれ _goToStep(FLOW) へ進む
                        window.AppBridge.openFlowTab();
                    } else {
                        _scrollToOnboardingVerse();
                        setTimeout(function() { _goToStep(OB_STEP.FLOW); }, 200);
                    }
                }, 150);
                return;
            }
            waitAttempt++;
            setTimeout(_waitClosed, 100);
        }
        setTimeout(_waitClosed, 200);
    }

    // Study Panel のヘッダーにある「戻る」ボタンを探す
    // 画像のヘッダー：「< ローマ 1章」テキストを持つリンク
    function _findStudyPanelBackButton() {
        // よく使われるクラス名で探す
        var direct =
            document.querySelector('.study-panel-back') ||
            document.querySelector('[data-action="close-study"]') ||
            document.querySelector('[data-action="back"]') ||
            document.querySelector('.panel-back') ||
            document.querySelector('.back-to-chapter');
        if (direct) return direct;

        // ヘッダー内の全リンク・ボタンを走査してテキストで判定
        var candidates = document.querySelectorAll('a, button');
        for (var i = 0; i < candidates.length; i++) {
            var el = candidates[i];
            var t  = (el.textContent || '').trim();
            // 「< ローマ 1章」「‹ 1章」「← 」「戻る」に一致
            if (t.indexOf('章') !== -1          // 章
             || t.indexOf('ローマ') !== -1  // ローマ
             || t.indexOf('戻る') !== -1    // 戻る
             || t === '<'
             || t === '‹'                      // ‹
             || t === '←') {                   // ←
                return el;
            }
        }
        return null;
    }

    // STEP6: Flow表示
    // Rev.6: モバイル単独表示対応。γάρチップが見つかるまで最大2秒リトライ。
    function _renderFlowStep() {
        var loadingEl = _showFlowLoadingIndicator();

        // γάρチップが DOM に描画されるまで待機（最大 2000ms / 200ms 間隔）
        var attempt = 0;
        function _tryAttach() {
            var chips = _findGarChipsInFlow();
            if (chips.length > 0 || attempt >= 10) {
                if (loadingEl) { loadingEl.remove(); loadingEl = null; }
                _pulseGarInFlow();
                _renderOnboardingCard({
                    title: 'γάρ（なぜなら）は理由を示す語です',
                    body:  '光っている語をもう一度押してみてください'
                });
                _attachFlowGarClickHandler();
            } else {
                attempt++;
                setTimeout(_tryAttach, 200);
            }
        }
        setTimeout(_tryAttach, 400);
    }

    // Flow表示内の γάρ チップを探して返す（_pulseGarInFlow / _attachFlowGarClickHandler 共通）
    // Rev.6: セレクタを拡張。#word-list-view, .wlv-flow-stream, .word-list-view, .flow-view
    //        いずれも対象とし、さらにフォールバックで verse-pair-right も探す。
    // γάρ（なぜなら）チップを Flow 表示から探す
    // Rev.7: 章ビューの「原語の順序」チップは data-greek が空で英語テキストのみ。
    //        以下の優先順位で探す：
    //        1) data-greek / title / data-lemma に γάρ
    //        2) data-strongs = G1063
    //        3) 16節・17節ブロックの先頭チップ（γάρは ROM 1:16-17 の文頭に来る）
    function _findGarChipsInFlow() {
        var found = [];

        function _isGarGreek(str) {
            var s = (str || '').normalize('NFC').trim();
            return s === 'γάρ' || s === 'γὰρ' || s === 'γαρ';
        }

        // ── 1) data-greek / title / data-lemma で探す ──
        var allChips = document.querySelectorAll('.wlv-chip, .wlv-flow-chip, [data-greek], [data-lemma]');
        allChips.forEach(function(chip) {
            var greek   = (chip.dataset && chip.dataset.greek)  || chip.getAttribute('title') || '';
            var lemma   = (chip.dataset && chip.dataset.lemma)  || '';
            var strongs = (chip.dataset && chip.dataset.strongs) || chip.getAttribute('data-strongs') || '';
            if (_isGarGreek(greek) || _isGarGreek(lemma) || strongs === 'G1063' || strongs === '1063') {
                if (found.indexOf(chip) === -1) found.push(chip);
            }
        });

        // ── 2) 節ブロックの先頭チップ方式（data-* なし環境向け） ──
        // ROM 1:16–17 では γάρ が節の先頭（1語目）に来る。
        // 節ブロック（.verse-block, .verse-pair-left）の v-num で 16・17 を特定し、
        // その中の最初の .wlv-chip を γάρ 候補とする。
        if (found.length === 0) {
            ['16', '17'].forEach(function(vn) {
                // 章ビュー：.verse-block / .verse-pair-left
                var blocks = document.querySelectorAll('.verse-block, .verse-pair-left');
                for (var i = 0; i < blocks.length; i++) {
                    var vEl = blocks[i].querySelector('.v-num');
                    if (vEl && vEl.textContent.trim() === vn) {
                        var chips = blocks[i].querySelectorAll('.wlv-chip, .wlv-flow-chip');
                        if (chips.length > 0) {
                            // γάρ は先頭チップ（ROM 1:16-17 の構造上）
                            if (found.indexOf(chips[0]) === -1) found.push(chips[0]);
                        }
                        break;
                    }
                }
                // デスクトップ：verse-pair-right
                var rightBlock = document.querySelector('.verse-pair-right[data-vnum="' + vn + '"]');
                if (rightBlock) {
                    rightBlock.querySelectorAll('.wlv-chip, .wlv-flow-chip').forEach(function(chip) {
                        var greek = (chip.title || (chip.dataset && chip.dataset.greek) || '').trim();
                        if (_isGarGreek(greek)) {
                            if (found.indexOf(chip) === -1) found.push(chip);
                        }
                    });
                }
            });
        }

        return found;
    }
    
    // Flow内のγάρチップにクリックハンドラを付ける
    // Rev.6: _findGarChipsInFlow() に統一。
    function _attachFlowGarClickHandler() {
        var found = _findGarChipsInFlow();

        if (found.length === 0) {
            setTimeout(function() {
                if (_state.currentStep === OB_STEP.FLOW) {
                    _showFlowCompletionCard();
                }
            }, 5000);
            return;
        }
    
        found.forEach(function(chip) {
            chip.style.cursor = 'pointer';
            chip.setAttribute('data-ob-flow-gar', 'true');
            function _onFlowGarClick() {
                if (_state.currentStep !== OB_STEP.FLOW) return;
                chip.removeEventListener('click', _onFlowGarClick);
                _cancelPulse();
                _hideOnboardingCard();
    
                chip.style.transition = 'background 0.3s ease, box-shadow 0.3s ease';
                chip.style.background = 'rgba(90,110,130,0.22)';
                chip.style.boxShadow  = '0 0 0 4px rgba(90,110,130,0.22)';
                setTimeout(function() {
                    chip.style.background = '';
                    chip.style.boxShadow  = '';
                }, 1200);
    
                setTimeout(function() {
                    _showFlowCompletionCard();
                }, 900);
            }
            chip.addEventListener('click', _onFlowGarClick);
        });
    }
    
    // Flow完了カード（γάρ再押し後に表示）
    // Rev.5: STEP7 — カード文言更新
    function _showFlowCompletionCard() {
        _renderOnboardingCard({
            title: 'Flowでは単語同士のつながりを追えます',
            body:  'ヨハネ3:16でも、同じように読めます',
            actions: `
                <button id="ob-read-btn" class="ob-btn ob-btn--primary">
                    読み続ける
                </button>
                <button id="ob-read-jhn-btn" class="ob-text-btn">
                    ヨハネ3:16でも見てみる
                </button>
            `
        });

        document.getElementById('ob-read-btn')
            ?.addEventListener('click', function() {
                _state.currentStep = OB_STEP.FINAL_COMPLETE;
                _state.onboardingComplete = true;
                _saveState();
                _clearMobileCompareOverride();
                _hideOnboardingCard();
            });

        document.getElementById('ob-read-jhn-btn')
            ?.addEventListener('click', function() {
                _clearMobileCompareOverride();
                _state.currentStep = OB_STEP.JOHN316_READING;
                _saveState();
                _hideOnboardingCard();
                setTimeout(function() { _obNavigateToJhn316(); }, 800);
            });
    }
    
    // 非同期待機の可視化
    function _showFlowLoadingIndicator() {
        var el = document.createElement('div');
        el.id = 'ob-flow-loading';
        el.style.cssText = [
            'position:fixed',
            'bottom:calc(env(safe-area-inset-bottom,16px) + 88px)',
            'left:50%',
            'transform:translateX(-50%)',
            'z-index:9100',
            'pointer-events:none',
            'font-family:\'Noto Serif JP\',\'Georgia\',serif',
            'font-size:0.72rem',
            'color:rgba(29,29,31,0.38)',
            'letter-spacing:0.04em',
            'opacity:0',
            'transition:opacity 0.3s ease',
        ].join(';');
        el.textContent = '…';
        document.body.appendChild(el);
        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
        }); });
        return el;
    }
    
    // Flow表示前に16節（アンカー節）を画面中央へスクロール
    function _scrollToOnboardingVerse() {
        // data-vnum は存在しない。.v-num テキストで節ブロックを特定する。
        var target = null;
        var blocks = document.querySelectorAll('.verse-pair-left, .verse-block');
        for (var i = 0; i < blocks.length; i++) {
            var vEl = blocks[i].querySelector('.v-num');
            if (vEl && vEl.textContent.trim() === '16') {
                target = blocks[i];
                break;
            }
        }
        if (!target) target = document.querySelector('[data-onboarding-anchor="true"]');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // JHN 3:16 の左右ブロックを画面中央へスクロールし、一時的にハイライトする
    function _scrollAndHighlightVerse16() {
        // 左列：.verse-pair-left 内の .v-num === '16'
        var leftBlock = null;
        var lefts = document.querySelectorAll('.verse-pair-left, .verse-block');
        for (var i = 0; i < lefts.length; i++) {
            var vEl = lefts[i].querySelector('.v-num');
            if (vEl && vEl.textContent.trim() === '16') { leftBlock = lefts[i]; break; }
        }
        // 右列：.verse-pair-right[data-vnum="16"]
        var rightBlock = document.querySelector('.verse-pair-right[data-vnum="16"]');

        var target = leftBlock || rightBlock;
        if (!target) return;

        target.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 読み取りフェーズ完了後に書き込み（rAF）
        requestAnimationFrame(function() {
            var toHL = [];
            if (leftBlock)  toHL.push(leftBlock);
            if (rightBlock) toHL.push(rightBlock);
            toHL.forEach(function(el) {
                el.style.transition  = 'background 0.4s ease, box-shadow 0.4s ease';
                el.style.background  = 'rgba(90,110,130,0.10)';
                el.style.boxShadow   = 'inset 0 0 0 1.5px rgba(90,110,130,0.25)';
                el.style.borderRadius = '6px';
            });
            setTimeout(function() {
                toHL.forEach(function(el) {
                    el.style.background = '';
                    el.style.boxShadow  = '';
                });
            }, 2500);
        });
    }
    
    // Flow表示内の γάρ チップをパルスさせる
    // Rev.6: _findGarChipsInFlow() に統一。
    function _pulseGarInFlow() {
        var chips = _findGarChipsInFlow();
        chips.forEach(function(chip) {
            chip.classList.add('ob-pulse');
            // Rev.9: 4秒タイムアウト廃止 → _cancelPulse() が呼ばれるまで光り続ける
            _pulseEl = chip;
        });
    }

    // Flow表示の下部に1行ヒント
    function _showHintBelowFlow(text) {
        var el = document.createElement('div');
        el.id = 'ob-flow-hint-line';
        el.style.cssText = [
            'position:fixed',
            'bottom:32px',
            'left:50%',
            'transform:translateX(-50%)',
            'z-index:9100',
            'font-family:\'Noto Serif JP\',\'Georgia\',serif',
            'font-size:0.78rem',
            'color:rgba(29,29,31,0.55)',
            'letter-spacing:0.02em',
            'pointer-events:none',
            'opacity:0',
            'transition:opacity 0.6s ease',
        ].join(';');
        el.textContent = text;
        document.body.appendChild(el);
        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
        }); });
    }

    function _clearHintBelowFlow() {
        var el = document.getElementById('ob-flow-hint-line');
        if (el) {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 600);
        }
    }

    /* ── JOH 3:16 onboarding ヘルパー ──────────────────
       既存関数を流用し、JOH固有のロジックのみ追加する。
    ─────────────────────────────────────────────── */

    // οὕτως を探してパルスを付ける（DOM未準備なら最大10回リトライ）
    function _waitForHoutosAndPulse(attempt) {
        var el = _findHoutosEl();
        if (el) {
            _attachPulseToHoutos(el);
            return;
        }
        if (attempt >= 25) {
            console.warn('[Onboarding] οὕτως not found after 25 attempts (5s)');
            return;
        }
        setTimeout(function() {
            _waitForHoutosAndPulse(attempt + 1);
        }, 200);
    }

    function _findHoutosEl() {
        var all = document.querySelectorAll('.word-card, .wlv-chip, [data-greek]');
        for (var i = 0; i < all.length; i++) {
            var g = (all[i].dataset && all[i].dataset.greek) || all[i].title || '';
            // NFC正規化 + 大文字対応（文頭では Οὕτως になる）
            var gNorm = g.normalize ? g.normalize('NFC') : g;
            if (gNorm === 'οὕτως' || gNorm === 'Οὕτως'
             || gNorm === 'οὑτως'  || gNorm === 'Οὑτως') {
                return all[i];
            }
        }
        console.warn('[Onboarding] οὕτως chip not found after scanning', all.length, 'elements');
        return null;
    }

    function _attachPulseToHoutos(houtosEl) {
        document.querySelectorAll('[data-onboarding-anchor="true"]').forEach(function(el) {
            el.removeAttribute('data-onboarding-anchor');
        });
        houtosEl.setAttribute('data-onboarding-anchor', 'true');

        _pulseEl = houtosEl;
        houtosEl.classList.add('ob-pulse');
    }

    // JHN 3:16節を自動クリックして Study Panel を開く
    // JOHN316_READING タイマー後に呼ばれる。ユーザー操作不要。
    function _obOpenVerse16ForJoh() {
        // verse-pair-left または verse-block で v-num=16 を探す
        var blocks = document.querySelectorAll('.verse-pair-left, .verse-block');
        var block16 = null;
        for (var i = 0; i < blocks.length; i++) {
            var vEl = blocks[i].querySelector('.v-num');
            if (vEl && vEl.textContent.trim() === '16') {
                block16 = blocks[i];
                break;
            }
        }

        if (block16) {
            // 16節を画面中央へスクロール後にクリック
            // onStudyPanelOpened(num===16) が JOHN316_HOUTOS への遷移を担う
            block16.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(function() { block16.click(); }, 400);
        } else {
            // ブロックが見つからない場合は直接 HOUTOS へ（pulse は DOM待機でリトライ）
            console.warn('[Onboarding] JHN 3:16 block not found → fallback to HOUTOS step');
            _hideOnboardingCard();
            _goToStep(OB_STEP.JOHN316_HOUTOS);
        }
    }

    // JHN 3章へ遷移（現在の transA を保持）
    function _obNavigateToJhn316() {
        var p = new URLSearchParams(window.location.search);
        p.set('book', 'JHN');
        p.set('ch', '3');
        p.set('mode', 'single');
        // transA はそのまま引き継ぐ（上書きしない）
        window.location.href = '?' + p.toString();
    }

    // compare modeを有効化するブリッジ（AppBridge経由。let変数に直接アクセスしない）
    function _obActivateCompare(cb) {
        if (window.AppBridge && window.AppBridge.activateCompare) {
            window.AppBridge.activateCompare('BUN').then(function() {
                if (cb) cb();
            }).catch(function() {
                if (cb) cb();
            });
        } else {
            // fallback: URL書き換えでリロード（activateCompareがない古いindex.htmlの場合）
            var p = new URLSearchParams(window.location.search);
            p.set('transB', 'BUN');
            p.set('mode', 'compare');
            _state.currentStep = OB_STEP.JOHN316_COMPARE;
            _saveState();
            window.location.href = '?' + p.toString();
        }
    }

    function _renderCompleteStep() {
    }

    /* ── JOH 3:16 onboarding Step Renderers ────────────
       ROM onboarding の後ろへ追加。既存STEPは変更なし。
    ─────────────────────────────────────────────── */

    // JOH-1: 読む時間
    // 6秒タイマー → 削除。カードにスキップボタンと「開く」ボタンを追加。
    // JHNフェーズは任意継続扱い（初回完了条件から外す）。
    function _renderJohn316ReadingStep() {
        _state.john316ReadingSeen = true;
        _saveState();

        _renderOnboardingCard({
            title: 'ヨハネ3:16を、原語の流れで読んでみましょう',
            body:  '知っている節が、また違って見えます',
            actions: `
                <button id="ob-jhn-open-btn" class="ob-btn">
                    3:16節を開く
                </button>
                <button id="ob-jhn-reading-skip-btn" class="ob-text-btn">
                    今はやめておく
                </button>
            `
        });

        document.getElementById('ob-jhn-open-btn')
            ?.addEventListener('click', function() {
                _hideOnboardingCard();
                setTimeout(function() { _obOpenVerse16ForJoh(); }, 300);
            });

        document.getElementById('ob-jhn-reading-skip-btn')
            ?.addEventListener('click', function() {
                _state.currentStep = OB_STEP.FINAL_COMPLETE;
                _state.onboardingComplete = true;
                _saveState();
                _hideOnboardingCard();
            });

        // 自動進行タイマーは使わない（TASK 7 — 無音待機禁止）
        // _readingStepTimer は null のまま
    }

    // JOH-2: οὕτως にpulse・カード表示
    function _renderJohn316HoutosStep() {
        // onStudyPanelOpened → ここに来る時点で Study Panel は開いている。
        // 描画完了を少し待ってから pulse を付ける。
        setTimeout(function() {
            _waitForHoutosAndPulse(0);
        }, 300);

        // οὕτως 要素が DOM に確定するのを待ってからスクロール→カード配置
        setTimeout(function() {
            var anchorEl = document.querySelector('[data-onboarding-anchor="true"]');
            if (anchorEl) _scrollAnchorToViewport(anchorEl, 0.30);

            setTimeout(function() {
                var anchorEl = document.querySelector('[data-onboarding-anchor="true"]');
                _renderOnboardingCard({
                    title: 'ここでも別の語が光っています',
                    body:  '押してみてください',
                    anchorEl: anchorEl,
                });
            }, 380);
        }, 400);
    }

    // JOH-3: οὕτως押下後 → onboarding prose + compare CTA
    function _renderJohn316WordClickedStep() {
        _renderOnboardingCard({
            title: '「このように」が、後ろへ続いています',
            body:  '愛されたことの内容が、その後に続けて記されています。',
            actions: `
                <button id="ob-jhn-compare-btn" class="ob-btn">
                    訳の違いを見てみる
                </button>
                <button id="ob-jhn-skip-compare-btn" class="ob-text-btn">
                    このまま読む
                </button>
            `
        });

        document.getElementById('ob-jhn-compare-btn')
            ?.addEventListener('click', function() {
                _hideOnboardingCard();
                _state.john316CompareSeen = true;
                _saveState();
                setTimeout(function() {
                    _goToStep(OB_STEP.JOHN316_COMPARE);
                }, 300);
            });

        document.getElementById('ob-jhn-skip-compare-btn')
            ?.addEventListener('click', function() {
                _hideOnboardingCard();
                _goToStep(OB_STEP.FINAL_COMPLETE);
            });
    }

    // JOH-4: compare補助（既存 compare mode を使うだけ。compare UI改造禁止）
    function _renderJohn316CompareStep() {
        _obActivateCompare(function() {
            // compare描画完了後に16節へスクロール＋ハイライト
            setTimeout(function() { _scrollAndHighlightVerse16(); }, 400);
            setTimeout(function() {
                _renderOnboardingCard({
                    title: '訳ごとの違いも見えてきます',
                    body:  '原語を見ると、どこを重視して訳しているか追いやすくなります',
                    actions: `
                        <button id="ob-jhn-flow-btn" class="ob-btn">
                            文の流れも見てみる
                        </button>
                        <button id="ob-jhn-done-btn" class="ob-text-btn">
                            読み続ける
                        </button>
                    `
                });

                document.getElementById('ob-jhn-flow-btn')
                    ?.addEventListener('click', function() {
                        _hideOnboardingCard();
                        _state.john316FlowSeen = true;
                        _saveState();
                        setTimeout(function() {
                            _goToStep(OB_STEP.JOHN316_FLOW);
                        }, 300);
                    });

                document.getElementById('ob-jhn-done-btn')
                    ?.addEventListener('click', function() {
                        _hideOnboardingCard();
                        _goToStep(OB_STEP.FINAL_COMPLETE);
                    });
            }, 800);
        });
    }

    // JOH-5: Flow（ROM FLOWと役割分離。愛→御子→信じる者→命の展開）
    function _renderJohn316FlowStep() {
        if (!window.AppBridge || !window.AppBridge.activateFlowCompare) {
            // bridgeなければ即完了へ
            _goToStep(OB_STEP.FINAL_COMPLETE);
            return;
        }

        _forceShowCompareOnMobile();

        window.AppBridge.activateFlowCompare().then(function() {
            // Flow描画完了後に16節へスクロール＋ハイライト
            setTimeout(function() { _scrollAndHighlightVerse16(); }, 400);
            // Flow描画完了を待ってからカードを出す
            setTimeout(function() {
                _renderOnboardingCard({
                    title: '原語の語順で、流れを見てみましょう',
                    body:  '語が、どのようにつながっているか追ってみてください。',
                    actions: `
                        <button id="ob-jhn-final-btn" class="ob-btn">
                            わかった
                        </button>
                    `
                });

                document.getElementById('ob-jhn-final-btn')
                    ?.addEventListener('click', function() {
                        _hideOnboardingCard();
                        _goToStep(OB_STEP.FINAL_COMPLETE);
                    });
            }, 900);
        });
    }

    // FINAL_COMPLETE: 全onboarding完了
    function _renderFinalCompleteStep() {
        _state.onboardingComplete = true;
        _saveState();
        _clearMobileCompareOverride();

        _renderOnboardingCard({
            title: '今日見えたつながりが、これからも読むたびに増えていきます',
            body:  '',
            actions: `
                <button id="ob-final-close-btn" class="ob-btn">
                    読み続ける
                </button>
            `
        });

        document.getElementById('ob-final-close-btn')
            ?.addEventListener('click', function() {
                _hideOnboardingCard();
            });
    }

    /* ── Tiny Hint（ダークトースト統一） ─────────────── */
    function _showHint(message, opts) {
        opts = opts || {};
        if (opts.id && _currentHintId === opts.id) return;
        _currentHintId = opts.id || null;
        _clearHint();
        const el = document.createElement('div');
        el.className = 'ob-hint';
        if (opts.cssClass) el.classList.add(opts.cssClass);
        el.style.pointerEvents = 'none';
        el.textContent = message;

        const position = opts.position || 'bottom-center';
        if (position === 'bottom-center') {
            el.classList.add('ob-hint--bottom-center');
            el.style.bottom = 'calc(88px + env(safe-area-inset-bottom, 0px))';
        } else if (position === 'near-element' && opts.anchorEl) {
            /* anchorEl の rect を DOM 追加前に読む（forced reflow 防止） */
            _positionNearElement(el, opts.anchorEl);
        }

        document.body.appendChild(el);
        _activeHintEl = el;

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.classList.add('ob-hint--visible');
        }); });

        const duration = (opts.duration !== undefined) ? opts.duration : HINT_AUTO_DISMISS_MS;
        if (duration > 0) {
            _hintTimer = setTimeout(function() { _dismissHint(el); }, duration);
        }
    }

    function _positionNearElement(hintEl, anchorEl) {
        /* ── 読み取りフェーズ（すべてまとめて実行） ── */
        const rect   = anchorEl.getBoundingClientRect();
        const vw     = window.innerWidth;
        const vh     = window.innerHeight;
        const hintW  = Math.min(240, vw * 0.82);
        const margin = 14;
        /* --sab は変わらないのでキャッシュ済み値を使う（getComputedStyle は呼ばない） */
        const safeB  = _positionNearElement._sabCache !== undefined
            ? _positionNearElement._sabCache
            : (_positionNearElement._sabCache =
                parseInt(getComputedStyle(document.documentElement)
                    .getPropertyValue('--sab') || '0', 10) || 0);
        const viewH  = vh - safeB;

        /* ── 計算フェーズ ── */
        let left = rect.right + margin + 6;
        let top  = rect.top - 4;
        if (left + hintW > vw - margin) { left = rect.left - hintW - margin - 6; }
        if (left < margin) {
            left = Math.max(margin, (vw - hintW) / 2);
            top  = rect.bottom + margin;
        }
        const hintH = 70;
        if (top + hintH > viewH - margin) { top = rect.top - hintH - margin; }
        if (top < margin) top = margin;

        /* ── 書き込みフェーズ（読み取り後にまとめて実行） ── */
        hintEl.style.left     = left  + 'px';
        hintEl.style.top      = top   + 'px';
        hintEl.style.maxWidth = hintW + 'px';
    }

    function _cancelPulse() {
        if (_pulseEl) {
            _pulseEl.classList.remove('ob-pulse');
            if (_pulseEl.getAttribute('data-ob-affordance') === 'true') {
                _pulseEl.style.background = '';
                _pulseEl.removeAttribute('data-ob-affordance');
            }
            _pulseEl = null;
        }
        // Rev.9: _pulseGarInFlow が複数チップに ob-pulse を付けるため全消し
        document.querySelectorAll('.ob-pulse').forEach(function(el) {
            el.classList.remove('ob-pulse');
        });
        _hideFocusOverlay();
    }

    /* ── フォーカスオーバーレイ ─────────────────────────
       アンカー語の位置にカットアウトを置き、
       それ以外の操作を視覚・インタラクション両面で封じる。
    ─────────────────────────────────────────────── */
var _focusReposition = null;

    function _showFocusOverlay(anchorEl) {
        _hideFocusOverlay();

        /* アンカー語矩形（パディング付き）を計算 */
        var pad = 6;
        function _getRects() {
            var r = anchorEl.getBoundingClientRect();
            return {
                top:    r.top    - pad,
                left:   r.left   - pad,
                right:  r.right  + pad,
                bottom: r.bottom + pad,
                w:      r.width  + pad * 2,
                h:      r.height + pad * 2,
            };
        }

        /* 4分割パネルを生成 */
        var ids = ['ob-fp-top','ob-fp-bottom','ob-fp-left','ob-fp-right'];
        ids.forEach(function(id) {
            var el = document.createElement('div');
            el.id = id;
            el.className = 'ob-focus-panel';
            document.body.appendChild(el);
        });

        /* アンカー輪郭リング */
        var ring = document.createElement('div');
        ring.id = 'ob-focus-ring';
        ring.className = 'ob-focus-ring';
        document.body.appendChild(ring);

        function _setPos(el, styles) {
            var props = ['top','bottom','left','right','width','height'];
            props.forEach(function(p) { el.style[p] = ''; });
            Object.keys(styles).forEach(function(p) { el.style[p] = styles[p]; });
        }

        function _position() {
            /* ── 読み取りフェーズ（reflow は1回のみ） ── */
            var rc = _getRects();
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var topEl  = document.getElementById('ob-fp-top');
            var botEl  = document.getElementById('ob-fp-bottom');
            var lftEl  = document.getElementById('ob-fp-left');
            var rgtEl  = document.getElementById('ob-fp-right');

            /* ── 書き込みフェーズ（読み取り後にまとめて実行） ── */
            if (topEl) _setPos(topEl, { top:'0', left:'0', right:'0', height: Math.max(0, rc.top) + 'px' });
            if (botEl) _setPos(botEl, { top: Math.min(vh, rc.bottom) + 'px', left:'0', right:'0', bottom:'0' });
            if (lftEl) _setPos(lftEl, { top: Math.max(0, rc.top) + 'px', left:'0', width: Math.max(0, rc.left) + 'px', height: rc.h + 'px' });
            if (rgtEl) _setPos(rgtEl, { top: Math.max(0, rc.top) + 'px', left: Math.min(vw, rc.right) + 'px', right:'0', height: rc.h + 'px' });
            _setPos(ring, { left: rc.left + 'px', top: rc.top + 'px', width: rc.w + 'px', height: rc.h + 'px' });
        }

        _position();
        _focusReposition = _position;
        window.addEventListener('scroll', _position, { passive: true });
        window.addEventListener('resize', _position, { passive: true });
    }

    function _hideFocusOverlay() {
        ['ob-fp-top','ob-fp-bottom','ob-fp-left','ob-fp-right','ob-focus-ring'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) {
                el.style.opacity = '0';
                setTimeout(function() { el.remove(); }, 380);
            }
        });
        if (_focusReposition) {
            window.removeEventListener('scroll', _focusReposition);
            window.removeEventListener('resize', _focusReposition);
            _focusReposition = null;
        }
    }

    function _dismissHint(el) {
        if (!el || !el.parentNode) return;
        el.classList.remove('ob-hint--visible');
        el.classList.add('ob-hint--fade');
        setTimeout(function() { el.remove(); }, 600);
        if (_activeHintEl === el) _activeHintEl = null;
    }

    function _clearHint() {
        clearTimeout(_hintTimer);
        if (_activeHintEl) { _dismissHint(_activeHintEl); _activeHintEl = null; }
        _currentHintId = null;
    }

    /* ── モバイルヒント ───────────────────────────────── */
    function _showMobileHint(message) {
        const existing = document.querySelector('.ob-mobile-hint');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.className = 'ob-mobile-hint';
        el.textContent = message;
        document.body.appendChild(el);
        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.classList.add('ob-mobile-hint--visible');
        }); });
        setTimeout(function() {
            el.classList.remove('ob-mobile-hint--visible');
            setTimeout(function() { el.remove(); }, 500);
        }, 3800);
    }

    /* ── Flow ヒント ──────────────────────────────────── */
    function _showFlowHint() {
        const wrap = document.getElementById('reading-notes-wrap');
        if (!wrap) return;
        const old = wrap.querySelector('.ob-flow-hint');
        if (old) old.remove();
        const el = document.createElement('div');
        el.className = 'ob-flow-hint';
        // 短文化：「見るだけでいい」を前面に。初学者への敷居を下げる。
        el.innerHTML =
            '<span class="ob-flow-hint-icon">↓</span>' +
            '<span>文が、つながって流れています。原文では「だから」「なぜなら」などで話がつながりながら進みます。他の接続も押してみてください。</span>';
        wrap.insertBefore(el, wrap.firstChild);
        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.classList.add('ob-flow-hint--visible');
        }); });
        setTimeout(function() {
            el.style.transition = 'opacity 1.2s ease';
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 1300);
        }, 10000);
    }

    /* ── 2回目訪問ナッジ ─────────────────────────────────
       初回OB完了後、2回目訪問でFlow体験へ静かに誘う。
    ─────────────────────────────────────────────── */
    function _showReturnNudge() {
        if (_state.returnNudgeSeen) return;
        if (document.getElementById('ob-return-nudge')) return;

        _state.returnNudgeSeen = true;
        _saveState();

        const isMobile = window.innerWidth <= 900;
        const el = document.createElement('div');
        el.id = 'ob-return-nudge';
        el.style.cssText = [
            'position: fixed',
            isMobile ? 'bottom: calc(env(safe-area-inset-bottom, 16px) + 80px)' : 'bottom: 100px',
            'left: 50%',
            'transform: translateX(-50%) translateY(8px)',
            'z-index: 9200',
            'background: rgba(255,255,255,0.99)',
            'border: 1px solid rgba(90,110,130,0.20)',
            'border-radius: 18px',
            'box-shadow: 0 8px 32px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.06)',
            'backdrop-filter: blur(14px)',
            '-webkit-backdrop-filter: blur(14px)',
            'padding: 20px 24px',
            'max-width: min(320px, 90vw)',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'opacity: 0',
            'transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');

        const body = document.createElement('div');
        body.style.cssText = [
            'font-size: 0.82rem',
            'line-height: 1.85',
            'color: rgba(29,29,31,0.78)',
            'letter-spacing: 0.01em',
            'margin-bottom: 16px',
        ].join(';');
        body.textContent = '前回は語を押しました。今日は、語順の流れを見てみましょう。';
        el.appendChild(body);

        const hasFlowTab = !!document.getElementById('gf-tab-flow');

        if (hasFlowTab) {
            const flowBtn = document.createElement('button');
            flowBtn.style.cssText = [
                'width: 100%',
                'min-height: 44px',
                'background: rgba(90,110,130,0.11)',
                'border: 1.5px solid rgba(90,110,130,0.38)',
                'border-radius: 10px',
                'font-family: \'Noto Serif JP\', \'Georgia\', serif',
                'font-size: 0.82rem',
                'font-weight: 700',
                'color: rgba(29,29,31,0.88)',
                'cursor: pointer',
                'letter-spacing: 0.02em',
                '-webkit-tap-highlight-color: transparent',
                'touch-action: manipulation',
                'margin-bottom: 8px',
            ].join(';');
            flowBtn.textContent = 'Flowを見る　→';
            flowBtn.addEventListener('click', function() {
                el.style.opacity = '0';
                setTimeout(function() {
                    el.remove();
                    var tabFlow = document.getElementById('gf-tab-flow');
                    if (tabFlow) { tabFlow.click(); }
                }, 350);
            });
            el.appendChild(flowBtn);
        }

        const dismiss = document.createElement('div');
        dismiss.style.cssText = [
            'font-size: 0.68rem',
            'color: rgba(29,29,31,0.30)',
            'cursor: pointer',
            'text-align: center',
            'letter-spacing: 0.01em',
            '-webkit-tap-highlight-color: transparent',
            'min-height: 36px',
            'line-height: 36px',
            'touch-action: manipulation',
        ].join(';');
        dismiss.textContent = 'あとで見る';
        dismiss.addEventListener('click', function() {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 400);
        });
        el.appendChild(dismiss);
        document.body.appendChild(el);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        }); });
    }

    // 3回目以降・Flow初体験後の最小限トースト
    function _showReturnToast(message) {
        if (document.getElementById('ob-return-toast')) return;
        const el = document.createElement('div');
        el.id = 'ob-return-toast';
        el.style.cssText = [
            'position: fixed',
            'bottom: calc(env(safe-area-inset-bottom, 16px) + 76px)',
            'left: 50%',
            'transform: translateX(-50%) translateY(6px)',
            'z-index: 9050',
            'pointer-events: none',
            'background: rgba(29,29,31,0.72)',
            'border-radius: 20px',
            'padding: 7px 18px',
            'max-width: min(260px, 86vw)',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.76rem',
            'font-weight: 500',
            'color: rgba(255,255,255,0.88)',
            'letter-spacing: 0.01em',
            'text-align: center',
            'opacity: 0',
            'transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');
        el.textContent = message;
        document.body.appendChild(el);
        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        }); });
        setTimeout(function() {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 500);
        }, 5000);
    }

    /* ── 初回専用バナー（視線誘導：後方互換スタブ） ─── */
    function _showWelcomeBanner() {
        // カード方式へ移行済み。_goToStep(OB_STEP.WELCOME) を使用。
    }

    function _showWelcomeBannerFirstWord() {
        // カード方式へ移行済み。_goToStep(OB_STEP.WELCOME) を使用。
    }

    function _hideWelcomeBanner() {
        _hideOnboardingCard();
    }

    /* ── Level Card ────────────────────────────────── */
    function _showLevelPrompt() {
        _renderLevelCard();
    }

    function _renderLevelCard() {

        _renderOnboardingCard({
            title: 'ギリシャ語を学んだことがありますか？',

            body: '読む深さを調整します',

            actions: `
                <button id="ob-level-beginner" class="ob-btn">
                    はじめて
                </button>

                <button id="ob-level-exp" class="ob-btn">
                    少しあります
                </button>

                <button id="ob-level-skip" class="ob-text-btn">
                    あとで見る
                </button>
            `
        });

        document
            .getElementById('ob-level-beginner')
            ?.addEventListener('click', function() {

                _state.experiencedReader = false;
                _saveState();

                _hideOnboardingCard();
            });

        document
            .getElementById('ob-level-exp')
            ?.addEventListener('click', function() {

                _state.experiencedReader = true;
                _saveState();

                _hideOnboardingCard();
            });

        document
            .getElementById('ob-level-skip')
            ?.addEventListener('click', function() {

                _state.onboardingSkipped = true;
                _state.onboardingComplete = true;

                _saveState();

                _hideOnboardingCard();
            });
    }

    /* ── Purpose Card ──────────────────────────────── */
    function _showPurposePrompt() {
        _renderPurposeCard();
    }

    function _renderPurposeCard() {

        _renderOnboardingCard({
            title: 'どのように読みますか？',

            body: 'よく使う方向へ調整します',

            actions: `
                <button class="ob-purpose-btn ob-btn" data-purpose="personal">
                    個人で読む
                </button>

                <button class="ob-purpose-btn ob-btn" data-purpose="sermon">
                    礼拝・説教準備
                </button>

                <button class="ob-purpose-btn ob-btn" data-purpose="study">
                    原語を学ぶ
                </button>
            `
        });

        document
            .querySelectorAll('.ob-purpose-btn')
            .forEach(function(btn) {

                btn.addEventListener('click', function() {

                    _state.purpose = btn.dataset.purpose;
                    _saveState();

                    _hideOnboardingCard();
                });
            });
    }

    function _hidePurposePrompt() {
        _hideOnboardingCard();
    }

    /* ── 軽量達成表示 ─────────────────────────────────── */
    function _showAchievement(message) {
        if (document.getElementById('ob-achievement')) return;

        const el = document.createElement('div');
        el.id = 'ob-achievement';
        el.style.cssText = [
            'position: fixed',
            'top: 52px',
            'left: 50%',
            'transform: translateX(-50%) translateY(-4px)',
            'z-index: 9100',
            'pointer-events: none',
            'background: rgba(255,255,255,0.99)',
            'border: 1px solid rgba(90,110,130,0.30)',
            'border-left: 4px solid rgba(90,110,130,0.65)',
            'border-radius: 20px',
            'box-shadow: 0 4px 20px rgba(0,0,0,0.12)',
            'padding: 9px 22px',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.82rem',
            'font-weight: 600',
            'color: rgba(29,29,31,0.88)',
            'letter-spacing: 0.02em',
            'white-space: nowrap',
            'opacity: 0',
            'transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');
        el.textContent = message;
        document.body.appendChild(el);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity  = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        }); });

        setTimeout(function() {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(-3px)';
            setTimeout(function() { el.remove(); }, 500);
        }, 3200);
    }

    /* ── 中級者向け補助ヒント ─────────────────────────── */
    function _showExperiencedHint() {
        if (!_state.experiencedReader) return;
        _showHint('訳では見えない語順や省略が、ここで確認できます', {
            position: 'bottom-center',
            duration: 6000,
            id: 'experienced-welcome',
        });
    }

    /* ── 中級者向け：完了後の深い次行動案内 ──────────── */
    function _showExperiencedCompletionNudge() {
        if (!_state.experiencedReader) return;
        if (_activeHintEl) return;

        const el = document.createElement('div');
        el.id = 'ob-exp-completion-nudge';
        el.style.cssText = [
            'position: fixed',
            'bottom: 28px',
            'left: 50%',
            'transform: translateX(-50%) translateY(4px)',
            'z-index: 9000',
            'pointer-events: none',
            'background: rgba(255,255,255,0.98)',
            'border: 1px solid rgba(90,110,130,0.22)',
            'border-radius: 16px',
            'box-shadow: 0 4px 20px rgba(0,0,0,0.12)',
            'backdrop-filter: blur(10px)',
            '-webkit-backdrop-filter: blur(10px)',
            'padding: 11px 24px',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.80rem',
            'font-weight: 500',
            'color: rgba(29,29,31,0.80)',
            'letter-spacing: 0.02em',
            'text-align: center',
            'line-height: 1.65',
            'max-width: min(300px, 86vw)',
            'opacity: 0',
            'transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');

        const hasFlowTab = !!document.getElementById('gf-tab-flow');
        el.textContent = hasFlowTab
            ? '翻訳で消えた語順や強調は、右上の「読解フロー」タブで続けて見られます'
            : '他の節でも語を押すと、翻訳では見えていない強調や文のつながりが見えてきます';
                
        document.body.appendChild(el);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity   = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        }); });

        setTimeout(function() {
            el.style.opacity   = '0';
            el.style.transform = 'translateX(-50%) translateY(-3px)';
            setTimeout(function() { el.remove(); }, 600);
        }, 6500);
    }

    /* ── アンカー待機ポーリング ───────────────────────── */
    function _waitForAnchorAndPulse(attempt) {
        var card = _getOnboardingAnchor();
        if (card) {
            _attachPulse(card);
            return;
        }
        if (attempt >= 10) {
            console.warn('[Onboarding] anchor not found after 10 attempts → showing fallback');
            _showAnchorFallbackHint();
            return;
        }
        setTimeout(function() {
            _waitForAnchorAndPulse(attempt + 1);
        }, 200);
    }

    function _getOnboardingAnchor() {
        return document.querySelector('[data-onboarding-anchor="true"]');
    }

    function _attachPulseToFirstWord() {
        // γάρ を最優先アンカーとして探す
        var garCandidate =
            document.querySelector('[data-lemma="γάρ"]') ||
            (function() {
                var all = document.querySelectorAll('.word-card, [data-greek]');
                for (var i = 0; i < all.length; i++) {
                    var t = (all[i].textContent || '').trim();
                    if (t === 'γὰρ' || t === 'γαρ' || t === 'γάρ') return all[i];
                }
                return null;
            })() ||
            document.querySelector('[data-greek="γάρ"]');

        if (garCandidate) {
            garCandidate.setAttribute('data-onboarding-anchor', 'true');
            _attachPulse(garCandidate);
            _showGarConnectionHint(garCandidate);
            return;
        }

        // γάρ が無い場合は既存ロジックへ
        let card = _getOnboardingAnchor();

        if (!card) {
            console.warn('[Onboarding] anchor not found on first try, retrying…');
            requestAnimationFrame(function() {
                const retryCard = _getOnboardingAnchor();
                if (!retryCard) {
                    console.warn('[Onboarding] anchor not found after rAF retry → showing fallback');
                    _showAnchorFallbackHint();
                    return;
                }
                _attachPulse(retryCard);
            });
            return;
        }

        _attachPulse(card);
    }

    // γάρ 周辺の前後文に薄い接続ハイライトを演出する（軽量実装）
    function _showGarConnectionHint(garEl) {
        if (!garEl) return;

        /* ── 読み取りフェーズ ── */
        var container = garEl.closest('.verse-block, .verse-pair-left, [class*="verse"]');
        if (!container) return;
        var sentences = container.querySelectorAll('p, .sentence, .clause');
        if (sentences.length < 2) return;
        var highlights = [];
        sentences.forEach(function(s) {
            if (!s.contains(garEl)) highlights.push(s);
        });

        /* ── 書き込みフェーズ（rAF で遅延） ── */
        requestAnimationFrame(function() {
            highlights.forEach(function(s) {
                s.style.transition   = 'background 0.5s ease, box-shadow 0.5s ease';
                s.style.background   = 'rgba(90,110,130,0.05)';
                s.style.boxShadow    = 'inset 0 0 0 1px rgba(90,110,130,0.12)';
                s.style.borderRadius = '4px';
            });
            setTimeout(function() {
                highlights.forEach(function(s) {
                    s.style.background = '';
                    s.style.boxShadow  = '';
                });
            }, 3000);
        });
    }

    // STEP1: 16節ブロックにパルスを付ける
    function _attachPulseToVerse16() {
        var block = null;
        // verse-pair-left / verse-block で v-num=16 を探す
        var blocks = document.querySelectorAll('.verse-pair-left, .verse-block');
        for (var i = 0; i < blocks.length; i++) {
            var vEl = blocks[i].querySelector('.v-num');
            if (vEl && vEl.textContent.trim() === '16') {
                block = blocks[i];
                break;
            }
        }
        if (!block) {
            // フォールバック：先頭節
            block = document.querySelector('.verse-pair-left, .verse-block');
        }
        if (!block) return;

        // 画面内に見えていない場合はスクロールして見せる
        block.scrollIntoView({ behavior: 'smooth', block: 'center' });

        block.setAttribute('data-onboarding-anchor', 'true');
        _attachPulse(block);
    }

    // STEP2/4: γάρ の word-card または wlv-chip にパルスを付ける
    function _attachPulseToGar(attempt) {
        attempt = attempt || 0;

        function _isGar(str) {
            var s = (str || '').normalize('NFC').toLowerCase();
            return s === 'γάρ' || s === 'γὰρ' || s === 'γαρ';
        }

        // data-greek / title / data-lemma で探す
        var garEl =
            document.querySelector('.word-card[data-greek="γάρ"]') ||
            document.querySelector('.word-card[data-greek="γὰρ"]') ||
            document.querySelector('[data-lemma="γάρ"]') ||
            (function() {
                var all = document.querySelectorAll('.word-card, .wlv-chip, [data-greek], [data-lemma]');
                for (var i = 0; i < all.length; i++) {
                    var el = all[i];
                    var g = (el.dataset && el.dataset.greek) || '';
                    var lemma = (el.dataset && el.dataset.lemma) || '';
                    var titleVal = el.getAttribute('title') || '';
                    if (_isGar(g) || _isGar(lemma) || _isGar(titleVal)) return el;
                }
                return null;
            })();

        // Rev.6: data-greek が設定されていない環境向け —
        // テキストコンテンツ「for」のうち、γάρに相当するチップを探す。
        // Study Panel の「原語の順序」ビューでは data-* なしで英語テキストのみのチップがある。
        // data-word-id や data-strongs などの属性も試みる。
        if (!garEl) {
            var allChips = document.querySelectorAll('.wlv-chip, .word-card, [class*="chip"], [class*="word"]');
            for (var i = 0; i < allChips.length; i++) {
                var chip = allChips[i];
                // γάρ の主な英訳は "for"。data-strongs="G1063" が γάρ に相当する。
                var strongs = (chip.dataset && chip.dataset.strongs) || chip.getAttribute('data-strongs') || '';
                var text    = (chip.textContent || '').trim().toLowerCase();
                if (strongs === 'G1063' || strongs === '1063') { garEl = chip; break; }
                // data-* がない場合: ギリシャ語属性チェック
                if (_isGar((chip.dataset && chip.dataset.greek) || '') ||
                    _isGar(chip.getAttribute('title') || '')) { garEl = chip; break; }
                // Rev.8: モバイル Study Panel では data-* なしで英語テキスト "for" のみのチップがある。
                // テキストが完全一致 "for" の場合を γάρ 候補とする（誤検知防止のため完全一致のみ）。
                if (text === 'for') { garEl = chip; break; }
            }
        }

        if (!garEl) {
            if (attempt < 15) {
                // DOM描画待ちリトライ（最大3秒）
                setTimeout(function() { _attachPulseToGar(attempt + 1); }, 200);
            } else {
                console.warn('[Onboarding] γάρ not found in DOM after retries');
            }
            return;
        }

        // 既存の ob-gar-anchor をクリア
        document.querySelectorAll('[data-ob-gar-anchor="true"]').forEach(function(el) {
            el.removeAttribute('data-ob-gar-anchor');
        });
        garEl.setAttribute('data-ob-gar-anchor', 'true');

        _pulseEl = garEl;
        garEl.classList.add('ob-pulse');
        if (!_state.wordClicked) {
            garEl.style.background = 'rgba(90,110,130,0.07)';
            garEl.setAttribute('data-ob-affordance', 'true');
        }
    }

    // γάρ周辺の前後chipに薄いグロー（STEP2/4共通）
    function _showGarSurroundGlow() {
        /* ── 読み取りフェーズ ── */
        var garEl = document.querySelector('[data-ob-gar-anchor="true"]');
        if (!garEl) return;
        var stream = garEl.closest('.wlv-flow-stream, #word-list-view, .word-list');
        if (!stream) return;
        var chips = Array.from(stream.querySelectorAll('.wlv-chip, .word-card'));
        var idx = chips.indexOf(garEl);
        if (idx < 0) return;
        var targets = [];
        if (idx > 0)                targets.push(chips[idx - 1]);
        if (idx < chips.length - 1) targets.push(chips[idx + 1]);

        /* ── 書き込みフェーズ（rAF で遅延） ── */
        requestAnimationFrame(function() {
            targets.forEach(function(el) {
                el.style.transition = 'background 0.6s ease';
                el.style.background = 'rgba(90,110,130,0.07)';
            });
            setTimeout(function() {
                targets.forEach(function(el) { el.style.background = ''; });
            }, 4000);
        });
    }

    // STEP3: γάρ押下時の接続演出（前文・γάρ・後文ハイライト＋視線誘導）
    function _showGar16ConnectionEffect(garEl, cb) {
        _doGarConnectionEffect(garEl, cb);
    }

    // STEP5: γάρ押下時の接続演出（強調強め）
    function _showGar17ConnectionEffect(garEl, cb) {
        _doGarConnectionEffect(garEl, cb);
    }

    function _doGarConnectionEffect(garEl, cb) {
        if (!garEl) { if (cb) cb(); return; }

        /* ── 読み取りフェーズ（reflow を1回にまとめる） ── */
        var stream     = garEl.closest('.wlv-flow-stream, #word-list-view, .word-list');
        var chips      = stream ? Array.from(stream.querySelectorAll('.wlv-chip, .word-card')) : [];
        var idx        = chips.indexOf(garEl);
        var neighbors  = [];
        if (idx > 0)                neighbors.push(chips[idx - 1]);
        if (idx < chips.length - 1) neighbors.push(chips[idx + 1]);
        var afterEl    = (idx < chips.length - 1) ? chips[idx + 1] : null;
        var nextSib    = garEl.nextSibling;
        var parentNode = garEl.parentNode;

        /* ── 書き込みフェーズ（rAF で遅延：layout読み取り後に実施） ── */
        requestAnimationFrame(function() {
            // γάρ自身を強調
            garEl.style.transition   = 'background 0.3s ease, box-shadow 0.3s ease';
            garEl.style.background   = 'rgba(90,110,130,0.18)';
            garEl.style.boxShadow    = '0 0 0 3px rgba(90,110,130,0.25)';
            garEl.style.borderRadius = '4px';

            // 前後chipをハイライト
            neighbors.forEach(function(el) {
                el.style.transition   = 'background 0.5s ease';
                el.style.background   = 'rgba(90,110,130,0.09)';
                el.style.borderRadius = '4px';
            });

            // 後文を軽くインデント（視線誘導）
            if (afterEl) {
                afterEl.style.transition = 'margin-left 0.4s ease';
                afterEl.style.marginLeft = '8px';
                setTimeout(function() { afterEl.style.marginLeft = ''; }, 2500);
            }

            // 接続ライン（γάρの直後に薄いライン挿入）
            var lineEl = document.createElement('span');
            lineEl.id = 'ob-gar-line';
            lineEl.style.cssText = [
                'display:inline-block',
                'width:18px',
                'height:2px',
                'background:rgba(90,110,130,0.35)',
                'vertical-align:middle',
                'margin:0 3px',
                'border-radius:1px',
                'opacity:0',
                'transition:opacity 0.4s ease',
            ].join(';');
            if (nextSib && parentNode) {
                parentNode.insertBefore(lineEl, nextSib);
            }
            requestAnimationFrame(function() { lineEl.style.opacity = '1'; });

            // 観察時間（0.9秒）後にコールバック
            setTimeout(function() {
                garEl.style.background = '';
                garEl.style.boxShadow  = '';
                neighbors.forEach(function(el) { el.style.background = ''; });
                lineEl.style.opacity = '0';
                setTimeout(function() { lineEl.remove(); }, 500);
                if (cb) cb();
            }, 900);
        });
    }

    // STEP4: 17節へ自動スクロール＋Study Panel表示
    function _goToVerse17() {
        // 17節ブロックを探してクリックをシミュレート
        var blocks = document.querySelectorAll('.verse-pair-left, .verse-block');
        var block17 = null;
        for (var i = 0; i < blocks.length; i++) {
            var vEl = blocks[i].querySelector('.v-num');
            if (vEl && vEl.textContent.trim() === '17') {
                block17 = blocks[i];
                break;
            }
        }

        if (block17) {
            block17.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // スクロール完了後にクリック
            setTimeout(function() {
                block17.click();
            }, 500);
        } else {
            console.warn('[Onboarding] verse 17 block not found');
        }
    }

    function _attachPulse(card) {
        _pulseEl = card;
        card.classList.add('ob-pulse');

        if (!_state.wordClicked) {
            card.style.background = 'rgba(90,110,130,0.07)';
            card.setAttribute('data-ob-affordance', 'true');
        }

        // フォーカスオーバーレイは使用しない。
        // ob-focus-panel の pointer-events:all が対象要素へのクリックを
        // 妨げるため、パルスアニメーションとカードのみで誘導する。
    }

    // anchor 未発見時の fallback トースト（Rev.2 でトースト統一）
    function _showAnchorFallbackHint() {
        if (document.getElementById('ob-anchor-fallback')) return;
        const el = document.createElement('div');
        el.id = 'ob-anchor-fallback';
        el.style.cssText = [
            'position: fixed',
            'bottom: calc(env(safe-area-inset-bottom, 16px) + 76px)',
            'left: 50%',
            'transform: translateX(-50%) translateY(6px)',
            'z-index: 9100',
            'pointer-events: none',
            'background: rgba(29,29,31,0.75)',
            'border-radius: 20px',
            'padding: 7px 18px',
            'max-width: min(260px, 86vw)',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.76rem',
            'font-weight: 500',
            'color: rgba(255,255,255,0.90)',
            'letter-spacing: 0.01em',
            'text-align: center',
            'opacity: 0',
            'transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');
        el.textContent = '気になる語をどれでも押してみてください';
        document.body.appendChild(el);
        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        }); });
        setTimeout(function() {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 600);
        }, 10000);
    }

    /* ── Empty State（語未選択時のStudy Panel案内） ──── */
    function _showEmptyState() {
        const wrap = document.getElementById('reading-notes-wrap');
        if (!wrap) return;
        if (document.getElementById('ob-empty-state')) return;

        const el = document.createElement('div');
        el.id = 'ob-empty-state';
        el.style.cssText = [
            'display: flex',
            'flex-direction: column',
            'align-items: center',
            'justify-content: center',
            'gap: 10px',
            'padding: 40px 24px',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.73rem',
            'line-height: 1.75',
            'color: rgba(29,29,31,0.52)',
            'letter-spacing: 0.02em',
            'text-align: center',
            'user-select: none',
            'pointer-events: none',
            'opacity: 0',
            'transition: opacity 0.6s ease',
        ].join(';');

        const isMobileView = window.innerWidth <= 900;

        // Rev.2: 超短文化。モバイルは「本文に戻る」1行のみ。
        const msg = document.createElement('div');
        msg.style.cssText = 'font-size:0.80rem;line-height:1.6;';
        msg.textContent = isMobileView ? '← 本文の節を押してみましょう' : '↖ 節を押すと、語の一覧が現れます';

        el.appendChild(msg);
        wrap.insertBefore(el, wrap.firstChild);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
        }); });
    }

    function _hideEmptyState() {
        const el = document.getElementById('ob-empty-state');
        if (!el) return;
        el.style.opacity = '0';
        setTimeout(function() { el.remove(); }, 500);
    }

    /* ── 読み込みエリアヒント（下部トースト統一版） ───── */
    function _showReadingAreaHint() {
        if (_state.wordClicked) return;
        if (document.getElementById('ob-reading-hint')) return;

        // Rev.2: inline挿入をやめ、下部トーストで統一する
        const hint = document.createElement('div');
        hint.id = 'ob-reading-hint';
        hint.style.cssText = [
            'position: fixed',
            'bottom: calc(env(safe-area-inset-bottom, 16px) + 76px)',
            'left: 50%',
            'transform: translateX(-50%) translateY(6px)',
            'z-index: 9050',
            'pointer-events: none',
            'user-select: none',
            'background: rgba(29,29,31,0.75)',
            'border-radius: 20px',
            'padding: 7px 18px',
            'max-width: min(260px, 86vw)',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.76rem',
            'font-weight: 500',
            'color: rgba(255,255,255,0.90)',
            'letter-spacing: 0.01em',
            'text-align: center',
            'line-height: 1.55',
            'opacity: 0',
            'transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');
        hint.textContent = '節を押すと、原語の語形一覧が開きます';
        document.body.appendChild(hint);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            hint.style.opacity = '1';
            hint.style.transform = 'translateX(-50%) translateY(0)';
        }); });

        setTimeout(function() { _hideReadingAreaHint(); }, 8000);
    }

    function _hideReadingAreaHint() {
        const el = document.getElementById('ob-reading-hint');
        if (!el) return;
        el.style.opacity = '0';
        el.style.transform = 'translateX(-50%) translateY(-4px)';
        setTimeout(function() { el.remove(); }, 500);
    }

    /* ── 初回タップ「驚き情報」────────────────────────
       WordInsight本文は変更禁止。構造のみ整理。
    ─────────────────────────────────────────────── */
    // 初学者向け
    const _WORD_INSIGHTS = {
    'ἠγάπησεν': '翻訳では「神は世を愛された」と始まりますが、原文では「愛した」が最初に置かれています',
    'ἀγαπάω':   '翻訳の「愛する」は感情に読めますが、ここでは選び続ける意志として前に出ています',
    'ἔδωκεν':   '翻訳では「与えた」と流れますが、原文では一度きりの行為として切り取られています',
    'μονογενῆ': '翻訳の「ひとり子」は数に読めますが、原文では「同種で唯一の」という置かれ方をしています',
    'πιστεύων': '翻訳では「信じる者」と一語ですが、原文では「今この瞬間も信じ続けている人」という形になっています',
    'ἀπόληται': '翻訳では「滅びないで」と通り過ぎますが、原文では「失われた状態にならない」という方向で書かれています',
    'αἰώνιον':  '翻訳の「永遠の命」は時間の長さに読めますが、原文では命の質を指す語が置かれています',
    'οὕτως':    '翻訳では「このように」と短く訳されますが、原文ではそれ以前の文脈全体をここで受けています',
    'κόσμον':   '翻訳では「世を」と小さく見えますが、原文ではこの語が愛の広さを示す位置に置かれています',
    'οὖν':      '翻訳では訳されないこともある語ですが、原文では前の流れ全体をここで引き受けています',
    'γάρ':      '翻訳では省かれることがある語です。原文ではここに置かれています',
};
const _DEFAULT_INSIGHT = '翻訳では見えにくくなっている語が、ここに置かれています';

    // 中級者向け
    const _WORD_INSIGHTS_EXPERIENCED = {
    'ἠγάπησεν': '動詞が文の先頭に置かれています。「愛した」という行為が、主語より先に前に出ている構造です',
    'ἀγαπάω':   '感情的な引力（eros）とは別の動詞です。翻訳の「愛する」より、意志的に選ぶ方向の語が置かれています',
    'ἔδωκεν':   '「与え続けた」ではなく完結した一度の贈与として切り取られています。翻訳では時制の差が消えています',
    'μονογενῆ': '「ひとり子」より「同種でただひとりの」という置かれ方の語です。翻訳の「唯一」とは届いている意味が少しずれています',
    'πιστεύων': '翻訳では「信じる者」と過去的に読めますが、原文では今も続いている状態として書かれています',
    'ἀπόληται': '「滅びない」の背後に「失われた状態に至らない」という方向があります。翻訳では消えているニュアンスです',
    'αἰώνιον':  '時間の長さより「世界の質」に属する命として置かれています。翻訳の「永遠」とは届く先が少し違います',
    'οὕτως':    '3:14–15 全体を一語で受けています。翻訳では「このように」と短く通り過ぎますが、ここで前の文脈が圧縮されています',
    'κόσμον':   '愛の対象として置かれた語です。翻訳の「世を」より、神の眼差しの広さがここに集まっている構造に見えます',
    'οὖν':      '文頭には来ない語で、前節の流れを受けてここで帰結を示しています。翻訳では訳されないか「だから」で通過します',
    'γάρ':      '翻訳では「なぜなら」と訳されるか、省かれます。ここでは16節の根拠として置かれており、17節でも同じ語が続きます',
};
const _DEFAULT_INSIGHT_EXPERIENCED = '翻訳では平らに見える箇所に、原文では語順や構造の選択が残っています';

    /* ── インサイト取得（将来の専門用語レイヤーへの拡張口） ───
       readerLevel: 'beginner' | 'experienced'（現在は2段階）
       将来は 'advanced' を追加し lemma/morphology 表示を追加可能。
       今回は構造整理のみ。専門用語の実際の追加は禁止。
    ─────────────────────────────────────────────── */
    function _getReaderLevel() {
        if (_state.experiencedReader) { return 'experienced'; }
        return 'beginner';
    }

    function _getWordInsight(greek) {
        var level = _getReaderLevel();
        switch (level) {
            case 'experienced':
                return _WORD_INSIGHTS_EXPERIENCED[greek] || _DEFAULT_INSIGHT_EXPERIENCED;
            // case 'advanced': // 将来: lemma/morphology層をここに追加
            //     return _WORD_INSIGHTS_ADVANCED[greek] || _DEFAULT_INSIGHT_ADVANCED;
            case 'beginner':
            default:
                return _WORD_INSIGHTS[greek] || _DEFAULT_INSIGHT;
        }
    }

    function _showWordInsight(clickedEl) {
        let greek = '';
        if (clickedEl && clickedEl.dataset && clickedEl.dataset.greek) {
            greek = clickedEl.dataset.greek;
        } else {
            const anchor = document.querySelector('[data-onboarding-anchor="true"]');
            if (anchor && anchor.dataset && anchor.dataset.greek) {
                greek = anchor.dataset.greek;
            }
        }
        const insight = _getWordInsight(greek);

        const el = document.createElement('div');
        el.id = 'ob-word-insight';
        // Rev.3: pointer-events: auto に変更（保存ボタンのため）
        el.style.cssText = [
            'position: fixed',
            'top: 56px',
            'left: 50%',
            'transform: translateX(-50%)',
            'z-index: 9200',
            'background: rgba(255,255,255,0.97)',
            'border: 0.5px solid rgba(90,110,130,0.18)',
            'border-radius: 14px',
            'box-shadow: 0 2px 18px rgba(0,0,0,0.09)',
            'backdrop-filter: blur(10px)',
            '-webkit-backdrop-filter: blur(10px)',
            'padding: 10px 20px 8px',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'max-width: min(320px, 88vw)',
            'opacity: 0',
            'transition: opacity 0.45s ease',
        ].join(';');

        // インサイト本文（変更禁止）
        const insightText = document.createElement('div');
        insightText.style.cssText = [
            'font-size: 0.73rem',
            'font-weight: 400',
            'line-height: 1.7',
            'color: rgba(29,29,31,0.62)',
            'letter-spacing: 0.02em',
            'text-align: center',
            'white-space: normal',
        ].join(';');
        insightText.textContent = insight;
        el.appendChild(insightText);

        // Rev.3: 神学安全性 — 学習体験を壊さない軽い免責1行
        const disclaimer = document.createElement('div');
        disclaimer.style.cssText = [
            'font-size: 0.62rem',
            'color: rgba(29,29,31,0.28)',
            'text-align: center',
            'letter-spacing: 0.02em',
            'margin-top: 4px',
        ].join(';');
        disclaimer.textContent = 'これは一つの読み方です';
        el.appendChild(disclaimer);

        // Rev.3: 「後で読む」軽量保存ボタン（中級者の蓄積感を作る）
        // UI非表示化：保存ロジック・イベント・app_saved_insightsは変更せず、
        // 行全体をdisplay:noneにして見た目からのみ除去する（レイアウト幅は発生しない）。
        const saveRow = document.createElement('div');
        saveRow.style.cssText = [
            'display: none',
            'justify-content: flex-end',
            'margin-top: 6px',
        ].join(';');
        const saveBtn = document.createElement('button');
        saveBtn.style.cssText = [
            'background: none',
            'border: none',
            'padding: 4px 2px',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.62rem',
            'color: rgba(90,110,130,0.55)',
            'cursor: pointer',
            'letter-spacing: 0.02em',
            '-webkit-tap-highlight-color: transparent',
            'touch-action: manipulation',
            'min-height: 28px',
        ].join(';');
        saveBtn.textContent = '後で読む　＋';
        saveBtn.addEventListener('click', function() {
            try {
                var saved = JSON.parse(localStorage.getItem('app_saved_insights') || '[]');
                var entry = { greek: greek, insight: insight, savedAt: Date.now() };
                saved = saved.filter(function(s) { return s.greek !== greek; });
                saved.unshift(entry);
                if (saved.length > 30) { saved = saved.slice(0, 30); }
                localStorage.setItem('app_saved_insights', JSON.stringify(saved));
            } catch (_) {}
            saveBtn.textContent = '保存しました　✓';
            saveBtn.style.color = 'rgba(90,110,130,0.88)';
            saveBtn.disabled = true;
        });
        saveRow.appendChild(saveBtn);
        el.appendChild(saveRow);

        document.body.appendChild(el);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
        }); });

        // 自動消去は4秒に延長（ボタン操作の余裕を確保）
        setTimeout(function() {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 500);
        }, 4000);
    }

    function _showCompletionCTA() {
        if (document.getElementById('ob-completion-cta')) return;

        const el = document.createElement('div');
        el.id = 'ob-completion-cta';
        el.style.cssText = [
            'position: fixed',
            'bottom: calc(env(safe-area-inset-bottom, 16px) + 16px)',
            'left: 50%',
            'transform: translateX(-50%) translateY(8px)',
            'z-index: 9200',
            'background: rgba(255,255,255,0.99)',
            'border: 1px solid rgba(90,110,130,0.28)',
            'border-radius: 16px',
            'box-shadow: 0 8px 36px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
            'backdrop-filter: blur(14px)',
            '-webkit-backdrop-filter: blur(14px)',
            'padding: 16px 22px',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'display: flex',
            'flex-direction: column',
            'align-items: center',
            'gap: 12px',
            'max-width: min(320px, 88vw)',
            'opacity: 0',
            'transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.4,0,0.2,1)',
            'cursor: default',
        ].join(';');

        const message = document.createElement('div');
        message.style.cssText = [
            'font-size: 0.82rem',
            'font-weight: 500',
            'color: rgba(29,29,31,0.82)',
            'letter-spacing: 0.01em',
            'line-height: 1.65',
            'text-align: center',
        ].join(';');
        message.textContent = '原語で読む感覚、少し掴めましたか';

        const btn = document.createElement('button');
        btn.style.cssText = [
            'background: rgba(90,110,130,0.12)',
            'border: 1.5px solid rgba(90,110,130,0.45)',
            'border-radius: 10px',
            'padding: 10px 22px',
            'min-height: 44px',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.82rem',
            'font-weight: 600',
            'color: rgba(29,29,31,0.88)',
            'cursor: pointer',
            'letter-spacing: 0.01em',
            'transition: background 0.18s ease',
            '-webkit-tap-highlight-color: transparent',
            'touch-action: manipulation',
            'width: 100%',
        ].join(';');
        btn.textContent = '次の節へ進む　→';

        const dismiss = document.createElement('div');
        dismiss.style.cssText = [
            'font-size: 0.65rem',
            'color: rgba(29,29,31,0.32)',
            'cursor: pointer',
            'letter-spacing: 0.01em',
            '-webkit-tap-highlight-color: transparent',
            'min-height: 32px',
            'line-height: 32px',
        ].join(';');
        dismiss.textContent = 'あとで自由に探す';

        // Rev.1: フォールバック3段階で「押したら必ず何か起きる」を保証
        btn.addEventListener('click', function() {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 500);

            if (typeof navigateNextVerse === 'function') {
                navigateNextVerse();
            } else if (typeof _navigateVerse === 'function') {
                _navigateVerse(1);
            } else {
                var chapterLink = document.querySelector('[data-chapter-list], .chapter-list-btn, #chapter-list-btn');
                if (chapterLink) {
                    chapterLink.click();
                } else {
                    console.info('[Onboarding] CTA closed, no navigation target found');
                }
            }
        });

        dismiss.addEventListener('click', function() {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 400);
        });

        el.appendChild(message);
        el.appendChild(btn);
        el.appendChild(dismiss);
        document.body.appendChild(el);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        }); });
    }

    /* ── 完了後の継続誘導 ──────────────────────────────── */
    function _showContinuationNudge() {
        if (_activeHintEl) return;

        const el = document.createElement('div');
        el.id = 'ob-continuation';
        el.style.cssText = [
            'position: fixed',
            'bottom: 28px',
            'left: 50%',
            'transform: translateX(-50%)',
            'z-index: 9000',
            'pointer-events: none',
            'background: rgba(255,255,255,0.90)',
            'border: 0.5px solid rgba(0,0,0,0.08)',
            'border-radius: 16px',
            'box-shadow: 0 2px 14px rgba(0,0,0,0.06)',
            'backdrop-filter: blur(8px)',
            '-webkit-backdrop-filter: blur(8px)',
            'padding: 8px 20px',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.71rem',
            'color: rgba(29,29,31,0.42)',
            'letter-spacing: 0.02em',
            'text-align: center',
            'white-space: nowrap',
            'opacity: 0',
            'transition: opacity 0.5s ease',
        ].join(';');
        el.textContent = '他の章でも、同じように読めます';
        document.body.appendChild(el);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
        }); });

        setTimeout(function() {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); }, 600);
        }, 5000);
    }

    /* ── 価値サマリー（F2-A） ────────────────────────────
       2語目タップ完了後、初学者向けに表示する体験接続カード。
    ─────────────────────────────────────────────── */
    function _showValueSummary() {
        if (document.getElementById('ob-value-summary')) return;

        const isMobile = window.innerWidth <= 900;
        const el = document.createElement('div');
        el.id = 'ob-value-summary';
        el.style.cssText = [
            'position: fixed',
            isMobile ? 'bottom: calc(env(safe-area-inset-bottom, 16px) + 80px)' : 'bottom: 100px',
            'left: 50%',
            'transform: translateX(-50%) translateY(8px)',
            'z-index: 9200',
            'background: rgba(255,255,255,0.99)',
            'border: 1px solid rgba(90,110,130,0.22)',
            'border-radius: 18px',
            'box-shadow: 0 10px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
            'backdrop-filter: blur(14px)',
            '-webkit-backdrop-filter: blur(14px)',
            'padding: 22px 24px',
            'max-width: min(340px, 90vw)',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'opacity: 0',
            'transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.4,0,0.2,1)',
        ].join(';');

        // Rev.2: 体験接続テキスト：「さっきやったこと」から始める
        const landing = document.createElement('div');
        landing.style.cssText = [
            'font-size:0.83rem',
            'font-weight:400',
            'color:rgba(29,29,31,0.82)',
            'letter-spacing:0.01em',
            'line-height:1.85',
            'margin-bottom:18px',
            'padding-bottom:16px',
            'border-bottom:1px solid rgba(90,110,130,0.12)',
        ].join(';');
        landing.textContent = '前後の文を見比べてみてください。原文では、小さな語が文をつないでいます。';        el.appendChild(landing);

        // Rev.2: Flow CTA：次行動を明確なボタンで示す
        const hasFlowTab = !!document.getElementById('gf-tab-flow');
        if (hasFlowTab) {
            const flowLabel = document.createElement('div');
            flowLabel.style.cssText = [
                'font-size:0.76rem',
                'color:rgba(29,29,31,0.50)',
                'letter-spacing:0.02em',
                'text-align:center',
                'margin-bottom:8px',
            ].join(';');
            flowLabel.textContent = '次は、文の流れを見てみましょう';
            el.appendChild(flowLabel);

            const flowBtn = document.createElement('button');
            flowBtn.style.cssText = [
                'width:100%',
                'min-height:44px',
                'background:rgba(90,110,130,0.12)',
                'border:1.5px solid rgba(90,110,130,0.40)',
                'border-radius:10px',
                'font-family:\'Noto Serif JP\',\'Georgia\',serif',
                'font-size:0.82rem',
                'font-weight:700',
                'color:rgba(29,29,31,0.88)',
                'cursor:pointer',
                'letter-spacing:0.02em',
                '-webkit-tap-highlight-color:transparent',
                'touch-action:manipulation',
                'margin-bottom:10px',
            ].join(';');
            flowBtn.textContent = 'Flowを見る　→';
            flowBtn.addEventListener('click', function() {
                el.style.opacity = '0';
                setTimeout(function() {
                    el.remove();
                    var tabFlow = document.getElementById('gf-tab-flow');
                    if (tabFlow) { tabFlow.click(); }
                }, 350);
            });
            el.appendChild(flowBtn);
        }

        const dismiss = document.createElement('div');
        dismiss.style.cssText = [
            'margin-top:4px',
            'font-size:0.76rem',
            'font-weight:500',
            'color:rgba(90,110,130,0.75)',
            'cursor:pointer',
            'text-align:center',
            'letter-spacing:0.01em',
            '-webkit-tap-highlight-color:transparent',
            'min-height:40px',
            'line-height:40px',
            'background:rgba(90,110,130,0.07)',
            'border-radius:10px',
            'border:1px solid rgba(90,110,130,0.18)',
        ].join(';');
        dismiss.textContent = '他の節でも読んでみる　→';
        dismiss.addEventListener('click', function() {
            el.style.opacity = '0';
            setTimeout(function() { el.remove(); _showCompletionCTA(); }, 400);
        });
        el.appendChild(dismiss);
        document.body.appendChild(el);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        }); });
    }

    /* ── Flowタブ誘導バッジ ─────────────────────────────
       2語目タップ完了後に呼ばれる。
       #gf-tab-flow が存在する（＝比較表示モード）時のみ動作。
    ─────────────────────────────────────────────── */
    function _showFlowTabNudge() {
        if (document.getElementById('ob-flow-tab-nudge')) return;

        const tabFlow = document.getElementById('gf-tab-flow');
        if (!tabFlow) return;

        var _origBoxShadow = tabFlow.style.boxShadow;
        var _origTransition = tabFlow.style.transition;
        // Rev.3: ハイライト強度を上げて視認性向上
        tabFlow.style.transition = 'box-shadow 0.4s ease';
        tabFlow.style.boxShadow  = '0 0 0 2.5px rgba(90,110,130,0.50)';

        const nudge = document.createElement('span');
        nudge.id = 'ob-flow-tab-nudge';
        // Rev.3: 「語順を見る」明示テキスト
        nudge.textContent = '← 語順を見る';
        nudge.style.cssText = [
            'display: inline-block',
            'margin-left: 8px',
            'font-family: \'Noto Serif JP\', \'Georgia\', serif',
            'font-size: 0.70rem',
            'font-weight: 600',
            'color: rgba(90,110,130,0.72)',
            'letter-spacing: 0.01em',
            'pointer-events: none',
            'opacity: 0',
            'transition: opacity 0.5s ease',
            'vertical-align: middle',
            'white-space: nowrap',
        ].join(';');

        tabFlow.parentNode.insertBefore(nudge, tabFlow.nextSibling);

        requestAnimationFrame(function() { requestAnimationFrame(function() {
            nudge.style.opacity = '1';
        }); });

        setTimeout(function() {
            nudge.style.opacity = '0';
            tabFlow.style.boxShadow  = _origBoxShadow  || '';
            tabFlow.style.transition = _origTransition || '';
            setTimeout(function() { nudge.remove(); }, 600);
        }, 10000);
    }

})();
