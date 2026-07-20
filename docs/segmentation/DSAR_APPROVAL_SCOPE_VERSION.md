# DSAR — Approval Scope Version (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Version)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실 구현 부재
- **불변**: Default Intersection · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy · envLabel ≠ Scope · Golden Rule(7곳 산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Scope Version은 Scope Definition의 변경 이력을 **Immutable(불변)** 하게 기록하는 엔티티다(스펙 §6: Initial·Update·Merge·Split·Rename·Deprecation·Migration). ADR D-4·D-5가 지목하듯, 현행 scope 변경은 **버전 개념 없이 In-place로 이루어진다** — `replaceScope`는 기존 scope를 DELETE 후 INSERT하여 전량 교체하며 이전 값의 이력이 소실된다(EXISTING_IMPLEMENTATION §1). Scope Version은 이 소실을 막는 순신규 계층이다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `scope_version_id` | Version 식별자(PK) |
| `scope_definition_id` | 대상 Scope Definition 참조 |
| `version_type` | §3 열거(Initial/Update/Merge/Split/Rename/Deprecation/Migration) |
| `version_number` | 순증 버전 번호 |
| `prior_version_id` | 직전 버전 참조(체인) |
| `diff` | 변경 diff(추가/제거된 scope_values) |
| `changed_by` | 변경 actor |
| `changed_at` | 변경 시각 |
| `immutable` | 불변 플래그(항상 true) |

## 3. 열거형 / 타입

- **`version_type`**(스펙 §6 verbatim): `Initial` · `Update` · `Merge` · `Split` · `Rename` · `Deprecation` · `Migration`.
- 모든 Version 레코드는 **Immutable**(스펙 §6) — 생성 후 수정 불가, 새 변경은 새 Version만 추가.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT·ground-truth만 인용)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| Version 개념·번호·체인 | **ABSENT** | grep 0 전항목(EXISTING_IMPLEMENTATION §9 총평) |
| scope 변경 경로(가장 근접) | **PRESENT(비-버전형)** | `replaceScope` DELETE→INSERT 전량교체(`TeamPermissions.php:337-346`·EXISTING_IMPLEMENTATION §1) — In-place, 이력 소실 |
| effectiveScope 재계산 | **PRESENT(라이브·버전 무관)** | `TeamPermissions.php:236-265` — 매 요청 SELECT, 캐시/버전/스냅샷 diff 없음(EXISTING_IMPLEMENTATION §9) |
| 변경 기록(근접 대체) | **PARTIAL(범용 감사)** | `auth_audit_log`에 "menus=N개" 카운트만 기록, diff 미기록(EXISTING_IMPLEMENTATION §9) — `teamAudit`(`TeamPermissions.php:684-700`) |
| `immutable`/`prior_version_id`/`diff` | **ABSENT** | 버전 체인·불변성·diff 계약 전무 |

★현행 scope 변경은 **버전이 아니라 최신 상태로의 파괴적 치환**이다. Scope Version은 이 치환을 Immutable Append 모델로 승격하는 순신규 계층이며, 기존 `replaceScope` 호출 시맨틱(권한 판정 결과)은 변경하지 않는다(회귀 0).

## 5. 설계 원칙

1. **Immutable Append-only** — 새 Version은 항상 순증 추가. `replaceScope`의 DELETE 동작은 유지하되, Version 레이어가 삭제 전 상태를 Deprecation Version으로 선기록.
2. **Effective Scope Engine과 결합(§27)** — effectiveScope의 라이브 재계산을 Version 기준 계산으로 승격(ADR D-4) — 순신규, 기존 fail-closed 판정 로직(owner/admin null·DENY_SCOPE) 변경 금지.
3. **Evidence 연동** — 각 Version은 § Scope Evidence 문서와 결합해 변경 근거를 남김(현행 auth_audit_log의 diff 미기록 한계 해소).
4. **Golden Rule** — 신규 버전 테이블은 data_scope를 대체하지 않고 그 변경 이력을 감싸는 레이어로 신설.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Version이 Role/Assignment/Permission Version과 결합하는 지점은 선행 Part 2/3-1/3-2/3-3 실 구현 이후. 본 차수 코드 0.
- **Gap-1(ABSENT)**: 버전 번호·체인·diff·immutable 플래그 전무 — 순신설.
- **Gap-2(이력 소실)**: `replaceScope`(`TeamPermissions.php:337-346`)의 DELETE→INSERT가 이전 scope_values를 물리적으로 제거 — Version 레이어 도입 전까지 과거 scope 상태는 auth_audit_log의 카운트 요약(diff 없음)으로만 간접 추정 가능(EXISTING_IMPLEMENTATION §9).
- **Gap-3(effectiveScope 버전 무관)**: `TeamPermissions.php:236-265`는 항상 최신 data_scope를 라이브 조회 — "특정 시점의 유효 scope"를 재현할 방법 부재.
- **정직 부재**: Snapshot/Digest/Drift 대응 substrate ABSENT(EXISTING_IMPLEMENTATION §9) — 결함으로 날조 금지. 289차 P1~P4 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment·Decision Core 실 구현 + 별도 승인세션(RP-002).
