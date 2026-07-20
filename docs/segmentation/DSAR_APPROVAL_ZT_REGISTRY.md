# DSAR — Zero Trust & Continuous Authorization: 제로트러스트 레지스트리 (APPROVAL_ZERO_TRUST_REGISTRY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ZERO_TRUST_REGISTRY`(SPEC §2)는 Part 3-13 Zero Trust 계층의 **정본 등록부(canonical registry)** 이다. SPEC §1의 구현 목표 32종(Identity Trust Engine·Continuous Authorization/Verification·Trust Score·Confidence·Device/Session/Network/Environment Trust·Threat Intelligence·Adaptive Authorization·Step-up·Re-authentication·Trust Snapshot/Evidence/Digest/Analytics/Drift/Simulation/Reconciliation·Runtime Guard·Static Lint·API·Completion Gate)을 단일 레지스트리에 열거·버전관리한다. SPEC §34 Index(Trust Score·Session·Device·Threat·Policy·Decision)가 이 레지스트리 위에 조회 인덱스를 구축한다. 원칙은 SPEC §0 "Never Trust, Always Verify" — 등록되지 않은 신뢰신호/엔진은 인가 결정에 진입 불가(fail-closed).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | 근거(GT) |
|---|---|---|
| Zero Trust Registry(전용 구조) | **ABSENT(grep 0)** | GT② §2 "trust profile/engine 전용 구조 전무. 신뢰=암묵(로그인 통과=신뢰)" |
| 인가 엔진 열거의 실존 대체물 | **PARTIAL** | 요청별 게이트 `index.php:69-622`(api_key 미들웨어·RBAC rank/scope) · `UserAuth.php:364-374`(`requirePlan`)가 "무엇을 재검증하는가"의 사실상 목록이나 입력=자격증명·plan·team_role·scope뿐(GT① §D) |
| 증거 무결성 기반 | **PARTIAL** | `SecurityAudit.php:12-53`·`:56-68` 해시체인 append-only·verify — 레지스트리 변경 이력 무결성 재활용 대상(GT① §E) |
| Index(Trust/Session/Device/Threat/Policy/Decision) | **ABSENT** | Trust Score·Device Trust·Threat 축 자체가 부재(GT② §2)이므로 인덱스 대상 없음 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **레지스트리 항목**: SPEC §1의 엔진/엔티티 32종을 항목으로 등록. 각 항목=이름·버전·상태(설계/구현/인증)·소속 SPEC 절 참조.
- **불변 버전**: SPEC §33 Database Constraint의 `Trust Version`을 레지스트리에 적용 — 등록 항목의 버전은 불변(append-only), 변경은 새 버전 발행. `SecurityAudit.php:12-68` 해시체인으로 변경 이력 tamper-evident 보장(재활용, ADR D-5).
- **테넌트 격리**: SPEC §33 `Tenant Isolation` — 레지스트리 조회/평가는 요청별 게이트가 주입하는 tenant(`index.php:69-622`에서 `X-Tenant-Id` 주입) 경계 내로 국한.
- **fail-closed**: 미등록 엔진/신호는 인가 결정 진입 금지. agency 재검증(`index.php:96-122`·fail-closed)이 이 원칙의 실존 선례.

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

레지스트리는 **authz 신뢰 엔진만** 등록한다. 마케팅·커머스·ML 도메인의 동음이의 신호는 등록 대상이 아니다(GT② §4). 흡수 금지 대상: 마케팅 trust(`Mmm.php:749`·`:939`·`AttributionEngine.php:246-261`·`DataPlatform.php:281`), risk/anomaly(`AnomalyDetection.php`·`ModelMonitor.php:11-18`·`Risk.php:31-55`·`CustomerAI.php:10-18`·`GraphScore.php:12-18`), device-sig(`Attribution.php:144-150`·마케팅 cross-device 식별), 방어 프리미티브(SSRF `Alerting.php:786`·`Compliance.php:411`·`DataExport.php:624`·rate-limit `index.php:527-570`·threat intel 아님). authz `user_session`/`auth_audit_log` ≠ 마케팅 `performance_metrics`/`attribution_*`/`crm_*`.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Zero Trust Registry 전용 구조 = **ABSENT(순신규·그린필드)**. 재활용은 `SecurityAudit.php:12-68`(변경 이력 무결성)·요청별 게이트(`index.php:69-622`·등록 항목 소비지점)뿐.
- **선행 의존**: SPEC §1의 엔진 32종 자체가 미구현이므로 레지스트리는 그 항목들을 담을 컨테이너로서 Part 1~3-12 인증 + 3-13 실 엔진 신설 후에만 채워진다(ADR §4 BLOCKED_PREREQUISITE).
- **무후퇴**: 세션·MFA·요청별 게이트·SecurityAudit 유지·병행(ADR D 원칙 Extend-only). 코드 변경 0 · NOT_CERTIFIED.
