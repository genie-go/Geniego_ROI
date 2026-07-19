# DSAR — Role Evidence (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 `ABSENT`. Role≠Permission≠Authority. 289차 확정분 재플래그 금지.

---

## ① 목적

Role Evidence = **Role Definition/Version의 상태·결합·소유·정책이 특정 시점에 무엇이었는지를 사후에 재현하기 위한 불변 근거 묶음**. Snapshot(별편 1·2·3)이 "무엇을 동결했는가"라면, Evidence는 그 스냅샷들과 참조·감사 로그를 **하나의 재현 가능한 증거 단위로 묶는다**.

- **Golden Rule 매핑**: 현행 `auth_audit_log`은 Role 변경의 **Evidence substrate이나 "변경 로그만"** 보유한다 → **PARTIAL**. 그 시점의 정의·권한·소유를 한 바이트도 동결하지 않으므로, Evidence는 감사 로그가 아니라 **Snapshot 참조 + 감사 참조의 결합**으로 완결된다.
- **선행 Cryptographic Hash Chain 봉인기 개념참조**: Evidence의 불변성은 별편 6 Digest가 봉인한다(선행 Canonical Cryptographic Policy 재사용·개념).

## ② Canonical 필드 (코드 0 · 구조 명세)

`ROLE_EVIDENCE` (전부 신규)

| # | 필드 | 의미 |
|---|---|---|
| 1 | role_evidence_id | 식별자 |
| 2 | tenant | 테넌트 스코프 |
| 3 | role_definition_ref / role_version_ref | 대상 Definition·Version(별편 2) |
| 4 | registry_ref / namespace_ref | Registry·Namespace 참조 |
| 5 | owner_refs | Business/Technical/Security Owner 참조 |
| 6 | permission_snapshot_refs | Role Permission Snapshot 참조(별편 3) |
| 7 | group_snapshot_refs / bundle_snapshot_refs | Group·Bundle 스냅샷 참조 |
| 8 | scope_requirement_snapshot_ref | Scope Requirement 스냅샷 |
| 9 | actor_eligibility_snapshot_ref | Actor Eligibility 스냅샷 |
| 10 | assignment_policy_snapshot_ref | Assignment Policy 스냅샷 |
| 11 | review_policy_snapshot_ref / certification_policy_snapshot_ref | 검토·인증 정책 스냅샷 |
| 12 | approval_ref / migration_ref / risk_assessment_ref | 승인·마이그레이션·리스크 평가 참조 |
| 13 | audit_ref | 변경 감사 로그 참조(auth_audit_log·PARTIAL) |
| 14 | digest | Evidence 다이제스트(별편 6) |
| 15 | captured_at | 캡처 시각 |
| 16 | immutable_digest | 봉인 다이제스트(선행 Hash Chain 봉인기 개념) |

## ③ 열거형 (설계 · 코드 0)

- **evidence_trigger**: `ACTIVATION` · `REVIEW` · `CERTIFICATION` · `RISK_REASSESSMENT` · `MIGRATION` · `DRIFT` · `RECONCILIATION`(별편 5 Audit Event와 정합)
- **evidence_completeness**: `COMPLETE`(스냅샷 전부 결합) · `PARTIAL`(일부 참조 결손) · `LOG_ONLY`(감사 로그만·현행 상태)
- **audit_ref_kind**: `CHANGE_LOG`(auth_audit_log·변경만) · `SNAPSHOT`(불변 동결·신규)

## ④ substrate 매핑 (§5.2 분류 + file:line · 없으면 ABSENT)

| Evidence 축 | 현행 substrate | §5.2 태그 | 근거 | 판정 |
|---|---|---|---|---|
| audit_ref | **auth_audit_log** (`UserAuth::logAudit`) + AdminMenu audit (`:201`) | Evidence substrate(**변경 로그만**) | 전수조사 §1.1·ADR §18(team_role 감사=auth_audit_log) · AdminMenu audit write(`:201`, INSERT 컬럼 범위) | **PARTIAL** |
| owner_refs | — | — | **ABSENT**(Owner 개념 부재·전수조사 §3) | **ABSENT** |
| permission_snapshot_refs | — | — | **ABSENT**(별편 3 스냅샷 미존재) | **ABSENT** |
| scope_requirement_snapshot | `data_scope`(현재값) | PARTIAL | `TeamPermissions.php:41,218-322` | PARTIAL(동결 없음) |
| actor_eligibility_snapshot | `api_key role`/SSO map(현재값) | PARTIAL | `Keys.php:95`·`EnterpriseAuth.php:78-88` | PARTIAL |
| review/certification policy snapshot | — | — | **ABSENT** | **ABSENT** |
| approval/migration/risk ref | — | — | **ABSENT** | **ABSENT** |
| digest / immutable_digest | — | — | **ABSENT**(개념=선행 Hash Chain 봉인기) | **ABSENT** |

> ★핵심 정정: `auth_audit_log`은 **변경 이벤트**만 남긴다. "누가 역할을 바꿨다"는 있어도 **"그 시점 그 역할이 무엇이었는가"의 동결은 없다** → Evidence 완결은 감사 로그 확장이 아니라 **Snapshot 축 신설 + 감사 참조 결합**이다. 감사 로그를 Evidence 저장소로 오용 금지(무후퇴·기존 호출부 제거 금지).

## ⑤ 설계원칙

- **Evidence = Snapshot 참조 + 감사 참조**: `auth_audit_log`(변경 로그·PARTIAL)만으로 Evidence를 완결하지 않는다. Snapshot(별편 1·2·3) 없이는 "무엇에 대한 역할이었는지" 재현 불가.
- **불변(Append-only)**: Evidence는 수정 불가·수정은 새 레코드. 물리 소거(예: 참조 NULL화) 안티패턴 금지.
- **Tenant 격리 필수**: `auth_audit_log`류 전역 누적 결함 미승계.
- **원문 저장 금지**: 자격증명·PII 원문 대신 참조·마스킹·다이제스트. Role Evidence는 정의/권한 참조만 담고 실 credential은 담지 않는다.
- **Golden Rule + 선행 Hash Chain 봉인기**: `immutable_digest`는 선행 Canonical Cryptographic Hash Chain 봉인기를 개념 재사용(별편 6). 중복 무결성 모델 신설 금지.

## ⑥ Gap

- Role Evidence 엔티티·Snapshot 참조 결합·시점 동결 = **ABSENT**.
- `auth_audit_log`은 **변경 로그만(PARTIAL)** — 상태 동결·재현 축 결손.
- Owner/Review/Certification/Approval/Migration/Risk 참조 = **ABSENT**(선행 신설 대상).
- Evidence Digest 봉인 = **ABSENT**(개념=선행 Hash Chain 봉인기·별편 6).
- 실 Evidence 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
