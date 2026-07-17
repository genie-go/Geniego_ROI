# DSAR — Approval Correlation (§34)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거**: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §34 — 원문 그대로 전사.
> **분모 정합**: Correlation 대상 — REQ 18 ↔ **원문 실측 18 개수 일치**(단 **항목 내용 전면 상이** — placeholder 는 내부 엔티티 쌍 나열이었고 원문은 **외부 업무객체 목록** · §1-1).
> 🔴 **분모 불일치**: 필드 — **REQ 집계 11 ↔ 원문 실측 12 — 원문이 정본.** REQ §7 의 `11` 은 정정 대상.

## 0. 현행 실측 대조표 (file:line)

**★`correlation_id` — backend/src grep 0. Correlation 개념 전면 부재.**

| 현행 | 실측 | 분류 |
|---|---|---|
| `correlation_id` / correlation 엔티티 | **grep 0**(backend/src 전수) | **NOT_APPLICABLE(부재 → 신설)** |
| **`menu_audit_log.request_id`** | `AdminMenu.php:123-131`(컬럼) · `:236-239` `X-Request-Id` 헤더 → `substr(...,0,64)` · nullable | **`LEGACY_ADAPTER`**(아래 0-1 — **유일 인접 선례**) |
| `action_request.policy_id` | `Db.php:592-600` — 정책 참조 1건. **요청↔집행 추적 아님** | **NOT_APPLICABLE** |
| `admin_growth_approval.ref_type`/`ref_id` | `AdminGrowth.php:142-149,1292` — **승인 ↔ 원본 객체 연결**(2-hop). 다단 추적·상관관계 아님 | **`LEGACY_ADAPTER`**(부분 — Resource 링크만) |
| `mapping_change_request` | `Db.php:623-636` — 요청 간 연결 컬럼 **없음** | **NOT_APPLICABLE** |
| `catalog_writeback_job` | `Catalog.php:2341-2364` — 동상 | **NOT_APPLICABLE** |
| APPROVAL_CORRELATION | **grep 0** | **NOT_APPLICABLE(부재 → 신설)** |

### 0-1. `menu_audit_log.request_id` 가 `LEGACY_ADAPTER` 인 이유 (한계 명시)

① **클라이언트 제공**(`X-Request-Id` 헤더 · `AdminMenu.php:238`) → **위조·누락 가능**, ② **nullable**(강제 아님), ③ **단일 도메인**(메뉴 감사 전용 · 승인 도메인 아님), ④ **단일 요청 식별자**이지 **다중 엔티티 상관관계가 아님**(전파 체인 없음).
⇒ **패턴 재사용은 가능(헤더 수집·64자 절단), 정본 승격 불가.**

> **판정: 승인 → 집행 → 정산 → 대사를 하나의 흐름으로 잇는 수단이 없다.**
> 현행에서는 `action_request` 1건이 어떤 상위 요청에서 파생됐고 어떤 집행/원장 기록으로 이어졌는지 **조인할 키가 존재하지 않는다**.
> ※ `INSERT INTO action_request` **grep 0**(생산자 전무) → 해당 경로 실피해 **VACUOUS**. 결함은 **설계 결손**이지 운영 장애가 아님.

## 1. Correlation 대상 (18) — 원문 전사

> 스펙 §34 원문 도입부: **"Approval 요청을 다음과 연결하라."**

`APPROVAL_CORRELATION` — 원문 순서 그대로(좌 1~9 · 우 10~18):

| # | 연결 대상 | # | 연결 대상 |
|---|---|---|---|
| 1 | Authorization Request | 10 | Refund |
| 2 | Business Transaction | 11 | Migration Plan |
| 3 | Program Change Set | 12 | Access Request |
| 4 | Contract Amendment | 13 | Incident |
| 5 | Funding Request | 14 | Notification |
| 6 | Claim | 15 | Workflow Instance |
| 7 | Accrual | 16 | Task |
| 8 | Settlement | 17 | ERP Document |
| 9 | Payout | 18 | Provider Request |

### 1-1. 🔴 placeholder ↔ 원문 대조 — 자작 항목 폐기 기록

289차 placeholder 는 **개수(18)만 맞고 축이 정반대**였다. placeholder = **승인 도메인 내부 엔티티 쌍**(Request↔Case, Case↔Item …), 원문 = **승인이 연결돼야 할 외부 업무객체 목록**:

