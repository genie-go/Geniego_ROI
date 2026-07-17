# DSAR — Squad Profile (§29)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §29 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `ORGANIZATION_SQUAD_PROFILE` | **grep 0** | `ABSENT` |
| `squad` (대소문자 무시) | **backend/src 전역 0 히트** (289차 재실측) | `ABSENT`(이름축) |
| Squad 능력(Team/Department 하위 임시 조직) | 조직 단위 엔티티 0 · `team` 에 `parent_team_id` 없음(`TeamPermissions.php:145-151`) · 조직 간 간선 0 | `ABSENT`(능력축) |
| `team reference`/`department reference` 의 대상 | 조직 Team **부재**(§28 — `team` 은 사용자 그룹) · Department **0**(§27) | `ABSENT` |
| temporary(한시 조직) | **한시성·종료일 개념 전무** — `valid_to`/`effective_to` **grep 0** | `ABSENT` |
| 종료 후 재평가 Hook | **재평가 Hook 인프라 전무** · ⚠️ `ensureTables` 는 **테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → 소급 재계산 집행 수단 부재 | `ABSENT` |

**★능력축 부재증명(규율 8).** Squad 는 §29 가 `team reference` + `department reference` + **한시성(temporary + 종료일)** + **종료 후 재평가 Hook** 을 요구하는 **가장 동적인 조직 단위**다. 레포에는 ⓐ 조직 단위 엔티티 0 ⓑ 조직 간선 0 ⓒ **폐구간(valid_from/valid_to) 모델 0** ⓓ **이벤트 Hook 기반 소급 재평가 0** — **네 축 전부 부재**다. 이름 grep 0 과 능력 grep 0 이 일치한다.

## 1. 원문 전사 + 판정 — **원문 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | squad profile id | 부재 | `ABSENT` |
| 2 | organization unit id | 부재 — 조직 단위 엔티티 자체가 없음 | `ABSENT` |
| 3 | squad code | 부재 — `squad` grep 0 | `ABSENT` |
| 4 | team reference | 부재 — 참조 대상(조직 Team) 부재(§28) | `ABSENT` |
| 5 | department reference | 부재 — 참조 대상(Department) 부재(§27) | `ABSENT` |
| 6 | product reference | 부재(Squad↔Product 바인딩) · 인접 = `catalog_*` 상품 도메인 — 조직 귀속 없음 | `ABSENT` |
| 7 | project reference | 부재(Squad↔Project 바인딩) · 인접 = PM 도메인(`PM/*`) — 조직 참조 없음 | `ABSENT` |
| 8 | temporary 여부 | 부재 — 한시 조직 플래그 전무 | `ABSENT` |
| 9 | squad lead reference | 부재 · 인접 = `team.manager_user_id`(`TeamPermissions.php:148`) — 사용자 그룹의 관리자, Squad lead 아님 | `ABSENT` |
| 10 | valid_from | 부재 · 유일 선례 `kr_fee_rule.effective_from`(`Db.php:898`) — 채널 수수료 도메인 | `KEEP_SEPARATE_WITH_REASON` |
| 11 | valid_to | 부재 — `valid_to`/`effective_to` **grep 0** → **§29 의 종료일 요구는 순수 신규** | `ABSENT` |
| 12 | status | 부재(Squad) · 형태 인접 = `team.status`(`TeamPermissions.php:148`) | `KEEP_SEPARATE_WITH_REASON` |
| 13 | evidence | 부재 | `ABSENT` |

**실측 개수: 13 / 13 전사.** 커버리지 = `VALIDATED_LEGACY` **0** · `ABSENT` 11 · `KEEP_SEPARATE_WITH_REASON` 2.

### 원문 부가 규율 (필드 축 외 — 전사 2건)

| # | 원문 (스펙 `:1369`·`:1371`) | 현행 대조 | 판정 |
|---|---|---|---|
| a | **Temporary Squad에는 종료일을 요구한다.** | `valid_to` 컬럼 자체가 전역 0 → 요구할 대상이 없음 | `ABSENT` |
| b | **Temporary Squad 종료 후 Membership과 Approval Route 재평가 Hook을 생성하라.** | Hook 인프라 0 · Membership 엔티티 0 · Approval Route 0 · 소급 재계산 집행 수단 0(`ensureTables` 는 백필 불가) | `ABSENT` |

## 2. 규칙

- 🔴 **§29 는 4축 전부 신규다** — 조직 단위 · 조직 간선 · 폐구간 시점 · 재평가 Hook. 어느 하나도 "확장할 기존 자산"이 없다. **"있다고 가정"하고 배선 금지.**
- **`valid_to` 는 폐구간 신규 모델이다.** 유일 선례 `kr_fee_rule.effective_from` 은 **개구간(최신승)**이며 읽기가 전부 `ORDER BY effective_from DESC LIMIT 1`(`Pnl.php:454`·`KrChannel.php:102`·`:151`·`:459`) · **`WHERE effective_from <= :as_of` 술어는 backend/src 전역 0건** · **`effective_to` 컬럼 없음**. 🔴 **"effective date 선례 있음"을 폐구간 선례로 확대 인용하면 오염이다** — 컬럼 형태까지만 선례다.
- **재평가 Hook(부가규율 b)의 집행 제약이 사활적이다.** `backend/migrations/` 는 **172차에서 정지**(최신 `20260527_172_002_coupon_tables.sql`)했고 이후 스키마는 전부 핸들러별 `ensureTables` 자가치유다. ★**`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → **Squad 종료 시 Membership/Approval Route 소급 재평가를 집행할 수단이 현재 존재하지 않는다.** Hook 설계 시 **집행 경로(워커·배치)를 함께 설계**해야 하며, 스키마만 추가하고 "Hook 있음"으로 표기하면 `CONTRACT_ONLY`(계약만·실코드 0)가 된다.
- 🔴 **`team` 을 Squad 로 겸용 금지.** §28 에서 이미 조직 Team 이 아님이 확정됐고, Squad 는 그 **하위**다. 부모가 없는 테이블에 손자를 매달 수 없다.
- Squad 신설 시 **전용 테이블 금지** — §25~§31 을 **하나의 조직 단위 테이블 + 하나의 조직 간선 테이블**로 표현하라(다중 엔진 금지). Squad 고유 속성(temporary·lead·product/project 바인딩)은 **단위 테이블의 타입별 속성**으로 둔다.
- 순환 방어는 **`PM/Dependencies::validateDependency` 패턴 확장이 정본**(`PM/Dependencies.php:79-100` — 반복형 DFS + 명시적 `$visited` + tenant 필터 + 최대깊이 10000 + **쓰기 전 차단** `:32-34` → 422 `cycle_detected` + self-loop 차단 `:29-31`). 재귀 CTE 는 `WITH RECURSIVE` **backend/src 0** 이고 `Db::sql()`(`Db.php:177-191`)이 **DDL 전용 번역기**라 레포 관례에 반한다.
