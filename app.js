// 게임 공통 실행기: 게임 폴더의 game.js 설정을 받아 시작 화면·저장·터치·에뮬레이터를 꾸린다.
// Win95 게임 기준 (Win95.img를 C:, 게임 이미지를 D:로 붙여 부팅)

const q = (s) => document.querySelector(s);
const status = (t) => { const s = q("#status"); s.style.color = ""; s.textContent = t; console.log(t); };
function toast(text, ms = 1500) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
const MB = (n) => (n / 1048576).toFixed(0) + "MB";
const bytes = (s) => new TextEncoder().encode(s);
const fromBase64 = (b) => Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
const JSDOS = new URL("js-dos/emulators/", import.meta.url).href;

// DGGL 런처(W95KR_Daum_Final)가 만들던 dosbox.conf를 DOSBox-X 형식으로 옮긴 것
const DOSBOX_CONF = `
[sdl]
autolock=true

[dosbox]
machine=svga_s3
memsize=64
vmemsize=4

[cpu]
core=normal
cputype=pentium
cycles=max

[render]
aspect=false

[sblaster]
sbtype=sb16
sbbase=220
irq=7
dma=1
hdma=5
oplmode=auto

[midi]
mpu401=intelligent

[speaker]
pcspeaker=true

[voodoo]
voodoo_card=false

[ide, primary]
enable=true

[ide, secondary]
enable=true

[autoexec]
@echo off
mount Y .
Y:
start.bat
`;

// js-dos의 autoexec는 copy 이후 줄을 실행하지 않아서, 나머지는 배치 파일로 돌린다
const startBat = (game) => [
  "@echo off",
  // CD(cue)를 IDE에 붙이면 Win95 부팅이 멈춤. CD 없이 돌고 음악은 MIDI로 낸다
  `imgmount C Y:\\win95.img -t hdd -fs fat -size ${game.win95Geometry} -ide 1m`,
  `imgmount D Y:\\game.img -t hdd -fs fat -size ${game.gameGeometry} -ide 1s`,
  "copy Y:\\GAME.REG C:\\GAME.REG",
  "copy Y:\\GAME.TXT C:\\GAME.TXT",
  "copy Y:\\AUTOEXEC.BAT C:\\AUTOEXEC.BAT",
  "copy Y:\\DX.REG C:\\DX.REG",
  "boot -l C",
  "",
].join("\r\n");

// Win95 이미지 안의 AUTOEXEC.BAT를 대신함 (원본에서 화면 지우기만 뺐다)
const AUTOEXEC_BAT = [
  "@ECHO OFF", "cd windows", "regedit c:\\dx.reg > nul", "cd..",
  "if exist c:\\autorun.bat call c:\\autorun.bat", "c:", "win", "",
].join("\r\n");

// ---------- 저장소 (IndexedDB) ----------
// files: 저장 키 -> Blob,  saves: 게임id -> 세이브 조각 기록
// Win95 이미지처럼 여러 게임이 같이 쓰는 파일은 shared 이름으로 한 번만 저장한다
// (게임 목록 앱 하나로 쓰면 게임마다 250MB씩 아낄 수 있다)
const fileKey = (game, key) => (game.files[key].shared ? `shared/${game.files[key].shared}` : `${game.id}/${key}`);
function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("retro-games", 1);
    r.onupgradeneeded = () => { r.result.createObjectStore("files"); r.result.createObjectStore("saves"); };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function dbGet(store, key) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function dbPut(store, key, value) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- 세이브: 게임 이미지에서 바뀐 4KB 조각만 저장 ----------
