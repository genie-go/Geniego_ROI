# DSAR — Brand Manager Relationship (§26)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §26 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 ★§26 핵심 — **명부는 REAL · 매니저는 ABSENT**(규칙 9)

`catalog_brand` 는 **실재하며 실사용된다**. 그러나 **관리자 필드가 한 개도 없다.** **명부의 존재를 매니저 커버로 계산하면 규칙 9 위반**이다("중복 없음" ≠ "기능 충족" — 미달을 커버라 부르면 통합 결과가 자동으로 "기능 유지"로 위장된다).

| 축 | 실측 | 증거 |
|---|---|---|
| DDL(MySQL) | `id`·`tenant_id`·`name VARCHAR(190) NOT NULL`·`code VARCHAR(190)`·`created_at`·`updated_at` · `UNIQUE KEY uq_cb (tenant_id, name)` | `Catalog.php:151-162` |
| DDL(SQLite) | 동일 6컬럼 · `UNIQUE(tenant_id, name)` | `Catalog.php:161-169` |
| **관리자 필드** | 🔴 **없음** — `owner`·`manager`·`user_id` **전무**. 컬럼 6개가 **전부** | 동 |
| 목적(주석 자인) | *"테넌트 브랜드 목록 — 상품정보에서 **선택**해 쓰도록 관리하는 정본(자유입력 오타·표기흔들림 방지)"* | `Catalog.php:148` |
| `code` 의미 | *"채널 브랜드코드(11번가 `apiPrdAttrBrandCd` 등, 선택). 없으면 name 을 그대로 전송한다"* | `Catalog.php:149` |
| 실사용 | `BRAND_REQUIRED_CHANNELS = ['11st','st11']`(`:415`) · 소비 `:324`·`:421`(`in_array`) · `channelRequiresBrand()` `:418` | `Catalog.php` |

★**즉 `catalog_brand` 의 존재 이유는 "11번가 상품등록 필수 브랜드코드"**(285차)이며, **브랜드 운영 조직과 무관**하다. `UNIQUE(tenant_id,name)` 는 **표기 흔들림 방지**이지 조직 정합이 아니다.

### ★`program scope` = **이중 부재**

§26 은 `program scope` 를 요구하나 **§23 실측대로 program 개념이 코드에 0**이다(`\bprogram\b` = **LiveCommerce WebRTC 스트림명뿐** `LiveCommerce.php:856-857`,`:887`). `pm_portfolio` 주석(`PM/Enterprise.php:13`)이 "프로그램"을 자칭하나 **같은 줄이 실제 도메인을 "프로젝트 묶음·롤업"이라 자인**한다(규칙 8). → **Brand 의 program scope 는 참조 대상 자체가 없다.**

### ★법적·재무 승인 축 — **분리할 대상이 없다**

승인 4경로 전량 **"호출자가 곧 승인자"** · **Approval Manager Resolver `ABSENT`**(`resolveApprover`/`approval_chain`/`routeApproval` **grep 0**). 브랜드를 해석하는 승인 코드 **0**.

