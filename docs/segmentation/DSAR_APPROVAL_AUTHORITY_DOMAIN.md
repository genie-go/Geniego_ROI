# DSAR — Approval Authority Domain (§8)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §8(654-697) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_DOMAIN` 엔티티 | `approval_authority_domain`·`authority_domain` grep **0** — 도메인별 승인권한 개념 부재(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| REBATE 파이프라인 | 🔴 `rebate*` grep = **0**(backend/src 전수 실측) — REBATE_PROGRAM~REBATE_WRITE_OFF 10종 전부 근거 자산 없음(ⓑ §1) | `NOT_APPLICABLE` |
| Finance/ERP Authority | 🔴 "Existing DOA Matrix / ERP Authority Table = 없다"(ⓑ §1) · `required_approvals` 유일 생산자 = 리터럴 `2`(`Mapping.php:209`·`Db.php:634 DEFAULT 2`) — 요건 모델 아니라 상수 | `NOT_APPLICABLE` |
| 유일 실 control | maker-checker 정족수2 = `Mapping::approve:238-294`(신원 fail-closed·자기승인차단·dedup·정족수)·**레포 유일 실 정족수**(ⓑ §2) — 단 도메인 바인딩 없음 | `LEGACY_ADAPTER` |
| 금액 임계 정책 | `HIGH_VALUE_KRW=5000000.0` 전역 PHP 상수만(`Catalog.php:1016`·테넌트/도메인 정책·effective dating 원천 불가·ⓑ §4) | `BLOCKED_FINANCIAL_CONTROL_RISK` |

★**Authority Domain 엔티티가 통째로 부재하므로 어떤 Domain/필드도 커버 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. **인접 자산 존재 ≠ 커버.**

## 1. 원문 전사 + 판정 — **원문 34종**(지원 Domain 23 + 필수 필드 11)

### 지원 Domain (23)

| # | 원문 Domain | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | REBATE_PROGRAM | 부재 — `rebate*` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 2 | REBATE_RULE | 부재 — rebate 파이프라인 없음 | `NOT_APPLICABLE` |
| 3 | REBATE_BUDGET | 부재 — rebate_limit 0 | `NOT_APPLICABLE` |
| 4 | REBATE_CLAIM | 부재 — claim_limit 0 | `NOT_APPLICABLE` |
| 5 | REBATE_SETTLEMENT | 부재 — settlement_limit 0 | `NOT_APPLICABLE` |
| 6 | REBATE_PAYMENT | 부재 — payment_authority 0 | `NOT_APPLICABLE` |
| 7 | REBATE_PAYOUT | 부재 — payout_authority 0 | `NOT_APPLICABLE` |
| 8 | REBATE_ADJUSTMENT | 부재 | `NOT_APPLICABLE` |
| 9 | REBATE_CANCELLATION | 부재 | `NOT_APPLICABLE` |
| 10 | REBATE_WRITE_OFF | 부재 — writeoff_limit 0 | `NOT_APPLICABLE` |
| 11 | CUSTOMER_CREDIT | 부재 — CRM LTV 취소/반품 역분개는 있으나(263차) 승인권한 도메인 아님 · credit_limit 0 | `NOT_APPLICABLE` |
| 12 | CUSTOMER_REFUND | 부재 — 환불 처리는 있으나 승인권한 도메인 아님 · refund_limit 0 | `NOT_APPLICABLE` |
| 13 | PARTNER_INCENTIVE | 부재 | `NOT_APPLICABLE` |
| 14 | CONTRACT | 부재 — contract_limit 0 | `NOT_APPLICABLE` |
| 15 | PROCUREMENT | 부재 — WMS 발주는 있으나 승인권한 도메인 아님 · `po_*`=Price Optimization 오탐(ⓑ §1) | `NOT_APPLICABLE` |
| 16 | FINANCE | 부재 — `Pnl` 집계는 있으나 Finance Approval Matrix 0(ⓑ §1) | `NOT_APPLICABLE` |
| 17 | ACCOUNTING | 부재 | `NOT_APPLICABLE` |
| 18 | TREASURY | 부재 | `NOT_APPLICABLE` |
| 19 | LEGAL | 부재 — Legal Entity 엔티티 0(ⓑ §4) | `NOT_APPLICABLE` |
| 20 | COMPLIANCE | 부재 — compliance 승인권한 도메인 없음 | `NOT_APPLICABLE` |
| 21 | SECURITY | 부재 — `SecurityAudit`=감사증거 저장기(`:56-68`)·`admin_growth_approval`=플랫폼 큐(ⓑ §2)이지 보안 승인권한 도메인 아님 | `NOT_APPLICABLE` |
| 22 | DATA | 부재 — `acl_permission`=allow-only 데이터-행 필터(ⓑ §3)이지 데이터 승인권한 도메인 아님(문서 접두 DSAR 는 명명일 뿐) | `NOT_APPLICABLE` |
| 23 | CUSTOM | 부재 | `NOT_APPLICABLE` |

