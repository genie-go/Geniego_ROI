# DSAR — Approval Authority Simulation (§61 필수 필드 33 + §62 Simulation 검증 21 병합)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §61(2435-2493 필수 필드)·§62(2494-2521 Simulation 검증) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §3·§4·§5·§6 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> Simulation Type 축(§61 12종) = [DSAR_APPROVAL_AUTHORITY_SIMULATION_TYPE.md](DSAR_APPROVAL_AUTHORITY_SIMULATION_TYPE.md)

## 0. 현행 실측 (file:line)

### ★대전제 — `Authority Simulation Engine` = **`ABSENT`**(엔티티 전무)

**Authority 를 실집행 없이 평가하는 what-if 시뮬레이터가 0건이다.** `APPROVAL_AUTHORITY_SIMULATION` grep 0. 시뮬레이션이 산출해야 할 후보/충돌(§47/§53)·Resolution(§50/§51)이 전부 부재(ⓑ §6)하고, 검증해야 할 Rule/Threshold/Limit/Currency 판정축도 없다 — **시뮬레이션 입력·출력·검증 3면 모두 대상이 없다**.

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_SIMULATION` 엔티티 | grep **0** | `ABSENT` |
| simulated candidates / conflicts | 🔴 Candidate(§47)·Conflict(§53) 도출 로직 부재(ⓑ §6) | `BLOCKED_PREREQUISITE` |
| Rule 판정(allow/deny/winning) | 🔴 `acl_permission.approve`=장식(소비 핸들러 0·ⓑ §3)·explicit deny 표현 없음(ⓑ §6) | `ABSENT` |
| Threshold / Amount / Currency 검증 | 🔴 금액축 부재(HIGH_VALUE_KRW boolean 상수·ⓑ §4)·환율 저장계층 부재 | `ABSENT` |
| simulation_hash / evidence | ★정본 선례 = `SecurityAudit::verify():56-68`(`:27` 해시·`:63` 재계산·`:64` `hash_equals`+prev·소비자 `AdminGrowth.php:1429`) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

★**시뮬레이션 엔진 자체가 부재하므로 필드 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다.

## 1. 원문 전사 + 판정 — **§61 필수 필드 33**

> ★분모 주의: **측정기 `--sec=61` 총 = 45**(불릿 45) = 필수 필드 **33** + Simulation Type **12**. 본 편은 **필수 필드 33** 담당 · Type 12 는 [별편](DSAR_APPROVAL_AUTHORITY_SIMULATION_TYPE.md). **33 + 12 = 45 로 측정기와 정합.** §62 검증(측정기 `--sec=62` = **21**)은 아래 **§1-b** 에 병합 전사(분모 독립).

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | approval_authority_simulation_id | 엔티티 부재 → PK 없음 | `ABSENT` |
| 2 | simulation_type | [별편](DSAR_APPROVAL_AUTHORITY_SIMULATION_TYPE.md) 12종 전량 미시드(HISTORICAL_REPLAY `ABSENT`·나머지 `NOT_APPLICABLE`) | `ABSENT` |
| 3 | authority_matrix_id | 🔴 Authority Matrix 엔티티 미구축(신설 대상·[별편 MATRIX](DSAR_APPROVAL_AUTHORITY_MATRIX.md)) | `BLOCKED_PREREQUISITE` |
| 4 | authority_matrix_version_id | Matrix·version 선행 전제 미충족 | `BLOCKED_PREREQUISITE` |
| 5 | authority_definition_id | Authority Definition 엔티티 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 6 | authority_version_id | Authority Version 엔티티 선행 미구축(version 6컬럼 전부 하드코딩 태그·ⓑ §5) | `BLOCKED_PREREQUISITE` |
| 7 | subject_id | ★**인접** — `app_user.id`(승인자 신원 실재)이나 **시점 미동결**·시뮬레이션 입력 자격축 없음 | `LEGACY_ADAPTER` |
| 8 | role_id | ★**인접** — `roleRank`(`index.php:554` api-key 등급) ⟂ `team_role`(owner>manager>member) **2축 직교**(양방향 매핑 0·ⓑ §3)·문자열·시점 미동결 | `LEGACY_ADAPTER` |
| 9 | position_id | 🔴 Position 전역 0(ⓑ §3) | `ABSENT` |
| 10 | organization_id | 🔴 `ORGANIZATION_*` backend grep 0 | `ABSENT` |
| 11 | legal_entity_id | 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` 0·ⓑ §4) | `ABSENT` |
| 12 | region | 인접 = `Geo`(IP→ISO→언어) — **Authority 지리 스코프 아님**·시뮬레이션 region 축 없음 | `ABSENT` |
| 13 | country | 인접 = TikTok `country_code` 차원 — Authority country 스코프 아님 | `ABSENT` |
| 14 | authority_domain | 🔴 Authority Domain(§8) 자체 0 | `ABSENT` |
| 15 | authority_type | 🔴 Authority Type(§7) 자체 0 | `ABSENT` |
| 16 | action | 승인 action 축 미보존 · 인접 `action_json`(`Alerting`)=집행 파라미터(pause/updateBudget)이지 authority action 아님 | `ABSENT` |
| 17 | resource_type | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — Authority 리소스 타입 아님(장식) | `ABSENT` |
| 18 | resource_id | Authority 리소스 식별 축 0 | `ABSENT` |
| 19 | original_amount | 🔴 금액축 부재 — 유일 = `HIGH_VALUE_KRW=5000000.0` 상수(`Catalog.php:1016`·boolean 만·ⓑ §4) | `ABSENT` |
| 20 | original_currency | 통화 스코프 0(`currency_scope`/`allowed_currency` 0) | `ABSENT` |
| 21 | comparison_amount | 비교 금액축 0(what-if 금액 대비 대상 없음) | `ABSENT` |
| 22 | comparison_currency | 비교통화 축 0 | `ABSENT` |
| 23 | fx_reference | 🔴 **환율 저장계층 부재** — `app_setting` KV 단일행 덮어쓰기(`Connectors.php:1790`,`:1804-1805`)·`rate_date` 컬럼 없음 → as-of 환율 참조 불가(24h TTL 가드 `:1794-1796`는 신선도만·과거환율 조회 불가) | `ABSENT` |
| 24 | limit_period | 도메인 authority 한도 0 · 인접 = `AutoCampaign:843-889` 예산 기간(마케팅 도메인·승인 아님·ⓑ §4) | `ABSENT` |
| 25 | utilization input | 인접 = `AutoCampaign::periodSpentToDate:855`(마케팅 예산 누적·승인 아님) — 시뮬레이션 입력용 승인 누적사용 축 없음 | `ABSENT` |
| 26 | simulated candidates | 🔴 Candidate 도출(§47) 부재(ⓑ §6) — 시뮬레이터가 산출할 후보 로직 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 27 | simulated conflicts | 🔴 Conflict 탐지(§53) 부재(ⓑ §6) — 산출할 충돌 로직 선행 미구축 | `BLOCKED_PREREQUISITE` |
| 28 | simulated result | 시뮬레이션 판정 결과 축 0(엔진 부재) | `ABSENT` |
| 29 | next level result | 🔴 Chain/level 개념 0(`approval_chain` grep 0·ⓑ §3) | `ABSENT` |
| 30 | manual review result | 수동 검토 게이트·판정 축 0 | `ABSENT` |
| 31 | simulation_hash | ★**정본 선례 = `SecurityAudit::verify():56-68`**(`:27` 해시·`:63` 재계산·`:64` `hash_equals`+prev·소비자 `AdminGrowth.php:1429`) · 🔴`menu_audit_log.hash_chain` 인용 금지(§0) | `LEGACY_ADAPTER` |
| 32 | status | 시뮬레이션 상태 축 0 | `ABSENT` |
| 33 | evidence | 인접 = `pm_audit_log.diff_json`(migration `20260526_168_008:13`)+append-only(`:2-3`)+3인덱스(`:17-19`)·`SecurityAudit` — 근거 저장 패턴 실재 | `LEGACY_ADAPTER` |

