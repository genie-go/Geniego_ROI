# DSAR — Approval Authority Error / Warning Contract (§68 + §69)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0 (문서만)**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §68(2731-2775)·§69(2781-2800) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md)(§1·§3·§4·§5·§7·§8) · 인접 판정 정본: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=68` → **§68 = 45(bullet 45·number 0)** · `--sec=69` → **§69 = 20(bullet 20·number 0)** · **문서 합계 측정기 = §68(45) + §69(20) = 65.**

## 0. 헤더 — 분할 분모 명기

| 측정기 | 섹션 | 줄범위 | 원문 항목 수 | 판정 대상 |
|---|---|---|---|---|
| `--sec=68` | §68 Error Contract | 2729-2778 | **45** | 에러코드 45 |
| `--sec=69` | §69 Warning Contract | 2779-2803 | **20** | 경고코드 20 |
| **문서1 합계** | §68 + §69 | — | **65** | 전사 65 |

★**핵심 사실(ⓑ)**: 레포에 "Approval Authority"(Domain·Action·Scope·Amount 승인권한) 개념이 **부재**하므로(ⓑ §0·§1), 이 에러/경고 계약이 겨냥하는 **엔티티(Registry·Type·Domain·Definition·Matrix·Binding·Threshold·Candidate·Resolution)가 통째로 없다**. 따라서 대부분 코드는 발생 지점(raise site)이 없어 `NOT_APPLICABLE`이며, **인접 실재 가드**가 있는 3개만 `LEGACY_ADAPTER`, deny 표현 부재 1개는 `ABSENT`이다. **판정 어휘 `VALIDATED_LEGACY` 사용 0(커버 0).**

---

## 1. §68 Error Contract — 원문 45 전사 + 판정

원문 verbatim(2731-2775). 접두 `APPROVAL_AUTHORITY_`는 원문 그대로 유지.