// 세이브는 game.img(D:) 안에 쓰이므로, 원본과 달라진 조각만 골라 두었다가 다음 실행 때 덮어쓴다
const CHUNK = 4096;
function chunkHashes(img) {
  const words = new Int32Array(img.buffer, img.byteOffset, img.byteLength >> 2);
  const per = CHUNK >> 2, n = Math.ceil(words.length / per);
  const out = new Int32Array(n);
  for (let c = 0; c < n; c++) {
    let h = -2128831035 ^ c;
    for (let i = c * per, end = Math.min(words.length, i + per); i < end; i++) h = Math.imul(h ^ words[i], 16777619);
    out[c] = h;
  }
  return out;
}
function applySave(img, save) {
  if (!save) return;
  for (let k = 0; k < save.idx.length; k++) {
    const off = save.idx[k] * CHUNK;
    img.set(save.data.subarray(k * CHUNK, k * CHUNK + Math.min(CHUNK, img.length - off)), off);
  }
}
function diffSave(img, origHashes) {
  const now = chunkHashes(img);
  const idx = [];
  for (let c = 0; c < now.length; c++) if (now[c] !== origHashes[c]) idx.push(c);
  const data = new Uint8Array(idx.length * CHUNK);
  idx.forEach((c, k) => data.set(img.subarray(c * CHUNK, Math.min(img.length, c * CHUNK + CHUNK)), k * CHUNK));
  return { idx: Uint32Array.from(idx), data, savedAt: Date.now() };
}
const sameSave = (a, b) => a && b && a.idx.length === b.idx.length && a.data.length === b.data.length &&
  a.idx.every((v, i) => v === b.idx[i]) && a.data.every((v, i) => v === b.data[i]);

// 백업 파일: [헤더 길이 u32][헤더 JSON][조각 번호 u32 * n][조각 데이터]
function encodeBackup(game, save) {
  const head = bytes(JSON.stringify({ magic: "retro-save", game: game.id, count: save.idx.length, chunk: CHUNK, savedAt: save.savedAt }));
  const len = new Uint32Array([head.length]);
  return new Blob([len, head, save.idx, save.data], { type: "application/octet-stream" });
}
async function decodeBackup(game, file) {
  const buf = await file.arrayBuffer();
  const len = new DataView(buf).getUint32(0, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len)));
  if (head.magic !== "retro-save" || head.game !== game.id) throw new Error("이 게임의 세이브 백업 파일이 아닙니다");
  const at = 4 + len;
  const idx = new Uint32Array(buf.slice(at, at + head.count * 4));
  const data = new Uint8Array(buf.slice(at + head.count * 4, at + head.count * 4 + head.count * CHUNK));
  return { idx, data, savedAt: head.savedAt };
}

// ---------- 시작 화면 ----------
function renderLoader(game) {
  document.body.insertAdjacentHTML("afterbegin", `
<div id="loader">
  <img class="icon" src="${game.icon}" alt="">
  <h1></h1>
  <div class="info" id="filesInfo">확인 중…</div>
  <select id="version" aria-label="실행 버전"></select>
  <button id="start" class="primary" disabled>시작</button>
  <div id="bar" hidden><div></div></div>
  <div id="status"></div>
  <div class="row">
    <button id="importBtn">게임 파일 가져오기</button>
    <button id="devBtn" hidden>PC에서 받기</button>
  </div>
  <div class="info" id="saveInfo"></div>
  <div class="row">
    <button id="backupBtn">세이브 백업</button>
    <button id="restoreBtn">세이브 복원</button>
  </div>
  <input type="file" id="importInput" multiple hidden>
  <input type="file" id="restoreInput" hidden>
</div>
<button id="saveBtn" hidden>저장</button>
<div id="dos"></div>`);
  q("#loader h1").textContent = game.title;
  // 게임 목록(허브)에서 들어왔을 때만 돌아가기 버튼 (게임별 아이콘으로 설치했을 때는 목록이 앱 밖이라 숨긴다)
  if (new URLSearchParams(location.search).has("hub")) {
    q("#loader").insertAdjacentHTML("afterbegin",
      `<a href="../" style="position:absolute;top:calc(env(safe-area-inset-top) + 12px);left:16px;color:#4a9eff;text-decoration:none;font-size:15px">← 게임 목록</a>`);
  }
  for (const v of game.versions) q("#version").append(new Option(v.label, v.exe));
  q("#version").hidden = game.versions.length < 2;
}

