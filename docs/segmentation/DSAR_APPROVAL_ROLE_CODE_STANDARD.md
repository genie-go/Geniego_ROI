# DSAR — Approval Role Canonical Code Standard (EPIC 06-A-03-02-03-04 Part 3-1 · per-entity: Role Code Standard)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule(Extend not Replace) · 반날조(substrate file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

Role Canonical Code Standard는 **Role을 식별하는 정본 코드 값의 작성 규칙**이다. Namespace(구조/예약어)를 전제로, 실제 코드 문자열이 **UI Label·번역·부서명·사람 이름·약어에 오염되지 않도록** 규정한다. 현재 team_role/api_key role/admin_level은 flat 문자열이고 Canonical Code 개념이 없어 Role 식별자와 표시 문자열이 분리되지 않는다. 본 표준은 Code를 `{DOMAIN}:{FUNCTION}:{ROLE}` 형식·Locale 불변·기계 안정 식별자로 고정하고, Alias(legacy 문자열·표시명)는 매핑·표시용으로만 두어 **Runtime 인가 판정에는 사용 금지**한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `code_standard_id` | 표준 식별자(PK) |
| `canonical_code` | 정본 Role Code(`{DOMAIN}:{FUNCTION}:{ROLE}`) |
| `code_pattern` | 허용 정규식/포맷 규칙 |
| `locale_invariant` | Locale 불변 플래그(항상 true) |
| `ui_label_ref` | 표시용 Label 참조(코드값과 분리) |
| `translation_ref` | i18n 키 참조(코드에 번역 금지) |
| `alias_set` | Alias(legacy 문자열/약어) 집합 |
| `alias_runtime_authz_allowed` | Alias의 Runtime authz 사용 허용(항상 false) |
| `prohibited_sources` | 금지 출처(§3) |
| `stability_class` | 코드 안정성 등급(불변 식별자) |
| `owner` | 표준 소유자 |
| `digest` | 표준 정의 digest |

## 3. 열거형 / 타입

- **`canonical_code` 포맷**: `{DOMAIN}:{FUNCTION}:{ROLE}` (예 `APPROVAL:DECISION:APPROVER`) — Namespace 문서 §3 준수.
- **`prohibited_sources`(코드값에 넣기 금지)**: `UI_LABEL` · `TRANSLATION`(현지화 문자열) · `DEPARTMENT_NAME`(부서명) · `PERSON_NAME`(사람 이름) · `ABBREVIATION`(임의 약어).
- **`locale_invariant`**: 항상 `true` — Code는 언어 무관(번역은 `translation_ref`로 분리).
- **`alias_runtime_authz_allowed`**: 항상 `false` — Alias는 legacy 매핑·표시 전용, 인가 판정 금지.
- **`stability_class`**: `IMMUTABLE_IDENTIFIER`(코드값 변경=신규 Role, 기존 코드 재사용/의미 변경 금지).

## 4. 실 substrate 매핑 (§5.2)

| Canonical | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| Canonical Role Code(`{DOMAIN}:{FUNCTION}:{ROLE}`) | **ABSENT → 신설** | 없음 |
| team_role Code | flat 문자열(비-Canonical) | `TeamPermissions.php:123` — owner/manager/member(도메인·기능 분절 없음) |
| api_key role Code | flat 문자열(비-Canonical) | `Keys.php:95` — viewer/connector/analyst/admin |
| admin_level Code | flat 문자열 | `UserAdmin.php:43-46` — master/sub |
| AdminMenu ROLE_ENUM Code | flat 문자열 | `AdminMenu.php:247` — admin/super_admin/moderator |
| Alias 매핑 표준 | **ABSENT** | legacy 문자열 = 코드 겸 식별자(분리 안 됨) |
| `locale_invariant` / `code_pattern` / `prohibited_sources` | **ABSENT** | 없음 |

★현행 team_role/api_key role은 **flat 문자열이 곧 코드이자 식별자**로 Canonical Code 표준이 ABSENT다. 표시명·번역과 식별자가 분리되지 않아, 향후 Canonical Code로 정규화 시 legacy 문자열은 Alias로만 매핑한다.

## 5. 설계 원칙

1. **Code = 기계 안정 식별자** — Locale 불변·UI/번역/부서/사람이름/약어 오염 금지.
2. **표시명 분리** — 사람용 이름은 `ui_label_ref`/`translation_ref`로 분리(코드에 넣지 않음).
3. **Alias는 표시·매핑 전용** — legacy 문자열(owner/analyst/master)은 Alias, **Runtime authz는 Canonical Code로만**(Alias 판정 금지).
4. **코드 재사용 금지** — 의미가 바뀌면 신규 코드(IMMUTABLE_IDENTIFIER). 폐기 코드 재활용 금지.
5. **Extend not Replace** — 실 판정 문자열은 유지하되 Canonical Code ↔ Alias 매핑 레이어 신설(회귀 0).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Canonical Code를 인가 판정에 실제 소비하려면 선행 Part 2 Permission Engine·Runtime PDP 필요. 본 차수 코드 0.
- **Gap-1(ABSENT)**: canonical_code·code_pattern·locale_invariant·prohibited_sources·alias 표준 전무 — 순신설.
- **Gap-2**: 현행 team_role/api_key role은 flat 문자열이 식별자 겸 표시값 → 표시명/번역 분리 개념 없음(향후 Alias 매핑 필요).
- **정직 부재**: 사람 이름/부서명을 Role 코드로 쓰는 사례 레포 전무(ABSENT·금지 규약은 예방적). admin_roles/user_roles 폐기분 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