## 1. 원문 전사 + 판정 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | brand id | ★**`catalog_brand.id` REAL** — `Catalog.php:151-169` · `UNIQUE(tenant_id,name)` · 실사용(11번가 브랜드코드 `:415`,`:324`,`:421`). **참조 대상으로 재사용 가능** · 🔴 **단 매니저 관계는 여전히 부재** | `LEGACY_ADAPTER` |
| 2 | brand owner organization | 부재 — `catalog_brand` **관리자 필드 0** · 조직 축 **18/18 `CONTRACT_ONLY`**(`ORGANIZATION_*` backend 전역 grep 0) | `ABSENT` |
| 3 | legal owner entity | 부재 — Legal Entity 축 전역 0 · `ceo_name` = `app_user` **프로필 평문**(`UserAuth.php:307`,`:499`) · **계정당 1개** | `ABSENT` |
| 4 | operating entities | 부재 — **복수 법인 표현 수단 0**(규칙 10) · `data_scope` 는 `UNIQUE(tenant_id,subject_type,subject_id)` `TeamPermissions.php:164` 로 **단일행이 스키마 강제** | `ABSENT` |
| 5 | region scope | 부재 — `region` 3축 전부 **도메인 상이**(광고 세그먼트 `Db.php:681` / Amazon 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`) · `APAC`/`EMEA`/`LATAM` **0**(§24 참조) | `ABSENT` |
| 6 | country scope | 부재 — `country` 4축 전부 **프로필·물류·언어**(§25 참조) · `catalog_brand` 에 지역 컬럼 **0** | `ABSENT` |
| 7 | program scope | 부재 — 🔴 **이중 부재**. Brand 측 scope 축 0 **+** Program 개념 자체 0(§23 · `\bprogram\b` = LiveCommerce 스트림명뿐) | `ABSENT` |
| 8 | approval routing eligibility | 부재 — 승인 4경로 전량 **"호출자가 곧 승인자"** · **Approval Manager Resolver `ABSENT`** · 브랜드를 해석하는 승인 코드 0 | `ABSENT` |
| 9 | valid period | 부재 — `catalog_brand` 는 `created_at`/`updated_at` **뿐**(`:155-156`) · `effective_from` 은 `kr_fee_rule` 전용(`Db.php:898`) · `effective_to`/`valid_to`/`valid_from` **grep 0** | `ABSENT` |

**실측 개수: 9 / 9 전사.** (측정기 분모 9 · 원문 대조 9 · 전사 9 — **3자 일치**.)
커버리지 = **부재 8 · 어댑터 1 · 커버(`VALIDATED_LEGACY`) 0.**

## 2. 규칙

- 🔴 **★"브랜드 명부가 있다" → "Brand Manager 가 있다"로 계산 절대 금지**(규칙 9). `catalog_brand` 는 **6컬럼 전부가 식별·표기 축**이며 **사람을 담지 않는다**. 명부 실재는 §26 **1항(brand id) 하나**만 지원하고 **나머지 8항에 아무 기여도 하지 않는다**.
- ✅ **`catalog_brand` 를 brand 참조 정본으로 재사용하라 — 신규 브랜드 명부 신설 금지**(중복 인텔리전스 = 헌법 위반). 신설 Brand Manager 관계는 **`catalog_brand.id` 를 FK 로 참조**한다.
  - ⚠️ **단 FK 대상으로서의 결격 1건**: `catalog_brand` 의 유일성은 **`UNIQUE(tenant_id, name)`**(`:161`)이고 `id` 는 **AUTO_INCREMENT 대리키**다. `name` 변경 시 **동일 `id` 가 다른 브랜드를 가리킬 수 있다**(rename 이력 0). 관계에서 **as-of 참조가 필요하면 `id` 만으로 부족**하다.
- ★**원문 요구 — *"Brand 운영 책임과 법적·재무 승인 권한을 구분한다"*** : 🔴 **현행에서 이 구분은 수행할 수 없다 — 양쪽이 다 부재**하기 때문이다(운영 책임 축 0 · 법적/재무 승인 축 0). **"현행이 혼동하지 않으므로 준수"라 적으면 규칙 10 위반.** 신설 시 **운영 책임(Operating)과 승인 권한(Approval)을 별개 레코드로 분리**하고, 운영 책임 보유를 **승인 자격으로 자동 승격시키지 마라**.
  - ⚠️ **현행에 자동 승격 선례가 있다**(§76 실재 3건 중 1): **"Manager 라는 이유만으로 Approval Authority 자동 부여"** — `UserAuth.php:1064` · `TeamPermissions.php:136`. **브랜드 축으로 복제하면 원문이 금지한 바로 그 결과.**
- 🔴 **`code` 를 조직 식별자로 전용 금지.** `code` = **채널 브랜드코드**(`:149` 주석 자인 · 11번가 `apiPrdAttrBrandCd`)이며 **미입력 시 `name` 이 그대로 전송**된다. 조직 축을 얹으면 **11번가 상품등록이 조직 개편에 결합**된다.
- **`region scope`/`country scope`/`operating entities` 는 전부 집합 축이다.** 현행에 **집합 표현 스키마 선례가 없다**(`data_scope` 는 UNIQUE 로 단일행 강제). **신규 N:N 테이블 필요** · `ensureTables` 경로(마이그레이션 **172차 정지**) · **MySQL/SQLite 두 방언 수기 중복 작성 의무** · 🔴 **`ensureTables` 는 데이터 변환·백필을 하지 않는다**.
