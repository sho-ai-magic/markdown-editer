// 「リッチHTML表示」機能: 現在のプレビュー（アプリのテーマに合わせた簡易表示）
// とは別に、読みやすさを重視した独自デザインのスタンドアロンHTML文書を組み立てて
// 新しいタブで開く。外部フォント・CDN・JSは使わず、インラインCSSのみで完結させる
// （軽量・オフライン方針を維持。保存や印刷はブラウザ標準の機能に任せる）。

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildRichHtmlDocument(bodyHtml, title) {
  const safeTitle = escapeHtml(title || "Markdownドキュメント");
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #ffffff;
    --fg: #24292f;
    --muted: #6e7781;
    --border: #e1e4e8;
    --link: #0969da;
    --code-bg: rgba(0, 0, 0, 0.05);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d1117;
      --fg: #c9d1d9;
      --muted: #8b949e;
      --border: #30363d;
      --link: #58a6ff;
      --code-bg: rgba(255, 255, 255, 0.08);
    }
  }
  * { box-sizing: border-box; }
  body {
    max-width: 760px;
    margin: 0 auto;
    padding: 56px 28px 25vh;
    background: var(--bg);
    color: var(--fg);
    font-family: "Hiragino Sans", "Yu Gothic UI", "Noto Sans CJK JP", "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 17px;
    line-height: 1.85;
  }
  h1, h2, h3, h4, h5, h6 {
    margin: 1.6em 0 0.6em;
    line-height: 1.4;
    font-weight: 700;
  }
  h1 { font-size: 1.9em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.25em; }
  h3 { font-size: 1.25em; }
  p, ul, ol, blockquote, pre, table { margin: 0 0 1.2em; }
  ul, ol { padding-left: 1.6em; }
  li { margin: 0.3em 0; }
  a { color: var(--link); text-decoration: none; }
  a:hover { text-decoration: underline; }
  img { max-width: 100%; border-radius: 6px; }
  blockquote {
    margin: 1.4em 0;
    padding: 0.4em 1.2em;
    border-left: 4px solid var(--link);
    color: var(--muted);
    font-style: italic;
  }
  code {
    font-family: "SF Mono", Consolas, Menlo, monospace;
    font-size: 0.9em;
    background: var(--code-bg);
    border-radius: 4px;
    padding: 0.15em 0.4em;
  }
  pre {
    background: var(--code-bg);
    border-radius: 8px;
    padding: 18px;
    overflow-x: auto;
    line-height: 1.6;
  }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid var(--border); padding: 8px 14px; text-align: left; }
  th { background: var(--code-bg); }
  hr { border: none; border-top: 1px solid var(--border); margin: 2.4em 0; }
  @media print {
    :root { --bg: #ffffff; --fg: #000000; --muted: #444444; --border: #cccccc; }
    body { padding: 0; }
  }
</style>
</head>
<body>
<article>
${bodyHtml}
</article>
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
