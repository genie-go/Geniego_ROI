# DSAR — API Contract (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§67 API_CONTRACT 엔드포인트 계열(원문 전사):

1. Registry / Policy / Strategy 조회
2. Definition / Version CRUD
3. Work Item lifecycle
4. Candidate / Resolution
5. Queue
6. Assignment: `Direct` · `Auto` · `Queue` · `Reserve` · `Claim` · `Lease Renew` · `Unclaim` · `Release` · `Reassign` · `Transfer` · `Return` · `Suspend` · `Resume` · `Cancel` · `Recover` · `Failover` · `Fallback`
7. Snapshot / Simulation
8. Reconciliation

### 1.1 공통 관심사 (Cross-cutting — §67 원문 전사)

1. `Tenant Context`
2. `Authorization`
3. `Idempotency`
4. `Optimistic Lock`
5. `Fencing Token`
6. `Effective Date Validation`
7. `Version Validation`
8. `Authority Validation`
9. `Delegation Validation`
10. `Queue Eligibility Validation`
11. `Monetary Precision Validation`
12. `Audit`
13. `Evidence`
14. `Rate Limit`
15. `Pagination`
16. `Error Contract`

## 2. 기존 구현 대조

§GROUND_TRUTH 기준: 위 §67 API 표면(Registry/Policy/Strategy/Definition/Version/Work Item/Candidate/Resolution/Queue/Assignment lifecycle/Snapshot/Simulation/Reconciliation)은 **ABSENT** — 대응 라우트가 `routes.php` 에 부재.

인접 실존 API 표면(계약 상이):
- `catalog_writeback_job` 승인/claim — `Catalog.php` 내 `approvalCreate`(`Catalog.php:2301-2319`)·claim CAS(`Catalog.php:1721-1731`). 도메인 특화 승인큐 API 로, 범용 Assignment lifecycle(Claim/Lease Renew/Reassign/Transfer/Failover) 표면 미제공.
- `agency_client_link` 접근권 승인(`AgencyPortal.php:80,365-384,414-427`) — `/api/agency/*` 접두 도메인 API(KEEP_SEPARATE).
- `admin_growth_approval`(`AdminGrowth.php:142,1289-1298,1313`) — 1인 admin 승인 API(KEEP_SEPARATE).

공통 관심사 현황: Tenant Context·Authorization·Rate Limit·Pagination·Optimistic Lock 은 플랫폼 전역에 부분 존재하나, **Fencing Token·Authority Validation·Delegation Validation·Queue Eligibility·Monetary Precision·Evidence** 는 선행 4축·Lease/Lock/Evidence 엔티티 부재로 Assignment API 에 결합 불가.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: **BLOCKED_PREREQUISITE** — Authority/Delegation Validation 공통관심사는 축2·(위임 foundation) 부재, Queue Eligibility 는 Queue 엔티티 부재, Fencing Token 은 Lock(§44) 부재에 막힘.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규 라우트를 최신 버전 접두 아래 등록(`routes.php` 배선 필수 — 미배선은 실백엔드 아님). `/api/...` alias 변형도 index.php bypass/라우팅에 동반 반영.
- Mandatory Control: 16개 공통 관심사를 미들웨어/핸들러 진입 게이트로 전 엔드포인트에 일괄 강제. 특히 Fencing Token·Optimistic Lock·Idempotency 는 Claim/Reassign/Transfer 쓰기 경로 필수. Error 는 §61 Error Contract 로 통일.
- 무후퇴: `catalog_writeback_job`·`agency`·`admin_growth_approval` 의 기존 API 는 유지·병행. 범용 Assignment API 는 이들을 치환하지 않고 상위 오케스트레이션으로 얹는다.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
