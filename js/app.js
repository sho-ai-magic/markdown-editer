import { createEditor } from "./editor.js";
import { renderMarkdown, debounce } from "./preview.js";
import { initToc } from "./toc.js";
import { initScrollSync } from "./scrollsync.js";
import { initFiles } from "./files.js";
import { initSettings } from "./settings.js";
import { initToolbar } from "./toolbar.js";

const $ = (id) => document.getElementById(id);

// ---- 設定（テーマ・色）を最初に適用してから画面を組み立てる ----
initSettings({
  overlayEl: $("settings-overlay"),
  panelEl: $("settings-panel"),
  openBtn: $("btn-settings"),
  closeBtn: $("btn-close-settings"),
  resetBtn: $("btn-reset-colors"),
  themeBtn: $("btn-theme"),
});

// ---- エディタ・プレビュー ----
const cm = createEditor($("editor-host"));
const previewPane = $("preview-pane");
const previewEl = $("preview");

const scrollSync = initScrollSync(cm, previewPane);

const toc = initToc({
  cm,
  previewPane,
  previewEl,
  tocEl: $("toc"),
  tocListEl: $("toc-list"),
  toggleBtn: $("btn-toc"),
  scrollSync,
});

// リアルタイムプレビュー（200msデバウンス、仕様書3.2）
function render() {
  const { html, headings } = renderMarkdown(cm.getValue());
  previewEl.innerHTML = html;
  toc.update(headings);
}
const renderDebounced = debounce(render, 200);
cm.on("change", renderDebounced);

// ---- ファイル操作 ----
const files = initFiles({
  cm,
  fileNameEl: $("file-name"),
  dirtyMarkEl: $("dirty-mark"),
  fileInputEl: $("file-input"),
});

$("btn-open").addEventListener("click", () => files.openFile());
$("btn-save").addEventListener("click", () => files.saveFile());
$("btn-save-as").addEventListener("click", () => files.saveFileAs());

// ---- 書式ツールバー（太字・斜体・見出し・リスト・引用・コード・表・リンク等） ----
const toolbarActions = initToolbar({
  cm,
  toolbarEl: $("format-toolbar"),
  charCountEl: $("char-count"),
  copyMdBtn: $("btn-copy-md"),
  copyRichBtn: $("btn-copy-rich"),
  previewEl,
});

// キーボードショートカット
window.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  const key = e.key.toLowerCase();
  if (key === "s") {
    e.preventDefault();
    if (e.shiftKey) files.saveFileAs();
    else files.saveFile();
  } else if (key === "o") {
    e.preventDefault();
    files.openFile();
  } else if (key === "b") {
    e.preventDefault();
    toolbarActions.bold();
  } else if (key === "i") {
    e.preventDefault();
    toolbarActions.italic();
  }
});

// ---- 初期コンテンツ（初回起動時の簡単な使い方） ----
const WELCOME = `# Markdownエディタへようこそ

左側にMarkdownを書くと、右側にリアルタイムでプレビューが表示されます。

## 使い方

- ツールバーの「開く」で \`.md\` ファイルを開けます（ウィンドウへのドラッグ&ドロップでもOK）
- 「保存」で上書き保存、「名前を付けて保存」で新規保存します
- 編集画面上部の書式ツールバーから、記法を覚えなくても太字・見出し・リストなどを挿入できます
- ⚙ 設定から見出しやリストの色を変更できます
- 🌙/☀️ ボタンでダークモードを切り替えられます

## 記法の例

> 引用はこのように表示されます。

1. 番号付きリスト
2. 目次サイドバーの見出しをクリックするとジャンプできます

- [x] タスクリストにも対応
- [ ] 未完了のタスク

| 機能 | 対応 |
|---|---|
| テーブル | ✅ |
| コードブロック | ✅ |

\`\`\`
コードブロックの例
\`\`\`

[リンクの例](https://example.com)
`;

files.setContent(WELCOME, "無題.md", null);
render();

// ---- PWA: オフライン用Service Worker ----
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // 登録に失敗してもアプリ本体の動作には影響しない
  });
}
