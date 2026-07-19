# DSAR — Permission Data Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission을 **데이터 분류(민감도 등급) × 데이터 동작**의 격자로 통제하는 축. "개인정보(PERSONAL_DATA)는 마스킹 조회만, 결제데이터(PAYMENT_DATA)는 내보내기 금지" 같은 정책을 분류 단위로 강제한다. Row Scope(어떤 행)·Field Scope(어떤 필드)와 직교하며, 분류 등급이 동작(VIEW/EXPORT/PURGE 등)과 교차해 규제 준수를 보장한다. 신설이 아니라 실존 `TeamPermissions` `data_scope`(DATA_SCOPES 9 dims)를 Data Category 축의 substrate로 흡수·정규화한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `data_category` | 데이터 분류 등급(§3 열거) |
| `data_action` | 데이터 동작(§3 열거) |
| `effect` | ALLOW / DENY(Denied 우선) |
| `mask_required` | Boolean(MASKED_VIEW 강제 여부) |
| `export_prohibited` | Boolean(EXPORT/DOWNLOAD 금지 여부) |
| `retention_policy_ref` | RETAIN/PURGE_REFERENCE 연계 보존정책 참조 |
| `classification_source` | 분류 부여 출처(선언/추론·신뢰도 기록) |
| `digest` | Data Scope 정규화 스냅샷 해시 |

## 3. 열거형 / 타입

**data_category**: `PUBLIC` · `INTERNAL` · `CONFIDENTIAL` · `RESTRICTED` · `PERSONAL_DATA` · `FINANCIAL_DATA` · `CONTRACT_DATA` · `PAYMENT_DATA` · `SECURITY_DATA` · `AUDIT_DATA` · `REGULATED_DATA`.
**data_action**: `VIEW` · `CREATE` · `UPDATE` · `DELETE` · `MASKED_VIEW` · `EXPORT` · `SHARE` · `PRINT` · `DOWNLOAD` · `RETAIN` · `PURGE_REFERENCE`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Data 차원 축(최근접) | `TeamPermissions` `DATA_SCOPES` 9 dims | ROW/DATA_SCOPE_CANDIDATE(확장) | `TeamPermissions.php:41` |
| 실 enforce | `data_scope` 테이블 + `effectiveScope`/`scopeSql` | 부분 substrate(4/57핸들러) | `TeamPermissions.php:160-166`·`:236-265`·`:286-293` |
| fail-closed | `DENY_SCOPE`·`1=0` 센티넬 | 부분 substrate | `TeamPermissions.php:234`·`:290,303` |
| Data Category 11등급 × 11동작 격자·`mask_required`·`export_prohibited`·`retention_policy_ref`·`classification_source`·`digest` | — | **ABSENT(순신규)** | 현행 9 dims는 데이터 "차원"(채널/상품 등 행필터축)이지 민감도 분류 등급이 아님 |

★정직 구분: 현행 `DATA_SCOPES` 9 dims는 **행필터 대상 차원**(채널·상품 등)이며, 본 문서의 **데이터 민감도 분류(PERSONAL/PAYMENT/REGULATED…)×동작 격자와는 다른 개념**이다. 9 dims를 분류 등급으로 오인 매핑하지 않는다(반날조). Data Category 축은 순신규이되 `data_scope` 저장/enforce 파이프라인을 substrate로 재사용한다.

## 5. 설계 원칙 / 결정

- **분류 × 동작 격자**: 등급별로 허용 동작을 명시 — 예 PAYMENT_DATA는 EXPORT/DOWNLOAD Default Deny, MASKED_VIEW만 조건 허용.
- **Field/Row와 직교·Intersection**: Data Category 통제는 Field Scope([`DSAR_APPROVAL_PERMISSION_FIELD_SCOPE`](DSAR_APPROVAL_PERMISSION_FIELD_SCOPE.md))·Row Scope와 교집합으로 결합(가장 좁은 결과).
- **분류 출처 신뢰도**: `classification_source`(선언/추론)와 신뢰도를 기록 — 미분류는 최고 민감(RESTRICTED) fail-secure 취급.
- **PURGE_REFERENCE는 참조 제거**: No-PII 원칙과 정합 — 물리 원본이 아닌 참조/집계 제거 동작으로 모델(레포 aggregation-only 설계 계승).
- Golden Rule: 중복 데이터 분류 엔진 신설 금지 — `data_scope` 저장/enforce 계층 재사용.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: Data Category 11등급 × 11동작 격자·`mask_required`·`export_prohibited`·`retention_policy_ref`·`classification_source`·`digest` = 순신규 ABSENT.
- **개념 구분**: 현행 9 dims(행필터 차원) ≠ 민감도 분류 등급 — 오승격 금지.
- **BLOCKED_PREREQUISITE**: 분류 격자는 리소스 필드-분류 태깅(Field Scope 정본) + 보존정책 모델 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건은 289차 P1~P4로 해소됨 — 재플래그 금지.
