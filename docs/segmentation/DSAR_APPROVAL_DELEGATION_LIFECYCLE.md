# DSAR — Approval Delegation Lifecycle (§41)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §41(줄 1767-1809) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> 측정기 분모: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=41` → **31**(불릿 31·번호 0) = Lifecycle 상태 16 + 허용 전이 예 15

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation 상태머신 엔티티 | 🔴 `APPROVAL_DELEGATION_*` 엔티티 통째 부재(ⓑ §1·§4·§72 Canonical 28종 전량 ABSENT) — 상태를 소유할 Delegation 레코드가 없다 | `NOT_APPLICABLE`(엔티티 부재) |
| Delegation 합법 전이집합 선언 | 🔴 **선언 0**(전 도메인) — Delegation 전용은 물론 어떤 도메인도 "허용 전이 화이트리스트" 를 선언한 코드가 없다(ⓑ §6·Authority Registry §0 status 행) | `NOT_APPLICABLE` |
| 상태 enum 인접(형태만 동일) | §41 Lifecycle 16종 = §10 `APPROVAL_DELEGATION_VERSION` 상태 enum(스펙 줄 793-810)과 **문자 동일** — 그러나 둘 다 신설 대상이며 실 테이블 0 | `NOT_APPLICABLE` |
| 타 도메인 상태전이(인접·전이집합 아님) | 직접 `UPDATE ... SET status=` 8곳(§2 참조) — **전부 단발 대입이며 from→to 합법집합·Invalid Transition 차단 로직 없음** | `LEGACY_ADAPTER`(패턴 참조용·Delegation 아님) |

★**Lifecycle/전이 전체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "상태머신 부재 깊이·인접 전이 패턴"을 기록한다.

## 1. 원문 전사 + 판정 — **원문 31종**(Lifecycle 상태 16 + 허용 전이 예 15)

### 지원 Lifecycle 상태 (16)

| # | 원문 상태 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | DRAFT | Delegation 레코드 부재 → 상태값 미존재 · 인접 `admin_growth_campaign` draft 문자열은 캠페인 도메인 | `NOT_APPLICABLE` |
| 2 | VALIDATION_PENDING | 부재 — Delegation 검증 파이프라인 0 | `NOT_APPLICABLE` |
| 3 | VALIDATION_FAILED | 부재 | `NOT_APPLICABLE` |
| 4 | ACCEPTANCE_PENDING | 부재 — Delegate 수락(§23) 개념 0(ⓑ §2.1 "수락 없음") | `NOT_APPLICABLE` |
| 5 | APPROVAL_PENDING | 부재 — Delegation 승인(§24) 경로 0 · 승인 4경로는 Delegation 대상 아님(ⓑ §2.2) | `NOT_APPLICABLE` |
| 6 | APPROVED | 부재 — 인접 `status='approved'`(`Mapping::approve:238-291`)는 항목 승인이지 Delegation 활성 아님 | `NOT_APPLICABLE` |
| 7 | SCHEDULED | 부재 — Scheduled Delegation(§8·§21 유형) 미구현 | `NOT_APPLICABLE` |
| 8 | ACTIVE | 부재 — Delegation 활성 개념 0 · 인접 `status='active'`(구독 `Paddle.php:642`)는 빌링 도메인 | `NOT_APPLICABLE` |
| 9 | ACTIVE_WITH_WARNINGS | 부재 — warning 병기 활성 상태 0 | `NOT_APPLICABLE` |
| 10 | SUSPENDED | 부재 — Delegation 정지(§43) 0 · Security Suspension=로그인 스로틀(`login_attempt.locked_until`·권한정지 아님·ⓑ §3.4) | `NOT_APPLICABLE` |
| 11 | REVOKED | 부재 — 인접 `revoked_at`(AgencyPortal·API키)은 토큰/접근 폐기이지 Delegation revoke 아님(ⓑ §2.3) | `NOT_APPLICABLE` |
| 12 | EXPIRED | 부재 — Delegation 만료 개념 0(effective-dating 엔티티 부재·ⓑ §2.1 "기간 없음") | `NOT_APPLICABLE` |
| 13 | SUPERSEDED | 부재 — Delegation 버전 supersede 링크 0 | `NOT_APPLICABLE` |
| 14 | RETIRED | 부재 | `NOT_APPLICABLE` |
| 15 | ARCHIVED | 부재 | `NOT_APPLICABLE` |
| 16 | BLOCKED | 부재 | `NOT_APPLICABLE` |

### 허용 전이 예 (15)

