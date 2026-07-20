# DSAR — Policy Synchronization Bus (Part 3-24 §9)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §9)

Policy Synchronization Bus는 다수 권한 도메인(Authorization Domain) 간 **정책 상태의 일관성**을 전파·수렴시키는 논리 버스다. SPEC이 요구하는 5개 하위 계약:

- **Event Streaming** — 정책 변경(role/scope/binding mutation)을 이벤트로 발행하고 구독 도메인에 순서 보장 스트림으로 전달.
- **Snapshot Sync** — 신규 참여 도메인/재기동 도메인에 현재 정책 전량을 재구성 가능한 스냅샷으로 부트스트랩.
- **Delta Sync** — 스냅샷 이후 증분 변경만 전파하여 대역폭·수렴 지연 최소화.
- **Conflict Resolution** — 동시 변경으로 인한 상태 발산 시 결정론적 병합(예: LWW·vector-clock·정책 우선순위) 규칙 적용.
- **Priority Resolution** — 상충하는 정책 소스 간 권위 서열(authority precedence)에 따른 최종 유효 정책 확정.

## 2. Substrate 매핑

| SPEC §9 계약 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Event Streaming (정책) | 부재 — 메시지 브로커/버스 미탑재 | `composer.json:6-13` | ABSENT |
| Snapshot Sync | 부재 — 정책 스냅샷 발행자 없음 | — | ABSENT |
| Delta Sync | 부재 — 정책 증분 전파 채널 없음 | — | ABSENT |
| Conflict Resolution | 부재 — 병합 규칙 엔진 없음 | — | ABSENT |
| Priority Resolution | 부재 — 권위 서열 확정기 없음 | — | ABSENT |
| (참고) 비동기 작업 전달 | DB 잡 큐(enqueue) — 버스 아님 | `Db.php:519-527` | 대체 아님 |

`composer.json:6-13` 의존성에 AMQP/Kafka/Redis-stream/브로커 클라이언트가 전무하다 — 메시지버스 substrate 자체가 없다. 현행 비동기 전달은 `Db.php:519-527`의 DB 잡 enqueue이며, 이는 단일 테넌트 워크로드 처리용 작업 큐일 뿐 도메인 간 정책 상태 수렴 버스가 아니다(순서·스냅샷·델타·충돌 병합 계약 미보유).

## 3. 설계 계약 (신설 대상)

1. **Policy Change Event 스키마** — `{domain, entity_type, op, version(vector), payload_ref, authority_rank}`. 발행은 정책 변경 커밋 시점에 트랜잭션 아웃박스로.
2. **Bus 브로커** — 순서 보장 파티션(도메인 키) + at-least-once 전달 + 멱등 소비. 순신설(브로커 신설).
3. **Snapshot/Delta 프로토콜** — 구독자 offset 기반 재개; snapshot→delta 전환 경계 명시.
4. **Conflict/Priority 규칙** — vector-clock 발산 감지 → authority_rank 우선, 동순위는 LWW; 결과는 감사 append-only 기록.
5. **감사 연계** — 수렴 이벤트는 `SecurityAudit.php:27` 계열 append-only 체인에 결선(설계상 hook 지점).

## 4. KEEP_SEPARATE

- **SSE 실시간 채널** — `PM/Events.php:50`·`LiveCommerce.php:1205`. 사용자향 이벤트 푸시(협업/라이브 방송)로 policy sync가 아니다. 정책 상태 수렴·충돌 병합 계약 미보유 → 흡수 금지.
- **커머스 채널 동기화** — `ChannelSync.php:12`·`Wms.php:2071`. 외부 커머스/재고 데이터 sync이며 authorization policy 도메인과 무관 → KEEP_SEPARATE.

## 5. 판정

**ABSENT — greenfield(policy sync bus grep 0).** 메시지버스 substrate 부재(`composer.json:6-13`), 현행 enqueue는 DB 잡(`Db.php:519-527`)으로 대체 불가. SSE(`PM/Events.php:50`·`LiveCommerce.php:1205`)·커머스 sync(`ChannelSync.php:12`·`Wms.php:2071`)는 명명 유사이나 policy sync 아님 → KEEP_SEPARATE. 브로커·프로토콜 **순신설**. 선행 부재로 **BLOCKED_PREREQUISITE**, 코드 변경 0, NOT_CERTIFIED.