| # | 원문 에러코드 (verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | `APPROVAL_AUTHORITY_REGISTRY_NOT_FOUND` | Registry 엔티티 부재(ⓑ §1·registry doc §1) — raise site 없음 | `NOT_APPLICABLE` |
| 2 | `APPROVAL_AUTHORITY_TYPE_NOT_FOUND` | Authority Type 축 0(ⓑ §1) | `NOT_APPLICABLE` |
| 3 | `APPROVAL_AUTHORITY_DOMAIN_NOT_FOUND` | Authority Domain 축 0(ⓑ §1) | `NOT_APPLICABLE` |
| 4 | `APPROVAL_AUTHORITY_DEFINITION_NOT_FOUND` | Definition 엔티티 0 | `NOT_APPLICABLE` |
| 5 | `APPROVAL_AUTHORITY_VERSION_NOT_FOUND` | 불변 버전체인 선례 0(version 6컬럼 하드코딩 태그·ⓑ §5) | `NOT_APPLICABLE` |
| 6 | `APPROVAL_AUTHORITY_VERSION_INACTIVE` | active version 상태전이 없음(ⓑ §5) | `NOT_APPLICABLE` |
| 7 | `APPROVAL_AUTHORITY_VERSION_IMMUTABLE` | 불변성 강제 대상 버전 부재 | `NOT_APPLICABLE` |
| 8 | `APPROVAL_AUTHORITY_MATRIX_NOT_FOUND` | 🔴 DOA/Authority Matrix Table = **없음**(ⓑ §1 결론) | `NOT_APPLICABLE` |
| 9 | `APPROVAL_AUTHORITY_MATRIX_VERSION_NOT_FOUND` | Matrix 부재 → 버전 부재 | `NOT_APPLICABLE` |
| 10 | `APPROVAL_AUTHORITY_MATRIX_VERSION_INACTIVE` | 동상 | `NOT_APPLICABLE` |
| 11 | `APPROVAL_AUTHORITY_MATRIX_ENTRY_NOT_FOUND` | Matrix Entry 부재 | `NOT_APPLICABLE` |
| 12 | `APPROVAL_AUTHORITY_MATRIX_ENTRY_INACTIVE` | 동상 | `NOT_APPLICABLE` |
| 13 | `APPROVAL_AUTHORITY_BINDING_INVALID` | Subject/Role/Position Binding 축 부재(§55 snapshot ABSENT·ⓑ §5) | `NOT_APPLICABLE` |
| 14 | `APPROVAL_AUTHORITY_SUBJECT_INACTIVE` | Authority Subject 개념 없음(승인자=진입게이트 통과자·ⓑ §3) | `NOT_APPLICABLE` |
| 15 | `APPROVAL_AUTHORITY_ROLE_INACTIVE` | 인접 = `acl_permission.approve`=장식·소비 핸들러 0(ⓑ §3) — Authority Role 아님 | `NOT_APPLICABLE` |
| 16 | `APPROVAL_AUTHORITY_POSITION_VACANT` | 🔴 사람-직위(Position) 계층 walk 0·`parent_user_id`=owner/tenant 상속 전용(ⓑ §3) | `NOT_APPLICABLE` |
| 17 | `APPROVAL_AUTHORITY_TENANT_MISMATCH` | **인접 실재** — Cross-tenant 차단 REAL: `index.php:600` 인증키 tenant_id로 `X-Tenant-Id` 무조건 덮어쓰기(ⓑ §7). 🔴 단 strict fail-closed 기본 OFF(`index.php:585` `GENIE_STRICT_AUTH==='1'` 옵트인) | `LEGACY_ADAPTER` |
| 18 | `APPROVAL_AUTHORITY_WORKSPACE_MISMATCH` | Workspace 스코프 축 부재 | `NOT_APPLICABLE` |
| 19 | `APPROVAL_AUTHORITY_LEGAL_ENTITY_MISMATCH` | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·registry doc §1-12) | `NOT_APPLICABLE` |
| 20 | `APPROVAL_AUTHORITY_ORGANIZATION_MISMATCH` | Organization 승인축 부재 | `NOT_APPLICABLE` |
| 21 | `APPROVAL_AUTHORITY_GEOGRAPHY_MISMATCH` | 지리축=`Geo`(IP→ISO)·TikTok country_code — Authority 지리 스코프 아님(registry doc §1-13) | `NOT_APPLICABLE` |
| 22 | `APPROVAL_AUTHORITY_RESOURCE_MISMATCH` | 인접=`acl_permission` scopeSql 데이터-행 필터(ⓑ §3) — Authority 리소스 스코프 아님 | `NOT_APPLICABLE` |
| 23 | `APPROVAL_AUTHORITY_ACTION_MISMATCH` | Action 권한 매칭 축 부재(HTTP메서드 등급만·ⓑ §3 `index.php:568`) | `NOT_APPLICABLE` |
| 24 | `APPROVAL_AUTHORITY_CURRENCY_MISMATCH` | 🔴 통화 스코프 0(`currency_scope`/`allowed_currency` grep 0·ⓑ §4) | `NOT_APPLICABLE` |
| 25 | `APPROVAL_AUTHORITY_FX_RATE_UNAVAILABLE` | 🔴 FX 미가용이 **에러로 표출 안 됨** — `fxRates` `$defaults` 폴백으로 조용히 대체(ⓑ §4·`Connectors.php:1790`) → 미가용 신호 소실 | `ABSENT` |
| 26 | `APPROVAL_AUTHORITY_FX_RATE_STALE` | **인접 실재** — `Connectors.php:1794-1796` **24h TTL 신선도 가드**(`$age<86400` 만료 시 라이브 재조회·ⓑ §4). 🔴 단 과거환율(as-of)은 저장계층 부재로 여전 조회 불가 | `LEGACY_ADAPTER` |
| 27 | `APPROVAL_AUTHORITY_AMOUNT_BELOW_FLOOR` | Amount Band/floor 부재 — 유일 금액조건=`Catalog.php:1016` `HIGH_VALUE_KRW` 상수(필요여부 boolean만·ⓑ §1) | `NOT_APPLICABLE` |
| 28 | `APPROVAL_AUTHORITY_AMOUNT_ABOVE_CEILING` | ceiling 집행 부재 — high_value가 한도 미집행(§65 gap·ⓑ §4·§8) | `NOT_APPLICABLE` |
| 29 | `APPROVAL_AUTHORITY_THRESHOLD_GAP` | `amount_threshold`/`approval_threshold` grep 0(ⓑ §4) | `NOT_APPLICABLE` |
| 30 | `APPROVAL_AUTHORITY_THRESHOLD_CONFLICT` | 임계 충돌 탐지 대상 없음(복수 임계 부재) | `NOT_APPLICABLE` |
| 31 | `APPROVAL_AUTHORITY_LIMIT_PERIOD_EXHAUSTED` | 인접(마케팅)=`AutoCampaign.php:855-864` 기간지출→상한도달 `budget_cap_pause`(ⓑ §4 FLIP) — **광고 예산이지 승인 한도 아님·에러코드 아님** | `NOT_APPLICABLE` |
| 32 | `APPROVAL_AUTHORITY_CUMULATIVE_LIMIT_EXCEEDED` | 동상 — `AutoCampaign` 누적차감은 마케팅 도메인·승인 워크플로 아님(ⓑ §4) | `NOT_APPLICABLE` |
| 33 | `APPROVAL_AUTHORITY_EXPLICITLY_DENIED` | 🔴 **explicit deny 표현 자체가 없음** — `acl_permission`=allow-only·deny>allow 우선 구조 0(ⓑ §3·§6) | `ABSENT` |
| 34 | `APPROVAL_AUTHORITY_ELIGIBILITY_FAILED` | §45/§46 Eligibility=`BLOCKED_PREREQUISITE`(판정축 부재·ⓑ §3 결론) | `NOT_APPLICABLE` |
| 35 | `APPROVAL_AUTHORITY_SELF_APPROVAL_BLOCKED` | **인접 실재** — `Mapping.php:268` 자기승인 차단(`requested_by===actor`→403 maker-checker·ⓑ §2). 🔴 단 나머지 3경로(catalog/action_request/admin_growth) 미방어(ⓑ §8) | `LEGACY_ADAPTER` |
| 36 | `APPROVAL_AUTHORITY_SOD_FAILED` | 인접=`Mapping.php:278` dedup(동일 승인자 2회 차단)뿐 · SoD(직무분리) 매트릭스 부재 | `NOT_APPLICABLE` |
| 37 | `APPROVAL_AUTHORITY_CONFLICT_OF_INTEREST` | 이해상충 판정 로직 0(ⓑ §6) | `NOT_APPLICABLE` |
| 38 | `APPROVAL_AUTHORITY_CONFLICT_UNRESOLVED` | §53/§54 충돌 탐지/해소 전 ABSENT(ⓑ §6) | `NOT_APPLICABLE` |
| 39 | `APPROVAL_AUTHORITY_SNAPSHOT_MISSING` | §55 Actor Auth Snapshot ABSENT(3경로 다 승인시점 권한 미보존·ⓑ §5) | `NOT_APPLICABLE` |
| 40 | `APPROVAL_AUTHORITY_SNAPSHOT_INVALID` | 동상 — 스냅샷 엔티티 부재 → 무결성 검증 대상 없음 | `NOT_APPLICABLE` |
| 41 | `APPROVAL_AUTHORITY_TASK_ASSIGNEE_DRIFT` | Task assignee/authority drift 감지 0(ⓑ §5·§8) | `NOT_APPLICABLE` |
| 42 | `APPROVAL_AUTHORITY_DECISION_ACTOR_DRIFT` | 결정 actor drift 감지 0 | `NOT_APPLICABLE` |
| 43 | `APPROVAL_AUTHORITY_REVALIDATION_REQUIRED` | 재검증 트리거 부재(Authority 변경 이벤트 없음) | `NOT_APPLICABLE` |
| 44 | `APPROVAL_AUTHORITY_RECONCILIATION_FAILED` | §63 Reconciliation ABSENT — 대사 기준(Tenant 마스터) 자체 부재(ⓑ §7) | `NOT_APPLICABLE` |
| 45 | `APPROVAL_AUTHORITY_RUNTIME_BLOCKED` | 런타임 차단(Kill Switch) 대상 Authority 실행경로 부재 | `NOT_APPLICABLE` |

