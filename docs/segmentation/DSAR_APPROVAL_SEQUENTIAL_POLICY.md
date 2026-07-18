# DSAR — Sequential Approval Policy (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§8 POLICY 필수 필드 (원문 전사):

1. policy_id
2. tenant_id
3. code
4. name
5. assignment required
6. claim required
7. previous step completion required
8. all mandatory levels required
9. optional level policy
10. skip policy
11. auto-skip policy
12. auto-activation policy
13. pause policy
14. resume policy
15. suspension policy
16. retry policy
17. recovery policy
18. orphan policy
19. deadlock policy
20. idempotency policy
21. lock policy
22. lease policy
23. fencing policy
24. cursor policy
25. snapshot policy
26. reconciliation policy
27. failure policy
28. owner
29. active_version
30. valid_from
31. valid_to
32. status
33. evidence

## 2. 기존 구현 대조

- **Sequential Approval Policy 개념 부재.** 순차 승인 실행을 지배하는 선언적 정책 엔티티(assignment/claim/previous-completion/mandatory-level/skip/pause/resume/retry/recovery/lock/lease/fencing/cursor/snapshot/reconciliation 정책의 집합)는 backend 전무. 실존하는 것은 정책이 아니라 개별 핸들러에 산재한 인라인 조건부 UPDATE의 WHERE 절(암묵 precondition)뿐이다: `catalog_writeback_job` 선점 `WHERE id=? AND status IN(...)`(`Catalog.php:1726`)·복구 `WHERE status='processing' AND updated_at<now-600s`(`Catalog.php:1700`).
- **previous step completion required(필드 7)·all mandatory levels required(필드 8)**: 대응 없음. 다단 Stage/Level/Step 자체가 ABSENT(`current_step/stage/level` 0)이므로 "이전 스텝 완료 요구"·"필수 레벨 전원 완료 요구"를 평가할 계층이 존재하지 않는다.
- **assignment required(5)·claim required(6)**: Assignment 도메인(축4) ABSENT. claim/lease 관용구는 잡 처리용으로만 실재(`Omnichannel.php:97,410,418`·`Catalog.php:1726`)하며 승인 배정 정책이 아니다.
- **retry/recovery/pause/resume 정책(13–17)**: 정책 선언이 아닌 코드 관용구 수준. stale TTL 회수(`Catalog.php:1700` 600s·`Omnichannel.php:395-399` 900s·`JourneyBuilder.php:396` 1800s)는 시간기반 회수일 뿐 정책 레지스트리가 아니다.
- **idempotency/lock/lease/fencing/cursor policy(20–24)**: fencing·범용 idempotency·낙관적 version CAS·승인 cursor 는 전부 ABSENT. lock/lease는 PARTIAL(시간만료 회수, 리스토큰·펜싱 없음). 정책으로 승격할 실 primitive가 fencing 축에서 비어 있다(★실위험).
- **evidence(33)**: `SecurityAudit.php:56-68` verify() 만이 검증 가능한 정본.

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE)
- 선행 의존: 축1 Approval Chain·축2 Authority·축3 Delegation·축4 Assignment 부재에 막힘. assignment/claim/previous-completion/mandatory-level 정책은 다단 Chain·Assignment SoT 없이는 정의될 대상이 없다. fencing/cursor policy는 primitive(Fencing Token·승인 Cursor) 부재로 BLOCKED.
- cover: **0** (정책 엔티티 부재 · 산재한 WHERE 절 precondition은 정책 레지스트리 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티**. 산재한 인라인 WHERE-절 precondition(`Catalog.php:1700,1726`·`AdminGrowth.php:1327`)을 정책으로 정형화·중앙화하되, 기존 조건 자체를 무후퇴로 보존(§71).
- **Mandatory Control (Fail Closed)**: assignment required·previous step completion required·all mandatory levels required 는 Mandatory Guard 로서 Fail Closed(§21) — 정책이 요구를 켠 상태에서 검증 불가면 진행 차단이지 통과가 아니다. auto-skip policy는 Mandatory Financial/Legal/Compliance/Security 스텝에 적용 금지(§36).
- **실위험 반영**: fencing policy·idempotency policy 는 현재 primitive 부재(Fencing Token ABSENT·범용 Idempotency ABSENT)를 메우는 것이 목적 — stale worker overwrite·중복 전환을 막는 Mandatory 축으로 설계.
- **선결**: 실 policy 는 선행 4축 신설 후 별도 승인세션. 본 문서는 부재 증명·설계 명세.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
