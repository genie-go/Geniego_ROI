# DSAR — Cache 원칙 (§69)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §69 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

### 0.1 🔴🔴 대전제 — **서버 캐시 계층 자체가 부재한다**

§69 전체를 지배하는 단 하나의 사실이다.

| 축 | 실측 | 판정 |
|---|---|---|
| Redis | `backend/src` grep **0** | `ABSENT` |
| Memcached | `backend/src` grep **0** | `ABSENT` |
| `apcu_*` | `SystemMetrics.php:225-451` **전용** — `apcu_cache_info`/`apcu_sma_info`(`:225`,`:235-236`) = **지표 보고** · `apcu_fetch`/`apcu_store`(`:428-442`) = 요청/에러 카운터·부트 타임 · `apcu_inc`(`:451-455`) = 요청 계수(TTL 60s) | 🔴 **캐시 API 아님 — 관측성 전용** |
| 프론트 캐시 | `g_admin_menu_tree_cache`(`MenuVisibilityContext.jsx:28`) — localStorage 트리 캐시 · TTL `CACHE_TTL_MS = 5 * 60 * 1000`(`:29`) · 사용자 선호 `g_user_menu_visibility`(`:27`) | **브라우저 로컬 · 서버 캐시 아님** |

**→ §69 의 캐시 전략은 `순수 신규` 다.** 확장할 캐시 엔진이 없다.

🔴 **`apcu_*` 를 캐시 계층으로 오독하지 마라.** 27개 호출이 전부 `SystemMetrics` 안에 있고, 목적이 **지표 수집**이다. 규율 8(부재증명은 이름이 아니라 능력으로)의 **역방향 적용**이다 — 이름(`apcu_store`/`apcu_fetch`)은 캐시 API 이지만 **능력(계층·무효화·키 규약·테넌트 격리)이 없다**. **이름을 보고 "캐시 있음"으로 계산하면 §69 요구가 정의상 소멸한다.**

### 0.2 ★프론트 트리 캐시 = 유일한 실 트리 캐시 · 반례로서 가치

`MenuVisibilityContext.jsx:27-29`:
```
const USER_PREFS_KEY = 'g_user_menu_visibility';
const ADMIN_TREE_CACHE_KEY = 'g_admin_menu_tree_cache';
const CACHE_TTL_MS = 5 * 60 * 1000;
```

**§69 필수 키 8종 대비 실측**: `tenant_id` **없음** · `hierarchy_id` **없음** · `version` **없음** · `effective_date` **없음** — **키가 상수 1개다.** 무효화 = **TTL 5분 만료뿐**(활성화·엣지 변경 이벤트 연동 0).

★**이것이 반례로서 결정적이다**: `menu_tree` 는 **`tenant_id` 컬럼 자체가 없는 전역 단일 트리**이므로 상수 키가 성립했다. **조직 계층은 테넌트별이다** — 동일 패턴을 복제하면 **테넌트 간 트리 누출**이 된다.
> 🔴 **286차 사고 재현 위험**: `platform_growth` act-as 가 **localStorage 고착**으로 전 메뉴를 빈 화면으로 만들었다. **localStorage 트리 캐시 + 테넌트 축 부재 = 정확히 그 사고의 재료다.**

### 0.3 ★버전 인식 캐시의 전제가 없다

