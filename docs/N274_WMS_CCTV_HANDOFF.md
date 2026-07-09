# 274차 세션 인계 — WMS CCTV 자격등록·원격 실시간 조회 + 온프렘 브리지 + 로케이션 번(slot)

> 작성 2026-07-09. feat/n236-admin-growth-automation 브랜치(master 미접촉). **데모 배포·브라우저 실검증 완료 / 운영 미배포(승인 대기)**.

## 0. 개요

사용자 요청: WMS 창고 카드에 **CCTV 보기 버튼** 신설 + 자격등록(API키) 완료 시 **원격 실시간 조회**, 한 창고 다수 카메라 **전체 보기**, 재고 로케이션에 **창고/랙/단/번**까지 표시. 착수 전 부재증명(`cctv|rtsp|nvr|onvif|m3u8|hls` grep 0건)으로 신설 확정. 로케이션은 기존 `wms_bins`(존/통로/랙/단/피킹순서, 267차)에 **번(slot)만 확장**.

## 1. 구현 (커밋 2건: `cd3ef65bc7a`, `8b17d0b4f7b`)

### A. CCTV 자격등록 + 서버 중계 재생 — `backend/src/Handlers/WmsCctv.php`(신규), `frontend/src/components/CctvManager.jsx`·`CctvPlayer.jsx`(신규)
- **자격증명**: `Crypto`(AES-256-GCM·`CRED_ENC_KEY`·fail-closed) 저장. 조회 응답 `mask()`, **원문 브라우저 미노출**. 재생은 서버가 업스트림에 자격증명 주입해 중계.
- **프로토콜**: `rtsp`(서버 ffmpeg→HLS 리먹스)·`snapshot`(JPEG 폴링, ffmpeg 불필요)·`hls`/`webrtc`(URL 직접)·`iframe`(벤더 임베드). 벤더 프리셋(JWC/Hikvision/Dahua/Hanwha/ONVIF)+`custom` 템플릿(`{host}{port}{rtspPort}{user}{pass}{channel}`)+`url`.
- **재생 인가**: `POST /session`이 단기(1h) HMAC 재생토큰(`tenant|camId|exp`) 발급. `<video>/<img>`가 헤더를 못 실어서 `?tk=`로 검증. 세그먼트 프록시는 **서명된 절대 URL만**(임의 URL 대입=SSRF 차단).
- **SSRF**: 등록·재생 양시점 공인 IP 재검증(DNS rebinding 대비). 사설/루프백/링크로컬/메타데이터 거부. `OpenPlatform::isPublicHttpsUrl` 미러.
- **프론트**: `CctvPlayer`=hls.js(지연 import·**별도 청크 523KB**)·Safari 네이티브HLS·WHEP·스냅샷 폴링·rtsp keepalive(30s). `CctvManager`=자격등록/목록/연결테스트/**전체 보기(비디오월)**/브리지 관리.
- **창고 카드**: `WmsManager.jsx` WarehouseTab 편집·중단 사이 `📹 CCTV 보기` 버튼(모바일/PC) + 모달(`CctvManager whId=... compact`).

### B. 온프렘 브리지 (P2P·ActiveX·독자VMS 범용 재생) — WmsCctv 확장 + `tools/cctv-bridge/`(신규)
- **왜**: 국내 CCTV(JWC ActiveX·NETUS 클라우드포털·이지피스 독자·아이씨큐/SmartPSS P2P시리얼)는 인터넷쪽 표준스트림 미노출. 그러나 **LAN 내부는 RTSP 노출**하는 경우가 많음 → 현장 PC 에이전트가 LAN에서 물어 HLS로 아웃바운드 업로드.
- **백엔드**: `wms_cctv_bridges`(pair_code→token_hash·status·discovered) + `wms_cameras.source/bridge_id/model`. `bridge` 카메라는 **SSRF 스킵(LAN 주소 허용)**. `pair`(공개 페어코드)·`poll`(카메라+복호화 자격증명 하달)·`heartbeat`(+ONVIF 발견 보고)·`ingest/{id}`(HLS 세그먼트 업로드, 파일명 화이트리스트). `session`/`hls`가 브리지 업로드 세그먼트 서빙. On-demand(want 파일 mtime·90초 무시청 종료).
- **에이전트**: `bridge.js`(Node 내장모듈만·무의존). 페어링→토큰 저장→poll→ffmpeg RTSP→HLS→ingest 업로드→heartbeat+ONVIF WS-Discovery. `README.md`·`package.json`·`.gitignore`(bridge-config.json 커밋금지).
- **프론트**: 브리지 관리(생성→페어코드 표시·삭제·재발급·온라인상태·ONVIF발견) + 카메라 폼 `source`(직접/브리지) 토글·브리지 선택·LAN 주소 허용.

