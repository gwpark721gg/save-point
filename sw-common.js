// 서비스 워커 공통 부분: 앱 본체를 캐시에 저장해 두고 먼저 꺼내 쓴다.
// 게임 파일과 세이브는 IndexedDB에 있으므로 여기서는 다루지 않는다.

// 모든 게임이 같이 쓰는 파일 (webapp 폴더 기준 경로)
const COMMON_SHELL = [
  "app.js",
  "app.css",
  "early.js",
  "js-dos/js-dos.js",
  "js-dos/js-dos.css",
  "js-dos/emulators/emulators.js",
  "js-dos/emulators/wdosbox-x.js",
  "js-dos/emulators/wdosbox-x.wasm",
];

function installShellCache(version, files) {
  self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(version).then((c) => c.addAll(files)).then(() => self.skipWaiting()));
  });
  self.addEventListener("activate", (e) => {
    // 같은 앱의 옛 버전 캐시만 지운다 (이름 앞부분이 같은 것)
    const prefix = version.replace(/-v\d+$/, "-v");
    e.waitUntil(
      caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k.startsWith(prefix) && k !== version).map((k) => caches.delete(k))))
        .then(() => self.clients.claim())
    );
  });
  // 저장해 둔 것을 먼저 쓰고, 없으면 인터넷으로 받는다
  self.addEventListener("fetch", (e) => {
    const url = new URL(e.request.url);
    if (e.request.method !== "GET" || url.origin !== location.origin) return;
    e.respondWith(
      caches.open(version).then((c) =>
        c.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request))
      )
    );
  });
}
