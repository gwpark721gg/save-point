// 파랜드 택틱스 1 (DGGL FT1_Win95_230726, 런처 W95KR_Daum_Final)
export default {
  id: "ft1",
  title: "파랜드 택틱스 1",
  icon: "icon-180.png",
  devBase: "../dev-games/ft1/",
  // 크기로도 알아보므로 DGGL 폴더의 원래 이름(Win95.img, image.img)을 그대로 골라도 된다
  files: {
    "win95.img": { size: 252371456, names: ["win95.img"], devName: "win95.img", shared: "W95KR_Daum_Final.img" },
    "game.img": { size: 235856384, names: ["game.img", "image.img"], devName: "game.img" },
  },
  win95Geometry: "512,63,16,489",
  gameGeometry: "512,63,8,914",
  // DG_9xOpt 000~003 (디버그판 FtD_*는 원본과 디버그 스위치 1바이트만 다르다)
  versions: [
    { exe: "FtO_O.exe", label: "원본" },
    { exe: "FtO_OV.exe", label: "음성 패치" },
    { exe: "FtO_D.exe", label: "난이도 상향" },
    { exe: "FtO_DV.exe", label: "음성 패치 + 난이도 상향" },
  ],
  // C:\GAME.REG — 음원은 CD를 쓰지 않으므로 MIDI(1)
  gameReg: [
    "REGEDIT4", "",
    "[HKEY_CURRENT_USER\\SOFTWARE\\TGL\\Farland Tactics\\Main]",
    '"EmulationMode"=dword:00000000',
    '"MusicDevice"=dword:00000001',
    '"FullScreenMode"=dword:00000001',
    '"SilenceEffect"=dword:00000000', "",
  ].join("\r\n"),
  // C:\GAME.TXT — Win95가 켜지면 자동 실행할 파일
  gameTxt: (exe) => `D:\\FTactics\\${exe}\r\n\r\nD:\\FTactics\\`,
  // C:\DX.REG — 화면 640x480 256색, MIDI는 SB FM, 마우스 가속 끔 (CP949 원본 그대로)
  dxRegBase64: "UkVHRURJVDQNCg0KW0hLRVlfTE9DQUxfTUFDSElORVxDb25maWdcMDAwMVxEaXNwbGF5XFNldHRpbmdzXQ0KIkJpdHNQZXJQaXhlbCI9IjgiDQoiUmVzb2x1dGlvbiI9IjY0MCw0ODAiDQoNCltIS0VZX0xPQ0FMX01BQ0hJTkVcU29mdHdhcmVcTWljcm9zb2Z0XERpcmVjdERyYXddDQoiRW11bGF0aW9uT25seSI9ZHdvcmQ6MDAwMDAwMDANCg0KW0hLRVlfTE9DQUxfTUFDSElORVxTb2Z0d2FyZVxNaWNyb3NvZnRcRGlyZWN0M0RcRHJpdmVyc10NCiJTb2Z0d2FyZU9ubHkiPWR3b3JkOjAwMDAwMDAwDQoNCltIS0VZX0NVUlJFTlRfVVNFUlxTb2Z0d2FyZVxNaWNyb3NvZnRcV2luZG93c1xDdXJyZW50VmVyc2lvblxNdWx0aW1lZGlhXE1JRElNYXBdDQoiQ3VycmVudFNjaGVtZSI9IrHiuruwqiINCiJDdXJyZW50SW5zdHJ1bWVudCI9InNiZm0uZHJ2PDAwMDA+Ig0KIlVzZVNjaGVtZSI9ZHdvcmQ6MDAwMDAwMDANCiJBdXRvU2NoZW1lIj1kd29yZDowMDAwMDAwMA0KIkNvbmZpZ3VyZUNvdW50Ij1kd29yZDowMDAwMDAwNA0KIkRyaXZlckxpc3QiPSIiDQoNCltIS0VZX0xPQ0FMX01BQ0hJTkVcU3lzdGVtXEN1cnJlbnRDb250cm9sU2V0XFNlcnZpY2VzXENsYXNzXE1FRElBXDAwMDBcU2V0dGluZ10NCiJNYXN0ZXJWb2x1bWUiPWhleDpmZixmZixmZixmZg0KW0hLRVlfTE9DQUxfTUFDSElORVxTeXN0ZW1cQ3VycmVudENvbnRyb2xTZXRcU2VydmljZXNcQ2xhc3NcTUVESUFcMDAwMFxTZXR0aW5nXQ0KIlZvaWNlVm9sdW1lIj1oZXg6ZmYsZmYsZmYsZmYNCltIS0VZX0xPQ0FMX01BQ0hJTkVcU3lzdGVtXEN1cnJlbnRDb250cm9sU2V0XFNlcnZpY2VzXENsYXNzXE1FRElBXDAwMDBcU2V0dGluZ10NCiJGTVZvbHVtZSI9aGV4OmZmLGZmLGZmLGZmDQoiTUlESVZvbHVtZSI9aGV4OmZmLGZmLGZmLGZmDQpbSEtFWV9MT0NBTF9NQUNISU5FXFN5c3RlbVxDdXJyZW50Q29udHJvbFNldFxTZXJ2aWNlc1xDbGFzc1xNRURJQVwwMDAwXFNldHRpbmddDQoiQ0RWb2x1bWUiPWhleDo4MCw4MCw4MCw4MA0KDQoNCltIS0VZX0NVUlJFTlRfVVNFUlxDb250cm9sIFBhbmVsXE1vdXNlXQ0KIk1vdXNlU3BlZWQiPSIwIg0KIk1vdXNlVGhyZXNob2xkMSI9IjAiDQoiTW91c2VUaHJlc2hvbGQyIj0iMCINCg==",
};
