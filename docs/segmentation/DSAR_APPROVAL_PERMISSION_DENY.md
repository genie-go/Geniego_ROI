# DSAR — Permission Deny (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

특정 subject/grantee에게 특정 Permission을 **명시적으로 거부**하는 1급(first-class) Deny Entity. Allow의 부재(default deny)와 구분되는 **적극적 거부** — 어떤 Allow/Grant보다 우선(Deny overrides). 보안·컴플라이언스·법무·사고·테넌트·리소스·actor 유형별 차단을 데이터화한다. ★**순신규**: 현재 Deny는 `data_scope`의 `1=0` 센티넬 + Grant 부재(default-deny)로만 표현되며 first-class deny row가 없어 **PARTIAL**. Permission ≠ Role ≠ Authority.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `deny_id` | Deny 식별자(전역 유일) |
| `subject_ref` / `grantee_scope` | 거부 대상 actor 또는 대상 범위(개별/그룹/테넌트/actor-type) |
| `permission_code` / `permission_version` | 거부 Permission Canonical Code + 버전 |
| `scope` | 거부 적용 Scope(Tenant/Resource/Row·Intersection) |
| `deny_type` | 거부 유형(§3 열거) |
| `reason` | 거부 사유(필수) |
| `policy_ref` | 근거 정책 참조(SECURITY/COMPLIANCE/LEGAL 등) |
| `priority` | 우선순위(다중 Deny 충돌 시·MostSpecific/HighestPriority) |
| `approved_by_ref` | 거부 승인 주체 참조 |
| `valid_from` / `valid_until` | 유효 구간(영구/한시) |
| `digest` | Deny 스냅샷 불변 해시 |

## 3. 열거형 / 타입

**deny_type**: `EXPLICIT` · `SECURITY` · `COMPLIANCE` · `LEGAL` · `INCIDENT` · `TENANT` · `RESOURCE` · `ACTOR_TYPE` · `SERVICE_ACCOUNT` · `SYSTEM_ACTOR` · `TEMPORARY`.
**precedence 원칙**: Deny overrides Allow · 그중 SECURITY/COMPLIANCE/LEGAL/INCIDENT가 EXPLICIT/TEMPORARY보다 상위(priority로 결정).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| default-deny(Allow 부재) | Grant 부재 = 미허용 | default-deny(존재) | `TeamPermissions.php:366`(effectiveForUser 온디맨드) |
| scope 차단 센티넬 | `data_scope` `1=0` 센티넬·`DENY_SCOPE` | 부분 substrate(PARTIAL) | `TeamPermissions.php:234`·`:290,303` |
| 게이트 거부(PEP) | index.php write/role 403 | CANONICAL(PEP) | `index.php:553-603` |
| 거부 감사 | `auth_audit_log`(변경만·per-request deny 미감사) | Evidence PARTIAL | `UserAuth::logAudit` |

★**정직/PARTIAL→ABSENT**: first-class Deny Entity(`deny_id`·`deny_type` 12종·`priority`·`policy_ref`·`approved_by_ref`·`digest`)는 **순신규 ABSENT**. 현재 거부는 (a) Grant 부재(default-deny) (b) `data_scope`의 `1=0` 센티넬 두 경로로만 표현 — 적극적·버전화·우선순위화·감사되는 Deny row는 없음(그래서 GROUND_TRUTH가 Deny를 **PARTIAL**로 판정). per-request deny 결정도 미감사.

## 5. 설계 원칙 / 결정

- **Explicit Deny 우선**(Deny overrides Allow) — ADR Golden Rule 정본. Emergency/Temporary Grant도 SECURITY/COMPLIANCE/LEGAL/INCIDENT Deny를 이기지 못함.
- Deny는 first-class row로 영속·버전화·감사 — 센티넬/부재 표현에서 승격.
- 다중 Deny 충돌 = `priority` + MostSpecific으로 결정론적 해소(비결정 금지).
- `ACTOR_TYPE`/`SERVICE_ACCOUNT`/`SYSTEM_ACTOR` Deny로 actor 유형 단위 차단(예: Service Account의 APPROVE 기본 Deny와 정합).
- Golden Rule: `1=0`/DENY_SCOPE substrate를 first-class Deny로 확장(중복 Deny store 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: first-class Deny row·deny_type 12종·priority·policy_ref·digest = 순신규(현 PARTIAL 승격).
- **BLOCKED_PREREQUISITE**: Deny-overrides Combining/Precedence의 상위 결합은 선행 Effective-Set 영속 + Decision Core 부재로 공회전 — RP-002.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
