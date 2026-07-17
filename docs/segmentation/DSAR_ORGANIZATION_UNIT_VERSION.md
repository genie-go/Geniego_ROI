# DSAR — Organization Unit Version (§9)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §9 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **조직 버전 엔티티** | `organization_unit_version` **grep 0** · 조직 이력 테이블 0 | `NOT_APPLICABLE`(부재 → 신설) |
| ★**엔티티 `version` 총량** | ★**`menu_defaults.version`(AdminMenu.php:120) 단 1건.** `\bversion\b` **40건 전부 API 버전 문자열·DB 버전·벤더 헤더** · **optimistic lock `version` grep 0**(5-3-2 확정 재실증) · `crm_segments` version/snapshot/evaluated_at **전무**(CRM.php:64-70) | **레포 전역 1건** |
| **유일 "버전 붙은 스냅샷"** | `menu_defaults(snapshot_data JSON, version, created_at)`(AdminMenu.php:120·:139 · 생성 :308 · 복원 :584-590) — 단 **immutable_hash 없음 · 전역 1행(tenant 없음) · 최신 1건만 조회** | `PARTIAL`(선례 가치) |
| 스냅샷 선례 2 | `pm_baseline(snapshot_json, captured_at)`(PM\Enterprise.php:55·:62·:360-364) — ★`captured_at` 명명이 원문 `recorded_at` 축과 정확히 대응 | `LEGACY_ADAPTER` |
| **immutable_hash 선례** | ★`schema_migrations.checksum`(Migrate.php:50 `hash('sha256',$sql)` · :63-64 · :145/:151) | `LEGACY_ADAPTER`(패턴 정본) |
| **해시체인 선례** | ★**`menu_audit_log.hash_chain CHAR(64)`(AdminMenu.php:128) = SHA-256 prev-chain 실구현**(생성 :182-197 · `lastHash()` :214-219 · tamper-evident 주석 :18) | `LEGACY_ADAPTER`(패턴 정본) |
| **effective dating 총량** | ★`kr_fee_rule.effective_from`(Db.php:898) = **전 코드베이스 유일 effective date**. 쓰기 KrChannel.php:128-140 · **읽기가 전부 `ORDER BY effective_from DESC LIMIT 1`(최신승)** — Pnl.php:454 · KrChannel.php:102·:151·:459 | **컬럼 有 · as-of 능력 無** |
| ↑ ★**as-of 조회 부재 실증** | ★**PM 직접 검증: `WHERE effective_from <= :as_of` 술어 = backend/src 전역 0건** · **`effective_to` 없음**(`valid_to\|effective_to` grep 0) → **폐구간 모델은 신규** | `NOT_APPLICABLE` |
| ↑ ⚠️ 관찰 사실 | `Pnl.php:449` 가 기간(`$from`,`$to`)을 받고도 `:454` 는 기간을 무시 → **과거 기간 P&L 도 오늘자 최신 VAT율로 계산**. 단 주석(:451) *"테넌트 최신 kr_fee_rule(채널 무관 최신)"* 이 **의도 명시** → **설계 선택일 수 있음 · 등급 미부여 · 관찰 사실로만 등재**(라이브 확인 필요) | **미판정** |

**★§44 결번의 정확한 실증** — 컬럼(`effective_from`)은 **있으나** as-of 조회 능력이 **없다**. 규율 8("부재증명은 이름이 아니라 능력으로")이 이 축에서 가장 날카롭게 적중한다: `effective_from` 이름만 보고 "시점 이력 있음"으로 계산하면 **정확히 반대**다 — 40건의 `version` 히트가 전부 API 버전이었던 것과 동형이다.

**⚠️ 초판 브리핑 정정 2건**(그대로 반복 금지):
- `plan_period_pricing.period_months`(migration `20260527_171_003:21-34`)는 **구독 기간(1/3/6/12개월 상품 옵션)** 이지 유효기간 아니다. effective date 없음 · `updated_at` 덮어쓰기 = **현재상태 전용** → **§44/§9 선례 아님.**
- `audit_log` "해시체인 없음"은 **전역 `audit_log`(Db.php:540-545 / AdminGrowth.php:157-159 — `actor·action·details_json·created_at` 4컬럼 · tenant 없음)에 한해 참**이다. **`menu_audit_log.hash_chain` 은 실구현**이다. 전역 명제로 인용하면 **오염**이다.