| placeholder(자작·폐기) | 원문 §34 | 성격 |
|---|---|---|
| Request↔Case · Request↔Version · Case↔Item · Request↔Resource · Request↔Decision · Request↔Requirement · Request↔Execution Binding · Request↔Consumption · Approval↔Reconciliation · Approval↔Audit Event · Approval↔Evidence · Approval↔Idempotency · 상위/하위 Request · Supersession 체인 | **전부 없음** | **자작**(내부 FK 관계 — 원문 Correlation 축 아님) |
| Approval↔Ledger/정산 | **Settlement**(#8) · **Accrual**(#7) | 개념 근접 · 명칭 자작 |
| Approval↔Notification 발송 | **Notification**(#14) | 명칭 자작 |
| Approval↔외부 시스템 트랜잭션 ID | **ERP Document**(#17) · **Provider Request**(#18) | 원문이 **더 구체적** |
| — | **Authorization Request**(#1) · **Business Transaction**(#2) · **Program Change Set**(#3) · **Contract Amendment**(#4) · **Funding Request**(#5) · **Claim**(#6) · **Payout**(#9) · **Refund**(#10) · **Migration Plan**(#11) · **Access Request**(#12) · **Incident**(#13) · **Workflow Instance**(#15) · **Task**(#16) | **원문에 있으나 placeholder 전면 누락** |

⇒ **원문이 정본.** 특히 **#1 Authorization Request** 는 5-2 인가 도메인과의 연결 축으로, placeholder 에 없었다.
※ 원문 대상 다수(#6~#11 Claim/Accrual/Settlement/Payout/Refund/Migration Plan)는 **Rebate/Ledger 코드 부재**(`REBATE_*` grep 0)로 **전방호환 계약**일 뿐 — **있다고 가정하고 배선 금지**(287차 죽은 스켈레톤).

## 2. 스펙 §34 필수 필드 — 원문 전사 (실측 12)

| # | 필드 | # | 필드 |
|---|---|---|---|
| 1 | `approval_correlation_id` | 7 | `source_entity_id` |
| 2 | `approval_request_id` | 8 | `source_version` |
| 3 | `approval_case_id` | 9 | `correlation_id` |
| 4 | `correlation_type` | 10 | parent correlation id |
| 5 | `source_system` | 11 | `status` |
| 6 | `source_entity_type` | 12 | `evidence` |

> 🔴 **필드 원문 실측 12 ↔ REQ 집계 11 — 원문이 정본.** 숫자를 조용히 맞추지 않는다.

**원문 대조 결과**:
- **#10 parent correlation id 는 원문 필드**(체인 복원 축) — placeholder 의 `parent_correlation_id` 는 우연히 일치.
- placeholder 의 `root_correlation_id`·`target_type`/`target_id`·`relationship_type`·`external_request_id` 는 **원문 §34 필드가 아니다**(자작) → 요구 분모에서 **폐기**. 원문은 **source 단방향**(#5~#8) 구조이지 source↔target 쌍이 아니다.
- **#5 source_system · #8 source_version** = 원문 요구이나 placeholder 누락.
- **현행 커버리지 = 12 중 0**(§0 실측 `correlation_id` backend/src grep 0 · `menu_audit_log.request_id` 는 `LEGACY_ADAPTER` 로 §0-1 한계 4항에 따라 **산입 불가**).

## 3. 규칙

- **`correlation_id`(원문 #9) 는 서버가 생성**한다. 클라이언트 헤더(`X-Request-Id`)는 **참고 기록용**일 뿐 **식별 근거 아님** — `Alerting.php:33-36`(헤더 신뢰) 재발 금지. (289차 `external_request_id` 는 자작 필드이므로 요구 분모 아님 · 수집은 §32 소관 판단.)
- **Append-only**(§4.9) — 상관관계 행 **UPDATE·DELETE 금지**.
- **전파 강제**: Request → Decision → Execution → Consumption → Reconciliation 전 구간에서 **`correlation_id`(#9) 동일 유지 · parent correlation id(#10) 로 체인 복원**. 중간 소실 = §47 Runtime Guard 위반. (289차 `root_correlation_id` 는 자작 · 원문은 parent 체인만 요구.)
- **`admin_growth_approval.ref_type`/`ref_id` 보존**(비파괴) — Correlation 으로 **흡수·확장**하되 컬럼 제거 금지(Golden Rule = Extend).
- **분산추적 인프라(APM/OpenTelemetry) 도입 아님** — 본 엔티티는 **업무 상관관계**다. 혼동·중복 신설 금지.
- **코드변경 0**.
