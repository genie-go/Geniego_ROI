# DSAR — Approval Role Assignment Approval (EPIC 06-A-03-02-03-04 Part 3-3 · per-entity: Assignment Approval)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_ASSIGNMENT_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_ASSIGNMENT_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT`](DSAR_APPROVAL_ROLE_ASSIGNMENT_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Decision Core 실 구현 부재
- **불변**: Approval Reference를 Version에 고정 · Effective는 version 기준 · 반날조

## 1. 목적

Assignment Approval은 스펙 §9가 정의하는 승인 유형 계약으로, Role Assignment(부여)가 실행되기 전 통과해야 하는 승인 경로(Auto/Single/Dual/Multi-stage/Emergency/Risk-based/Manual)를 정형화한다. 승인 결과는 즉시 실행에 반영되지 않고 **Approval Reference가 Assignment Version에 고정**되어(§9 원문·ADR §3) Version 불변성(§6 Version Type "Approval Change")과 결합한다. 현재 5개 실행 substrate(team_role 3핸들러·api_key 2경로·wms_permissions·pm_task_assignees)는 caller 권한검증 통과 즉시 단일 트랜잭션으로 직접 반영되며, 이 승인 계약을 소비하는 경로가 전무하다(전수조사 §3).

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `approval_id` | 식별자(PK) |
| `assignment_id` / `assignment_version_ref` | 승인 대상 Assignment와 그 Version(§9 "Approval Reference를 Assignment Version에 고정") |
| `approval_type` | §3 열거형(Auto/Single/Dual/Multi-stage/Emergency/Risk-based/Manual) |
| `approver_id` / `approver_set` | 승인자(Dual/Multi-stage는 복수) |
| `decision` | 승인 / 반려 / 보류 |
| `decision_reason` | 결정 사유 |
| `risk_basis` | Risk-based Approval의 판단 근거(§10 Risk Score와 결합) |
| `emergency_basis` | Emergency Approval의 판단 근거(§12 Incident Reference와 결합) |
| `decided_at` | 승인 결정 시각 |
| `evidence` | 증거(§26 Assignment Evidence와 결합) |

## 3. 열거형 / 타입

- **ApprovalType**(§9 원문): `AUTO` · `SINGLE` · `DUAL` · `MULTI_STAGE` · `EMERGENCY` · `RISK_BASED` · `MANUAL`
- **범위 경계**: 본 엔티티는 승인의 "유형·결과·Version 고정 방식"만 정의한다. 승인 프로세스 상태 전이(Requested~Approved)는 §7 Assignment Lifecycle이 소유하며, 본 엔티티는 그 안의 한 단계를 기록한다.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 판정 | 실 substrate (file:line) |
|---|---|---|
| 승인 workflow(Auto/Single/Dual/Multi-stage/Emergency/Risk-based) | **ABSENT** | 전수조사 §3: "승인 workflow 부재(전수 grep 0)" — 5경로(`UserAuth.php:1334,1392`·`EnterpriseAuth.php:483-511`·`Keys.php:81-187`·`Wms.php:505-526`·`Assignees.php:17-72`) 전부 caller 권한검증 통과 즉시 직접 반영 |
| 기존 승인 인프라 재사용 여부 | **ABSENT(재사용 아님)** | `pending_approval`/`approveQueue` 매치는 캠페인/가격 도메인(예 `AdminGrowth.php:1063`)이며 role 부여와 무관(전수조사 §3) · ADR §3 "기존 승인 인프라(catalog approveQueue)는 상품 도메인·재사용 아님(신규)" |
| Approval Reference를 Version에 고정 | **ABSENT** | Version 자체가 순신규(ADR §D-2·전수조사 §6) — 고정할 Version 엔티티가 없음 |
| Emergency Approval(승인자·근거) | **ABSENT(근접 오인 주의)** | break-glass(`UserAuth.php:790-801,929-935,995-999`)는 **인증우회**지 role 부여 승인이 아님(ADR §D-5) — Emergency Approval로 오흡수 금지 |

★근접 substrate 없음. 반날조 원칙 — 지어내지 않음.

## 5. 설계 원칙

1. **Approval Reference는 Assignment Version에 고정**(§9 원문) — 승인은 특정 Version에 결속되며, 이후 Version이 갱신되면 재승인이 필요하다(과거 Version 불변·ADR §D-2).
2. **기존 승인 인프라 재사용 금지** — `approveQueue`(상품/가격 도메인)를 그대로 role 승인에 끌어쓰지 않는다(도메인 오흡수 금지, ADR §3).
3. **Emergency Approval ≠ break-glass** — break-glass는 로그인 인증 우회(MFA 우회)이며 role 부여 승인이 아니다(ADR §D-5). Emergency Assignment(§12)의 승인은 Incident Reference·Maximum Duration·Mandatory Audit을 갖춘 별도 계약이다.
4. **Golden Rule** — 신규 승인 엔진은 5분산 write 경로(team_role/api_key/wms/pm)를 Canonical Assignment Registry로 통합하는 단일 진입점 안에서만 소비된다(ADR §D-1). 개별 핸들러가 독자 승인 로직을 갖지 않는다.
5. **Auto Approval도 기록 대상** — 승인 없음이 아니라 "자동 승인됨"이 명시적으로 기록되어야 한다(감사 비일관 재발 방지, 전수조사 §5).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE(RP-002)**: 승인 workflow 자체·Assignment Version·Assignment Registry가 전부 선행 미구현(Part 2·3-1·3-2). 승인 엔진은 이들 실구현 후 별도 승인세션.
- **Gap-1(ABSENT)**: `APPROVAL_ROLE_ASSIGNMENT_APPROVAL` 엔티티·7종 ApprovalType·Version 고정 메커니즘 전부 순신설.
- **Gap-2**: 5경로 즉시 direct write가 승인 게이트 자체를 우회하는 구조(전수조사 §3) — 승인 도입 시 5경로 우회 잔존 방지가 선결 과제(ADR §D-1 통합 없이는 승인 무력화).
- **정직 부재**: 근접 substrate 없음. Emergency Approval을 break-glass로 오판하지 않음(ADR §D-5 명시).
- **판정**: NOT_CERTIFIED · 실 엔진 = 별도 승인세션(RP-002).
