# DSAR — Permission Field Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission을 **리소스 내 개별 필드 수준**으로 세분하는 축. 민감 필드(예: `payment.bankAccount.accountNumber`)에 대해 조회/편집/마스킹조회/내보내기/관리 권한을 별도 통제한다. 핵심 불변식은 **Denied Field는 API Response와 Export에서도 물리적으로 제거·마스킹**되어야 하며, UI에서 숨기는 것만으로는 불충분하다(서버 측 필드 필터가 정본). ★**순신규** — 현재 플랫폼 acl은 `menu_key × action`(메뉴/동작) 단위이며 필드 수준 통제 축은 부재하므로 정직하게 ABSENT 선언 후 신설 설계만 제공한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `field_path` | Canonical Field Path(예 `payment.bankAccount.accountNumber`·nested/collection 표기) |
| `field_action` | 필드 동작(§3 열거) |
| `effect` | ALLOW / DENY(Denied 우선) |
| `mask_policy` | 마스킹 방식(FULL/PARTIAL/HASH·FIELD_MASKED_VIEW용) |
| `applies_to_export` | Boolean(항상 true — Export/Download에도 적용·비활성 불가) |
| `applies_to_api_response` | Boolean(항상 true — API 직렬화 단계 제거·비활성 불가) |
| `collection_scope` | 컬렉션 원소 전체/조건 적용 여부 |
| `schema_version` | 필드 경로가 유효한 리소스 스키마 버전 |
| `digest` | Field Scope 정규화 스냅샷 해시 |

## 3. 열거형 / 타입

**field_action**: `FIELD_VIEW` · `FIELD_EDIT` · `FIELD_MASKED_VIEW` · `FIELD_EXPORT` · `FIELD_ADMINISTER`.
**mask_policy**: `FULL`(전체 치환) · `PARTIAL`(끝자리 노출) · `HASH`(단방향) · `NONE`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Field 수준 통제 축 | — | **ABSENT(순신규·정직)** | acl은 menu_key×action 단위·필드 축 부재 |
| 최근접 상위 입도 | `acl_permission` actions(view/create/update/delete/approve/export/execute/manage) | 인접(리소스 수준·필드 아님) | `TeamPermissions.php:39`·`:152-159` |
| row 수준 필터(필드 아님) | `data_scope` scopeSql(행 단위·컬럼 마스킹 아님) | 인접 | `TeamPermissions.php:286-293` |

★정직 선언: 현재 최소 입도는 **메뉴×동작(리소스 수준)**이며, **컬럼/필드 마스킹·필드 export 제거는 존재하지 않는다**. `export` action(리소스 전체 내보내기 허용/차단)을 필드 단위 export 통제로 오인 매핑하지 않는다(반날조).

## 5. 설계 원칙 / 결정

- **Server-side 필드 필터가 정본**: Denied Field는 API 직렬화·Export·Download 단계에서 제거/마스킹 — UI 숨김만으로 불충분(ADR §6.9·UI_HINT_ONLY 금지).
- **Denied overrides**: 필드 DENY는 상위 리소스 ALLOW를 이긴다(Explicit Deny 우선).
- **Canonical Field Path + schema_version**: nested/collection 경로를 정형화하고 스키마 버전에 바인딩(스키마 변경 시 경로 재검증).
- **마스킹 ≠ 삭제**: FIELD_MASKED_VIEW는 값 존재를 알리되 내용 은닉 — 완전 제거(FIELD_VIEW deny)와 구분.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED · 전부 ABSENT**: `field_path`/`field_action`(5종)/`mask_policy`/`applies_to_export`·`applies_to_api_response`/`schema_version`/`digest` = 순신규.
- **BLOCKED_PREREQUISITE**: 필드 필터는 리소스 Canonical Schema(필드 경로 정본) + 직렬화/Export 파이프라인 훅 신설 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건은 289차 P1~P4로 해소됨 — 재플래그 금지.
