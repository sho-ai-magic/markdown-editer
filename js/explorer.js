// ファイルエクスプローラー: フォルダを選択し、配下のMarkdownファイルをツリーから
// 開けるようにする。File System Access API (showDirectoryPicker) が必要なため、
// Chrome/Edge等の対応ブラウザのみで利用できる。
//
// 開いたフォルダはこのセッション内のみ保持する（アプリの再読み込みでは復元しない。
// 既存のタブが再読み込みで復元されないのと同じ設計方針）。

const MD_EXTENSIONS = [".md", ".markdown", ".txt"];
const hasDirPicker = "showDirectoryPicker" in window;

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
      alert(`ファイルを開けませんでした: ${err.message}`);
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

  async function openRoot() {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
      const entries = await readEntries(dirHandle);
      treeEl.textContent = "";
      entries.forEach((entry) => treeEl.appendChild(buildRow(entry, 0)));
      const isEmpty = entries.length === 0;
      treeEl.hidden = isEmpty;
      emptyStateEl.hidden = !isEmpty;
      if (isEmpty) emptyStateEl.textContent = "Markdownファイルが見つかりませんでした";
    } catch (err) {
      if (err && err.name === "AbortError") return; // キャンセル
      alert(`フォルダを開けませんでした: ${err.message}`);
    }
  }

  openFolderBtn.addEventListener("click", openRoot);

  return {};
}
