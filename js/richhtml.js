// 「リッチHTML表示」機能: 現在のライブプレビュー（アプリのテーマに合わせた簡易表示）
// とは別に、「読み物として作り込まれた」見た目のスタンドアロンHTML文書を組み立てて
// 新しいタブで開く。ヒーローヘッダー・自動生成の目次・コールアウト風の引用・
// 装飾された表・アクセント付きコードブロックなどでビジュアルの強さを出す。
// 外部フォント・CDN・JSは使わず、インラインCSSのみで完結させる（軽量・オフライン
// 方針を維持。保存や印刷はブラウザ標準の機能に任せる）。

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// bodyHtmlから見出し一覧（目次用）と本文の文字数（概算読了時間用）を抽出する
function analyze(bodyHtml) {
  const doc = new DOMParser().parseFromString(`<div>${bodyHtml}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  const headings = Array.from(root.querySelectorAll("h1,h2,h3,h4,h5,h6")).map((el) => ({
    level: Number(el.tagName.slice(1)),
    id: el.id,
    text: el.textContent.trim(),
  }));
  const charCount = (root.textContent || "").replace(/\s+/g, "").length;
  return { headings, charCount };
}

// 先頭が見出し(h1)なら、その中身とidを取り出して本文から切り離す
// （ヒーローヘッダーにその見出しをそのまま使い、本文内での二重表示を避けるため）
function extractLeadingH1(bodyHtml) {
  const match = bodyHtml.match(/^\s*<h1([^>]*)>([\s\S]*?)<\/h1>/);
  if (!match) return null;
  const idMatch = match[1].match(/id="([^"]*)"/);
  return {
    id: idMatch ? idMatch[1] : "",
    html: match[2],
    rest: bodyHtml.slice(match[0].length),
  };
}

function buildToc(headings) {
  if (headings.length < 2) return "";
  const minLevel = Math.min(...headings.map((h) => h.level));
  const items = headings
    .map((h) => {
      const indent = (h.level - minLevel) * 18;
      const label = escapeHtml(h.text || "(無題の見出し)");
      const inner = h.id ? `<a href="#${h.id}">${label}</a>` : label;
      return `<li style="padding-left:${indent}px">${inner}</li>`;
    })
    .join("\n");
  return `<nav class="toc-card" aria-label="目次">
  <p class="toc-card-title">目次</p>
  <ol>${items}</ol>
</nav>`;
}

function buildRichHtmlDocument(bodyHtml, title) {
  const leading = extractLeadingH1(bodyHtml);
  const heroTitleHtml = leading ? leading.html : escapeHtml(title || "Markdownドキュメント");
  const heroIdAttr = leading && leading.id ? ` id="${leading.id}"` : "";
  const restBodyHtml = leading ? leading.rest : bodyHtml;

  // 目次・文字数は切り離す前の全文から算出する（先頭見出しも目次に含めるため）
  const { headings, charCount } = analyze(bodyHtml);
  const tocHtml = buildToc(headings);
  const metaText =
    charCount > 0
      ? `${charCount.toLocaleString()}文字 ・ 約${Math.max(1, Math.round(charCount / 600))}分で読めます`
      : "";
  const generatedAt = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title || "Markdownドキュメント")}</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #ffffff;
    --fg: #1a1a2e;
    --muted: #6b7280;
    --border: #e5e7eb;
    --card-bg: #f8f9fc;
    --link: #6366f1;
    --accent-1: #6366f1;
    --accent-2: #a855f7;
    --accent-3: #ec4899;
    --callout-bg: rgba(99, 102, 241, 0.08);
    --table-header-bg: rgba(99, 102, 241, 0.12);
    --table-stripe: rgba(0, 0, 0, 0.025);
    --code-bg: #1e1e2e;
    --code-fg: #e2e8f0;
    --shadow: 0 1px 3px rgba(20, 20, 40, 0.08), 0 8px 24px rgba(20, 20, 40, 0.06);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1117;
      --fg: #e5e7eb;
      --muted: #9ca3af;
      --border: #2d3348;
      --card-bg: #171a24;
      --link: #a5b4fc;
      --accent-1: #818cf8;
      --accent-2: #c084fc;
      --accent-3: #f472b6;
      --callout-bg: rgba(129, 140, 248, 0.14);
      --table-header-bg: rgba(129, 140, 248, 0.16);
      --table-stripe: rgba(255, 255, 255, 0.03);
      --code-bg: #0b0d14;
      --code-fg: #e2e8f0;
      --shadow: 0 1px 3px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.25);
    }
  }
  * { box-sizing: border-box; }
  body {
    max-width: 780px;
    margin: 0 auto;
    padding: 0 24px 25vh;
    background: var(--bg);
    color: var(--fg);
    font-family: "Hiragino Sans", "Yu Gothic UI", "Noto Sans CJK JP", "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 17px;
    line-height: 1.85;
  }

  /* ヒーローヘッダー */
  .hero { padding: 64px 0 32px; }
  .hero-title {
    margin: 0 0 14px;
    font-size: 2.4em;
    font-weight: 800;
    line-height: 1.3;
    letter-spacing: -0.01em;
    background: linear-gradient(90deg, var(--accent-1), var(--accent-2) 55%, var(--accent-3));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .hero-meta {
    margin: 0 0 20px;
    color: var(--muted);
    font-size: 0.92em;
  }
  .hero-bar {
    height: 5px;
    border-radius: 3px;
    background: linear-gradient(90deg, var(--accent-1), var(--accent-2) 55%, var(--accent-3));
  }

  /* 目次カード */
  .toc-card {
    margin: 32px 0 48px;
    padding: 20px 24px;
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: var(--shadow);
  }
  .toc-card-title {
    margin: 0 0 10px;
    font-size: 0.8em;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent-1);
  }
  .toc-card ol {
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: toc;
  }
  .toc-card li { margin: 0.35em 0; }
  .toc-card a {
    color: var(--fg);
    text-decoration: none;
  }
  .toc-card a:hover { color: var(--link); text-decoration: underline; }

  article h1, article h2, article h3, article h4, article h5, article h6 {
    margin: 1.7em 0 0.6em;
    line-height: 1.4;
    font-weight: 700;
  }
  article h1 { font-size: 1.7em; }
  article h2 {
    font-size: 1.35em;
    border-left: 5px solid var(--accent-1);
    padding-left: 0.55em;
  }
  article h3 { font-size: 1.15em; color: var(--accent-2); }

  p, ul, ol, blockquote, pre, table { margin: 0 0 1.2em; }
  article ul, article ol { padding-left: 1.6em; }
  article li { margin: 0.3em 0; }
  a { color: var(--link); text-decoration: none; }
  a:hover { text-decoration: underline; }
  img { max-width: 100%; border-radius: 10px; box-shadow: var(--shadow); }

  /* 引用のコールアウト化 */
  blockquote {
    margin: 1.6em 0;
    padding: 1em 1.3em;
    background: var(--callout-bg);
    border-left: 4px solid var(--accent-2);
    border-radius: 0 12px 12px 0;
    color: var(--fg);
  }
  blockquote p:last-child { margin-bottom: 0; }

  code {
    font-family: "SF Mono", Consolas, Menlo, monospace;
    font-size: 0.9em;
    background: var(--callout-bg);
    border-radius: 4px;
    padding: 0.15em 0.4em;
  }
  pre {
    position: relative;
    margin: 1.6em 0;
    background: var(--code-bg);
    color: var(--code-fg);
    border-radius: 12px;
    padding: 22px 18px 18px;
    overflow-x: auto;
    line-height: 1.6;
    box-shadow: var(--shadow);
  }
  pre::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    border-radius: 12px 12px 0 0;
    background: linear-gradient(90deg, var(--accent-1), var(--accent-2) 55%, var(--accent-3));
  }
  pre code { background: none; padding: 0; color: inherit; }

  /* 表の強化 */
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  th, td { padding: 10px 16px; text-align: left; border-bottom: 1px solid var(--border); }
  thead th { background: var(--table-header-bg); font-weight: 700; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: var(--table-stripe); }

  hr { border: none; border-top: 1px solid var(--border); margin: 2.4em 0; }

  .doc-footer {
    margin-top: 4em;
    padding-top: 1.4em;
    border-top: 1px solid var(--border);
    color: var(--muted);
    font-size: 0.85em;
    text-align: center;
  }

  @media print {
    :root {
      --bg: #ffffff; --fg: #000000; --muted: #444444; --border: #cccccc;
      --card-bg: #f5f5f5; --callout-bg: #f0f0f0; --table-header-bg: #eeeeee;
      --table-stripe: #fafafa; --code-bg: #f5f5f5; --code-fg: #111111;
      --shadow: none;
    }
    .hero-title { background: none; -webkit-text-fill-color: initial; color: var(--fg); }
    .hero-bar { background: var(--border); }
    pre::before { display: none; }
    img, .toc-card, pre, table { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="hero">
  <h1 class="hero-title"${heroIdAttr}>${heroTitleHtml}</h1>
  ${metaText ? `<p class="hero-meta">${metaText}</p>` : ""}
  <div class="hero-bar"></div>
</div>
${tocHtml}
<article>
${restBodyHtml}
</article>
<footer class="doc-footer">
  Markdownエディタで生成 ・ ${generatedAt}
</footer>
</body>
</html>
`;
}

export function openRichHtml(bodyHtml, title) {
  const html = buildRichHtmlDocument(bodyHtml, title);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(url, "_blank");
  // 新しいタブが読み込む猶予を置いてから解放する
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
