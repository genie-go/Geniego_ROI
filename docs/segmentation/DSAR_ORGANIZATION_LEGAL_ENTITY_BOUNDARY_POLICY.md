# DSAR — Legal Entity Boundary Guard (§24)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §24 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **Legal Entity** | `legal_entity`·`legalEntity`·`entity_code`·`biz_no`·`brn`·`corp_reg`·`tax_id` **전역 grep 0**(§23 참조) | **`ABSENT`** |
| **Organization Unit** | `org_unit`/`organization_unit` **전역 0** · 삭제 이력도 **0**(`git log --all -S "org_unit"` 0) | `ABSENT` |
| **Boundary Guard** | 차단 대상 9종의 **주어(Legal Entity)와 목적어(Organization Unit)가 모두 부재** | `NOT_APPLICABLE` |
| 유일 parent edge | `app_user.parent_user_id`(`UserAuth.php:156-167`) — **2단 봉인 · 동일 tenant 상속**(`:197`·`:214`) · 순회 단일 홉(`:200-217`) | 은폐 대상 없음 |
| 테넌트 격리 강제 | **REAL** — `index.php:600` 무조건 덮어쓰기 · `:585` fail-closed · `:429-442` 세션 주입 | **재사용 강제**(§24-5 하부구조) |
| 시점 모델 | `kr_fee_rule.effective_from`(`Db.php:898`) **개구간·최신승** · **`effective_to` 없음** · **as-of 술어 전역 0** | **중첩 검사 능력 부재** |
| 쓰기 전 차단 선례 | `PM/Dependencies::validateDependency`(`PM/Dependencies.php:79-100`) — 반복 DFS + `$visited` + tenant 필터 + 최대깊이 10000 + **쓰기 전 422 `cycle_detected`**(`:32-34`) · self-loop 차단(`:29-31`) | **정본 선례** |
| 🔴 참조 금지 선례 | `Alerting::executeAction`(`Alerting.php:601-660`) — `:612` 에서 `status` 를 SELECT 하고도 **판독하지 않아** `pending`·`rejected` 도 실집행(승인 우회). `INSERT INTO action_request` grep 0 → 현재 `VACUOUS` | **가드 참조 구현 금지** |

### ★가장 중요한 축 주의 — "현행이 §24 를 위반하지 않는다" 는 충족이 아니다
차단 9종은 **전부 대상 부재**다. 현행 코드가 이 9종을 유발하지 않는 이유는 **가드가 있어서가 아니라 Legal Entity 도 Organization Unit 도 존재한 적이 없기 때문**이다. 🔴 **"위반 0" 을 커버리지로 기록하면 갭이 정의상 소멸하는 역산이다.** 판정은 전부 `NOT_APPLICABLE`(부재 → 신설)이며 **`VALIDATED_LEGACY` 는 0 건**이다.

### ★두 번째 함정 — `'company'` 스코프를 경계 가드로 오인 금지
`DATA_SCOPES` 의 `'company'`(`TeamPermissions.php:41`)는 **`effectiveScope():258` 에서 `return null` = 무제한 센티넬**이다. **법인 경계를 긋는 게 아니라 지운다** → §24 의 **가드가 아니라 정반대 방향의 코드**다. 상세는 [DSAR_ORGANIZATION_LEGAL_ENTITY_BINDING.md](DSAR_ORGANIZATION_LEGAL_ENTITY_BINDING.md) §0.

## 1. 원문 전사 + 판정 — **원문 9종**(차단 대상)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Legal Entity가 없는 Financial Organization Unit | **대상 부재** — Legal Entity 0 · Organization Unit 0. 재무 조직 개념은 `ORG_PRESET` **'재무팀'**(`TeamPermissions.php:717`) **문자열 열거**뿐이며 `team` DDL(`:145-151`/`:168`)에 **`parent_team_id` 도 법인 참조도 없다** | `NOT_APPLICABLE` |
| 2 | 존재하지 않는 Legal Entity Binding | **대상 부재** — 바인딩 레코드 타입 0. 인접 FK 무결성 선례: `agency_client_link` 의 **`UNIQUE(agency_id, client_tenant_id)`**(`AgencyPortal.php:64-72`) · 매요청 **fail-closed 재검증**(`:414-432` 세션→링크 재조회 `:423` → `status!=='approved'` 이면 null `:427`) | `LEGACY_ADAPTER`(재검증 선례) |
| 3 | 동시에 여러 Primary Legal Entity | **대상 부재** — primary 플래그 0. 유일성 강제 선례는 전건 **전체 UNIQUE**(`UNIQUE(agency_id,client_tenant_id)` · `UNIQUE(tenant_id,name)` `Catalog.php:151-169` · `UNIQUE(channel_key)` `ChannelRegistry.php:32-49`)이며 **조건부/부분 UNIQUE(= primary 단일성) 선례 0** | `NOT_APPLICABLE` |
| 4 | Effective Period가 중첩된 Primary Binding | **대상 부재 + 능력 부재** — 🔴 현행 시점 모델은 **개구간**(`effective_from` 만 · `effective_to` **grep 0**) + **최신승 조회**(`ORDER BY effective_from DESC LIMIT 1` — `Pnl.php:454`·`KrChannel.php:102`,`:151`,`:459`) · **`WHERE effective_from <= :as_of` 전역 0건**. **중첩을 검사할 구간 자체가 표현되지 않는다** | `NOT_APPLICABLE` |
| 5 | 다른 Tenant Legal Entity Binding | **대상 부재** · ★**하부구조는 REAL** — 인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기**(`index.php:600`) · strict fail-closed(`:585`). 크로스테넌트 위임은 `agency_client_link` 로만 가능하며 **매요청 재검증 + 세션↔링크 tenant 불일치 방어**(`AgencyPortal.php:428`) | `LEGACY_ADAPTER`(격리 강제선) |
| 6 | 일반 Parent Edge로 Cross-entity 관계 은폐 | **대상 부재** — 레포 유일 부모-자식 간선 `app_user.parent_user_id` 는 **전 생성 경로가 owner 직속 2단**(`UserAuth.php:1226-1227` 주석 `:1225` *"항상 최상위 owner 에 종속"* · `EnterpriseAuth.php:500` · `UserAuth.php:1574/1581` · `:670`)이고 **동일 tenant 를 물려받는다**(`:197`·`:214`) → **은폐할 cross-entity 관계가 성립 불가**. 🔴 단 **조직 엣지 신설 시 이 금지가 즉시 활성**된다 | `NOT_APPLICABLE` |
| 7 | Funding Entity와 Payout Entity 불일치 미표시 | **대상 부재** — funding/payout entity 플래그 0 · treasury **0** · ERP/finance 커넥터 **0**(`ChannelRegistry.php:12`,`:79` `group_type` 열거에 `erp`·`finance`·`hr` 값 없음) | `NOT_APPLICABLE` |
| 8 | 회계 책임 Entity 없는 Settlement Organization | **대상 부재** — `settlement` 은 **메뉴 키**(`TeamPermissions.php:717` 재무팀 perms)이지 조직도 엔티티도 아님. `pnl_vat_summary` tenant 키(`Pnl.php:402-423`)는 **구독자별 리포트** | `NOT_APPLICABLE` |
| 9 | 종료된 Legal Entity에 신규 Organization Binding | **대상 부재 + 능력 부재** — 종료(termination) 상태 0 · **`valid_to`/`effective_to` grep 0** → **"종료됨"을 판정할 필드가 없다**. 인접 상태 선례 = `agency_client_link.status`(pending/approved/revoked · `revoked_at` `AgencyPortal.php:64-72`) | `LEGACY_ADAPTER`(상태·revoke 선례) |

