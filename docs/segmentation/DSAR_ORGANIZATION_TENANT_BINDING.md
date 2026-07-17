# DSAR — Organization Tenant Binding (§21)

> EPIC 06-A Part 4-5-3-1-5-3-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_1_ORG_HIERARCHY_VERBATIM.md) §21 · ADR: [ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_ORGANIZATION_HIERARCHY_GRAPH_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| **Tenant Hierarchy** | `parent_tenant`·`tenant_parent`·`sub_tenant`·`child_tenant`·`tenant_tree`·`tenant_hierarchy` — **backend/src + frontend/src 전역 grep 0**(재확인 완료) | **`ABSENT`**(이름·능력 양쪽) |
| **테넌트 마스터 테이블** | **존재하지 않는다.** `api_key.tenant_id VARCHAR(100)`(`Db.php:944`, **FK 없음**) · `app_user.tenant_id`(`UserAuth.php:166`) — 권위 엔티티 행이 아니라 **소유자 문자열 컬럼** | `ABSENT` |
| 테넌트 발급 | `resolveTenantId` 가 `'acct_'.$id` **문자열 생성+영속**(`UserAuth.php:220-224`) | 관찰 사실 |
| 테넌트 **열거** | `SELECT DISTINCT tenant_id FROM <도메인테이블>` 을 도메인마다 개별 수행 — **19개소**(`Connectors.php:1670,3970,4162,4504,4755`·`CRM.php:1493`·`PriceOpt.php:1459,1468`·`RuleEngine.php:184`·`ChannelSync.php:5423`·`Omnichannel.php:324,607`·`EmailMarketing.php:312,1087`·`DigitalShelf.php:369`·`DemandForecast.php:375`·`AutoCampaign.php:1535,1559`·`OAuth.php:548`). **권위 목록이 아니라 데이터 행에서 역추론 · 19는 하한** | `ABSENT`(열거 능력 없음) |
| **테넌트 격리 강제** | **REAL** — 인증키 tenant 로 `X-Tenant-Id` **무조건 덮어쓰기**(`index.php:600` 재확인) · 세션→`auth_tenant` 주입(`:429-442`) · strict fail-closed(`:585`) | `VALIDATED_LEGACY`(격리 · **계층 아님**) |
| `app_user.parent_user_id` | 정의 `UserAuth.php:156-167`(주석 :156 *"하위(팀원) 계정의 상위 owner id. owner=NULL"*) · DDL **nullable** · 전 생성 경로 owner 직속 **2단 봉인**(`:1226-1227`·`EnterpriseAuth.php:500`·`:1574/1581`·`:670`) · 순회 **단일 홉 비재귀**(`:200-217`) | 🔴 **§21 커버 아님** |
| `agency_client_link` | `AgencyPortal.php:64-72` · `UNIQUE(agency_id, client_tenant_id)` · 매요청 fail-closed 재검증(`:414-432`) | 🔴 **§21 근거 아님** |
| `X-Act-As-Tenant` | `UserAuth.php:397-400` 재확인 — admin **AND** 헤더가 **정확히 `'platform_growth'`** 일 때만 그 문자열 반환 | 🔴 **§21 근거 아님** |

### ★축 주의 1 — `parent_user_id` 를 §21 커버로 계산 금지
하위계정은 상위 owner 의 tenant_id 를 **그대로 물려받는다**(동일 값 UPDATE `UserAuth.php:197`·`:214`). 즉 **한 테넌트 안의 사용자 트리**이지 **테넌트 간 부모-자식이 아니다.** `parent_user_id` 를 Tenant Hierarchy 로 계산하면 **갭이 정의상 소멸하는 역산**이다.

### ★축 주의 2 — `agency_client_link` 를 §21 근거로 계산 금지
ⓐ **이분(bipartite)** — `agency_account`(`AgencyPortal.php:56-63`)는 **테넌트가 아니라 별도 인증 realm**(자체 login/session `:73`·잠금 `:179`·화이트라벨 `brand_json`) ⓑ **N:M · 1홉 전용**(순회·이행성·깊이 0) ⓒ 조직↔조직 엣지 아님 ⓓ **동의 기반 접근 허가**이지 **소유·포함 관계 아님**. → 원문이 명시한 `Cross-Tenant 데이터 접근은 Organization Binding이 아니라 Authorization Policy에서 별도로 결정한다` 의 **Authorization Policy 쪽**에 속하는 자산이다.

### ★축 주의 3 — `X-Act-As-Tenant` 를 §21 근거로 계산 금지
계층도 위임도 아닌 **하드코딩 단일값 스위치**(286차 사고 수정 결과). 임의 테넌트 임퍼소네이트가 **구조적으로 불가**하므로 여기서 계층을 읽어낼 수 없다.

> **결론**: 격리는 **REAL** 이나 테넌트 공간은 **평면(flat)** 이다. 원문의 `그러나 Tenant Isolation을 우회하는 일반 Organization Edge로 사용하지 마라` 는 현행에서 **위반 대상 자체가 없다** — 이는 충족이 아니라 **공백**이다.

## 1. 원문 전사 + 판정 — **원문 28종**(Tenant 종류 8 + 필수 필드 13 + Binding Type 7)

### 1-1. Tenant Hierarchy가 표현하는 것 — **원문 8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Platform Tenant | 예약 테넌트 문자열 `TENANT='platform_growth'`(`AdminGrowth.php:38`·격리 주석 `:27`,`:285`) + act-as 스위치(`UserAuth.php:397-400`). **평면 형제(peer) — 하위 테넌트를 소유하지 않는다** | `NAME_ONLY` |
| 2 | Parent Tenant | **grep 0** | `ABSENT` |
| 3 | Subsidiary Tenant | **grep 0**(`subsidiary` 히트 0) | `ABSENT` |
| 4 | Managed Tenant | **grep 0** · 인접 = `agency_client_link`(동의 기반 1홉 접근 허가 · 소유 아님) | `LEGACY_ADAPTER` |
| 5 | Partner Tenant | **grep 0** · 인접 = `partner_account`(`PartnerPortal.php:52-59` · `TYPES=['supplier','logistics','warehouse']` `:29`) = **외부 party 로그인 계정이지 테넌트 아님** | `LEGACY_ADAPTER` |
| 6 | Sandbox Tenant | `sandbox` 전 히트 = **Paddle `PADDLE_ENV` 결제 환경**(`AdminPlans.php:299,314`·`Payment.php:1295-1296`·`Paddle.php:17`) — 테넌트 무관 | `ABSENT` |
| 7 | Demo Tenant | **능력 REAL · 타입 아님** — 물리 DB 분리 `Db::pdoFor(bool $isDemo)`(`:35-38`)·`_demo` 접미 코드 강제(`:81-84`)·SQLite 폴백 파일 분리(`:140`). 그러나 **테넌트 종류 컬럼이 아니라 문자열 접두 술어 12벌·이름 3종**(`Pnl.php:39-42`/`Rollup.php:70`/`WorkspaceState.php:50` 재확인/`AdPerformance.php:31-33` `return false;`) | `LEGACY_ADAPTER` |
| 8 | Consolidated Reporting Tenant | `consolidat` 전 히트 = **WMS 고아재고 병합**(`Wms.php:257,866,1289`) · 문서명 — 무관. `Rollup` 은 **단일 테넌트 내 시계열 집계**(`Rollup.php:40-68`)이지 크로스테넌트 연결 아님 | `ABSENT` |

**실측 개수: 8 / 8 전사.**

### 1-2. `ORGANIZATION_TENANT_BINDING` 필수 필드 — **원문 13종**

> 레코드 타입 자체가 부재(`ORGANIZATION_TENANT_BINDING` grep 0)하므로 전 필드가 신설 대상이다.

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | tenant binding id | 부재 | `NOT_APPLICABLE` |
| 2 | organization unit | 부재 — `org_unit`/`organization_unit` **전역 0**(대전제: 삭제 이력도 0) | `NOT_APPLICABLE` |
| 3 | tenant id | **식별자 소스는 실재**(`api_key.tenant_id` `Db.php:944` · `app_user.tenant_id` `UserAuth.php:166`) — 단 **FK 없는 문자열 · 권위 마스터 부재** | `LEGACY_ADAPTER`(식별자 재사용) |
| 4 | binding type | 부재 | `NOT_APPLICABLE` |
| 5 | primary 여부 | 부재 | `NOT_APPLICABLE` |
| 6 | inherited 여부 | 부재 — 🔴 `UserAuth.php:197`·`:214` 의 tenant 상속은 **동일 값 복사**이지 inherited 플래그 아님 | `NOT_APPLICABLE` |
| 7 | data ownership | 부재 | `NOT_APPLICABLE` |
| 8 | operational ownership | 부재 | `NOT_APPLICABLE` |
| 9 | reporting relationship | 부재 — `reports_to` **0** · `manager_id` **0**(`team.manager_user_id` 는 팀 담당자이지 보고선 아님) | `NOT_APPLICABLE` |
| 10 | valid_from | 부재 — 전 코드베이스 유일 effective date = `kr_fee_rule.effective_from`(`Db.php:898`, 채널 수수료 도메인) | `NOT_APPLICABLE` |
| 11 | valid_to | 부재 — **`valid_to`/`effective_to` grep 0** → **폐구간 모델 자체가 신규** | `NOT_APPLICABLE` |
| 12 | status | 부재 · 인접 선례 = `agency_client_link.status`(pending/approved/revoked · `AgencyPortal.php:64-72`) | `LEGACY_ADAPTER`(선례) |
| 13 | evidence | 부재 | `NOT_APPLICABLE` |

**실측 개수: 13 / 13 전사.**

### 1-3. Binding Type — **원문 7종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | OWNED_BY | 부재 — 소유 관계를 표현하는 엣지 0 | `NOT_APPLICABLE` |
| 2 | OPERATED_IN | 부재 | `NOT_APPLICABLE` |
| 3 | VISIBLE_TO_REFERENCE | 부재 · **인접 실선례** = `agency_client_link` approved + **`READ_ONLY` effect 실구현**(`AgencyPortal.php:89` `defaultScope()` `['write'=>false,…]` → `index.php:92-96` write 미허가 시 4대 메서드 **403**) | `LEGACY_ADAPTER` |
| 4 | MANAGED_BY_REFERENCE | 부재 · 인접 = `agency_client_link`(1홉·동의 기반) | `LEGACY_ADAPTER` |
| 5 | REPORTING_ONLY | 부재 | `NOT_APPLICABLE` |
| 6 | SHARED_SERVICE_REFERENCE | 부재 | `NOT_APPLICABLE` |
| 7 | PARTNER_REFERENCE | 부재 · 인접 = `partner_account.TYPES` 3종(`PartnerPortal.php:29`) — §36 `PARTNERSHIP_TYPE` 12종과 **교집합 0** | `LEGACY_ADAPTER` |

**실측 개수: 7 / 7 전사.**

**총 실측 개수: 28 / 28 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · 부재 18 · 어댑터 9 · 이름만 1.

## 2. 규칙

- 🔴 **`app_user.parent_user_id` 를 §21 커버로 계산 금지.** 동일 tenant_id 를 물려받는 **테넌트 내부 사용자 트리**다. 2단으로 봉인되어 있어(3단 생성 경로 부재) 계층으로 승격할 여지도 없다.
- 🔴 **`agency_client_link` 를 §21 근거로 계산 금지.** 이분·N:M·1홉·동의 기반 접근 허가. 원문 말미가 지정한 **Authorization Policy** 층 자산이다 — Organization Binding 으로 승격하면 원문 요구를 정면으로 위반한다.
- 🔴 **`X-Act-As-Tenant` 를 §21 근거로 계산 금지.** `'platform_growth'` 단일값 하드코딩 스위치(`UserAuth.php:397-400`)다.
- 🔴 **"테넌트 격리가 REAL 이므로 Tenant Hierarchy 가 있다" 는 역산.** 격리(`index.php:600`)는 **평면 파티션 강제**이지 계층 표현이 아니다. 두 축을 섞지 마라.
- 🔴 **`Demo Tenant` 를 "구현됨"으로 계산 금지.** 물리 분리는 REAL 이나 **테넌트 타입이 아니라 문자열 접두 술어 12벌**이며 이름조차 3종(`isDemo`/`isDemoTenant`/`isDemoRequest`)으로 갈라져 `demo_acct_1` 이 `Pnl` 에선 데모, **`Rollup.php:70` 에선 운영**으로 판정된다. **술어 SSOT 부재는 관찰 사실로만 등재**(등급 미부여 · 물리 분리가 별개 층에서 강제 중).
- **테넌트 열거를 신설할 때 20번째 `SELECT DISTINCT tenant_id` 를 추가하지 마라.** 19개소 역추론은 **권위 목록 부재의 증상**이다. 테넌트 마스터 도입 시 기존 19개소는 **점진 위임 대상**이지 병존 대상이 아니다(중복 인텔리전스 금지).
- **격리 강제선은 재사용 강제** — 신규 바인딩은 `index.php:600` 의 무조건 덮어쓰기 + `:585` fail-closed 아래에서 동작해야 한다. **바인딩이 격리를 우회하는 경로를 만들면 원문 §21 금지 조항 위반.**
- **스키마 도입 제약**(§20): `backend/migrations/` 는 172차 정지 → `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS` + `try{ALTER}catch{}` · **MySQL/SQLite 두 방언 동시 작성 의무**.
- **`status` 는 `agency_client_link`(pending/approved/revoked) 패턴 확장** — 신규 상태 어휘 발명 금지.
