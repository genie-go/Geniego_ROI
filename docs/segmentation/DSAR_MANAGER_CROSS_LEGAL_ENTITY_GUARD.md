# DSAR — Cross-Legal-Entity Manager Guard (§60)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §60 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

## 0. 현행 실측 (file:line)

### ★ 대전제 — **`legal_entity` = backend/src 전역 grep 0** (본 전사에서 재확인)

`legal_entity`·`legalEntity` **히트 0**. 법인 개념이 **이름으로도 능력으로도 존재하지 않는다**(규칙 7 양방향 확인 완료).

| 후보 | 실측 | 왜 법인이 아닌가 |
|---|---|---|
| 🔴 **`DATA_SCOPES` 의 `'company'`** | `TeamPermissions.php:41` `['company','brand','team','campaign','product','channel','warehouse','partner','own']` | 🔴 **법인이 아니라 무제한 센티넬** — **`effectiveScope():258` `if ($st === 'company') return null;` // 전사 = 무제한**. **경계를 긋는 게 아니라 지운다.** 법인으로 읽으면 정반대 오판 |
| 🔴 **`ceo_name`** | `app_user` 프로필 **평문 문자열**(`UserAuth.php:307`·`:499`·`:677`·`:1720` · **`:1183` 가입 필수검사**) | FK 0 · 법인 엔티티 0 · 감독관계 0 · 승인라우팅 0 · 시점 0. **대표자 이름 텍스트일 뿐** |
| 🔴 **테넌트 = 법인 가정** | — | **역산이다.** 테넌트는 **구독 단위**다 — `PlanLimits::tenantPlan:32-41`(주석 `:31` *"테넌트 소유자(최상위 계정)의 **구독 플랜**"* · `:37` `SELECT COALESCE(plans,plan,'free') FROM app_user WHERE tenant_id=?`). 법인 1:N 테넌트도, 테넌트 1:N 법인도 표현 불가 |
| `business_number`·`business_type`·`country` | `UserAuth.php:499`·`:1720` 프로필 필드 | 법인 **속성 후보**이나 **엔티티·FK·경계 판정 술어 0** → 라벨 |
| 🔴 `business_unit_id` | **Trustpilot 자격증명** | 법인 아님(이름 함정) |
| 🔴 `admin_level`(master\|sub `UserAuth.php:171`) | 콘솔 특권 | Executive Level 아님 |

### ★축 주의 — 🔴 **"Cross-Legal-Entity 를 차단 중"으로 적으면 허구**

§59 와 동일 구조다. Cross-Legal-Entity Manager 가 발생하지 않는 이유는 **가드가 아니라 ① 법인 축 부재 ② Manager 관계 축 부재** — **양변이 모두 없다.** §60 은 **12항목 전부 이중 부재** 위에 있다.

> 🔴 **§60 은 §59 보다 부재가 한 단계 깊다.** §59 는 최소한 **테넌트라는 경계 단위가 실재**하고 인접 능력(`agency_client_link`)이 있었다. §60 은 **경계 단위 자체가 없다** → "가드를 만들면 된다"가 아니라 **법인 엔티티 선언이 선행**한다.

## 1. 원문 전사 + 판정 — **원문 12종**

원문 지시: *"Cross-Legal-Entity Manager 관계에 다음을 **기록한다**."* (§59 의 "차단하라"와 달리 **기록 요구**)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | subordinate legal entity | **`legal_entity` 전역 0** — 좌변 부재 | `ABSENT` |
| 2 | manager legal entity | **`legal_entity` 전역 0** + Manager 축 0 — **이중 부재** | `ABSENT` |
| 3 | relationship reason | 관계 사유 축 0(보고 관계 자체가 없음) | `ABSENT` |
| 4 | group function reference | 그룹 기능 엔티티 0. 🔴 `pm_portfolio` "프로그램"은 **주석 팬텀** — `Enterprise.php:13` 주석이 *"포트폴리오/**프로그램**"* 자칭하나 **코드에 program 개념 0**(`\bprogram\b` = LiveCommerce WebRTC 스트림명뿐) | `ABSENT` |
| 5 | shared service reference | Shared Service 엔티티 0. 인접 `agency_client_link`(`AgencyPortal.php:64-72`) = **테넌트 간 접근 허가**이지 법인 간 공유 서비스 아님(§59 8번과 동일 자산 — **중복 계상 금지**) | `KEEP_SEPARATE_WITH_REASON` |
| 6 | regional leadership reference | 🔴 **Regional Directory `ABSENT`** — `region` 3축 전부 무관: 광고 인구통계(`Db.php:681`,`:690`) · **Amazon Ads 엔드포인트 na·eu·fe**(`Connectors.php:2704-2710`) · **WMS 시·도**(`Wms.php:129`·`regionOf():286`). `APAC`/`EMEA`/`LATAM` **0**. **탐지·라우팅이지 명부 아님** | `ABSENT` |
| 7 | intercompany agreement | 법인 간 계약 축 0 | `ABSENT` |
| 8 | country restriction | 🔴 `country` 는 **존재하나 제약이 아니다** — `app_user` 프로필 필드(`UserAuth.php:499`) · `Geo.php:23-53` IP→ISO alpha-2 는 **언어 결정용**. **판독 술어·차단 효과 0** → 저장된 라벨 | `NAME_ONLY` |
| 9 | approval routing eligibility | 승인 라우팅 부재(승인 경로 4개 전량 "호출자가 곧 승인자") · 자격 술어 0 | `ABSENT` |
| 10 | financial authority reference | 🔴 **재무 권한 축 0.** `budget_amount`(migration `…168_001:14-15`) = **프로젝트 예산액이지 매니저 권한 아님**. 🔴 `DELEGATION_EXCEEDED`(`TeamPermissions:645`) = **권한 부여 상한**(재무 결재권 아님) | `ABSENT` |
| 11 | effective period | **`effective_to`/`valid_to`/`valid_from` grep 0** · 관계 자체가 없어 기간 부착 대상 0. 유일 `effective_from` = `kr_fee_rule`(`Db.php:898`) **세율 도메인** | `ABSENT` |
| 12 | evidence | 근거 첨부 축 0 | `ABSENT` |

