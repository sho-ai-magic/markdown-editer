// ファイルの読み込み・保存・未保存管理（仕様書3.3〜3.5）。
// Chrome/Edge/ChromeOSでは File System Access API で上書き保存まで対応し、
// 未対応ブラウザ(Firefox/Safari)ではファイル選択ダイアログ+ダウンロード保存に
// フォールバックする。

const FILE_TYPES = [
  {
    description: "Markdownファイル",
    accept: { "text/markdown": [".md", ".markdown"], "text/plain": [".txt"] },
  },
];

const hasFsAccess =
  "showOpenFilePicker" in window && "showSaveFilePicker" in window;

export function initFiles({ cm, fileNameEl, dirtyMarkEl, fileInputEl }) {
  let fileHandle = null; // File System Access APIのハンドル（上書き保存用）
  let fileName = "無題.md";
  let cleanGeneration = cm.changeGeneration(true);

  function isDirty() {
    return !cm.isClean(cleanGeneration);
  }

  function refreshUi() {
    fileNameEl.textContent = fileName;
    dirtyMarkEl.hidden = !isDirty();
    document.title = `${isDirty() ? "● " : ""}${fileName} - Markdownエディタ`;
  }

  function markSaved() {
    cleanGeneration = cm.changeGeneration(true);
    refreshUi();
  }

  cm.on("change", refreshUi);

  // 未保存の変更を破棄してよいか確認する（別ファイルを開く前に呼ぶ）
  function confirmDiscard() {
    if (!isDirty()) return true;
    return window.confirm(
      `「${fileName}」には未保存の変更があります。\n保存せずに別のファイルを開きますか？`
    );
  }

  function setContent(text, name, handle) {
    fileHandle = handle || null;
    fileName = name || "無題.md";
    cm.setValue(text);
    cm.clearHistory();
    markSaved();
    cm.scrollTo(0, 0);
    cm.setCursor({ line: 0, ch: 0 });
  }

  async function loadFromFileObject(file, handle) {
    const text = await file.text(); // UTF-8として読み込む
    setContent(text, file.name, handle);
  }

  // ---- 開く ----
  async function openFile() {
    if (!confirmDiscard()) return;
    if (hasFsAccess) {
      try {
        const [handle] = await window.showOpenFilePicker({ types: FILE_TYPES });
        await loadFromFileObject(await handle.getFile(), handle);
      } catch (err) {
        if (err && err.name === "AbortError") return; // キャンセル
        alert(`ファイルを開けませんでした: ${err.message}`);
      }
    } else {
      fileInputEl.value = "";
      fileInputEl.click();
    }
  }

  fileInputEl.addEventListener("change", async () => {
    const file = fileInputEl.files && fileInputEl.files[0];
    if (file) await loadFromFileObject(file, null);
  });

  // ---- 保存 ----
  async function writeToHandle(handle) {
    const writable = await handle.createWritable();
    await writable.write(cm.getValue()); // 文字列はUTF-8で書き込まれる
    await writable.close();
  }

  async function saveFile() {
    if (!hasFsAccess) {
      downloadFallback();
      return;
    }
    if (!fileHandle) {
      await saveFileAs();
      return;
    }
    try {
      await writeToHandle(fileHandle);
      markSaved();
    } catch (err) {
      if (err && err.name === "AbortError") return;
      alert(`保存できませんでした: ${err.message}`);
    }
  }

  async function saveFileAs() {
    if (!hasFsAccess) {
      downloadFallback();
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: FILE_TYPES,
      });
      await writeToHandle(handle);
      fileHandle = handle;
      fileName = handle.name;
      markSaved();
    } catch (err) {
      if (err && err.name === "AbortError") return;
      alert(`保存できませんでした: ${err.message}`);
    }
  }

  // File System Access API未対応ブラウザ: ダウンロード形式で保存
  function downloadFallback() {
    const blob = new Blob([cm.getValue()], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
    markSaved();
  }

  // ---- ドラッグ&ドロップ（仕様書3.5） ----
  // ブラウザ既定の「ドロップしたファイルをページとして開く」動作を必ず打ち消し、
  // エディタへの読み込みに差し替える（仕様書5章-5）。
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("drop", async (e) => {
    e.preventDefault();
    const item = e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items[0];
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    if (!confirmDiscard()) return;
    let handle = null;
    if (item && typeof item.getAsFileSystemHandle === "function") {
      // 書き込み可能なハンドルを取れれば、上書き保存もできるようにする
      try {
        const h = await item.getAsFileSystemHandle();
        if (h && h.kind === "file") handle = h;
      } catch {
        handle = null;
      }
    }
    await loadFromFileObject(file, handle);
  });

  // ---- OSのファイル関連付けからの起動（仕様書3.4） ----
  // インストール済みPWAが .md のハンドラに指定されている場合、
  // ダブルクリックで開かれたファイルが launchQueue 経由で渡ってくる。
  if ("launchQueue" in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
      const handle = launchParams.files && launchParams.files[0];
      if (!handle) return;
      if (!confirmDiscard()) return;
      await loadFromFileObject(await handle.getFile(), handle);
    });
  }

  // ---- 閉じる前の確認（仕様書3.3） ----
  window.addEventListener("beforeunload", (e) => {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = ""; // ブラウザ標準の「保存せずに閉じてよいか」確認を出す
    }
  });

  refreshUi();
  return { openFile, saveFile, saveFileAs, setContent, isDirty };
}
