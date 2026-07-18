# DSAR — API Contract (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 근거: §GROUND_TRUTH(ⓑ 전수조사) + §CONTRACTS §67 API_CONTRACT. file:line 인용은 허용목록만.

## 1. 원문 전사 (Canonical Contract §67)

### 1.1 리소스 오퍼레이션

- **Registry / Policy / Action Type / Active Version 조회** — 읽기 전용 참조 오퍼레이션.
- **Definition / Version CRUD** — Approval Decision Definition·Version 생성/수정/버전전이(§9·§10).
- **Command**:
  - 제출(Submit Decision Command)
  - 조회 / 상태 조회
  - 취소 reference(Cancel Command reference)
  - Retry(Retry Command)
  - Recovery(Recover Command)
- **Validation**:
  - 실행(Validate)
  - Actor Resolution / Target Resolution(§18·§19)
  - Eligibility(§21)
  - Validation Result(§26)
  - 경고(Warning) 조회
- **Commit**:
  - Commit 요청(§31)
  - Commit 상태 / Commit Result(§34)
  - Decision Record(§35) / History(§36) 조회
  - Idempotency(§39) 조회
- **Lock / Concurrency** — Lock(§41)·Lease(§42)·Fencing(§43)·Optimistic Version(§44) 상태.
- **Snapshot / Simulation**(§54·§59) — 조회 / 시뮬레이션 실행(실 Record 미생성).
- **Reconciliation**(§57) — 정합 비교 / 결과 조회.

### 1.2 공통 관심사 (모든 오퍼레이션 횡단 — 전사)

1. **Tenant Context** — 요청 테넌트 컨텍스트 필수.
2. **Authentication** — 인증 principal.
3. **Authorization** — 권한 검증.
4. **Idempotency** — 멱등키(§39).
5. **Request Hash** — 요청 해시.
6. **Nonce** — 재생 방지 nonce(§40).
7. **Expected Version** — 낙관적 버전(§44).
8. **Optimistic / Decision Lock** — 낙관적·결정 락(§41·§44).
9. **Fencing Token** — 펜싱 토큰(§43).
10. **Effective Date / Decision Version Validation** — 유효일·결정 버전 검증.
11. **Assignment / Claim-Lease Validation** — 할당·클레임·리스 검증.
12. **Authority / Delegation Validation** — 권한·위임 검증.
13. **Sequential State Validation** — 순차 상태 검증.
14. **Monetary Precision Validation** — 금액 정밀도 검증.
15. **Snapshot** — 스냅샷(§54).
16. **Audit** — 감사(§56).
17. **Evidence** — 증거(§55).
18. **Rate Limit** — 레이트 리밋.
19. **Pagination** — 페이지네이션.
20. **Error Contract** — 표준 에러 컨트랙트(§63/§64 · [[DSAR_APPROVAL_DECISION_ERROR_WARNING_CONTRACT]]).

## 2. 기존 구현 대조

정본 Decision API 컨트랙트는 **부재**(ABSENT). 현행 승인 관련 엔드포인트는 4핸들러에 산재하며, §67의 리소스 계층(Registry/Policy/Definition/Version/Command/Validation/Commit/Lock/Snapshot/Simulation/Reconciliation)이 대응 엔티티 부재로 **매핑 대상이 없다**:

- `Mapping::approve`(`Handlers/Mapping.php:238-293`) — 단일 승인 엔드포인트(POST). Command/Validation/Commit 분리 없이 즉시 in-place UPDATE(`:288`).
- `AdminGrowth::approvalDecide`(`Handlers/AdminGrowth.php:1313-1344`) — 단일 decide 엔드포인트. enum 검증(`:1321`)만.
- `Alerting::decideAction`(`Handlers/Alerting.php:572-599`) + `executeAction`(`:601-665`) — decide/execute 2단이나 비원자·무아웃박스.
- `Catalog::approveQueue`(`Handlers/Catalog.php:2383-2407`) — bulk 승인.

