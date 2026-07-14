// 書式ツールバー: 添付画像相当の11ボタン（太字・斜体・取り消し線・見出し・
// 箇条書き・番号付きリスト・タスクリスト・引用・コード・表・リンク）と、
// 文字数/概算トークン数カウンター、Markdown/リッチテキストのコピーを提供する。
//
// Markdownの記法を覚えなくても操作できるようにする狙い（非エンジニア想定）。
// 外部の書式編集ライブラリは使わず、CodeMirrorの選択範囲API上に薄く実装する。

// ボタンをmousedownした瞬間にエディタの選択範囲・フォーカスが失われるのを防ぐ
function preserveEditorFocus(btn) {
  btn.addEventListener("mousedown", (e) => e.preventDefault());
}

// インライン記号（**太字** など）でのトグル囲み
function wrapInline(cm, marker) {
  const selected = cm.getSelection();
  if (selected) {
    const wrapped =
      selected.startsWith(marker) &&
      selected.endsWith(marker) &&
      selected.length >= marker.length * 2;
    cm.replaceSelection(
      wrapped ? selected.slice(marker.length, selected.length - marker.length) : marker + selected + marker,
      "around"
    );
  } else {
    const cursor = cm.getCursor();
    cm.replaceRange(marker + marker, cursor);
    cm.setCursor({ line: cursor.line, ch: cursor.ch + marker.length });
  }
  cm.focus();
}

function getSelectedLineRange(cm) {
  return { startLine: cm.getCursor("from").line, endLine: cm.getCursor("to").line };
}

// 選択範囲内の各行（選択なしなら現在行）に変換関数を適用する
function mapSelectedLines(cm, fn) {
  const { startLine, endLine } = getSelectedLineRange(cm);
  cm.operation(() => {
    for (let i = startLine; i <= endLine; i++) {
      const line = cm.getLine(i);
      const next = fn(line);
      if (next !== line) {
        cm.replaceRange(next, { line: i, ch: 0 }, { line: i, ch: line.length });
      }
    }
  });
  cm.focus();
}

function selectedLinesText(cm) {
  const { startLine, endLine } = getSelectedLineRange(cm);
  const lines = [];
  for (let i = startLine; i <= endLine; i++) lines.push(cm.getLine(i));
  return lines;
}

function toggleBulletList(cm) {
  const already = selectedLinesText(cm).every((l) => /^[ \t]*[-*+] /.test(l) || l.trim() === "");
  mapSelectedLines(cm, (line) => {
    if (already) return line.replace(/^([ \t]*)[-*+] /, "$1");
    if (line.trim() === "" || /^[ \t]*[-*+] /.test(line)) return line;
    return `- ${line}`;
  });
}

function toggleNumberedList(cm) {
  const already = selectedLinesText(cm).every((l) => /^[ \t]*\d+\. /.test(l) || l.trim() === "");
  let n = 1;
  mapSelectedLines(cm, (line) => {
    if (already) return line.replace(/^([ \t]*)\d+\. /, "$1");
    if (line.trim() === "") return line;
    return `${n++}. ${line.replace(/^[ \t]*\d+\. /, "")}`;
  });
}

function toggleTaskList(cm) {
  const already = selectedLinesText(cm).every((l) => /^[ \t]*-\s\[[ xX]\] /.test(l) || l.trim() === "");
  mapSelectedLines(cm, (line) => {
    if (already) return line.replace(/^([ \t]*)-\s\[[ xX]\] /, "$1");
    if (/^[ \t]*-\s\[[ xX]\] /.test(line)) return line;
    if (/^[ \t]*[-*+] /.test(line)) return line.replace(/^([ \t]*)[-*+] /, "$1- [ ] ");
    return line.trim() === "" ? line : `- [ ] ${line}`;
  });
}

function toggleQuote(cm) {
  const already = selectedLinesText(cm).every((l) => /^> ?/.test(l) || l.trim() === "");
  mapSelectedLines(cm, (line) => {
    if (already) return line.replace(/^> ?/, "");
    return line.trim() === "" ? line : `> ${line}`;
  });
}

