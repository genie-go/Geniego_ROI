# DSAR — Workflow Version (§9)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §9 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `workflow_version` | **grep 0** | `NOT_APPLICABLE`(부재 → 신설) |
| 승인 도메인 버전 개념 | **전무**(§52 §4) — Request/Case/Definition 어디에도 version 컬럼 없음 | **구조적 부재** |
| `immutable_hash` | 해시체인 선례 = `menu_audit_log.hash_chain CHAR(64)`(AdminMenu.php:123-131) **유일** | `VALIDATED_LEGACY`(재사용 대상) |
| `approved_by` | `mapping_change_request.approvals_json` + `required_approvals INT DEFAULT 2`(Db.php:623-636) · `Mapping::approve`(Mapping.php:238-294) | `VALIDATED_LEGACY`(정족수 승인 원형) |
| `reviewed_by` | **부재** — Review 와 Approval 미분화 | `NOT_APPLICABLE` |
| `effective_from`/`to` | 승인계 부재. 유사물 = `agency_client_link.approved_at`/`revoked_at`(AgencyPortal.php:80) | `LEGACY_ADAPTER` |
| production certification | 부재(grep 0) | `NOT_APPLICABLE` |

**★§4.2(실행 중 Definition 을 덮어쓰지 않는다)는 현행에서 성립 불가.** Definition 이 코드이므로 배포가 곧 전 인스턴스 정의 교체이며, 진행 중 승인은 **새 코드로 판정**된다 — 버전 고정 지점이 없다.

## 1. 원문 전사 + 판정

### 1.1 필수 필드 — **원문 26축**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | workflow_version_id | 부재 | `NOT_APPLICABLE` |
| 2 | workflow_definition_id | 부재(§8) | `NOT_APPLICABLE` |
| 3 | version_number | 부재 | `NOT_APPLICABLE` |
| 4 | previous_version_id | 부재 | `NOT_APPLICABLE` |
| 5 | version type | 부재 | `NOT_APPLICABLE` |
| 6 | change summary | 부재 | `NOT_APPLICABLE` |
| 7 | node count | 부재 | `NOT_APPLICABLE` |
| 8 | edge count | 부재 | `NOT_APPLICABLE` |
| 9 | variable definitions | 부재(§11) | `NOT_APPLICABLE` |
| 10 | start node | 부재(§13) | `NOT_APPLICABLE` |
| 11 | terminal nodes | 부재(§14) | `NOT_APPLICABLE` |
| 12 | definition payload reference | 부재 | `NOT_APPLICABLE` |
| 13 | definition format | 부재(§10) | `NOT_APPLICABLE` |
| 14 | semantic version | 부재 | `NOT_APPLICABLE` |
| 15 | effective_from | 부재 · 유사 `approved_at`(AgencyPortal.php:80) | `LEGACY_ADAPTER` |
| 16 | effective_to | 부재 · 유사 `revoked_at`(AgencyPortal.php:80) | `LEGACY_ADAPTER` |
| 17 | created_by | `requested_by`(Db.php:623-636) | 부분 재사용 |
| 18 | reviewed_by | **부재** — Review/Approval 미분화 | `NOT_APPLICABLE` |
| 19 | approved_by | `approvals_json` + `decided_by`(AdminGrowth.php:142-149) | `MIGRATION_REQUIRED`(2형태 분산) |
| 20 | activated_at | 부재 | `NOT_APPLICABLE` |
| 21 | immutable_hash | `menu_audit_log.hash_chain`(AdminMenu.php:123-131) 유일 선례 | `VALIDATED_LEGACY`(확장) |
| 22 | migration compatibility | 부재 | `NOT_APPLICABLE` |
| 23 | backward compatibility | 부재 | `NOT_APPLICABLE` |
| 24 | production certification reference | 부재 | `NOT_APPLICABLE` |
| 25 | status | 부재(버전 레벨) | `NOT_APPLICABLE` |
| 26 | evidence | 부분(`audit_log` Db.php:540-546 — **tenant_id·해시체인 없음**) | `MIGRATION_REQUIRED` |

**실측 개수: 26 / 26 전사.** 커버리지 = 신설 19 · 재사용/이관 7.

### 1.2 Version Type — **원문 8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | INITIAL | 부재 | `NOT_APPLICABLE` |
| 2 | MINOR | 부재 | `NOT_APPLICABLE` |
| 3 | MAJOR | 부재 | `NOT_APPLICABLE` |
| 4 | SECURITY_PATCH | 부재 | `NOT_APPLICABLE` |
| 5 | POLICY_UPDATE | 부재 | `NOT_APPLICABLE` |
| 6 | STRUCTURAL_CHANGE | 부재 | `NOT_APPLICABLE` |
| 7 | MIGRATION | 부재 | `NOT_APPLICABLE` |
| 8 | EMERGENCY_PATCH | 부재 | `NOT_APPLICABLE` |

**실측 개수: 8 / 8 전사.** 커버리지 = **부재 8 / 8 (100%)**.

> 상태 14종은 [DSAR_APPROVAL_WORKFLOW_VERSION_STATUS.md](DSAR_APPROVAL_WORKFLOW_VERSION_STATUS.md) 참조.

## 2. 규칙

- **Version 은 Definition 변경의 유일한 합법 경로**다. Definition 직접 수정(§4.2 위배) 금지 — 새 Version 을 만들어라.
- `immutable_hash` 는 **신설이 아니라 `menu_audit_log.hash_chain` 의 확장**이다(Golden Rule). 승인 도메인 전용 해시 엔진 신설 금지(중복 엔진 금지).
- `reviewed_by` ≠ `approved_by` — **현행 미분화를 그대로 승계하지 마라.** Review 는 승인 권한 없는 검토다(§8 `READ_ONLY_REVIEW`).
- 🔴 `NOT_APPLICABLE` 19축 + Version Type 8종 전부 **"있다고 가정"하고 배선 금지**.
- 진행 중 인스턴스는 **시작 시점 Version 에 고정**되어야 한다 — 현행처럼 배포가 곧 정의 교체가 되면 §4.2 가 무너진다.