async function refreshInfo(game) {
  const have = await Promise.all(Object.keys(game.files).map((k) => dbGet("files", fileKey(game, k))));
  const ready = have.every(Boolean);
  q("#start").disabled = !ready;
  q("#filesInfo").textContent = ready
    ? `게임 파일 준비됨 (${MB(have.reduce((s, b) => s + b.size, 0))})`
    : `게임 파일이 없습니다. ${Object.values(game.files).map((f) => f.names.at(-1)).join(", ")}을(를) 가져와 주세요.`;
  const save = await dbGet("saves", game.id);
  q("#saveInfo").textContent = save
    ? `세이브: ${new Date(save.savedAt).toLocaleString("ko-KR")} 저장`
    : "세이브: 아직 없음";
  q("#backupBtn").disabled = !save;
  try { q("#version").value = localStorage.getItem(game.id + ".exe") || game.versions[0].exe; } catch (e) {}
}

function wireLoader(game) {
  const refresh = () => refreshInfo(game).catch((err) => showError(err.message));
  async function storeFile(key, blob) {
    status(`저장 중: ${key} (${MB(blob.size)})`);
    await dbPut("files", fileKey(game, key), blob);
  }

  // "파일" 앱에서 고른 파일을 이름이나 크기로 알아보고 저장
  q("#importBtn").onclick = () => q("#importInput").click();
  q("#importInput").onchange = async (e) => {
    const picked = [...e.target.files];
    e.target.value = "";
    try {
      let n = 0;
      for (const f of picked) {
        const key = Object.keys(game.files).find((k) => {
          const spec = game.files[k];
          return spec.size === f.size || spec.names.includes(f.name.toLowerCase());
        });
        if (!key) { toast(`알 수 없는 파일: ${f.name}`, 3000); continue; }
        await storeFile(key, f);
        n++;
      }
      status(n ? `${n}개 파일을 저장했어요` : "");
    } catch (err) {
      showError(err.message);
    }
    refresh();
  };

  // 같은 와이파이로 PC에서 시험할 때: dev-games 폴더에서 받아 저장
  q("#devBtn").onclick = async () => {
    q("#bar").hidden = false;
    try {
      for (const [key, spec] of Object.entries(game.files)) {
        status(`PC에서 받는 중: ${key}`);
        const res = await fetch(game.devBase + spec.devName);
        if (!res.ok) throw new Error(`${key}: ${res.status}`);
        const total = +res.headers.get("content-length");
        const reader = res.body.getReader();
        const parts = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          got += value.length;
          q("#bar > div").style.width = (got / total * 100).toFixed(1) + "%";
        }
        await storeFile(key, new Blob(parts));
      }
      status("PC에서 받아 저장했어요");
    } catch (err) {
      showError(err.message);
    }
    q("#bar").hidden = true;
    refresh();
  };

  q("#backupBtn").onclick = async () => {
    const save = await dbGet("saves", game.id);
    if (!save) return;
    const d = new Date(save.savedAt);
    const p2 = (n) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(encodeBackup(game, save));
    a.download = `${game.title} 세이브 ${stamp}.retrosave`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  };
  q("#restoreBtn").onclick = () => q("#restoreInput").click();
  q("#restoreInput").onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    try {
      const save = await decodeBackup(game, f);
      if (!confirm(`${new Date(save.savedAt).toLocaleString("ko-KR")} 세이브로 되돌릴까요? 지금 세이브는 덮어씁니다.`)) return;
      await dbPut("saves", game.id, save);
      status("세이브를 복원했어요");
    } catch (err) {
      showError(err.message);
    }
    refresh();
  };

  q("#start").onclick = () => start(game);

  // PC 개발 서버로 열었을 때만 "PC에서 받기"를 보여 준다
  const first = Object.values(game.files)[0];
  fetch(game.devBase + first.devName, { method: "HEAD" }).then((r) => { if (r.ok) q("#devBtn").hidden = false; }).catch(() => {});
  refresh();
}

