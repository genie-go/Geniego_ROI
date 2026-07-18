# DSAR — Approval Authority Runtime Guards (§67)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §67(2682-2725) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §8 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> 측정기 분모: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=67` → **§1 항목 40**(불릿 40·번호 0). 육안 금지.

## 0. 판정 원리 — "차단할 대상이 실행시점에 있는가"

§67은 승인 **집행(runtime) 직전에 차단하라**는 40개 가드다. §66 static lint(저장 시점)와 달리, 여기서는 **이미 실재하는 런타임 통제(tenant 격리·FX TTL·자기승인차단·해시검증)를 재사용**할 수 있는 항목이 갈린다.

| 판정 | 의미 |
|---|---|
| `LEGACY_ADAPTER` | 인접 런타임 통제가 실재하여 **Authority 경로에서 확장·연결하면 되는** 가드(재구현 금지) |
| `ABSENT` | 차단 로직이 통째로 없음 · 단 인접 데이터축은 존재 |
| `NOT_APPLICABLE` | 차단 대상 엔티티(Registry/Version/Matrix/Subject/Position …) 자체가 부재 |

★**`VALIDATED_LEGACY` 미사용**(cover 0). `LEGACY_ADAPTER` 11건은 **확장 대상 인접 가드**이지 커버가 아니다.

## 1. 원문 전사 + 판정 — **원문 40종**(§67 2686-2725)

