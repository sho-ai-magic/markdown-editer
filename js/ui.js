// アプリ内デザインの通知・確認ダイアログ。
// OSネイティブの alert()/confirm() の代わりに使い、アプリの見た目に馴染む
// フィードバックを提供する（beforeunloadのネイティブ確認だけはブラウザ仕様上
// 置き換えられないため対象外）。

let toastContainer = null;

// 画面右下に数秒で消える通知を表示する。連続して呼ばれた場合は縦に積まれる。
export function toast(message, { type = "success", duration = 2600 } = {}) {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.setAttribute("role", "status");
  el.textContent = message;
  toastContainer.appendChild(el);
  // 追加した次のフレームで .show を付けてスライドインさせる
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    el.addEventListener("transitionend", () => el.remove(), { once: true });
    // transitionが発火しない環境でも確実に消す保険
    setTimeout(() => el.remove(), 600);
  }, duration);
}

// アプリ内デザインの確認モーダル。OKでtrue、キャンセル/Escape/背景クリックでfalse。
export function confirmDialog({ message, okLabel = "OK", cancelLabel = "キャンセル" }) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "confirm-overlay";
    overlay.innerHTML = `
      <div class="confirm-panel" role="dialog" aria-modal="true">
        <p class="confirm-message"></p>
        <div class="confirm-actions">
          <button type="button" class="confirm-cancel"></button>
          <button type="button" class="confirm-ok"></button>
        </div>
      </div>`;
    overlay.querySelector(".confirm-message").textContent = message;
    overlay.querySelector(".confirm-cancel").textContent = cancelLabel;
    overlay.querySelector(".confirm-ok").textContent = okLabel;

    function close(result) {
      window.removeEventListener("keydown", onKey, true);
      overlay.remove();
      resolve(result);
    }
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close(false);
      }
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });
    overlay.querySelector(".confirm-cancel").addEventListener("click", () => close(false));
    overlay.querySelector(".confirm-ok").addEventListener("click", () => close(true));
    window.addEventListener("keydown", onKey, true);

    document.body.appendChild(overlay);
    overlay.querySelector(".confirm-ok").focus();
  });
}
