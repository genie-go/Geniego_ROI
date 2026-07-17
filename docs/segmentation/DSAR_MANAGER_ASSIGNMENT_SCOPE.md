# DSAR — Manager Assignment Scope (§34)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §34 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

★**축 주의 — §34 도 두 축이다.** 지원 Scope 19 + 필수 필드 13 = **측정기 분모 32**. 본 문서가 **양쪽 모두** 전사한다.

| 항목 | 실측 | 판정 |
|---|---|---|
| `data_scope` DDL | `TeamPermissions.php:160-165`(MySQL) / `:172-173`(SQLite) — `id·tenant_id·subject_type·subject_id·scope_type VARCHAR(30)·scope_values TEXT·updated_at` | `PARTIAL` |
| 🔴 **단일행 스키마 강제** | **`UNIQUE KEY uq_scope (tenant_id, subject_type, subject_id)` `:164`**(SQLite `CREATE UNIQUE INDEX uq_scope :173`) — **주체당 스코프 행이 물리적으로 1개** | **`MIGRATION_REQUIRED`** |
| 선언 열거 | `DATA_SCOPES = ['company','brand','team','campaign','product','channel','warehouse','partner','own']`(`:41`) — ★**`in_array` 로 실제 강제**(`:342` 미일치 시 `'own'` 강등) | **강제 열거**(본 레포 유일 선례) |
| **실 소비 차원 = 4개** | `warehouse` → **`Wms.php:1291`** · `channel`/`product`/`brand` → **`OrderHub.php:261`**(`scopeChannelProduct` 경유 · 구현 `TeamPermissions.php:318-320`) | `PARTIAL` |
| 🔴 소비처 0 차원 | `partner`·`campaign`·`team` = **선언만 · `scopeSql` 호출처 0 → 영원히 무제한** | `NAME_ONLY` |
| 🔴 `'company'` | **법인이 아니라 무제한 센티넬** — `effectiveScope():258` `if ($st === 'company') return null;` (주석 `:258` *"전사 = 무제한"*) | **오독 함정** |
| effect | **INCLUDE 고정** — `scopeSql` 이 생성하는 것은 `IN (...)` 뿐(`:285-288`) · EXCLUDE/READ_ONLY 표현 수단 **0** | `ABSENT` |
| fail-closed 선례 | `DENY_SCOPE`(`:251` 테넌트 미도출 시 거부) · `'__deny__'` → `[]` → **`AND 1=0`**(`:277`·`:288`) | `LEGACY_ADAPTER` |

★**정정(ⓑ 인용 재확인)**: `TeamPermissions.php:284` 는 **docblock 예시 줄**(`호출: [$w,$p]=TeamPermissions::scopeSql($req,'warehouse','wh_id');`)이며 **소비처가 아니다**. `warehouse` 차원의 실 소비처는 **`Wms.php:1291`**. **규칙 8 — 주석을 근거로 삼지 마라**(ⓑ 브리핑의 `:284` 인용은 주석을 가리킨다).

🔴 **규칙 10 적중 — 정책이 아니라 UNIQUE 가 여러 개를 금지한다.** 현행 주체가 스코프를 "1개만" 갖는 것은 설계 선택이 아니라 **`:164` UNIQUE 의 결과**다. §34 는 **하나의 Assignment 에 N개 Scope** 를 요구하므로 **스키마 변경(UNIQUE 해제 + assignment_id FK)이 선결**이며, 이는 확장이 아니라 **마이그레이션**이다. `backend/migrations/` 는 **172차 정지** → `ensureTables` 경로뿐이고 🔴**`ensureTables` 는 데이터 변환·백필을 하지 않는다**.