## 1. 원문 전사 + 판정 — 필수 필드 **원문 23종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | organization_unit_version_id | 부재 — 버전 엔티티 없음 | `NOT_APPLICABLE` |
| 2 | organization_unit_id | 부재(FK) · 대상 후보 `team.id`(TeamPermissions.php:146) | `NOT_APPLICABLE` |
| 3 | version_number | 부재 — ★엔티티 `version` 은 `menu_defaults.version`(AdminMenu.php:120) **단 1건** · 조직 버전 0 | `NOT_APPLICABLE` |
| 4 | previous_version_id | 부재 — 버전 체인 0 · ★**인접 패턴 = `menu_audit_log.hash_chain`**(:128 · `lastHash()` :214-219) — **prev 를 해시로 잇는 실선례** | `LEGACY_ADAPTER`(패턴만) |
| 5 | organization name | 부재(버전 스냅샷) · 현행 `team.name`(:147)은 **덮어쓰기 · 이력 없음** | `NOT_APPLICABLE` |
| 6 | organization type | 부재(버전 스냅샷) · 현행 `team.team_type`(:147) 덮어쓰기 | `NOT_APPLICABLE` |
| 7 | organization category | 부재 — Category 컬럼 자체가 없음([§8](DSAR_ORGANIZATION_CATEGORY.md)) | `NOT_APPLICABLE` |
| 8 | legal entity | 부재 — `legal_entity` grep 0 · `biz_no`/`brn`/`corp_reg`/`tax_id` **전부 0건** | `NOT_APPLICABLE` |
| 9 | business unit | 부재 — ★`business_unit` 유일 히트 = **Trustpilot 자격증명 `business_unit_id`**(ChannelSync.php:2573-2580) — 무관 | `NOT_APPLICABLE` |
| 10 | region | 부재 — `region` **3축 병존**(Db.php:681,690 / Connectors.php:2704-2710 / Wms.php:129) · parent region 0 | `NOT_APPLICABLE` |
| 11 | country | 부재(조직) · 인접 `Geo`(Geo.php:23-53) = IP→ISO alpha-2→**언어** 매핑 · Country→Region 매핑 **0건** | `KEEP_SEPARATE_WITH_REASON` |
| 12 | workspace | 부재 — 조직↔workspace 바인딩 없음 | `NOT_APPLICABLE` |
| 13 | owner | 부재(버전 스냅샷) · 현행 `team.manager_user_id`(:148) 덮어쓰기 · ★`seedOrg:739` 는 이 컬럼을 기입하지 않음 | `NOT_APPLICABLE` |
| 14 | changed fields | 부재(조직) · ★**인접 실선례 = `pm_audit_log.diff_json`**(migration `20260526_168_008` · `tenant_id`+`entity`+`diff_json`+**3인덱스**) — **변경 필드 델타를 남기는 유일 패턴** | `LEGACY_ADAPTER`(패턴 정본) |
| 15 | change reason | 부재 — 변경 사유 컬럼 0 · 전역 `audit_log.details_json`(Db.php:540-545)은 **자유 텍스트 · tenant 없음** | `NOT_APPLICABLE` |
| 16 | source version | 부재 — 출처 자체가 미기록([§6 Authoritative Source](DSAR_ORGANIZATION_AUTHORITATIVE_SOURCE.md)) | `NOT_APPLICABLE` |
| 17 | effective_from | 부재(조직) — ★`kr_fee_rule.effective_from`(Db.php:898)이 **전 코드베이스 유일** effective date이나 **채널 수수료 도메인** · 게다가 **읽기가 전부 최신승**(Pnl.php:454 · KrChannel.php:102·:151·:459)이라 **as-of 능력 없음**(`WHERE effective_from <= :as_of` 전역 **0건**) | `KEEP_SEPARATE_WITH_REASON` |
| 18 | effective_to | ★**완전 부재 — `valid_to\|effective_to` grep 0** → **폐구간(closed interval) 모델은 순수 신규** | `NOT_APPLICABLE` |
| 19 | recorded_at | 부재(조직) · ★**인접 명명 정확 일치 = `pm_baseline.captured_at`**(PM\Enterprise.php:55·:62·:360-364) · `menu_defaults.created_at`(:120) | `LEGACY_ADAPTER` |
| 20 | recorded_by | 부재 · 인접 `team.created_by INT NULL`(:149)은 **생성자 1회 기록**이지 버전 기록자 아님 · `audit_log.actor`(Db.php:540-545) | `LEGACY_ADAPTER` |
| 21 | immutable_hash | 부재(조직) · ★**선례 2건 실재**: `schema_migrations.checksum`(Migrate.php:50 `hash('sha256',$sql)`·:63-64·:145) · `menu_audit_log.hash_chain CHAR(64)`(AdminMenu.php:128 · 생성 :182-197). ★**`menu_defaults` 스냅샷에는 immutable_hash 가 없다** — 스냅샷과 해시가 **한 번도 결합된 적 없음** | `LEGACY_ADAPTER`(패턴만·미결합) |
| 22 | status | 부재(버전) · `team.status`(:148)는 **현재상태 전용** | `NOT_APPLICABLE` |
| 23 | evidence | 부재 — 전 도메인 0 | `NOT_APPLICABLE` |