**§68 실측 = 45 / 45 전사(측정기 45 일치).** 판정: `LEGACY_ADAPTER` **3**(17·26·35) · `ABSENT` **2**(25·33) · `NOT_APPLICABLE` **40** · `VALIDATED_LEGACY` **0**.

---

## 2. §69 Warning Contract — 원문 20 전사 + 판정

원문 verbatim(2781-2800).

| # | 원문 경고코드 (verbatim) | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | `APPROVAL_AUTHORITY_SOURCE_WARNING` | authoritative_source(SoT) 미결정(ⓓ ADR 대상·registry doc §1-6) | `NOT_APPLICABLE` |
| 2 | `APPROVAL_AUTHORITY_VERSION_WARNING` | 버전체인 부재(ⓑ §5) | `NOT_APPLICABLE` |
| 3 | `APPROVAL_AUTHORITY_MATRIX_WARNING` | DOA Matrix 부재(ⓑ §1) | `NOT_APPLICABLE` |
| 4 | `APPROVAL_AUTHORITY_BINDING_WARNING` | Binding 축 부재 | `NOT_APPLICABLE` |
| 5 | `APPROVAL_AUTHORITY_SUBJECT_EXCEPTION_WARNING` | Subject 예외 개념 없음 | `NOT_APPLICABLE` |
| 6 | `APPROVAL_AUTHORITY_POSITION_WARNING` | Position 계층 walk 0(ⓑ §3) | `NOT_APPLICABLE` |
| 7 | `APPROVAL_AUTHORITY_LEGAL_ENTITY_WARNING` | Legal Entity 0 | `NOT_APPLICABLE` |
| 8 | `APPROVAL_AUTHORITY_GEOGRAPHIC_WARNING` | Authority 지리 스코프 아님(registry doc §1-13) | `NOT_APPLICABLE` |
| 9 | `APPROVAL_AUTHORITY_RESOURCE_WARNING` | Authority 리소스 스코프 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 10 | `APPROVAL_AUTHORITY_ACTION_WARNING` | Action 권한축 부재(ⓑ §3) | `NOT_APPLICABLE` |
| 11 | `APPROVAL_AUTHORITY_THRESHOLD_WARNING` | 임계 축 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 12 | `APPROVAL_AUTHORITY_CURRENCY_WARNING` | 통화 스코프 0(ⓑ §4) | `NOT_APPLICABLE` |
| 13 | `APPROVAL_AUTHORITY_FX_WARNING` | **인접 실재** — FX 신선도 가드 `Connectors.php:1794-1796`(24h TTL·ⓑ §4)가 FX 경고의 자연 발생지 · 단 authority FX 스코프 아님·과거환율 불가 | `LEGACY_ADAPTER` |
| 14 | `APPROVAL_AUTHORITY_UTILIZATION_WARNING` | §31 Utilization=AutoCampaign 마케팅 누적(ⓑ §4) — 승인 utilization 아님 | `NOT_APPLICABLE` |
| 15 | `APPROVAL_AUTHORITY_ELIGIBILITY_WARNING` | Eligibility 판정축 부재(ⓑ §3) | `NOT_APPLICABLE` |
| 16 | `APPROVAL_AUTHORITY_CONFLICT_WARNING` | 충돌 탐지 0(ⓑ §6) | `NOT_APPLICABLE` |
| 17 | `APPROVAL_AUTHORITY_CHANGE_IMPACT_WARNING` | Authority 변경 영향분석 대상 부재 | `NOT_APPLICABLE` |
| 18 | `APPROVAL_AUTHORITY_SIMULATION_WARNING` | §61 Simulation 0(registry doc §1-16) | `NOT_APPLICABLE` |
| 19 | `APPROVAL_AUTHORITY_RECONCILIATION_WARNING` | §63 Reconciliation ABSENT(ⓑ §7) | `NOT_APPLICABLE` |
| 20 | `APPROVAL_AUTHORITY_MANUAL_REVIEW_REQUIRED` | 인접=4승인경로 `pending_approval` 수동검토 큐 실재이나 **경고코드 발행 아님**(상태값) | `NOT_APPLICABLE` |

