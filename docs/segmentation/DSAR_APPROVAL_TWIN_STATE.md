# DSAR — Authorization Digital Twin State (Part 3-22 §2·§7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC §2·§7)

**APPROVAL_TWIN_STATE**는 트윈 인스턴스가 특정 논리 시점에 보유하는 **인가 런타임 상태의 재구성 스냅샷**을 정의하는 계약이다. 상태는 원본 authz 표면의 유효 role/scope/정책 바인딩·승인 큐·위임 관계를 event 소스로부터 결정론적으로 재조립한 **read-only 투영**이며, 예측 거버넌스는 이 상태 위에서 what-if를 실행한다. 상태는 절대 원본에 역기록되지 않는다.

상태 필수 요소:

| 요소 | 의미 |
|------|------|
| State Version | 상태 스냅샷 논리 버전(event offset에 고정) |
| As-Of | 재구성 기준 논리 시점 |
| Derivation | 상태를 만든 event 소스·replay 범위 |
| Materialized View | 유효 role/scope/정책/승인·위임 투영 |
| Integrity | 소스 event 무결성 검증 결과 |
| Divergence | 원본 대비 drift 지표 |

## 2. 실존 substrate 매핑

| 요소 | 상태 | 근거 |
|------|------|------|
| authz Twin runtime state mirror | **ABSENT** | grep 0 — 런타임 상태 재구성·As-Of 투영·drift 지표 전무 |
| 감사 event 소스(상태 재구성 입력) | PRESENT(소스만) | `backend/src/SecurityAudit.php:27` |
| State 무결성 검증 substrate | PARTIAL(체인만) | `backend/src/SecurityAudit.php:56-67` |
| 메시지 브로커(상태 스트리밍) | **ABSENT** | `backend/composer.json:5-13` |

★**SecurityAudit(`SecurityAudit.php:27`)는 event 소스일 뿐 상태 mirror가 아니다.** 해시체인은 append-only event 로그로서 상태 재구성의 **입력**이 될 수 있으나, 유효 role/scope의 As-Of 투영·drift 지표 같은 **materialized runtime state**를 제공하지 않는다. 상태 계약은 이 소스 위에 순신설되어야 한다.

## 3. 설계 계약(규칙)

- (R1) 상태는 반드시 event 소스로부터 결정론적으로 재구성. 임의 주입 상태 금지.
- (R2) State Version은 소스 event offset에 고정 — 재현 가능(replay 동일 입력 → 동일 상태).
- (R3) Materialized View는 read-only. 원본 authz 표면 역기록 경로 0.
- (R4) Integrity 미검증(소스 event 무결성 실패) 상태는 예측 거버넌스에서 자동 제외.
- (R5) Divergence(drift)가 임계 초과 시 상태 stale 표시 → 재동기화 트리거.

## 4. 판정

**NOT_CERTIFIED · ABSENT-greenfield.** APPROVAL_TWIN_STATE는 순신설이다. runtime state mirror 전무(grep 0). SecurityAudit(`SecurityAudit.php:27`·`:56-67`)는 상태 재구성의 event 소스·무결성 substrate일 뿐 상태 투영 아님. 동기화 브로커 부재(`composer.json:5-13`) → BLOCKED_PREREQUISITE. 코드 변경 0.