| # | 원문 전이 | 현행 대조 | 판정 |
|---|---|---|---|
| 17 | DRAFT → VALIDATION_PENDING | Delegation 상태머신 부재 → 전이 정의 불가 | `NOT_APPLICABLE` |
| 18 | VALIDATION_PENDING → VALIDATION_FAILED | 부재 | `NOT_APPLICABLE` |
| 19 | VALIDATION_PENDING → ACCEPTANCE_PENDING | 부재 | `NOT_APPLICABLE` |
| 20 | VALIDATION_PENDING → APPROVAL_PENDING | 부재 | `NOT_APPLICABLE` |
| 21 | ACCEPTANCE_PENDING → APPROVAL_PENDING | 부재 — 수락→승인 전이 개념 0 | `NOT_APPLICABLE` |
| 22 | APPROVAL_PENDING → APPROVED | 부재 | `NOT_APPLICABLE` |
| 23 | APPROVED → SCHEDULED | 부재 | `NOT_APPLICABLE` |
| 24 | APPROVED → ACTIVE | 부재 — 즉시활성 전이 0 | `NOT_APPLICABLE` |
| 25 | SCHEDULED → ACTIVE | 부재 — 예약활성 전이 0(자동 활성 §20 미구현) | `NOT_APPLICABLE` |
| 26 | ACTIVE → SUSPENDED | 부재 — §43 정지 전이 0 | `NOT_APPLICABLE` |
| 27 | ACTIVE → REVOKED | 부재 — §44 철회 전이 0 | `NOT_APPLICABLE` |
| 28 | ACTIVE → EXPIRED | 부재 — §45 만료 전이 0 | `NOT_APPLICABLE` |
| 29 | SUSPENDED → ACTIVE | 부재 — 정지해제 재활성 전이 0 | `NOT_APPLICABLE` |
| 30 | SUSPENDED → REVOKED | 부재 | `NOT_APPLICABLE` |
| 31 | ACTIVE → SUPERSEDED | 부재 — 버전 교체 전이 0 | `NOT_APPLICABLE` |

**실측 개수: 31 / 31 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 31.

> 🔴 **커버 0.** Delegation 상태머신이 통째로 부재하므로 어떤 상태·전이도 `VALIDATED_LEGACY` 가 아니다. §41 상태 16종이 §10 Version 상태 enum(스펙 줄 793-810)과 문자까지 동일한 것은 **동일 신설 도메인의 자기참조**이지 기존 구현 커버가 아니다. `LEGACY_ADAPTER` 조차 아님(상태 대입 8곳은 §2 참조 패턴일 뿐 상태값 자체가 다른 도메인).

## 2. 규칙

- 🔴 **합법 전이집합을 반드시 화이트리스트로 선언하라 — 현행 전 도메인이 이를 선언하지 않는다.** 직접 `UPDATE ... SET status=` 대입 8곳:
  1. `AdminGrowth.php:1063`(`admin_growth_campaign status='pending_approval'`) · `:641`(`admin_growth_approval status='pending'`)
  2. `Paddle.php:592`(`status='canceled'`)·`:642`(`status='active'`) — 구독 상태(빌링)
  3. `OrderHub.php:471`(수동취소 `status='cancelled'` 가드 — **단일 술어 방어일 뿐 from→to 합법집합 아님**·227차 P0)
  4. `Wms.php:1891`(`status='shipped'`)·`:1933`(`status='pending'` 역복원) — 픽킹 왕복
  5. `AdminPlans.php:339-341`(plan active/canceled 집계)
  6. `Dsar.php:306`(`status='pending_verification'`)
  7. `AttributionEngine.php:528`(`event_type='order'+status='cancelled'` 취소식별)
  8. `Mapping::approve:238-291`(정족수 통과 시 `status='approved'`)

  **어느 것도 Invalid Transition 을 차단하지 않는다**(from 상태 검증 없이 대입). Delegation 신설 시 이 패턴을 답습하지 말고 §41 16상태 × 허용 전이 15쌍을 명시 화이트리스트로 강제하고 그 외 전이를 fail-closed 로 막아라(원문 "Invalid Transition 을 차단하라").
- 🔴 **§41 Lifecycle 16종을 §10 Version 상태 enum과 이중 정의하지 마라** — 스펙 줄 793-810 과 문자 동일이다. Delegation Version 상태와 Lifecycle 상태는 **단일 상태 소스**로 두고, `pm_audit_log.entity_type` ENUM 이 신규값 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 확장 가능 카탈로그로.
- 🔴 **SUSPENDED/REVOKED/EXPIRED 를 "있음"으로 표기 금지** — 이 상태들은 §42 Activation·§43 Suspension·§44 Revocation·§45 Expiration 처리기가 신설된 뒤에만 실재한다(현재 전량 ABSENT). 상태 enum 만 먼저 선언하고 전이 처리기를 비우면 §11 "Decision 시점 재검증"(만료/취소/정지 시 승인 차단)이 구조적으로 무력화된다.
- 🔴 **상태 전이는 immutable 근거와 함께 기록하라** — evidence 정본=`SecurityAudit::verify():56-68`(preimage ts·hash_equals·prev_hash·tenant) 확장. `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]·검증 불가능한 장식).