| # | 원문 runtime guard(verbatim) | 현행 대조(ⓑ file:line) | 판정 |
|---|---|---|---|
| 1 | Authority Registry Not Found | Registry 엔티티 부재(ⓑ §1) — 조회 대상 없음 | `NOT_APPLICABLE` |
| 2 | Authority Definition Not Found | Authority Definition 엔티티 0(ⓑ §1) | `NOT_APPLICABLE` |
| 3 | Authority Version Inactive | version 컬럼 6개 하드코딩 태그 · 활성/비활성 상태전이 0(ⓑ §5) | `NOT_APPLICABLE` |
| 4 | Matrix Not Found | Authority Matrix 0(ⓑ §1) | `NOT_APPLICABLE` |
| 5 | Matrix Version Inactive | Matrix·버전 부재(ⓑ §1) | `NOT_APPLICABLE` |
| 6 | Matrix Entry Inactive | Matrix Entry 부재(ⓑ §1) | `NOT_APPLICABLE` |
| 7 | Subject Inactive | Subject Authority 엔티티 0(ⓑ §1) | `NOT_APPLICABLE` |
| 8 | Role Inactive | 역할=`$roleRank`/`team_role` **문자열 등급** 실재 · 단 role 활성/비활성 상태 판정 없음(ⓑ §4.2) | `ABSENT` |
| 9 | Position Vacant | Position/직위 공석 엔티티 0(ⓑ §3) | `NOT_APPLICABLE` |
| 10 | Tenant Mismatch | **REAL** — `index.php:600` 무조건 `X-Tenant-Id` 덮어쓰기 · `:593` auth_tenant · 단 strict 기본 OFF(`:585`)·SPA/세션 미도달(ⓑ §7) | `LEGACY_ADAPTER` |
| 11 | Workspace Mismatch | Workspace 엔티티 0(테넌트 하위 workspace 개념 부재·ⓑ §1) | `NOT_APPLICABLE` |
| 12 | Legal Entity Mismatch | Legal Entity 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §1) | `NOT_APPLICABLE` |
| 13 | Organization Mismatch | Org Authority 0 · 조직=`team`이나 승인 스코프 아님(ⓑ §3) | `NOT_APPLICABLE` |
| 14 | Geography Mismatch | `Geo`(IP→ISO→언어)·TikTok country_code 실재이나 **Authority 지리 스코프 아님**(별개 도메인·Registry §13 KEEP_SEPARATE) | `ABSENT` |
| 15 | Resource Mismatch | `acl_permission` scopeSql **데이터-행 필터** 실재(`TeamPermissions.php:286`) · 단 Authority 리소스 스코프 아님(장식·ⓑ §3) | `LEGACY_ADAPTER` |
| 16 | Action Mismatch | 승인 action scope 부재 · 인접=HTTP 메서드 축(`index.php:568` write=POST/PUT/…) — action 게이트 성격만(ⓑ §4.2) | `LEGACY_ADAPTER` |
| 17 | Currency Mismatch | `currency_scope`/`allowed_currency` 0 · 통화는 변환 전용(ⓑ §4 §26) | `ABSENT` |
| 18 | FX Rate Unavailable | fxToKrw 변환기 실재 · 만료 시 라이브 재조회(`Connectors.php:1749`·`:1794`) — 승인축 미연결이나 조회 실재 | `LEGACY_ADAPTER` |
| 19 | FX Rate Stale | **24h TTL 신선도 가드 실재**(`Connectors.php:1794-1796` `$age<86400`·만료 시 재조회·ⓑ §4 §27 FLIP) · 단 as-of 과거환율 불가 | `LEGACY_ADAPTER` |
| 20 | Amount Below Floor | 하한(floor) 개념 0 · HIGH_VALUE_KRW는 상한 boolean만(ⓑ §4) | `ABSENT` |
| 21 | Amount Above Ceiling | `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1016`) → requires_approval boolean만 켬 · **ceiling 차단 아님**(ⓑ §1·§4) | `LEGACY_ADAPTER` |
| 22 | Threshold Gap | threshold 엔티티 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 23 | Threshold Conflict | 복수 threshold/Authority 부재 → 충돌 무발동(ⓑ §6) | `NOT_APPLICABLE` |
| 24 | Limit Period Exhausted | **실재(마케팅)** — `AutoCampaign.php:855` periodSpentToDate 기간 누적→`:856` budget 비교→도달 시 `:864` pause(승인 아님·ⓑ §4 §30 FLIP) | `LEGACY_ADAPTER` |
| 25 | Cumulative Limit Exceeded | `AutoCampaign.php:843-889` 광고예산 누적차감+상한집행 실재(마케팅 도메인·승인 아님·ⓑ §4 §31 FLIP) | `LEGACY_ADAPTER` |
| 26 | Explicit Deny | `acl_permission`=allow-only · deny 표현 자체가 없음(ⓑ §3·§6) | `ABSENT` |
| 27 | Eligibility Failed | §45/§46 Eligibility=`BLOCKED_PREREQUISITE` · 승인자격 판독축 부재(ⓑ §3.결론) | `ABSENT` |
| 28 | Security Blocked | **REAL** — `index.php` 인증/RBAC 미들웨어가 write에 analyst+ 요구(`:568-574`)·api-key 트래픽 차단(ⓑ §4.2) · 단 approval authority 아님 | `LEGACY_ADAPTER` |
| 29 | Self-approval Blocked | `Mapping.php:268` 자기승인차단 **1경로만 REAL** · 나머지 3경로(catalog/action_request/admin_growth) 미방어(ⓑ §2·§8) | `LEGACY_ADAPTER` |
| 30 | SoD Failed | Separation-of-Duties 정책 0(ⓑ §6) | `ABSENT` |
| 31 | Conflict of Interest | CoI 판정 0(ⓑ §6) | `ABSENT` |
| 32 | Authority Conflict Unresolved | 복수 Authority 부재 → §53/§54 충돌해소 무발동(ⓑ §6) | `NOT_APPLICABLE` |
| 33 | Snapshot Missing | 3경로 승인시점 권한/역할/플랜 미보존(ⓑ §5 §55) — 저장 자체 없음 | `ABSENT` |
| 34 | Snapshot Hash Invalid | **불변 정본=`SecurityAudit::verify():56-68`** 해시 재계산+`hash_equals`+prev 교차(ⓑ §5 §55/§56) · 단 approval snapshot에 미적용 → 확장 대상 | `LEGACY_ADAPTER` |
| 35 | Task Assignee Drift | §47~§54 Candidate/Resolution 전 ABSENT · task assignee 대조 대상 부재(ⓑ §6) | `NOT_APPLICABLE` |
| 36 | Decision Actor Drift | decision actor는 저장(`Mapping:285`{user,ts})되나 **Snapshot 대조 대상이 없어 drift 판정 불가**(ⓑ §5) | `ABSENT` |
| 37 | Authority Changed Since Claim | Authority 변경 이벤트/claim 시점 추적 0(ⓑ §6 §65-#23) | `NOT_APPLICABLE` |
| 38 | Critical Reconciliation Drift | §63 Reconciliation ABSENT · **Tenant 마스터 부재로 대사 기준 자체 없음**(ⓑ §7) | `ABSENT` |
| 39 | Future Version Activation Failed | §58 Future-Dated ABSENT · 미래 effective_from 예약 0(ⓑ §5) | `NOT_APPLICABLE` |
| 40 | Kill Switch 활성 | 승인 레벨 kill switch 부재 · `agent_mode` 이진게이트(`AdAdapters:42-49`)는 자동집행 억제용(승인 kill 아님·ⓑ §2 5번째축) | `ABSENT` |

**실측 개수: 40 / 40 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 11(#10·15·16·18·19·21·24·25·28·29·34) · `ABSENT` 12(#8·14·17·20·26·27·30·31·33·36·38·40) · `NOT_APPLICABLE` 17(#1·2·3·4·5·6·7·9·11·12·13·22·23·32·35·37·39).

> 🔴 **커버 0.** `LEGACY_ADAPTER` 11건은 **확장 대상 인접 가드**(tenant 격리·FX TTL·자기승인차단 1경로·해시검증·예산 누적)이지 "Authority 가드가 이미 있다"가 아니다. 특히 #24/#25 AutoCampaign·#34 SecurityAudit는 **마케팅/감사 도메인 자산**이므로 승인 경로에 **재구현 없이 연결**해야 하며 새 엔진을 만들면 중복이다. `NOT_APPLICABLE` 17건은 차단 대상 엔티티가 통째로 부재하다.

## 2. 규칙

- 🔴 **11개 `LEGACY_ADAPTER` 가드는 "재사용", 12개 `ABSENT`는 "신설", 17개 `NOT_APPLICABLE`은 "선행 엔티티 후 발동"** — 이 3분류가 §67 착수 순서다. 인접 가드를 새로 짜지 마라(중복 엔진 금지).
- 🔴 **Tenant Mismatch(#10)를 Authority 경로에서 strict 기본 ON으로** — `index.php:600` 런타임 덮어쓰기는 신뢰하되 strict fail-closed(`:585` opt-in)를 승인 집행 직전 **기본 ON**으로. SPA/세션 경로가 미들웨어를 우회하므로(ⓑ §7) 승인 핸들러 내부에서 tenant 재검증.
- 🔴 **Self-approval Blocked(#29)를 4경로 전체로 승격** — `Mapping.php:268` 방어를 catalog/action_request/admin_growth로 확장(현재 1/4만 방어·ⓑ §8). 이는 §65-#17 🔴실재 gap의 직접 봉쇄다.
- 🔴 **Snapshot Hash Invalid(#34)는 `SecurityAudit::verify()` 확장** — 새 해시엔진 금지. tenant 포함 해시+prev 교차 정본을 approval snapshot에 연결. `menu_audit_log.hash_chain` **인용 금지**([[reference_menu_audit_log_not_tamper_evident]]).
- 🔴 **AutoCampaign 예산 로직(#24·#25) 오도용 금지** — Limit Period/Cumulative가 "이미 있다"고 승인 도메인으로 착각 마라. 이는 **마케팅 예산 페이싱**(승인 워크플로 아님·ⓑ §4 FLIP)이다. 승인 누적한도는 §24 Amount Band+Utilization Reference로 **별도 신설**하되 페이싱 패턴만 참조.
- 🔴 **FX Rate Stale(#19)/Amount Above Ceiling(#21) 부분방어를 "완전"으로 오표기 금지** — 24h TTL은 신선도만, HIGH_VALUE_KRW는 boolean만 집행한다. as-of 과거환율·실 ceiling 차단은 저장계층·Amount Band 신설 후에야 정직하다(ⓑ §4).
- 🔴 **Kill Switch(#40)를 `agent_mode`로 대체 착각 금지** — `agent_mode`는 자동집행 억제(recommend/approval/auto) 이진게이트이지 승인 kill switch가 아니다. 별도 신설 시 기존 게이트와 스코프 분리(ⓑ §2 5번째축).
