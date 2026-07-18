# DSAR — Approval Authority Critical Gap Policy (§65)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §65(2612-2643) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §8 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> 측정기 분모: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=65` → **§1 항목 28**(불릿 28·번호 0). 육안 금지.

## 0. 판정 원리 — "gap"이 두 종류다

§65는 "High/Critical로 처리하라"는 **후보 목록**이다. 그러나 이 레포에는 **Approval Authority 개념 자체가 없다**(ⓑ §0). 따라서 각 gap 후보는 두 부류로 갈린다.

| 부류 | 의미 | 판정 어휘 |
|---|---|---|
| 🔴 **실재(개념 부재로 발생)** | 승인 판정축이 없어 **무조건 통과**하거나, 현행 코드가 이미 안티패턴을 수행 중 → **지금 존재하는 위험** | `LEGACY_ADAPTER`(진입게이트/상수/부분방어가 권위를 대체) 또는 `ABSENT`(차단수단이 통째로 없음) |
| ⚪ **미구현(선행 엔티티 부재)** | Version/Matrix/Threshold/Subject 등 **선행 엔티티가 없어 "판정 자체가 없다"** → gap이 아니라 미착수 | `ABSENT`·`NOT_APPLICABLE`·`BLOCKED_*` |

★**`VALIDATED_LEGACY`는 사용하지 않는다**(cover 0). Authority 엔티티가 통째로 부재하므로 어떤 gap도 "기존 구현으로 이미 커버됨"이 아니다.

★🔴 실재 = **6건**(ⓑ §8): Actor Authority 없이 승인 성공 · Amount>Limit 승인 · Explicit Deny 우회 · Self-approval 우회 · Manager 자동 Authority · Role 문자열 판정. 나머지 22건 = 미구현.

## 1. 원문 전사 + 판정 — **원문 28종**(§65 2614-2643)

