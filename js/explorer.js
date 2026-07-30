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
  '<svg class="icon" viewBox="0 -960 960 960" aria-hidden="true"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h207q16 0 30.5 6t25.5 17l57 57h320q33 0 56.5 23.5T880-640H447l-80-80H160v480Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>';
const FILE_ICON =
  '<svg class="icon" viewBox="0 -960 960 960" aria-hidden="true"><path d="M360-240h240q17 0 28.5-11.5T640-280q0-17-11.5-28.5T600-320H360q-17 0-28.5 11.5T320-280q0 17 11.5 28.5T360-240Zm0-160h240q17 0 28.5-11.5T640-440q0-17-11.5-28.5T600-480H360q-17 0-28.5 11.5T320-440q0 17 11.5 28.5T360-400ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h287q16 0 30.5 6t25.5 17l194 194q11 11 17 25.5t6 30.5v447q0 33-23.5 56.5T720-80H240Zm280-560v-160H240v640h480v-440H560q-17 0-28.5-11.5T520-640ZM240-800v200-200 640-640Z"/></svg>';
const CHEVRON_ICON =
  '<svg class="icon explorer-chevron" viewBox="0 -960 960 960" aria-hidden="true"><path d="M504-480 348-636q-11-11-11-28t11-28q11-11 28-11t28 11l184 184q6 6 8.5 13t2.5 15q0 8-2.5 15t-8.5 13L404-268q-11 11-28 11t-28-11q-11-11-11-28t11-28l156-156Z"/></svg>';

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
        '<svg class="icon" viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-120q-126 0-223-76.5T131-392q-4-15 6-27.5t27-14.5q16-2 29 6t18 24q24 90 99 147t170 57q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h70q17 0 28.5 11.5T360-600q0 17-11.5 28.5T320-560H160q-17 0-28.5-11.5T120-600v-160q0-17 11.5-28.5T160-800q17 0 28.5 11.5T200-760v54q51-64 124.5-99T480-840q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-480q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-120Zm40-376 100 100q11 11 11 28t-11 28q-11 11-28 11t-28-11L452-452q-6-6-9-13.5t-3-15.5v-159q0-17 11.5-28.5T480-680q17 0 28.5 11.5T520-640v144Z"/></svg><span></span>';
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
