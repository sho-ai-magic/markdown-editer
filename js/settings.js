// 設定の永続化（仕様書4章）: テーマとカスタム色をlocalStorageに保存し、
// 再起動後も保持する。

const THEME_KEY = "mdeditor.theme";
const COLORS_KEY = "mdeditor.colors";

// 既定値（仕様書4章の表）
export const COLOR_DEFAULTS = {
  heading: "#d9730d",
  list: "#2f8f4e",
  quote: "#8a8a8a",
  code: "#a13fbf",
  tableBorder: "#999999",
};

const COLOR_VARS = {
  heading: "--c-heading",
  list: "--c-list",
  quote: "--c-quote",
  code: "--c-code",
  tableBorder: "--c-table-border",
};

function loadColors() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLORS_KEY) || "{}");
    return { ...COLOR_DEFAULTS, ...saved };
  } catch {
    return { ...COLOR_DEFAULTS };
  }
}

export function initSettings({ overlayEl, panelEl, openBtn, closeBtn, resetBtn, themeBtn }) {
  const root = document.documentElement;

  // ---- カスタム色 ----
  let colors = loadColors();
  const inputs = panelEl.querySelectorAll("input[data-color-key]");

  function applyColors() {
    for (const [key, cssVar] of Object.entries(COLOR_VARS)) {
      root.style.setProperty(cssVar, colors[key]);
    }
    inputs.forEach((input) => {
      input.value = colors[input.dataset.colorKey];
    });
  }

  function saveColors() {
    localStorage.setItem(COLORS_KEY, JSON.stringify(colors));
  }

  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      colors[input.dataset.colorKey] = input.value;
      applyColors();
      saveColors();
    });
  });

  resetBtn.addEventListener("click", () => {
    colors = { ...COLOR_DEFAULTS };
    applyColors();
    saveColors();
  });

  // ---- 設定モーダルの開閉 ----
  openBtn.addEventListener("click", () => {
    overlayEl.hidden = false;
  });
  closeBtn.addEventListener("click", () => {
    overlayEl.hidden = true;
  });
  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) overlayEl.hidden = true;
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlayEl.hidden) overlayEl.hidden = true;
  });

  // ---- テーマ（ライト/ダーク） ----
  let theme = localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";

  function applyTheme() {
    root.dataset.theme = theme;
    // アイコンで現在の状態を示す: ライト=☀️ / ダーク=🌙
    themeBtn.textContent = theme === "dark" ? "🌙" : "☀️";
    themeBtn.title = theme === "dark" ? "ライトモードに切替" : "ダークモードに切替";
  }

  themeBtn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, theme);
    applyTheme();
  });

  applyColors();
  applyTheme();
}