**실측 개수: 12 / 12 전사.** (측정기 분모 12 · 원문 대조 12 · 전사 12 — **일치**)
커버리지 = **`VALIDATED_LEGACY` 0** · `KEEP_SEPARATE_WITH_REASON` 1 · `NAME_ONLY` 1 · `ABSENT` 10.

> ★ 규칙 4 확인: **원문 12번이 `evidence` 로 끝난다** → 전사 포함(원문 준거 · 날조 아님).
> ★ 원문 말미 별도 문장(항목 아님): *"**Cross-Legal-Entity Manager라고 해서 Financial Approval Authority를 자동 부여하지 마라.**"*

## 2. 규칙

- 🔴 **`DATA_SCOPES` 의 `'company'` 를 법인 경계로 재사용 절대 금지.** `effectiveScope():258` 이 **`return null`(무제한)** 이다 — **경계를 긋는 토큰이 아니라 지우는 토큰**이다. 이를 Legal Entity 로 승격하면 **법인 경계를 세우려다 전 테넌트 무제한 스코프를 부여**하게 된다(의미 정반대).
  - ⚠️ 관련 관찰(등급 미부여): `ORG_PRESET` 15팀 중 `'재무팀' => 'company'`(`TeamPermissions.php:717`) 는 **영원히 무제한**이다. 설계 의도 미확인.
- 🔴 **"테넌트를 법인으로 간주하고 §60 을 닫는다"는 역산 금지.** 테넌트 = **구독 단위**(`PlanLimits.php:36-37`)다. 법인 축을 테넌트에 사상하면 ① **1법인 다테넌트**(구독 분리)와 ② **1테넌트 다법인**(그룹사)이 **동시에 표현 불가**해지고, §60 1·2번(subordinate/manager legal entity)이 **항상 동일값 → 자동 PASS = 가짜녹색**이 된다.
- 🔴 **`ceo_name` 을 Legal Entity Officer 로 승격 금지.** `app_user` **프로필 평문 문자열**이며 FK·감독관계·시점 전무. `:1183` 가입 필수검사는 **입력 강제이지 관계 아님**. 승격하면 **문자열 비교로 법인 대표를 판정**하는 구조가 된다.
- 🔴 **`country`(8번)를 "있으니 제약도 있다"로 계산 금지**(규칙 7). 판독 술어 0 → **`NAME_ONLY`**. `pm_projects.owner_user_id` 4결격(**`WHERE owner_user_id` grep 0 = 판독 술어 0**)과 **정확히 동형**이며, `menu_defaults.version = 리터럴 'baseline'`(버전이 아니라 라벨)과도 동형이다.
- 🔴 **10번(Financial Authority)은 원문이 별도 문장으로 **자동 부여 금지**를 명시**했다 → **Manager 관계와 재무 결재권을 별도 축으로 선언**하라. 🔴 현행에 **동형 결함이 이미 실재**한다: §76 3번 *"Manager 라는 이유만으로 Approval Authority 자동 부여"*(`UserAuth.php:1064`·`TeamPermissions.php:136` `isManagerAdmin`). **이 패턴을 법인 축에 복제하면 원문 정면 위반.**
- 🔴 **12항목을 "기록 컬럼만 붙이면 된다"로 접근 금지.** 원문 동사가 "기록한다"라도 **1·2번의 좌·우변(법인 엔티티)이 없으면 기록할 값이 없다.** **Legal Entity Canonical 선언 → Subject-Entity Binding → §60** 순서가 강제된다(§66 Reconciliation 이 양변 부재로 이중 공허인 것과 동형 · 5-3-3-1 D-14).
- 🔴 **11번(effective period)에 "시점 컬럼만 붙이면 된다"는 일반화 금지** — 환율 축에서 이미 깨졌다(`fxToKrw` `Connectors.php:1749` = **컬럼도 이력도 없이 `app_setting` KV 단일행 덮어쓰기** `:1804-1805` → **복원할 게 없다**). §38 Business/System 이중 시간축 = **전례 0**.
- **5번은 §59 8번과 동일 자산(`agency_client_link`)을 가리킨다 — 중복 계상 금지**(규칙 9). 두 문서에서 각각 `KEEP_SEPARATE_WITH_REASON` 이며, **"두 곳에 인접 능력이 있으니 절반은 됐다"로 합산하면 위장**이다.
- 🔴 **신규 스키마는 마이그레이션 경로가 없다** — `backend/migrations/` **21파일 · 172차 정지**(최신 `20260527_172_002_coupon_tables.sql`) → `ensureTables` 멱등 패턴 강제 · **MySQL/SQLite 두 방언 수기 중복 작성 의무**. 🔴 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → §60 을 소급 적용할 집행 수단이 **현재 없다**(§40 직격).
