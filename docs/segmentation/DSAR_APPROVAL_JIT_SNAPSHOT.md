# DSAR — JIT Access Governance: Elevation 스냅샷 (APPROVAL_JIT_SNAPSHOT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_SNAPSHOT`(SPEC §25)은 elevation grant 발효 시점의 **불변 상태 사진(state snapshot)** 이다. 저장 필드: Granted Role · Granted Permission · Granted Scope · Runtime Context · Approval Chain · Risk Evaluation · Timestamp(SPEC §25). DB 제약으로 **Snapshot Integrity**(SPEC §33)를 강제하고, Reconciliation(SPEC §23)이 Requested/Granted/Runtime과 대조하는 기준선이다. 즉 "무엇이 언제·어느 승인체인·어느 위험판정 하에 부여되었는가"를 사후 변경 불가능하게 고정한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §25 스냅샷 필드 | 판정 | 근거(GT 파일:라인) |
|---|---|---|
| Session-entitlement 투영(권한 스냅샷) | **ABSENT** | GT②§2: session-bound entitlement projection 부재. `/auth/me`는 plan·team_role만, ACL은 매요청 DB조회 |
| Granted Role/Permission/Scope 원장 | **PARTIAL(TTL·스냅샷 없음)** | `acl_permission` 스키마 `TeamPermissions.php:152` — `expires_at/granted_by/reason` 컬럼 부재(부여 영구), 시점 사진 없음 |
| Approval Chain(승인체인 보존) | **PARTIAL(마케팅축)** | `action_request` approvals_json `Db.php:592-600`·`decideAction()` `Alerting.php:598` — 대상=마케팅(KEEP_SEPARATE) |
| 원 principal 보존(시한부 세션 원형) | **PRESENT** | impersonation `impersonated_by` `UserAdmin.php:478`(2h TTL `:474`) — 하향 대행 세션 사진 원형 |
| Risk Evaluation 스냅샷 | **ABSENT** | GT②§2: 권한상승 risk scoring 0 |
| Timestamp / Immutable 이력 앵커 | **재활용 참고** | AccessReview append-only 이력 `AccessReview.php:62-80,:219-222`(불변 이력 패턴) |

★함정 준수: SecurityAudit(GT①§4-F)는 **액션 로그**이지 elevation 세션 스냅샷이 아니다. 스냅샷 저장소 자체는 ABSENT(순신규).

## 3. 설계 계약 (필드·상태·제약)

| 항목 | 계약 |
|---|---|
| 필드 | Granted Role·Permission·Scope·Runtime Context·Approval Chain·Risk Evaluation·Timestamp(SPEC §25) |
| 불변성 | Snapshot Integrity 제약(SPEC §33)·생성 후 수정 불가. Digest(§27)의 입력원 |
| 발급 원형 재활용 | 시한부 세션 발급 패턴(`UserAdmin.php:471` 2h TTL + 원 principal `:478`) 재사용, 단 상향 elevation으로 분리(ADR D-2) |
| 원장 앵커 | `acl_permission`(`TeamPermissions.php:152`) 파괴 없이 별도 time-bound grant 원장에 스냅샷 부착(ADR D-1, Extend) |
| 테넌트 격리 | Tenant Isolation 제약(SPEC §33) 적용 |
| 무기한 금지 | expires_at NOT NULL — TTL 없는 grant 스냅샷 거부(ADR D-1·D-3) |

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거 | 분리 사유 |
|---|---|---|
| `menu_audit_log` | GT② B-8(`AdminMenu.php:98`) | 메뉴 감사체인(장식·verify 별도) — elevation snapshot 아님 |
| `action_request` approvals_json | GT② B-1(`Db.php:592-600`) | 마케팅 결재 스냅샷 — 개명 금지 |
| impersonation 세션 | GT② B-2(`UserAdmin.php:451`) | 하향 대행(상향 elevation 아님) — 발급패턴만 재활용 |
| SecurityAudit 로그 | GT①§4-F(`SecurityAudit.php:12-53`) | 액션 해시체인 — 세션 상태 스냅샷 아님(★함정) |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(순신규)**. Session-entitlement 투영·Risk 스냅샷·스냅샷 저장소 grep 0(GT②§2).
- **재활용 축**: 시한부 세션 발급 원형(`UserAdmin.php:471`·`:478`)·불변 이력 패턴(AccessReview `AccessReview.php:62-80`)·`acl_permission` 앵커(`TeamPermissions.php:152`, TTL 확장 대상).
- **선행 의존**: Part 1~3-8 인증 후 실 구현(BLOCKED_PREREQUISITE, ADR §4). Snapshot은 Request/Approval/Grant Ledger 확정 후에만 유효.
- 코드 변경 0 · Extend-only(ADR D-1) · 무후퇴.