// 現在行の見出しレベルを なし→#→##→###→なし と巡回させる
function cycleHeading(cm) {
  const line = cm.getCursor().line;
  const text = cm.getLine(line);
  const match = text.match(/^(#{1,6}) /);
  let next;
  if (!match) next = `# ${text}`;
  else if (match[1].length < 3) next = `${"#".repeat(match[1].length + 1)} ${text.slice(match[0].length)}`;
  else next = text.slice(match[0].length);
  cm.replaceRange(next, { line, ch: 0 }, { line, ch: text.length });
  cm.focus();
}

function insertLink(cm) {
  const from = cm.getCursor("from");
  const selected = cm.getSelection();
  const label = selected || "リンクテキスト";
  const urlPlaceholder = "https://";
  cm.replaceSelection(`[${label}](${urlPlaceholder})`);
  // URL部分を選択状態にして、そのまま貼り付け/入力できるようにする
  const urlStart = from.ch + label.length + 3; // "[" + label + "]("
  cm.setSelection({ line: from.line, ch: urlStart }, { line: from.line, ch: urlStart + urlPlaceholder.length });
  cm.focus();
}

function insertTable(cm) {
  const cursor = cm.getCursor();
  const leading = cursor.ch === 0 ? "" : "\n";
  cm.replaceRange(
    `${leading}\n| 見出し1 | 見出し2 |\n| --- | --- |\n| セル | セル |\n\n`,
    cursor
  );
  cm.focus();
}

function insertCode(cm) {
  const selected = cm.getSelection();
  if (selected.includes("\n")) {
    const fenced = /^```\n[\s\S]*\n```$/.test(selected);
    cm.replaceSelection(
      fenced ? selected.replace(/^```\n/, "").replace(/\n```$/, "") : "```\n" + selected + "\n```",
      "around"
    );
    cm.focus();
  } else {
    wrapInline(cm, "`");
  }
}

// 文字数・概算トークン数（日本語などの全角文字は1文字≒1トークン、
// それ以外の半角英数字・記号は4文字≒1トークンという粗い目安で概算する）
const WIDE_CHAR_RE = new RegExp(
  "[" +
    "　-ヿ" + // CJK記号・ひらがな・カタカナ
    "㐀-鿿" + // CJK統合漢字（拡張A含む）
    "＀-￯" + // 全角英数字・記号
    "]",
  "g"
);

function updateCharCount(cm, el) {
  const text = cm.getValue();
  const chars = text.length;
  const wide = (text.match(WIDE_CHAR_RE) || []).length;
  const approxTokens = Math.round(wide + (chars - wide) / 4);
  el.textContent = `${chars.toLocaleString()}文字 / 約${approxTokens.toLocaleString()}トークン`;
}

function flashButton(btn, message) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = message;
  setTimeout(() => {
    btn.textContent = original;
    btn.disabled = false;
  }, 1200);
}

async function copyMarkdown(cm, btn) {
  try {
    await navigator.clipboard.writeText(cm.getValue());
    flashButton(btn, "コピーしました");
  } catch (err) {
    alert(`コピーできませんでした: ${err.message}`);
  }
}

// プレビューの描画結果をリッチテキスト(HTML)として、Markdownソースをプレーン
// テキストとして同時にクリップボードへ書き込む。貼り付け先がリッチテキストに
// 対応していれば書式付きで反映され（Googleドキュメント等）、非対応ならプレーン
// テキストにフォールバックする、というClipboard APIの標準挙動を利用する。
async function copyRichText(cm, previewEl, btn) {
  try {
    if (navigator.clipboard.write && window.ClipboardItem) {
      const item = new ClipboardItem({
        "text/html": new Blob([previewEl.innerHTML], { type: "text/html" }),
        "text/plain": new Blob([cm.getValue()], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
    } else {
      await navigator.clipboard.writeText(cm.getValue());
    }
    flashButton(btn, "コピーしました");
  } catch (err) {
    alert(`コピーできませんでした: ${err.message}`);
  }
}

export function initToolbar({ cm, toolbarEl, charCountEl, copyMdBtn, copyRichBtn, previewEl }) {
  const actions = {
    bold: () => wrapInline(cm, "**"),
    italic: () => wrapInline(cm, "*"),
    strike: () => wrapInline(cm, "~~"),
    heading: () => cycleHeading(cm),
    ul: () => toggleBulletList(cm),
    ol: () => toggleNumberedList(cm),
    task: () => toggleTaskList(cm),
    quote: () => toggleQuote(cm),
    code: () => insertCode(cm),
    table: () => insertTable(cm),
    link: () => insertLink(cm),
  };

  toolbarEl.querySelectorAll(".fmt-btn[data-fmt]").forEach((btn) => {
    preserveEditorFocus(btn);
    btn.addEventListener("click", () => actions[btn.dataset.fmt]?.());
  });

  const refreshCharCount = () => updateCharCount(cm, charCountEl);
  cm.on("change", refreshCharCount);
  refreshCharCount();

  preserveEditorFocus(copyMdBtn);
  preserveEditorFocus(copyRichBtn);
  copyMdBtn.addEventListener("click", () => copyMarkdown(cm, copyMdBtn));
  copyRichBtn.addEventListener("click", () => copyRichText(cm, previewEl, copyRichBtn));

  // Ctrl+B / Ctrl+I ショートカット（太字・斜体はよく使うため）
  return {
    bold: actions.bold,
    italic: actions.italic,
  };
}
