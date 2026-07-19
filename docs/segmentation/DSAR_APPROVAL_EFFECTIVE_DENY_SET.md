# DSAR — Effective Deny Set (EPIC 06-A-03-02-03-04 Part 2 · per-entity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19) · BLOCKED_PREREQUISITE(RP-002)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **substrate 근거 정본**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md) — 모든 `file:line` 인용은 이 문서 + ADR §92 한정(**반날조**).

---

## ① 목적 (Purpose)

특정 주체·actor·context에서 **명시적으로 거부되는 permission 집합(Deny)** 을 Allow Set(문서 4)과 **별도로 보존**하는 산출물을 정의한다. 현행에는 first-class deny row가 없고 거부는 오직 "grant 부재" 또는 row scope 센티넬 `1=0`(TeamPermissions.php `:290,303`)으로만 표현된다(Deny=PARTIAL, ADR §1 28행). Deny Set을 별도 엔티티로 세우면 Deny Override(Pipeline 32단계)와 감사가 정확해진다.

- **Allow Set과 별도 보존**: Deny를 Allow에서 차감해 없애버리지 않고, 명시 근거·우선순위와 함께 남긴다(감사·설명 가능성).
- Default Deny(grant 부재)와 **Explicit Deny(명시 거부 row)** 를 구분한다.

## ② Canonical 필드 (Canonical Fields)

`effective_deny_set`:

- `deny_set_id` · `context_digest`(문서 1) · `subject_ref` · `effective_actor_ref` · `resource_type` · `resource_id`
- `permission_denies[]`(각 항목: `denied_permission_ref` · `deny_type` · `denied_scopes[]` · `priority` · `source_ref` · `reason_code`)
- `deny_precedence_band`(문서 6 Precedence 상위 밴드 참조)
- `valid_from` · `valid_until`
- `deny_digest`(불변)

## ③ 열거형 (Enumerations)

- **`deny_type`**: `EXPLICIT_DENY`(명시 거부 row) · `DEFAULT_DENY`(grant 부재) · `SCOPE_DENY`(scope 밖) · `CONSTRAINT_DENY`(제약 위반) · `SECURITY_DENY`(플랫폼/테넌트 보안) · `LEGAL_COMPLIANCE_DENY` · `INCIDENT_DENY`
- **`deny_source`**: `PLATFORM` · `TENANT` · `LEGAL` · `INCIDENT` · `RESOURCE` · `SUBJECT` · `SERVICE_SYSTEM_RESTRICTION` · `EXCLUSION`
- **`deny_state`**: `ACTIVE` · `EXPIRED` · `SUPERSEDED`

## ④ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

| Canonical 필드 | 실존 substrate | 근거 | 판정 |
|---|---|---|---|
| `deny_type=SCOPE_DENY` | `DENY_SCOPE` fail-closed · `1=0` 센티넬 | TeamPermissions.php `:234`·`:290,303` | PARTIAL |
| `deny_type=DEFAULT_DENY` | grant 부재 = 거부 | TeamPermissions.php `:290,303` | PARTIAL(표현만) |
| `denied_scopes` | `effectiveScope`/`scopeSql`(4핸들러) | TeamPermissions.php `:236-265`·`:286-293` | PARTIAL |
| `deny_source=TENANT` | tenant 강제주입(Cross-tenant 격리) | index.php `:619` | REAL(격리) |
| `deny_type=EXPLICIT_DENY`(first-class row) | **부재** — deny row 없음 | TeamPermissions.php `:290,303`(센티넬만) · ADR §1(28행) | ABSENT(신설) |
| `priority` · `deny_precedence_band` · `deny_digest` | 부재 | ADR §1(24·28행) | ABSENT(신설) |
| `deny_source=PLATFORM/LEGAL/INCIDENT` · `SERVICE_SYSTEM_RESTRICTION` | 부재 | ADR §1(24행) | ABSENT(BLOCKED_PREREQUISITE) |

## ⑤ 설계원칙 (Design Principles)

1. **Deny 별도 보존**: Allow에서 지우지 않고 명시 근거·우선순위와 함께 남겨 Deny Override(문서 2 §32)·감사·설명을 지원.
2. **Explicit ≠ Default 분리**: 명시 거부와 grant 부재를 다른 `deny_type`으로(문서 3 `EXPLICITLY_DENIED` vs `NOT_GRANTED`와 정합).
3. **Deny 우선**: 어떤 Deny도 대응 Allow를 무효화(문서 6 Precedence 상위 밴드). 보안/법률/인시던트 Deny는 최상위.
4. **불변·시점 고정**: `deny_digest`로 Snapshot/Evidence 결합.
5. **fail-closed 계승**: 현행 `DENY_SCOPE`/`1=0` 센티넬의 fail-closed 성질을 정형 Deny Set으로 승격(무후퇴).

## ⑥ Gap

- **first-class Explicit Deny row 전무**(ABSENT) — 거부가 센티넬/grant 부재로만 표현(ADR §1 28행). Deny 우선평가(문서 2 §19)의 핵심 미싱피스.
- **PLATFORM/LEGAL/INCIDENT Deny source 부재** — 상위 보안·컴플라이언스 Deny 밴드 순신규.
- **priority/precedence band 부재** — Deny 간 우선순위 정형 필요(문서 6 의존).
- Snapshot/Binding은 상위 Part 1 Decision Core(코드 0) 의존 → **BLOCKED_PREREQUISITE(RP-002)**.
- 실 구현 = 별도 승인세션(RP-002). 본 문서 = 설계 명세(코드 0 · NOT_CERTIFIED).
