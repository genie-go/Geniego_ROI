# DSAR — Division Profile (§26)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §26 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_DIVISION_PROFILE` | **grep 0** | `ABSENT` |
| `division` (대소문자 무시) | **backend/src 전역 0 히트** (289차 재실측) | `ABSENT`(이름축) |
| Division 능력(BU↔Department 사이의 중간 조직 계층) | 조직 단위 엔티티 0 · 조직 간 부모-자식 간선 0 · `hierarch` grep 0 | `ABSENT`(능력축) |
| `business_unit` (§26 `business unit reference` 의 대상) | 유일 히트 = Trustpilot 자격증명(`ChannelSync.php:2573-2580`·`ChannelRegistry.php:126`) — 무관 | `ABSENT` |
| functional / regional scope | `data_scope`(`TeamPermissions.php:160-166`) = `tenant_id·subject_type·subject_id·scope_type·scope_values·updated_at` — **`parent_*`·`path`·`depth`·`ancestor` 전무** | `KEEP_SEPARATE_WITH_REASON` |

**★부재는 이름·능력 양쪽 확인 후 `ABSENT`(규율 7·8).** 이름 grep 0 만으로는 부족하므로 능력축도 확인했다: Division 이 성립하려면 **BU→Division→Department 의 3단 이상 조직 체인**이 필요하다. 레포의 유일한 부모-자식 간선 `app_user.parent_user_id` 는 **전 생성 경로가 owner 직속 2단으로 봉인**(`UserAuth.php:1226-1227`·`EnterpriseAuth.php:500`·`UserAuth.php:1574/1581`·`:670`)되어 **3단을 만드는 경로가 존재하지 않는다**. 순회도 **단일 홉**(`resolveTenantId` `UserAuth.php:200-217` — `LIMIT 1` 1회 후 즉시 return·재귀 없음). → 이름·능력 **양쪽 부재 확정.**

## 1. 원문 전사 + 판정 — **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | division profile id | 부재 | `ABSENT` |
| 2 | organization unit id | 부재 — 조직 단위 엔티티 자체가 없음 | `ABSENT` |
| 3 | division code | 부재 — `division` grep 0 | `ABSENT` |
| 4 | business unit reference | 부재 — 참조 대상(BU)이 없음(§25) | `ABSENT` |
| 5 | division owner reference | 부재 · 인접 = `team.manager_user_id`(`TeamPermissions.php:148`) — 팀 관리자, Division 아님 | `ABSENT` |
| 6 | legal entity scope | 부재 · ★**`DATA_SCOPES` 의 `'company'`(`TeamPermissions.php:41`)를 법인 스코프로 읽지 마라** — `effectiveScope():258` `if ($st === 'company') return null; // 전사 = 무제한` = **경계를 긋는 게 아니라 지우는 센티넬** | `KEEP_SEPARATE_WITH_REASON` |
| 7 | functional scope | 부재(조직 기능 스코프) · 인접 = `data_scope.scope_type` 9종(`:41`) — **단일 차원 평면 필터**(`:277` `if ($sc['scope_type'] !== $dimension) return null;` · `:311` 주석 자인 "사용자는 단일 scope_type만") | `KEEP_SEPARATE_WITH_REASON` |
| 8 | regional scope | 부재(조직 Region) · `region` 3축 병존 전부 무관(§30) | `ABSENT` |
| 9 | default approval hierarchy | 부재 — 승인 계층 엔티티 전무 | `ABSENT` |
| 10 | valid_from | 부재 · 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`) — 채널 수수료 도메인 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | valid_to | 부재 — `valid_to`/`effective_to` **grep 0** | `ABSENT` |
| 12 | status | 부재(Division) · 형태 인접 = `team.status`(`TeamPermissions.php:148`) | `KEEP_SEPARATE_WITH_REASON` |
| 13 | evidence | 부재 | `ABSENT` |

**실측 개수: 13 / 13 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `ABSENT` 8 · `KEEP_SEPARATE_WITH_REASON` 5.

## 2. 규칙

- 🔴 **`data_scope` 를 `legal entity scope`/`functional scope`/`regional scope` 의 커버로 계산 금지.** 세 가지 이유가 각각 독립적으로 치명적이다:
  ① **`'company'` = 무제한 센티넬**(`:258` `return null`) — 법인 경계를 긋는 게 아니라 **지운다**. 이름만 보고 Legal Entity Scope 로 계산하면 **의미가 정반대**가 된다.
  ② **단일 차원** — 사용자는 scope_type 을 하나만 가진다(`:277`·`:311` 주석 자인). §26 은 legal/functional/regional **3축 동시 보유**를 요구하므로 구조적으로 표현 불가.
  ③ **상속 아님** — SQL 이 `IN` 절 1개(`:286-293` `AND {$column} IN (?,?,…)`)이고 **조상/후손 확장이 없다** · effect 는 INCLUDE 고정.
- 🔴 **`TeamPermissions.php:230` 주석의 "팀 스코프 상속"을 근거로 삼지 마라(규율 10).** 실제 코드는 상속이 아니라 **폴백**이다(`:253-254` — user 에 없으면 team **1회** 조회. 단일 홉·비재귀·중첩 불가). **부모 팀 컬럼이 없으므로 구조적으로 불가능**하다.
- 🔴 권한 "상속"도 조직 전파가 아니라 **하향 클램프**다(`:382-389`·`:396-402` `clampActions` — 팀 권한을 **상한**으로 멤버 권한을 교집합 축소). Division→Department 하향 전파의 선례로 인용하면 오염이다.
- ⚠️ **`data_scope` 런타임 행 수 미확인** — `:255-256` "미설정=무제한"이므로 행이 0이면 배선 5곳(`AdPerformance.php:26`·`Wms.php:1291`·`Catalog.php:981-983`)은 전부 no-op 이다. **"실사용 중인 ABAC"으로 단정 금지** — 라이브 `SELECT COUNT(*) FROM data_scope` 권장.
- Division 신설 시 **`data_scope` 재구현 금지·확장만**(헌법 Golden Rule). 조직 계층은 **별도 축**으로 두고 `data_scope` 와의 관계는 명시적 바인딩으로 표현하라.
- 🔴 13종 **"있다고 가정"하고 배선 금지.**