## 1-A. 원문 전사 + 판정 — **지원 Scope 19종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | ALL_RESPONSIBILITIES | 🔴 `'company'`(`:41`) 를 대응물로 계산 **금지** — **무제한 센티넬**(`:258` `return null`)이며 **"전 책임"이 아니라 "필터 없음"**이다. 책임 축 자체가 없다 | `NAME_ONLY` |
| 2 | PEOPLE_MANAGEMENT | 인사 관리 스코프 **0** · Manager Relationship 축 **전역 0** | `ABSENT` |
| 3 | FUNCTIONAL_REVIEW | **0** · Direct/Functional 구분 수단 없음 | `ABSENT` |
| 4 | PERFORMANCE_REFERENCE | **0** · 🔴 `grade` 45+건 **전량 무관**(고객등급·리드등급·모델품질) | `ABSENT` |
| 5 | BUDGET | 🔴 `budget_amount`(migration `20260526_168_001:14-15`) = **프로젝트 예산액**이지 매니저 스코프 아님 | `ABSENT` |
| 6 | COST_CENTER | **전역 0** | `ABSENT` |
| 7 | PROFIT_CENTER | **전역 0** | `ABSENT` |
| 8 | PROGRAM | 🔴 `pm_portfolio` "프로그램" = **주석 팬텀**(`Enterprise.php:13`) · 코드에 program 개념 **0**(규칙 8) | `ABSENT` |
| 9 | PROJECT | `pm_projects.owner_user_id` — **판독 술어 0**(`WHERE owner_user_id` grep 0) · `data_scope` 에 `project` 값 **없음**(`:41`) | `NAME_ONLY` |
| 10 | BRAND | ★`DATA_SCOPES` 에 `'brand'` 실재(`:41`) **+ 실 소비**(`:320` → `OrderHub.php:261`). 🔴**단 브랜드 컬럼이 아니라 SKU 컬럼에 매핑**(주석 `:315` *"brand→SKU 컬럼(이 시스템 브랜드=상품집합 거버넌스)"*) · `catalog_brand`(`Catalog.php:151-169`) 는 **명부만 · 관리자 필드 없음** | `PARTIAL` |
| 11 | REGION | `DATA_SCOPES` 에 값 **없음** · 🔴 `region` 3축 전부 무관(광고 인구통계 `Db.php:681`,`:690` / Amazon Ads 엔드포인트 `Connectors.php:2704-2710` / WMS 시·도 `Wms.php:129`·`regionOf():286`) | `ABSENT` |
| 12 | COUNTRY | `DATA_SCOPES` 에 값 **없음** · 🔴 `Geo.php:23-53` = IP→ISO alpha-2 **언어 결정용**(탐지이지 스코프 아님) | `ABSENT` |
| 13 | LEGAL_ENTITY | 🔴 `'company'` 는 **법인이 아니라 무제한 센티넬**(`:258`) · `ceo_name` = `app_user` **프로필 평문 문자열**(`UserAuth.php:306-307`) · 법인 엔티티 **0** | `ABSENT` |
| 14 | SECURITY | **0** · Suspension 개념 **전역 0**(🔴`suspend` grep = 말장난 1건 `WorkspaceState.php:12` "belt-and-suspenders") | `ABSENT` |
| 15 | COMPLIANCE | **0** | `ABSENT` |
| 16 | DATA | 🔴 **테이블명이 `data_scope` 라는 이유로 커버 계산 금지** — `DATA_SCOPES`(`:41`)에 `'data'` **값 없음**. 테이블은 **스코프 저장소**이지 "DATA 라는 scope type" 이 아니다 | `ABSENT` |
| 17 | APPROVAL_ROUTING | 🔴 **승인자 후보 계산 코드가 레포에 없다**(`resolveApprover`/`approval_chain`/`routeApproval` grep 0) → 라우팅할 스코프 **무대상** | `ABSENT` |
| 18 | READ_ONLY_REVIEW | 🔴 **`where` 절로 표현 불가** — `data_scope` 는 **행 필터**(`IN (...)` `:285-288`)이며 동작 제한이 아니다. ★**실 선례가 미들웨어 층인 것이 증거**: `index.php:92-96` 이 `AGENCY_READ_ONLY` 403 을 **요청 메서드**로 차단(`in_array($agMethod, ['POST','PUT','PATCH','DELETE'])`) | `ABSENT`(계층 상이) |
| 19 | CUSTOM | 확장 슬롯 0 · `:342` 가 미등록 값을 **`'own'` 으로 강등** | `ABSENT` |

