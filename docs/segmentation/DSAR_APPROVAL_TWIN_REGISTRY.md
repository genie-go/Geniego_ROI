# DSAR — Authorization Digital Twin Registry (Part 3-22 §1·§3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC §1)

**APPROVAL_TWIN_REGISTRY**는 인가(authorization) 결정 환경의 **디지털 트윈 인스턴스 목록**을 관장하는 카탈로그 계약이다. 각 트윈은 실 운영 authz 결정 표면(role/scope/policy 평가)의 **read-only mirror**로서, 예측 거버넌스(정책 변경 what-if, drift 탐지, 승인 회귀 시뮬레이션)의 실행 대상이 된다. Registry는 트윈의 **신원·환경·경계·동기화 계약**을 SSOT로 보유한다.

Registry 레코드 필수 필드:

| 필드 | 의미 |
|------|------|
| Twin Identifier | 트윈 전역 유일 ID(불변) |
| Environment | Production / Staging / Regional / Tenant / Sandbox 중 대응 원본 환경 클래스 |
| Region | 트윈이 미러링하는 지리·규제 경계 |
| Tenant | 테넌트 격리 스코프(전역 트윈은 `__platform__`) |
| Sync Mode | event-replay / snapshot / hybrid |
| Refresh | 동기화 주기·트리거(이벤트 기반 / 스케줄 / 수동) |
| Owner | 트윈 거버넌스 책임 주체 |
| Version | 트윈 스키마·정책 스냅샷 버전 |

**Registry가 관장하는 트윈 종류**: Production Twin(운영 결정 표면 미러), Staging Twin(사전 배포 정책 검증), Regional Twin(규제 경계별 격리 미러), Tenant Twin(단일 테넌트 격리 시뮬레이션), Sandbox Twin(파괴적 what-if 격리 실험).

## 2. 실존 substrate 매핑

| 요소 | 상태 | 근거 |
|------|------|------|
| authz Digital Twin Registry | **ABSENT** | grep 0 — 트윈 카탈로그·트윈 신원·트윈 환경 클래스 개념 전무 |
| 메시지 브로커(트윈 동기화 backbone) | **ABSENT** | `backend/composer.json:5-13` — 브로커/큐 의존성 부재 |
| demo 형제 환경(트윈 오판 주의) | PARTIAL(별개 라이브 env) | `backend/src/Db.php:20-21` · `backend/src/Handlers/AdminPlans.php:53` |

★**demo 형제 env는 트윈이 아니다**. `Db.php:20-21`·`AdminPlans.php:53`의 demo 환경은 config가 미러된 **별개의 라이브 운영 환경**으로, 실제 쓰기 트래픽을 받는 독립 env다. read-only event-replay mirror가 아니며 예측 거버넌스 대상도 아니다 — **twin 오판 금지**.

## 3. 설계 계약(규칙)

- (R1) 모든 트윈은 Registry 등록 없이 생성 불가. Twin Identifier는 불변, 재사용 금지.
- (R2) 트윈은 read-only. Registry는 트윈이 원본 authz 표면에 쓰기 경로를 가지지 않음을 계약으로 강제한다.
- (R3) Environment/Region/Tenant는 원본 경계를 넘어설 수 없다(테넌트 격리 절대·규제 경계 절대).
- (R4) Sync Mode·Refresh 미기재 트윈은 stale로 간주, 예측 거버넌스에서 자동 제외.
- (R5) demo 형제 env는 Registry 트윈으로 등록 금지 — 라이브 env이므로 Environment=Production 원본이지 트윈이 아니다.

## 4. 판정

**NOT_CERTIFIED · ABSENT-greenfield.** APPROVAL_TWIN_REGISTRY는 순신설(grep 0) 도메인이다. 메시지 브로커 부재(`composer.json:5-13`)로 동기화 backbone 선행 부재 → BLOCKED_PREREQUISITE. demo 형제 env(`Db.php:20-21`·`AdminPlans.php:53`)는 별개 라이브 env·twin 아님 — Registry KEEP_SEPARATE 대상. 코드 변경 0.
