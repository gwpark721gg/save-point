// 게임 목록 앱(허브)으로 설치했을 때: 목록과 모든 게임의 앱 본체를 저장해 두고 인터넷 없이도 켜지게 한다.
// 파일을 고치거나 게임을 추가하면 VERSION을 올리고 GAMES에 폴더를 더한다.
importScripts("sw-common.js");
const GAMES = ["ft1"];
const PER_GAME = ["", "index.html", "game.js", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
installShellCache("hub-v1", [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-180.png",
  "icon-192.png",
  "icon-512.png",
  ...COMMON_SHELL,
  ...GAMES.flatMap((g) => PER_GAME.map((f) => `${g}/${f}`)),
]);
