// ファイルエクスプローラー: フォルダを選択し、配下のMarkdownファイルをツリーから
// 開けるようにする。File System Access API (showDirectoryPicker) が必要なため、
// Chrome/Edge等の対応ブラウザのみで利用できる。
//
// 開いたフォルダのハンドルはIndexedDBに保存し、再読み込み後は
// 「前回のフォルダを開く」ボタンから再許可の確認を経て1クリックで復元できる。

import { toast } from "./ui.js";

const MD_EXTENSIONS = [".md", ".markdown", ".txt"];
const hasDirPicker = "showDirectoryPicker" in window;

// ---- IndexedDB: 前回開いたフォルダのハンドルを保存する（約30行の自前ヘルパー） ----
const DB_NAME = "mdeditor";
const STORE = "handles";
const LAST_FOLDER_KEY = "lastFolder";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function isMarkdownFile(name) {
  const lower = name.toLowerCase();
  return MD_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

const FOLDER_ICON =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H5z"/><path d="M3 8l1.5 10a2 2 0 0 0 2 1.7h11a2 2 0 0 0 2-1.7L21 8"/></svg>';
const FILE_ICON =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4"/></svg>';
const CHEVRON_ICON =
  '<svg class="icon explorer-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

export function initExplorer({ treeEl, openFolderBtn, emptyStateEl, tabs }) {
  if (!hasDirPicker) {
    emptyStateEl.textContent = "このブラウザではフォルダを開けません（Chrome/Edgeでご利用ください）";
    openFolderBtn.disabled = true;
    return {};
  }

  // フォルダ内のエントリを「フォルダ→ファイル、それぞれ名前順」で取得する。
  // Markdown以外のファイルはツリーから除外する。
  async function readEntries(dirHandle) {
    const folders = [];
    const files = [];
    for await (const entry of dirHandle.values()) {
      if (entry.kind === "directory") folders.push(entry);
      else if (isMarkdownFile(entry.name)) files.push(entry);
    }
    folders.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    files.sort((a, b) => a.name.localeCompare(b.name, "ja"));
    return [...folders, ...files];
  }

  async function openFile(fileHandle) {
    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      tabs.openInNewTab(text, file.name, fileHandle);
    } catch (err) {
      toast(`ファイルを開けませんでした: ${err.message}`, { type: "error" });
    }
  }

  function buildRow(entry, depth) {
    const li = document.createElement("li");
    li.className = "explorer-node";
    const row = document.createElement("div");
    row.className = "explorer-row";
    row.style.paddingLeft = `${depth * 16 + 8}px`;

    if (entry.kind === "directory") {
      row.classList.add("explorer-folder");
      row.innerHTML = `${CHEVRON_ICON}${FOLDER_ICON}<span class="explorer-name"></span>`;
      row.querySelector(".explorer-name").textContent = entry.name;
      row.title = entry.name;
      li.appendChild(row);

      const childUl = document.createElement("ul");
      childUl.className = "explorer-children hidden";
      li.appendChild(childUl);

      let loaded = false;
      row.addEventListener("click", async () => {
        const expanded = !childUl.classList.contains("hidden");
        if (expanded) {
          childUl.classList.add("hidden");
          row.classList.remove("expanded");
          return;
        }
        if (!loaded) {
          const children = await readEntries(entry);
          children.forEach((child) => childUl.appendChild(buildRow(child, depth + 1)));
          loaded = true;
        }
        childUl.classList.remove("hidden");
        row.classList.add("expanded");
      });
    } else {
      row.classList.add("explorer-file");
      row.innerHTML = `<span class="explorer-spacer"></span>${FILE_ICON}<span class="explorer-name"></span>`;
      row.querySelector(".explorer-name").textContent = entry.name;
      row.title = entry.name;
      row.addEventListener("click", () => openFile(entry));
      li.appendChild(row);
    }
    return li;
  }

  async function renderTree(dirHandle) {
    const entries = await readEntries(dirHandle);
    treeEl.textContent = "";
    entries.forEach((entry) => treeEl.appendChild(buildRow(entry, 0)));
    const isEmpty = entries.length === 0;
    treeEl.hidden = isEmpty;
    emptyStateEl.hidden = !isEmpty;
    if (isEmpty) emptyStateEl.textContent = "Markdownファイルが見つかりませんでした";
    if (restoreBtn) restoreBtn.hidden = true;
  }

  async function openRoot() {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      await renderTree(dirHandle);
      // 次回起動時に「前回のフォルダを開く」で復元できるよう保存する
      // （FileSystemDirectoryHandleはIndexedDBに保存可能。失敗しても機能自体は動くので黙殺）
      idbPut(LAST_FOLDER_KEY, dirHandle).catch(() => {});
    } catch (err) {
      if (err && err.name === "AbortError") return; // キャンセル
      toast(`フォルダを開けませんでした: ${err.message}`, { type: "error" });
    }
  }

  openFolderBtn.addEventListener("click", openRoot);

  // ---- 前回のフォルダの復元 ----
  // 保存済みハンドルがあれば「前回のフォルダを開く」ボタンを表示する。
  // クリック時に再許可を求め（ブラウザの仕様上、確認ダイアログが1回出る）、
  // 許可されればツリーを描画する。
  let restoreBtn = null;
  idbGet(LAST_FOLDER_KEY)
    .then((savedHandle) => {
      if (!savedHandle || typeof savedHandle.requestPermission !== "function") return;
      restoreBtn = document.createElement("button");
      restoreBtn.id = "btn-restore-folder";
      restoreBtn.className = "explorer-open-btn";
      restoreBtn.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg><span></span>';
      restoreBtn.querySelector("span").textContent = `前回のフォルダを開く: ${savedHandle.name}`;
      restoreBtn.title = savedHandle.name;
      restoreBtn.addEventListener("click", async () => {
        try {
          const perm = await savedHandle.requestPermission({ mode: "readwrite" });
          if (perm !== "granted") {
            toast("フォルダへのアクセスが許可されませんでした", { type: "error" });
            return;
          }
          await renderTree(savedHandle);
        } catch (err) {
          toast(`フォルダを開けませんでした: ${err.message}`, { type: "error" });
        }
      });
      openFolderBtn.insertAdjacentElement("afterend", restoreBtn);
    })
    .catch(() => {});

  return {};
}
