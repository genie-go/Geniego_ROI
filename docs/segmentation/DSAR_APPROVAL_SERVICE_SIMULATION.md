# DSAR — Service Simulation (EPIC 06-A-03-02-03-04 Part 3-6)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
> **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
> **전수조사 근거**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
> **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실구현 후 별도 승인세션.
> **불변**: Simulation=무변경(dry-run·실 Runtime/DB 부작용 0) · **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용. 그 밖은 `ABSENT`. 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

Service Simulation = **Secret Rotation·Certificate 교체·Role 변경·Runtime 변경**(스펙 §29)을 실제 적용 전에 dry-run으로 미리 평가(영향범위·Runtime Guard 차단 여부)하는 축. **실 상태 무변경**이 절대 원칙이다.

- **순신규**: dry-run 경로 grep 0(전수조사 §10).
- 현재 rotate 함수(`Keys.php:150-187`)는 **즉시 실행형**(호출 즉시 기존 is_active=0+신규 row 생성)이며, 실행 전 영향도를 미리 평가하는 시뮬레이션 모드는 부재.

## 2. Canonical 필드

`SERVICE_SIMULATION` (전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | simulation_id | 시뮬레이션 식별자 |
| 2 | tenant | 테넌트 스코프 |
| 3 | service_identity_ref | 대상 Service Identity 참조 |
| 4 | simulation_type | Secret Rotation/Certificate 교체/Role 변경/Runtime 변경(③) |
| 5 | proposed_change | 제안된 변경 diff 페이로드 |
| 6 | simulated_at | 시뮬레이션 실행 시각 |
| 7 | predicted_effect | 예측 효과(Runtime Guard 차단 여부 등) |
| 8 | actual_state_unchanged_flag | 무변경 검증 플래그(실 상태 변경 0 보증) |

## 3. 열거형 / 타입

- **simulation_type**: Secret Rotation · Certificate 교체 · Role 변경 · Runtime 변경(스펙 §29 원문)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL)

| Simulation 축 | 최근접 substrate | 판정 | 근거 |
|---|---|---|---|
| Secret Rotation dry-run | api_key rotate(즉시 실행·dry-run 모드 없음) | **ABSENT**(실행형만·시뮬레이션 부재) | `Keys.php:150-187` |
| Certificate 교체 dry-run | — | **ABSENT** | grep 0 |
| Role 변경 dry-run | — | **ABSENT** | grep 0(비인간 Service Role 자체가 ABSENT) |
| Runtime 변경 dry-run | — | **ABSENT** | grep 0 |
| 무변경(dry-run 격리) 실행 경로 | — | **ABSENT** | grep 0 |

## 5. 설계 원칙

- **완전 격리**: Simulation은 실 DB/Runtime에 부작용 0 — rotate 함수(`Keys.php:150-187`)처럼 즉시 신규 row를 생성하는 실행형 경로와 물리적으로 분리된 별도 경로로 설계한다.
- **입출력 계약**: 입력=proposed_change, 출력=predicted_effect(Runtime Guard §30·Warning Contract §33 예측). 실행 로직과 100% 격리.
- **실행은 별도 승인 경유**: Simulation 결과 승인 후에만 실 Trigger(별편 Service Revalidation)로 연결 — Simulation 자체가 실행을 유발하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- Secret Rotation/Certificate 교체/Role 변경/Runtime 변경 4개 Simulation 유형 = **전량 ABSENT** — 현재 rotate/revoke는 즉시 실행형뿐(dry-run 경로 없음).
- Certificate 교체 Simulation = **BLOCKED_PREREQUISITE**(Certificate Governance 선행 신설).
- Role 변경 Simulation = **BLOCKED_PREREQUISITE**(Part 3-1~3-5 Role Registry/Assignment 실구현 부재).
- 실 Simulation 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
