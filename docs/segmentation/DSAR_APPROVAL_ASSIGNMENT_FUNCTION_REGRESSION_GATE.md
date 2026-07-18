# DSAR — Function Regression Gate (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§70 FUNCTION_REGRESSION_GATE (Regression 무회귀 대상 — 원문 전사):

1. 기존 Approval Chain 무회귀
2. Authority 무회귀
3. Delegation 무회귀
4. Workflow 무회귀
5. Rebate 무회귀
6. Claim 무회귀
7. Settlement 무회귀
8. Payment 무회귀
9. Payout 무회귀
10. ERP 무회귀
11. Notification 무회귀
12. Audit 무회귀

### 1.1 ★실존 기능 무후퇴 목록 (§70 원문 강조)

1. `catalog_writeback_job` 승인큐 무후퇴
2. `omni_outbox` 발송 무후퇴
3. `pm_task_assignees` 무후퇴
4. `admin_growth_approval` 무후퇴
5. `agency` 접근승인 무후퇴

## 2. 기존 구현 대조 — 실존 기능별 무회귀 계약

§GROUND_TRUTH 기준. Approval Assignment Engine 신설/통합 시 아래 실존 기능은 **동작·계약·상태전이가 후퇴하면 안 된다**(무후퇴 게이트).

- **`catalog_writeback_job` 승인큐** `Catalog.php:75-84` — 무회귀 대상: 상태 전이 `pending_approval→queued→processing→done/failed`(`Catalog.php:396,2383-2407`)·CAS claim(`Catalog.php:1721-1731`)·600s 회수(`Catalog.php:1699-1702`)·approvalCreate SSOT(`Catalog.php:2301-2319`). 통합 매핑 후에도 기존 승인/큐잉/처리 경로가 그대로 동작해야 함.
- **`omni_outbox` 발송** `Omnichannel.php:95-99,405,425-448` — 무회귀 대상: claim_id/claimed_at·`FOR UPDATE SKIP LOCKED`·CAS fallback 발송 파이프라인. claim/lease 패턴을 Assignment 가 참조하더라도 발송 outbox 소비 동작은 불변.
- **`pm_task_assignees`** `PM/Assignees.php:14,32,17-72` — 무회귀 대상: M:N 수동 배정·role(owner/contributor/reviewer/observer). 읽기전용 capacity/workload(`PM/Enterprise.php:371-400`) 표시. 정본 Work Item 매핑 후에도 기존 수동 배정 UX·데이터 유지.
- **`admin_growth_approval`** `AdminGrowth.php:142,1289-1298,1313` — 무회귀 대상: 1인 admin 승인 게이트(KEEP_SEPARATE). Assignment Engine 이 이 경로를 흡수·차단하지 않음.
- **`agency` 접근승인** `AgencyPortal.php:80,365-384,414-427` — 무회귀 대상: 매 요청 approved 재검증 fail-closed 접근권 승인(KEEP_SEPARATE). `/api/agency/*` 접두 유지.

부가 무회귀(§70 원문 도메인): Approval Chain(flat 승인테이블 `AdminGrowth.php:142`·`Catalog.php:86`·`Mapping.php:273`)·Authority(`TeamPermissions.php:627-647` ACL)·Delegation·Workflow·Rebate/Claim/Settlement/Payment/Payout·ERP·Notification·Audit(`SecurityAudit.php:56-68` verify()) 무회귀.

## 3. 판정

- Verdict: **VALIDATED_LEGACY** (무후퇴 게이트 자체는 실존 기능 목록을 근거로 성립)
- 선행 의존: 게이트 대상은 실존하나, Assignment Engine 신설이 축1~축4 부재로 **BLOCKED_PREREQUISITE**. 게이트는 "신설 시 준수할 계약"으로 선행 확정.
- cover: 실존 기능 5종 + 12 도메인(§70) 무회귀 명세 확정 / Assignment Engine 신설 cover **0**.

## 4. 확장/구현 방향 (설계)

- 무후퇴 검증 방식: 신규 Assignment Engine 배선 전후로 위 5종 실존 기능의 상태전이·API 응답·데이터 무결성을 회귀 스냅샷 비교. Golden Rule(Replace 아니라 Extend) — 기존 테이블/경로 삭제 금지, 상위 오케스트레이션으로만 얹음.
- Mandatory Control: 통합은 shadow-write(병행 기록) → dual-read 검증 → 점진 전환 순. 어느 단계에서도 `catalog_writeback_job` 승인큐·`omni_outbox` 발송·`pm_task_assignees`·`admin_growth_approval`·`agency` 승인 경로가 실패하면 게이트 fail-closed(전환 중단).
- Audit 무회귀: `SecurityAudit.php:56-68` verify() 검증 체인은 확장만 하고 후퇴 금지. 배포는 별도 승인 세션(Golden + verify + 배포승인)에서만.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