| §69 필수 키 | 현행 대응물 | 실측 |
|---|---|---|
| `tenant_id` | **REAL**(`index.php:600` 무조건 덮어쓰기) | 유일하게 확보된 축 |
| `hierarchy_id` | 부재 — `hierarch` grep **0** | `ABSENT` |
| `hierarchy_version_id` | 부재 — **엔티티 version 축이 `menu_defaults.version` 단 1건**(`AdminMenu.php:120`) · `\bversion\b` 40건 전부 API/DB/벤더 버전 문자열 · **optimistic lock `version` grep 0** | `ABSENT` |
| `effective_date` | 부재 — 🔴 **`WHERE effective_from <= :as_of` 전역 0건** · 유일 컬럼 `kr_fee_rule.effective_from`(`Db.php:898`)도 **읽기 전부 최신승** · **`effective_to` 없음** | `ABSENT` |
| `organization_unit_id` | 부재 | `ABSENT` |
| `relationship_type` | 부재 — 관계 타입 축 0. 인접 = `graph_edge.edge_label`(`Db.php:834`) **자유문자열**(마케팅 도메인) | `ABSENT` |
| `legal_entity scope` | 부재 — **법인 엔티티 0**. 🔴 `'company'` 는 **무제한 센티넬**(`TeamPermissions.php:258` `if ($st === 'company') return null; // 전사 = 무제한`) | `ABSENT` — 🔴 **캐시 키에 넣으면 "무제한"이 키가 된다** |
| `query direction` | 부재 — 방향 축은 인덱스에만 존재(`graph_edge` src/dst `Db.php:838-839`) · **캐시 축 0** | `ABSENT` |

**→ 8종 중 7종이 `ABSENT`.** 🔴 **Version-aware Cache 는 캐시 문제가 아니라 버전 결번 문제다.** 버전 축을 먼저 신설하지 않으면 캐시 키를 구성할 수 없다.

## 1. 원문 전사 + 판정 — **원문 17종** (필수 Cache Key 8 + 적용 8 + 금지 1)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| | **필수 Cache Key 구성 (8)** | | |
| 1 | `tenant_id` | ★**유일 확보 축** — 인증키 tenant 로 `X-Tenant-Id` 무조건 덮어쓰기(`index.php:600`) · 세션→`auth_tenant`(`:429-442`) · strict fail-closed(`:585`) | `VALIDATED_LEGACY`(축) — **캐시 미적용** |
| 2 | `hierarchy_id` | 부재 — `hierarch` grep **0** | `ABSENT` |
| 3 | `hierarchy_version_id` | 부재 — 엔티티 version 축 1건뿐(`menu_defaults.version` `AdminMenu.php:120`) | `ABSENT` |
| 4 | `effective_date` | 부재 — as-of 술어 **전역 0건** · `effective_to` **0** | `ABSENT` |
| 5 | `organization_unit_id` | 부재 — Unit 엔티티 0 | `ABSENT` |
| 6 | `relationship_type` | 부재. 인접 = `graph_edge.edge_label`(`Db.php:834`) 자유문자열 · 마케팅 도메인 | `ABSENT` |
| 7 | `legal_entity scope` | 부재 — 법인 엔티티 0. 🔴 `'company'` = **무제한 센티넬**(`TeamPermissions.php:258`) | `ABSENT` — 🔴 **센티넬 오독 시 캐시 키가 "전체 해제"를 의미** |
| 8 | `query direction` | 부재 — 방향은 인덱스 축(`Db.php:838-839`)에만 존재 | `ABSENT` |
| | **적용 (8)** | | |
| 9 | Version-aware Cache | **부재 · 전제 부재** — 버전 축이 없어 키 구성 불가. 프론트 캐시(`MenuVisibilityContext.jsx:28`)는 **상수 키 · TTL 만료뿐** | `NOT_APPLICABLE`(**순수 신규**) |
| 10 | Tenant-isolated Cache | **부재.** 🔴 **유일 실 트리 캐시가 반례다** — `g_admin_menu_tree_cache` 는 **테넌트 축 없는 상수 키**(`menu_tree` 자체가 `tenant_id` 컬럼 없는 전역 트리이므로 성립). **조직에 복제 시 테넌트 간 트리 누출** | `NOT_APPLICABLE` — 🔴 **`menu_tree` 캐시 패턴 복제 금지** |
| 11 | Activation 시 Invalidation | **부재 · 전제 부재** — 활성 버전 개념 0. 현행 무효화 = **TTL 5분**(`:29`) 단일 수단 · 이벤트 연동 **0** | `NOT_APPLICABLE` |
| 12 | Edge 변경 시 Invalidation | **부재.** `upsertEdge`(`GraphScore.php:107-`)는 **무효화 훅 0**(캐시가 없으므로 당연) | `NOT_APPLICABLE` |
| 13 | Unit Version 변경 시 Invalidation | **부재 · 전제 부재** — Unit·Version 양쪽 결번 | `NOT_APPLICABLE` |
| 14 | Future Change 활성화 시 Invalidation | **부재 · 전제 부재** — 미래 행 개념 0(effective date 축 0) | `NOT_APPLICABLE` |
| 15 | Reconciliation Drift 시 Critical Cache 차단 | **부재 · 전제 부재** — 소스 1개(내부) · HRIS·ERP 커넥터 0(`ChannelRegistry.php:12`,`:79` 열거에 `erp`·`finance`·`hr` 없음) → drift 개념 자체가 성립 안 함. ★**단 헌법 Vol3 원칙(수집≠사용 · Trust 미달은 자동화 제외)의 캐시판이며, 이 항목은 신설 시 반드시 fail-closed 로 구현해야 한다** | `NOT_APPLICABLE`(**순수 신규**) |
| 16 | Stale Cache 사용 여부 Evidence | **부재 — evidence 축 0.** 현행 캐시는 **stale 여부를 호출자에게 알리지 않는다**(TTL 만료 = 조용한 재조회) | `NOT_APPLICABLE` |
| | **금지 (1)** | | |
| 17 | 과거 Snapshot은 Current Hierarchy Cache로 재구성하지 마라 | 🔴 **현행에 이 안티패턴의 정확한 실증이 있다** — `Pnl.php:449` 가 기간(`$from`,`$to`)을 받고도 `:454` 는 `ORDER BY effective_from DESC LIMIT 1` 로 **오늘자 최신 VAT율**을 읽는다 → **과거 기간 P&L 이 현재 규칙으로 재구성된다.** 캐시가 아니라 쿼리 계층에서 일어나지만 **의미는 정확히 이 금지 조항이다.** ⚠️ **단 주석 `:451` 이 *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 로 의도를 명시** → **설계 선택일 수 있음 · 등급 미부여 · 관찰 사실로만 등재**(라이브 확인 필요) | `UNVERIFIED`(현행) — ★**금지 조항의 실증 사례로 인용** |

