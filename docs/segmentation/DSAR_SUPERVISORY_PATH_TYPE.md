# DSAR — Supervisory Path Type (§49)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §49 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

**본 문서 = §49 `SUPERVISORY_PATH` 의 Path Type 축(13).** 필수 필드 축(18)+§77 저장 전략은 [DSAR_SUPERVISORY_PATH.md](DSAR_SUPERVISORY_PATH.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Path Type 열거 | **13종 전부 backend/src grep 0** | `ABSENT` |
| **Path 개념 자체** | 🔴 **Closure Table·Materialized Path·Recursive CTE·Graph DB 전례 0**(`WITH RECURSIVE`·`CONNECT BY`·`closure`·`ancestor`·`descendant`·`lft`·`rgt` **backend/src 0**) | `ABSENT`(**순수 신규**) |
| 순회 전례 | **전부 애플리케이션 계층**(`Handlers/PM/Dependencies.php:79-100` DFS · `Handlers/PM/Gantt.php:104-118` Kahn · `ChannelSync.php:958-964` parent 체인) | `LEGACY_ADAPTER`(**알고리즘만**) |
| 타입별 경로 분리 | 🔴 **불가** — `Dependencies.php:90-91` 이 **`dep_type` 술어를 안 넣어 전 타입 무차별 순회** | 🔴 결격 |

### ★축 주의 — **13종 전부 `ABSENT` 의 의미**(규율 규칙 10)

🔴 **경로를 구분할 관계 타입이 1개도 없다.** 현행에서 `FUNCTIONAL_CHAIN` 이 0건인 것은 **`app_user.team_id` 가 단일 컬럼(1인 1팀)이라 Administrative/Functional 병존을 담을 자리가 없어서**다. **"1개인 것"을 준수로 계산 금지.**

### 🔴 형태 유사 함정 — Path Type 검색 시 최우선 오염원

| 오염원 | 실제 의미 | 증거 |
|---|---|---|
| `dep_type ENUM('FS','SS','FF','SF')` | **일정 선후행**(Finish-Start 등) — 감독 경로 아님 | `pm_task_dependencies` |
| `graph_edge` `src→dst` 체인 | **마케팅 귀속 흐름** `influencer→creative→sku→order` | `GraphScore.php:193`,`:207`,`:217` |
| `region` 3축 | 광고 인구통계(`Db.php:681`) · **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) · **WMS 시·도**(`Wms.php:129`·`regionOf():286`) — **REGIONAL_CHAIN 아님** | — |
| `pm_portfolio` "프로그램" | 🔴 **주석 팬텀** — `Handlers/PM/Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0**(`\bprogram\b` = LiveCommerce WebRTC 스트림명뿐) | 규칙 8 |

## 1. 원문 전사 + 판정 — **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | SELF | 부재 · ✅ **인접 선례** = `Dependencies.php:29-31` self-loop 422 차단(**차단이지 경로 타입 아님**) | `ABSENT` |
| 2 | DIRECT | 부재 · ⚠️ `team.manager_user_id` **1홉**이 유일 인접이나 **보고선이 아니라 팀당 1칸**(Type/Priority/Scope 표현 불가 · effective date 0 · 이력 0) | `ABSENT` |
| 3 | PRIMARY_CHAIN | 부재 · 🔴 primary 개념 0(단일값이라 선언할 상대가 없다) | `ABSENT` |
| 4 | ADMINISTRATIVE_CHAIN | 부재 · `app_user.team_id` **단일 컬럼** | `ABSENT` |
| 5 | FUNCTIONAL_CHAIN | 부재 · #4 와 병존 불가(규칙 10) | `ABSENT` |
| 6 | POSITION_CHAIN | 부재 · Position 축 0(§3.1 18/18 `CONTRACT_ONLY`) | `ABSENT` |
| 7 | MATRIX_CHAIN | 부재 · matrix 축 0 | `ABSENT` |
| 8 | PROJECT_CHAIN | 부재 · ⚠️ **유일 인접 `pm_projects.owner_user_id`** = **PARTIAL 미만** — 🔴 **`WHERE owner_user_id` grep 0 = 판독 술어 0 → 저장된 라벨** · 무검증 자유문자열(`Handlers/PM/Projects.php:112-117`) · **기본값이 생성자**(`:66` `?? $g['user_id']`) → 미설정 행과 구분 불가 | `ABSENT` |
| 9 | PROGRAM_CHAIN | 부재 · 🔴 **`pm_portfolio` "프로그램"은 주석 팬텀**(`Handlers/PM/Enterprise.php:13` · 코드에 program 개념 0) | `ABSENT` |
| 10 | REGIONAL_CHAIN | 부재 · 🔴 **Regional Directory 자체가 `ABSENT`** — `region` 3축 전부 **탐지·라우팅·세그먼트이지 명부 아님** · `APAC`/`EMEA`/`LATAM` **0** · ⚠️ **`wms_warehouses.manager VARCHAR(120)`**(`Wms.php:62`/`:112`)은 `region`·`country` 와 **같은 테이블에 공존**해 오독하기 쉬우나 **시설 담당자 자유텍스트**(FK 0 · 판독 술어 0) | `ABSENT` |
| 11 | FINANCIAL_CHAIN | 부재 · ⚠️ `budget_amount`(migration `…168_001:14-15`) = **프로젝트 예산액**이지 승인 권한 아님 · `DATA_SCOPES` `'company'` = **무제한 센티넬**(법인 아님) | `ABSENT` |
| 12 | APPROVAL_ELIGIBLE_CHAIN | 부재 · 🔴 **적격 술어 0** — 승인 4경로 전량 "호출자가 곧 승인자"(`Mapping::approve` 는 **정족수(숫자)뿐**) | `ABSENT` |
| 13 | CROSS_ENTITY_CHAIN | 부재 · Legal Entity 축 0 · ⚠️ **cross-tenant 위험 실재**(`resolveTenantId:200-217` **단일 홉 가정**) | `ABSENT` |

**실측 개수: 13 / 13 전사**(측정기 §49 합계 31 = 필수 필드 18 + Path Type 13 · **본 문서는 13 담당**). 커버리지 = `ABSENT` 13 · 커버 **0**.

★ **원문 Path Type 목록은 `evidence` 로 끝나지 않는다**(타입 열거이며 필드 목록이 아님) — **추가하지 않았다**(규율 규칙 4 반대 편향 방지).

## 2. 규칙

- 🔴 **13종 전부 `ABSENT` 이며 이는 "미구현"이 아니라 축의 부재다.** 경로를 구분할 **관계 타입이 0개**이므로 Path Type 은 §5 Canonical Manager Relationship + §11 Manager Type 이후에만 의미를 갖는다.
- 🔴 **`pm_task_dependencies` 스키마 복제 금지 — 타입별 경로 분리가 불가능해진다.** `Dependencies.php:90-91` 이 **`dep_type` 을 술어에 넣지 않아 전 타입을 무차별 순회**한다. 이 결함을 물려받으면 **13종 Path Type 이 설계 시점에 이미 표현 불가**가 된다. **타입별 경로 계산은 술어 분리가 전제.**
- ★ **알고리즘은 재사용 · 스키마는 신규**가 본 축의 원칙이다. `Dependencies::validateDependency:79-100`(DFS+`$visited`+**매 홉 tenant 술어**)를 **경로 타입 술어를 추가해** 확장하라. 재구현 금지(Golden Rule).
- 🔴 **`dep_type ENUM('FS','SS','FF','SF')` 을 Path Type 선례로 인용 금지** — **일정 선후행**이며 감독 경로가 아니다. ★단 **ENUM 으로 타입을 강제한 몇 안 되는 선례**라는 점은 유효하다(`edge_label VARCHAR(100)` **무검증**과 대비 — 규칙 11: 제약이 **코드로 강제**되는지 보라).
- 🔴 **#9 `PROGRAM_CHAIN` 을 `pm_portfolio` 로 매핑 금지** — **주석이 자칭할 뿐 코드에 program 개념이 0**이다(규칙 8 — 주석을 근거로 삼지 마라).
- 🔴 **#8 `PROJECT_CHAIN` 을 `pm_projects.owner_user_id` 로 매핑 금지** — **판독 술어 0**이라 인가·승인라우팅·감독 효과가 **없는 저장된 라벨**이다. "컬럼이 있다 → 체인이 있다"는 규칙 7 위반.
- ★ **#10 `REGIONAL_CHAIN` 검색 시 `wms_warehouses.manager` 오독 주의** — `region`·`country` 와 같은 테이블에 있어 Regional Manager 로 보이나 **시설 담당자 자유텍스트**(`NAME_ONLY`)다.
</content>
