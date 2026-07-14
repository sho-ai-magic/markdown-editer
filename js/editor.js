// 編集画面: CodeMirror 5 の初期化と簡易シンタックスハイライト。
// オーバーレイ方式（透明textarea + 色付きレイヤー）はIME変換中の表示ズレを
// 起こすため使わない（仕様書5章-1）。CodeMirrorのモード機構に乗せる。

// 行頭パターンで行全体の色を決める簡易モード（仕様書3.1の表に対応）
CodeMirror.defineMode("mdlite", () => ({
  token(stream) {
    if (stream.sol()) {
      if (stream.match(/^#{1,6} /, false)) {
        stream.skipToEnd();
        return "md-heading";
      }
      if (stream.match(/^[ \t]*(?:[-*+]|\d+\.) /, false)) {
        stream.skipToEnd();
        return "md-list";
      }
      if (stream.peek() === ">") {
        stream.skipToEnd();
        return "md-quote";
      }
      if (stream.match(/^```/, false)) {
        stream.skipToEnd();
        return "md-code";
      }
    }
    stream.skipToEnd();
    return null;
  },
}));

export function createEditor(parentEl) {
  return CodeMirror(parentEl, {
    mode: "mdlite",
    lineNumbers: false,
    lineWrapping: true,
    autofocus: true,
    // ドロップされたファイルはアプリ側(files.js)で処理する
    dragDrop: false,
  });
}