## 1-B. 원문 전사 + 판정 — **필수 필드 13종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_assignment_scope_id | `data_scope.id`(`:161`) 존재하나 **Assignment 축 부재**로 무연결 | `ABSENT` |
| 2 | manager_assignment_id | Assignment 엔티티 **부재** · `data_scope` 는 **subject 직결**(`subject_type`+`subject_id` `:162`) | `ABSENT` |
| 3 | scope type | `scope_type VARCHAR(30) NOT NULL DEFAULT 'own'`(`:163`) + `DATA_SCOPES` 9값(`:41`) **`in_array` 강제**(`:342`) — ★**19종 vs 9종 · 실 소비 4종** | `PARTIAL` |
| 4 | resource reference | `scope_values TEXT`(`:163`) = **JSON 배열**(`:344` `json_encode`) → 🔴**인덱스·조인·FK 불가**(`pm_baseline.captured_at` 과 동형) | `KV_ONLY` |
| 5 | scope effect | 🔴 **INCLUDE 고정** — 생성물이 `IN (...)` 뿐(`:285-288`) · EXCLUDE/DENY 는 **전역 거부 센티넬**(`AND 1=0` `:288`)로만 존재하며 **차원별 제외 표현 불가** | `ABSENT` |
| 6 | legal entity restriction | 법인 엔티티 **0** · `'company'` = 무제한 센티넬 | `ABSENT` |
| 7 | country restriction | `DATA_SCOPES` 에 country 없음 · `Geo` = 언어 결정용 | `ABSENT` |
| 8 | environment restriction | 🔴 `Db::envLabel()` 을 대응물로 계산 **금지** — **게이트가 아니며 코드가 스스로 금지**(`Db.php:51-54`) | `ABSENT` |
| 9 | amount reference | 금액 임계 축 **0** · `required_approvals`(`Mapping.php:210`)는 **리터럴 `2`** 로 금액에 반응 안 함 | `ABSENT` |
| 10 | valid_from | `data_scope` 컬럼 = `updated_at` 뿐(`:163`) · `valid_from` **전역 grep 0** | `ABSENT` |
| 11 | valid_to | `valid_to`/`effective_to` **전역 grep 0** | `ABSENT` |
| 12 | status | `data_scope` 에 status 컬럼 **없음**(`:161-163`) · 활성/만료 구분 불가 | `ABSENT` |
| 13 | evidence | 스코프 변경 감사 **0** — `replacePerms`(`:354`)·`:344` 는 **DELETE→INSERT 전체 교체**(이력 소멸) · 이식 선례 `pm_audit_log`(migration `20260526_168_008:7` + `diff_json :13`) | `LEGACY_ADAPTER` |

**실측 개수: 32 / 32 전사** (Scope 19 + 필수 필드 13 · **측정기 분모 32 와 일치**).
커버리지 = `ABSENT` 26 · `PARTIAL` 3 · `NAME_ONLY` 2 · `KV_ONLY` 1 · `LEGACY_ADAPTER` 1 · **`VALIDATED_LEGACY` 0**.

## 2. 규칙

- 🔴 **§34 N개 Scope 는 스키마 변경이 선결이다.** `UNIQUE(tenant_id,subject_type,subject_id)`(`:164`)가 **주체당 1행을 물리적으로 강제**한다 — 정책이 아니라 UNIQUE 다(규칙 10). UNIQUE 해제 없이 "여러 스코프"를 얹으면 **INSERT 가 조용히 실패하거나 기존 행을 덮어쓴다**.
- 🔴 **`effectiveScope():256` `if (!$sc) return null;` 을 상속 금지** — **스코프 미설정 = 테넌트 내 무제한**이다(주석 `:255` 가 *"설정 미완 사용자 잠금 방지"* 로 자인). Manager Scope 에서 **미설정→무제한은 fail-open** 이며 §37 "Required Scope 충족" 과 **정면 충돌**한다. 신규 축은 **미설정→거부**여야 한다.
- 🔴 **`'company'` 를 LEGAL_ENTITY 로 재해석 금지.** 현재 값의 의미는 **무제한**이며(`:258`), ★**`ORG_PRESET` 15팀 중 `'재무팀' => 'company'`(`:717`)** 가 이미 이 센티넬을 쓴다. 의미를 바꾸면 **기존 시드 팀의 권한이 조용히 축소**된다(무후퇴 위반).
- 🔴 **READ_ONLY_REVIEW 를 `data_scope` 에 얹지 마라.** 행 필터 계층에서 **동작 제한은 표현 불가**하다. 실 선례가 **미들웨어 층**(`index.php:92-96`)인 것이 이 계층 분리의 증거다.
- ★**`partner`·`campaign` 를 "이미 지원"으로 계산 금지**(`NAME_ONLY`) — `DATA_SCOPES`(`:41`)에 **선언만 되어 있고 `scopeSql` 소비처가 0** 이라 어떤 질의도 좁히지 않는다. 즉 **해당 스코프를 부여받은 사용자는 영원히 무제한**이다. ⚠️`ORG_PRESET` 15팀 중 8팀이 이 실효 없는 스코프를 받는다(`:708-721`) — **등급 미부여**(설계 의도 미확인).
- ★**`brand` 스코프의 실 매핑은 SKU 컬럼이다**(`:315` 주석·`:320`). §34 BRAND 를 `catalog_brand` FK 로 설계하면 **기존 소비처(`OrderHub.php:261`)와 의미가 갈라진다** — 통합 전 결정 필요.
- 32종 **"있다고 가정"하고 배선 금지**.
