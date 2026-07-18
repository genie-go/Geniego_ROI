# DSAR — Approval Authority Version Type (§10 Version Type)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §10 Version Type(797-813) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · 상위: [VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) 필드 #5

> **★분할 분모: 28+15+14=57 = §10 측정기 정합** (`measure_spec_denominator.mjs --sec=10` = 57 · 필수필드 28[[VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md)] + Version Type **15**[본 문서] + status 14[[VERSION_STATUS](DSAR_APPROVAL_AUTHORITY_VERSION_STATUS.md)]). 본 문서 = Version Type **15종**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Version Type ENUM | `version_type` grep **0**(승인 도메인) — 버전 엔티티 자체 부재(→[VERSION](DSAR_APPROVAL_AUTHORITY_VERSION.md) #3·#5·ⓑ §5) | `NOT_APPLICABLE` |
| 변경유형 열거 전제 | Version Type 은 **버전 엔티티가 있어야** 변경 성격을 분류한다. 버전 엔티티가 부재하므로 15종 열거는 **분류할 대상이 없다**(전제 거짓) | `NOT_APPLICABLE` |
| 유일 인접 "변경" 행위 | 🔴 `AgencyPortal.php:304,381` `revoked_at=NULL` **in-place 소거**(ⓑ §5) — 이력 보존 없는 정정 = CORRECTION 반례 | `BLOCKED_HISTORICAL_INTEGRITY_RISK`(상속 금지) |

★**버전 엔티티 부재 → 변경유형(Version Type) 열거는 무의미.** 15종 전량 `NOT_APPLICABLE`. 아래는 원문 전사이며 각 타입이 "무엇을 트리거하는 변경인가"만 기록한다(신설 시 카탈로그 후보). `VALIDATED_LEGACY` 금지(커버 0).

## 1. 원문 전사 + 판정 — **Version Type 15종**

| # | 원문 Type | 변경 트리거(원문 의미) · 현행 대조(ⓑ) | 판정 |
|---|---|---|---|
| 1 | INITIAL | 최초 버전 생성 · 버전 엔티티 부재 → 최초 버전 개념 없음 | `NOT_APPLICABLE` |
| 2 | LIMIT_CHANGE | 금액/누적 한도 변경 · 금액축 부재(`HIGH_VALUE_KRW` 상수만·ⓑ §4) → 변경할 한도 엔티티 없음 | `NOT_APPLICABLE` |
| 3 | SCOPE_CHANGE | 승인 스코프 변경 · Authority Scope 엔티티 부재(ⓑ §6) | `NOT_APPLICABLE` |
| 4 | CURRENCY_CHANGE | 통화 스코프 변경 · 통화 스코프 0·환율 저장계층 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 5 | PERIOD_CHANGE | 한도 기간 변경 · Authority Period 엔티티 부재(§30 도메인 authority 한도 부재·ⓑ §4) | `NOT_APPLICABLE` |
| 6 | ACTION_CHANGE | 승인 액션 종류 변경 · Authority Action 엔티티 부재(ⓑ §0) | `NOT_APPLICABLE` |
| 7 | LEGAL_ENTITY_CHANGE | 법인 스코프 변경 · 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1) | `NOT_APPLICABLE` |
| 8 | ROLE_CHANGE | 역할 권한 변경 · 권한축 2벌 분열·양방향 매핑 0(ⓑ §3) → 권위 역할축 없음 | `NOT_APPLICABLE` |
| 9 | POSITION_CHANGE | 직위/직급 임계 변경 · `job_grade_threshold`·`position_threshold` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 10 | DENY_RULE_CHANGE | 명시 거부 규칙 변경 · explicit deny 표현 없음(`acl_permission` allow-only·ⓑ §6) | `NOT_APPLICABLE` |
| 11 | FINANCIAL_CONTROL_CHANGE | 재무통제 변경 · Finance Approval Matrix 0·DOA Matrix 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 12 | SECURITY_PATCH | 보안 패치성 버전 · 버전 엔티티 부재 → 패치 버전 개념 없음 | `NOT_APPLICABLE` |
| 13 | LEGAL_CHANGE | 법적 요건 변경 · Authority 법적 요건 엔티티 부재 | `NOT_APPLICABLE` |
| 14 | MIGRATION | 이행에 따른 버전 승격 · 이행 집행수단 부재(migrations 172정지·`ensureTables` 백필 0·ⓑ §5·→[MIGRATION_POLICY](DSAR_APPROVAL_AUTHORITY_MIGRATION_POLICY.md)) | `NOT_APPLICABLE` |
| 15 | CORRECTION | 오류 정정 버전 · 🔴 유일 인접 정정 = `AgencyPortal.php:304,381` `revoked_at=NULL` **in-place 소거**(이력 보존 없는 파괴적 정정·ⓑ §5) = **반례**. 정정을 새 버전으로 남기지 않고 원본을 덮어쓰면 `BLOCKED_HISTORICAL_INTEGRITY_RISK` | `NOT_APPLICABLE` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 15(전량).

> 🔴 **커버 0.** 버전 엔티티가 부재하므로 변경유형 15종은 **분류할 실체가 없다**. CORRECTION(#15)의 유일 인접 행위인 `AgencyPortal` `revoked_at=NULL` in-place 소거는 **정정을 새 버전으로 보존하지 않는 파괴적 패턴**으로, 신설 시 이를 복제하면 `BLOCKED_HISTORICAL_INTEGRITY_RISK` 를 상속한다.

## 2. 규칙

- 🔴 **Version Type 15종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 **확장 가능 카탈로그**로.
- 🔴 **CORRECTION 을 in-place 소거로 구현하지 마라** — `AgencyPortal.php:304,381` `revoked_at=NULL`(ⓑ §5)은 원본을 파괴하는 정정이다. CORRECTION 버전은 **원본 버전을 SUPERSEDED 로 남기고 새 버전을 append** 해야 하며, `SecurityAudit` prev-링크 불변성을 상속해야 한다(`BLOCKED_HISTORICAL_INTEGRITY_RISK` 회피).
- 🔴 **변경유형을 능력 없이 선언하지 마라** — LIMIT_CHANGE/CURRENCY_CHANGE/PERIOD_CHANGE 는 각각 금액축·통화 저장계층·기간 authority 가 **저장계층부터 부재**다(ⓑ §4). 타입만 카탈로그에 넣고 변경 대상 능력이 없으면 §65 "타입은 있으나 집행 없음" fake-looks-real 을 유발한다.