// ---------- 게임 실행 ----------
async function start(game) {
  q("#start").disabled = true;
  try {
    const exe = q("#version").value;
    try { localStorage.setItem(game.id + ".exe", exe); } catch (e) {}
    status("게임 파일 여는 중…");
    const win95 = new Uint8Array(await (await dbGet("files", fileKey(game, "win95.img"))).arrayBuffer());
    const img = new Uint8Array(await (await dbGet("files", fileKey(game, "game.img"))).arrayBuffer());
    const origHashes = chunkHashes(img);
    const lastSave = await dbGet("saves", game.id);
    applySave(img, lastSave);

    const initFs = [
      { path: "win95.img", contents: win95 },
      { path: "game.img", contents: img },
      { path: "GAME.REG", contents: bytes(game.gameReg) },
      { path: "GAME.TXT", contents: bytes(game.gameTxt(exe)) },
      { path: "DX.REG", contents: fromBase64(game.dxRegBase64) },
      { path: "AUTOEXEC.BAT", contents: bytes(AUTOEXEC_BAT) },
      { path: "start.bat", contents: bytes(startBat(game)) },
    ];
    status("에뮬레이터 시작 중…");
    q("#loader").hidden = true;
    navigator.storage?.persist?.();

    // initFs는 js-dos가 나중에 읽어 가므로 여기서 비우면 안 된다
    window.dos = Dos(q("#dos"), {
      pathPrefix: JSDOS,
      backend: "dosboxX",
      backendLocked: true,
      dosboxConf: DOSBOX_CONF,
      initFs,
      autoStart: true,
      noCloud: true,
      noNetworking: true,
      kiosk: true,
      onEvent: (e, ci) => {
        if (e !== "ci-ready") return;
        window.ci = ci;
        installTouch(ci);
        installSaving(game, ci, origHashes, lastSave);
      },
    });
  } catch (err) {
    q("#loader").hidden = false;
    showError(err.message);
    q("#start").disabled = false;
  }
}

// 1분마다, 앱을 벗어날 때, 저장 버튼을 누를 때 세이브를 IndexedDB에 저장
function installSaving(game, ci, origHashes, lastSave) {
  let busy = false;
  async function sync(manual) {
    if (busy) return;
    busy = true;
    try {
      const img = await ci.fsReadFile("game.img");
      const save = diffSave(img, origHashes);
      if (!sameSave(save, lastSave)) {
        await dbPut("saves", game.id, save);
        lastSave = save;
        toast("세이브 저장됨");
      } else if (manual) {
        toast("바뀐 세이브 없음");
      }
    } catch (err) {
      showError("세이브 저장 실패: " + err.message);
    } finally {
      busy = false;
    }
  }
  setInterval(() => sync(false), 60000);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") sync(false); });
  addEventListener("pagehide", () => sync(false));
  const btn = q("#saveBtn");
  btn.hidden = false;
  btn.onclick = () => sync(true);
}

