# GenieROI WMS — 온프렘 CCTV 브리지 에이전트

현장(창고) PC에서 실행하는 **경량 브리지**입니다. 같은 LAN 안에서 DVR/NVR/IP카메라를
RTSP로 물어 `ffmpeg`로 HLS로 변환하고, **아웃바운드 HTTPS**로 GenieROI 클라우드에
영상 세그먼트를 업로드합니다. 브라우저는 클라우드에서 그 영상을 재생합니다.

## 왜 브리지가 필요한가

국내 중소 CCTV(JWC/NETUS/아이씨큐/이지피스/SmartPSS 등)는 인터넷 쪽으로 **표준 스트림을
열지 않습니다** — ActiveX 독자 프로토콜, P2P 시리얼 클라우드, 벤더 VMS 바이너리뿐입니다.
그래서 웹브라우저로 직접 재생이 불가능합니다.

하지만 이 장비들 **대부분은 같은 LAN 안에서는 표준 RTSP를 노출**합니다. 브리지가 현장에서
그 RTSP를 직접 물으면, 포트포워딩·방화벽 인바운드 개방 없이도 어디서든 브라우저로 볼 수 있습니다.

```
  [카메라/DVR] --(LAN RTSP)--> [브리지 에이전트] --(아웃바운드 HTTPS/HLS)--> [GenieROI 클라우드] --> [브라우저]
```

## 준비물

- **Node.js 18+** — https://nodejs.org (LTS)
- **ffmpeg** — https://ffmpeg.org/download.html (설치 후 PATH 등록, 또는 `FFMPEG` 환경변수로 경로 지정)
- 카메라/DVR과 **같은 네트워크(LAN)** 에 있는 상시 켜둘 PC(또는 미니PC)

## 설치·실행 (3단계)

### 1) 콘솔에서 브리지 만들고 페어코드(API 키) 발급
GenieROI 웹 → **WMS(창고관리) → CCTV → 브리지 관리 → “브리지 추가”**.
표시되는 **페어코드**(예: `A1B2C3D4E5F6`)를 복사합니다.

### 2) 현장 PC에서 에이전트 최초 실행(페어링)
이 폴더(`tools/cctv-bridge`)를 현장 PC에 복사한 뒤:

```bash
# Windows (PowerShell)
$env:CLOUD="https://www.genieroi.com"; $env:PAIR_CODE="A1B2C3D4E5F6"; node bridge.js

# macOS / Linux
CLOUD=https://www.genieroi.com PAIR_CODE=A1B2C3D4E5F6 node bridge.js
```

성공하면 `bridge-config.json`(토큰)이 생성됩니다. **이후에는 인자 없이** `node bridge.js` 만 실행하면 됩니다.

### 3) 콘솔에서 카메라 등록 → 자동 재생
콘솔 → CCTV → **“카메라 자격등록”** → **연결 방식 = 브리지 경유**, 방금 만든 브리지 선택,
카메라의 **LAN 주소(예: `192.168.0.64`)·RTSP 포트·아이디·비번**을 입력합니다.
저장 후 **“실시간 보기”** 를 누르면 브리지가 자동으로 송출을 시작합니다.

> **ONVIF 자동발견**: 에이전트는 주기적으로 LAN에 ONVIF 프로브를 보내 발견한 장비의
> 주소·모델을 콘솔로 보고합니다. 콘솔의 “발견된 장비”에서 클릭 등록하면 편합니다(자격증명만 입력).

## 상시 실행(자동 시작) 권장

- **Windows**: 작업 스케줄러 → “로그온 시” 트리거 → `node.exe`(인수 `bridge.js`, 시작 위치 이 폴더),
  또는 [nssm](https://nssm.cc)으로 서비스 등록.
- **Linux (systemd)**:
  ```ini
  # /etc/systemd/system/genieroi-cctv-bridge.service
  [Unit]
  Description=GenieROI CCTV Bridge
  After=network-online.target
  [Service]
  WorkingDirectory=/opt/genieroi-cctv-bridge
  ExecStart=/usr/bin/node bridge.js
  Restart=always
  [Install]
  WantedBy=multi-user.target
  ```

## 동작 방식(요약)

- **On-demand 송출**: 콘솔에서 누군가 “실시간 보기”를 눌러야 그 카메라만 ffmpeg가 켜집니다.
  아무도 안 보면 ~90초 뒤 자동으로 꺼져 CPU/대역폭을 아낍니다.
- **자격증명**: 카메라 아이디/비번은 클라우드에 **AES-256-GCM 암호화** 저장되고, 브리지가 폴링 시
  TLS로만 받아 로컬 접속에 사용합니다. 브라우저로는 절대 전달되지 않습니다.
- **무의존**: `bridge.js`는 Node 내장 모듈만 사용합니다(`npm install` 불필요).

## 환경변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `CLOUD` | GenieROI 클라우드 주소 | `https://www.genieroi.com` |
| `PAIR_CODE` | 최초 페어링용 페어코드(1회) | `A1B2C3D4E5F6` |
| `FFMPEG` | ffmpeg 실행 경로(PATH에 없을 때) | `C:\ffmpeg\bin\ffmpeg.exe` |

## 문제 해결

- **“브리지 오프라인”**: 에이전트가 실행 중인지, `CLOUD` 주소가 맞는지 확인.
- **“브리지 스트림 준비 중”이 계속됨**: 카메라 RTSP 주소/포트/자격증명 확인. 현장 PC에서
  `ffplay rtsp://아이디:비번@192.168.x.x:554/...` 로 직접 재생되는지 먼저 확인.
- **ffmpeg 없음**: 설치 후 PATH 등록 또는 `FFMPEG` 환경변수 지정.
