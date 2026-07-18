# DSAR — Approval Assignment Definition (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§9 DEFINITION 필수 필드 (원문 전사):

1. approval_assignment_definition_id
2. registry_id
3. assignment_code
4. name
5. description
6. approval domain
7. workflow reference
8. chain reference
9. stage reference
10. level reference
11. policy reference
12. strategy reference
13. queue reference
14. fallback reference
15. candidate source
16. authority policy
17. delegation policy
18. capacity policy
19. availability policy
20. owner
21. active_version
22. valid_from
23. valid_to
24. status
25. evidence

## 2. 기존 구현 대조

- **Assignment Definition 부재.** "특정 승인 도메인/워크플로/체인/스테이지/레벨에 대해 어떤 정책·전략·큐·폴백으로 배정하는가"를 명명·버전관리하는 정의 객체는 없다.
- **chain reference / stage reference / level reference**: 참조 대상인 Approval Chain 자체가 부재(선행 축1 ABSENT — `chain_*` grep 0, flat 승인테이블만 `AdminGrowth.php:142`·`Catalog.php:86`·`Mapping.php:273`). 따라서 definition 이 가리킬 chain/stage/level SoT 가 존재하지 않는다.
- **strategy reference / queue reference / fallback reference**: strategy(round-robin/least-loaded/weighted) 개념 전무 · queue routing/fallback(approver-level) 전무. 실존 큐(`catalog_writeback_job` `Catalog.php:75-84`)는 definition 없이 코드로 직접 소비된다.
- **candidate source / authority policy / delegation policy**: 선행 축2(authority)·delegation foundation 부재로 정의 근거 없음.
- **evidence / owner**: evidence 정본=`SecurityAudit.php:56-68` · owner 판별 인접=`parent_user_id`(`UserAuth.php:156-157`, `UserAuth.php:1225-1227`) 붕괴 모델뿐.

## 3. 판정

- Verdict: **ABSENT** (BLOCKED_PREREQUISITE)
- 선행 의존: 축1 Approval Chain(ABSENT)에 직접 막힘 — chain/stage/level reference 가 참조할 대상이 없다. 축2 Authority(ABSENT)로 authority policy·candidate source 불가. registry_id FK 대상인 Assignment Registry 도 부재(연쇄 BLOCKED).
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 엔티티**. registry_id → policy/strategy/queue/fallback reference 로 이어지는 계층은 선행 4축(chain·authority·org·SoD) SoT 가 먼저 존재해야 실체를 가진다.
- **workflow reference**: 인접 워크플로 자산(catalog 승인 job lifecycle `Catalog.php:396`)을 definition 아래로 참조 편입하되 재구현 금지.
- **Mandatory Control**: definition 은 참조 무결성 필수 — chain/stage/level 이 없는 상태에서 definition 을 활성화하면 §58 "Work Item/Policy/Queue Version 없음" gap. 부재 축을 가리키는 definition 은 status 를 활성으로 두지 말 것.
- **선결**: 선행 4축 신설 후 별도 승인세션. 본 문서는 설계 명세.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