| # | 원문 gap 후보(verbatim) | 부류 | 현행 대조(ⓑ file:line) | 판정 |
|---|---|---|---|---|
| 1 | Authority Version 없이 Approval Decision 허용 | ⚪미구현 | 불변 prev-링크 버전체인 선례 0 · version 컬럼 6개 전부 하드코딩/서술 태그(ⓑ §5) | `ABSENT` |
| 2 | Matrix Version 없이 Authority 판정 | ⚪미구현 | Authority Matrix·DOA Table 0(ⓑ §1) — 판정할 Matrix 자체 부재 | `ABSENT` |
| 3 | Actor에게 Authority가 없는데 승인 성공 | 🔴실재 | Authority 개념 부재 → 승인자=**진입게이트 통과자**(analyst+ / requirePro / requirePlan('admin'))이지 자격자 아님(ⓑ §2·§3.결론) | `LEGACY_ADAPTER` |
| 4 | Amount가 Limit을 초과했는데 승인 성공 | 🔴실재 | 유일 금액조건=`Catalog.php:1016` `HIGH_VALUE_KRW=5000000.0` → `:1103-1105` **requires_approval boolean만** 켬 · 한도 집행 0(ⓑ §1·§4) | `LEGACY_ADAPTER` |
| 5 | Explicit Deny가 있는데 승인 성공 | 🔴실재 | `acl_permission`=**allow-only** · explicit deny 표현 자체가 없음(ⓑ §3·§6) → deny가 승인을 막을 구조 부재 | `ABSENT` |
| 6 | Wrong Tenant Authority 사용 | 🔴잔여위험 | Cross-tenant 차단 REAL(`index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기) **단 strict fail-closed 기본 OFF**(`:585` opt-in)·SPA/세션 미도달(ⓑ §7) | `BLOCKED_CROSS_TENANT` |
| 7 | Wrong Legal Entity Authority 사용 | ⚪미구현 | Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1) | `ABSENT` |
| 8 | Wrong Currency Authority 사용 | ⚪미구현 | `currency_scope`/`allowed_currency` 0 · 통화는 변환 전용(ⓑ §4 §26) | `ABSENT` |
| 9 | FX Rate 없이 Currency 변환 승인 | ⚪미구현 | 환율 변환기 실재(`Connectors.php:1749` fxToKrw)이나 **승인축과 무연결** · 승인 경로에 FX 게이트 0 | `LEGACY_ADAPTER` |
| 10 | Stale FX Rate로 고액 승인 | 🔴부분방어 | **24h TTL 신선도 가드 실재**(`Connectors.php:1794-1796` 만료 시 라이브 재조회) · 단 **과거환율 as-of 조회는 불가**(rate_date 컬럼 0·ⓑ §4 §27 FLIP) | `LEGACY_ADAPTER` |
| 11 | Threshold Gap으로 승인 Actor 미결정 | ⚪미구현 | `amount_threshold`/`amount_band`/`approval_threshold` 0(ⓑ §4) — threshold 엔티티 부재 | `ABSENT` |
| 12 | Threshold Overlap으로 복수 Authority 충돌 | ⚪미구현 | 복수 Authority가 애초에 없어 충돌 무발동(ⓑ §6·§4.8) | `ABSENT` |
| 13 | 동일 Actor의 누적 Limit 초과 | ⚪미구현 | 승인 도메인 누적한도 0 · `AutoCampaign:843-889`는 **마케팅 예산**(승인 아님·ⓑ §4 §30/§31 FLIP) | `ABSENT` |
| 14 | Position Vacancy Actor에게 Authority 부여 | ⚪미구현 | Position/직위 공석 엔티티 0 · 승인자=api-key/플랜 게이트(ⓑ §3) | `ABSENT` |
| 15 | Terminated Subject의 Active Authority | ⚪미구현 | Subject Authority 엔티티 0 · 종료 subject 상태판정 없음(ⓑ §1) | `ABSENT` |
| 16 | Expired Authority로 승인 | ⚪미구현 | `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` 제외·ⓑ §5) — 만료 판정 대상 부재 | `ABSENT` |
| 17 | Self-approval Policy 우회 | 🔴실재(3경로) | `Mapping.php:268` 자기승인차단 **1경로만 방어** · catalog/action_request/admin_growth **3경로 미방어**(ⓑ §2·§8) | `LEGACY_ADAPTER` |
| 18 | SoD Failure 무시 | ⚪미구현 | Separation-of-Duties 정책 0(ⓑ §6) | `ABSENT` |
| 19 | Authority Snapshot 누락 | ⚪미구현 | 3경로 다 승인시점 권한/역할/플랜 미보존 → as-of 재구성 불가(ⓑ §5 §55) | `ABSENT` |
| 20 | Current Matrix로 과거 Decision 재해석 | ⚪미구현 | Matrix·effective dating 부재 · 정면 반례 `AgencyPortal.php:304`,`:381` `revoked_at=NULL` in-place 소거(ⓑ §5 §59) | `ABSENT` |
| 21 | Task Assignee와 Authority Resolution 불일치 | ⚪미구현 | §47~§54 Candidate/Resolution 전 ABSENT(ⓑ §6) — assignee 대조 대상 부재 | `ABSENT` |
| 22 | Decision Actor와 Authority Snapshot 불일치 | ⚪미구현 | Snapshot 자체 부재(#19) → 대조 무발동(ⓑ §5) | `ABSENT` |
| 23 | Authority 감소 후 고액 Pending Task 미재검증 | ⚪미구현 | Authority 변경 이벤트·pending 재검증 훅 0(ⓑ §6) | `ABSENT` |
| 24 | Customer Customization으로 Mandatory Financial Limit 제거 | ⚪미구현 | Mandatory Financial Control 개념 0 → 제거를 막을 lock 대상 부재(ⓑ §4) | `ABSENT` |
| 25 | Static Subject Authority에 종료일·사유 없음 | ⚪미구현 | Subject Authority 엔티티 0(#15)(ⓑ §1) | `ABSENT` |
| 26 | Manager에게 자동 Monetary Authority 부여 | 🔴실재 | `parent_user_id`·`team_role` 자동 파생이 **현행 접근권한을 자동 부여**(ⓑ §3·§4.1) · 단 Monetary 축은 부재 → "금전권한"으로는 무해하나 **자동 부여 메커니즘은 실재** | `LEGACY_ADAPTER` |
| 27 | Role 이름 문자열로 Authority 판정 | 🔴실재 | `$roleRank` viewer<connector<analyst<admin **문자열 등급 비교**로 접근 판정(`index.php:554`·`:568`·ⓑ §4.2) — 정확히 이 안티패턴 | `LEGACY_ADAPTER` |
| 28 | Spreadsheet와 Canonical Matrix Drift 미탐지 | ⚪미구현 | Spreadsheet Authority·Canonical Matrix 둘 다 0(ⓑ §1) → drift 대사 대상 부재 | `ABSENT` |

**실측 개수: 28 / 28 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 7(#3·4·9·10·17·26·27) · `BLOCKED_CROSS_TENANT` 1(#6) · `ABSENT` 20 · `NOT_APPLICABLE` 0.

> 🔴 **커버 0.** 🔴실재 6건(#3·4·5·17·26·27)은 **"기존 구현이 gap을 이미 막는다"가 아니라 오히려 gap을 유발/방치하는 현행 메커니즘**이다. `LEGACY_ADAPTER`는 진입게이트·상수·부분방어가 **권위를 대체 중**이라는 표시일 뿐 커버가 아니다. 미구현 22건은 선행 엔티티(Version/Matrix/Threshold/Subject) 부재로 "판정 자체가 없다".

## 2. 규칙

- 🔴 **🔴실재 6건은 "별도 승인세션 실 결함"으로 등재하라** — high_value 라우팅 갭(#4)·1인 결재 3경로 self-approval(#17)·Actor Authority 부재(#3)는 문서화가 아니라 **코드 수정 대상**(단 본 세션 코드변경 0 · Golden Rule+verify+배포승인 별도).
- 🔴 **Explicit Deny(#5)를 "나중에 allow-list로 흉내"내지 마라** — `acl_permission` allow-only 위에 deny를 얹으면 우선순위 역전이 생긴다. Effect(allow/deny)를 1급 컬럼으로 신설하고 **deny>allow 결정순서**를 §66/§67에서 강제.
- 🔴 **Role 문자열 판정(#27)을 Authority Binding으로 승격하되 `$roleRank`를 재구현하지 마라** — 기존 `index.php:554` 등급을 Role Binding의 **입력**으로 참조(ⓑ §4.2 "두 축 완전 직교" 유지 · `team_role`↔`roleRank` 매핑 선결).
- 🔴 **Manager 자동 부여(#26) 상속 금지** — Registry 신설 시 `parent_user_id`를 Authority 소스로 재사용하면 **의미 변경이 tenant 해석 전역을 붕괴**시킨다(ⓑ §3.1). Authority는 명시 Binding으로만.
- 🔴 **Amount>Limit(#4) 구조 예방** — HIGH_VALUE_KRW 상수를 §24 Amount Band로 승격하되 **신규 임계상수 추가 금지**(ⓑ §4). Band가 실제 한도집행(ceiling block)까지 해야 gap이 닫힌다.
- 🔴 **Stale FX(#10) 부분방어를 "완전"으로 오표기 금지** — 24h TTL은 신선도만 보증하고 **as-of 과거환율은 여전히 불가**하다. 고액 승인의 확정환율은 rate_date 저장계층 선신설 후에만 정직하다.
