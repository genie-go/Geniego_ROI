# DSAR — PDP/PEP Governance: 정책 결정 (APPROVAL_POLICY_DECISION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_POLICY_DECISION`은 PDP가 하나의 접근요청에 대해 산출하는 **결정론적 결과 객체**(SPEC §2 Canonical Entity)다. 결정유형(SPEC §9)과 결합규칙(SPEC §10)을 계약으로 확정한다.

- **Decision Types(§9)**: Permit · Deny · Challenge · Escalate · Require Approval · Require MFA · Require Re-authentication · Read Only · Time Limited Permit.
- **Combining Algorithm(§10)**: Deny Overrides · Permit Overrides · First Applicable · Ordered · Highest Priority · Most Restrictive. **기본 = Deny Overrides**.
- PDP 출력은 Deterministic 해야 한다(SPEC §4 말미).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(GT file:line) |
|---|---|---|
| Require MFA (결정유형) | **PARTIAL** | `mfaPolicy`·`mfaRequiredFor`·mfaPolicyConfig off/admin/all `UserAuth.php:3745`·`:3761`·`:3779`·`:3752` (GT①§F) |
| Challenge (결정유형) | **PARTIAL** | 로그인 MFA 강제·OTP 챌린지 `UserAuth.php:929-964`·`:945`·`:954-964` (GT①§F·GT②§2) |
| Read Only (결정유형) | **PARTIAL** | member→읽기전용 `UserAuth.php:1128`·`index.php:78-89` (GT①§F·②§2) |
| Deterministic 출력 (proto-PDP) | **PARTIAL·미배선** | `effectiveForUser` owner/admin→full·manager→팀권한·member→명시권한∩팀상한 clamp `TeamPermissions.php:393-421`·`:407-416` (GT①§C) |
| Explicit Deny (deny 재료) | **PRESENT·국소** | `DENY_SCOPE`(`__deny__` 센티넬·`AND 1=0`) `TeamPermissions.php:234`·`:290`·`:303` (GT①§E) |
| Permit/Deny/Escalate/Time-limited 통합 결정유형 | **ABSENT** | 통합 결정유형 부재 (GT②§2 Decision Types PARTIAL 행) |
| Combining Algorithm(Deny-overrides 병합) | **ABSENT** | `__deny__`는 단일 스코프 fail-closed용·allow/deny 병합·deny-overrides 규칙 부재 `TeamPermissions.php:234` (GT②§2·ADR D-4) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **결정유형 enum**: SPEC §9 9종을 canonical 값으로 고정. 현행 MFA/Challenge/Read-only(§F)를 이 enum에 매핑하여 승격.
- **결합규칙**: 기본 Deny Overrides(SPEC §10 말미). `__deny__` 센티넬(`TeamPermissions.php:234`)을 전역 deny-overrides 결합규칙으로 승격(ADR D-4) — allow/deny 병합 규칙 신설.
- **결정론(Determinism)**: 동일 Request+Context+Policy Version → 동일 Decision. `effectiveForUser`(`:393-421`)의 clamp 결정성을 중앙 PDP 출력 계약으로 승격(ADR D-1).
- **불변성**: 산출 Decision은 Immutable Decision Snapshot(SPEC §30)으로 봉인 — SecurityAudit 해시체인 기반(ADR D-5).
- **테넌트 격리**: 결정은 X-Tenant-Id 격리(`index.php:619`) 안에서만 유효(ADR D-7).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

authz Decision과 아래 마케팅/ops "decision"은 코드·데이터 공유 없음(GT②§5). 흡수·개명 금지.
- `Decisioning.php:12`·`:36`(ingestAdInsights)·`:432`(recommendations)·`RuleEngine.php:24`·`AutoRecommend` = 마케팅 규칙/의사결정 (GT②§C-1).
- `Catalog.php:1104`(evaluatePolicy)·`:1159`(requiresHighValueApproval) = 커머스 상품등록 정책 (GT②§C-1).
- `action_request.policy_id`(`Db.php:576`·`routes.php:439-445`) = 알림 액션정책·maker-checker (GT②§C-2).
- `PlanPolicy` RANK·requirePlan(`UserAuth.php:364`) = 상용 entitlement 게이트(authz와 직교) (GT②§C-4).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **재활용(Extend)**: Decision Types = MFA/Challenge(`UserAuth.php:929-964`)·Read-only(`:1128`) 재사용 승격(GT②§3-5). Deterministic 출력 = `effectiveForUser`(`:393-421`) 승격(ADR D-1).
- **순신규(ABSENT)**: Permit/Deny/Escalate/Time-limited 통합 결정유형·Deny-overrides Combining Algorithm(ADR D-4·GT②§2).
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-11 인증 후 실 구현. ERRE(3-7)가 PDP 핵심 입력(ADR §4). 마케팅 decision 흡수 금지.
- **판정**: NOT_CERTIFIED · 코드 변경 0 · 설계 명세.
