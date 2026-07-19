# DSAR — Permission Ambiguity Detection (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 모든 `file:line` 인용은 이 문서 + ADR §92 한정(**반날조**).

---

## ① 목적 (Purpose)

Resolution이 **단일 결정에 도달하지 못하는 모호(Ambiguity)** 상태를 탐지하고, 임의 Allow로 해결하지 못하게 막는 계약을 정의한다. 현행 `effectiveForUser`(TeamPermissions.php `:366`)는 acl_permission을 조합해 즉시 답을 내지만, permission이 Version·Group·Bundle·Hierarchy로 확장되면 동일 code의 다중 active version, 동일 scope의 상충 allow, overlapping validity 같은 모호가 발생할 수 있다. 그런 경우 **자동으로 Allow를 고르지 않고** `MANUAL_REVIEW_REQUIRED`(문서 3)로 승격한다.

- Ambiguity는 문서 10 Circular(무한 순환)과 구별: Ambiguity=다중 유효 후보, Circular=참조 사이클.
- 안전 규율: 모호=fail-closed(임의 Allow 금지).

## ② Canonical 필드 (Canonical Fields)

`permission_ambiguity_finding`:

- `finding_id` · `context_digest` · `permission_ref`
- `ambiguity_type`(열거) · `candidate_refs[]`(상충/중복 후보) · `conflicting_effects[]`
- `resolvable_by`(열거: PRECEDENCE/MOST_SPECIFIC/VERSION_PIN/NONE) · `auto_resolution_blocked`(bool · 기본 true)
- `escalation`(열거: MANUAL_REVIEW/SECURITY_REVIEW) · `finding_digest`

## ③ 열거형 — `ambiguity_type`

`MULTIPLE_ACTIVE_VERSION`(동일 code 다중 active version) · `CONFLICTING_ALLOW_SAME_SCOPE` · `CONFLICTING_DENY_SAME_PRIORITY` · `OVERLAPPING_VALIDITY` · `GROUP_VERSION_AMBIGUITY` · `BUNDLE_VERSION_AMBIGUITY` · `MULTIPLE_HIERARCHY_PATH` · `CONFLICTING_IMPLICATION` · `CONFLICTING_EXCLUSION` · `LEGACY_MAPPING_MULTIPLE_CANDIDATE`

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Ambiguity 유형 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| 현행 결정 산출(단일 답 즉시) | `effectiveForUser` — 모호 개념 없이 조합 | TeamPermissions.php `:366` | REAL(모호 미탐지) |
| `CONFLICTING_ALLOW_SAME_SCOPE` 기반 | `acl_permission` UNIQUE `uq_acl`(중복 row 억제) | TeamPermissions.php `:152-159`(uq_acl `:170`) | PARTIAL(스키마 제약만) |
| `LEGACY_MAPPING_MULTIPLE_CANDIDATE` | menu_key→Canonical Code 매핑 시 다중 후보 위험 | TeamPermissions.php `:55-82`(MENU_CATALOG) · ADR §3(77행) | ABSENT(매핑 미착수) |
| `MULTIPLE_ACTIVE_VERSION`·`OVERLAPPING_VALIDITY` | Version화 전무 → 다중 version 개념 부재 | ADR §1(24행) | ABSENT(신설) |
| `GROUP/BUNDLE_VERSION_AMBIGUITY`·`MULTIPLE_HIERARCHY_PATH`·`CONFLICTING_IMPLICATION/EXCLUSION` | Group/Bundle/Hierarchy/Implication 전무 | ADR §1(24행) | ABSENT(신설) |
| `CONFLICTING_DENY_SAME_PRIORITY` | first-class deny·priority 부재 | TeamPermissions.php `:290,303`·ADR §1(28행) | ABSENT |
| `auto_resolution_blocked`·escalation·`finding_digest` | 부재 | ADR §1(24행) | ABSENT(BLOCKED_PREREQUISITE) |

## ⑤ 설계원칙 (Design Principles)

1. **임의 Allow 금지**: 모호는 자동으로 허용 쪽으로 풀지 않음(`auto_resolution_blocked=true` 기본). Result `AMBIGUOUS`→`MANUAL_REVIEW_REQUIRED`(문서 3) fail-closed.
2. **결정 가능 vs 불가 구분**: Precedence(문서 6)나 Most-Specific(문서 7)로 결정 가능하면 그 규칙으로, 아니면 escalation.
3. **Version 유일성**: 동일 code에 동시 active version은 원칙적으로 불가 — 탐지 시 `MULTIPLE_ACTIVE_VERSION`으로 차단(Version 신설 시 제약).
4. **Legacy 매핑 안전**: menu_key→Canonical Code 다중 후보는 confidence 기록 + 수동 확정(ADR §3), 자동 확정 금지.
5. **감사**: 모든 finding은 후보·근거와 함께 기록(설명 가능성).

## ⑥ Gap

- **모호 탐지 자체가 부재**(REAL substrate는 단일 답 즉시 산출) — Version/Group/Bundle/Hierarchy 신설 시 필연 발생할 모호를 선제 계약화.
- **Version/Group/Bundle/Hierarchy/Implication 전무**(ABSENT) — 대부분 ambiguity_type의 전제 primitive 순신규.
- **first-class deny·priority 부재** — `CONFLICTING_DENY_SAME_PRIORITY` 미실현.
- **Legacy Mapping 미착수** — menu_key→Canonical Code 매핑 다중후보 위험 상존(ADR §3).
- 실 구현 = 선행 Version/집계 primitive 신설 후 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE).
