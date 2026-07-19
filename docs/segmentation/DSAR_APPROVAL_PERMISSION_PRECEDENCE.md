# DSAR — Permission Precedence (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 모든 `file:line` 인용은 이 문서 + ADR §92 한정(**반날조**).

---

## ① 목적 (Purpose)

Allow Set(문서 4)과 Deny Set(문서 5)이 충돌할 때 **어느 것이 이기는가**를 결정하는 우선순위 계층을 정형화한다. 현행에는 통합 Precedence가 없고 3개 분리 rank 체계(plan `PlanPolicy::RANK` PlanPolicy.php `:19` · api_key `roleRank` index.php `:573-576` · team_role owner/manager/member)가 서로 무관하게 공존한다(ADR §1 27행). 본 문서는 이들을 **단일 16단계 Precedence**로 통합할 계약을 세운다.

- **Deny Override 우선**: 보안/법률/인시던트/리소스/주체 Deny가 모든 Allow보다 상위.
- **Versioned Policy**: Precedence 규칙 자체를 버전화하여 과거 결정을 현재 규칙으로 덮어쓰지 않음.

## ② Canonical 필드 (Canonical Fields)

`permission_precedence_policy`:

- `precedence_policy_id` · `precedence_version` · `tenant_scope` · `effective_from` · `effective_to`
- `bands[]`(각 밴드: `band_rank`(1=최상위) · `band_code`(열거) · `effect_direction`(DENY/ALLOW) · `combining_rule`)
- `default_effect`(항상 `DENY`) · `policy_digest`(불변)

평가 산출: `precedence_evaluation` = `winning_band_ref` · `winning_entry_ref` · `overridden_entries[]` · `final_effect`.

## ③ 열거형 — 16단계 `band_code` (band_rank 1→16)

1. `PLATFORM_SECURITY_DENY` — 2. `TENANT_SECURITY_DENY` — 3. `LEGAL_COMPLIANCE_DENY` — 4. `INCIDENT_DENY` — 5. `RESOURCE_DENY` — 6. `SUBJECT_DENY` — 7. `SERVICE_SYSTEM_ACTOR_RESTRICTION` — 8. `EXCLUSION` — 9. `MORE_SPECIFIC_SCOPED_ALLOW` — 10. `DIRECT_ALLOW` — 11. `ROLE_ALLOW` — 12. `GROUP_ALLOW` — 13. `BUNDLE_ALLOW` — 14. `HIERARCHY_ALLOW` — 15. `UI_HINT` — 16. `DEFAULT_DENY`

**규율**: 밴드 1~8(모두 Deny/제한)이 밴드 9~14(Allow)보다 항상 상위 → **Deny Override**. `UI_HINT`(15)는 결정력 없음(문서 표시용). 매칭 없으면 `DEFAULT_DENY`(16).

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Precedence 밴드 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| 2 `TENANT_SECURITY_DENY` | tenant 강제주입(Cross-tenant 격리) | index.php `:619` | REAL(격리) |
| 5·6 `RESOURCE_DENY`/`SUBJECT_DENY` | `DENY_SCOPE`·`1=0` 센티넬 | TeamPermissions.php `:234`·`:290,303` | PARTIAL |
| 9 `MORE_SPECIFIC_SCOPED_ALLOW` | `effectiveScope`(row 특정) | TeamPermissions.php `:236-265` | PARTIAL |
| 10·11·12 `DIRECT`/`ROLE`/`GROUP_ALLOW` | `acl_permission`+`roleOf` | TeamPermissions.php `:152-159`·`:120-131` | PARTIAL |
| (rank 관점) api_key roleRank | index.php roleRank(viewer<…<admin) | index.php `:573-576` | REAL(프로그래매틱·별 스케일) |
| (rank 관점) plan RANK | 상용 게이트(직교·Permission 아님) | PlanPolicy.php `:19` | KEEP_SEPARATE |
| 15 `UI_HINT` | writeGuard/planMenuPolicy(서버 미러됨) | ADR §1(21행)·§D-5(68행) | REAL(UI_HINT_ONLY) |
| 1·3·4·7·8 `PLATFORM/LEGAL/INCIDENT/SERVICE_SYSTEM/EXCLUSION` | 부재 | ADR §1(24행) | ABSENT(신설) |
| 13·14 `BUNDLE`/`HIERARCHY_ALLOW` · `precedence_version`/`policy_digest` | 부재·통합 resolver 부재 | ADR §1(24·27행) | ABSENT(BLOCKED_PREREQUISITE) |

## ⑤ 설계원칙 (Design Principles)

1. **Deny Override 불변**: 밴드 1~8 Deny가 9~14 Allow를 항상 이김. `EXPLICITLY_DENIED`(문서 3) 정합.
2. **3계통 rank 통합**: plan(직교·유지)·api_key roleRank·team_role을 단일 Precedence로 매핑하되 plan은 별도 축으로 **혼용 금지**(Permission≠상용 게이트).
3. **More-Specific 우선**: 좁은 scope Allow(9)가 넓은 role Allow(11)보다 상위(문서 7 Intersection 정합).
4. **UI는 결정 아님**: `UI_HINT`(15)는 서버 재검증 대상 · 정본 아님(ADR §D-5).
5. **Versioned·불변**: Precedence 규칙 버전화 · 과거 결정 보존(현재 규칙으로 소급 덮어쓰기 금지).

## ⑥ Gap

- **통합 Precedence 전무** — 3계통 rank 분리 공존, 단일화 resolver 부재(ABSENT, ADR §1 27행).
- **PLATFORM/LEGAL/INCIDENT/EXCLUSION Deny 밴드 부재** — 상위 보안 밴드 순신규.
- **BUNDLE/HIERARCHY Allow 밴드 부재** — 집계 grant 모델 신설 의존.
- **precedence_version/policy_digest 부재** — Versioned Policy 순신규.
- Part 1 D-5의 UI-hint-only·Default Deny 원칙은 설계 정본이나 통합 엔진은 선행 Decision Core(코드 0) 의존 → **BLOCKED_PREREQUISITE(RP-002)**.
- 실 구현 = 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED).