### C. 로케이션 번(slot) — `backend/src/Handlers/Wms.php`, `WmsManager.jsx` BinLocationsTab
- `wms_bins.slot` 컬럼 신규(멱등 ALTER·**MySQL TEXT DEFAULT 트랩 회피**). `seq` 척도 불변(slot=2차 정렬키). 기존행은 빈코드 마지막마디에서 백필(`slotFromCode`). `listBinStock`에 존/랙/단/번 전 마디 조인(상품 위치 한눈). 프론트 폼/목록/빈재고 뷰에 번·보관위치 컬럼.

## 2. 검증 (데모 demo.genieroi.com·Playwright 실브라우저)

- **CCTV 버튼**: 3개 창고 카드 모두 렌더. 자격등록 폼=프로그램/도메인/포트/RTSP포트/채널/아이디/비번(사용자 형식 그대로).
- **서버 릴레이 재생 end-to-end**: 공개 HLS 등록→session→마스터 m3u8 프록시(200,#EXTM3U)→변형 m3u8→**서명 세그먼트 프록시→실 1.9MB TS 전달**. SSRF-안전 재작성 동작.
- **비디오월**: 3대 동시 🔴LIVE 실영상 재생(hls.js 서버프록시 실디코딩) — 스크린샷 확보.
- **브리지**: 생성(201)→페어코드 12자→페어링 토큰→poll 200 OK→삭제.
- **로케이션 번**: `A-01-03-2` = 존A/랙03/단2/**번2** 렌더.
- **php -l** 3파일 통과, 프로덕션 빌드 통과(hls 별도청크). 테스트 데이터 전량 삭제(잔여 0).

## 3. 배포 상태

- **데모**: 프론트(rsync --delete 클린스왑)·백엔드(WmsCctv.php·Wms.php·routes.php, chown www:www, php-fpm reload) **배포 완료**.
- **운영(www.genieroi.com)**: **미배포**. 배포 시 백엔드 3파일 + 프론트 `npm run build`(--mode demo 금지) dist 클린스왑 + php-fpm reload 필요. ffmpeg 설치 여부 확인 필요(데모=미설치, 직접 RTSP는 브리지로 우회).
- master 미push. feat/n236 push 예정.

## 4. 미완/다음 세션

- **실장비 실검증 미완**: 사용자 제공 5개(JWC/NETUS/이지피스/아이씨큐/SmartPSS) 전부 **표준 스트림 미노출**(ActiveX·클라우드포털·독자·P2P). 실장비는 **온프렘 브리지 필수**.
  - ★**현장 PC=이번 작업 PC**가 CCTV와 동일 LAN(공인 14.52.38.147=JWC DDNS). LAN 스캔 결과: `.11:8601`=JWC DVR(ActiveX·RTSP 전무), `.6:8080`=Digest카메라, `.9:8080`=lighttpd NVR(로그인필요), `.28`=PHP개발서버. **ffmpeg 로컬 설치 완료**(scratchpad ffmpeg-8.1.2).
  - **막힌 지점**: JWC DVR은 "RTSP 켰다"에도 1-1024+고포트 전 스캔에서 **8601만 열림**(RTSP 데몬 미기동). 다음: **DVR 재부팅** 후 RTSP 포트 재확인, 또는 `.6/.9` 레코더 로그인 정보로 RTSP 획득. RTSP 1개만 열리면 로컬 브리지로 즉시 재생 가능.
- **i18n**: 신규 `wms.cctv.*`·`wms.bins.slot` 키는 인라인 한글 폴백 렌더. 15개국 로케일 반영 미완.
- **운영 배포** 사용자 승인 대기.

## 5. 재플래그 금지 (FP)

- CCTV 자격증명 평문 미저장(Crypto GCM)·SSRF 이중검증·재생토큰 HMAC=의도된 은행급 설계. "자격증명 노출" 오탐 금지.
- 로케이션 slot을 `seq` 계산식에 넣지 않은 것은 **의도**(기존행 seq 척도 혼입 방지·회귀0). 재설계 금지.
