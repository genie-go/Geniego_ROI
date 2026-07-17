# DSAR — Program Manager Relationship (§23)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §23 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### 🔴 ★§23 = **규칙 8 실증 사례 — 주석이 자칭한 도메인이 코드에 없다**

`backend/src/Handlers/PM/Enterprise.php:13` 주석:

> `• 포트폴리오/프로그램      : pm_portfolio (+ pm_projects.portfolio_id) — 프로젝트 묶음·롤업`

**주석은 "프로그램"을 자칭한다. 그러나:**

| 검증 | 결과 |
|---|---|
| `\bprogram\b` backend/src grep | **관련 히트 0** — 전량이 **LiveCommerce WebRTC 스트림명**(`LiveCommerce.php:856-857`,`:887`,`:889`,`:891-892` · `streamName($tenant,$sid,'program')` = 호스트 송출 스트림) |
| `pm_portfolio` 실제 도메인 | **주석 자신이 자인** — *"프로젝트 묶음·롤업"* (`Enterprise.php:13`). Program 이 아니라 **Portfolio** |
| program reference/funding/region/country/legal entity/approval scope | **전부 0** |

★**규칙 8 재적중**(세 블록 연속 재발): 5-3-2 `Alerting::dispatch`(팬텀) · 5-3-3-1 `ChannelSync:914 depth`(주석) · 5-3-3-2 `group_type` "열거" · **본 §23 `pm_portfolio` "프로그램"**. **주석·문서·인계서를 근거로 삼지 말고 정의부를 Read 하라.**

### ★인접자산 = `pm_portfolio.owner_user_id` — **§22 와 동일한 4결격을 공유**

| 축 | 실측 | 증거 |
|---|---|---|
| 정의(MySQL) | `owner_user_id VARCHAR(100)` | `PM/Enterprise.php:35` |
| 정의(SQLite) | `owner_user_id TEXT` | `PM/Enterprise.php:59` |
| 쓰기 | INSERT `:106` · 값 `:107` `$b['owner_user_id'] ?? $g['user_id']` · PATCH 화이트리스트 `:118` | 동 |
| 인덱스 | `KEY idx_pf_tenant (tenant_id)` **뿐** — owner 인덱스 **없음**(`pm_projects` 와 달리) | `:37` |

🔴 **4결격**: ① **판독 술어 0**(`WHERE owner_user_id` **전역 grep 0** — `pm_projects`·`pm_portfolio` 양쪽 모두) ② **무검증 자유문자열**(`:118` `(string)$b[$f]` 캐스팅만 · FK 0) ③ **기본값이 생성자**(`:107` `?? $g['user_id']`) ④ **단일값**.

> ★**본 문서의 기지 실측 정정**: ⓑ 브리핑은 §23 을 "`pm_portfolio` 주석 팬텀 · 코드에 program 개념 0" 으로만 기술하고 **`pm_portfolio.owner_user_id` 컬럼의 실재를 인용하지 않았다**(브리핑 §9 는 `owner_user_id` 를 `pm_projects` 축으로만 제시). 실측 결과 **동명 컬럼이 `pm_portfolio` 에도 있다.** 결론(§23 전건 부재)은 **유지된다** — Portfolio Owner 는 Program Owner 가 아니기 때문이다(규칙 7: 이름이 아니라 능력으로). 그러나 **"owner_user_id 는 pm_projects 에만 있다"고 적으면 사실과 다르다.**

