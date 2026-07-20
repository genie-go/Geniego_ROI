# DSAR — PDP/PEP Governance: 인가 정책 레지스트리 (APPROVAL_POLICY_REGISTRY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

- **APPROVAL_POLICY_REGISTRY** = 인가(authz) 정책의 **단일 등록·조회·게시 카탈로그**. 모든 authz 정책(§2 Canonical Entity)의 생성·발견·활성버전 참조의 정본 인덱스.
- SPEC §1(구현목표 1. Policy Registry / 2. Policy Repository), §2(Canonical Entity `APPROVAL_POLICY_REGISTRY`), §31(Index — Policy·Version·Subject·Resource·Action·Decision·Snapshot 색인 구축)이 근거.
- 목적: 현행 **코드 if 분기·DB 권한행에 암묵 내장된 정책**(GT② §2)을 선언적 등록물로 승격, PAP(§7)·PDP(§4)가 레지스트리를 통해 정책을 조회하도록 하는 진입점.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 구성요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Policy Registry/Repository 구조 | **ABSENT (grep 0)** | authz 정책 선언·게시 전용 구조 전무. 정책은 코드 if 분기·DB 권한행(`acl_permission`/`data_scope`·`TeamPermissions.php:152-166`)에 암묵 내장 (GT② §2) |
| 암묵 정책 저장소(레지스트리 대체물) | **PARTIAL** | `acl_permission`/`data_scope` 스키마(`TeamPermissions.php:39-41`·`:152-166`) = 등록물 아닌 원시 권한행 (GT① §D) |
| 정책 조회 진입점(PAP 인접) | **PARTIAL** | `putTeamPermissions`·`putMemberPermissions`(`TeamPermissions.php:598-692`) = 파괴적 CRUD·버전/게시 없음 (GT① §H) |
| 색인(Index §31) | **ABSENT** | Policy/Version/Snapshot 색인 전무. 매 호출 DB 재계산(`TeamPermissions.php:202-225`) (GT② §2) |

★핵심: 레지스트리는 순신규(그린필드). 재활용 substrate는 `acl_permission`/`data_scope`(PIP 원천)와 `TeamPermissions.php:598-692` CRUD(→PAP 버전화)뿐이며, 이를 **흡수가 아닌 확장**한다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **필드(안)**: `registry_id`·`tenant_id`·`policy_key`·`active_version_id`(→APPROVAL_POLICY_VERSION)·`package_ref`(→§11)·`bundle_ref`(→§12)·`status{draft|published|deprecated}`·`created_at`.
- **상태**: 등록물은 PAP(§7 Policy 생성/수정/폐기·Publishing)를 통해서만 전이. 게시된 활성버전은 불변(§30 Immutable Policy Version — APPROVAL_POLICY_VERSION 위임).
- **제약**: §30 Tenant Isolation — 레지스트리 행은 `tenant_id` 격리(중앙 PEP `index.php:619` X-Tenant-Id 강제 재활용). §31 Index(Policy·Version·Subject·Resource·Action·Decision·Snapshot) 색인 필수.
- **소비**: PDP(§4)는 요청 평가 시 레지스트리에서 `active_version_id`를 조회해 정책본을 로드. Static Lint(§26)는 레지스트리 미경유 하드코딩 authz(61+12개소·GT② §B)를 탐지.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

authz Policy Registry는 아래 동음이의 "policy" 저장소와 **코드·데이터 공유 없음**(GT② §5) — 개명·흡수 절대금지.

| 분리대상 | 근거(파일:라인) | 사유 |
|---|---|---|
| Catalog 상품등록 정책 | `Catalog.php:1104`(evaluatePolicy)·`:1159`(requiresHighValueApproval) | 커머스 리스팅 컴플라이언스·고액승인 (GT② §C-1) |
| 캠페인 룰엔진 | `RuleEngine.php:24`·`Decisioning.php:12` | 마케팅 규칙/의사결정 (GT② §C-1) |
| 알림 액션정책 | `action_request.policy_id`(`Db.php:576`·`:592-594`) | Alerting `alert_policies` 참조·maker-checker (GT② §C-2) |

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(순신규)**. Policy Registry/Repository·색인은 grep 0(GT② §2). 재활용은 PIP 원천(`acl_permission`/`data_scope`)·PAP CRUD(`TeamPermissions.php:598-692`) 확장뿐.
- **NOT_CERTIFIED · 코드 변경 0**: 본 DSAR은 계약 확정 설계물. 실 구현은 ADR D-3(Policy Registry/Version/Bundle 순신규) 관할.
- **선행의존(BLOCKED_PREREQUISITE)**: Part 1~3-11 인증 후 RP-track. APPROVAL_POLICY_VERSION(불변버전)·APPROVAL_POLICY(선언 정책본) 확정이 레지스트리 활성화의 전제.
