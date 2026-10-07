/**
 * discourse-reading-renderer.js
 *
 * 談話分析で読む（DA_READING）
 *
 * SBL sentence boundaryをSSOTとして、
 * 文頭CONJをConnector Rowへ分離し、残りを既存Word Order chipで表示する。
 *
 * 重要:
 * - 談話関係の推論はしない
 * - 新規discourse JSONは作らない
 * - refはruntime identityに使わない
 * - SR token.id(=verseId) → bible_data token のbridgeを使う
 * - 日本語は既存 bible_data.japanese を再利用する
 */
(function () {
    'use strict';

    function collectTokens(node, out) {
        out = out || [];
        if (!node) return out;

        if (node.type === 'token') {
            out.push(node);
            return out;
        }

        if (Array.isArray(node.children)) {
            node.children.forEach(child => collectTokens(child, out));
        }

        return out;
    }

    function surfaceOrder(tokens) {
        return tokens.slice().sort((a, b) => {
            const ai = Number.isFinite(Number(a.surfaceIndex)) ? Number(a.surfaceIndex) : 0;
            const bi = Number.isFinite(Number(b.surfaceIndex)) ? Number(b.surfaceIndex) : 0;
            return ai - bi;
        });
    }

    function makeChips(words, book, chapter) {
        return words.map((word, i) =>
            _wordToFlowChip(
                word,
                i,
                book,
                chapter,
                null,
                words
            )
        );
    }

    function renderConnectorRow(sentenceEl, leadingConjs) {
        if (!leadingConjs.length) return;

        const row = document.createElement('div');
        row.className = 'da-connector-row';

        const chips = makeChips(
            leadingConjs,
            leadingConjs[0]?.book || '',
            leadingConjs[0]?.chapter != null ? Number(leadingConjs[0].chapter) : null
        );

        const stream = document.createElement('div');
        stream.className = 'da-connector-stream';
        stream.innerHTML = WordOrderRenderer._wlvChipsHTML(chips, {
            stopPropagation: false,
            showOnboardingAnchor: false,
        });

        /* _wlvChipClick() が verse-block._flowChips / _flowWords を参照できるよう、
           sentence container側に保持する。 */
        sentenceEl._daConnectorChips = chips;
        row.appendChild(stream);
        sentenceEl.appendChild(row);
    }

    function renderSentence(sentence, bdMap) {
        const srTokens = surfaceOrder(collectTokens(sentence.root));
        const bdTokens = srTokens
            .map(token => bdMap.get(token.id))
            .filter(Boolean);

        if (!bdTokens.length) return null;

        let splitIdx = 0;
        while (
            splitIdx < bdTokens.length &&
            String(bdTokens[splitIdx].class || '').toLowerCase() === 'conj'
        ) {
            splitIdx++;
        }

        const leadingConjs = bdTokens.slice(0, splitIdx);
        const flowTokens = bdTokens.slice(splitIdx);

        const first = bdTokens[0];
        const book = first.book || '';
        const chapter = first.chapter != null ? Number(first.chapter) : null;

        const sentenceEl = document.createElement('section');
        sentenceEl.className = 'da-sentence verse-block';

        /* token clickのlookup先。runtime positionは各bible_data tokenに保持され、
           tokenIdは既存WO/StudyPanel lookup経路で使用される。 */
        sentenceEl._flowWords = bdTokens;
        sentenceEl._flowChips = makeChips(bdTokens, book, chapter);

        renderConnectorRow(sentenceEl, leadingConjs);

        const flowRow = document.createElement('div');
        flowRow.className = 'da-flow wlv-flow-stream';
        flowRow.innerHTML = WordOrderRenderer._wlvChipsHTML(sentenceEl._flowChips, {
            stopPropagation: false,
            showOnboardingAnchor: false,
        });
        sentenceEl.appendChild(flowRow);

        return sentenceEl;
    }

    function render(app, srData, elData) {
        if (!app) return;

        app.innerHTML = '';

        if (!srData || !Array.isArray(srData.sentences)) {
            const empty = document.createElement('div');
            empty.className = 'da-empty';
            empty.textContent = '談話分析データがありません。';
            app.appendChild(empty);
            return;
        }

        const bdMap = new Map(
            (Array.isArray(elData) ? elData : [])
                .filter(token => token && token.verseId)
                .map(token => [token.verseId, token])
        );

        const wrap = document.createElement('div');
        wrap.className = 'da-view';

        srData.sentences.forEach(sentence => {
            const el = renderSentence(sentence, bdMap);
            if (el) wrap.appendChild(el);
        });

        app.appendChild(wrap);
    }

    window.renderDAReadingView = render;
})();
