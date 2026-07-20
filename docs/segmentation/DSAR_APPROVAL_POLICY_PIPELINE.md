# DSAR — PDP/PEP Governance: 결정 파이프라인 (APPROVAL_POLICY_PIPELINE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

**Decision Pipeline**(SPEC §8)은 모든 접근요청이 통과하는 **12단계 고정순서** 결정 절차다. 순서: (1) Request Validation → (2) Context Collection → (3) Attribute Resolution → (4) Effective Role Resolution → (5) Scope Resolution → (6) Policy Evaluation → (7) SoD Evaluation → (8) Risk Evaluation → (9) Compliance Evaluation → (10) Decision Generation → (11) Audit → (12) Cache Update. SPEC §8은 "Pipeline 순서는 고정한다"를 명시한다. 상위 흐름(SPEC §0)은 `Access Request → PIP → PDP → Decision Cache → PEP → Target Resource`이며, 본 파이프라인은 그 PDP 내부 결정 순서를 규정한다. 출력은 Deterministic(SPEC §4)이어야 한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 파이프라인 단계 | 판정 | 근거(파일:라인) |
|---|---|---|
| 고정순서 12단계 파이프라인(전체) | **ABSENT** | 고정순서 파이프라인 부재. 각 PEP가 **개별 순서로 부분 판정**(GT② §2 "Decision Pipeline(12단계 고정순서)=ABSENT") |
| (1) Request Validation | PARTIAL | 중앙 coarse PEP `index.php:69`·`:572-598`(roleRank·write 차단)·guardTeamWrite(`:78-89`) — method 수준만 |
| (2) Context Collection | PARTIAL | `UserAuth.php:3446-3454`(clientIp)·`:4243-4250`·`:4232-4240`(ip/ua 세션메타) — PDP 주입 미배선(GT① §D) |
| (3) Attribute Resolution | PRESENT(PIP) | acl_permission/data_scope(`TeamPermissions.php:39-41`·`:152-166`)+세션(`UserAuth.php:256-268`) |
| (4) Effective Role Resolution | **PARTIAL(proto)** | `effectiveForUser`(`TeamPermissions.php:393-421`)·`roleOf`/`isAdmin`(`:120-136`·`:132`) — private·미배선 |
| (5) Scope Resolution | PARTIAL | `effectiveScope`(`:236-265`)·`scopeValuesFor`(`:272-280`)·clamp(`:356-373`·`:423-429`) |
| (6) Policy Evaluation | ABSENT(authz) | 선언적 authz policy 계층 grep 0(GT② §2) — 마케팅 evaluatePolicy는 KEEP_SEPARATE |
| (7) SoD Evaluation | 선행 3-10 | Part 3-10 산출 입력(ADR D-6) — 본 파이프라인 재구현 금지 |
| (8) Risk Evaluation | PARTIAL | `auth_audit_log` risk 컬럼(`UserAuth.php:4165`·`:4172`·`:4190-4191`) 정적 문자열·PDP 미소비 |
| (9) Compliance Evaluation | ABSENT | 통합 결정 내 compliance 평가 부재(선행 의존) |
| (10) Decision Generation | PARTIAL | Decision Types 산발 집행(`UserAuth.php:929-964`·`:1128`) — 통합 생성 부재 |
| (11) Audit | PARTIAL | SecurityAudit 해시체인(`SecurityAudit.php:12-68`)·`logAudit`(`UserAuth.php:4174-4197`·`:4203`) — rule/scope trace 미기록 |
| (12) Cache Update | **ABSENT** | Decision Cache 전무 — `TeamPermissions.php:202-225` 매 요청 DB 재계산(GT② §2) |

## 3. 설계 계약 (항목·규칙 — SPEC 근거·고정순서/테넌트격리)

- **C-1 고정순서 불변**: 12단계 순서는 SPEC §8 대로 고정. 단계 재배열·생략 금지(Deterministic 출력 SPEC §4).
- **C-2 ERRE 결합**: 4단계 Effective Role Resolution은 `effectiveForUser`(`TeamPermissions.php:393-421`)를 **중앙 PDP로 승격**(ADR D-1)하고 Part 3-7 ERRE 산출을 입력으로 소비. 재구현 금지(ADR D-6·중복 엔진 금지).
- **C-3 SoD 결합**: 7단계는 Part 3-10 SoD conflict 산출을 입력(ADR D-6).
- **C-4 우회 불가**: PEP는 PDP(파이프라인)를 우회할 수 없다(SPEC §5). 분산 PEP·하드코딩 61+12개소는 PDP 경유로 재배선·수렴(ADR D-2·Static Lint).
- **C-5 감사·캐시 종단**: 11단계 Audit은 SecurityAudit 해시체인(`SecurityAudit.php:12-53`) 확장(ADR D-5), 12단계 Cache Update는 순신규(ADR D-3). 테넌트 격리는 X-Tenant-Id(`index.php:619`) 재활용(ADR D-7).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

6단계 Policy Evaluation은 **authz 정책**만 평가한다. 마케팅/커머스 결정 파이프라인은 흡수 금지: `Catalog.php:1104`(evaluatePolicy·상품 리스팅)·`:1159`(requiresHighValueApproval), `RuleEngine.php:24`(캠페인 룰), `Decisioning.php:12`·`:36`·`:432`, `action_request.policy_id`(`Db.php:576`·`:592-594`) = Alerting 정책(GT② §5). 이들은 authz Decision Pipeline과 코드·데이터 공유 없음.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = ABSENT(12단계 고정순서 파이프라인·6·9·12단계) / PARTIAL(1·2·5·8·10·11단계·proto 4단계) / PRESENT(3단계 PIP).** 고정순서 결정 파이프라인은 순신규(현행: 각 PEP 개별순서 부분판정·GT② §2).
- **재활용(Extend·흡수 아님)**: 4단계=`effectiveForUser`(`:393-421`) 중앙 PDP 승격·ERRE(3-7) 결합, 5단계=`effectiveScope`(`:236-265`), 3단계=PIP 그대로, 11단계=SecurityAudit(`:12-68`) 확장.
- **선행의존**: 4단계 ERRE(3-7)·7단계 SoD(3-10)·Part 1~3-11 인증 후 실 구현(BLOCKED_PREREQUISITE·ADR §4). 코드 변경 0 · NOT_CERTIFIED.
