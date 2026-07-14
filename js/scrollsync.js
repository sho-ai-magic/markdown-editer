// スクロール連動（仕様書3.8）: 編集画面 → プレビュー画面の一方向のみ。
// 双方向にすると無限ループ等の原因になるため行わない（仕様書5章-3）。
//
// 位置合わせは「行番号の割合」方式:
//   1. 編集画面の一番上に見えている行番号を求める
//   2. 割合 = 行番号 ÷ (総行数 - 1)
//   3. プレビューの最大スクロール量 × 割合 をプレビューのスクロール位置にする

export function initScrollSync(cm, previewPane) {
  let suspended = false;
  let resumeTimer = null;

  cm.on("scroll", () => {
    if (suspended) return;
    const info = cm.getScrollInfo();
    const topLine = cm.lineAtHeight(info.top, "local");
    const totalLines = cm.lineCount();
    const ratio = totalLines > 1 ? topLine / (totalLines - 1) : 0;
    const maxScroll = previewPane.scrollHeight - previewPane.clientHeight;
    previewPane.scrollTop = Math.max(0, Math.min(1, ratio)) * Math.max(0, maxScroll);
  });

  return {
    // 目次ジャンプ処理中に連動が発火して位置を上書きしないよう一時停止する
    suspend() {
      suspended = true;
      clearTimeout(resumeTimer);
    },
    // scrollイベントは非同期に届くため、少し待ってから再開する
    resume() {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        suspended = false;
      }, 150);
    },
  };
}
