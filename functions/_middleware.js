/*
 * 言語別 OGP（共有カード）用の Cloudflare Pages Function。
 *
 * 共有 URL は /en/... ・/es/... のように言語プレフィックスを含む（アプリ側 i18n.js が
 * プレフィックスから UI 言語を決め、履歴からは取り除く）。LINE・SNS のクローラーは
 * JavaScript を実行せず静的 HTML のメタだけを読むため、そのままでは EN/ES の共有でも
 * 日本語のカードが出る。ここで index.html を取得し、その言語のメタ
 * （title / description / og:* / twitter:*）へ書き換えて返す。
 *
 * - 文言は assets/i18n/<lang>.json の meta.title / meta.description を正本とする
 *   （実行時に applyMeta が使う文字列と同一。新しいコピーはここに持たない）。
 * - 辞書が取れない・必要キーが無い場合は next() へ落とし、従来の静的 HTML（日本語）を返す（静寂）。
 * - /en/search・/es/search（正規）と /en|es/search-tool（.html 付き可・従来）は検索画面（/search-tool）を取得し、
 *   search.meta.title / search.meta.description で書き換える（EN は #30、ES は #58）。他の /en/*・/es/* は変更なし。
 * - 呼び出しは public/_routes.json の include（/en, /es 配下）に限る。日本語・通常アセットは関与しない。
 */
const LANGS = {
    en: { locale: 'en_US', image: '/assets/ogp-en.png' },
    es: { locale: 'es_ES', image: '/assets/ogp-es.png' },
};

export async function onRequest(context) {
    const { request, env, next } = context;
    if (request.method !== 'GET' && request.method !== 'HEAD') return next();

    const url = new URL(request.url);
    const m = url.pathname.match(/^\/(en|es)(?=\/|$)/);
    if (!m) return next();
    const lang = m[1];
    const cfg = LANGS[lang];
    // /{en,es}/search（正規）と /{en,es}/search-tool(.html)（従来）のみ検索画面。他は従来どおり本体 index。
    const isSearch = /^\/(en|es)\/(search-tool(\.html)?|search)\/?$/.test(url.pathname);
    const pagePath = isSearch ? '/search-tool' : '/';
    const titleKey = isSearch ? 'search.meta.title' : 'meta.title';
    const descKey = isSearch ? 'search.meta.description' : 'meta.description';

    try {
        const [pageRes, dictRes] = await Promise.all([
            env.ASSETS.fetch(new URL(pagePath, url)),
            env.ASSETS.fetch(new URL(`/assets/i18n/${lang}.json`, url)),
        ]);
        if (!pageRes.ok || !dictRes.ok) return next();
        const dict = await dictRes.json();
        const title = dict[titleKey];
        const desc = dict[descKey];
        if (typeof title !== 'string' || typeof desc !== 'string') return next();

        const image = url.origin + cfg.image;
        const pageUrl = url.origin + url.pathname;
        const setContent = (value) => ({ element(el) { el.setAttribute('content', value); } });

        const rewritten = new HTMLRewriter()
            .on('html', { element(el) { el.setAttribute('lang', lang); } })
            .on('title', { element(el) { el.setInnerContent(title); } })
            .on('meta[name="description"]', setContent(desc))
            .on('meta[property="og:title"]', setContent(title))
            .on('meta[property="og:description"]', setContent(desc))
            .on('meta[property="og:image"]', setContent(image))
            .on('meta[property="og:locale"]', setContent(cfg.locale))
            .on('meta[property="og:url"]', setContent(pageUrl))
            .on('meta[name="twitter:title"]', setContent(title))
            .on('meta[name="twitter:description"]', setContent(desc))
            .on('meta[name="twitter:image"]', setContent(image))
            .transform(pageRes);

        const headers = new Headers(rewritten.headers);
        headers.set('Content-Type', 'text/html; charset=utf-8');
        return new Response(rewritten.body, { status: 200, headers });
    } catch (_) {
        return next();
    }
}
