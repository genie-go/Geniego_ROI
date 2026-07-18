# DSAR — Approval Assignment Policy (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§8 POLICY 필수 필드 (원문 전사):

1. approval_assignment_policy_id
2. tenant_id
3. policy_code
4. policy_name
5. assignment mode
6. candidate source policy
7. direct routing policy
8. queue routing policy
9. claim policy
10. lease policy
11. lock policy
12. capacity policy
13. workload policy
14. availability policy
15. delegation policy
16. authority revalidation policy
17. reassignment policy
18. transfer policy
19. fallback policy
20. failure policy
21. timeout policy
22. recovery policy
23. conflict policy
24. snapshot policy
25. audit policy
26. owner
27. active_version
28. valid_from
29. valid_to
30. status
31. evidence

Assignment Mode (enum): DIRECT · QUEUE · HYBRID · POOL · GROUP · AUTO · MANUAL · CLAIM_BASED · RESERVATION_BASED · CUSTOM.

## 2. 기존 구현 대조

- **Assignment Policy 추상 부재.** "이 승인 Work Item 을 어떤 mode(DIRECT/QUEUE/CLAIM_BASED)로 누구에게 배정할지"를 선언·버전관리하는 정책 객체는 없다. 배정은 정책이 아니라 코드에 하드코딩된 role 결정이다: catalog 승인 큐는 테넌트 내 임의 requirePro 자(`Catalog.php:2385`, `Catalog.php:2383-2407`)에게 열려 있고, admin growth 승인은 admin 1인 결정(`AdminGrowth.php:1313`)이다.
- **claim policy / lease policy / lock policy**: 정책으로 선언되어 있지 않으나, 실 CAS claim 관용구가 job 처리용으로 존재 — `catalog_writeback_job` 조건부 UPDATE claim(`Catalog.php:1721-1731`) + 600s 회수(`Catalog.php:1699-1702`), `omni_outbox` claim_id/claimed_at + FOR UPDATE SKIP LOCKED(`Omnichannel.php:95-99`, `Omnichannel.php:405`, `Omnichannel.php:425-448`). 이는 **발송/job 처리용 lease** 이지 "승인 배정 정책"이 아니며, fencing token 이 없다.
- **capacity policy / workload policy**: 읽기전용 리포트만 존재(`PM/Enterprise.php:371-400`) — 정책으로 배정에 환류되지 않는다.
- **candidate source policy / authority revalidation policy / delegation policy**: 전무. 선행 축1(chain)·축2(authority)·delegation foundation 부재로 candidate source 자체를 가리킬 SoT 가 없다.

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE)
- 선행 의존: 축2 Authority Matrix(ABSENT)·delegation foundation 부재로 authority revalidation policy·delegation policy 를 정의할 수 없음. 축1 Approval Chain(ABSENT)로 candidate source policy 가 참조할 참여자 집합 없음. claim/lease/lock policy 는 인접 CAS 관용구가 있으나 승인 도메인용 정책으로 승격된 바 없음(PARTIAL 소재만).
- cover: **0** (정책 객체 부재 · 배정은 코드 하드코딩 role 결정 · CAS claim 은 job 용)

## 4. 확장/구현 방향 (설계)

- **순신규 정책 엔티티**. claim/lease/lock policy 는 검증된 관용구(`omni_outbox` CANONICAL claim/lease 패턴 `Omnichannel.php:425-448` + catalog CAS `Catalog.php:1721-1731`)를 정책화·재사용하되, **fencing token 을 반드시 추가**(현행 claim_id 동등성만 있고 monotonic fence 없음 → stale process overwrite 위험).
- **Mandatory Control**: assignment mode 가 CLAIM_BASED/QUEUE 일 때 lease policy·lock policy 필수(§43 Lease 없는 Claim 금지·§44 Fencing Token 필수). authority revalidation policy 는 delegation 적용 시에도 decision-time 재검증 유지(§32).
- **capacity/workload policy**: `PM/Enterprise.php:371-400` 신호를 소비(재구현 금지)하되, 읽기전용을 배정 게이트(Hard capacity 초과 차단·§34)로 승격.
- **무후퇴**: 정책 도입이 기존 catalog/admin_growth 승인 동작을 회귀시키면 안 됨(§70).
- **선결**: 실 정책 = 선행 4축 신설 후 별도 승인세션. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
