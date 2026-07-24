# 협업 플랫폼 — 실시간(Real-time) 인프라 로드맵 · ★차기 세션 우선순위

> 사용자 지시(2026-07-24): "실시간 채팅·프레즌스·문서 공동편집·화상회의는 인프라가 없어 미구현(PLANNED)으로
> 남겼다. 진짜 실시간이 필요하면 인프라 도입이 선행 — **CC가 구현할 수 있으면 구현**하는 것으로 인계서에
> **우선순위**로 남겨둘 것." → 본 문서가 그 정본 기록.

## 왜 이번 세션에 안 만들었나 (정직 고지)

request/response(폴링)로 실시간을 흉내내면 **fake-green**(겉만 실시간)이 된다. 사용자 핵심 원칙(가짜 배선 금지)에
정면 위배이므로, 아래 4개는 **PLANNED 유지**하고 위장 구현을 하지 않았다. 대신 실시간 인프라 없이 정직하게
가능한 **비동기 협업 대화·공지 게시판**(collab_post/reply/reaction)을 구현·배포했다(이번 세션).

| 기능 | 필요 인프라 | 현재 |
|---|---|---|
| 실시간 채팅(메시징) | WebSocket 서버(양방향 push) | 부재 → PLANNED |
| 프레즌스(접속상태·타이핑) | WebSocket + presence 채널 | 부재 → PLANNED |
| 문서 공동편집 | CRDT(Yjs 등) + WS 동기화 | 부재 → PLANNED |
| 화상회의 | WebRTC(SFU/TURN) 또는 외부(Zoom/Agora) | 부재 → PLANNED |

## 현 스택 제약 (실측)

- 백엔드 = **Slim 4 + PHP-FPM(요청당 프로세스)**. 상주 WS 서버 없음(Ratchet/Swoole/ReactPHP 미설치).
- 프론트 = SSE **단방향** 존재(`PM\Events` `text/event-stream`) — 서버→클라 알림엔 쓰이나 양방향 아님.
- 실시간 양방향은 **상주 프로세스**(FPM 요청수명 밖)가 필수 → 인프라 도입이 코드보다 선행.

## 우선순위별 구현 경로 (CC 착수 가능 순)

### P1. 준(準)실시간 폴링 고도화 — 인프라 0, 즉시 가능(정직 범위)
- 게시판/알림/멘션을 **짧은 폴링(10~20s) 또는 기존 SSE 알림 트리거 새로고침**으로 "거의 실시간"화.
- ★fake-green 경계: "실시간"이라 표기하지 말 것("자동 새로고침" 수준으로 정직 표기). 채팅 UX 흉내 금지.
- 착수 가능: 프론트만. `collab_post` 목록에 `?since=` 증분 조회 엔드포인트 추가 → 폴링 델타 병합.

### P2. WebSocket 실시간 채팅·프레즌스 — 인프라 도입 선행
- **인프라 결정(사용자 승인 필요)**: (a) 자가호스팅 상주 WS(Swoole/OpenSwoole 또는 Node 사이드카 `ws`),
  (b) 관리형(Pusher/Ably/Supabase Realtime). 운영 서버(1.201.177.46)에 상주 프로세스/포트/역프록시(nginx `Upgrade`) 필요.
- 도입 후 CC 구현 범위: 채널/스레드 실시간 push, presence(온라인·타이핑), 읽음표시. 기존 `collab_post`·`team`·`user_notification` 재사용.
- 보안: WS 인증=세션 토큰 재사용(hashToken 게이트), 테넌트 격리 채널 네이밍(`t:{tenant}:space:{id}`).

### P3. 문서 공동편집 — CRDT 선행
- **Yjs**(CRDT) + WS provider(y-websocket). P2 의 WS 인프라 위에 얹음. 문서 저장은 스냅샷+업데이트 로그.
- 난이도 최상(충돌해소·오프라인 머지). P2 안정화 후 착수 권장.

### P4. 화상회의 — WebRTC/외부 선행
- 자체 SFU(mediasoup/LiveKit) 또는 **외부 임베드**(Zoom/Google Meet/Agora) 결정. 자체는 TURN/대역폭 비용 큼.
- 권장: 초기엔 외부 링크 임베드(회의 capability에 미팅 URL 필드) → 자체 SFU 는 수요 확인 후.

## 착수 시 체크리스트

1. **인프라 결정 게이트**(P2+): 자가호스팅 vs 관리형 — 비용·운영부담·데이터주권 트레이드오프를 사용자 승인.
2. nginx `proxy_set_header Upgrade`/`Connection` + WS 업스트림, 상주 프로세스 systemd 유닛, 포트/방화벽.
3. Capability Registry 상태 전이: `collaboration.messaging/presence/document/meeting` PLANNED → (인프라 후) PARTIAL→ENABLED. **인프라 없이 ENABLED 승격 금지**.
4. 무후퇴: 기존 비동기 게시판(`collab_post`)과 공존 — 실시간은 추가 계층이지 대체 아님.

## 관련 정본

- 비동기 게시판(이번 세션 구현): `backend/src/Handlers/PM/CollabBoard.php` (collab_post/reply/reaction).
- 알림 SSOT: `user_notification` + `UserAuth::notify`. 단방향 SSE: `PM\Events`.
- 협업 capability 레지스트리: `PM\Collaboration::CATALOG`(messaging/presence/document/meeting = PLANNED 유지).