## 1. 원문 전사 + 판정 — **원문 9종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | program reference | 부재 — **program 개념 0**. `pm_portfolio` 는 **포트폴리오**(`Enterprise.php:13` 주석 자인: *"프로젝트 묶음·롤업"*) · `pm_projects.portfolio_id`(`:64` ALTER)는 **프로젝트→포트폴리오 링크**이지 프로그램 아님 | `ABSENT` |
| 2 | program organization | 부재 — 조직 축 **18/18 `CONTRACT_ONLY`** | `ABSENT` |
| 3 | program owner | 부재(**Program** 오너). 인접 = `pm_portfolio.owner_user_id`(`:35`/`:59` · 쓰기 `:107` · PATCH `:118`) = **Portfolio 오너** · **4결격 공유** · 판독 술어 0 | `ABSENT` |
| 4 | program funding scope | 부재 — `pm_portfolio` DDL(`:33-38`)에 예산·펀딩 컬럼 **없음**(id·tenant_id·name·description·owner_user_id·status·color·created_at·updated_at **뿐**). 예산은 `pm_projects.budget_amount`(**프로젝트** 축) | `ABSENT` |
| 5 | program region | 부재 — `region` 3축 전부 **도메인 상이**(§24 참조) · 포트폴리오에 지역 컬럼 0 | `ABSENT` |
| 6 | program country | 부재 — 포트폴리오에 국가 컬럼 0 · `country` 히트는 물류·프로필 축(§25 참조) | `ABSENT` |
| 7 | program legal entity | 부재 — Legal Entity 축 전역 0 | `ABSENT` |
| 8 | program approval scope | 부재 — 승인 4경로 전량 **"호출자가 곧 승인자"** · **Approval Manager Resolver `ABSENT`** · `pm_portfolio` 는 승인 경로에 **미등장** | `ABSENT` |
| 9 | valid period | 부재 — `pm_portfolio` 는 `created_at`/`updated_at` **뿐**(`:37`) · `effective_from` 은 `kr_fee_rule` 전용(`Db.php:898`) | `ABSENT` |

**실측 개수: 9 / 9 전사.** (측정기 분모 9 · 원문 대조 9 · 전사 9 — **3자 일치**.)
커버리지 = **부재 9 · 커버 0.** §22~§28 중 **유일한 전건 부재 섹션**.

## 2. 규칙

- 🔴 **`pm_portfolio` 를 Program 으로 계산 금지.** 주석(`Enterprise.php:13`)이 "프로그램"을 자칭하지만 **같은 줄이 실제 도메인을 "프로젝트 묶음·롤업"이라 자인**한다. 주석을 근거로 §23 을 닫으면 **규칙 8 위반**이며, 5-3-2/5-3-3-1 에서 세 번 반복된 실패다.
- 🔴 **`pm_portfolio.owner_user_id` → "program owner 충족"으로 매핑 금지.** Portfolio ≠ Program 이며, 설령 동일시하더라도 **판독 술어 0**이라 값이 무엇이든 시스템 거동이 같다(§22 와 동일한 라벨 결격).
- ★**원문 금지 — *"Rebate Program Owner와 Employment Manager를 동일시하지 마라"*** : 🔴 **현행에서 이 금지는 위반할 수도 준수할 수도 없다 — 양쪽이 다 부재하기 때문이다.** `rebate` **전역 0**(스펙 표제 도메인 자체가 없다) · Employment Manager 축 0(§3.2 18항목 중 14 `ABSENT` · `is_active` 는 **계정 상태이지 고용 상태가 아니다** — base DDL `Db.php:1106`). **"현행이 동일시하지 않으므로 준수"라 적으면 규칙 10 위반**(우연한 일치를 준수로 계산 금지) — 동일시할 대상이 **0개**라서 0인 것이다.
- 🔴 **Program 신설 시 Portfolio 와의 관계를 먼저 선언하라.** `pm_portfolio` 가 이미 "프로젝트 묶음" 축을 점유한다. Program 을 **두 번째 묶음 계층**으로 신설하면 **중복 인텔리전스**가 된다(헌법 위반). 선택지는 ① Portfolio 를 Program 으로 승격·정규화 ② Program 을 Portfolio 상위 계층으로 명시 선언 — **어느 쪽이든 ADR 선결**이며 본 명세의 범위 밖이다.
- **`pm_portfolio` 스키마 복제 금지 사유 2건**: ① **owner 인덱스 없음**(`:37` = tenant 인덱스 뿐) → 오너 역질의 불가 ② **시점 컬럼 0** → as-of 질의 불가. 물려받으면 설계 시점에 이미 §38(Business/System 이중 시간축 · **전례 0**)이 불가능해진다.
- 🔴 **경로 접두 필수**: `backend/src/Handlers/PM/…` (**`backend/src/PM/` 는 존재하지 않는다**).
