# DSAR — Permission Constraint (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission Grant/Definition에 부착되는 **일반화된 Constraint(제약)** 를 정형화한다. Tenant·법인·조직·Resource·Action·Field·Row·Data·API·Channel·Client·Amount·Currency·Time·세션/인증 보증 참조·사용횟수 등 다양한 차원을 **단일 Constraint 모델**(type·operator·value ref·required·failure effect·priority·digest)로 통일한다. 앞선 per-entity Scope(API/UI/Channel-Client/Amount-Currency/Time)는 이 Constraint 모델의 **type별 특화**이며, 여기서는 그 상위 공통 계약을 선언한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `constraint_id` | Constraint 식별자 |
| `type` | 제약 차원(§3 열거) |
| `operator` | 비교/집합 연산자 |
| `value_ref` | 비교 값 또는 참조(리터럴 인라인 금지·참조 우선) |
| `required` | Boolean(필수 제약 여부·false=선택 강화) |
| `failure_effect` | 미충족 시 효과(DENY/…) |
| `priority` | 평가 우선순위(Deny/명시 제약 우선) |
| `scope_ref` | 결합 대상 Grant/Definition |
| `digest` | Constraint 정의 불변 해시 |

## 3. 열거형 / 타입

- **type**: `TENANT` · `LEGAL_ENTITY` · `ORG` · `RESOURCE_TYPE` · `RESOURCE_INSTANCE` · `ACTION` · `FIELD` · `ROW` · `DATA` · `API` · `CHANNEL` · `CLIENT` · `DEVICE_TRUST_REF` · `AMOUNT` · `CURRENCY` · `TIME` · `SESSION_ASSURANCE_REF` · `AUTH_ASSURANCE_REF` · `USE_COUNT` · `CUSTOM`.
- **operator**: `EQ` · `IN` · `NOT_IN` · `LTE` · `GTE` · `RANGE` · `MATCH` · `SUBSET_OF` · `EXISTS`.
- **failure_effect**: `DENY`(기본·default-deny) · `WARN` · `STEP_UP_REQUIRED`(재인증 유도) · `SCOPE_REDUCE`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| ROW/DATA constraint | `data_scope`(9 dims·scope_values JSON) | ROW/DATA_SCOPE_CANDIDATE(확장) | `TeamPermissions.php:41`·`:160-166` |
| ROW enforce(실 SQL 주입) | `effectiveScope`/`scopeSql`/`scopeSqlNamed` | 부분 substrate(4핸들러 소비) | `TeamPermissions.php:236-265,286-293,299-307` |
| TENANT constraint(강제) | X-Tenant-Id 주입 | CANONICAL(격리) | `index.php:619` |
| ACTION constraint | `ACTIONS` 8동작 | 정형화 | `TeamPermissions.php:39` |
| RESOURCE constraint(근접) | `menu_key`(26 MENU_CATALOG) | 정형화 필요 | `TeamPermissions.php:55-82` |
| API constraint(coarse) | index.php write/scope 게이트 | 부분 substrate | `index.php:590-596` |
| failure_effect=DENY substrate | `DENY_SCOPE`·`1=0` 센티넬 | 부분(default-deny) | `TeamPermissions.php:234`·`:290,303` |
| USE_COUNT | — | **ABSENT(순신규)** | — |
| DEVICE_TRUST_REF·SESSION_ASSURANCE_REF·AUTH_ASSURANCE_REF·FIELD·CHANNEL·CLIENT·AMOUNT·CURRENCY·TIME·LEGAL_ENTITY | — | **ABSENT(순신규)** | — |
| 통합 Constraint 모델(operator·priority·digest) | — | **ABSENT(순신규)** | — |

★현행은 `data_scope`(ROW/DATA)와 tenant/action/menu·coarse API 게이트만 실재하며, **type·operator·priority·failure_effect·digest를 갖춘 통일 Constraint 엔티티**는 부재. FIELD·USE_COUNT·DEVICE/SESSION/AUTH assurance·AMOUNT/CURRENCY/TIME/CHANNEL/CLIENT 차원은 순신규.

## 5. 설계 원칙 / 결정

- **단일 Constraint 모델**: 앞선 Scope들(API/UI/Channel-Client/Amount-Currency/Time)은 `type`별 특화 뷰 — 별도 평가 엔진을 난립시키지 않고 하나의 operator/priority/failure_effect 파이프라인에서 평가.
- **default-deny·명시 제약 우선**: `required=true` 미충족 → `failure_effect=DENY`. `priority`로 Deny/명시 제약이 Allow보다 우선(ADR §6.9).
- **value_ref 참조 우선**: 하드코딩 리터럴(email/user-id) 금지 — 참조로 표현(ADR §D-3 정직 원칙 유지).
- Scope Intersection: 다수 Constraint = 교집합(권한 확장 금지·Expansion Guard).
- Golden Rule: `data_scope`·index.php 게이트를 Constraint substrate로 확장, 중복 정책 평가기 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 통일 Constraint 모델·operator/priority/failure_effect/digest·FIELD/USE_COUNT/assurance/AMOUNT/CURRENCY/TIME/CHANNEL/CLIENT type = 순신규 ABSENT.
- ROW/DATA constraint는 실재하나 **~57핸들러 중 4곳만 소비**(넓은 미필터 표면·enforcement gap·EXISTING §1.1).
- **BLOCKED_PREREQUISITE**: 통합 Constraint 평가는 Part 1 Decision Core + Canonical Action/Resource Registry 신설 후 — **RP-002**.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
