# DSAR — Candidate Exclusion Reason (§49)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §49(2008-2045) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §6 · 후보 엔티티: [DSAR_APPROVAL_AUTHORITY_CANDIDATE.md](DSAR_APPROVAL_AUTHORITY_CANDIDATE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Candidate **Exclusion 도출** 로직 | 🔴 grep **0** — 후보(§47)가 없으니 "왜 이 자격자가 제외되었는가"를 계산하는 코드 부재(ⓑ §6) | `ABSENT` |
| exclusion 인접 자산 REAL | WRONG_TENANT→cross-tenant 차단 REAL(`index.php:600`) · SELF_APPROVAL_BLOCKED→`Mapping.php:268` · FX_RATE_STALE→24h TTL 부분(`Connectors.php:1794-1796`) · LIMIT_EXHAUSTED→`AutoCampaign` 예산상한(마케팅) | `LEGACY_ADAPTER` |
| exclusion 인접 부재 REAL | EXPLICIT_DENY→**deny 표현 자체 없음**(`acl_permission` allow-only·ⓑ §3·§6) · POSITION_VACANT→직급 0(ⓑ §3) | `ABSENT` |

★**Exclusion 은 후보 집합(§47)에서 부적격자를 걸러내는 사유 태그다.** 후보 도출이 부재하므로 34개 사유는 전량 미소비이며, 아래는 원문 전사(신설 명세)다. evidence는 `SecurityAudit`(menu_audit_log 금지·[[reference_menu_audit_log_not_tamper_evident]]).

## 1. 원문 전사 + 판정 — **원문 34종**(§49 지원 Exclusion · 측정기 `--sec=49`=34)

