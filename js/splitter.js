// ペイン幅ドラッグ調整の汎用ヘルパー。
// スプリッター要素のpointerイベントを監視し、ドラッグ中のX座標を
// コールバックへ渡す。幅の計算・適用は呼び出し側が行う。

export function initSplitter(handleEl, { onDrag, onEnd }) {
  let dragging = false;

  handleEl.addEventListener("pointerdown", (e) => {
    dragging = true;
    handleEl.setPointerCapture(e.pointerId);
    handleEl.classList.add("dragging");
    document.body.classList.add("splitter-dragging");
    e.preventDefault();
  });

  handleEl.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    onDrag(e.clientX);
  });

  function stop(e) {
    if (!dragging) return;
    dragging = false;
    if (handleEl.hasPointerCapture?.(e.pointerId)) handleEl.releasePointerCapture(e.pointerId);
    handleEl.classList.remove("dragging");
    document.body.classList.remove("splitter-dragging");
    if (onEnd) onEnd();
  }
  handleEl.addEventListener("pointerup", stop);
  handleEl.addEventListener("pointercancel", stop);
}