공통 관심사(§1.2) 20항 대비 현행 커버:
- Tenant Context = **PRESENT**(index.php auth_tenant·49핸들러 WHERE tenant_id).
- Authentication = **PRESENT**(Bearer 미들웨어 한겹) · Authorization = **PARTIAL**(RBAC viewer<connector<analyst<admin·`AdminGrowth.php:197` 세션).
- Idempotency / Request Hash / Nonce / Expected Version / Optimistic-Decision Lock / Fencing = **ABSENT**(결정 도메인). Idempotency는 웹훅 국한(`Paddle.php:343-368` UNIQUE notification_id=VALIDATED_LEGACY).
- Assignment/Claim-Lease / Authority/Delegation / Sequential State Validation = **ABSENT**(선행 6군 §3.2~§3.5 부재).
- Snapshot/Audit/Evidence = Audit **PRESENT**(audit_log·비무결·정본 `SecurityAudit::verify` `SecurityAudit.php:56-68`) · Snapshot/Evidence **PARTIAL**(payload_json/action_json=요청 스냅샷·결정시점 불변 아님).
- Rate Limit / Pagination / Error Contract = **ABSENT/PARTIAL**(표준 에러 컨트랙트 없음).
- ★`Alerting::actor` 헤더 위조(`Handlers/Alerting.php:33-35`) → Authentication/Authorization 공통관심사가 해당 엔드포인트에서 **BLOCKED_SECURITY**.

## 3. 판정

- **Verdict**: **ABSENT**(정본 Decision API 컨트랙트) · 공통 관심사는 일부만 PRESENT(Tenant/Auth/Audit), 결정 고유 관심사(Idempotency/Nonce/Expected Version/Fencing/Assignment·Authority·Delegation·Sequential Validation)는 전부 ABSENT.
- **선행 의존**: §67 리소스 계층(Registry/Definition/Version/Command/Validation/Commit)이 §3.1 Approval·§3.5 Sequential·§3.2 Authority·§3.3 Delegation·§3.4 Assignment(모두 ABSENT)를 전제 → **BLOCKED_PREREQUISITE**.
- **cover**: **0**(정본 기준). 재사용 substrate = Tenant Guard·Bearer 인증·RBAC·`SecurityAudit::verify`.

## 4. 확장/구현 방향 (설계)

- **버전 프리픽스 배선**: 신규 Decision API는 최신 버전 프리픽스(`/vNNN/decision/*`) 아래 + `/api/decision/*` alias 동시 등록(reference: /api 접두 라우팅 트랩·nginx SPA HTML 폴백 착시). `routes.php` 등록 필수(자동 디스커버리 아님).
- **리소스 계층 순신규**: Registry/Policy/Definition/Version/Command/Validation/Commit/Lock/Snapshot/Simulation/Reconciliation 엔드포인트 — 대응 엔티티(§7~§59) 신설과 동반.
- **공통 관심사 미들웨어화**: Idempotency Key·Request Hash·Nonce·Expected Version·Fencing Token을 요청 헤더 표준(`Idempotency-Key`, `If-Match`/Expected-Version, `X-Fencing-Token`)으로 규약화 → Command→Validation→Commit 파이프라인(§25 27단계) 진입 게이트.
- **재사용 확장**: 공통관심사 Tenant Context/Authentication/Audit은 기존 substrate(index.php auth_tenant·Bearer·SecurityAudit::verify) 확장. Idempotency는 Paddle 웹훅 UNIQUE 패턴을 Decision Idempotency(§39)로 **일반화**(VALIDATED_LEGACY). Error Contract는 [[DSAR_APPROVAL_DECISION_ERROR_WARNING_CONTRACT]] 52/16 코드.
- **Mandatory Control**: 공통 관심사 미충족 요청은 Fail-Closed(§24). Alerting 헤더 위조(BLOCKED_SECURITY) 선치유 전 신규 API에 canonical actor 강제.
- **실 구현 = 선행 6군 신설 후 별도 승인세션**. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_DECISION_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_DECISION_ERROR_WARNING_CONTRACT]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
