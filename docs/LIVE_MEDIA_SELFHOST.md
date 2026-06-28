# 라이브커머스 미디어서버 셀프호스트 빠른 시작 (SRS)

GeniegoROI 라이브커머스의 **control-plane(세션·게스트·상품·채팅·투표·멀티송출)** 은 코드로 완비되어 있으며,
실제 영상 송출(WHIP)·시청(WHEP)·멀티게스트 합성은 **표준 WebRTC 미디어서버**가 담당한다(SFU 아키텍처).
이 문서는 오픈소스 [SRS](https://ossrs.io) 미디어서버를 **수 분 내** 띄우고 플랫폼에 등록하는 절차다.

> 관리형을 선호하면 SRS 대신 **Cloudflare Stream**(provider=cloudflare) 또는 **MediaMTX**(provider=mediamtx)를
> 등록해도 된다. 플랫폼은 4종 provider 프리셋(srs/mediamtx/cloudflare/custom)을 자동 인식한다.

---

## 1. 사전 요건

- 공인 IP 를 가진 리눅스 호스트(클라우드 VM 등) + Docker / Docker Compose
- 방화벽 개방:
  - **TCP 1985**(WHIP/WHEP·HTTP API), **TCP 8080**(HTTP-FLV 폴백), **TCP 1935**(RTMP·선택)
  - **UDP 8000**(WebRTC 미디어 — ★필수)
  - TLS 사용 시 **TCP 80·443**(Caddy 자동 인증서)
- (HTTPS 대시보드 연동 시) 미디어서버용 도메인 1개 — 예: `live.yourbrand.com`

---

## 2. 기동

```bash
# 레포의 infra/media/ 를 호스트로 복사한 뒤:
cd infra/media

# (A) 로컬/HTTP 테스트 — 공인 IP 만 지정
CANDIDATE=<호스트_공인_IP> docker compose up -d

# (B) 운영(권장) — HTTPS TLS 종단 포함(Caddy 자동 Let's Encrypt)
CANDIDATE=<호스트_공인_IP> DOMAIN=live.yourbrand.com docker compose --profile tls up -d
```

- `CANDIDATE` 는 **반드시 호스트의 공인 IP**(NAT/클라우드 필수). 누락 시 미디어 연결이 ICE 단계에서 실패한다.
- `--profile tls` 는 Caddy 가 `DOMAIN` 으로 Let's Encrypt 인증서를 자동 발급하고 SRS 를 HTTPS 로 종단한다.

상태 확인:
```bash
docker compose ps
curl -s http://localhost:1985/api/v1/versions   # SRS API 응답 = 정상
```

---

## 3. 플랫폼에 등록

대시보드 → **라이브커머스 → 미디어서버 설정**(또는 연동허브):

| provider | base_url | 비고 |
|---|---|---|
| `srs` | `https://live.yourbrand.com` | (B) TLS 권장. WHIP/WHEP 경로 자동 조립 |
| `srs` | `http://<공인IP>:1985` | (A) HTTP 대시보드에서만(혼합콘텐츠 주의) |

- WHIP/WHEP 전체 경로는 **플랫폼이 자동 생성**한다(`/rtc/v1/whip/`·`/rtc/v1/whep/`, `?app=live&stream=...`).
- STUN 은 기본값(`stun:stun.l.google.com:19302`)이 자동 적용된다. 엄격한 기업 방화벽 시청자를 위해
  **TURN**(coturn 등) 을 추가 등록하면 도달률이 올라간다(turn_url/turn_user/turn_cred, 자격증명은 AES-256-GCM 저장).

### ★ HTTPS 혼합콘텐츠 주의
운영 대시보드(`https://roi.genie-go.com`)는 HTTPS 이므로, 미디어서버도 **HTTPS** 여야 브라우저가 WHIP/WHEP 를 허용한다
(HTTP 엔드포인트는 mixed-content 로 차단). 반드시 (B) TLS 프로필 또는 별도 리버스 프록시(nginx 등)로 HTTPS 종단할 것.

---

## 4. 연결 검증

등록 후 **미디어서버 설정 화면의 "연결 테스트"** 버튼을 누르면 플랫폼이 WHIP/WHEP 엔드포인트 도달성·지연을 즉시 확인한다
(`POST /v425/live/media-config/test`). `reachable=true` 면 다음 방송부터 송출/시청이 자동 활성화된다.

문제 해결:
- `reachable=false` → 도메인/HTTPS/포트(1985·UDP 8000) 방화벽 확인. Caddy 인증서 발급 로그(`docker compose logs caddy`).
- 송출은 되는데 시청자 화면이 검음 → `CANDIDATE` 가 공인 IP 인지, UDP 8000 이 열렸는지 확인.
- 기업망 시청자만 실패 → TURN 서버 추가 등록.

---

## 5. 멀티게스트 합성

게스트/코호스트는 발급된 송출키로 **각자 WHIP 발행**하고, SRS(또는 SFU)가 program 스트림으로 합성·재배포한다.
플랫폼은 게스트 초대 링크·송출키·역할(cohost/guest)·참여 알림(SSE)을 모두 관리한다. 대규모 동시시청은
SRS 엣지/클러스터 또는 Cloudflare Stream 같은 관리형으로 수평 확장한다.

---

## 6. 운영 메모

- 녹화(VOD)·HLS 배포가 필요하면 SRS 의 `dvr`/`hls` vhost 설정을 활성화한다(이 문서 범위 밖).
- 비용: SRS 셀프호스트 = 인프라 비용만(영상 트래픽). 관리형(Cloudflare Stream)은 사용량 과금.
- 보안: 미디어서버는 별도 호스트 권장(애플리케이션 백엔드와 분리). API(1985)는 가능하면 내부망/프록시 뒤에 둔다.
