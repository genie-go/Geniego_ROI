# DSAR — Approval Assignment Version (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§10 VERSION 필수 필드 (원문 전사):

1. version_id
2. definition_id
3. version_number
4. previous_version_id
5. version_type
6. change_summary
7. mode policy snapshot
8. candidate policy snapshot
9. queue policy snapshot
10. strategy policy snapshot
11. authority policy snapshot
12. delegation policy snapshot
13. capacity policy snapshot
14. load policy snapshot
15. availability policy snapshot
16. claim policy snapshot
17. lease policy snapshot
18. lock policy snapshot
19. fallback policy snapshot
20. effective_from
21. effective_to
22. created_by
23. reviewed_by
24. approved_by
25. activated_at
26. immutable_hash
27. status
28. evidence

(version_type enum 은 별도 문서 [[DSAR_APPROVAL_ASSIGNMENT_VERSION_TYPE]] 참조.)

## 2. 기존 구현 대조

- **불변 버전체인(previous_version_id 링크 + immutable_hash) 선례 부재.** 승인 정책/정의를 버전으로 스냅샷하고 previous→next 로 잇는 immutable version chain 은 repo 전반에 없다(선행 축들에서도 version 컬럼은 하드코딩 태그 수준).
- **정책 스냅샷(mode/candidate/queue/strategy/authority/delegation/capacity/load/availability/claim/lease/lock/fallback)**: 스냅샷 대상 정책 자체가 부재([[DSAR_APPROVAL_ASSIGNMENT_POLICY]] ABSENT)하므로 version 이 담을 내용이 없다.
- **immutable_hash / evidence**: 검증 가능한 해시 정본=`SecurityAudit.php:56-68` verify() 뿐. version immutable_hash 는 이것을 확장해야 하며, tamper-evident 하지 않은 `menu_audit_log.hash_chain` 류를 인용 금지.
- **created_by / reviewed_by / approved_by**: 인접 승인 결정자 예시=admin 1인(`AdminGrowth.php:1313`)·catalog 임의 requirePro(`Catalog.php:2385`) — maker-checker 정족수 선례는 `Mapping.php:267-271`에 도메인 국한으로만 존재.

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE)
- 선행 의존: definition_id FK 대상인 Assignment Definition 부재(연쇄) · 스냅샷할 정책들(§8) 부재. 축2 Authority·delegation foundation 부재로 authority/delegation policy snapshot 불가.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티**. version 은 immutable append-only — 과거 재작성 금지(§58 "과거 재작성"·"History 삭제" gap). previous_version_id 로 체인, immutable_hash 로 봉인.
- **immutable_hash**: `SecurityAudit.php:56-68` verify() 패턴 확장(재구현 금지). preimage(effective time·정책 스냅샷)를 보존해 재검증 가능하게.
- **Mandatory Control**: activated_at 이후 effective 구간의 Resolution 은 그 시점 version snapshot 으로 결정론적 재현 가능해야 함(§21 Determinism·§54 Snapshot). version 없는 정책 변경 금지.
- **선결**: 정책·정의 신설 후. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
