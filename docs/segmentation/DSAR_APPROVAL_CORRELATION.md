# DSAR — Approval Correlation (§34)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **분모 정합**: 행 수 = REQ §7(스펙 §34 Correlation 대상 = 18 · 필드 = 11). 스펙 원문 나열 **저장소 미영속** → `UNVERIFIED_TRANSCRIPTION`.

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

## 1. Correlation 대상 (18)

| # | 대상 | # | 대상 |
|---|---|---|---|
| 1 | Approval Request ↔ Approval Case | 10 | Approval ↔ Reconciliation(§43) |
| 2 | Request ↔ Request Version(§8) | 11 | Approval ↔ Audit Event(§51) |
| 3 | Case ↔ Item(§15) | 12 | Approval ↔ Evidence(§50) |
| 4 | Request ↔ Resource(§9) | 13 | Approval ↔ Notification 발송 |
| 5 | Request ↔ Decision(§22) | 14 | Approval ↔ Idempotency Key(§35) |
| 6 | Request ↔ Requirement(§17) | 15 | Approval ↔ 원본 도메인 객체(**`ref_type`/`ref_id` 어댑터**) |
| 7 | Request ↔ Execution Binding(§40) | 16 | Approval ↔ 상위/하위 Request(**부모-자식 체인**) |
| 8 | Request ↔ Consumption(§41) | 17 | Approval ↔ Supersession 체인(§39) |
| 9 | Approval ↔ Ledger/정산 기록 | 18 | Approval ↔ 외부 시스템 트랜잭션 ID |

> ⚠️ #9·#18 은 **Rebate/Ledger 코드가 부재**(`REBATE_*` grep 0)하므로 **전방호환 계약**일 뿐 — **있다고 가정하고 배선 금지**(287차 죽은 스켈레톤).

## 2. CANONICAL_APPROVAL_CORRELATION 필드 (11)

| # | 필드 | 비고 |
|---|---|---|
| 1 | `correlation_id` | **PK · 서버 생성**(클라이언트 헤더 신뢰 금지) |
| 2 | `tenant_id` | 격리 필수 |
| 3 | `root_correlation_id` | 흐름 최상위(트리 루트) |
| 4 | `parent_correlation_id` | 직계 상위(체인 복원) |
| 5 | `source_type` | 위 18 대상 |
| 6 | `source_id` | |
| 7 | `target_type` | |
| 8 | `target_id` | |
| 9 | `relationship_type` | §9 Relationship Type(11) **재사용**(중복 신설 금지) |
| 10 | `external_request_id` | `X-Request-Id` 수용(**`AdminMenu.php:236-239` 확장** · **참고값 · 신뢰 금지**) |
| 11 | `created_at` | |

## 3. 규칙

- **`correlation_id` 는 서버가 생성**한다. 클라이언트 헤더(`X-Request-Id`)는 **참고 기록용**(`external_request_id`)일 뿐 **식별 근거 아님** — `Alerting.php:33-36`(헤더 신뢰) 재발 금지.
- **Append-only**(§4.9) — 상관관계 행 **UPDATE·DELETE 금지**.
- **전파 강제**: Request → Decision → Execution → Consumption → Reconciliation 전 구간에서 `root_correlation_id` **동일 유지**. 중간 소실 = §47 Runtime Guard 위반.
- **`admin_growth_approval.ref_type`/`ref_id` 보존**(비파괴) — Correlation 으로 **흡수·확장**하되 컬럼 제거 금지(Golden Rule = Extend).
- **분산추적 인프라(APM/OpenTelemetry) 도입 아님** — 본 엔티티는 **업무 상관관계**다. 혼동·중복 신설 금지.
- **코드변경 0**.
