import { createEditor } from "./editor.js";
import { renderMarkdown, debounce } from "./preview.js";
import { initToc } from "./toc.js";
import { initScrollSync } from "./scrollsync.js";
import { initFiles } from "./files.js";
import { initSettings } from "./settings.js";
import { initToolbar } from "./toolbar.js";
import { initTabs } from "./tabs.js";
import { initExplorer } from "./explorer.js";
import { initSplitter } from "./splitter.js";

const $ = (id) => document.getElementById(id);

// ---- 設定（テーマ・色・エディタ表示）を最初に適用してから画面を組み立てる ----
// フォントサイズ等の変更時はCodeMirrorの再計測(refresh)が必要だが、cmは
// この時点ではまだ存在しないため、差し替え可能な参照を経由して呼ぶ。
let refreshEditor = () => {};
const settings = initSettings({
  overlayEl: $("settings-overlay"),
  panelEl: $("settings-panel"),
  openBtn: $("btn-settings"),
  closeBtn: $("btn-close-settings"),
  resetBtn: $("btn-reset-colors"),
  themeBtn: $("btn-theme"),
  onPrefsChange: () => refreshEditor(),
});

// ---- エディタ・プレビュー ----
const cm = createEditor($("editor-host"));
refreshEditor = () => cm.refresh();
const previewPane = $("preview-pane");
const previewEl = $("preview");
const previewMetaEl = $("preview-meta");

const scrollSync = initScrollSync(cm, previewPane);

const toc = initToc({
  cm,
  previewPane,
  previewEl,
  tocEl: $("toc"),
  tocListEl: $("toc-list"),
  toggleBtn: $("btn-toc"),
  backdropEl: $("toc-backdrop"),
  scrollSync,
});

// ---- 目次⇄ファイルエクスプローラーのパネル切り替え ----
const tocSectionEl = $("toc-section");
const explorerSectionEl = $("explorer-section");
document.querySelectorAll(".toc-panel-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const isExplorer = btn.dataset.panel === "explorer";
    tocSectionEl.hidden = isExplorer;
    explorerSectionEl.hidden = !isExplorer;
    document.querySelectorAll(".toc-panel-btn").forEach((b) => b.classList.toggle("active", b === btn));
  });
});

// ---- 編集/プレビュー切替タブ（モバイルのみ表示） ----
const viewSwitchEl = $("view-switch");
const mainEl = $("main");
viewSwitchEl.querySelectorAll(".view-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    mainEl.classList.toggle("mobile-preview", btn.dataset.view === "preview");
    viewSwitchEl.querySelectorAll(".view-tab").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
  });
});

// リアルタイムプレビュー（200msデバウンス、仕様書3.2）
function updatePreviewMeta() {
  const charCount = (previewEl.textContent || "").replace(/\s+/g, "").length;
  if (charCount === 0) {
    previewMetaEl.hidden = true;
    return;
  }
  const minutes = Math.max(1, Math.round(charCount / 600));
  previewMetaEl.hidden = false;
  previewMetaEl.textContent = `${charCount.toLocaleString()}文字 ・ 約${minutes}分で読めます`;
}

function render() {
  const { html, headings } = renderMarkdown(cm.getValue());
  previewEl.innerHTML = html;
  toc.update(headings);
  updatePreviewMeta();
}
const renderDebounced = debounce(render, 200);
cm.on("change", renderDebounced);

// ---- 書式ツールバー（太字・斜体・見出し・リスト・引用・コード・表・リンク等） ----
const toolbarActions = initToolbar({
  cm,
  toolbarEl: $("format-toolbar"),
  charCountEl: $("char-count"),
  copyMdBtn: $("btn-copy-md"),
  copyRichBtn: $("btn-copy-rich"),
  previewEl,
});

// ---- エディタ/プレビューの表示モード（デスクトップ向け。モバイルは編集/
// プレビュー切替タブが同じ役割を果たすため、このグループ自体をCSSで非表示に
// している）。「エディタのみ」「分割」「プレビューのみ」の排他的な3状態 ----
const viewModeGroupEl = $("view-mode-group");
viewModeGroupEl.querySelectorAll(".view-mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    mainEl.classList.remove("preview-closed", "editor-closed");
    if (btn.dataset.mode === "editor") mainEl.classList.add("preview-closed");
    else if (btn.dataset.mode === "preview") mainEl.classList.add("editor-closed");
    viewModeGroupEl.querySelectorAll(".view-mode-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
    });
  });
});

// ---- タブ（複数ファイルの同時編集） ----
// swapDoc()はchangeイベントを発火しないため、タブ切替のたびに
// プレビュー・目次・文字数カウンター・スクロール位置を明示的に更新し直す。
const tabs = initTabs({
  cm,
  tabBarEl: $("tab-bar"),
  newTabBtn: $("btn-new-tab"),
  onActivate: () => {
    render();
    toolbarActions.refreshCharCount();
    scrollSync.syncNow();
    historyPanel.hidden = true;
  },
  onTabBarRender: () => updateTabScrollButtons(),
});

// ---- タブバーのスクロールボタン（タブがはみ出しているときだけ表示） ----
const tabBarEl = $("tab-bar");
const tabScrollLeftBtn = $("tab-scroll-left");
const tabScrollRightBtn = $("tab-scroll-right");