**실측 개수: 17 / 17 전사** (필수 Cache Key 8 + 적용 8 + 금지 1). 원문 개수와 전사 개수 **일치**.

**커버리지**: `ABSENT` **7**(캐시 키 축) · `NOT_APPLICABLE` **8**(적용 — 순수 신규) · `VALIDATED_LEGACY` **1**(`tenant_id` 축만) · `UNVERIFIED` **1**(금지 조항 실증).
🔴 **커버 = 0.** **캐시 전략 전체가 순수 신규다.**

## 2. 규칙

- 🔴🔴 **서버 캐시 계층이 없다 — 캐시 도입은 "확장"이 아니라 "새 인프라 도입"이다.** Redis/Memcached **grep 0**. **인프라 도입은 이 세션의 범위가 아니며, 헌법 §11 게이트·배포 승인 대상이다.** §69 를 "캐시 붙이면 됨"으로 읽지 마라.
- 🔴 **`apcu_*` 를 캐시 계층으로 계산 금지 = 역산.** `SystemMetrics.php:225-451` **전용 · 지표 보고 목적**이다. 이름은 캐시 API 이나 **능력(계층·무효화·키 규약·테넌트 격리)이 0** 이다. **이름을 근거로 "캐시 있음"으로 계산하면 §69 요구 16종이 정의상 소멸한다.**
- 🔴 **`g_admin_menu_tree_cache`(`MenuVisibilityContext.jsx:28`) 패턴을 조직에 복제 금지.** 그것은 **상수 키 · TTL 5분(`:29`) 단일 무효화 · 테넌트 축 0** 이며, `menu_tree` 가 **`tenant_id` 컬럼 없는 전역 단일 트리**라서만 성립한다. **조직 계층은 테넌트별이다** — 복제하면 **테넌트 간 트리 누출**이며, **286차 `platform_growth` act-as localStorage 고착 사고**(전 메뉴 빈 화면)의 재료가 그대로 갖춰진다.
- 🔴 **Version-aware Cache 는 캐시 과제가 아니라 버전 결번 과제다.** 필수 키 8종 중 **7종이 `ABSENT`** 이며 확보된 축은 `tenant_id` 하나뿐이다. **버전·effective_date·hierarchy_id 축을 먼저 신설하지 않으면 캐시 키를 구성조차 할 수 없다.** 순서를 뒤집으면 **키 없는 캐시 = 전역 오염**이다.
- 🔴 **`legal_entity scope` 를 캐시 키에 넣을 때 `'company'` 를 그대로 쓰지 마라.** `effectiveScope():258` 에서 `'company'` 는 **`return null` = 무제한**이다 — **법인 경계를 긋는 게 아니라 지운다.** 캐시 키에 그대로 실으면 **"전 법인 해제" 결과가 특정 법인 키로 캐시된다.**
- 🔴 **"과거 Snapshot 을 Current Hierarchy Cache 로 재구성하지 마라"(원문 명시)는 이 레포에 실증 사례가 있다.** `Pnl.php:449` vs `:454` — 기간을 받고도 최신승으로 읽어 **과거 기간을 오늘 규칙으로 재구성**한다. **조직 스냅샷에서 같은 실수를 하면 승인 이력의 조직 근거가 통째로 위조된다.** Snapshot 은 **자기완결적 immutable 데이터**여야 하며(패턴: `menu_defaults.snapshot_data` + `schema_migrations.checksum` 해시), **현재 계층 캐시를 조회해 복원하는 경로를 만들지 마라.**
  ⚠️ 단 `Pnl` 건 자체는 **주석 `:451` 이 의도를 명시**하므로 **설계 선택일 수 있다 · 등급 미부여 · 라이브 확인 필요**. **이 문서는 이를 결함이 아니라 "금지 조항의 의미를 보여주는 실증"으로만 인용한다.**