// 터치 조작: js-dos 기본 터치는 왼쪽 클릭만 되므로 직접 처리한다.
//   탭 = 왼쪽 클릭, 길게 누르기·두 손가락 탭 = 오른쪽 클릭, 누른 채 끌기 = 드래그
const LEFT = 0, RIGHT = 1;            // js-dos sendMouseButton 번호
const LONG_PRESS_MS = 500, DRAG_PX = 12;
function installTouch(ci) {
  const root = q("#dos");
  const touches = new Map();          // pointerId -> {x, y}
  let primary = null;                 // {id, x0, y0, timer, mode: "tap"|"drag"|"done"}

  // 화면 좌표를 0~1 게임 좌표로 바꾼다. 아이폰 Safari는 주소창 때문에 화면 높이가 둘로 잡혀서
  // 여백을 계산하면 어긋나므로, js-dos가 실제로 놓은 캔버스의 위치를 그대로 쓴다
  function gameRect() {
    let best = null, area = 0;
    for (const c of root.querySelectorAll("canvas")) {
      const r = c.getBoundingClientRect();
      if (r.width * r.height > area) { area = r.width * r.height; best = r; }
    }
    return best;
  }
  function toGame(cx, cy) {
    const r = gameRect();
    const x = (cx - r.left) / r.width;
    const y = (cy - r.top) / r.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  }
  // PS/2 마우스는 한 번에 ±255픽셀까지만 움직여서, 큰 이동은 작은 걸음으로 나눠 보낸다
  const STEP_PX = 80, STEP_MS = 20;
  let last = { x: 0.5, y: 0.5 };
  let moving = Promise.resolve();
  function moveTo(e) {
    const to = toGame(e.clientX, e.clientY);
    moving = moving.then(async () => {
      const from = last;
      const px = Math.max(Math.abs(to.x - from.x) * ci.width(), Math.abs(to.y - from.y) * ci.height());
      const steps = Math.max(1, Math.ceil(px / STEP_PX));
      for (let i = 1; i <= steps; i++) {
        ci.sendMouseMotion(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
        if (steps > 1) await new Promise((r) => setTimeout(r, STEP_MS));
      }
      last = to;
    });
    return moving;
  }
  function click(button) {
    moving = moving.then(async () => {
      await new Promise((r) => setTimeout(r, STEP_MS));
      ci.sendMouseButton(button, true);
      await new Promise((r) => setTimeout(r, 60));
      ci.sendMouseButton(button, false);
    });
  }
  function rightClick() {
    click(RIGHT);
    if (navigator.vibrate) navigator.vibrate(20);
    toast("오른쪽 클릭", 600);
  }

  const isOurs = (e) => e.pointerType === "touch" && root.contains(e.target);
  addEventListener("pointerdown", (e) => {
    if (!isOurs(e)) return;
    e.stopPropagation(); e.preventDefault();
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 1) {
      moveTo(e);
      primary = { id: e.pointerId, x0: e.clientX, y0: e.clientY, mode: "tap" };
      primary.timer = setTimeout(() => {
        if (primary && primary.mode === "tap") { primary.mode = "done"; rightClick(); }
      }, LONG_PRESS_MS);
    } else if (touches.size === 2 && primary && primary.mode === "tap") {
      // 두 손가락 탭
      clearTimeout(primary.timer);
      primary.mode = "done";
      rightClick();
    }
  }, true);
  addEventListener("pointermove", (e) => {
    if (!isOurs(e) || !touches.has(e.pointerId)) return;
    e.stopPropagation(); e.preventDefault();
    if (!primary || e.pointerId !== primary.id) return;
    if (primary.mode === "tap" && Math.hypot(e.clientX - primary.x0, e.clientY - primary.y0) > DRAG_PX) {
      clearTimeout(primary.timer);
      primary.mode = "drag";
      moving = moving.then(() => ci.sendMouseButton(LEFT, true));
    }
    if (primary.mode === "drag") moveTo(e);
  }, true);
  const end = (e) => {
    if (!touches.has(e.pointerId)) return;
    e.stopPropagation(); e.preventDefault();
    touches.delete(e.pointerId);
    if (!primary || e.pointerId !== primary.id) return;
    clearTimeout(primary.timer);
    if (primary.mode === "tap" && e.type === "pointerup") click(LEFT);
    if (primary.mode === "drag") { moveTo(e); moving = moving.then(() => ci.sendMouseButton(LEFT, false)); }
    primary = null;
  };
  addEventListener("pointerup", end, true);
  addEventListener("pointercancel", end, true);
  // 터치 이벤트도 js-dos에 넘기지 않음 (중복 클릭·확대 방지)
  for (const ev of ["touchstart", "touchmove", "touchend"]) {
    addEventListener(ev, (e) => { if (root.contains(e.target)) { e.stopPropagation(); e.preventDefault(); } }, { capture: true, passive: false });
  }
}

export function boot(game) {
  renderLoader(game);
  wireLoader(game);
  // https에서만 동작: 앱 본체를 저장해 두고 오프라인에서도 켜지게
  if ("serviceWorker" in navigator && isSecureContext) navigator.serviceWorker.register("sw.js").catch(() => {});
}
