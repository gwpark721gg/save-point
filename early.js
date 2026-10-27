// js-dos보다 먼저 실행되어야 하는 것들 (일반 스크립트로 불러온다)

// 아이폰에서는 콘솔을 볼 수 없으니 오류를 화면에 띄운다
function showError(msg) {
  // 마우스 잠금(pointer lock) 실패는 js-dos가 늘 내는 무해한 오류
  if (/lock\(\)|pointer lock/i.test(msg)) return;
  const loader = document.getElementById("loader");
  if (!loader || loader.hidden) {
    // 게임 중에는 화면을 가리지 않도록 위쪽에 작은 알림만
    const t = document.createElement("div");
    t.textContent = "오류: " + msg;
    t.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:20;padding:6px 16px;background:#600;color:#fff;font-size:12px";
    t.onclick = () => t.remove();
    document.body.appendChild(t);
    return;
  }
  const s = document.getElementById("status");
  s.style.color = "#ff8080";
  s.textContent = "오류: " + msg;
}
addEventListener("error", (e) => showError(e.message || String(e)));
addEventListener("unhandledrejection", (e) => showError(e.reason && e.reason.message || String(e.reason)));

// iOS는 터치 순간에만 소리를 허락한다. js-dos는 로딩 뒤에 AudioContext를 만들어서
// 잠긴 채로 남으므로, 만들어지는 컨텍스트를 모아 두었다가 다음 터치 때 깨운다.
(() => {
  const Orig = window.AudioContext || window.webkitAudioContext;
  if (!Orig) return;
  const contexts = [];
  window.AudioContext = window.webkitAudioContext = class extends Orig {
    constructor(...args) { super(...args); contexts.push(this); }
  };
  // 무음 스위치가 켜져 있어도 게임 소리는 나도록 (iOS 17+)
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
  function unlock() {
    for (const c of contexts) {
      if (c.state === "running") continue;
      c.resume();
      const src = c.createBufferSource();
      src.buffer = c.createBuffer(1, 1, 22050);
      src.connect(c.destination);
      src.start(0);
    }
  }
  for (const ev of ["touchend", "pointerup", "click", "keydown"]) addEventListener(ev, unlock, true);
})();
