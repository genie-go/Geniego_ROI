# DSAR — Legal Entity Authority Binding (§20)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §20(1119-1147) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · 포맷 exemplar: [DSAR_APPROVAL_AUTHORITY_REGISTRY.md](DSAR_APPROVAL_AUTHORITY_REGISTRY.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_LEGAL_ENTITY_BINDING` 엔티티 | grep **0** — Authority↔Legal Entity 바인딩 개념 부재 | `NOT_APPLICABLE`(부재→신설) |
| **Legal Entity 엔티티 자체** | 🔴 `biz_no`·`corp_reg`·`tax_id` grep **0**(backend/src 전수·본 회차 실측) — 사업자/법인/세무 식별 엔티티 **전면 부재**(ⓑ §1 line 34 `legal entity support ABSENT` CONFIRM) | `ABSENT`(저장계층부터 부재) |
| 인접 "entity" 선례 | tenant(`api_key.tenant_id` VARCHAR·FK 0)·`app_user`(owner/member) — **테넌트/유저이지 Legal Entity 아님** | `KEEP_SEPARATE_WITH_REASON` |
| intercompany/settlement/payout 축 | 정산 파이프라인은 실재하나 **법인 간(intercompany) 관계·법인별 책임유형 표현 0**(ⓑ §4) | `ABSENT` |

★**Legal Entity 엔티티가 통째로 부재하므로 이 바인딩의 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. `valid_from`/`status`/`evidence` 3개 축은 승인/권한 도메인 밖의 **인접 재사용 자산**(fee dating·상태전이·SecurityAudit)이 존재해 `LEGACY_ADAPTER`로 분류하되 — **Legal Entity 스코프로는 어느 것도 바인딩되어 있지 않다.**

## 1. 원문 전사 + 판정 — **원문 18종**(필수 필드 18)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | legal_entity_authority_binding_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 2 | authority_matrix_entry_id | Authority Matrix Entry(§5) 자체 부재 → FK 대상 없음 | `NOT_APPLICABLE` |
| 3 | legal_entity_id | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0) → 참조 PK 원천 부재 | `ABSENT` |
| 4 | authority responsibility type | 법인별 승인책임 유형 분류축 0 — Authority Type(§7)조차 부재 | `ABSENT` |
| 5 | operating entity 여부 | 운영법인 분류 플래그 0 | `ABSENT` |
| 6 | funding entity 여부 | 자금법인 분류 플래그 0 | `ABSENT` |
| 7 | accounting entity 여부 | 회계법인 분류 플래그 0 | `ABSENT` |
| 8 | settlement entity 여부 | 🔴 정산 파이프라인은 실재하나 **정산법인 지정 플래그 0**(정산≠법인책임 지정) | `ABSENT` |
| 9 | payout entity 여부 | 지급법인 분류 플래그 0 | `ABSENT` |
| 10 | contracting entity 여부 | 계약법인 분류 플래그 0 — Contract Authority(§32 계열)조차 0 | `ABSENT` |
| 11 | tax entity 여부 | 🔴 세무법인 플래그 0 · `tax_id` grep 0 (세율 `kr_fee_rule`는 채널 수수료·법인 세무주체 아님) | `ABSENT` |
| 12 | intercompany allowed 여부 | 법인 간 승인 허용 여부 0 — 복수 Legal Entity 자체가 없어 무발동 | `ABSENT` |
| 13 | allowed target legal entities | 허용 대상 법인 화이트리스트 0 | `ABSENT` |
| 14 | prohibited target legal entities | 금지 대상 법인 블랙리스트 0 — explicit-deny 표현 자체 부재(ⓑ §6) | `ABSENT` |
| 15 | valid_from | 인접 = `kr_fee_rule.effective_from`(`Db.php:898`·open-interval valid-from dating·ⓑ §5 FLIP) — **수수료 도메인이며 Legal Entity 엔티티엔 없음** | `LEGACY_ADAPTER` |
| 16 | valid_to | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` invalid_token 제외·본 회차 실측) → 폐구간 신규 | `ABSENT` |
| 17 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·Legal Entity 바인딩엔 상태 개념 자체 없음) | `LEGACY_ADAPTER` |
| 18 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·preimage ts·prev 교차검증·ⓑ §5) · 🔴 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) — 도메인-무관 재사용 인프라이나 감사할 Legal Entity 이벤트 자체가 없음 | `LEGACY_ADAPTER` |

**실측 개수: 18 / 18 전사**(측정기 `--sec=20` = 18). 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 2 · `ABSENT` 13 · `LEGACY_ADAPTER` 3 · `KEEP_SEPARATE_WITH_REASON` 0.

> 🔴 **커버 0.** Legal Entity 엔티티가 통째로 부재하므로 어떤 필드도 `VALIDATED_LEGACY`가 아니다. 18필드 중 **13필드가 `ABSENT`**(Legal-Entity-의미 필드 전량) — 이 바인딩은 시리즈 3개(§20/§21/§22) 중 **부재 깊이가 가장 깊다**(§21 지리·§22 리소스는 인접 축이라도 존재하나, 법인축은 저장계층부터 0). `LEGACY_ADAPTER` 3건(valid_from=`kr_fee_rule`·status=상태전이·evidence=`SecurityAudit`)은 **확장 대상 인접 자산**이지 Legal Entity 커버가 아니다.

## 2. 규칙

- 🔴 **원문 §20 마지막 문장 "다른 Legal Entity에서의 Authority를 자동 인정하지 마라" = §65 "Wrong Legal Entity Authority" gap 명기.** 현행은 Legal Entity 개념 자체가 없어 이 gap이 "위반"이 아니라 **판정 축의 미구현**이다 — 어떤 승인자든(analyst+/유료/admin) 법인 경계 무관하게 통과한다(ⓑ §8). Legal Entity Binding 신설 시 **법인 경계 fail-closed**(미지정 법인 = 자동 인정 금지)를 선결 규칙으로 둔다.
- 🔴 **Legal Entity 엔티티를 tenant/app_user로 대체하지 마라**(KEEP_SEPARATE_WITH_REASON) — `tenant_id`는 격리 축(FK 0 느슨한 VARCHAR·`Db.php:944`)이지 법인 실체가 아니다. 사업자/법인/세무 식별자(`biz_no`/`corp_reg`/`tax_id`)를 갖는 **1급 Legal Entity 마스터**를 신설하고, Authority Binding은 그 PK를 참조하라.
- 🔴 **`tax entity 여부`를 `kr_fee_rule`(채널 수수료)로 오매핑 금지** — 수수료 dating과 법인 세무주체는 도메인이 다르다. `valid_from` 인접(effective_from) 재사용은 **질의계층 패턴 참조에 한정**하고, 세무법인 지정은 별도 축으로 신설(중복 엔진 금지).
- 🔴 **`evidence`를 `menu_audit_log.hash_chain`으로 인용 금지** — verify() 0·preimage ts 소실로 검증 불가능한 장식이다. 정본은 `SecurityAudit::verify()` 확장.
