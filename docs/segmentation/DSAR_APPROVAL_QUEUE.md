# DSAR — Approval Queue (§22) (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §22 QUEUE 필수 필드 (원문 전사)
1. approval_queue_id
2. tenant_id
3. queue_code
4. name
5. description
6. queue type
7. approval domain
8. organization id
9. legal entity id
10. region
11. country
12. resource scope
13. action scope
14. monetary scope
15. currency scope
16. membership policy
17. claim policy
18. capacity policy
19. workload policy
20. availability policy
21. routing policy
22. fallback queue id
23. owner
24. active_version
25. valid_from / valid_to
26. status
27. evidence

(QUEUE_TYPE enum 전사는 별도 문서 [[DSAR_APPROVAL_QUEUE_TYPE]] 참조.)

## 2. 기존 구현 대조

§GROUND_TRUTH 근거로 **실 승인 큐 2종이 존재**한다(개념별 판정: Queue=PRESENT).

- **`catalog_writeback_job`** — 유일한 실 승인 큐(claim 의미론). 테이블 `Catalog.php:75-84` · 형제 티켓 `catalog_writeback_approval`(`Catalog.php:86`). 상태 `pending_approval→queued→processing→done/failed`(`Catalog.php:396,2383-2407`). 생산자 `approvalCreate` 가 SSOT job 테이블에 기록(`Catalog.php:2301-2319`). 승인자=테넌트 내 임의 requirePro(`Catalog.php:2385`). CAS claim(`Catalog.php:1721-1731`)+600s 회수(`Catalog.php:1699-1702`).
- **`admin_growth_approval`** — 실 1인 admin 승인 큐. 테이블 `AdminGrowth.php:142` · 생산자 createApproval(`AdminGrowth.php:1289-1298`) · 승인=admin 1인 결정(`AdminGrowth.php:1313`).
- **핵심 한계 — per-approver 라우팅 없음**: 두 큐 모두 "특정 승인자에게 배정"이 아니라 "진입 게이트를 통과한 임의자가 처리"다. §22 필수 필드 중 실재하는 것은 tenant_id·queue_code(암묵)·status·상태전이 정도이고, queue type/approval domain/organization/legal entity/region/country/resource·action·monetary·currency scope/membership·claim(job한정)·capacity·workload·availability·routing policy/fallback queue/active_version/valid_from·to/evidence 는 부재하거나 job 처리용에 국한된다.
- claim/capacity/workload 신호는 job 처리용이며(`Catalog.php:1721-1731` · `PM/Enterprise.php:371-400` 읽기전용), 큐 멤버십·라우팅과 연결되지 않는다.

## 3. 판정

- Verdict: **PRESENT** (VALIDATED_LEGACY + CONSOLIDATION_REQUIRED)
- 선행 의존: 큐 컨테이너 자체는 실재하나, per-approver 라우팅에 필요한 membership(§24·ABSENT)·routing rule(§26·ABSENT)·eligibility(§25·PARTIAL·RBAC만)·queue version(§23·ABSENT) 이 결여. organization/legal entity/region scope 는 선행 3축 Identity/Org(ABSENT) 에 막힘.
- cover: `catalog_writeback_job`(`Catalog.php:75-84,396,2301-2319,2383-2407,1721-1731,1699-1702`) · `admin_growth_approval`(`AdminGrowth.php:142,1289-1298,1313`). 단 라우팅/멤버십/버전/스코프 필드는 0.

## 4. 확장/구현 방향 (설계)

- **재사용(재생성 금지)**: 06-A-02 의 Canonical Queue 는 `catalog_writeback_job` 의 pending_approval→approve→execute lifecycle + CAS claim 패턴을 **확장**한다(§65 VALIDATED_LEGACY + CONSOLIDATION_REQUIRED). 새 승인 큐 테이블을 병설하지 말고 이 SSOT(`Catalog.php:2301-2319`)를 일반화한다.
- `admin_growth_approval` 은 단일 super-admin 도메인으로 **KEEP_SEPARATE**(shape 는 Canonical 스키마 공유 가능하나 통합 대상 아님·`AdminGrowth.php:142,1313`).
- Mandatory Control: Queue 는 반드시 active_version(→[[DSAR_APPROVAL_QUEUE_VERSION]])·membership(→[[DSAR_APPROVAL_QUEUE_MEMBERSHIP]])·routing rule(→[[DSAR_APPROVAL_QUEUE_ROUTING_RULE]])·eligibility profile(→[[DSAR_APPROVAL_QUEUE_ELIGIBILITY_PROFILE]]) 을 갖춰야 per-approver 라우팅이 성립. 이들이 후속 신설이므로 현재 큐는 "컨테이너 실재·라우팅 부재".
- 무후퇴: 임의 requirePro 승인(`Catalog.php:2385`)·1인 admin 승인(`AdminGrowth.php:1313`)은 통합 후에도 하위호환(SHARED 큐 + coarse eligibility)으로 보존(§70 Regression).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