**실측 개수: 33 / 33 전사.** (측정기 §61 총 45 = 필드 33 + Type 12 · 본 편 필드 **33** · 전사 **33** — 분해 후 정합)
원문 필수 필드가 `evidence` 로 **끝난다**(`:2473`) → 규칙 4 충족.

§61 필드 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 4(7·8·31·33) · `BLOCKED_PREREQUISITE` 6(3·4·5·6·26·27) · `ABSENT` 23.

## 1-b. §62 Simulation 검증 전사 + 판정 — **원문 21종**(측정기 `--sec=62` = 21)

> ★분모 주의: **측정기 `--sec=62` = 21**(불릿 21). 본 편 헤더 지시서의 "검증 20"은 **수기 과소계수** — 마지막 항목 `Active Task 영향` 누락(§60 §55 와 동일한 "목록 끝 항목 누락" 편향). §61 필드(33)와 **합산하지 않는다**(검증축은 독립 분모). 아래 21항은 §1 필드축과 근접 대응.

| # | 원문 검증 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Authority Candidate | 🔴 Candidate 도출(§47) 부재(ⓑ §6) — 검증할 후보 없음 | `ABSENT` |
| 2 | Allow Rule | 🔴 `acl_permission.approve`=장식(승인 가부 판정 핸들러 0·ⓑ §3) | `ABSENT` |
| 3 | Deny Rule | 🔴 explicit deny 표현 없음 — `acl_permission`=allow-only(ⓑ §6) | `ABSENT` |
| 4 | Winning Rule | 🔴 Resolution(§50/§51)·우선순위 판정 부재(ⓑ §6) | `ABSENT` |
| 5 | Threshold Match | 🔴 임계 부재 — HIGH_VALUE_KRW boolean 상수만(ⓑ §4) | `ABSENT` |
| 6 | Threshold Gap | 🔴 임계 부재 → gap 검증 무발동(§65 gap=미구현·ⓑ §8) | `ABSENT` |
| 7 | Threshold Overlap | 🔴 임계 부재 → overlap 검증 무발동 | `ABSENT` |
| 8 | Currency Conversion | 인접 = `fxToKrw:1749`/`krwToCurrency:1763`(실 변환 함수)이나 **시뮬레이션 통화검증 배선 아님**·비교통화 축 0 | `ABSENT` |
| 9 | FX Rate 상태 | ★**인접 실재** — `Connectors:1794-1796` **24h TTL 신선도 가드**(`$age<86400` 만료 시 라이브 재조회) = 환율 상태 판정 로직(단 신선도만·`rate_date` 없어 as-of 상태 불가·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 10 | Period Limit | 🔴 도메인 authority 한도 0(인접 AutoCampaign 마케팅·ⓑ §4) | `ABSENT` |
| 11 | Utilization | 🔴 승인 누적사용량 축 0(인접 `periodSpentToDate:855` 마케팅) | `ABSENT` |
| 12 | Remaining Authority | 🔴 잔여 한도 축 0(monetary authority 부재) | `ABSENT` |
| 13 | Legal Entity Match | 🔴 Legal Entity 0(ⓑ §4) | `ABSENT` |
| 14 | Resource Match | 🔴 Authority 리소스 매칭 축 0(인접 acl scopeSql=데이터-행 필터·§1 #17) | `ABSENT` |
| 15 | Action Match | 🔴 authority action 축 미보존(§1 #16) | `ABSENT` |
| 16 | Self-approval | ★**인접 실재** — `Mapping::approve` 자기승인차단(`:268`) = 실 방어(단 **Mapping 1경로만**·catalog/action_request/admin_growth 3경로 미방어·ⓑ §8) | `LEGACY_ADAPTER` |
| 17 | SoD Hook | 🔴 SoD(직무분리) 프레임워크 부재 — self-approval 단건 방어 외 SoD 규칙엔진 0 | `ABSENT` |
| 18 | Next Level Requirement | 🔴 Chain/level 개념 0(ⓑ §3)·`required_approvals`=리터럴 2(`Mapping:209`) 상수 | `ABSENT` |
| 19 | Manual Review | 🔴 수동 검토 게이트·판정 축 0 | `ABSENT` |
| 20 | Version 간 차이 | 🔴 불변 prev-링크 버전체인 선례 0(ⓑ §5) → MATRIX_VERSION_COMPARISON 대상 없음 | `ABSENT` |
| 21 | Active Task 영향 | 🔴 Task 모델 부재·변경-영향 재계산 부재([CHANGE_IMPACT 편](DSAR_APPROVAL_AUTHORITY_CHANGE_IMPACT.md) §60) ★**측정기가 살린 21번째(수기 누락)** | `ABSENT` |

**실측 개수: 21 / 21 전사.** (측정기 §62 분모 **21** · 전사 **21** — 정합)
원문 검증이 "Active Task 영향"으로 **끝난다**(`:2519`) → 규칙 4 충족.

§62 검증 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 2(9 FX Rate 상태·16 Self-approval) · `ABSENT` 19.

---

**본 편 합계: §61 필드 33 + §62 검증 21 = 54 종 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6(필드 7·8·31·33 + 검증 9·16) · `BLOCKED_PREREQUISITE` 6(필드 3·4·5·6·26·27) · `ABSENT` 42.

> 🔴 **커버 0.** Simulation 엔진이 통째로 부재하므로 어떤 필드·검증도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 6건은 **확장 대상 인접 자산**(simulation_hash=SecurityAudit·evidence=pm_audit_log·subject/role=app_user/roleRank·FX Rate 상태=24h TTL·Self-approval=Mapping:268)이지 커버가 아니다 — 전부 **시뮬레이션 맥락에 미배선**. `BLOCKED_PREREQUISITE` 6건은 **Authority Matrix/Version(§1 #3~6)·Candidate/Conflict(§47/§53·#26·#27) 선행 구축이 전제**.

## 2. 규칙

- 🔴 **§2 부작용 금지 — 시뮬레이션은 실 Authority Utilization/Task/Decision 을 생성하지 않아야 한다**(원문 `:2490`). 시뮬레이터는 승인 4경로의 실 상태전이(`Catalog::approveQueue:2341-2365`·`Mapping::approve:238-294`·`AdAdapters::pause`)를 **호출해서는 안 되며**, 순수 계산 경로로 분리해야 한다. AutoCampaign 예산 차감(`:864`)처럼 부작용 있는 코드를 재사용하면 §2 위반.
- 🔴 **`simulated candidates`/`simulated conflicts`(#26·#27)는 `BLOCKED_PREREQUISITE`** — Candidate(§47)·Conflict(§53) 도출 로직이 실 승인 경로에 먼저 구축돼야 시뮬레이션이 "같은 로직을 dry-run" 할 수 있다. 시뮬레이터에만 별도 후보 로직을 만들면 실집행과 결과가 갈리는 **이중 엔진**(금지).
- ★**`simulation_hash`(#31)·`evidence`(#33) → `SecurityAudit::verify():56-68` 를 정본 선례로 삼으라**(`hash_equals`+prev 연결·실 소비자 `AdminGrowth.php:1429`). 🔴 **`menu_audit_log` 를 선례로 삼지 마라**(tenant_id 없음·검증기 없음·preimage 재구성 불가 = 검증 불가능한 장식·가짜 녹색 상속). ⚠️ `SecurityAudit` 잠복결함 2건(tenant 술어 없음·actor 190자 절단) 이식 시 선결.
- 🔴 **`FX Rate 상태`(#9)를 "구현됨"으로 오표기 금지** — 24h TTL 신선도 가드(`Connectors:1794-1796`)는 **현재 환율의 신선도**만 판정한다. 시뮬레이션이 요구하는 **as-of 시점 환율 상태**는 `rate_date` 저장계층 신설(§27)이 선행이며, 세율(`kr_fee_rule.effective_from`)과 달리 저장계층부터 부재다.
- 🔴 **`Self-approval`(#16)만 부분 방어됨을 명심** — `Mapping:268` 은 4경로 중 1경로만 막는다. 시뮬레이션 검증이 self-approval 을 `PASS` 로 표기해도 catalog/action_request/admin_growth 실경로는 무방비(ⓑ §8) → 시뮬레이션과 실집행의 검증 커버리지 불일치를 유발하지 않도록 실 3경로 방어가 선결.
- 🔴 **금액/통화/FX/한도·Threshold 축(필드 19~25·검증 5~12)은 저장계층부터 부재**(ⓑ §4). 시뮬레이션이 이 축들을 검증하려면 §24 Amount Band·§26 Currency Scope·§27 FX Reference·§30 Limit Period 가 선행 구축돼야 한다 — 플래그가 능력을 초과 선언하면 §65 "Amount 초과인데 승인 성공" gap 을 시뮬레이션이 **재현하지 못한다**.
- 🔴 **코드 변경 0 유지** — 시뮬레이션 엔진 신설은 Authority Matrix/Version/Candidate/Conflict 선행 구축 후 **별도 승인세션**(Golden Rule + verify + 배포승인).
