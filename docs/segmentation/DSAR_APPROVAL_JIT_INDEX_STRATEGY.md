# DSAR — JIT Access Governance: 인덱스 전략 (Part 3-9 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §34는 JIT elevation 레지스트리·세션에 대한 8개 인덱스 축을 요구한다: **Request ID · Requester · Target Role · Status · Risk Level · Session · Approval · End Time**. 각 축은 §3 Privilege Elevation Request 필수정보(Request ID/Requester/Target Role/Risk Level/Status/Requested End Time)와 §11 Elevation Session(Session ID/End Time)의 조회·필터·만료 스캔 경로를 상수시간에 지지하기 위한 것이다. §33 Database Constraint(Immutable Version·Tenant Isolation)와 결합되어 테넌트별 격리 스캔을 전제한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| §34 인덱스 축 | 실존 근사 substrate | 판정 |
|---|---|---|
| Request ID | elevation request 테이블/PK ABSENT. `access_request`는 DSAR·AgencyPortal뿐(GT② §2) | **ABSENT** |
| Requester | — 요청 주체 컬럼 부재(요청 registry 자체 없음, GT② §2) | **ABSENT** |
| Target Role | RBAC 앵커 `acl_permission`(`TeamPermissions.php:152`) 실존하나 `expires_at/granted_at/valid_until` 컬럼 부재(GT① §F·GT② §2) | **PARTIAL(TTL축 부재)** |
| Status | maker-checker status는 `action_request`(`Db.php:592-600`)·`mapping_change_request`(`Db.php:623-636`)에 실존하나 마케팅/매핑용(KEEP_SEPARATE, GT② B-1) | **PARTIAL(오도메인)** |
| Risk Level | 권한상승 risk scoring 0(`AnomalyDetection.php`·`Risk.php`는 마케팅/거래, GT② §2·B-8) | **ABSENT** |
| Session | `user_session` 스키마 실존·`expires_at`+인덱스(`Db.php:1111-1119`), 만료게이트 `UserAuth.php:249-284` | **PARTIAL(세션축만)** |
| Approval | 승인 상태머신 `Alerting.php:642-650`·집행게이트 `:684-686` 실존(권한상승용 아님, GT② §2) | **PARTIAL(재활용)** |
| End Time | 시한부 만료 컬럼: 세션 `Db.php:1111-1119`·impersonate 2h TTL `UserAdmin.php:472-482`(`:474`)·api_key expires `index.php:518` | **PARTIAL(권한축 미적용)** |

핵심: **elevation 전용 인덱스 대상 테이블(jit_request/grant ledger)이 ABSENT**이므로 §34의 8축은 현재 어떤 물리 인덱스에도 존재하지 않는다. 유일한 만료-인덱스 실선례는 `user_session`(`Db.php:1111-1119`)과 append-only `access_review_item`(`AccessReview.php:62-80`)이다.

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| 인덱스 | 대상 컬럼(설계) | 목적 | 근거 SPEC |
|---|---|---|---|
| idx_jit_request_id | Request ID(PK) | 단건 조회·Digest 조인 | §3·§27·§34 |
| idx_jit_requester | Requester(+tenant) | 요청자별 활성 elevation·빈발 패턴 | §31·§34 |
| idx_jit_target_role | Target Role(+tenant) | Role 기준 유효 grant 합산 투영 | §3·§34·ADR D-1 |
| idx_jit_status | Status | pending/approved/revoked 필터 | §3·§7·§34 |
| idx_jit_risk_level | Risk Level(LOW/MEDIUM/HIGH/CRITICAL) | 고위험 요청 우선 라우팅 | §6·§34 |
| idx_jit_session | Session ID | 런타임 세션↔grant 매핑 | §11·§34 |
| idx_jit_approval | Approval(chain/version) | 불변 승인이력 조회 | §7·§34 |
| idx_jit_end_time | End Time | Auto-Revocation 만료 스캔(범위) | §14·§34 |

- **복합 인덱스 지향**: `(tenant, status, end_time)`으로 §14 Auto-Revocation 만료 스캔을 테넌트 격리 상태에서 상수시간화(§33 Tenant Isolation 준수).
- 신규 인덱스는 `acl_permission` 파괴 없이 **별도 time-bound grant 원장**(ADR D-1, `expires_at NOT NULL`)에 부여한다.

## 4. KEEP_SEPARATE / 선행의존

- `action_request`(`Db.php:592-600`)·`mapping_change_request`(`Db.php:623-636`) 인덱스는 마케팅/매핑 결재용 — elevation 인덱스로 개명·흡수 금지(GT② B-1·ADR D-6).
- `user_session`(`Db.php:1111-1119`)·api_key expires 인덱스는 세션/자격증명 수명축 — grant TTL 인덱스 아님(GT② B-4·B-5).
- 선행: elevation grant 원장 테이블 신설이 선행되어야 §34 인덱스가 물리적으로 성립(ADR §4 선행의존, Part 1~3-8 인증 후).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **NOT_CERTIFIED · 코드 0**. §34 인덱스 8축의 물리 대상 테이블(jit_request/grant ledger)이 **ABSENT**이므로 인덱스는 실 구현(RP-track) 단계 조건이다.
- Index/DB는 elevation 전용 테이블 **ABSENT** — `SecurityAudit`/`access_review_item` append-only(`AccessReview.php:62-80`)·`user_session`(`Db.php:1111-1119`) 만료 인덱스를 **재활용 참고**(대체 아님).
- 실 구현은 `acl_permission` 확장 + grant 원장 신설(ADR D-1) 후 본 §34 8축 인덱스를 부여한다. BLOCKED_PREREQUISITE(Part 1~3-8 인증 선행).
