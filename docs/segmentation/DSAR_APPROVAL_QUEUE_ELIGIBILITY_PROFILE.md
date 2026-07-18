# DSAR — Approval Queue Eligibility Profile (§25) (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §25 QUEUE_ELIGIBILITY_PROFILE 필수 필드 (원문 전사)
1. profile_id
2. queue id
3. required identity state
4. required employment state
5. required role state
6. required position state
7. allowed legal entities
8. allowed organizations
9. allowed geographies
10. required authority domains
11. required authority types
12. required actions
13. allowed resource types
14. amount bands
15. currencies
16. minimum job level
17. certification requirements
18. skill requirements
19. language requirements
20. availability requirements
21. maximum workload
22. minimum remaining capacity
23. SoD policy
24. CoI policy
25. valid_from / valid_to
26. status
27. evidence

## 2. 기존 구현 대조

§GROUND_TRUTH 근거로 큐 적격은 **RBAC/plan 게이팅만 존재**한다(Queue Eligibility=PARTIAL·RBAC만).

- 실재하는 유일 적격 축은 **coarse role/plan 게이트**다: `catalog_writeback_job.approveQueue` 는 requirePro(플랜) 통과자만 승인 허용(`Catalog.php:2385`) · PM assignee 는 analyst 게이트(`PM/Assignees.php:19`) · admin growth 는 admin(`AdminGrowth.php:1313`). 이는 "큐 스코프 적격"이 아니라 진입 등급이다.
- §25 의 나머지 필드는 전부 부재하거나 인접 오용 위험:
  - required identity state — 인접 `is_active`(`Db.php:1106`) 계정 상태이나 큐 적격에 소비되지 않음.
  - required employment/position state, minimum job level, certification/skill/language — 전역 0(선행 축3 Identity/Org ABSENT · HR·직급·고용 엔티티 부재).
  - allowed legal entities/organizations/geographies — 선행 축3(ABSENT) 부재로 표현 불가.
  - required authority domains/types, amount bands — 선행 축2 Authority Matrix(ABSENT · `authority_matrix/amount_band` grep 0) 부재.
  - availability requirements — approver 가용 모델 없음(Availability ABSENT).
  - maximum workload / minimum remaining capacity — 신호는 읽기전용 리포트로만 존재(`PM/Enterprise.php:371-400`)하고 적격 판정에 미소비.
  - SoD policy / CoI policy — 선행 축4(Security/Authz PARTIAL) 에서 SoD hook·CoI foundation 부재. 유일 인접 방어는 `Mapping.php:268` 자기승인 차단(도메인 국한·범용 SoD 아님).

## 3. 판정

- Verdict: **PARTIAL** (RBAC requirePro/analyst/admin 게이트만)
- 선행 의존: identity/employment/authority/legal entity/organization/amount band/SoD/CoI 축이 전부 선행 4축(축2 Authority·축3 Identity/Org ABSENT, 축4 Security PARTIAL) 에 막혀 `BLOCKED_PREREQUISITE`. capacity/workload 는 PARTIAL(읽기전용·미환류).
- cover: coarse role/plan 게이트만 — requirePro(`Catalog.php:2385`)·analyst(`PM/Assignees.php:19`)·admin(`AdminGrowth.php:1313`). 큐 스코프 적격은 0.

## 4. 확장/구현 방향 (설계)

- Eligibility Profile 은 신설이나 **하위 필드의 인접 선례를 재구현 금지**: identity state 는 `is_active`(`Db.php:1106`) 참조 · SoD 는 `Mapping.php:268` 자기승인 차단을 **범용 SoD hook 으로 승격**(신규 차단기 난립 금지) · evidence 는 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`) 확장.
- 🔴 coarse role/plan 게이트(requirePro 등)를 "큐 적격 충족"으로 오표기 금지 — 진입 등급이지 큐 스코프 적격이 아니다. `required role state` 를 "roleRank 있음"으로 표기 금지(`roleRank` 기계 API등급 `index.php:554,568` 과 team_role 이 직교).
- 🔴 employment/position/job_level/certification/authority domain/amount band/legal entity/organization/SoD/CoI 를 "있음"으로 표기 금지(전부 선행 축 부재) — `admin_level`·`grade`·`is_active` 를 이 축으로 오용하면 §65 "Manager 자동 Authority"·"Role 이름 문자열 판정" gap 유발.
- capacity/workload 적격은 `PM/Enterprise.php:371-400` 리포트를 배정 경로로 환류해 소비(읽기전용 탈피)하되, Availability(§36)/Capacity(§34)/Workload(§35) 신호는 권한 부여가 아닌 제외/우선순위 신호로만 사용(§36 원칙).

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
