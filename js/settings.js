// 設定の永続化（仕様書4章）: テーマとカスタム色をlocalStorageに保存し、
// 再起動後も保持する。

const THEME_KEY = "mdeditor.theme";
const COLORS_KEY = "mdeditor.colors";
const PREFS_KEY = "mdeditor.prefs";

// 一般設定の既定値（自動保存・エディタの表示）
export const PREF_DEFAULTS = {
  autoSave: false,
  fontSize: 14,
  lineHeight: 1.6,
};

// 既定値（仕様書4章の表）
export const COLOR_DEFAULTS = {
  heading: "#d9730d",
  list: "#2f8f4e",
  quote: "#8a8a8a",
  code: "#a13fbf",
  tableBorder: "#999999",
  rpAccent1: "#6366f1",
  rpAccent2: "#a855f7",
};

const COLOR_VARS = {
  heading: "--c-heading",
  list: "--c-list",
  quote: "--c-quote",
  code: "--c-code",
  tableBorder: "--c-table-border",
  rpAccent1: "--rp-accent-1",
  rpAccent2: "--rp-accent-2",
};

function loadColors() {
  try {
    const saved = JSON.parse(localStorage.getItem(COLORS_KEY) || "{}");
    return { ...COLOR_DEFAULTS, ...saved };
  } catch {
    return { ...COLOR_DEFAULTS };
  }
}

function loadPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
    return { ...PREF_DEFAULTS, ...saved };
  } catch {
    return { ...PREF_DEFAULTS };
  }
}

export function initSettings({ overlayEl, panelEl, openBtn, closeBtn, resetBtn, themeBtn, onPrefsChange }) {
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

  // ---- 一般設定（自動保存・エディタの表示） ----
  // 色と同じパターン: data-pref-key属性を持つ入力欄を自動で拾い、変更を即保存する。
  let prefs = loadPrefs();
  const prefInputs = panelEl.querySelectorAll("[data-pref-key]");

  function applyPrefs() {
    root.style.setProperty("--editor-font-size", `${prefs.fontSize}px`);
    root.style.setProperty("--editor-line-height", String(prefs.lineHeight));
    prefInputs.forEach((input) => {
      const key = input.dataset.prefKey;
      if (input.type === "checkbox") input.checked = !!prefs[key];
      else input.value = prefs[key];
    });
    if (onPrefsChange) onPrefsChange(prefs);
  }

  function savePrefs() {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }

  prefInputs.forEach((input) => {
    input.addEventListener("change", () => {
      const key = input.dataset.prefKey;
      if (input.type === "checkbox") {
        prefs[key] = input.checked;
      } else {
        const num = Number(input.value);
        const min = Number(input.min);
        const max = Number(input.max);
        if (Number.isNaN(num)) {
          input.value = prefs[key]; // 不正入力は元に戻す
          return;
        }
        prefs[key] = Math.min(max, Math.max(min, num));
      }
      applyPrefs();
      savePrefs();
    });
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
    // 太陽/月のアイコン表示切り替えはCSS側（[data-theme]セレクタ）で行う
    themeBtn.title = theme === "dark" ? "ライトモードに切替" : "ダークモードに切替";
  }

  themeBtn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, theme);
    applyTheme();
  });

  applyColors();
  applyPrefs();
  applyTheme();

  return {
    getPrefs: () => ({ ...prefs }),
  };
}
