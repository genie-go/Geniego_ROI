# DSAR — Zero Trust & Continuous Authorization: 신뢰 시뮬레이션 (APPROVAL_TRUST_SIMULATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_TRUST_SIMULATION은 신뢰 컨텍스트에 가상 변화를 주입해 **인가 결정 분포의 변화를 사전 예측**하는 엔티티다(SPEC §27). What-if 분석으로, 실제 세션에 영향 없이 시나리오별 결과를 산출한다.

| 시뮬레이션 시나리오 (SPEC §27) | 영향 분석 출력 (SPEC §27) |
|---|---|
| Device Compromise | Permit 감소 |
| Network 변경 | Challenge 증가 |
| Threat 증가 | Deny 증가 |
| Trust 감소 | (위 3지표 종합) |

SPEC §32(API)는 `Trust Simulation`을 최소 API로 명시한다. 시뮬레이션은 SPEC §11 Adaptive Authorization의 결정 유형(Permit/Deny/Challenge/Step-up/Re-auth/Session Termination)을 대상으로 결과를 투영한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | Ground-Truth 근거 |
|---|---|---|
| Trust Simulation 엔진(authz what-if) | **ABSENT** | Adaptive/Risk-based Authorization grep 0(GT② §2). 시뮬레이션 대상 결정엔진 자체 부재 |
| 시나리오 입력(Device/Network/Threat/Trust) | **ABSENT(순신규)** | Device Trust·Network Trust·Threat Intel·Trust Score 전부 grep 0(GT② §2) — 주입 대상 신호가 없음 |
| 결정 분포 산출 기반 | **ABSENT** | Adaptive 결정(§11)이 없어 Permit/Challenge/Deny 분포 개념 부재(GT② §2) |
| 원자료(ip/ua) | **PARTIAL** | `recordSessionMeta`(`UserAuth.php:4232-4251`)가 Device/Network 시나리오 입력 승격 후보(ADR D-1)·현재는 기록만 |
| 증거 저장 | **재활용** | SecurityAudit 해시체인(`SecurityAudit.php:12-68`)이 시뮬레이션 기록 무결성에 재활용(ADR D-5) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **키/격리**: `tenant_id`(SPEC §33 Tenant Isolation)·`simulation_id`·`scenario`(device_compromise/network_change/threat_increase/trust_decrease·SPEC §27).
- **입력 필드**: `perturbation`(주입 신호)·`target_scope`(session/tenant/role)·`baseline_snapshot_id`(→APPROVAL_TRUST_SNAPSHOT·SPEC §20).
- **출력 필드**: `permit_delta`·`challenge_delta`·`deny_delta`(SPEC §27 영향 분석). 결정 유형은 SPEC §11·§17 열거값만 사용.
- **부작용 없음(read-only)**: 시뮬레이션은 실 세션·실 인가에 영향 없음. 실 세션 무효화는 실행 경로(§28 Runtime Guard) 전담·시뮬레이션과 분리.
- **불변성**: 시뮬레이션 결과 기록은 Immutable(SPEC §33)·재현 가능(baseline 스냅샷 참조).

## 4. KEEP_SEPARATE (마케팅 simulate 흡수금지)

★authz Trust Simulation은 마케팅 예측·최적화 시뮬레이션과 **완전 분리**(GT② §4). "simulation/what-if" 명명 충돌 흡수 금지.

| 흡수 위험 대상 | 근거 | 분리 사유 |
|---|---|---|
| MMM 예산 프론티어·베이지안 사후 | `Mmm.php:749`·`:939`(GT② §4 B-1) | 광고비→매출 예측이지 인가 결정 분포 아님 |
| 어트리뷰션 신뢰/시나리오 | `AttributionEngine.php:246-261`(GT② §4 B-1) | 채널 기여 추정이지 Permit/Deny 투영 아님 |
| 데이터 신뢰도 대시보드 | `DataPlatform.php:281`(GT② §4 B-1) | 데이터 품질 지표이지 authz trust 아님 |

## 5. 판정

- **NOT_CERTIFIED · ABSENT-순신규**: authz Trust Simulation은 grep 0(GT②)·순신규.
- **선행 의존(BLOCKED_PREREQUISITE)**: 시뮬레이션은 **Trust Engine(§3~§8)·Adaptive Authorization(§11)·Trust Score(§14) 실 엔진에 종속** — 주입 대상 신호와 결정엔진이 선행 구축되어야 성립(SPEC §27은 이들 영향분석 전제). Part 1~3-12 인증 후 실 구현(ADR §4).
- **재활용(Extend)**: recordSessionMeta를 시나리오 입력원으로 승격(ADR D-1)·SecurityAudit를 증거로 재활용(ADR D-5)하되 마케팅 엔진 흡수 금지(무후퇴).
