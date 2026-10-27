// 이 게임을 홈 화면 앱으로 따로 설치했을 때, 앱 본체를 저장해 두고 인터넷 없이도 켜지게 한다.
// 파일을 고치면 VERSION을 올려야 아이폰이 새 파일을 받는다.
importScripts("../sw-common.js");
installShellCache("ft1-v1", [
  "./",
  "index.html",
  "game.js",
  "manifest.webmanifest",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  ...COMMON_SHELL.map((f) => "../" + f),
]);
