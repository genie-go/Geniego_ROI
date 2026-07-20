# DSAR — Service Revalidation (EPIC 06-A-03-02-03-04 Part 3-6)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
> **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
> **전수조사 근거**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
> **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실구현 후 별도 승인세션.
> **불변**: Revalidation은 신규 Snapshot 생성을 유발(기존 Snapshot 덮어쓰기 금지) · **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용. 그 밖은 `ABSENT`. 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

Service Revalidation = 특정 **Trigger**(Secret Rotation·Certificate Renewal·Runtime 변경·Role 변경, 스펙 §27) 발생 시 Service Identity의 Trust Level·Permission·Snapshot을 강제 재검증하는 축.

- **순신규**: 자동 재검증 파이프라인 grep 0(전수조사 §10).
- api_key rotate(`Keys.php:150-187`)는 **수동 HTTP** 트리거 이벤트 자체는 실재하나, rotate 이후 Trust Level·Permission을 재산정하는 후속 로직은 부재.

## 2. Canonical 필드

`SERVICE_REVALIDATION` (전부 신규 · 실값 아님)

| # | 필드 | 의미 |
|---|---|---|
| 1 | revalidation_id | 재검증 식별자 |
| 2 | tenant | 테넌트 스코프 |
| 3 | service_identity_ref | 대상 Service Identity 참조 |
| 4 | trigger_type | Secret Rotation/Certificate Renewal/Runtime 변경/Role 변경(③) |
| 5 | triggered_at | 트리거 발생 시각 |
| 6 | previous_snapshot_ref | 재검증 이전 Snapshot 참조 |
| 7 | new_snapshot_ref | 재검증 결과 신규 Snapshot 참조 |
| 8 | result | 재검증 결과(trust_level 재산정 등) |

## 3. 열거형 / 타입

- **trigger_type**: Secret Rotation · Certificate Renewal · Runtime 변경 · Role 변경(스펙 §27 원문)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL)

| Revalidation 축 | 최근접 substrate | 판정 | 근거 |
|---|---|---|---|
| Secret Rotation trigger | api_key rotate(수동 HTTP·신규 row 생성만) | **PARTIAL**(trigger 이벤트는 실재·후속 재검증 없음) | `Keys.php:150-187` |
| Certificate Renewal trigger | — | **ABSENT** | grep 0 |
| Runtime 변경 trigger | — | **ABSENT** | grep 0 |
| Role 변경 trigger | 내부 role 값=`team_role`(`TeamPermissions.php:123-136`)뿐 · 비인간 Service Role 개념 부재 | **ABSENT**(재검증 결합 없음) | `TeamPermissions.php:123-136` |
| 재검증 로직(trust 재산정) 자체 | — | **ABSENT** | grep 0 |

## 5. 설계 원칙

- **Trigger→신규 Snapshot**: Revalidation은 기존 Snapshot을 덮어쓰지 않고 신규 Snapshot을 생성(불변 원칙 유지).
- **수동 시작 → 자동화는 후속**: bin cron에 자동 회전/재검증 스케줄이 grep 0이므로, Trigger는 우선 이벤트 기반(수동 rotate/revoke)으로 설계하고 자동 스케줄은 Secret Rotation Policy(별도 축) 신설 후 결합.
- **Golden Rule(Extend)**: 기존 rotate/revoke 함수를 Trigger 소스로 재사용, 별도 Trigger 발행기 신규 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- Secret Rotation/Certificate Renewal/Runtime 변경/Role 변경 4개 Trigger의 재검증 파이프라인 = **전량 ABSENT**.
- Certificate Renewal trigger 결합 = **BLOCKED_PREREQUISITE**(Certificate Governance 선행 신설).
- Role 변경 trigger 결합 = **BLOCKED_PREREQUISITE**(Part 3-1~3-5 Role Registry/Assignment 실구현 부재).
- 실 Revalidation 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
