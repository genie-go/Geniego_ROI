# DSAR — Continuous Governance Engine (Part 3-20 §4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

`Continuous Governance Engine`은 인가 상태를 **주기·이벤트 기반으로 지속 평가**하는 관측 계약이다. 8개 지속 평가 축을 정의한다.

- **Policy Compliance**: 정책이 선언 기준과 일치하는가.
- **Runtime Consistency**: 런타임 권한 해석이 정책·캐시·저장소 간 일치하는가.
- **Least Privilege**: 부여 권한이 실사용 대비 과대한가.
- **Zero Trust**: 매 요청 시점 재검증·암묵 신뢰 부재.
- **SoD**: 직무분리 위반 상시 탐지.
- **JIT**: 임시 권한의 만료·회수 정합.
- **Audit Readiness**: 감사 증거의 상시 준비 상태.
- **Evidence Integrity**: 증거 로그의 tamper-evident 무결성.

지속 평가 결과는 **관측·경보 신호**이며 자동 삭제/집행을 트리거하지 않는다.

## 2. Substrate 매핑

| SPEC 축 | 현행 substrate | 관계 | 인용 |
|---|---|---|---|
| Evidence Integrity | append-only 해시체인 `verify()` | 실 무결성 원천 | `SecurityAudit.php:56-68` |
| Audit Readiness(인접) | 컴플라이언스 readiness | **인접** — 상시 평가 아님 | `Compliance.php:120` |
| Least Privilege/SoD 원천 | Access Review 만료·항목 탐지 | 단발성 탐지(지속 아님) | `AccessReview.php:87` |
| Zero Trust 접점 | 요청시점 인증 미들웨어 | 인접 게이트 | `index.php:610` |
| 지속 평가 루프 | — | ABSENT(grep 0) | 없음 |

현행에는 **지속(continuous) 거버넌스 루프가 없다**. `SecurityAudit.php:56-68`은 증거 무결성 검증의 유일한 실 append-only 원천이나 상시 평가 스케줄러가 이를 구동하지 않으며, `Compliance.php:120`은 인접 readiness에 그친다.

## 3. 설계 계약

- **트리거**: 주기(cron) + 이벤트(권한 변경·역할 배정). 임의 폴링 금지, SPEC 정의 간격.
- **평가**: 8축 각각 pass/warn/fail + 근거 참조(Explainable — 근거 없는 결론 금지).
- **증거**: 각 평가 회차는 `SecurityAudit.php:56-68` 해시체인에 append(불변 기록).
- **출력**: 상태 스냅샷·추세. **부작용 0**(자동 remediation은 별도 §7 엔진 소관).
- **Fail-closed**: 축 평가 불가 시 WARNING/BLOCKED, 임의 pass 금지.
- **무후퇴**: SecurityAudit·AccessReview·Compliance 기존 동작 불변.

## 4. KEEP_SEPARATE

- `ModelMonitor.php:221` — AI 모델 드리프트 감시. Continuous Governance의 AI 신호원 후보이나 엔진 분리 유지.
- `Alerting.php:660` — 경보 스켈레톤(광고 자동집행은 죽은 스켈레톤). 경보 채널로만 참조, 거버넌스 판정 로직 병합 금지.

## 5. 판정

**ABSENT** — continuous governance는 grep 0. Evidence Integrity는 `SecurityAudit.php:56-68`, Audit Readiness는 `Compliance.php:120`(인접)로 부분 신호가 존재하나 8축 지속 평가 루프는 부재. **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