### 필수 필드 (11)

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 24 | approval_authority_domain_id | 엔티티 부재 → PK 없음 | `NOT_APPLICABLE` |
| 25 | domain_code | 부재 | `NOT_APPLICABLE` |
| 26 | domain_name | 부재 | `NOT_APPLICABLE` |
| 27 | resource types | 인접 = `acl_permission` scopeSql 데이터-행 필터(`TeamPermissions.php:286`·ⓑ §3) — Authority 리소스 스코프 아님 | `LEGACY_ADAPTER` |
| 28 | supported actions | 인접 = `acl_permission` ACTIONS(`TeamPermissions.php:39` allow-only)·판정축 HTTP 메서드(`index.php:568`·ⓑ §3) — Authority action 집합 아님 | `LEGACY_ADAPTER` |
| 29 | mandatory control types | 인접 = maker-checker 정족수2(`Mapping::approve:238-294`·레포 유일 실 정족수·ⓑ §2) — 단 **도메인별 필수 control 선언 카탈로그 부재**(정족수는 리터럴 상수) | `LEGACY_ADAPTER` |
| 30 | default currency policy | 🔴 통화 스코프 0·환율 저장계층 부재(KV 덮어쓰기·rate_date 없음·`Connectors.php:1790`·ⓑ §4). 능력 부재 | `ABSENT` |
| 31 | default threshold policy | 🔴 도메인별 임계 정책 부재 — 유일 임계 = `HIGH_VALUE_KRW` 전역 상수(boolean 게이트·한도 미집행·ⓑ §4). 이 인접 자산을 그대로 default policy 로 채택하면 §65 "Amount가 Limit 초과인데 승인 성공" 금액통제 갭을 상속 | `BLOCKED_FINANCIAL_CONTROL_RISK` |
| 32 | default legal entity policy | 🔴 Legal Entity 엔티티 0(`biz_no`/`corp_reg`/`tax_id` grep 0·ⓑ §4). 능력 부재 | `ABSENT` |
| 33 | status | 인접 = 상태전이 다수이나 **합법 전이집합 선언 0**(전 도메인·ⓑ §5) | `LEGACY_ADAPTER` |
| 34 | evidence | 정본 = `SecurityAudit::verify():56-68`(tenant 해시·prev_hash·created_at·`hash_equals` 검증기·ⓑ §5) · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) | `LEGACY_ADAPTER` |

**실측 개수: 34 / 34 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 5 · `ABSENT` 2 · `BLOCKED_FINANCIAL_CONTROL_RISK` 1 · `NOT_APPLICABLE` 26.

> 🔴 **커버 0.** Authority Domain 엔티티가 통째로 부재하므로 어떤 Domain/필드도 `VALIDATED_LEGACY`가 아니다. 지원 Domain 23종은 **전량 `NOT_APPLICABLE`**(REBATE 계열 10종은 `rebate*` grep 0 으로 확정 · Finance/ERP/Legal 도 승인권한 도메인 자체가 없음). `LEGACY_ADAPTER` 5건(resource types·supported actions·mandatory control types·status·evidence)은 확장 대상 인접 자산이지 커버가 아니다.

## 2. 규칙

- 🔴 **Domain 카탈로그는 신설이나, 인접 자산을 재구현하지 마라** — mandatory control=`Mapping` maker-checker 정족수 패턴 확장(재구현 금지·ⓑ §2) · evidence=`SecurityAudit::verify()` 확장 · resource/action=`acl_permission` scopeSql/ACTIONS 참조. **중복 엔진 금지**(§73).
- 🔴 **`default threshold policy` 를 `HIGH_VALUE_KRW` 상수로 채우지 마라**(`BLOCKED_FINANCIAL_CONTROL_RISK`) — 전역 boolean 상수는 테넌트/도메인·통화·effective dating·한도 집행이 전무하다(ⓑ §4). 도메인 정책이 실제 능력을 초과 선언하면 §65 금액통제 갭을 구조적으로 유발한다. §24 Amount Band 로 승격하는 방향만 기록하고 코드는 건드리지 않는다.
- 🔴 **`default currency policy` 를 "있음"으로 표기 금지** — 통화 스코프·환율 저장계층이 부재다(ⓑ §4). 도메인 정책의 통화 바인딩은 저장계층 신설이 선행이다.
- 🔴 **REBATE 계열 10종을 "인접 있음"으로 오분류 금지** — `rebate*` grep 0(backend/src 전수)로 근거 자산이 **하나도 없다**. 리베이트 파이프라인 자체가 신설 대상이며, 이를 존재하는 정산/환불 처리와 혼동하지 마라(도메인 상이).
- 🔴 **Domain 23종을 ENUM 하드코딩하지 마라** — 신규 도메인 INSERT 예외 선례(5-3-3-1 §8)를 반복하지 말고 `CUSTOM` 포함 확장 가능 카탈로그로.