**§69 실측 = 20 / 20 전사(측정기 20 일치).** 판정: `LEGACY_ADAPTER` **1**(13 FX_WARNING) · `NOT_APPLICABLE` **19** · `VALIDATED_LEGACY` **0**.

---

## 3. 커버리지 (문서1 = §68 + §69)

| 판정 | §68(45) | §69(20) | 합계(65) |
|---|---|---|---|
| `VALIDATED_LEGACY` | 0 | 0 | **0** |
| `LEGACY_ADAPTER` | 3 | 1 | **4** |
| `ABSENT` | 2 | 0 | **2** |
| `NOT_APPLICABLE` | 40 | 19 | **59** |

> 🔴 **커버 0.00%.** 에러/경고 계약이 겨냥하는 Authority 엔티티가 통째로 부재하므로 어떤 코드도 `VALIDATED_LEGACY`가 아니다. `LEGACY_ADAPTER` 4건(TENANT_MISMATCH·FX_RATE_STALE·SELF_APPROVAL_BLOCKED·FX_WARNING)은 **확장 대상 인접 가드**이지 커버가 아니다.

## 4. 규칙

- 🔴 **인접 가드 4건을 "이미 구현됨"으로 오독 금지** — TENANT_MISMATCH=`index.php:600`(strict 기본 OFF·§66 대상)·FX_RATE_STALE/FX_WARNING=`Connectors.php:1794`(과거환율 불가)·SELF_APPROVAL_BLOCKED=`Mapping.php:268`(4경로 중 1경로만 방어). **재구현 말고 확장**, 나머지 3승인경로에도 self-approval 방어 확산은 별도 승인세션.
- 🔴 **`EXPLICITLY_DENIED`를 error stub만 추가하지 마라** — deny 표현 자체가 부재다(`acl_permission` allow-only·ⓑ §6). 에러코드보다 deny>allow 우선 판정 구조(§4.9)가 선행이며, 이는 Authority Definition 신설과 동반해야 한다.
- 🔴 **`FX_RATE_UNAVAILABLE`(ABSENT)를 표면화하라** — 현재 `$defaults` 폴백이 미가용을 조용히 삼킨다. 미가용 신호가 소실되면 §70 Evidence의 `fx reference`가 날조 값으로 기록될 위험(균질화 금지 대상).
- 🔴 **에러코드 45종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8) 반복 금지. 확장 가능 카탈로그로.
