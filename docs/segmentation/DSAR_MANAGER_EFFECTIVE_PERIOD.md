# DSAR — Manager Effective Period (§38)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §38 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★★ 최우선 — **부재의 깊이가 축마다 다르다**

원문은 *"Business Time과 System Time을 구분하라"*(`:1457`)를 요구한다. **이중 시간축 선례 = 전례 0.** 그러나 **"시점 축이 없다"로 뭉뚱그리면 설계가 틀어진다** — 현행 두 시점 축은 **교정해야 할 계층이 서로 다르다**.

| 축 | 컬럼 | 이력 | 질의 | 실측 | 교정 계층 | 판정 |
|---|---|---|---|---|---|---|
| **세율** `kr_fee_rule.effective_from` | ✅ **有** (`Db.php:898` `VARCHAR(32) NOT NULL`) | ✅ 행 누적(INSERT `KrChannel.php:128-140`) | 🔴 **無** — `WHERE effective_from <= :as_of` **전역 grep 0** · 읽기 **4개소 전부 최신승**(`Pnl.php:454` `ORDER BY effective_from DESC LIMIT 1` · `KrChannel.php:102` `ORDER BY category,effective_from DESC` · `:151` 동일 · `:459` `DESC, id DESC LIMIT 1`) | **질의 계층 교정** — 과거 행은 이미 테이블에 있다 | `PARTIAL` |
| **환율** `fxToKrw` | 🔴 **無** (`Connectors.php:1749`) | 🔴 **無** — `app_setting` KV **단일행 덮어쓰기**(`:1804-1805` `ON DUPLICATE KEY UPDATE svalue=VALUES(svalue)` / `ON CONFLICT(skey) DO UPDATE`) | 🔴 **無** | **저장 계층 신설** — **복원할 대상 자체가 없다** | `KV_ONLY` |

> 🔴 **★핵심 — "시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다.**
> 세율은 **질의를 고치면 과거가 복원된다**(데이터가 살아 있다). 환율은 **질의를 아무리 고쳐도 복원할 과거가 없다** — `2026-01-01` 의 USD 환율은 **다음 갱신 때 물리적으로 소멸**했다. §38 을 "`effective_from` 선례가 있으니 이식하면 된다"로 읽으면 **환율이 걸린 모든 as-of 재계산이 설계 시점에 이미 불가능**하다.

### 폐구간·버전 축

| 항목 | 실측 | 판정 |
|---|---|---|
| `effective_to` / `valid_to` / `valid_from` | **backend/src grep 0** (`Onsite.php:396` `invalid_token` = 문자열 오염) → **폐구간을 표현한 전례 0** | `ABSENT` — 신규 |
| optimistic lock `version` | **grep 0** | `ABSENT` |
| 엔티티 `version` | `menu_defaults.version` **1건** — 🔴 유일 생산자 `AdminMenu.php:309` 가 **리터럴 `'baseline'` 고정** = **버전이 아니라 라벨** | `NAME_ONLY` |
| `pm_baseline.captured_at` | 🔴 **DB 컬럼이 아니라 `snapshot_json` 내부 JSON 키**(`Handlers/PM/Enterprise.php:360` · DDL 은 `created_at` `:55`/`:62`) → **인덱스 불가·as-of 질의 불가** | `KV_ONLY` |
| `as_of` | **2건 = 응답 타임스탬프**(`PgSettlement.php:279`·`AttributionEngine.php:666`) — **as-of 질의 아님** | `NAME_ONLY` |

### `timezone` 축 — **4벌 병존 · 전부 도메인 상이**

| 벌 | 실측 | 도메인 |
|---|---|---|
| `RuleEngine::DEFAULT_TZ = 'Asia/Seoul'` (`RuleEngine.php:35`) | PHP 상수 | 광고 데이파팅 기본값 |
| ★**`daypart_schedule.tz VARCHAR(40) DEFAULT 'Asia/Seoul'`** (`RuleEngine.php:56`) | **유일한 IANA 문자열 tz 컬럼** | 광고 데이파팅 |
| `crm_customer_prefs.tz_offset INT NOT NULL DEFAULT 9` (`PreferenceCenter.php:84` MySQL · `:99` SQLite · 판독 `:160`) | 🔴 **INT 오프셋 → DST 표현 불가** | 고객 수신 선호 |
| JourneyBuilder `gmdate` (`:538`) | **UTC 고정** | 시스템 시각 |

> 🔴 **직원 근무지 타임존 = 전역 0.** 위 4벌 중 **직원을 소유자로 하는 것이 하나도 없다**. **스키마 형태(`VARCHAR(40)` IANA)만 이식 가능 · 값·의미·소유자는 전부 신규.**

### 관계 축 자체

`manager_id`·`reports_to`·`supervisor_id`·`acting`·`interim`(관련)·`vacan` **전부 grep 0** → **기간을 붙일 Assignment 엔티티가 없다.** git 삭제 이력도 0 → **팬텀도 유물도 아니다 — 존재한 적이 없다.**

## 1. 원문 전사 + 판정 — **원문 16종**

