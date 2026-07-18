# DSAR — Approval Delegation Action Binding (§14)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §14(줄 912-961) · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) §2·§3.4
> 분모: 측정기 `node tools/measure_spec_denominator.mjs SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=14` = **36**(불릿 36·번호 0 = 지원 Action 24 + 필수 필드 12). 육안 계수 금지.

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_DELEGATION_ACTION_BINDING` 엔티티 | `delegation_action_binding`·`action_binding` grep **0** — Delegation Action Binding 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| APPROVE 인접(장식) | `acl_permission` ACTIONS 8종에 `approve` 존재(`TeamPermissions.php:39`) — **메뉴×action 부여 플래그**(장식)이지 승인 Authority Action 아님·기간/위임/재검증 전무 | `KEEP_SEPARATE_WITH_REASON` |
| 승인 상태전이 인접 | Maker-Checker `Mapping::approve`(정족수 2인·자기승인 차단·dedup) — REVIEW/REJECT/RETURN 류 상태전이는 있으나 **위임 가능한 Authority Action 단위 아님**(승인자=진입게이트 통과 actor·ⓑ §2.2) | `LEGACY_ADAPTER` |
| PAY/PAYOUT/RELEASE/SIGN 류 | 🔴 도메인 파이프라인 유무만 존재(`ChannelSync.php:5302` payout 롤업 등)이며 **Authority Action(위임 대상 권한 단위)로는 부재** · `WRITE_OFF`/`OVERRIDE_REFERENCE` grep 0 | `ABSENT` |

★**엔티티 전체가 부재하고, Authority Action 이라는 "위임 가능 권한 단위" 개념 자체가 없다**(ⓑ §3.2 Authority Foundation ABSENT). 아래 지원 Action 24종은 도메인 파이프라인의 동사(verb) 유무가 아니라 **"위임 가능한 승인 Authority Action 으로 존재하는가"** 로 판정한다.

## 1. 원문 전사 + 판정 — **원문 36종**(지원 Action 24 + 필수 필드 12)

### 지원 Action (24)

| # | 원문 Action | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | REVIEW | 승인 상태전이 인접(Maker-Checker 진입·`Mapping::approve`) — Authority Action 단위 아님 | `LEGACY_ADAPTER` |
| 2 | APPROVE | `acl_permission` `approve`(`TeamPermissions.php:39`·장식 부여 플래그) — 승인 Authority Action 아님(ⓑ §2.1) | `KEEP_SEPARATE_WITH_REASON` |
| 3 | REJECT | 승인 상태전이 인접(반려) — 위임 가능 Authority Action 아님 | `LEGACY_ADAPTER` |
| 4 | RETURN | 승인 상태전이 인접(반송) — Authority Action 아님 | `LEGACY_ADAPTER` |
| 5 | REQUEST_CHANGES | 🔴 승인 4경로에 별도 "변경요청" 전이 부재(approve/reject 이원만) | `ABSENT` |
| 6 | ACTIVATE | 🔴 도메인 라이프사이클 동사이나 위임 Authority Action 부재 | `ABSENT` |
| 7 | MODIFY | 🔴 Authority Action 부재 | `ABSENT` |
| 8 | INCREASE | 🔴 금액 증액 승인 권한 단위 부재(금액축 자체 없음·`HIGH_VALUE_KRW` boolean·`Catalog.php:1016`) | `ABSENT` |
| 9 | DECREASE | 🔴 Authority Action 부재 | `ABSENT` |
| 10 | EXTEND | 🔴 Authority Action 부재 | `ABSENT` |
| 11 | TERMINATE | 🔴 Authority Action 부재 | `ABSENT` |
| 12 | CANCEL | 🔴 취소 파이프라인은 도메인별 존재하나 위임 Authority Action 아님 | `ABSENT` |
| 13 | REOPEN | 🔴 Authority Action 부재 | `ABSENT` |
| 14 | SETTLE | 🔴 정산 파이프라인 존재하나 승인 Authority Action 아님(ⓑ §3.2) | `ABSENT` |
| 15 | PAY | 🔴 결제/지급 파이프라인 유무만 · Pay Authority Action 부재 | `ABSENT` |
| 16 | PAYOUT | 🔴 `ChannelSync.php:5302` payout 롤업(도메인 파이프라인) · Payout Authority Action 아님 | `ABSENT` |
| 17 | REFUND | 🔴 환불 파이프라인 유무만 · Refund Authority Action 부재 | `ABSENT` |
| 18 | CREDIT | 🔴 Authority Action 부재 | `ABSENT` |
| 19 | WRITE_OFF | 🔴 `WRITE_OFF`/write-off grep **0** | `ABSENT` |
| 20 | COMMIT | 🔴 Authority Action 부재(git/트랜잭션 commit 오탐 도메인) | `ABSENT` |
| 21 | SIGN | 🔴 전자서명/승인서명 Authority Action 부재 | `ABSENT` |
| 22 | RELEASE | 🔴 Payment Release Authority Action 부재 | `ABSENT` |
| 23 | OVERRIDE_REFERENCE | 🔴 `OVERRIDE_REFERENCE` grep **0** · Break-glass/Override 훅 부재(ⓑ §3.4) | `ABSENT` |
| 24 | CUSTOM | 🔴 확장 Action 카탈로그 부재 | `ABSENT` |

### 필수 필드 (12)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 25 | approval_delegation_action_binding_id | Delegation 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 26 | approval_delegation_version_id | Delegation Version(§10) 부재(ⓑ §2.5) | `NOT_APPLICABLE` |
| 27 | action_type | 🔴 위임 Action 바인딩 축 부재 · `acl_permission` ACTIONS 는 메뉴 권한 플래그이지 위임 Action 아님 | `ABSENT` |
| 28 | include 여부 | 🔴 Action 포함/제외 플래그 — Delegation Scope 부재 | `ABSENT` |
| 29 | resource state restriction | 🔴 Action×리소스 상태 제약 표현 0 | `ABSENT` |
| 30 | decision type restriction | 🔴 결정 유형 제약 표현 0 | `ABSENT` |
| 31 | mandatory additional approval | 🔴 추가 필수승인(고액/Pay/Emergency 별도정책·§24) 표현 0 | `ABSENT` |
| 32 | prohibited transition | 🔴 금지 전이 선언 0 — **합법 전이집합 선언 자체가 전 도메인 부재**(ⓑ §2.2) | `ABSENT` |
| 33 | valid_from | 인접 = `kr_fee_rule.effective_from`(수수료 open-interval·질의계층·Action Binding 아님) | `LEGACY_ADAPTER` |
| 34 | valid_to | 🔴 `valid_to`/`effective_to` grep **0** → 폐구간 신규 | `ABSENT` |
| 35 | status | 인접 = 상태전이 다수이나 합법 전이집합 선언 0(ⓑ §2.2) | `LEGACY_ADAPTER` |
| 36 | evidence | 정본 = `SecurityAudit::verify()`(`SecurityAudit.php:56-68`) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 36 / 36 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 6(REVIEW/REJECT/RETURN + valid_from/status/evidence) · `KEEP_SEPARATE_WITH_REASON` 1(APPROVE) · `ABSENT` 27 · `NOT_APPLICABLE` 2 · `BLOCKED_PREREQUISITE` 0.

> 🔴 **커버 0.** Action Binding 엔티티가 부재하며, "위임 가능한 승인 Authority Action" 개념 자체가 없다. `acl_permission` 의 `approve`(APPROVE·KEEP_SEPARATE)는 메뉴 권한 부여 플래그일 뿐 위임 대상 Authority Action 이 아니다. PAY/PAYOUT/SETTLE/RELEASE/SIGN 등 9종은 **도메인 파이프라인의 유무만 있고 승인 권한 단위로는 ABSENT** — 파이프라인 존재를 "Action 준수"로 계산하지 않는다(우연한 존재를 준수로 계산 금지). REVIEW/REJECT/RETURN(LEGACY_ADAPTER)은 승인 상태전이 인접 자산이나 위임 단위가 아니다.

## 2. §2 원문 SoD 조항 명기

> **원문(§14·줄 958):** "Approve 위임이 Pay, Release, Sign 또는 Override 권한까지 포함한다고 추론하지 마라."

🔴 **Approve 위임 ≠ Pay/Release/Sign/Override 자동포함**(직무분리·SoD). 현행에서 유일한 승인 인접 = `acl_permission` 의 `approve` 플래그(`TeamPermissions.php:39`)이며 이는 **단일 boolean 부여**로, Approve 를 부여하면 Pay/Release/Sign 이 자동 포함되는 구조는 없다(각각 별도 도메인 파이프라인). 그러나 그 역도 성립하지 않는다 — **위임 시 Action 별 include 여부를 명시적으로 표현할 축이 부재**(action_type/include ABSENT)하므로, Action Binding 신설 시 각 Action 을 **1급 include/exclude 필드**로 분리하고 PAY/PAYOUT/REFUND/CREDIT/WRITE_OFF/SETTLE/RELEASE/SIGN/OVERRIDE_REFERENCE 는 **Approve 위임에 기본 미포함(deny-by-default)**으로 두어야 한다. SoD Hook 자체가 ABSENT(ⓑ §3.4)이므로 이 게이트는 선행 신설 대상이다.

## 3. 규칙

- 🔴 **Approve 위임에서 Pay/Release/Sign/Override 를 자동 상속시키지 마라**(§2 원문·SoD) — 각 Action 은 명시적 include 필드로만 위임되고 기본은 deny 다.
- 🔴 **도메인 파이프라인(payout/settle/refund 등)의 존재를 "Action 위임 지원"으로 오표기 금지** — 파이프라인은 실행 경로이지 위임 가능한 Authority Action 단위가 아니다. Action Binding 은 Authority Foundation(§3.2·ABSENT) 신설 후에만 실 의미를 갖는다.
- 🔴 **`prohibited transition`/`mandatory additional approval` 을 생략하지 마라** — 합법 전이집합 선언이 전 도메인 부재(ⓑ §2.2)한 현행을 상속하지 말고, Action Binding 에 금지 전이·추가필수승인(고액/Pay/Emergency·§24)을 1급 필드로 두라.
- 🔴 **`acl_permission` ACTIONS(view/create/update/delete/approve/export/execute/manage)를 위임 Action 카탈로그로 재사용 금지**(KEEP_SEPARATE) — 그것은 메뉴 접근 권한이지 승인 Authority Action(REVIEW…OVERRIDE 24종)이 아니다. 두 카탈로그를 혼용하면 권한 축이 붕괴한다.