**실측 개수: 9 / 9 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부재 6 · 어댑터 3.

## 2. 규칙

- 🔴 **"현행 위반 0" 을 §24 충족으로 기록 금지.** 주어(Legal Entity)와 목적어(Organization Unit)가 **양쪽 다 부재**해 위반 대상이 없을 뿐이다. **공백이지 가드가 아니다.**
- 🔴 **`'company'` 스코프를 경계 가드로 오인 금지** — `TeamPermissions.php:258` 무제한 센티넬(방향이 정반대).
- 🔴 **"테넌트 = 법인" 가정 금지.** 이 가정을 넣으면 §24-5(다른 Tenant Legal Entity Binding)가 `index.php:600` 으로 **자명 충족**이 되고 나머지 8종도 연쇄 소멸한다 — 전형적 역산.
- **가드는 쓰기 전 차단이어야 한다 — 정본 선례 = `PM/Dependencies::validateDependency`**(`PM/Dependencies.php:79-100`): 반복 DFS + 명시적 `$visited` + **tenant 필터** + 깊이캡 + **쓰기 전 422 `cycle_detected`**(`:32-34`). 9종 전부 이 패턴(**INSERT/UPDATE 이전 검증 → 4xx**)으로 집행하라. **사후 탐지·경고 배지로 격하 금지.**
- 🔴 **`Alerting::executeAction`(`Alerting.php:601-660`)을 가드 참조 구현으로 삼지 마라** — `status` 를 **SELECT 하고 판독하지 않는** 무게이트 집행(현재 생산자 0 → `VACUOUS` 이나 **배선 시 즉시 활성 결함**). 5-3-2 가 12개 문서를 오염시킨 팬텀 계열이다.
- **§24-4(중첩 Primary) 는 §23 폐구간 모델 없이는 집행 불가**다 — `effective_to` 신설이 **선행 조건**. 현행 `kr_fee_rule` 의 **개구간·최신승** 패턴을 복제하면 §24-4 가 **영구히 집행 불가**가 된다(무후퇴 위반).
- **§24-9(종료 엔티티) 는 `agency_client_link` 의 `status`(pending/approved/revoked) + `revoked_at` 패턴 확장.** 신규 상태 어휘 발명 금지.
- **§24-5 는 `index.php:600` 격리 강제선 아래에서 동작해야 한다** — 바인딩이 격리를 우회하는 경로를 만들면 §21 원문 금지(`Tenant Isolation을 우회하는 일반 Organization Edge로 사용하지 마라`)를 동시 위반한다.
- **§24-6 은 조직 엣지 신설 즉시 활성된다.** 현행이 안전한 이유는 `parent_user_id` 가 **2단으로 봉인**되어 있기 때문이므로, **다단 엣지를 도입하는 순간 이 금지의 집행 코드가 함께 들어가야 한다**(나중에 추가 = 무방비 창구).
- **스키마·집행 제약**(§20): `backend/migrations/` 172차 정지 → `ensureTables` 멱등 패턴 · **MySQL/SQLite 두 방언 동시 작성** · 🔴 **`ensureTables` 는 백필을 하지 않는다** → 가드 도입 시 **기존 위반 행 정정 수단이 없다**. 최초 도입은 **신규 쓰기부터 fail-closed** 로 설계하고 기존 행 이행 경로를 별도 명시하라.
- **회귀 커버리지 0 인식**: `tools/e2e/` 3종(`smoke.mjs`·`render.mjs`·`scenarios.mjs`)에 `organization|hierarchy|org_unit|sso|scim` **grep 0** — 9종 가드는 **E2E 시나리오 동반 없이는 완료가 아니다**.