`MANAGER_EFFECTIVE_PERIOD` 필수 필드:

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_effective_period_id | 부재 — Assignment 엔티티 자체 0 | `ABSENT` |
| 2 | entity type | 부재 · 인접 = `data_scope.subject_type VARCHAR(10)`(`TeamPermissions.php:163`) — **권한 주체 구분**이지 관계 엔티티 아님 | `ABSENT` |
| 3 | entity id | 부재 | `ABSENT` |
| 4 | business valid from | 🔴 **선례 `kr_fee_rule.effective_from`(`Db.php:898`) — 컬럼 有·as-of 질의 無** · **직원 도메인 0** | `ABSENT`(도메인) · 스키마 형태만 참조 |
| 5 | business valid to | **`valid_to`/`effective_to` grep 0** — **폐구간 전례 0** | `ABSENT` |
| 6 | system recorded from | 부재 — `created_at` 은 **행 생성 시각**이지 System Time 축 아님(정정 시 되감을 수 없다) | `ABSENT` |
| 7 | system recorded to | 부재 — **System Time 폐구간 전례 0** | `ABSENT` |
| 8 | timezone | **4벌 병존 · 전부 도메인 상이** · 직원 근무지 tz **0** · 스키마 형태 선례 = `daypart_schedule.tz VARCHAR(40)`(`RuleEngine.php:56`) | `ABSENT`(도메인) |
| 9 | future dated 여부 | 부재(§39) — **미래 일자 상태를 표현할 컬럼 0** | `ABSENT` |
| 10 | retroactive 여부 | 부재(§40) | `ABSENT` |
| 11 | acting period 여부 | **`acting` grep 0** · 🔴 `UserAdmin::impersonate:466-525` 를 **여기에 매핑 금지**(§14 함정) | `ABSENT` |
| 12 | temporary period 여부 | 부재 | `ABSENT` |
| 13 | interim period 여부 | **`interim` 1건 = 지오리프트 중간결과**(`AttributionEngine.php:672` `$rj['interim']`) — **이름 함정** | `ABSENT` |
| 14 | source effective date | 부재 — §3.4 외부 소스 42항목 전부 부재(HRIS/ERP/Directory 히트 0) → **source 가 없으니 source date 도 없다** | `ABSENT` |
| 15 | status | 부재 · 인접 `team.status VARCHAR(20) DEFAULT 'active'`(`TeamPermissions.php:148`) = **팀 상태**(관계 기간 아님) | `ABSENT` |
| 16 | evidence | 부재 · 인접 immutable 선례 = `menu_audit_log.hash_chain`(`AdminMenu.php:128` SHA-256 prev-chain) — 🔴 **`tenant_id` 없음 → 스키마 복제 금지·알고리즘만 이식** · 🔴 쓰기 체인만 실재·`verify()` 0·preimage ts(`:195`) 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68` | `ABSENT` |

**실측 개수: 16 / 16 전사.** (측정기 16 · 원문 대조 16 · 전사 16 — **3자 일치**.) 커버리지 = **부재 16 · 커버 0**.

## 2. 규칙

- ★ **§38 은 이중 시간축(Business/System)을 요구한다. 전례 0.** `kr_fee_rule.effective_from` 은 **Business Time 단일축**이며 그마저 **as-of 질의가 없다** → **"선례 있음"으로 계산 금지**(규칙 7 — 컬럼 존재 ≠ 능력 존재).
- 🔴 **★부재의 깊이를 구분해 설계하라.** 세율 = **질의 계층 교정**(과거 복원 가능) / 환율 = **저장 계층 신설**(복원 대상 부재). **"시점 컬럼만 붙이면 된다"는 일반화가 환율 축에서 깨진다.** §38 이 참조하는 **모든 파생 금액(리베이트 포함)이 환율에 걸리면 as-of 재계산이 원천 불가**임을 설계 전제에 명시하라.
- 🔴 **`effective_to`/`valid_to` 가 grep 0 이라는 것은 "폐구간을 안 쓰기로 했다"가 아니라 "표현한 적이 없다"**이다(규칙 10 — 현행이 항상 "1개 최신"인 것은 **여러 시점을 표현할 수단이 없어서**다). 폐구간은 **신규**다.
- 🔴 **`kr_fee_rule` 스키마를 복제하지 마라.** `effective_from VARCHAR(32)` = **문자열 정렬 의존** · `effective_to` 없음 · **UNIQUE 없음**(중첩 구간 방지 없음) · 인덱스 `idx_kr_fee_rule(tenant_id,channel_key,category)` 에 **시점 컬럼 미포함** → as-of 질의 시 풀스캔. **이 결함을 물려받으면 설계 시점에 이미 불가능해진다.**
- ★ **`timezone` 은 스키마 형태만 이식.** `daypart_schedule.tz VARCHAR(40)`(`RuleEngine.php:56`)는 **광고 데이파팅**이며 **직원 근무지가 아니다**. 🔴 `crm_customer_prefs.tz_offset INT` 형태는 **채택 금지** — DST 표현 불가.
- 🔴 **`pm_baseline.captured_at` 형태(JSON 내부 키) 채택 금지** — `menu_defaults.version='baseline'` 리터럴과 함께 **"컬럼이 있으니 축이 있다"의 반례**다. 시점은 **인덱스 가능한 DB 컬럼**이어야 한다.
- `evidence` 는 **`menu_audit_log` 알고리즘만 이식**(SHA-256 prev-chain) · 🔴 **테이블 복제 금지**(`tenant_id` 부재 · `lastHash():214-219` 에 tenant 술어 없음) → 테넌트별 체인 시 `WHERE tenant_id=?` **필수**. 🔴 **단 쓰기 체인만 실재하고 검증기(`verify()`)가 0**이며 preimage 의 `ts`(`:195`)가 INSERT 컬럼에 없어 `created_at` DB DEFAULT 가 덮어 재계산 불가 → tamper-evident 아님. 검증형 정본 = `SecurityAudit::verify():56-68`.
- 🔴 **16종 "있다고 가정"하고 배선 금지.**
