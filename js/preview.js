// プレビュー: markdown-it によるHTML変換。
// テーブル記法は標準対応、見出しには自動でIDを付与する（仕様書3.2）。

const md = window.markdownit({
  html: false,
  linkify: true,
});

// タスクリスト（- [ ] / - [x]）をチェックボックスとして描画する軽量拡張。
// 外部プラグインは使わず、リスト項目のinlineトークンの先頭を見て変換する
// （書式ツールバーのタスクリストボタンで挿入した記法に対応するため）。
md.core.ruler.push("task_checkbox", (state) => {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "list_item_open") continue;
    let inline = null;
    for (let j = i + 1; j < tokens.length && tokens[j].type !== "list_item_close"; j++) {
      if (tokens[j].type === "inline") {
        inline = tokens[j];
        break;
      }
    }
    if (!inline) continue;
    const match = /^\[([ xX])\]\s+/.exec(inline.content);
    if (!match) continue;

    const checked = match[1].toLowerCase() === "x";
    inline.content = inline.content.slice(match[0].length);
    if (inline.children[0] && inline.children[0].type === "text") {
      inline.children[0].content = inline.children[0].content.replace(/^\[([ xX])\]\s+/, "");
    }

    tokens[i].attrSet("class", "task-list-item");
    const checkbox = new state.Token("html_inline", "", 0);
    checkbox.content = `<input type="checkbox" disabled${checked ? " checked" : ""}> `;
    inline.children.unshift(checkbox);
  }
});

// 見出しへの自動ID付与（同名見出しはカウンタで一意化）
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const inline = tokens[idx + 1];
  const raw = inline && inline.type === "inline" ? inline.content : "";
  let slug =
    raw
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\- ]/gu, "")
      .replace(/\s+/g, "-") || "heading";
  env.slugCounts = env.slugCounts || Object.create(null);
  if (env.slugCounts[slug] != null) {
    env.slugCounts[slug] += 1;
    slug = `${slug}-${env.slugCounts[slug]}`;
  } else {
    env.slugCounts[slug] = 0;
  }
  tokens[idx].attrSet("id", slug);
  return self.renderToken(tokens, idx, options);
};

// Markdownテキストを変換し、HTMLと見出し一覧（目次用）を返す。
// 見出しはmarkdown-itのトークンから取るため、プレビューのDOM上の
// h1〜h6の並び順と正確に1対1で対応する。
export function renderMarkdown(src) {
  const env = {};
  const tokens = md.parse(src, env);
  const html = md.renderer.render(tokens, md.options, env);

  const headings = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type !== "heading_open" || !t.map) continue;
    const inline = tokens[i + 1];
    headings.push({
      level: Number(t.tag.slice(1)),
      line: t.map[0], // 0始まりの行番号（エディタへのジャンプに使う)
      text: inline && inline.type === "inline" ? inline.content.trim() : "",
    });
  }
  return { html, headings };
}

export function debounce(fn, ms) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
