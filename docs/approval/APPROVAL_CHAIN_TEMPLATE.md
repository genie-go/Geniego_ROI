# Approval Chain Template · Template Version 전사

> EPIC 06-A Part 4-5-3-1-5-3-3-3 · 원문 §11, §12 전사
> 원문 정본: `docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_3_VERBATIM.md`
> 판정 근거: 289차 ⓑ 전수조사(105항목) 실측. 코드 변경 0.

---

## 1. 원문 전사

### §11. Approval Chain Template (원문 줄 799-844 · 분모 28)

`APPROVAL_CHAIN_TEMPLATE` — 지원 Template 예 11 + 필수 필드 17 = 28.
원문 정의: *"Template은 여러 Chain에서 재사용 가능한 구조적 기본형이다."*(줄 803)

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | Direct Manager Only | 부재 — **상급자(사람)를 반환하는 함수 0**(§3.2 확정). `parent_user_id` 판독자 12개소 이상이나 전량 1홉·목적이 tenant 해석(`UserAuth::resolveTenantId:207-215`·`Rollup:56-61`·`ChannelSync:72`) 또는 `IS NULL` owner 판별 술어(`PlanLimits:37`·`UserAuth:41`) | ABSENT |
| 2 | Direct Manager + Manager of Manager | 부재 — **다단 상향 순회 사람 축 선례 0**. DB 상향순회 유일 사례는 `AdminMenu::wouldCycle:540-555`(**menu_tree** · `$depth<100` · `$visited` 없음 · tenant_id 없음) | ABSENT |
| 3 | Management + Finance | 부재 — Finance 승인 축 0. `finance_controller` grep 0 | ABSENT |
| 4 | Management + Finance + Legal | 부재 — `legal_review` grep 0 · Legal Entity 이름·능력 0(유일 히트 `MarketingDataHub.php:181` "한국 법인 철수" = 데모 문자열) | ABSENT |
| 5 | Program Owner + Finance | 부재 — Rebate Program 엔진 grep 0 · Program Owner 축 0 | ABSENT |
| 6 | Cost Center Owner + Finance Controller | 부재 — **`cost_center`/`profit_center`/`finance_controller` grep 0**(전역 재실증 · 히트 0) | ABSENT |
| 7 | Country + Regional | 부재 — Regional/Country 승인 축 0. `country_code` 히트는 TikTok 리포트 차원(`Connectors.php:2044`,`:2071`)·IP Geo(`Geo.php:106`) | ABSENT |
| 8 | Functional + Administrative | 부재 — Functional/Administrative Manager 구분 축 0. `ORG_PRESET`(`TeamPermissions.php:706-722`)은 **PHP 상수 15줄**이며 `seedOrg:739` INSERT 에 parent·manager 컬럼 자체가 없다 | ABSENT |
| 9 | Executive Reference | 부재 — 임원 참조 축 0 | ABSENT |
| 10 | Exception Review | 부재 — **`exception_review` grep 0** | ABSENT |
| 11 | Manual Review | 부재 — **`manual_review` grep 0**. 승인 4경로 전량 수동이나 "Manual Review Template"이라는 선택 가능한 구조체가 아니라 **유일한 동작**이다 | ABSENT |
| 12 | approval_chain_template_id | 부재 — `approval_chain_template`/`template_id` **승인 도메인 히트 0**. `template_id` 히트는 전량 메시지 템플릿(`Line.php:48`,`:186` · `EmailMarketing.php:56` · `Omnichannel.php:497`) | ABSENT |
| 13 | tenant_id | 부재(본 엔티티 기준) — 테넌트 컬럼 관례는 실재하나 Template 도메인 테이블 0. **Tenant 마스터 테이블도 없음**(`api_key.tenant_id` = FK 없는 VARCHAR · `Db.php:944`) | ABSENT |
| 14 | platform template 여부 | 부재 — `platform_template` grep 0. Platform ↔ Tenant 소유 구분 축이 템플릿 도메인에 존재한 적 없다 | ABSENT |
| 15 | template_code | 부재(본 엔티티 기준) — 동명 컬럼은 **카카오 알림톡 사전승인 템플릿** 한정(`KakaoChannel.php:47` `template_code VARCHAR(100) NOT NULL` · `UNIQUE KEY uq_kakao_tpl (tenant_id, template_code)` `:50` · 중복 시 409 `:161`). 승인체인 무관 | ABSENT |
| 16 | template_name | 부재(본 엔티티 기준) — 동명 히트는 메시지 템플릿 표시 투영(`Line.php:169` · `KakaoChannel.php:226` · `WhatsApp.php:68`) | ABSENT |
| 17 | template category | 부재 — `template_category` grep 0 | ABSENT |
| 18 | supported approval domains | 부재 — **`approval_domain` grep 0**(전역 재실증) | ABSENT |
| 19 | supported resource types | 부재 — **`resource_type` grep 0**. 자원 레지스트리 유사물은 `MENU_CATALOG`(`TeamPermissions.php:55-82` 26개 · `validMenu:180` 강제)뿐이며 **메뉴 한정** — 리베이트/승인건은 자원이 아니다 | ABSENT |
| 20 | parameter schema | 부재 — **`parameter_schema` grep 0** | ABSENT |
| 21 | default stage structure | 부재 — Stage 개념 자체가 0(`approval_stage` grep 0). `stage`/`sc_stages` 히트는 물류 마일스톤 체크리스트(`SupplyChain.php:50-54`,`:193-199` · `done TINYINT`=체크박스 · `sort_order` 는 INSERT 시 배열 인덱스 `$i`) | ABSENT |
| 22 | default level structure | 부재 — Level 개념 0(`approval_level` grep 0) | ABSENT |
| 23 | default route structure | **최근접 실재** — `JourneyBuilder::createJourney:120-125` `$defaultNodes`(4노드: trigger/email/delay/condition) + `:126` `$defaultEdges`(3엣지) = **PHP 리터럴 시드 그래프**. `:135` `json_encode($b['nodes'] ?? $defaultNodes)` 로 **생성 시 1회 복사**될 뿐 — 레지스트리·버전·재적용 전무 · 엣지에 id 없음 · 무검증 저장 | NAME_ONLY |
| 24 | default fallback reference | 부재 — **`fallback_reference` grep 0**. 현행 폴백은 참조가 아니라 **하드코딩 분기**이며 그중 2건은 복제 금지 대상: `JourneyBuilder::nextNode:811-812` 무라벨 위치 폴백(286차 실 오발송 장애 · 주석 `:801-803`) · `pickWeighted:729` `if ($total<=0) return $keys[0]` 첫 키 폴백 | ABSENT |
| 25 | owner | 부재(본 엔티티 기준) — 템플릿 소유자 축 0 | ABSENT |
| 26 | active version | 부재 — 활성 버전 포인터 0. `version_number`/`previous_version_id` **전역 grep 0** · 레포 version 컬럼은 전부 모델/빌드 태그(`AdminMenu.php:309` 리터럴 `'baseline'` · `ModelMonitor.php:35` · `Db.php:451`) | ABSENT |
| 27 | status | 부재(본 엔티티 기준) — `SET status *=` 128건/42파일이나 **합법 전이 집합 선언 0**(#34 State Machine ABSENT) · Template 상태 축 0 | ABSENT |
| 28 | evidence | 부재(본 엔티티 기준) — `evidence_json` 유일 실재는 귀속 신뢰도 근거(`Db.php:809` `attribution_result.evidence_json`) | ABSENT |

원문 부수 명령(줄 839·841 · 분모 외): *"Platform Template을 Tenant가 직접 수정하지 못하게 하라."* · *"Tenant Customization은 Template Binding 또는 Override로 처리하라."* → §3.2 참조.

### §12. Approval Chain Template Version (원문 줄 845-872 · 분모 17)

`APPROVAL_CHAIN_TEMPLATE_VERSION` — 필수 필드 17.

| # | 원문 항목 | 현행 실측 (file:line) | 판정 |
|---|---|---|---|
| 1 | approval_chain_template_version_id | 부재 — `approval_chain_template` grep 0 | ABSENT |
| 2 | approval_chain_template_id | 부재 — 상동. `template_id` 히트는 전량 메시지 템플릿(`Line.php:186` · `Omnichannel.php:497`) | ABSENT |
| 3 | version_number | 부재 — **`version_number` grep 0**(전역 재실증) | ABSENT |
| 4 | previous_version_id | 부재 — **`previous_version` grep 0**. 레포에 버전 계보 컬럼이 존재한 적 없다 | ABSENT |
| 5 | parameter schema version | 부재 — `parameter_schema` grep 0 | ABSENT |
| 6 | stage blueprint | 부재 — **`blueprint` grep 0** · Stage 개념 0 | ABSENT |
| 7 | level blueprint | 부재 — 상동 | ABSENT |
| 8 | route blueprint | 부재 — 상동. §11 #23 `$defaultNodes`(`JourneyBuilder.php:120-125`)는 blueprint 가 아니라 **인라인 리터럴**(추출된 청사진 레코드 없음) | ABSENT |
| 9 | required parameters | 부재 — 템플릿 파라미터 축 0 | ABSENT |
| 10 | optional parameters | 부재 — 상동 | ABSENT |
| 11 | compatibility range | 부재 — **`compatibility` grep 0** | ABSENT |
| 12 | structure hash | 부재 — `structure_hash` grep 0. 유사 선례 `schema_migrations.checksum`(`Migrate.php:50`)은 **파일 바이트 해시**라 구조 정규화 선례 아님 | ABSENT |
| 13 | effective_from | 부재(본 엔티티 기준) — 동명 컬럼은 세율 도메인 한정(`Db.php:898` `kr_fee_rule.effective_from`) · **as-of 질의 전역 0**(읽기 4개소 전부 `ORDER BY effective_from DESC` 최신승 · `Pnl.php:454`·`KrChannel.php:151`,`:459`) | ABSENT |
| 14 | effective_to | 부재 — **`effective_to`/`valid_to`/`valid_from` 전역 grep 0**(재실증 · 유일 히트 `Onsite.php:396` = `invalid_token` 오염). 레포에 종료 시점 축이 없다 | ABSENT |
| 15 | immutable_hash | 부재 — **`immutable_hash` grep 0**. 검증 가능한 해시 선례는 `SecurityAudit`뿐(`backend/src/SecurityAudit.php:27` tenant 포함 SHA-256 · `:45-52` DDL · **`verify():56-68` `hash_equals`**) | ABSENT |
| 16 | status | 부재(본 엔티티 기준) — Template Version 상태 축 0 | ABSENT |
| 17 | evidence | 부재(본 엔티티 기준) — `evidence_json` 은 귀속 근거 한정(`Db.php:809`) | ABSENT |

원문 부수 명령(줄 869 · 분모 외): *"Template 변경이 이미 생성된 Chain Version을 자동 변경하지 않게 하라."* → §3.3 참조.

---

## 2. 설계 계약

후속 구현이 지켜야 할 계약. **본 세션 코드 변경 0.**

### 2.1 판정 총평 — 45항목 중 NAME_ONLY 1 · 나머지 44 ABSENT

Template 계층은 **이름도 능력도 없다**. 유일한 인접물이 `JourneyBuilder::createJourney:120-125` 의 `$defaultNodes`/`$defaultEdges` 이며, 이것이 **NAME_ONLY 인 이유는 정확히 4가지**다:

1. **레지스트리 없음** — 템플릿이 테이블이 아니라 **PHP 메서드 본문의 인라인 리터럴**이다. 선택할 수 없고, 열거할 수 없고, 참조할 수 없다.
2. **버전 없음** — `$defaultNodes` 를 고치면 **과거 여정은 그대로**이고 미래 여정만 바뀐다. 어느 여정이 어느 시드에서 나왔는지 **역참조 불가**.
3. **재적용 없음** — `:135` 는 생성 시 1회 `??` 폴백일 뿐. 바인딩·오버레이·재컴파일 개념이 없다.
4. **파라미터 없음** — 유일한 변수는 `$b['trigger_type']`(`:121`)이며 파라미터 스키마가 아니라 **단일 문자열 주입**이다.

→ **계약**: `APPROVAL_CHAIN_TEMPLATE` 를 이 패턴으로 구현하면 §11·§12 를 하나도 만족시키지 못한다. **`$defaultNodes` 는 반면교사이지 확장 기반이 아니다.**

⚠️ **규칙 6 유의**: "44 ABSENT" 는 **중복이 없다**는 뜻이지 **신설이 자유롭다**는 뜻이 아니다. §39 DAG 검증(`PM/Dependencies.php:79-100` + `Gantt.php:104-122`)·§25 조건식(`RuleEngine.php:24`)은 **확장 의무**가 그대로 걸린다(신설 시 §63 중복).

### 2.2 Platform ↔ Tenant 소유 분리 (원문 줄 839) — 강제 수단부터 없다

원문은 *"Platform Template을 Tenant가 직접 수정하지 못하게 하라"* 를 요구하나, 현행 권한 축으로는 **이 문장을 코드로 옮길 자리가 없다**:

- 🔴🔴 **권한 축 2벌 분열**(§3.4 최대 미결): `$roleRank`(`backend/public/index.php:554` `viewer0<connector1<analyst2<admin3`) ↔ `team_role`(owner>manager>member) **매핑 코드 전수 0**(역방향도 0).
- `$roleRank` 의 **판정 축은 HTTP 메서드**(`:568` `in_array($method,['POST','PUT','PATCH','DELETE'])`) → **"무엇을 하는가"만 묻고 "누구인가"를 묻지 않는다**. Platform 소유 레코드에 대한 쓰기 차단을 표현할 술어가 없다.
- 🔴 **`acl_permission.approve` 는 완전한 장식**: `ACTIONS:39` 에 실재하고 `seedOrg:711` 이 실제 시드하지만(`'sales_pipeline'=>['view','create','update','approve']`), **읽어서 승인 가부를 판정하는 코드 0**. `actionsCover:194` 의 유일 호출처 `:639` 는 **위임 상한 검증**이지 승인 집행 아님.
- ★ **공용 스코프 선례는 있다**: 285차 확정 — **공용 카탈로그는 읽기도 `__shared__` 스코프로** 읽어야 하며, 이를 실테넌트로 읽어 상품마다 외부 API 를 재수집한 것이 502 의 진짜 원인이었다. **Platform Template 도 동일 원칙**(공용 = 별도 스코프 · 실테넌트로 읽지 않음)을 따르되, **루프 내 외부 조회 금지**를 함께 지켜라.

→ **계약**: Platform Template 보호는 `is_platform` 불리언 하나로는 불가능하다. **소유 스코프(`__shared__` 계열) + 쓰기 술어**를 함께 설계하고, 판정을 **핸들러마다 흩뿌리지 마라**(§3.4 분산이 이미 구조적 위험).

### 2.3 Template Binding / Override (원문 줄 841) — 오버레이 선례가 스칼라뿐이다

원문은 Tenant Customization 을 **Binding 또는 Override** 로 처리하라 요구한다. 현행 `override` 히트는 전량 **스칼라 선행순위**(`Mmm.php:381-382` · `OrderHub.php:1274`) — **구조체 오버레이 선례 0**.

→ **계약**: Override 는 §43 의 **7단계 적용 순서**(Base Chain Version → Tenant → Domain → Legal Entity·Organization → Program·Product·Brand → Approved Case-specific → Validation → Compilation)에 종속된다. **Template Binding 을 그 순서 밖에서 독자 해석하지 마라.** 적용 순서 자체를 Versioned Policy 로 관리하고, 동일 Scope 상충 시 Conflict 를 생성하라(§43 산문 2건). ※ §43 전사는 타 배정분.

### 2.4 "Template 변경 ≠ 기존 Chain Version 변경"(원문 줄 869) — 레포의 기본값이 정반대다

현행 시드 패턴은 **참조가 아니라 복사**(`:135` `?? $defaultNodes`)라 우연히 이 요구를 "위반하지 않는다". 🔴 **규칙 7 — 우연한 일치를 준수로 계산하지 마라.** 복사본이 독립인 것은 **참조 관계가 애초에 없기 때문**이지 격리를 설계했기 때문이 아니다.

반대로 **참조를 도입하는 순간** 이 요구가 실제 제약이 된다. 그러므로:

- Chain Version 은 Template Version 을 **`template version reference`(§10 필수 필드)로 가리키되**, 컴파일 시점에 **스냅샷을 물리 고정**하라. 참조를 런타임에 역참조하면 Template 변경이 즉시 전파되어 줄 869 를 위반한다.
- 🔴 **스냅샷 선례 주의**: `menu_defaults.snapshot_data`(`AdminMenu.php:119-120`) · `pm_baseline.snapshot_json`(★`captured_at` 은 **DB 컬럼이 아니라 JSON 키** · `PM/Enterprise.php:360`). **Chain 도메인 적용분 0** — `captured_at` 을 JSON 키로 숨기는 패턴을 복제하면 as-of 질의가 불가능해진다(§46 직결).

### 2.5 `structure hash`(§12 #12) — 정규화 규칙을 먼저 고정하라

`structure_hash` grep 0. 신설 시 **노드 정렬 순서·JSON 키 순서·부동소수 표기**를 명세에 못박지 않으면 동일 청사진이 서로 다른 해시를 낳아 §12 의 재사용 판정이 무너진다. 🔴 특히 현행 그래프에는 **엣지 id 가 없다**(`JourneyBuilder` 는 `from`+`when` 으로 매칭 · `:789`,`:796`) → 정규화 대상 자체가 불안정하다. **Route Edge 에 안정적 id 를 부여하는 것이 해시의 선행조건.**

### 2.6 `immutable_hash`(§12 #15) — 검증기를 같은 커밋에 넣어라

- ✅ **정본 선례 = `SecurityAudit`**: preimage 구성요소가 전부 저장 컬럼(`:27`) → `verify():56-68` 이 `hash_equals` 로 재계산 가능.
- 🔴 **반례 = `menu_audit_log.hash_chain` — 인용 금지**(★근거 정정 · 289차 10회차 ⓔ): **막히는 축은 `ts` 하나**다 — preimage 의 `'ts'=>date('c')`(`AdminMenu.php:195`) 가 **`:199-203` INSERT 컬럼 목록에 `created_at` 이 없어 어디에도 저장되지 않는다**(`:129` DB `DEFAULT CURRENT_TIMESTAMP` 가 채움) → **재구성 불가** · `hash_equals` grep **0**(`AdminMenu` 내). **검증 불가능한 장식**이다. (`prev` 는 `lastHash():216` 이 직전 행 `hash_chain` 을 읽어 공급 → **재구성 가능**하며 `prev_hash` 컬럼 부재는 결함이 아니다 — 초판의 *"preimage 2요소 모두 미저장"* 서술은 **틀렸다**.)
- → **계약**: 검증기 없는 `immutable_hash` 컬럼은 §61 을 만족하지 않는다. preimage 는 전부 저장 컬럼으로 구성하라.

---

## 3. 미결·선행조건

### 3.1 BLOCKED_PREREQUISITE — Template 은 정의·조직 계층 없이는 무의미하다

§11 의 지원 Template 11종 중 **9종이 조직/관리자 계층을 직접 전제**한다(Direct Manager · Manager of Manager · Cost Center Owner · Country/Regional · Functional/Administrative …). 그러나:

- 🔴🔴 **`parent_user_id` 는 상급자를 표현할 수 없다** — 전 4 생성경로가 owner 로 하드고정: `UserAuth::createTeamMember:1225-1227`(주석 자인 *"manager 가 추가해도 parent 는 최상위 owner"*) · `EnterpriseAuth::provisionUser:502`(`(int)$owner['id']`) · `createSubAdmin`(`UserAuth:1549`,`:1576`) · sub 는 계정생성 차단(`:1254-1256`). → 재해석하면 **전 멤버 상급자 = owner 1단 평면**. **컬럼 재사용 불가 · 쓰기 경로부터 변경 필요.**
- `team.manager_user_id`(`TeamPermissions.php:148`)는 **팀당 1칸** · 판독자는 **표시용 `manager_name` 투영 1개소뿐**(`:444-445` · 권한·승인 판독 0) · `seedOrg:739` INSERT 에 컬럼 부재 → **시드 NULL** · 변경은 `:495` **덮어쓰기**(이전 값 소멸 → as-of 재구성 불가).
- **`EnterpriseAuth` manager 부재는 groups 부재보다 깊다**: `provisionUser:476` **시그니처에 manager 파라미터 자체가 없다**. SCIM 이 읽는 키는 `userName`/`emails[0].value`/`name.*`/`externalId`(`:364-367`)+`groups`(`:374`) — **Enterprise User 확장 `manager` 파싱 0** · `scimUpdateUser:388-395` 는 `active`/`name` 만 → manager 전송 시 **무음 폐기**.

→ **§11 Template 카탈로그 확정은 Organization/Reporting Line Foundation(§3.1·§3.2) 이후.** 그 전에 Template 코드를 쓰면 **resolver 가 없는 이름표만** 만들게 된다(= `$defaultNodes` 와 같은 NAME_ONLY 재생산).

추가 선행: §11 #26 `active version`·§12 전체는 **§10 Chain Version 스키마 확정**에 종속된다(타 배정분).

### 3.2 원문 대비 발견 (원문이 전제하나 레포에 없는 것 / 원문 자체의 문제)

1. **§11 은 `template version reference` 를 필드로 갖지 않는다 — 방향이 §12 에만 있다.** §11 필수 필드에는 `active version`(#26)만 있고, `previous_version_id`·`effective_from`/`effective_to` 는 §12 에만 있다. 즉 **Template 자체에는 시점 축이 없고 Version 에만 있다.** 이는 일관되나, **§11 `status`(#27) 와 §12 `status`(#16) 의 관계가 원문에 정의되지 않았다**(Template RETIRED 인데 Version ACTIVE 가 가능한가?). 규칙 8 에 따라 **§10 의 16 상태를 §11/§12 에 복사해 채우지 마라** — 두 섹션은 상태 열거를 **명시하지 않는다**. 후속 명세가 별도 확정해야 한다.
2. **§11 #14 `platform template 여부` 는 Tenant 마스터 부재와 충돌**: Platform 소유를 표현하려면 "테넌트에 속하지 않음"을 표현해야 하나, 레포의 테넌트 열거는 **`SELECT DISTINCT` 19개소 역추론**이며 마스터 테이블이 없다(`api_key.tenant_id` = FK 없는 VARCHAR · `Db.php:944`). `tenant_id IS NULL` 을 Platform 센티넬로 쓰면 `effectiveScope:256`(**스코프 미설정 → null = 무제한**)과 같은 **NULL 무제한 해석 사고 패턴**을 반복한다.
3. **§12 #11 `compatibility range` 는 비교 대상이 없다**: 호환 범위를 판정하려면 Chain Version 의 `version_number` 가 **순서 있는 값**이어야 하나 레포의 version 컬럼은 전부 문자열 태그(`'baseline'`·`'v1.0'`·`'v423_rule_v1'`)이며 **비교 코드 0**. 원문은 순서 있는 버전 축이 존재한다고 전제한다.
4. **§11 #23 `default route structure` 를 현행 그래프로 표현하면 §22 가 성립하지 않는다**: `JourneyBuilder` 엣지에 **id 가 없어**(`from`+`when` 매칭 · `:789`,`:796`) Route Edge 참조가 불가능하다. Template 청사진을 저장하기 전에 **엣지 식별자 도입이 선행**이다.
5. **§11 #24 `default fallback reference` 와 §72-10 의 충돌이 레포에 살아 있다**: `nextNode:809` `if ($hasLabeled) return ''` = BLOCK_ON_NO_MATCH 는 **라벨 있는 그래프에만** 적용되고, `:811-812` 가 무라벨 레거시 그래프에 **위치 폴백을 존치**한다(`$idx = in_array($bl,['true','a','yes','1']) ? 0 : (count($cand)>1 ? 1 : 0)` · 주석 `:810` 자인). 286차 실 장애(주석 `:801-803`): 위치 폴백이 *"조건 불충족 고객을 엉뚱한 분기(예: YES 보상)로 오발송"*. → **§22 BLOCK_ON_NO_MATCH 는 "확립된 의미론"이 아니라 조건부로만 확립. Template 기본 폴백에 무라벨 위치 폴백을 절대 복제하지 마라.**
6. **조건 평가의 방향이 도메인마다 반대다**: `evalCondition`(정의 `:818` · `$actual…?? null` `:844` · `compare:848` `if ($a===null) return false`) = **미추적 신호 → false**. 마케팅에선 안전(발송 안 함)이나 **승인에선 방향이 반대**(승인 거부가 안전). Template 파라미터 기본값 설계 시 §25 `fail closed 여부`를 도메인별로 명시하라.

### 3.3 기지 실측 정정 / 재실증 결과

✅ **앵커와 일치 확인(재실증)**:
- `createJourney:120-125` `$defaultNodes`(4노드) + `:126` `$defaultEdges`(3엣지) = PHP 리터럴 시드 · `:135` 생성 시 1회 복사 → **NAME_ONLY 확정**(단, `$defaultEdges` 는 앵커 표기 `120-125` 범위 밖인 **`:126`** 에 있다 — 미세 정정).
- `effective_to`/`valid_to`/`valid_from` grep 0 · `immutable_hash` grep 0 · `version_number`/`previous_version_id`/`structure_hash` grep 0.
- `SecurityAudit` 검증기 실재(`:56-68` `hash_equals`) · `menu_audit_log.hash_chain` 검증기 0.
- `menu_defaults.version` = 리터럴 `'baseline'`(`AdminMenu.php:309` INSERT 3번째 인자).

🔴 **정정 — 앵커 "엔티티 `version` = 레포 3컬럼뿐"은 부정확. 최소 6컬럼이다**: 앵커 3(`menu_defaults.version` `AdminMenu.php:309` · `ml_models.version` `ModelMonitor.php:35` · `risk_model_registry.model_version` `Db.php:451`) + **누락 3**(`risk_prediction.model_version` `Db.php:463` · `normalizer_version` `Db.php:1088` `DEFAULT 'v423_rule_v1'` · `agent_version` `WmsCctv.php:160`). **결론은 불변** — 6개 전부 모델/룰셋/에이전트 빌드 태그이며 계보·증분·구조해시 없음. 판정에 영향 없으나 오표기 전파 방지를 위해 보고한다.

🔴 **신규 grep 오염 2건 보고**(오염 레지스트리 보강 권고):
- **`template_code`/`template_name` → 메시지 템플릿**: `KakaoChannel.php:47`,`:50`,`:150-161`(알림톡 사전승인 템플릿 · `UNIQUE(tenant_id, template_code)` · 409 중복) · `Line.php:169-170` · `WhatsApp.php:68`. **`template_code` 단독 grep 은 승인 도메인 판정에 쓸 수 없다.**
- **`template_id` → 발송 템플릿 FK**: `Line.php:48`,`:186`,`:212` · `EmailMarketing.php:56` · `Omnichannel.php:497`. **`JourneyBuilder.php:122` 의 `'template_id'=>null` 도 이메일 노드 config 키**이지 Chain Template 아님.

### 3.4 자진 신고

- **§11 #23 의 NAME_ONLY 는 규율 앵커의 지시를 따른 판정**이다. 자체 재실증으로 `$defaultNodes`/`$defaultEdges` 의 리터럴성·1회 복사·레지스트리 부재는 확인했으나, **"default route structure" 에 매핑할지 "default stage structure"(#21)에도 매핑할지는 해석 여지가 있다.** Stage 개념이 레포에 0 이므로 #21 은 ABSENT 로, 노드/엣지 구조를 가진 #23 만 NAME_ONLY 로 판정했다. **이 매핑은 원문에 근거가 없는 판단**이므로 신고한다.
- **§11 지원 Template 11종의 ABSENT** 는 각 개념 축(manager 해석·finance·legal·cost center·region)의 **부재 증명**에 근거하며, "동명 Template 레코드 부재"만 확인한 것이 아니다. 다만 `Country + Regional`·`Executive Reference` 는 축약·의역 명명 변형(예: `exec_`, `regional_appr`)까지 전수하지는 않았다.
- **§11 #13·#25·#27·#28 및 §12 #16·#17 의 "본 엔티티 기준 부재"** 는 엔티티 자체가 0 이라는 사실에서 파생한 판정이다. 해당 컬럼명이 타 도메인에 다수 존재함을 명시했다(규칙 7 준수).
- **본 문서는 §11·§12 만 전사한다.** §10/§14/§16/§19(Versioning 계층)는 동일 세션 배정분(`APPROVAL_CHAIN_VERSIONING.md`)이며, §9/§13/§15/§18(정의 계층)·§43(Override Overlay 7단계)·§23(Route 방향 표준)은 **타 배정분**이다.
