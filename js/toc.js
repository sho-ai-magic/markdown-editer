// 目次サイドバー: 見出し一覧の表示とジャンプ（仕様書3.6）。
//
// ジャンプの実装上の注意（仕様書5章-2, 5章-4）:
// - 「画面内に見えていれば何もしない」系のAPIには頼らず、対象位置の
//   座標を明示的に求めてスクロール位置を直接設定する
// - smoothスクロールは環境により実行されないことがあるため、即時スクロール

const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

export function initToc({ cm, previewPane, previewEl, tocEl, tocListEl, toggleBtn, backdropEl, scrollSync }) {
  // 目次の開閉。モバイルではオフキャンバスドロワー＋半透明の背景として扱う
  // （.hiddenの意味はデスクトップ・モバイル共通で「現在表示されていない」）
  function setOpen(open) {
    tocEl.classList.toggle("hidden", !open);
    if (backdropEl) backdropEl.classList.toggle("visible", open);
  }

  toggleBtn.addEventListener("click", () => setOpen(tocEl.classList.contains("hidden")));
  if (backdropEl) backdropEl.addEventListener("click", () => setOpen(false));

  // モバイルでは初期状態を閉じておく（デスクトップは従来通り開いた状態で起動）
  if (isMobile()) setOpen(false);

  let headings = [];

  function jumpTo(index) {
    const h = headings[index];
    if (!h) return;

    // ジャンプ直後の位置がスクロール連動(3.8)に上書きされないよう一時停止（仕様書5章-3の配慮）
    scrollSync.suspend();

    // 編集画面: 見出し行が一番上に来るよう座標を直接指定
    cm.scrollTo(null, cm.heightAtLine(h.line, "local"));
    cm.setCursor({ line: h.line, ch: 0 });

    // プレビュー画面: N番目の見出し要素のoffsetTopへ直接ジャンプ
    // （headings はプレビューDOMの h1〜h6 と同じ並び順）
    const els = previewEl.querySelectorAll("h1,h2,h3,h4,h5,h6");
    const el = els[index];
    if (el) previewPane.scrollTop = el.offsetTop;

    scrollSync.resume();

    // モバイルではジャンプ後にドロワーを自動で閉じ、編集/プレビューが見えるようにする
    if (isMobile()) setOpen(false);
  }

  function update(newHeadings) {
    headings = newHeadings;
    tocListEl.textContent = "";
    if (headings.length === 0) {
      const li = document.createElement("li");
      li.className = "toc-empty-msg";
      li.textContent = "見出しがありません";
      tocListEl.appendChild(li);
      return;
    }
    headings.forEach((h, i) => {
      const li = document.createElement("li");
      li.dataset.level = String(h.level);
      li.textContent = h.text || "(無題の見出し)";
      li.title = li.textContent;
      li.addEventListener("click", () => jumpTo(i));
      tocListEl.appendChild(li);
    });
  }

  return { update };
}
