# ADR — Approval Assignment Engine Governance (EPIC 06-A-02)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · 구현은 선행 4축 신설 후 별도 승인세션)
- **차수**: 289차 13회차 (2026-07-18)
- **스펙**: [`SPEC_06A_02_APPROVAL_ASSIGNMENT_ENGINE_VERBATIM`](../segmentation/SPEC_06A_02_APPROVAL_ASSIGNMENT_ENGINE_VERBATIM.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION.md)
- **선행**: [`ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION`](ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md) · [`ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE`](ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md) · [`ADR_DSAR_REBATE_APPROVAL_FOUNDATION`](ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md) · [`ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP`](ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

---

## 1. 맥락 (Context)

EPIC 06-A-02는 Approval Chain Resolution·Delegation Resolution이 결정한 **승인 자격 후보**를 실제 실행 단위(Work Item·Queue·Assignment·Assignee)로 변환하는 **Approval Assignment Engine**을 요구한다. 스펙 §3은 5개 선행 Foundation(Approval·Authority·Delegation·Identity/Organization·Security/Authorization)을 전제로 명시한다.

능력 기반 전수조사(ⓑ·2 에이전트 병렬·코드 정독) 결과:
- **EPIC 의미의 Assignment Engine 부재** — 특정 승인 Work Item을 전략으로 후보 풀에서 특정 승인자에 배정+claim/lease/reassign 하는 엔진 없음.
- 실존 인접 자산은 승인 큐 2종(승인자=임의 권한자)·job claim/lease 1종(발송용)·수동 PM 배정.

## 2. 결정 (Decision)

### D-1. Canonical Approval Assignment Domain을 **신설**하되 실존 자산을 확장한다(Golden Rule: Extend not Replace)

§6 Canonical Entity(APPROVAL_ASSIGNMENT_* · APPROVAL_WORK_ITEM · APPROVAL_QUEUE_*)는 신규 도메인이나, 다음 실존 구현을 **정본 substrate로 확장**한다(중복 엔진 금지):

| 실존 | §65 태그 | 확장 결정 |
|---|---|---|
| `catalog_writeback_job`(+approveQueue·CAS claim·600s 회수) | **VALIDATED_LEGACY(Approval Queue)+CONSOLIDATION_REQUIRED** | pending_approval→approve→execute lifecycle과 CAS claim 패턴이 승인큐/claim의 정본. Assignment 엔진의 Queue·Claim은 이것을 일반화해 확장(재구현 금지). ★289차 13회차 high_value 서버측 게이트가 이 경로에 추가됨(정합·회귀0). |
| `omni_outbox`(claim_id·SKIP LOCKED·CAS fallback) | **CANONICAL(claim/lease 패턴)** | Assignment Claim/Lease/Lock은 이 관용구(SKIP LOCKED + SQLite CAS fallback) 재사용. ★단 **fencing token 부재**가 실결함 — 신설 시 monotonic fence 추가. |
| `pm_task_assignees`+`resourceCapacity`(PM/Enterprise) | **VALIDATED_LEGACY(수동 Work Item+Assignee)+CONSOLIDATION_REQUIRED** | role 모델(owner/contributor/reviewer/observer)+workload/capacity 신호를 확장(재생성 금지). 현재 capacity는 읽기전용 리포트 → 배정로직에 환류 필요. |

### D-2. 다음은 **KEEP_SEPARATE_WITH_REASON** — 승인 배정 선행 art로 인용/재분류 금지

- `TeamPermissions.DELEGATION_EXCEEDED`(:627-647) = RBAC 부여상한 monotonicity(못 가진 권한 못 줌). **금액대 authority·승인 위임 아님**.
- `AgencyPortal.agency_client_link` = 크로스테넌트 접근권 승인. **Work Item 배정 아님**.
- `Mapping` maker-checker(자기승인 차단+정족수 `:267-271`) = mapping 도메인 국한. **범용 SoD hook 아님**.
- `admin_growth_approval` = 플랫폼 admin 1인 승인. shape는 Canonical Approval 스키마 공유 가능하나 별개 도메인.

### D-3. `action_request`(Alerting) = **BLOCKED_NO_PRODUCER**

소비자(`decide`·`executeAction`·287차 정직집행)는 실재하나 `INSERT INTO action_request` 생산자 0. Assignment 엔진의 Work Item 원천으로 쓸 수 없다(생산자 신설=라이브검증/제품결정·288차 보류).

### D-4. **구현은 BLOCKED_PREREQUISITE** — 선행 4축 실구현 후 별도 승인세션(RP-002)

Assignment Engine이 딛고 설 4축이 코드 증거상 부재:

| 축 | 상태 | 근거 |
|---|---|---|
| Approval Chain(재사용 chain 엔진) | **ABSENT** | `chain_*` 0 · flat 승인테이블만 |
| Authority Matrix(금액대 DOA) | **ABSENT** | `authority_matrix/amount_band` 0 |
| Identity/Org(Org Unit·Reporting Line·Position·Legal Entity·Employment) | **ABSENT** | `org_*` 0 · `parent_user_id`=owner 붕괴(`UserAuth:156-157,1225-1227`) |
| Security/Authz(SoD·CoI·Actor Snapshot·중앙 Tenant Guard) | **PARTIAL** | `SecurityAudit::verify()`·break-glass·분산 tenant격리 실재하나 SoD/actor-snapshot foundation 부재 |

→ 다단 assignment routing이 참조할 SoT(chain·authority·org)가 없으므로 **§72 per-entity 산출물 대부분은 ABSENT/BLOCKED_PREREQUISITE·cover 0**이 정직한 판정. 이번 차수 산출=설계 명세(코드 0). 실 엔진=선행 4축 신설 후 별도 승인세션.

### D-5. Mandatory Control은 고객설정으로 비활성 불가(§5.12)

Tenant Isolation·Original Authority·Delegation·Legal Entity Boundary·SoD·CoI·Assignment Snapshot·Decision-time Revalidation·Immutable Audit·Duplicate Active Assignment Guard는 설정 무력화 금지 원칙으로 확정(구현 시 강제).

## 3. ★실 위험 (별도 수정세션 후보 — 이번엔 설계만)

1. **`omni_outbox`/`catalog_writeback_job` claim에 fencing token 부재** — claim_id 동등성만으로 소유 판정 → 오래된 워커가 최신 상태 덮어쓸 이론적 창(현재는 CAS+상태가드로 대부분 차단되나 monotonic fence 없음). Assignment Lock 신설 시 fencing 필수(§44).
2. **`action_request` 생산자 부재** — 승인/집행 스켈레톤이 상류 없이 존재(287차 확정). 생산자 신설 전엔 죽은 경로.
3. **PM capacity 읽기전용** — `resourceCapacity`가 배정에 환류 안 됨(과부하 배정 방지 불가).
4. **승인 큐의 per-approver 라우팅 부재** — `approveQueue`가 테넌트 내 임의 requirePro에 개방 → Queue Membership/Eligibility/Amount-band 라우팅이 없어 고액 승인이 일반 권한자에게 노출(단 289차 13회차 high_value 서버측 게이트로 "승인 필요" 자체는 강제됨·승인자 특정은 미구현).

## 4. 대안 (Considered)

- **A. 지금 전 엔진 구현** — 기각. 선행 4축 부재(D-4)로 SoT 없음. 반쪽 구현=가짜 녹색(287/288차 감사 패턴)·은행급 보안 원칙 위반. RP-002 자율 금지.
- **B. 실존 승인큐를 assignment 엔진으로 승격** — 부분 채택(D-1 확장). 단 단독으로는 후보/전략/라우팅 부재로 EPIC 요건 미충족.
- **C. 설계 명세만(코드 0) + 실존 확장 계획 + 선행 전제 명문화** — **채택**. 289차 06-A-01/5-3-3-4 패턴 일관.

## 5. 귀결 (Consequences)

- (+) 실존 자산(claim/lease·승인큐·assignee 모델)의 정본 지위·확장점 확정 → 향후 구현이 재구현 없이 착수.
- (+) 선행 4축 전제·실 위험 4건 문서화 → 다음 세션이 순서(4축→06-A-02→06-A-03)를 안다.
- (−) 이번 차수 런타임 기능 증가 0(설계만). 
- (→) 다음: 선행 4축(Approval Chain·Authority·Org/Position·SoD) 실구현 → 06-A-02 실 엔진 → EPIC 06-A-03 Sequential Approval Engine.

## 6. 규율 준수

Golden Rule(Extend not Replace) · 중복 엔티티 금지 · 무후퇴 · "결론의 근거도 재실증"(코드 정독·DDL/이름 추론 금지) · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · RP-002(스펙 없는 실 구현 자율 금지).
