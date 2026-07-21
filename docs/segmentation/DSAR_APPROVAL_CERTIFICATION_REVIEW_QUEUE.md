# DSAR — Review Queue: Pending/In Review/Waiting Evidence/Escalated/Approved/Revoked/Closed 상태머신 (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §9(Review Queue 상태머신)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §9는 개별 Access Review 항목이 생성부터 종결까지 거치는 **상태머신**을 정의한다. 7개 상태:

- **Pending** — §8에서 자동 생성되어 아직 리뷰어에게 노출되지 않은 초기 상태.
- **In Review** — 리뷰어(§6)가 검토를 시작한 상태.
- **Waiting Evidence** — 리뷰어가 추가 증빙(사용 이력 등)을 요청해 대기 중인 상태.
- **Escalated** — SLA 미준수 또는 위임 실패(§7)로 상위자에게 강제 전이된 상태.
- **Approved** — 리뷰어가 현 접근권한 유지를 승인한 종결 상태.
- **Revoked** — 리뷰어가 접근권한 회수를 결정한 종결 상태.
- **Closed** — Approved/Revoked 이후 후속 조치(§10 Decision 실행)까지 완료되어 항목이 종결된 최종 상태.

본 문서는 이 7상태 머신의 실 substrate 부재를 확인하고, **이름과 상태전이 형태만 유사한 타 도메인 승인 큐 3종**을 KEEP_SEPARATE로 명확히 분리한다 — 이 오분류가 발생하면 "이미 승인 큐가 있으니 재사용하면 된다"는 가짜녹색(false-positive coverage) 판단으로 이어져 access certification 게이트 자체가 누락되는 최상위 리스크가 되므로 각별히 경계한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①에 "role certification review item"이 Pending→In Review→Waiting Evidence→Escalated→Approved/Revoked→Closed의 7상태를 거치는 큐/상태머신은 전무하다(grep 0). Ground-Truth ②가 확인한 3종 근접물(`action_request`, `catalog_writeback`, `agency_client_link`)은 **상태전이 형태(pending→approved→executed 류)** 는 유사하나 대상 도메인이 전혀 다르다 — 마케팅 자동집행 승인, 상품 정보 반영 승인, 대행사-클라이언트 연결 승인이며 **사람의 접근권한을 검토·회수하는 절차가 아니다**. 이 3종을 "이미 존재하는 Review Queue"로 오인해 재사용하는 것은 289차 후속에서 확정한 가짜녹색 회피 원칙에 정면으로 위배된다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Pending(자동생성 초기상태) | ABSENT | grep 0. §8 자동생성 자체가 ABSENT이므로 연쇄 부재 |
| In Review(검토착수) | ABSENT | grep 0 |
| Waiting Evidence(증빙대기) | ABSENT | grep 0. 증빙요청/응답 왕복 구조 없음 |
| Escalated(SLA미준수 강제전이) | ABSENT | grep 0. §7 Escalated Delegation과 연동될 SLA 타이머 자체 없음 |
| Approved(승인 종결) | ABSENT | grep 0 |
| Revoked(회수 종결) | ABSENT | grep 0. 단, 회수 **실행 수단**(계정 비활성화 등)은 §10 Decision 문서에서 별도로 다룸 |
| Closed(후속조치 완료 최종상태) | ABSENT | grep 0 |
| 상태전이 계약(전이 가능 경로 제한) | ABSENT | grep 0. ADR D-3이 신규 정의할 계약이며 기존 코드에 대응물 없음 |

### 2.3 KEEP_SEPARATE (최상위 가짜녹색 위험 — 반드시 분리 유지)

- **`action_request`**(마케팅 자동집행 승인) — `Alerting.php:571`~`:723`(decideAction/executeAction/approvals_json)이 pending→approved→executed 상태전이를 가진다. 라우트는 `routes.php:432`~`:434`. 대상은 "광고/캠페인 자동 액션"이며 사람의 접근권한이 아니다.
- **`catalog_writeback approveQueue`**(상품 정보 반영 승인) — `Catalog.php:2383`(approveQueue)·`:396`·`:858`·`:2312`~`:2392`(catalog_writeback pending_approval)이 pending→approved 상태전이를 가진다. 라우트는 `routes.php:99`. 대상은 "상품 카탈로그 필드 반영"이며 사람의 접근권한이 아니다.
- **`agency_client_link`**(대행사-클라이언트 연결 승인) — `AgencyPortal.php:20`·`:69`(상태전이), `:390`(revoke)이 유사 패턴을 가진다. 대상은 "대행사가 클라이언트 계정에 접근할 자격을 클라이언트가 승인"하는 것으로, 접근 **부여** 승인이지 기배정된 접근권한을 주기적으로 **재검토**하는 access certification이 아니다.

세 근접물 모두 (a) 대상 리소스가 사람의 역할/권한이 아니고, (b) "이미 부여된 권한을 주기적으로 재검증"하는 certification 목적이 아니라 "1회성 실행/연결을 승인"하는 목적이며, (c) §6 Reviewer Governance의 자격요건 체계와 무관하게 운영되므로 흡수·개명 금지.

## 2.4 상태전이 다이어그램(텍스트)

```
PENDING → IN_REVIEW ⇄ WAITING_EVIDENCE
IN_REVIEW / WAITING_EVIDENCE → ESCALATED (SLA 초과 또는 위임 실패)
IN_REVIEW / WAITING_EVIDENCE / ESCALATED → APPROVED | REVOKED (§10 Decision 확정)
APPROVED | REVOKED → CLOSED (§10 Remediation 실행 완료 확인 후)
```
종결 상태(APPROVED/REVOKED/CLOSED)에서 역방향 전이는 없음(불가역, §2.3의 불가역 전이 원칙과 동일).

