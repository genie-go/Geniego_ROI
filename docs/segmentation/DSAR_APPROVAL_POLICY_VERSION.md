# DSAR — PDP/PEP Governance: 불변 정책 버전 (APPROVAL_POLICY_VERSION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

- **APPROVAL_POLICY_VERSION** = 게시된 인가 정책본의 **불변(immutable) 버전 스냅샷**. PAP(§7 Version 관리·Publishing)가 정책 게시 시 봉인하며, PDP는 요청 시점의 활성버전을 결정론적으로 참조.
- SPEC §3(Policy Request Model — 버전이 요청평가의 고정 기준), §7(PAP Version 관리·Publishing), §30(Database Constraint — **Immutable Policy Version**·Immutable Decision Snapshot)가 근거. §14 Cache의 `Version` 키·§15 Cache Invalidation(Policy 변경)·§31 Index(Version)도 결합.
- 목적: 현행 **파괴적 전체교체 CRUD(버전 없음)**를 불변 버전 계층으로 승격(ADR D-3).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 구성요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| authz 정책 버전 구조 | **ABSENT (grep 0)** | `policy_version` authz 매치 0건 — 버전/게시 전용 구조 전무 (GT② §1·§2) |
| 정책 CRUD(버전 대체물) | **PARTIAL(파괴적)** | `putTeamPermissions`·`putMemberPermissions`·`replaceScope`·`seedOrg`(`TeamPermissions.php:598-692`·`:337-346`·`:755-784`) = 파괴적 전체교체·버전/게시 없음 (GT① §H) |
| 불변성 substrate(재활용 대상) | **PRESENT(인접)** | SecurityAudit 해시체인 append-only·verify(`SecurityAudit.php:12-53`·`:56-68`) = tamper-evident 불변 기재 (GT① §G·ADR D-5) |
| 버전 색인 | **ABSENT** | §31 Version 색인 전무. Decision Cache의 Version 키 부재 (GT② §2) |

★버전 봉인의 불변성은 SecurityAudit 해시체인(`SecurityAudit.php:12-68`)을 **확장 재활용**(대체 아님·ADR D-5) — Immutable Decision Snapshot(§30)도 동일 기반.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **필드(안)**: `version_id`·`policy_id`(→APPROVAL_POLICY)·`registry_ref`·`version_no`(단조증가)·`policy_snapshot`(봉인 본문)·`content_hash`(해시체인 연결)·`published_by`·`published_at`·`status{active|superseded|deprecated}`·`tenant_id`.
- **상태**: 게시 즉시 **불변**(§30 Immutable Policy Version). 수정은 신규 version_no 발행으로만(파괴적 교체 금지). 폐기는 status 전이·본문 보존.
- **제약**: `content_hash`는 SecurityAudit 체인(`SecurityAudit.php:12-53`)에 연결·verify(`:56-68`) 가능. §15 Cache Invalidation — 신규 버전 게시 시 관련 Decision Cache 무효화(현행 캐시 부재·ADR D-3 순신규). §30 Tenant Isolation.
- **소비**: PDP(§4)는 요청평가 시 `active` version_no 고정 참조 → 출력 Deterministic. Snapshot(§22)·Reconciliation(§20)이 version_no로 결정 재현·비교.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

authz 정책 버전은 아래 비-authz "policy/version" 신호와 무관(GT② §5).

| 분리대상 | 근거(파일:라인) | 사유 |
|---|---|---|
| ML 모델 드리프트 | `ModelMonitor.php:220-335` | 모델 버전·드리프트(authz Decision Drift 아님) (GT② §C-3) |
| 알림 정책본 | `action_request.policy_id`(`Db.php:576`·`:592-594`) | Alerting alert_policies (GT② §C-2) |
| 마케팅 룰엔진 | `RuleEngine.php:24`·`Decisioning.php:12` | 캠페인 규칙(버전≠authz) (GT② §C-1) |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(버전/게시 순신규) / PARTIAL(파괴적 CRUD `TeamPermissions.php:598-692`) / PRESENT(불변성 substrate SecurityAudit `SecurityAudit.php:12-68`)**. 재활용: CRUD에 버전/게시 계층 추가(ADR D-3)·SecurityAudit 확장(ADR D-5).
- **NOT_CERTIFIED · 코드 변경 0**: 계약 설계물. 실 봉인 로직은 RP-track.
- **선행의존**: APPROVAL_POLICY(정책본)·APPROVAL_POLICY_REGISTRY 확정 후 버전 발행 가능. Part 1~3-11 인증 전제(BLOCKED_PREREQUISITE).
