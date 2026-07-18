# DSAR — Sequential Approval Version (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§10 VERSION 필수 필드 (원문 전사):

1. version_id
2. definition_id
3. version_number
4. previous_version_id
5. version_type
6. change_summary
7. workflow snapshot
8. chain snapshot
9. stage snapshot
10. level snapshot
11. step snapshot
12. transition snapshot
13. guard snapshot
14. dependency snapshot
15. policy snapshot
16. migration policy
17. effective_from
18. effective_to
19. created_by
20. reviewed_by
21. approved_by
22. activated_at
23. immutable_hash
24. status
25. evidence

Version 상태 (enum·12종): DRAFT · VALIDATION_PENDING · VALIDATION_FAILED · APPROVAL_PENDING · APPROVED · SCHEDULED · ACTIVE · SUSPENDED · SUPERSEDED · RETIRED · ARCHIVED · BLOCKED.

(version_type enum 전사·판정 = [[DSAR_APPROVAL_SEQUENTIAL_VERSION_TYPE]].)

## 2. 기존 구현 대조

- **Sequential Version 엔티티 부재.** 순차 승인 정의를 불변 스냅샷으로 버저닝하고 DRAFT→…→ACTIVE→SUPERSEDED 로 라이프사이클을 다스리는 version 엔티티는 backend 전무. 이는 §59 Critical Gap 최상단("Sequential Version 없음")에 해당한다.
- **snapshot 필드군(7–15)**: 스냅샷 대상(workflow/chain/stage/level/step/transition/guard/dependency/policy)이 전부 ABSENT이므로 스냅샷할 원본이 없다. 실존하는 유일한 "스냅샷 라벨"은 `menu_defaults.version`인데 이는 CAS-on-version이 아닌 라벨일 뿐이며(낙관적 version CAS ABSENT) 승인 도메인과 무관하다.
- **immutable_hash(23)**: tamper-evident 한 불변 해시 정본은 `SecurityAudit.php:56-68` verify() 하나뿐. 장식용(검증 함수 없는) 해시체인을 immutable_hash로 인용하면 안 된다.
- **created_by/reviewed_by/approved_by(19–21)**: 권위 Identity/Actor Snapshot 부재(축5 PARTIAL). `parent_user_id=owner` 계정트리(`UserAuth.php:156-157,296`)만 있어 reviewer/approver 신원의 시점 스냅샷을 채울 SoT가 없다.
- **status(24)**: 실존 승인 상태(`admin_growth_approval.status VARCHAR(20)` `AdminGrowth.php:146`·`catalog_writeback_job.status VARCHAR(30)` `Catalog.php:80`)는 자유문자열 런타임 상태이지 version 라이프사이클(DRAFT/APPROVED/SUPERSEDED …)과 다른 축이다.

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE)
- 선행 의존: definition([[DSAR_APPROVAL_SEQUENTIAL_DEFINITION]] BLOCKED) 및 스냅샷 대상(workflow/chain/stage/level/step/transition/guard/dependency) 부재에 종속. 낙관적 version CAS·불변 해시(장식 아닌 verify 기반) 축이 비어 있어 immutable_hash·version_number 정합을 보장할 primitive가 부재.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티**. immutable_hash 는 `SecurityAudit.php:56-68` verify() 를 확장한 실검증 해시로 구현(장식 체인 금지). §52 Snapshot 원칙 준수: 직접 수정 금지·과거 대체 금지·Replay 기준.
- **Mandatory Control**: 모든 version은 DRAFT로 시작→VALIDATION→APPROVAL→ACTIVE, 이후 변경은 새 version(§24 재정렬=새 Version만). ACTIVE Version·Snapshot 직접 수정은 §59 Critical Gap로 금지. SUPERSEDED/RETIRED는 과거 재작성이 아니라 승계로 기록.
- **무후퇴**: version 도입이 기존 flat 승인 상태(`AdminGrowth.php:146`·`Catalog.php:80`)를 회귀시키지 않게 — 런타임 상태와 version 라이프사이클을 별 축으로 분리 유지.
- **선결**: definition·snapshot 대상 신설 후 별도 승인세션. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
