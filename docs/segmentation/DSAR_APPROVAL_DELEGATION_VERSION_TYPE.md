# DSAR — Approval Delegation Version Type (§10 Version Type)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §10 Version Type(771-791) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md) · 상위: [VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) 필드 #5

> **★분할 분모: 필수필드 31 + Version Type 19 + 상태 16 = 66 = §10 측정기 정합** (`measure_spec_denominator.mjs --sec=10` = 66 · 필수필드 31[[VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md)] + Version Type **19**[본 문서] + status 16[[STATUS](DSAR_APPROVAL_DELEGATION_STATUS.md)]). 본 문서 = Version Type **19종**.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Version Type ENUM | `version_type` grep **0**(위임 도메인) — Delegation·버전 엔티티 자체 부재(→[VERSION](DSAR_APPROVAL_DELEGATION_VERSION.md) #3·#5·ⓑ §0·§1) | `NOT_APPLICABLE` |
| 변경유형 열거 전제 | Version Type 은 **버전 엔티티가 있어야** 변경 성격을 분류한다. Delegation 버전 엔티티가 부재하므로 19종 열거는 **분류할 대상이 없다**(전제 거짓) | `NOT_APPLICABLE` |
| 유일 인접 "변경/철회" 행위 | 🔴 `AgencyPortal.php:304,381` `revoked_at=NULL` **in-place 소거**(ⓑ §2.3) — 이력 보존 없는 철회/정정 = REVOCATION·CORRECTION 반례 | `BLOCKED_HISTORICAL_INTEGRITY_RISK`(상속 금지) |

★**버전 엔티티 부재 → 변경유형(Version Type) 열거는 무의미.** 19종 전량 `NOT_APPLICABLE`. 아래는 원문 전사이며 각 타입이 "무엇을 트리거하는 변경인가"만 기록한다(신설 시 카탈로그 후보). `VALIDATED_LEGACY` 금지(커버 0).

## 1. 원문 전사 + 판정 — **Version Type 19종**

| # | 원문 Type | 변경 트리거(원문 의미) · 현행 대조(ⓑ) | 판정 |
|---|---|---|---|
| 1 | INITIAL | 최초 버전 생성 · Delegation 버전 엔티티 부재 → 최초 버전 개념 없음(ⓑ §1) | `NOT_APPLICABLE` |
| 2 | PERIOD_CHANGE | 위임 기간 변경 · Delegation Period(§20) 부재 · `acl_permission` 위임상한은 기간 컬럼 부재(ⓑ §2.1 표) | `NOT_APPLICABLE` |
| 3 | DELEGATE_CHANGE | 수임자 변경 · Delegate 엔티티(§22) 부재(ⓑ §3.3) | `NOT_APPLICABLE` |
| 4 | SCOPE_CHANGE | 위임 스코프 변경 · Delegation Scope(§11) 엔티티 부재(ⓑ §1) | `NOT_APPLICABLE` |
| 5 | AUTHORITY_CHANGE | 위임 권한 변경 · 🔴 Authority 개념 부재(`authority_matrix`·`approval_authority` grep 0·ⓑ §3.2) | `NOT_APPLICABLE` |
| 6 | ACTION_CHANGE | 위임 액션 종류 변경 · Action Scope 엔티티 부재(승인 4경로 액션 위임 분해 0·ⓑ §2.2) | `NOT_APPLICABLE` |
| 7 | RESOURCE_CHANGE | 리소스 스코프 변경 · Resource Registry 엔티티 부재(§3.3 선행조건 미충족·ⓑ §3) | `NOT_APPLICABLE` |
| 8 | ORGANIZATION_CHANGE | 조직 스코프 변경 · Organization Unit/Hierarchy 엔티티 0(ⓑ §3.3) | `NOT_APPLICABLE` |
| 9 | LEGAL_ENTITY_CHANGE | 법인 스코프 변경 · 🔴 Legal Entity void(`biz_no`/`corp_reg`/`tax_id` grep 0·`business_number`=회사프로필 단일 문자열·ⓑ §3.3) | `NOT_APPLICABLE` |
| 10 | MONETARY_LIMIT_CHANGE | 금액 한도 변경 · 🔴 금액축 부재(`Catalog.php:1016` HIGH_VALUE_KRW 상수만·ⓑ §3.2) → 변경할 한도 엔티티 없음 | `NOT_APPLICABLE` |
| 11 | CURRENCY_CHANGE | 통화 스코프 변경 · 통화 스코프 0·환율 저장계층 부재(ⓑ §3.2 귀결) | `NOT_APPLICABLE` |
| 12 | REDELEGATION_CHANGE | 재위임 정책 변경 · 🔴 재위임 개념 0(`redelegation`/`delegated_ceiling` 복합어 grep 0·member 재부여 경로 0·ⓑ §2.1 표) | `NOT_APPLICABLE` |
| 13 | ACCEPTANCE_CHANGE | 수락 상태 변경 · 🔴 Delegate 수락(§23) 개념 0(manager 일방 치환 `TeamPermissions:652`·ⓑ §2.1 표·§2.2) | `NOT_APPLICABLE` |
| 14 | APPROVAL_CHANGE | 위임 승인 상태 변경 · 🔴 Delegation 승인(§24) 라이프사이클 부재(승인=진입 게이트 통과자·ⓑ §2.2) | `NOT_APPLICABLE` |
| 15 | SUSPENSION | 정지 버전 · 버전 상태머신 부재(→[STATUS](DSAR_APPROVAL_DELEGATION_STATUS.md)·ⓑ §1) | `NOT_APPLICABLE` |
| 16 | REVOCATION | 철회 버전 · 🔴 유일 인접 철회 = `AgencyPortal.php:304,381` `revoked_at=NULL` **in-place 소거**(이력 보존 없는 파괴적 철회·ⓑ §2.3) = **반례**. 철회를 새 버전으로 남기지 않고 원본을 덮어쓰면 `BLOCKED_HISTORICAL_INTEGRITY_RISK` | `NOT_APPLICABLE` |
| 17 | EMERGENCY_ACTIVATION | 긴급 위임 활성 · Emergency Delegate 개념 0(`emergency` 부재·ⓑ §1) | `NOT_APPLICABLE` |
| 18 | CORRECTION | 오류 정정 버전 · 🔴 유일 인접 정정 = `AgencyPortal.php:304,381` `revoked_at=NULL` **in-place 소거**(이력 보존 없는 파괴적 정정·ⓑ §2.3) = **반례**. 정정을 새 버전으로 보존하지 않으면 `BLOCKED_HISTORICAL_INTEGRITY_RISK` | `NOT_APPLICABLE` |
| 19 | MIGRATION | 이행에 따른 버전 승격 · 이행 집행수단 부재(`backend/migrations/` 172정지·`ensureTables` 백필 0·ⓑ §3 선행조건 미충족) | `NOT_APPLICABLE` |

**실측 개수: 19 / 19 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 19(전량).

> 🔴 **커버 0.** Delegation 버전 엔티티가 부재하므로 변경유형 19종은 **분류할 실체가 없다**. REVOCATION(#16)·CORRECTION(#18)의 유일 인접 행위인 `AgencyPortal` `revoked_at=NULL` in-place 소거(ⓑ §2.3)는 **철회/정정을 새 버전으로 보존하지 않는 파괴적 패턴**으로, 신설 시 이를 복제하면 `BLOCKED_HISTORICAL_INTEGRITY_RISK` 를 상속한다.

## 2. 규칙

- 🔴 **Version Type 19종을 ENUM 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 **확장 가능 카탈로그**로.
- 🔴 **REVOCATION·CORRECTION 을 in-place 소거로 구현하지 마라** — `AgencyPortal.php:304,381` `revoked_at=NULL`(ⓑ §2.3)은 원본을 파괴하는 철회/정정이다. REVOCATION·CORRECTION 버전은 **원본 버전을 SUPERSEDED 로 남기고 새 버전을 append** 해야 하며(→[STATUS](DSAR_APPROVAL_DELEGATION_STATUS.md)), `SecurityAudit::verify()` prev-링크 불변성(ⓑ §2.5)을 상속해야 한다(`BLOCKED_HISTORICAL_INTEGRITY_RISK` 회피).
- 🔴 **변경유형을 능력 없이 선언하지 마라** — MONETARY_LIMIT_CHANGE/CURRENCY_CHANGE/PERIOD_CHANGE/AUTHORITY_CHANGE 는 각각 금액축·통화 저장계층·Delegation Period·Authority 엔티티가 **저장계층부터 부재**다(ⓑ §3.2·§3.3). 타입만 카탈로그에 넣고 변경 대상 능력이 없으면 §65 "타입은 있으나 집행 없음" fake-looks-real 을 유발한다.
- 🔴 **ACCEPTANCE_CHANGE·APPROVAL_CHANGE 는 수락·승인 라이프사이클 신설을 전제한다** — 현행 승인 4경로에 Delegate 수락·위임 승인 단계가 전무하다(승인=actor 본인·ⓑ §2.2). §23 Acceptance·§24 Delegation Approval 신설 없이 이 두 타입은 변경할 상태가 없다.
