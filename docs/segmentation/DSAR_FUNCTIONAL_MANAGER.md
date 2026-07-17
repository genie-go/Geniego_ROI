# DSAR — Functional Manager (§20)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §20(972-999줄) · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Functional Manager | `functional_manager`·`function_head`·`functional_domain` **backend/src grep 0** | `ABSENT` |
| **Administrative 와의 구분 수단** | 🔴 **`app_user.team_role` 문자열 1개**(`UserAuth.php:168` · 값 `owner|manager|member`) — Functional 을 Administrative 와 **구분해 담을 칸이 없다** | `ABSENT` |
| Functional Head 5종 | `Finance`·`Legal`·`Marketing`·`Security`·`Data` **Head 개념 0** | `ABSENT` |
| 인접 유물 — `ORG_PRESET` | `TeamPermissions.php:708-721` **15팀 열거+시딩** · **계층 링크 0** · 🔴**`seedOrg:739` INSERT 컬럼 8개에 `manager_user_id` 부재 → 15팀 전부 manager NULL** | `NAME_ONLY`(팀명 문자열) |
| `team.team_type` | `VARCHAR(48)` **무검증 대입**(`createTeam:461` — ENUM/CHECK/`in_array` 0) | `NAME_ONLY` |
| country / region | `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용** · `region` 3축(광고 인구통계 `Db.php:681` / **Amazon Ads 엔드포인트** `Connectors.php:2704-2710` / **WMS 시·도** `Wms.php:129`) · `APAC`/`EMEA`/`LATAM` **0** | `NOT_APPLICABLE`(탐지·라우팅이지 명부 아님) |
| Legal Entity | 법인 엔터티 0 · `DATA_SCOPES` `'company'` = **무제한 센티넬**(`effectiveScope():258`) | `ABSENT` |
| valid period | `valid_from`·`valid_to` **grep 0** | `ABSENT` |

**★축 주의 ① — "Functional Manager 가 Direct Manager 를 자동 대체하지 않게 하라"(원문 996줄)는 현행에서 검증 불가능하다.**
현행이 자동 대체를 **하지 않는다.** 그러나 그것은 §20 준수가 아니라 **양쪽 개념이 다 없어서**다(규칙 10). Direct Manager도 0, Functional Manager도 0 → 대체할 것도 대체될 것도 없다. **이를 "준수"로 계산하면 §20 요구가 정의상 소멸한다.** 🔴 **관계 엔터티를 신설하는 순간 자동 대체가 즉시 가능해지므로, 금지는 관계와 동시에 구현되어야 한다.**

**★축 주의 ② — `ORG_PRESET` 15팀을 Functional Organization 으로 계산 금지.**
`TeamPermissions.php:708-721` 은 **팀명 문자열 열거 + 시딩**이며 **계층 링크가 0**이다(`team` 에 **`parent_team_id` 없음 → 팀 트리 자체가 없다**). 게다가 **`seedOrg:739` 의 INSERT 컬럼 8개에 `manager_user_id` 가 없어 15팀 전부 manager 가 NULL** 이다 — **명부는 있고 매니저는 없다**(규칙 9: "명부 존재 ≠ 기능 충족"). ⚠️**15팀 중 8팀은 scope 조차 실효 없음**(`'재무팀' => 'company'` `:717` = **무제한 센티넬** · `partner`(`:720-721`)·`campaign`(`:708-710`) 소비처 0) — **등급 미부여**(설계 의도 미확인).

**★축 주의 ③ — `wms_warehouses.manager` 를 Functional/Regional Manager 로 오독 금지.**
`Wms.php:62`/`:112` `VARCHAR(120)` · 쓰기 `:290`,`:299`,`:313` — **`region`·`country` 와 같은 테이블에 공존**해 오독하기 쉽다. **시설 담당자 자유텍스트** · FK 0 · **판독 술어 0** → `NAME_ONLY`. 동형 함정: **`pm_raid.owner`**(`Enterprise.php:42` 자유문자열) · **`admin_growth_lead.owner`**(`AdminGrowth.php:909` **B2B 리드 담당자**) · **`'외부 대행사'` 팀 프리셋**(`TeamPermissions.php:718` — **광고 대행사이지 직무대리 아님**).

## 1. 원문 전사 + 판정 — **원문 14종**(예 5 + 필수 속성 9)

### 1-1. 예 (원문 불릿 5)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Finance Functional Head | **부재** — Head 개념 0. ⚠️`ORG_PRESET` `'재무팀'`(`TeamPermissions.php:717`)은 **팀명 문자열**이며 **manager NULL**(`seedOrg:739` INSERT 에 `manager_user_id` 부재) · 그 scope `'company'` 는 **무제한 센티넬** | `ABSENT` |
| 2 | Legal Functional Head | **부재** — 법무 조직·Head 0. `ceo_name` 은 **프로필 평문 문자열**(`UserAuth.php:306-307`)이지 법인 임원 관계 아님 | `ABSENT` |
| 3 | Marketing Functional Head | **부재** — 🔴`ORG_PRESET` 에 마케팅 팀명이 있어도 **manager NULL** · `'manager'` 롤은 **팀 라벨**이지 기능 도메인 Head 아님 | `ABSENT` |
| 4 | Security Functional Head | **부재** — 보안 조직 0. `security-scan.yml` `repo-guards` 는 **CI 탐지**이지 조직 관계 아님 | `ABSENT` |
| 5 | Data Functional Head | **부재** — 데이터 조직·Head 0. `DataPlatform`(272차)은 **파이프라인**이지 조직 관계 아님 | `ABSENT` |

### 1-2. 필수 속성 (원문 불릿 9)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 6 | functional domain | **부재** — 기능 도메인 축 0. 🔴`team.team_type VARCHAR(48)` 은 **무검증 자유 대입**(`createTeam:461` — ENUM/CHECK/`in_array` **0**)이라 값을 넣을 수는 있으나 **판독 술어가 0** → 저장된 라벨. **"열거에 없다"로 논증 금지**(규칙 11 — 열거가 실재하지 않는다) | `ABSENT` |
| 7 | functional organization | **부재** — **`team` 에 `parent_team_id` 없음 → 팀 트리 자체가 없다** · 기능 조직과 행정 조직을 구분할 축 0(`ORG_PRESET` 15팀 = **평면 명부**) | `ABSENT` |
| 8 | responsibility scope | **부재** — 🔴`data_scope` 는 **인가 스코프**(메뉴/데이터 열람)이지 관리 책임 범위 아님 · **`UNIQUE(tenant_id,subject_type,subject_id)` `TeamPermissions.php:164` = 단일행이 스키마로 강제** → 여러 책임 범위를 담을 수 없다(규칙 10 — 정책이 아니라 UNIQUE 가 금지) | `ABSENT` |
| 9 | resource scope | **부재** — 관리 대상 리소스 집합 축 0. `DELEGATION_EXCEEDED`(`TeamPermissions:645`)는 **권한 부여 상한**이지 리소스 범위 아님 | `ABSENT` |
| 10 | country scope | **부재** — 🔴**현행 country/region 전 3축이 명부가 아니다**: `Geo.php:23-53` IP→ISO alpha-2 **언어 결정용** · `Connectors.php:2704-2710` **Amazon Ads 엔드포인트**(na·eu·fe) · `Wms.php:129`·`regionOf():286` **시·도 배송권역**. `APAC`/`EMEA`/`LATAM` **0** | `ABSENT` |
| 11 | legal entity scope | **부재** — 법인 엔터티 0(→ #2) · 🔴`DATA_SCOPES` `'company'`(`TeamPermissions.php:717`)를 법인으로 읽으면 오판 — **`effectiveScope():258` 의 무제한 센티넬** | `ABSENT` |
| 12 | primary functional 여부 | **부재** — `primary` 플래그 0. ⚠️**`app_user.team_id` 단일 컬럼 = 1인 1팀** → **`primary` 를 붙일 두 번째 기능 소속이 존재할 수 없다**(규칙 10 — 1개인 것은 수단이 없어서) | `ABSENT` |
| 13 | approval routing eligible 여부 | **부재** — 승인자 **후보를 계산하는 코드가 레포에 없다**(`resolveApprover`·`approval_chain`·`routeApproval` **grep 0**). 승인 경로 4개 전량 **"호출자가 곧 승인자"** · 🔴**`Mapping::approve:238-294` 의 자격 판정 축은 정족수(숫자)뿐 — 적격 술어 0** | `ABSENT` |
| 14 | valid period | **부재** — `valid_from`·`valid_to`·`effective_to` **grep 0** · `team.manager_user_id` 에 **effective date 0 · 이력 0** | `ABSENT` |

**실측 개수: 14 / 14 전사.**
- **측정기 분모 14**(예 5 + 필수 속성 9) · **원문 대조 14** · **전사 14** — **일치.**
- ★**규칙 4 확인**: 원문 §20 필수 속성 목록은 `valid period`(994줄)로 **끝난다.** `evidence`·`historical reconstruction` 로 끝나지 **않으므로 추가하지 않았다**(§19 와 말미 항목이 다르다 — 섹션 간 복제 금지).
- ★원문 996줄 *"Functional Manager가 Direct Manager를 자동 대체하지 않게 하라"* 는 **산문 요구**이며 측정기 분모 14 에 미포함 → 표에 넣지 않고 **§2 규칙**으로 전사(규칙 3).
- 커버리지 = **`ABSENT` 14 · 커버 0.**

## 2. 규칙

- 🔴 **원문 996줄 요구 — "Functional Manager 가 Direct Manager 를 자동 대체하지 않게 하라."** 현행이 대체하지 않는 것은 **양쪽이 다 없어서**다(축 주의 ①). **Functional 관계를 먼저 만들고 대체 금지를 나중에 붙이는 순서 금지** — 그 간극에서 Functional Head 가 Direct Manager 승인권을 자동 상속한다.
- 🔴 **`team_role` 에 Functional 값 추가 금지.** `=== 'manager'` 비교(`UserAuth.php:1062-1064` · `TeamPermissions.php:136`)에 인가가 직결되어 값 확장이 **기존 권한을 조용히 소실**시킨다(무후퇴 위반). Functional 은 **별도 관계 엔터티**.
- 🔴 **`ORG_PRESET` 15팀(`TeamPermissions.php:708-721`)을 Functional Organization 으로 재사용 금지.** 평면 명부 · 계층 링크 0 · **manager 전부 NULL**(`seedOrg:739`). "팀명이 재무/마케팅이니 Functional Domain 이다"는 **이름 기반 추론 = 규칙 7 위반**.
- 🔴 **`team.team_type` 에 functional domain 을 실어 해결하려 하지 마라.** 무검증 `VARCHAR(48)`(`createTeam:461`) · **판독 술어 0** → **저장된 라벨**이 하나 더 늘 뿐이다(`pm_projects.owner_user_id` 4결격과 동형 — **`WHERE owner_user_id` grep 0**).
- 🔴 **#10 country scope 를 `Geo.php`·`region` 으로 채우지 마라.** 3축 전부 **탐지·라우팅·배송권역**이며 **직원 근무지 축이 전역 0**이다. ⚠️**타임존도 동일** — 4벌 전부 도메인 상이(`crm_customer_prefs.tz_offset` 고객 수신 선호 · `ad_schedule.tz`(`RuleEngine.php:56` **유일 IANA `VARCHAR(40)` 선례**) 광고 데이파팅) → **스키마 형태만 이식 가능 · 값·의미·소유자는 신규.**
- **#8 responsibility scope 는 `data_scope` 확장 금지 · 신규 축.** `UNIQUE(tenant_id,subject_type,subject_id)`(`:164`)가 **단일행을 스키마로 강제**하므로 책임 범위를 얹으면 **인가 스코프가 덮어써진다**(무후퇴 위반).
- **#13 은 §19 #6 과 동일 부재를 공유한다** — Approval Routing Eligibility 는 **Manager 종류별로 중복 설계 금지**. 🔴**단일 Eligibility 술어**에 `manager_type` 을 인자로 넘긴다(중복 엔진 금지 — 헌법 Volume 4).
- 🔴 **14종 "있다고 가정"하고 배선 금지.**
