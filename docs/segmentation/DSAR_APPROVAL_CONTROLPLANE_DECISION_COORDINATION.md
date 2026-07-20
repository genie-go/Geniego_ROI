# DSAR — Decision Coordination (Part 3-19 §8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §8)

Decision Coordination은 인가 결정(Authorization Decision)이 **단일 로컬 PDP 호출**을 넘어 다중 지점·다중 상태에서 조율되어야 할 때의 조율 계약을 정의한다. 하위 5개 결정 유형:

- **Regional Decision** — 지역(리전) 로컬 PDP가 자기 리전 정책으로 결정.
- **Federated Decision** — 다수 리전/도메인 PDP 결정을 합성(연합)하여 단일 유효 결정 산출.
- **Cached Decision** — 이전 결정을 TTL·불변조건 하에 재사용(결정 캐시).
- **Emergency Decision** — 조율 경로 장애 시 안전측(fail-closed) 비상 결정.
- **Consensus Decision** — 복수 결정자 정족수(quorum) 합의로 확정.

계약 불변식: 모든 조율 결정은 ① 근거(정책 버전·입력 스냅샷) 기록, ② fail-closed 기본값, ③ SecurityAudit append-only 체인에 증적 기록.

## 2. Substrate 매핑

| SPEC 결정 유형 | 현행 substrate | 상태 |
|---|---|---|
| 로컬 단일 결정(PDP) | `TeamPermissions.php:695-701` (권한 판정 진입) · `:704-712` (판정 로직) | PRESENT (로컬 전용) |
| 결정 집행 지점(PEP) | `index.php:69-88` (공개경로/인증 게이트) | PRESENT |
| 결정 증적 | `SecurityAudit.php:14-64` (append-only 체인) | PRESENT (조율 결정 미연동) |
| Regional Decision | — | **ABSENT** (리전 개념 부재) |
| Federated Decision | — | **ABSENT** (연합 합성기 grep 0) |
| Cached Decision | — | **ABSENT** (결정 캐시 계층 부재) |
| Emergency Decision | — | **ABSENT** (비상 결정 경로 부재) |
| Consensus Decision | — | **ABSENT** (정족수 결정자 grep 0) |

현행 인가는 `TeamPermissions.php:695-701`의 **로컬 인프로세스 PDP 단일 호출**이 전부이며, 원격/연합/합의 결정을 산출·조율하는 코드는 존재하지 않는다.

## 3. 설계 계약 (순신설)

- **DecisionCoordinator** (순신설): 로컬 PDP(`TeamPermissions.php:704-712`) 결정을 입력으로 받아, 필요 시 Regional/Federated/Consensus 경로로 확장하는 **얇은 조율 계층**. 로컬 PDP를 대체하지 않고 감싼다(Extend, not Replace).
- **결정 봉투(Decision Envelope)**: {정책버전, 입력스냅샷, 결정, 근거, 조율경로, 정족수증거}. 모든 봉투는 `SecurityAudit.php:14-64` 체인에 기록.
- **Fail-closed 기본**: 조율 경로 미가용 시 로컬 PDP 단독 결정으로 강등하되 deny 우선, Emergency Decision은 명시적 승인·감사 필수.
- **Cached Decision 무효화**: 정책 버전 변경 시 즉시 무효(불변식). TTL 단독 신뢰 금지.

## 4. KEEP_SEPARATE

- `Decisioning.php:12`·`:307` — **마케팅 의사결정**(캠페인/예산). 이름이 "decision"이나 인가 결정과 무관. 흡수 금지.
- Zero Trust/Federation/AI Governance Coordinator는 §9~§13(별도 DSAR) 소관. 본 §8은 결정 조율만.

## 5. 판정

**ABSENT** — Regional/Federated/Cached/Emergency/Consensus Decision 및 원격·합의 결정 조율 코드는 grep 0. 현행은 `TeamPermissions.php:695-701`·`:704-712`의 로컬 단일 PDP만 존재. Decision Coordination 계층은 **순신설**이며, 선행 substrate(연합/리전/정족수) 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
