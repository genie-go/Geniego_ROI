# DSAR — Distributed Policy Distribution Engine (Part 3-24 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §6)

Distributed Policy Distribution Engine은 인가 정책을 메시의 여러 노드로 **분산 배포**하는 계약이다. SPEC이 요구하는 표면:

- **Push 모델**: 정책 소스가 하위 노드로 변경을 능동 전송.
- **Pull 모델**: 노드가 소스로부터 최신 정책을 주기적/온디맨드로 당김.
- **Hybrid**: Push 알림 + Pull 페치의 결합.
- **분산 부속**: 원격(remote) 전송·delta(증분) 계산·conflict(충돌) 해소·메시지버스 기반 전파.

## 2. Substrate 매핑 (현행 실체)

| SPEC 계약 (분산 배포) | 현행 substrate | 실체 판정 |
|---|---|---|
| Push proto (정책 전송) | 플랜 정책 미러 `backend/src/Handlers/AdminPlans.php:53-72`·전송 `:66-67` | PARTIAL — **동일 서버 push-only proto**(원격 아님) |
| 정책 소스 읽기/쓰기 | `AdminPlans.php:157`·`:180`·`:209`·`:539`·`:717` | 로컬 단일 DB 대상 |
| Remote 전송 | (원격 노드 대상 전송 부재) | ABSENT |
| Delta(증분) 계산 | (변경분 diff 부재·전량 미러) | ABSENT |
| Conflict 해소 | (다중 writer 충돌 조정 부재) | ABSENT |
| 메시지버스 (전파 backbone) | `backend/composer.json:6-13`(브로커 의존성 부재) | ABSENT |
| enqueue 대체 | DB 잡 큐 `backend/src/Db.php:519-527`·SSE `backend/src/Handlers/PM/Events.php:50` | 단일노드 내 전달(분산 배포 아님) |

**판정 근거**: AdminPlans의 정책 미러(`AdminPlans.php:53-72`, 전송 `:66-67`)는 **동일 서버 내 push-only 프로토타입**으로, 원격 노드·delta·conflict가 전무하다. `composer.json:6-13`에 메시지버스/브로커 의존성이 없어, 실제 전파는 DB 잡 큐(`Db.php:519-527`)·SSE(`PM/Events.php:50`)라는 단일노드 내 메커니즘으로 축약된다. 분산 배포 계약은 미성립.

## 3. 설계 계약 (신설 시)

- **Push proto 승격이 아닌 확장**: 실 분산 배포는 AdminPlans push proto(`AdminPlans.php:53-72`)를 **재구현하지 말고**, remote/delta/conflict 계층을 그 위에 얹는 확장으로 설계한다(Golden Rule: Replace 아닌 Extend).
- **Delta·멱등**: 배포는 증분 delta + 멱등 적용을 계약으로 하여 전량 미러의 대역폭·경합을 제거한다.
- **Conflict 정본**: 다중 소스 충돌은 상위 plane(Controller DSAR §3 위계)이 정본, 하위는 수렴만.
- **메시지버스 도입은 별도 ADR 게이트**: `composer.json:6-13` 의존성 추가(브로커)는 인프라 결정으로, 본 DSAR 범위 밖·별도 승인. 도입 전에는 DB 잡 큐(`Db.php:519-527`)/SSE(`PM/Events.php:50`)를 전파 substrate로 유지.
- **감사**: 배포 이벤트는 append-only 해시체인(`backend/src/SecurityAudit.php:27`)에 기록.

## 4. KEEP_SEPARATE

- **★마케팅/도메인 sync ≠ policy 분배**: 채널 동기화 `backend/src/Handlers/ChannelSync.php:12`·`:19`, WMS 재고 흐름 `backend/src/Handlers/Wms.php:2071` 는 외부 데이터 동기화이지 인가 정책 배포가 아니다. Policy Distribution Engine으로 흡수·통합 금지.
- 라이브커머스 `backend/src/Handlers/LiveCommerce.php:1205` — 도메인 이벤트, 정책 전파 아님.
- `infra/aws/terraform/main.tf`·`infra/docker-compose.yml` — 죽은 인프라 선언, 분산 backbone의 실체로 오인 금지.

## 5. 판정

**ABSENT-분산 — 순신설.** 분산 Policy Distribution의 Push/Pull/Hybrid 및 remote·delta·conflict·메시지버스 계약은 미성립이다. 현행 최근접 substrate는 AdminPlans 동일 서버 push-only proto(`AdminPlans.php:53-72`·`:66-67`)와 DB 잡 큐(`Db.php:519-527`)·SSE(`PM/Events.php:50`)뿐이며, 메시지버스 의존성은 `composer.json:6-13`에 부재하다. 본 DSAR은 설계 명세 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(분산 substrate·메시지버스 부재). 실 구현·의존성 추가는 별도 ADR/승인 세션에서 Extend 원칙으로 진행한다.
