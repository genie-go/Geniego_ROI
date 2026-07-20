# DSAR — Authorization Federation Simulation Governance (Part 3-18 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_SIMULATION(§25)

Federation Simulation Governance는 **연합 인가 체계의 장애 시나리오를 실집행 없이 예측(what-if)** 하는 계약이다. 실제 파트너 도메인을 건드리지 않고, 특정 실패 조건이 발생했을 때 로컬 인가 결정과 가용성·컴플라이언스에 미치는 영향을 산출한다. §25는 5개 시나리오와 4개 영향축을 정의한다.

**시나리오**
- **Partner Offline** — 원격 도메인 응답 불가 시 로컬 PDP가 fail-closed로 얼마나 많은 결정을 차단하는가.
- **Certificate Expiration** — 상호 인증서 만료 시점을 앞당겨 인증 실패 파급 범위 산출.
- **Trust Revocation** — 파트너 Trust 강등/철회 시 재평가되는 결정 집합.
- **Cross-Region Failure** — 특정 리전 연합 노드 장애 시 우회 경로/가용성 손실.
- **Policy Conflict** — 로컬·원격 정책이 상충할 때의 결정 분기(deny 우선 vs 명시 충돌).

**영향축**: Availability(가용성) · Decision Success(결정 성공률) · Trust Score(신뢰 점수 변동) · Compliance(컴플라이언스 위반 노출).

계약상 시뮬레이션은 **read-only·부작용 0**이며, 결과는 예측 리포트로만 산출된다(자동 정책 변경 금지).

## 2. Substrate 매핑

| SPEC 개념(§25) | 현행 substrate | 상태 |
|---|---|---|
| 로컬 PDP 결정(시뮬 대상 함수) | 로컬 정책 결정 엔진 | 존재(로컬 전용, 시뮬 훅 없음) |
| 시뮬 실행 감사 | `SecurityAudit.php:14-67` | 결과 기록 채널 재사용 가능 |
| Partner/Cert/Trust/Region/Policy 시나리오 시뮬 | 부재 | **ABSENT (federation 시뮬 전무)** |
| 4 영향축 산출기 | 부재 | **ABSENT** |

## 3. 설계 계약

- **SimulationScenario** — `{type, injected_condition, scope}`. type은 위 5개 enum, injected_condition은 가상 상태(예: partner=OFFLINE, cert.expires_at=now).
- **SimulationResult** — 영향 4축별 예측치 `{availability_delta, decision_success_rate, trust_score_delta, compliance_violations[]}`.
- **격리 보장** — 시뮬은 실 PDP 호출을 shadow 모드로 재생하되 외부 파트너 I/O 금지, 실 상태 mutation 금지. 부작용 0.
- **감사** — 시뮬 실행/결과를 `SecurityAudit.php:14-67`에 기록(누가 어떤 시나리오를 언제 돌렸는지). 결과는 §26 Revalidation 우선순위 입력으로 소비 가능.
- **Fail-closed 전제** — 원격 도메인 부재 상태에서 시뮬은 "가상 파트너" 모델로만 동작하며, 실제 연합 검증 없이는 예측 신뢰도 LOW로 표기.

## 4. KEEP_SEPARATE

- DataTrust(`DataPlatform.php:281`)·GraphScore(`GraphScore.php:31`)·PriceOpt 시뮬레이션류(`PriceOpt.php:1496`·`:1583`) — 각각 데이터신뢰·그래프점수·가격 what-if 도메인. Federation 장애 시뮬과 목적·입력·산출 전부 다름. 통합·엔진 공유 금지.

## 5. 판정

**ABSENT** — federation 장애 시뮬레이션(Partner Offline/Cert Expiration/Trust Revocation/Cross-Region/Policy Conflict) 및 4 영향축 산출 grep 0. 재사용 가능한 유일 substrate는 `SecurityAudit.php:14-67`(결과 기록)뿐. §25 전체 순신설. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**(원격 도메인·연합 토폴로지 부재로 실 시뮬 대상 미완, 가상 파트너 모델만 가능).
