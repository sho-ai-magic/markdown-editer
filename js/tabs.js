// タブ管理: 複数のMarkdownファイルを同時に開けるようにする。
//
// CodeMirrorのインスタンス自体は1つのまま、タブごとに CodeMirror.Doc
// （本文・undo履歴・カーソル位置・選択範囲を保持する軽量なドキュメントモデル）
// を持たせ、タブ切替時に cm.swapDoc() で差し替える。CodeMirror 5がタブ型
// エディタ向けに公式に用意している方式で、undo履歴やカーソル位置がタブごとに
// 自然に独立する。
//
// 注意: swapDoc() は change イベントを発火しないため、タブ切替時のプレビュー
// 再描画・文字数カウンター・スクロール同期は呼び出し側の onActivate で
// 明示的に行う必要がある。

export function initTabs({ cm, tabBarEl, newTabBtn, onActivate }) {
  const tabs = [];
  let activeId = null;
  let idCounter = 0;

  function findTab(id) {
    return tabs.find((t) => t.id === id);
  }

  function getActive() {
    return findTab(activeId);
  }

  // 既存タブの名前と衝突しない「無題.md」「無題-2.md」…を割り当てる
  // （openInNewTabで開いた「無題.md」等、このモジュールの外で付けられた
  // 名前とも衝突しないよう、内部カウンタではなく現在のタブ一覧を見て決める）
  function uniqueBlankName() {
    let name = "無題.md";
    let n = 1;
    while (tabs.some((t) => t.fileName === name)) {
      n += 1;
      name = `無題-${n}.md`;
    }
    return name;
  }

  function renderTabBar() {
    tabBarEl.querySelectorAll(".tab-chip").forEach((el) => el.remove());
    tabs.forEach((t) => {
      const chip = document.createElement("div");
      chip.className = "tab-chip" + (t.id === activeId ? " active" : "");
      chip.dataset.tabId = String(t.id);
      chip.setAttribute("role", "tab");
      chip.setAttribute("aria-selected", t.id === activeId ? "true" : "false");

      const dot = document.createElement("span");
      dot.className = "tab-dirty-dot";
      dot.hidden = t.doc.isClean(t.cleanGen);
      chip.appendChild(dot);

      const nameBtn = document.createElement("button");
      nameBtn.className = "tab-select";
      nameBtn.textContent = t.fileName;
      nameBtn.title = t.fileName;
      nameBtn.addEventListener("click", () => activate(t.id));
      chip.appendChild(nameBtn);

      const closeBtn = document.createElement("button");
      closeBtn.className = "tab-close";
      closeBtn.title = "タブを閉じる";
      closeBtn.innerHTML =
        '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(t.id);
      });
      chip.appendChild(closeBtn);

      tabBarEl.insertBefore(chip, newTabBtn);
    });
  }

  // アクティブなタブの未保存●表示だけを更新する（キー入力のたびにタブバー
  // 全体を再構築するのは無駄が多いため、通常の変更ではここだけ更新する）
  function updateActiveDirtyDot() {
    const tab = getActive();
    if (!tab) return;
    const chip = tabBarEl.querySelector(`.tab-chip[data-tab-id="${tab.id}"]`);
    const dot = chip && chip.querySelector(".tab-dirty-dot");
    if (dot) dot.hidden = tab.doc.isClean(tab.cleanGen);
  }

  function saveScrollOf(tab) {
    if (!tab) return;
    const info = cm.getScrollInfo();
    tab.scrollTop = info.top;
    tab.scrollLeft = info.left;
  }

  function activate(id) {
    const tab = findTab(id);
    if (!tab || id === activeId) {
      renderTabBar();
      return;
    }
    saveScrollOf(getActive());
    cm.swapDoc(tab.doc);
    cm.scrollTo(tab.scrollLeft || 0, tab.scrollTop || 0);
    activeId = id;
    renderTabBar();
    onActivate();
  }

  function addTab(text, fileName, fileHandle) {
    const doc = new CodeMirror.Doc(text, "mdlite");
    const id = ++idCounter;
    const cleanGen = doc.changeGeneration(true);
    tabs.push({ id, doc, fileName, fileHandle, cleanGen, scrollTop: 0, scrollLeft: 0 });
    activate(id);
    return id;
  }

  function openInNewTab(text, fileName, fileHandle) {
    return addTab(text, fileName || "無題.md", fileHandle || null);
  }

  function newBlankTab() {
    return addTab("", uniqueBlankName(), null);
  }

  function confirmDiscard(tab) {
    if (tab.doc.isClean(tab.cleanGen)) return true;
    return window.confirm(
      `「${tab.fileName}」には未保存の変更があります。\n保存せずに閉じますか？`
    );
  }

  function closeTab(id) {
    const tab = findTab(id);
    if (!tab) return;
    if (!confirmDiscard(tab)) return;

    const index = tabs.indexOf(tab);
    tabs.splice(index, 1);

    if (tabs.length === 0) {
      newBlankTab(); // タブが0枚にならないよう、白紙タブを1枚開いておく
      return;
    }

    if (id === activeId) {
      const next = tabs[index] || tabs[index - 1];
      activate(next.id);
    } else {
      renderTabBar();
    }
  }

  function markActiveSaved(fileHandle, fileName) {
    const tab = getActive();
    if (!tab) return;
    if (fileHandle) tab.fileHandle = fileHandle;
    if (fileName) tab.fileName = fileName;
    tab.cleanGen = tab.doc.changeGeneration(true);
    renderTabBar();
  }

  function hasUnsavedChanges() {
    return tabs.some((t) => !t.doc.isClean(t.cleanGen));
  }

  cm.on("change", updateActiveDirtyDot);
  newTabBtn.addEventListener("click", () => newBlankTab());

  return {
    openInNewTab,
    newBlankTab,
    closeTab,
    getActive,
    markActiveSaved,
    hasUnsavedChanges,
  };
}
