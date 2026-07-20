# DSAR — JIT Access Governance: 완료 게이트 (Part 3-9 §37)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §37 완료 조건 = 17개 구축 항목 + 3개 통과 게이트:

- **구축(17)**: JIT Registry · Request Engine · Approval Workflow · Risk Evaluation · Temporary Assignment · Runtime Monitoring · Auto Revocation · Session Extension · Snapshot · Evidence · Digest · Analytics · Drift · Revalidation · Simulation · Runtime Guard · Static Lint.
- **통과 게이트(3)**: Performance Benchmark 통과 · **Zero Standing Privilege Validation 통과** · **Regression Test 100% 통과**.

Zero Standing Privilege(ZSP) Validation은 §0의 최상위 원칙 검증 — 고위험 권한이 상시 보유되지 않고 JIT grant로만 획득됨을 증명한다(ADR D-3).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| §37 완료 항목 | 실존 substrate | 판정 |
|---|---|---|
| JIT Registry / Request Engine | request registry ABSENT(`access_request`=DSAR/AgencyPortal뿐, GT② §2) | **ABSENT** |
| Approval Workflow | maker-checker `Alerting.php:642-650`·`:684-686`(마케팅용 재활용) | **PARTIAL** |
| Risk Evaluation | 권한상승 risk 0(GT② §2) | **ABSENT** |
| Temporary Assignment | 시한부 발급 원형 `UserAdmin.php:472-482`(2h TTL·`impersonated_by` `:478`) | **PARTIAL(하향대행)** |
| Runtime Monitoring | 상승세션 감시 ABSENT(GT② §2·B-8) | **ABSENT** |
| Auto Revocation | 능동회수 워커 ABSENT — lazy만(`UserAuth.php:989`·`Keys.php:141`, cron 3종 GT② B-9) | **ABSENT(능동)** |
| Snapshot / Evidence / Digest | 증거=SecurityAudit 체인 `SecurityAudit.php:12-53`·verify `:56-68`; append-only 이력 `AccessReview.php:62-80` | **PARTIAL(증거체인)** |
| Runtime Guard | 만료권한 차단 lint/guard ABSENT(FE `SecurityGuard.js`=테넌트오염/XSS, GT② §2) | **ABSENT** |
| Static Lint | 영구권한 우회 lint ABSENT(GT② §2) | **ABSENT** |
| ZSP Validation | `acl_permission` TTL 컬럼 부재=상시특권 노출(최대 공백, GT① §F·ADR 2.3) | **ABSENT** |
| Regression 100% | 289차 P1~P5(writeGuard 서버강제·세션토큰 hash-only) 무후퇴 substrate(ADR D-7) | **PARTIAL(재활용)** |

핵심: 17 구축항목 다수 + 3 통과게이트 모두 **미충족**. 최대 공백은 `acl_permission` TTL 컬럼 부재(GT① §F·GT② §3·ADR 2.3) — ZSP Validation의 물리 전제가 없다.

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| 게이트 | 통과 기준(설계) | 근거 |
|---|---|---|
| 17 구축 완료 | Registry~Static Lint 전 항목 실 배선·정직상태(가짜녹색 0) | §37·ADR D-6 |
| Performance Benchmark | §35 6상한 + §36 부하(100K/1M/10M) 통과 | §35·§36 |
| **ZSP Validation** | 고위험 권한 상시보유 0·JIT grant로만 획득·만료 시 능동회수 검증(별도 grant 원장 `expires_at NOT NULL`) | §0·§37·ADR D-1·D-3 |
| **Regression 100%** | Authorization·Assignment·Policy·Audit·Compliance 무후퇴 100%(영속 RBAC·impersonation·세션/키/구독 만료 병행 유지) | §36·§37·ADR D-7·§4 무후퇴 |

- ZSP 검증은 `acl_permission` 확장 + grant 원장 신설(ADR D-1)로 TTL 앵커를 확보한 뒤에만 성립.
- Break-Glass는 무기한 백도어(`UserAuth.php:793`)를 **시한부 grant + 필수 사후검토**로 승격해야 완료(ADR D-4).

## 4. KEEP_SEPARATE / 선행의존

- 완료 판정 시 `action_request`/impersonation/plan게이팅/세션수명/api_key/MFA/광고킬스위치(`AdAdapters.php:22`)를 JIT 완료 항목으로 계상 금지(GT② B-1~B-7·ADR D-6).
- Part 3-8 AccessReview(`AccessReview.php:24-29,:210-214`)는 계승 선례이나 **엔진 분리**(정적 검토 vs 동적 발급) — 완료 게이트 공유 아님(ADR D-5·GT② B-10).
- 선행: Part 1~3-8 인증 완료 후 실 구현(ADR §4 BLOCKED_PREREQUISITE). ERRE(3-7)에 JIT grant 입력 결합이 Integration 완료 전제.

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **NOT_CERTIFIED · 코드 0**. §37 완료 게이트(17 구축 + Performance + ZSP Validation + Regression 100%)는 전부 **실 구현(RP-track) 조건**.
- ZSP Validation의 물리 전제(`acl_permission` TTL 컬럼)가 ABSENT(GT① §F)이며 능동 Auto-Revocation·Runtime Guard·Static Lint도 ABSENT(GT② B-9). 재활용 substrate(maker-checker `Alerting.php:642-686`·SecurityAudit `SecurityAudit.php:12-68`·AccessReview append-only `AccessReview.php:62-80`)는 대체 아닌 확장 대상.
- BLOCKED_PREREQUISITE — 완료 판정은 실 구현 세션에서만 가능. 현 단계는 계약 확정에 한한다.