**실측 개수: 23 / 23 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 어댑터 6(패턴 선례) · 도메인 상이 2 · 부재 15.

## 2. 규칙

- 🔴 **`kr_fee_rule.effective_from` 을 "시점 이력 능력 있음"으로 계산 금지 — 이름이 아니라 능력으로 판단하라.** 컬럼은 있으나 **읽기가 전부 `ORDER BY effective_from DESC LIMIT 1`(최신승)** 이고 **`WHERE effective_from <= :as_of` 술어가 backend/src 전역 0건**이다. **as-of 조회는 순수 신규**다.
- 🔴 **`effective_to` 는 grep 0 — 폐구간 모델을 "기존 패턴 확장"으로 쓰지 마라.** 전례가 **없다**. 신설 시 **`effective_from`/`effective_to` 쌍의 as-of 술어를 처음부터 SSOT 로 고정**하라(현행 최신승 술어가 4개소에 흩어진 것과 같은 분산을 반복하지 말 것 — 5-3-2 "백오프 3공식"·"타임존 3벌"·`isDemo` 12벌과 동형).
- 🔴 **"해시체인 선례 없음"을 전역 명제로 쓰지 마라 — 오염이다.** 참인 것은 **전역 `audit_log`(4컬럼·tenant 없음·Db.php:540-545)에 한해서**다. `menu_audit_log.hash_chain`(AdminMenu.php:128 · :182-197 · :214-219)은 **SHA-256 prev-chain 실구현**이며, 버전 체인은 **이 패턴의 확장**이다 — 신설이 아니다.
- 🔴 **`menu_defaults` 를 조직 버전 정본으로 재사용 금지.** ⓐ **`tenant_id` 없음(전역 1행)** — 테넌트 격리 헌법 정면 충돌 ⓑ **최신 1건만 조회**(:584-590) ⓒ **immutable_hash 없음**. **선례로만 인용**하고 조직 버전은 **tenant 스코프 신설 테이블**로 간다.
- 🔴 **`plan_period_pricing.period_months` 를 유효기간 선례로 인용 금지**(초판 브리핑 오류). **구독 기간 상품 옵션**(1/3/6/12개월)이며 effective date 가 없다.
- ★**조합 지침 — 선례가 흩어져 있고 결합된 적이 없다.** Snapshot=`menu_defaults`/`pm_baseline` · immutable_hash=`schema_migrations.checksum` · 해시체인=`menu_audit_log.hash_chain` · changed fields=`pm_audit_log.diff_json` · tenant 스코프 로그=`journey_node_logs`(JourneyBuilder.php:69 · 조회 술어 :248 — **스키마 선례 최적**이나 마케팅 도메인 → **커버 계산 금지**). 조직 버전은 **이 5개 패턴의 결합**이며, **어느 것도 재구현하지 말고 패턴만 차용**하라.
- 🔴 **`crm_segments` 를 버전 선례로 쓰지 마라** — version/snapshot/evaluated_at **전무**(CRM.php:64-70). 5-3-2 에서 확정된 사실이다.
- ⚠️ **§14 Hierarchy Version 간 데이터 이행 · §46 Retroactive 재계산은 집행 수단이 현재 없다**(제약 2 — `ensureTables` 는 테이블 생성만 하고 **데이터 변환·백필을 하지 않는다** · `backend/migrations/` **172차 정지**). 버전 도입 시 **INITIAL 버전을 런타임 지연 생성**(첫 변경 시 현재상태를 v1 으로 봉인)하는 설계가 백필 부재를 우회하는 유일 경로다.
- ⚠️ **`Pnl.php:449→:454` 기간 무시는 등급 미부여** — 주석(:451)이 "채널 무관 최신"을 **의도로 명시**하므로 설계 선택일 수 있다. **관찰 사실로만 등재 · 라이브 확인 필요.** 결함으로 단정하지 마라.
