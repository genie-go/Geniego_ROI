# DSAR — Permission Resolution Result (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 모든 `file:line` 인용은 이 문서 + ADR §92 한정(**반날조**).

---

## ① 목적 (Purpose)

Pipeline(문서 2) 36단계 `RESULT_DERIVE`의 **출력 계약**을 정형화한다. 현행은 최종 판정이 index.php의 403/통과라는 Boolean에 그치고(index.php `:553-603`), **왜·어떤 grant/deny로·어떤 scope에서 그렇게 되었는지가 남지 않는다**(auth_audit_log는 변경만 기록·per-request 결정 미감사, ADR §1 28행). Result는 추론 가능한(Explainable) 결정 산출물을 정의한다.

- Result는 **설명 가능**해야 한다: 요구 permission·최종 effect·매칭된 grant/deny·source chain·effective scope를 근거로 포함.
- Permission≠Role≠Authority: Result는 "이 action이 허용/거부"만 말한다. 금액 승인 가부(Authority)는 Part 5 별도 Result 축.

## ② Canonical 필드 (Canonical Fields)

`permission_resolution_result`:

- `result_id` · `pipeline_run_ref`(문서 2) · `context_digest`
- `required_permission_ref`(Canonical Code) · `result_status`(열거) · `effect`(ALLOW/DENY/CONDITIONAL)
- `matching_grant_refs[]` · `matching_deny_refs[]` · `decisive_ref`(최종 판정을 지배한 grant/deny)
- `source_chains[]`(각 grant/deny가 어디서 왔는지: direct/role/group/bundle/delegated/… 경로)
- `effective_scope`(문서 7 결과) · `effective_constraints[]`
- `reason_code` · `evaluated_at` · `resolution_latency`
- `result_digest`(재현·무결성)

## ③ 열거형 — `result_status` (19)

`PERMISSION_GRANTED` · `GRANTED_WITH_CONSTRAINTS` · `DENIED` · `EXPLICITLY_DENIED` · `NOT_GRANTED` · `EXPIRED` · `SUSPENDED` · `REVOKED` · `SCOPE_MISMATCH` · `DEPENDENCY_MISSING` · `CONFLICT` · `AMBIGUOUS` · `VERSION_MISMATCH` · `ACTOR_TYPE_INVALID` · `CLIENT_MISMATCH` · `RESOURCE_MISMATCH` · `ACTION_MISMATCH` · `MANUAL_REVIEW_REQUIRED` · `ERROR`

**구분 규율**:
- `DENIED`(적용 가능한 allow 없음·default deny) ≠ `EXPLICITLY_DENIED`(명시적 deny row 매칭) ≠ `NOT_GRANTED`(주체에 grant 자체 부재).
- `AMBIGUOUS`(문서 9)·`CONFLICT`(동일 우선순위 상충)는 **임의 Allow로 해결 금지** → `MANUAL_REVIEW_REQUIRED`로 승격.

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 필드/상태 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| `effect` ALLOW/DENY(Boolean) | index.php 게이트 통과/403 | index.php `:553-603` | REAL(Boolean 한정) |
| `EXPIRED` | api_key `expires_at`·미만료 판정 | UserAuth.php `:2998`(admin)·Keys.php `:191,204`(scopes) | PARTIAL |
| `SCOPE_MISMATCH` | `effectiveScope`/`1=0` 센티넬 | TeamPermissions.php `:236-265`·`:290,303` | PARTIAL |
| `matching_grant_refs` | `effectiveForUser` 계산 결과(미영속) | TeamPermissions.php `:366` | REAL(계산)·미영속 |
| `NOT_GRANTED` | grant 부재 = 거부(deny 표현의 현행 방식) | TeamPermissions.php `:290,303` | PARTIAL |
| `ACTOR_TYPE_INVALID` / `CLIENT_MISMATCH` | api_key role/scopes vs 사용자 UI 부여 분리 | Keys.php `:191,204` · index.php `:577` | PARTIAL |
| `EXPLICITLY_DENIED` | first-class deny row 부재 | TeamPermissions.php `:290,303` | ABSENT(신설) |
| `VERSION_MISMATCH` | Permission Version화 없음 | ADR §1(24행) | ABSENT |
| `source_chains` · `result_digest` · `CONFLICT`/`AMBIGUOUS`/`MANUAL_REVIEW_REQUIRED` | per-request 결정/근거 미기록 | ADR §1(28행) | ABSENT(신설·BLOCKED_PREREQUISITE) |

## ⑤ 설계원칙 (Design Principles)

1. **Explainable**: 모든 Result는 `decisive_ref`+`source_chains`+`reason_code`로 판정 근거 재구성 가능(헌법 Vol4 근거 없는 결론 금지).
2. **Deny 우위 반영**: `EXPLICITLY_DENIED`는 어떤 allow보다 우선(문서 6 Precedence).
3. **모호성 안전화**: `AMBIGUOUS`/`CONFLICT`는 자동 Allow 금지 → `MANUAL_REVIEW_REQUIRED`(fail-closed).
4. **상태 3분리 유지**: DENIED/EXPLICITLY_DENIED/NOT_GRANTED를 혼동 없이 구분(감사 정확도).
5. **불변**: Result는 산출 후 불변 · `result_digest`로 Snapshot(문서 4)·Evidence에 결합.

## ⑥ Gap

- **per-request 결정·근거 미감사**(ABSENT) — Result 저장체·`result_digest` 순신규(ADR §1 28행).
- **EXPLICITLY_DENIED 미실현** — first-class deny 부재로 현행은 NOT_GRANTED로만 표현.
- **VERSION_MISMATCH / CONFLICT / AMBIGUOUS** — Version·Precedence·Ambiguity 저장체 부재.
- **DECISION_BINDING(Part 1)** 의존 → **BLOCKED_PREREQUISITE(RP-002)**.
- 실 구현 = 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED).