## 3. Canonical 설계

- **큐 테이블**(신규): `role_certification_review_queue` — `state`(PENDING/IN_REVIEW/WAITING_EVIDENCE/ESCALATED/APPROVED/REVOKED/CLOSED), `subject_user_id`, `scope_ref`, `assigned_reviewer_id`(§6 연동), `trigger_type`(§8 연동), `evidence_requested_at`, `evidence_provided_at`, `sla_deadline`, `decision_id`(§10 연동), `closed_at`.
- **상태전이 계약(ADR D-3)**: PENDING→IN_REVIEW(리뷰어 착수)→{WAITING_EVIDENCE↔IN_REVIEW}(왕복 가능)→{APPROVED|REVOKED}(§10 Decision 확정)→CLOSED(후속조치 완료 확인 후). ESCALATED는 IN_REVIEW/WAITING_EVIDENCE 어디서든 SLA 초과 시 진입 가능하며, 종결 상태(APPROVED/REVOKED/CLOSED)로부터는 재진입 불가(불변).
- **fail-secure**: SLA 초과 시 자동으로 REVOKED로 넘어가지 않고 반드시 ESCALATED를 거친다 — 무인 자동회수는 금지, 사람 판단(상위자) 개입을 강제한다.
- **Closed 전 필수조건**: APPROVED/REVOKED 판정 이후 §10 Decision의 실제 실행(권한 유지/회수 집행)이 완료 확인되기 전에는 CLOSED로 전이 불가.
- **불가역 전이 원칙**: APPROVED/REVOKED/CLOSED는 종결 상태이며 이후 재오픈이 필요한 경우 신규 큐 항목을 새로 생성한다(기존 항목의 상태를 되돌리지 않음 — 이력 보존).
- **WAITING_EVIDENCE 타임아웃**: 증빙 요청 후 응답이 일정 기간(테넌트 정책값) 내 없으면 자동으로 ESCALATED로 전이한다(무한 대기 방지, fail-secure).
- **다건 동시처리**: 한 리뷰어에게 배정된 다수의 큐 항목은 일괄(batch) Approve가 가능하나, 일괄 처리 시에도 항목별 개별 Decision 레코드(§10)가 생성되어야 한다(일괄 처리가 기록 생략의 근거가 되지 않음).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 상태전이 컬럼 설계 참고(형태만) | `Alerting.php:571`~`:723`(action_request)·`Catalog.php:2383`(approveQueue) | 참고 패턴(형태만, 코드/테이블 공유 금지) — KEEP_SEPARATE 유지 |
| 리뷰어 배정 연동 | §6 `role_certification_reviewer_role`(본 SPEC 신규) | 신규 연동 |
| 트리거 연동 | §8 `role_certification_assignment_trigger`(본 SPEC 신규) | 신규 연동 |
| 결정 기록 연동 | §10 `role_certification_decision` + `SecurityAudit.php:12`(참조) | 신규 연동 + 참조전용 |
| 큐 상태머신 자체 | 없음 | 신규 |

## 5. 무후퇴 · Extend

- `Alerting.php`의 action_request, `Catalog.php`의 catalog_writeback, `AgencyPortal.php`의 agency_client_link는 원 도메인(마케팅 자동집행/상품 반영/대행사 연결)에서 무수정 보존한다. Review Queue 신설이 이 세 승인 큐를 흡수·대체·개명하지 않는다.
- 289차 후속 EPIC 06-A 13회차에서 확정한 "확정양호=재감사금지" 원칙에 따라, 이 3종 근접물의 상태전이 자체는 별도 도메인 개선 과제(마케팅/카탈로그/대행사 거버넌스)로 남기고 본 Part 3-8 범위에서 재작업하지 않는다.
- P1~P5 무후퇴 유지. §6·§7·§8이 CERTIFIED 되기 전까지 Review Queue는 설계만 유효하다(리뷰어·트리거 없이는 큐에 채울 항목 자체가 없음).

## 6. 완료 게이트

- [ ] §6 Reviewer Governance, §8 Review Assignment 선행 CERTIFIED (Queue는 이 둘의 산출물을 소비)
- [ ] `role_certification_review_queue` 스키마 + 상태전이 계약(ADR D-3) 리뷰 승인
- [ ] SLA 타이머와 ESCALATED 진입 규칙 확정
- [ ] APPROVED/REVOKED→CLOSED 전이가 §10 Decision 실행 완료를 전제함을 재검증
- [ ] WAITING_EVIDENCE 타임아웃값 및 자동 ESCALATED 전이 규칙 확정
- [ ] 일괄 처리 시 개별 Decision 레코드 생성 원칙 재검증
- [ ] KEEP_SEPARATE 3종(action_request/catalog_writeback/agency_client_link) 재검증 — 재플래그·흡수 금지
- [ ] 코드 변경 0 유지 확인
- [ ] 사용자 명시 승인 없이 구현 착수 금지

## 7. 반날조 인용 출처

- SPEC §9(Review Queue 상태머신) / ADR D-1(Extend-Wrap) · D-3(Review Queue 상태전이 계약) · D-6(KEEP_SEPARATE) · D-7(정직분리)
- Ground-Truth ① — 7상태 access review 큐 substrate 없음(grep 0)
- Ground-Truth ② — `Alerting.php:571`~`:723`(action_request, 라우트 routes.php:432~434), `Catalog.php:2383`(approveQueue, 라우트 routes.php:99), `AgencyPortal.php:20`·`:69`·`:390` KEEP_SEPARATE 확정 목록
- ABSENT 항목은 grep 0 실측이며, 3종 근접 승인큐를 "이미 구현된 Review Queue"로 흡수·과장하지 않았음을 명시 — 이 오분류 자체가 최상위 가짜녹색 리스크임을 §1에서 별도 경고
