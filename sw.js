// オフライン動作用のService Worker。アプリ一式を事前キャッシュする。
// アプリのファイルを更新したら CACHE_VERSION を上げること。
const CACHE_VERSION = "mdeditor-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/editor.js",
  "./js/preview.js",
  "./js/toc.js",
  "./js/scrollsync.js",
  "./js/files.js",
  "./js/settings.js",
  "./js/toolbar.js",
  "./vendor/codemirror/codemirror.js",
  "./vendor/codemirror/codemirror.css",
  "./vendor/markdown-it.min.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(
      (cached) => cached || fetch(e.request)
    )
  );
});