- 🔴 **Reconciliation Drift 시 Critical Cache 차단은 fail-closed 로 구현하라.** 현재 drift 개념이 성립하지 않는 이유는 소스가 1개라서다 — **HRIS·ERP·IdP 소스가 붙는 순간 활성화된다.** 헌법 Vol3(수집≠사용 · Trust 미달은 자동화/AI 에서 제외)의 캐시판이며, **fail-open 은 신뢰도 미달 데이터를 조직 근거로 유통시킨다.** (대비: `index.php:508-545` 레이트리밋은 **의도적 fail-open** — 가용성 우선이고 인가는 이미 통과했기 때문이다. **캐시 차단에 그 논리를 복제하지 마라.**)
- 🔴 **Stale Cache Evidence 는 응답 축이 필요하다.** 현행 캐시는 TTL 만료를 **조용히** 재조회한다 — 호출자가 stale 여부를 알 수 없다. **조직 캐시는 응답에 stale 여부·기준 시각·버전을 실어야 한다**(무근거 결론 금지 = 헌법 Vol4 Explainable AI 원칙의 캐시판).
- **Edge 변경 시 Invalidation 훅 지점을 미리 못박아라.** 현행 `upsertEdge`(`GraphScore.php:107-`)에 훅이 0 인 것은 캐시가 없어서지 설계가 아니다. **캐시 도입과 무효화 훅은 같은 변경에서 함께 와야 한다** — 5-3-2 §0.3 교훈("집행은 진짜가 됐으나 상태 게이트가 함께 오지 않았다")의 캐시판이다.