| # | 원문 Exclusion | 현행 대조 (ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | SUBJECT_INACTIVE | subject 활성 판별을 exclusion 으로 소비하는 코드 0 — 인접 `app_user` 존재하나 자격 제외 미소비 | `ABSENT` |
| 2 | EMPLOYMENT_INACTIVE | 🔴 고용상태 엔티티 0 — 다홉 사람계층·직급 0(ⓑ §3) | `ABSENT` |
| 3 | ROLE_INACTIVE | Role 비활성 개념 0 — `roleRank`=상수 등급(활성/비활성 없음·ⓑ §3) | `ABSENT` |
| 4 | POSITION_INACTIVE | 직급/Position 엔티티 0(ⓑ §3) | `ABSENT` |
| 5 | POSITION_VACANT | 🔴 직급 0 — 공석 판별 원천 불가(ⓑ §3) | `ABSENT` |
| 6 | WRONG_TENANT | 인접 = Cross-Tenant 차단 **REAL**(`index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기·`:593` auth_tenant) · 🔴단 strict fail-closed 기본 OFF(`:585`·ⓑ §7) | `LEGACY_ADAPTER` |
| 7 | WRONG_WORKSPACE | Workspace 엔티티 부재 — tenant 하위 workspace 축 0 | `ABSENT` |
| 8 | WRONG_LEGAL_ENTITY | 🔴 Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` grep0·ⓑ §6) | `ABSENT` |
| 9 | WRONG_ORGANIZATION | Organization 엔티티 부재(조직계층 아님·ⓑ §7) | `ABSENT` |
| 10 | WRONG_REGION | Authority 지리 스코프 아님 — `Geo`(IP→ISO)·country_code 는 별개 도메인(§6 registry §0.13) | `KEEP_SEPARATE_WITH_REASON` |
| 11 | WRONG_COUNTRY | 상동 — TikTok country_code 차원은 채널 데이터·Authority 국가 스코프 아님 | `KEEP_SEPARATE_WITH_REASON` |
| 12 | WRONG_RESOURCE | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`) — Authority 리소스 스코프 아님(장식) | `LEGACY_ADAPTER` |
| 13 | WRONG_ACTION | 승인 대상 action 축 부재 — HTTP 메서드 `roleRank`(`index.php:568`)는 승인 action 아님(ⓑ §3) | `ABSENT` |
| 14 | WRONG_DOMAIN | Authority Domain(§8) 자체 없음(§6 registry §0.7) | `ABSENT` |
| 15 | WRONG_AUTHORITY_TYPE | Authority Type(§7) 자체 없음(§6 registry §0.8) | `ABSENT` |
| 16 | WRONG_CURRENCY | 🔴 통화 스코프 0 — 통화는 변환 전용(`fxToKrw:1749`·ⓑ §4) | `ABSENT` |
| 17 | BELOW_MINIMUM | 최소한도 축 부재 — `amount_band`/`amount_threshold` grep0(ⓑ §4) | `ABSENT` |
| 18 | ABOVE_MAXIMUM | 인접 = `HIGH_VALUE_KRW=5000000`(`Catalog.php:1016`)이나 **승인 필요여부 boolean 만 켬**·한도 차단 미집행(ⓑ §4) | `ABSENT` |
| 19 | LIMIT_EXHAUSTED | 인접 = `AutoCampaign.php:843-889` 예산 상한 도달 시 pause(`:864`·마케팅 도메인·승인 아님·ⓑ §4) | `LEGACY_ADAPTER` |
| 20 | PERIOD_LIMIT_EXHAUSTED | 인접 = `AutoCampaign.php:855` `periodSpentToDate`(기간 내 누적·마케팅·ⓑ §4 FLIP) | `LEGACY_ADAPTER` |
| 21 | FX_RATE_UNAVAILABLE | 🔴 환율 저장계층 부재 — `app_setting` KV 단일행 덮어쓰기(`Connectors.php:1790`)·특정시점 rate 부재 판정 불가(ⓑ §4) | `ABSENT` |
| 22 | FX_RATE_STALE | 인접 = 24h TTL 신선도 가드 **REAL**(`Connectors.php:1794-1796` `$age<86400` 만료 시 라이브 재조회·ⓑ §5 FLIP·단 과거환율 조회 불가) | `LEGACY_ADAPTER` |
| 23 | AUTHORITY_EXPIRED | 🔴 `valid_to`/`effective_to` grep 0(오탐 `Onsite.php:396` 제외·ⓑ §5) — 인접 `effective_from`은 수수료/VAT 도메인(승인 엔티티엔 없음) | `ABSENT` |
| 24 | MATRIX_VERSION_INACTIVE | Authority Matrix/불변 버전체인 선례 0(ⓑ §1·§5) → 선결 | `BLOCKED_PREREQUISITE` |
| 25 | EXPLICIT_DENY | 🔴 **explicit deny 표현 자체 없음** — `acl_permission`=allow-only(ⓑ §3·§6) · deny>allow 우선 구조 0 | `ABSENT` |
| 26 | SECURITY_BLOCKED | 보안 차단 사유를 후보 exclusion 으로 소비 0 — 인접 `SecurityAudit`·`index.php` 가드는 별개 소비처(WRONG_TENANT 로 이미 계상) | `ABSENT` |
| 27 | SELF_APPROVAL_BLOCKED | 인접 = `Mapping.php:268` 자기승인 차단 **REAL** · 🔴단 **1경로(mapping)에만** 존재·나머지 3경로 미방어(ⓑ §2·§8) | `LEGACY_ADAPTER` |
| 28 | SOD_FAILED | Segregation of Duties 판정 0 — 직무분리 축 부재(ⓑ §6) | `ABSENT` |
| 29 | CONFLICT_OF_INTEREST | CoI Hook 0 — Conflict 탐지/해소(§53/§54) 부재("conflict"=SQL `ON CONFLICT` 무관·ⓑ §6) | `ABSENT` |
| 30 | AUTHORIZATION_FAILED | 인접 = 미들웨어 `roleRank` 게이트(`index.php:554,568` 진입 인가)이나 Authority 인가 아님·후보 exclusion 미소비(ⓑ §3) | `LEGACY_ADAPTER` |
| 31 | DELEGATION_REQUIRED_REFERENCE | 인접 = `TeamPermissions.php:639` 위임상한 자기정합(`DELEGATION_EXCEEDED`·ⓑ §3)이나 승인 delegation 참조 아님 | `LEGACY_ADAPTER` |
| 32 | DUPLICATE_AUTHORITY | 인접 = `Mapping.php:278` 승인자 dedup(`approvals_json`·ⓑ §2)이나 authority 중복 탐지 아님 | `LEGACY_ADAPTER` |
| 33 | MANUAL_EXCLUSION | 수동 제외 UI/필드 0 — 후보 파이프라인 부재로 수동 개입점 없음(ⓑ §6) | `ABSENT` |
| 34 | OTHER | 포괄 사유 — 후보 도출 부재로 무의미(선행 부재) | `NOT_APPLICABLE` |

**실측 개수: 34 / 34 전사**(측정기 `--sec=49`=34 · 원문 2012-2045). 커버리지 = **`VALIDATED_LEGACY` 0** · `ABSENT` 21 · `LEGACY_ADAPTER` 9 · `KEEP_SEPARATE_WITH_REASON` 2 · `BLOCKED_PREREQUISITE` 1 · `NOT_APPLICABLE` 1.

> 🔴 **커버 0.00%.** Exclusion 도출 파이프라인이 통째로 부재하므로 어떤 사유도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 9건(WRONG_TENANT=cross-tenant guard · SELF_APPROVAL_BLOCKED=Mapping:268 · FX_RATE_STALE=24h TTL · LIMIT/PERIOD=AutoCampaign · WRONG_RESOURCE=acl scopeSql · AUTHORIZATION_FAILED=roleRank · DELEGATION=TeamPermissions:639 · DUPLICATE=Mapping:278 dedup)은 **확장 대상 인접 자산이며 전부 다른 소비처**다.

## 2. 규칙

- 🔴 **인접 exclusion 을 재구현하지 마라** — WRONG_TENANT=`index.php:600` cross-tenant guard 확장(strict fail-closed 기본 ON 권장) · SELF_APPROVAL_BLOCKED=`Mapping.php:268` 패턴을 **4경로 전체로 승격**(현행 1경로만·ⓑ §2·§8) · LIMIT_EXHAUSTED=`AutoCampaign` 페이싱 참조. **중복 엔진 금지.**
- 🔴 **EXPLICIT_DENY 를 "부분 있음"으로 표기 금지** — `acl_permission`은 allow-only 이며 deny 표현·deny>allow 우선 구조가 **저장·판정 계층 전부에서 0**(ⓑ §3·§6)이다. §65 "Explicit Deny 우선 위반" gap 은 gap 이 아니라 **미구현**이며, 신설 시 deny 우선 평가를 §48 우선순위보다 먼저 게이트한다.
- 🔴 **FX_RATE_STALE/FX_RATE_UNAVAILABLE 를 균질화하지 마라** — STALE 은 24h TTL 가드로 **부분 인접**(`Connectors.php:1794-1796`)이나 UNAVAILABLE(특정시점 rate 부재)은 **저장계층부터 부재**(rate_date/as-of 컬럼 0·ⓑ §4)로 판정 자체가 불가하다. 두 사유의 부재 깊이가 다르다.
- 🔴 **evidence 는 `SecurityAudit::verify()` 확장** — exclusion 사유 로그는 `menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]·verify() 0·preimage ts 소실 = 검증 불가능한 장식).
- 🔴 **코드 변경 0 유지** — Exclusion 도출 엔진 신설·self-approval 4경로 승격은 후보 도출(§47) 선행 후 **별도 승인세션**.
