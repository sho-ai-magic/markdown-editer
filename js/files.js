// ファイルの読み込み・保存（仕様書3.3〜3.5）。開いたファイルは常に新しいタブ
// として追加する（タブの状態管理自体は tabs.js が担当する）。
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

export function initFiles({ cm, tabs, fileInputEl }) {
  async function loadFromFileObject(file, handle) {
    const text = await file.text(); // UTF-8として読み込む
    tabs.openInNewTab(text, file.name, handle);
  }

  // ---- 開く（常に新規タブとして追加。複数ファイルの同時選択にも対応） ----
  async function openFile() {
    if (hasFsAccess) {
      try {
        const handles = await window.showOpenFilePicker({ multiple: true, types: FILE_TYPES });
        for (const handle of handles) {
          await loadFromFileObject(await handle.getFile(), handle);
        }
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
    for (const file of Array.from(fileInputEl.files || [])) {
      await loadFromFileObject(file, null);
    }
  });

  // ---- 保存（常にアクティブなタブに対して行う） ----
  async function writeToHandle(handle, text) {
    const writable = await handle.createWritable();
    await writable.write(text); // 文字列はUTF-8で書き込まれる
    await writable.close();
  }

  async function saveFile() {
    const tab = tabs.getActive();
    if (!tab) return;
    if (!hasFsAccess) {
      downloadFallback(tab);
      return;
    }
    if (!tab.fileHandle) {
      await saveFileAs();
      return;
    }
    try {
      await writeToHandle(tab.fileHandle, cm.getValue());
      tabs.markActiveSaved(tab.fileHandle, tab.fileName);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      alert(`保存できませんでした: ${err.message}`);
    }
  }

  async function saveFileAs() {
    const tab = tabs.getActive();
    if (!tab) return;
    if (!hasFsAccess) {
      downloadFallback(tab);
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: tab.fileName,
        types: FILE_TYPES,
      });
      await writeToHandle(handle, cm.getValue());
      tabs.markActiveSaved(handle, handle.name);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      alert(`保存できませんでした: ${err.message}`);
    }
  }

  // File System Access API未対応ブラウザ: ダウンロード形式で保存
  function downloadFallback(tab) {
    const blob = new Blob([cm.getValue()], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = tab.fileName;
    a.click();
    URL.revokeObjectURL(a.href);
    tabs.markActiveSaved(null, null);
  }

  // ---- ドラッグ&ドロップ（仕様書3.5。複数ファイルの同時ドロップにも対応） ----
  // ブラウザ既定の「ドロップしたファイルをページとして開く」動作を必ず打ち消し、
  // エディタへの読み込みに差し替える（仕様書5章-5）。
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });
  window.addEventListener("drop", async (e) => {
    e.preventDefault();
    const items = e.dataTransfer && e.dataTransfer.items;
    const files = e.dataTransfer && e.dataTransfer.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let handle = null;
      const item = items && items[i];
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
    }
  });

  // ---- OSのファイル関連付けからの起動（仕様書3.4。複数ファイルにも対応） ----
  // インストール済みPWAが .md のハンドラに指定されている場合、
  // ダブルクリックで開かれたファイルが launchQueue 経由で渡ってくる。
  if ("launchQueue" in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
      for (const handle of launchParams.files || []) {
        await loadFromFileObject(await handle.getFile(), handle);
      }
    });
  }

  // ---- 閉じる前の確認（仕様書3.3。開いている全タブを横断して判定） ----
  window.addEventListener("beforeunload", (e) => {
    if (tabs.hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = ""; // ブラウザ標準の「保存せずに閉じてよいか」確認を出す
    }
  });

  return { openFile, saveFile, saveFileAs };
}
