# DSAR — Approval Queue Routing Rule (§26) (06-A-02)

> EPIC 06-A-02 Approval Assignment Engine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §26 QUEUE_ROUTING_RULE 필수 필드 (원문 전사)
1. rule_id
2. queue id
3. queue version id
4. rule priority
5. approval domain
6. workflow
7. chain
8. stage
9. level
10. resource type / id
11. organization id
12. legal entity id
13. region
14. country
15. action
16. amount lower bound
17. amount upper bound
18. currency
19. risk reference
20. customer segment
21. partner
22. program
23. project
24. include 여부
25. fallback queue
26. valid_from / valid_to
27. status
28. evidence

## 2. 기존 구현 대조

§GROUND_TRUTH 근거로 **큐 라우팅이 전무**하다(Queue Routing=ABSENT).

- 승인 요청을 조건(도메인/자원/조직/금액/통화/리스크/세그먼트)에 따라 특정 큐로 배분하는 규칙이 없다. job 소비는 **FIFO drain** 이다: `ORDER BY id ASC`(`Catalog.php:1716`)로 단순 배수하며 owner/조건 라우팅이 아니다.
- 어떤 승인이 어느 큐로 갈지는 코드 경로가 고정(catalog 고위험 op→`catalog_writeback_job` `Catalog.php:858-865,2289` · admin growth→`admin_growth_approval` `AdminGrowth.php:1289-1298`)이며, rule priority·amount band·currency·organization·legal entity·region·country·resource·action 조건으로 동적 라우팅하지 않는다.
- §26 조건 필드 대부분은 선행 축에 막힌다: chain/stage/level(선행 축1 Approval Chain ABSENT) · organization/legal entity/region/country(선행 축3 Identity/Org ABSENT) · amount lower/upper bound(선행 축2 Authority Matrix `amount_band` grep 0).
- fallback queue 지정도 없다. 유일한 fallback 유사물은 채널 waterfall(`Omnichannel.php:110`)·AI fallbackContent(`AdminGrowth.php:1108`) 로 승인 큐 라우팅과 무관.

## 3. 판정

- Verdict: **ABSENT** (FIFO drain · 라우팅 없음)
- 선행 의존: Routing Rule 은 Queue Version(§23·ABSENT)에 바인딩되며, chain/stage/level(선행 축1·ABSENT)·organization/legal entity/region(선행 축3·ABSENT)·amount band/currency(선행 축2·ABSENT) 조건축 전부 부재로 `BLOCKED_PREREQUISITE`. 현행은 코드 고정 경로 + FIFO 배수(`Catalog.php:1716`).
- cover: 0 (rule priority·조건 매칭·동적 큐 배분·fallback queue 어느 것도 없음)

## 4. 확장/구현 방향 (설계)

- Routing Rule 은 **순신규**다. 현행 코드 고정 경로(catalog 고위험→job `Catalog.php:858-865` · admin growth→approval `AdminGrowth.php:1289-1298`)를 rule priority=최저·include=true 의 기본 규칙으로 흡수해 무후퇴 유지(§70 Regression).
- FIFO drain(`Catalog.php:1716`)은 라우팅 이후 큐 내부 소비 순서일 뿐 라우팅이 아님을 명확히 분리 — drain 순서를 라우팅으로 오표기 금지.
- Mandatory Control: 라우팅 규칙은 반드시 queue version 참조(불변)·rule priority 결정성(§21 Determinism)·fallback queue 지정으로 §51 Fallback 순서(Delegate→Substitute→…→Manual Review→Dead-letter→Block)에 연결. 라우팅 loop(§52 QUEUE_ROUTING_LOOP)·fallback loop 방지 필수.
- 🔴 chain/stage/level·organization/legal entity/region·amount band 조건은 선행 축(1·2·3) 신설 전 사용 금지 — 참조 SoT 없이 조건을 문자열/상수로 채우면 §65 "하드코딩 Assignee"·§66 "Cross-Tenant Membership" gap 유발.

관련: [[DSAR_APPROVAL_ASSIGNMENT_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_APPROVAL_ASSIGNMENT_ENGINE_GOVERNANCE]].