function updateTabScrollButtons() {
  const overflow = tabBarEl.scrollWidth > tabBarEl.clientWidth + 1;
  tabScrollLeftBtn.hidden = !overflow;
  tabScrollRightBtn.hidden = !overflow;
}

tabScrollLeftBtn.addEventListener("click", () => tabBarEl.scrollBy({ left: -150, behavior: "smooth" }));
tabScrollRightBtn.addEventListener("click", () => tabBarEl.scrollBy({ left: 150, behavior: "smooth" }));
new ResizeObserver(updateTabScrollButtons).observe(tabBarEl);

// ---- ファイルエクスプローラー（目次パネル内、フォルダを開いてMarkdown
// ファイルを新規タブとして開く。File System Access API対応ブラウザのみ） ----
initExplorer({
  treeEl: $("explorer-tree"),
  openFolderBtn: $("btn-open-folder"),
  emptyStateEl: $("explorer-empty"),
  tabs,
});

// ---- ファイル操作 ----
const files = initFiles({
  cm,
  tabs,
  fileInputEl: $("file-input"),
});

$("btn-open").addEventListener("click", () => files.openFile());
$("btn-save").addEventListener("click", () => files.saveFile());
$("btn-save-as").addEventListener("click", () => files.saveFileAs());
// 印刷（@media printでプレビューのみが印刷される。PDF保存にも利用可能）
$("btn-print").addEventListener("click", () => window.print());

// ---- 自動保存（設定で有効化。入力が止まって3秒後に上書き保存） ----
// ファイルハンドルを持つタブのみ対象（白紙タブで保存ダイアログが勝手に
// 開かないようにするため。silent指定で成功トーストも出さない）。
const autoSaveDebounced = debounce(() => {
  const tab = tabs.getActive();
  if (!settings.getPrefs().autoSave) return;
  if (!tab || !tab.fileHandle) return;
  if (tab.doc.isClean(tab.cleanGen)) return;
  files.saveFile({ silent: true });
}, 3000);
cm.on("change", autoSaveDebounced);

// ---- ペイン幅のドラッグ調整 ----
// 幅はCSS変数(--toc-width / --editor-pct)経由で適用する。インラインstyleを
// ペインに直接書かないことで、preview-closed等の表示モードCSSがそのまま効く。
const LAYOUT_KEY = "mdeditor.layout";
let layout = {};
try {
  layout = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "{}");
} catch {
  layout = {};
}

function applyLayout() {
  if (layout.tocWidth) mainEl.style.setProperty("--toc-width", `${layout.tocWidth}px`);
  if (layout.editorPct) mainEl.style.setProperty("--editor-pct", `${layout.editorPct}%`);
}
function saveLayout() {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  cm.refresh();
}
applyLayout();

initSplitter($("splitter-toc"), {
  onDrag: (clientX) => {
    const mainRect = mainEl.getBoundingClientRect();
    layout.tocWidth = Math.min(400, Math.max(160, Math.round(clientX - mainRect.left)));
    applyLayout();
  },
  onEnd: saveLayout,
});

initSplitter($("splitter-panes"), {
  onDrag: (clientX) => {
    const mainRect = mainEl.getBoundingClientRect();
    const editorLeft = $("editor-pane").getBoundingClientRect().left;
    const pct = ((clientX - editorLeft) / mainRect.width) * 100;
    layout.editorPct = Math.min(80, Math.max(20, Math.round(pct * 10) / 10));
    applyLayout();
  },
  onEnd: saveLayout,
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

// ---- 保存バージョン履歴（アクティブなタブ・このセッションのみメモリ保持） ----
const historyBtn = $("btn-history");
const historyPanel = $("history-panel");
const historyListEl = $("history-list");

function renderHistory() {
  historyListEl.textContent = "";
  const versions = tabs.getVersions();
  if (versions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "このタブの保存履歴はまだありません";
    historyListEl.appendChild(empty);
    return;
  }
  versions.forEach((v) => {
    const row = document.createElement("div");
    row.className = "history-item";

    const time = document.createElement("time");
    time.textContent = new Date(v.savedAt).toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    row.appendChild(time);

    const restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.textContent = "復元";
    restoreBtn.addEventListener("click", () => {
      tabs.restoreVersion(v);
      historyPanel.hidden = true;
    });
    row.appendChild(restoreBtn);

    historyListEl.appendChild(row);
  });
}

historyBtn.addEventListener("mousedown", (e) => e.preventDefault());
historyBtn.addEventListener("click", () => {
  const willOpen = historyPanel.hidden;
  if (willOpen) renderHistory();
  historyPanel.hidden = !willOpen;
});
document.addEventListener("click", (e) => {
  if (historyPanel.hidden) return;
  if (historyPanel.contains(e.target) || historyBtn.contains(e.target)) return;
  historyPanel.hidden = true;
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !historyPanel.hidden) historyPanel.hidden = true;
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

tabs.openInNewTab(WELCOME, "無題.md", null);

// ---- PWA: オフライン用Service Worker ----
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    // 登録に失敗してもアプリ本体の動作には影響しない
  });
}
