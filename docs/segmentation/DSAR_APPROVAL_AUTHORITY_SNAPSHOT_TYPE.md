# DSAR — Approval Authority Snapshot Type (§55 Snapshot Type 축)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 10회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §55(2287-2301 Snapshot Type 축) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §5 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> 필수 필드 축(§55 41종) + §56 원칙(15) = [DSAR_APPROVAL_AUTHORITY_SNAPSHOT.md](DSAR_APPROVAL_AUTHORITY_SNAPSHOT.md)

## 0. 현행 실측 (file:line)

### ★대전제 — **Snapshot Type 은 "찍는 계기(trigger)" 축이다 · 찍을 대상 엔티티가 통째로 부재**

Snapshot Type 13종은 **"언제 Authority Snapshot 을 동결하는가"**를 열거한다. 그러나 **`APPROVAL_AUTHORITY_SNAPSHOT` 엔티티 자체가 부재**하고(ⓑ §5 — Actor Authorization Snapshot **ABSENT**), 승인 3~4경로 전부 승인시점 권한/역할/플랜을 미보존한다:

| 경로 | 저장 실측 | file:line |
|---|---|---|
| mapping_change_request | `approvals_json` = `{user, ts}` **2키** | `Mapping.php:285` |
| action_request(Alerting) | `{actor, decision, ts}` **3키** | `Alerting :591` |
| admin_growth_approval | `decided_by`·`decided_at` **2컬럼**(🔴 tenant_id 없음) | `AdminGrowth :142-149` |

→ **찍을 스냅샷 엔티티가 없으므로 "언제 찍는가"(Type)는 원천적으로 매핑 대상이 없다.** 13종 전량 판정의 기본값 = `NOT_APPLICABLE`(엔티티 부재).

### ★분모 주의

측정기 **§55 = 54**(불릿 54) = **필수 필드 41 + Snapshot Type 13**. 본 편은 **Type 13 담당**. `41 + 13 = 54` 로 측정기와 정합. §56 원칙(15)은 **필수 필드 편**에 병합 전사됨.

### 🔴 ★오염원 — `snapshot` grep 최다 히트는 **CCTV JPEG 프레임 · PM 베이스라인**

`routes.php:271` `wms/cameras/{id}/snapshot`(`WmsCctv.php:45`) · `pm_baseline.snapshot_json`(`PM/Enterprise.php:55`) · `menu_defaults.snapshot_data`. **Type 축 검색 시 최우선 오염원.** 능력축(동결 훅 존재·시점 컬럼·as-of 질의)으로만 논증하라.

## 1. 원문 전사 + 판정 — **원문 13종**(Snapshot Type)

| # | 원문 Type | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | CASE_CREATION | 🔴 **Case 개념 부재** — Request/Case 미분화 · 케이스 생성 훅 0(ⓑ §2·§6). 스냅샷 대상 없음 | `NOT_APPLICABLE` |
| 2 | CHAIN_RESOLUTION | 🔴 **Chain 개념 부재** — `resolveApprover`·`approval_chain`·`routeApproval` **grep 0**(ⓑ §3·§6) · 승인 4경로 전량 "호출자가 곧 승인자". 해석 계기 자체 없음 | `NOT_APPLICABLE` |
| 3 | CANDIDATE_RESOLUTION | 🔴 후보 도출(§47)·소스 우선순위·제외사유·Resolution(§50/§51) **전 ABSENT**(ⓑ §6). 자격자 후보 축 0 | `NOT_APPLICABLE` |
| 4 | TASK_ASSIGNMENT | 승인 Task 개념 0(ⓑ §2) · `pm_task_assignees`=PM 태스크 배정(승인 도메인 아님). 배정 계기 없음 | `NOT_APPLICABLE` |
| 5 | TASK_CLAIM | Task 가 없으므로 선점(Claim)도 전역 0 | `NOT_APPLICABLE` |
| 6 | DECISION_ATTEMPT | 🔴 시도/커밋 미분화 — 4경로 전부 **단일 즉시 확정**(`Alerting::decideAction:593` 1회 즉시 approved · `Catalog::approveQueue:2341` 행위자 미판독). "시도" 상태 축 0 | `NOT_APPLICABLE` |
| 7 | DECISION_COMMIT | ★**인접 실재 · 권한 미동결** — 승인 4경로 결재기록이 **실제 커밋됨**(`Mapping::approve:285` `{user,ts}` · `Alerting:591` `{actor,decision,ts}` · `AdminGrowth::approvalDecide:1330` · `Catalog::approveQueue:2341`). 🔴 그러나 **커밋 시점의 권한/역할/플랜/한도를 한 바이트도 동결하지 않는다**(ⓑ §5) → 결재 사실만 남고 as-of 권한 근거 소실 | `LEGACY_ADAPTER` |
| 8 | AUTHORITY_REEVALUATION | 권한 재평가 축 0 — Authority 개념 자체가 없어(ⓑ §0) 재평가 계기 없음 | `NOT_APPLICABLE` |
| 9 | AUTHORITY_CHANGE | 권한 변경 스냅샷 대상 0. ⚠️ 인접 위험 = `AgencyPortal.php:304`,`:381` `revoked_at=NULL` **in-place 소거**(변경 시 이력 물리적 소멸 · §56 원칙 2 정면 반례) — 이 경로에 Type 훅을 걸면 "잘못된 상태를 정확히 기록"에 그침 | `NOT_APPLICABLE` |
| 10 | REOPEN | Case 개념이 0이므로 재개(Reopen)도 0 | `NOT_APPLICABLE` |
| 11 | MIGRATION | 🔴 `backend/migrations/` **172차 정지** · `ensureTables`=CREATE만·**백필 0**(ⓑ §5·§7) → 마이그레이션 시 소급 스냅샷 생성 수단 없음 | `NOT_APPLICABLE` |
| 12 | SIMULATION | Authority Simulation(§61) 0 — what-if 계층 부재 | `NOT_APPLICABLE` |
| 13 | AUDIT_RECONSTRUCTION | 🔴 **as-of 조회 수단 부재** — `as_of` 질의 전역 0(2건은 응답 타임스탬프 `PgSettlement.php:279`·`AttributionEngine.php:666`) · `approvals_json` **인덱스 불가** · `AgencyPortal revoked_at=NULL` 이력 소멸(§0). **재구성 대상이 0** · **5-3-3-1 §80 동형**(감사 재구성 수단 부재) | `ABSENT` |

**실측 개수: 13 / 13 전사.** (측정기 §55 분모 **54** = 필드 41 + Type 13 · 본 편 Type **13** · 전사 **13** — **분해 후 정합**)
원문 Type 목록이 `AUDIT_RECONSTRUCTION` 으로 끝난다(`:2301`) → 필드축(`evidence` 로 끝남)과 **두 축을 섞지 말 것**(필드 41 전사는 [별편](DSAR_APPROVAL_AUTHORITY_SNAPSHOT.md)).

커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 11 · `LEGACY_ADAPTER` 1(7) · `ABSENT` 1(13).

> 🔴 **커버 0.** Snapshot 엔티티가 통째로 부재하므로 어떤 Type 도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 1건(DECISION_COMMIT)은 **확장 대상 인접 자산**(4경로 결재기록)이지 커버가 아니다 — **결재는 커밋되나 권한은 동결되지 않는다**.

## 2. 규칙

- 🔴 **Type 13종 = 전량 `NOT_APPLICABLE`(7 `LEGACY_ADAPTER`·13 `ABSENT`).** **커버 0.** Type 은 스냅샷 엔티티 신설 후에야 의미를 갖는 ENUM 후보이지 현행 자산의 매핑 대상이 **아니다**.
- 🔴 **`DECISION_COMMIT`(7) 이 최우선.** 승인은 **지금 실제로 커밋되고 있고**(`Mapping::approve` REAL · `admin_growth` REAL · `catalog_writeback_job` REAL) **그 시점 권한이 하나도 안 남는다**(ⓑ §5). Snapshot Type 신설 시 이것부터 — 단 **엔티티(필드 41)가 선행**한다.
- 🔴 **`AUDIT_RECONSTRUCTION`(13) = `ABSENT` 이 근본 공백.** 현재는 "누가 승인했다"만 남고 **"그가 그때 승인할 자격이 있었는가"를 사후 재구성할 수단이 없다**(as-of 질의 0 · `approvals_json` 인덱스 불가). **5-3-3-1 §80(감사 재구성) 과 동형** — 두 편을 함께 처리하라.
- 🔴 **`AUTHORITY_CHANGE`(9) 훅을 `AgencyPortal` 재승인 경로에 걸지 마라** — `revoked_at=NULL` **in-place 소거**(`:304`,`:381`)가 이미 이력을 물리적으로 소멸시킨다(§56 원칙 2 정면 반례 · `BLOCKED_HISTORICAL_INTEGRITY_RISK`). **결함 위에 Type 을 얹으면 잘못된 상태를 정확히 기록할 뿐** — 변경은 UPDATE 가 아니라 **새 행 INSERT**로.
- 🔴 **`MIGRATION`(11)·`AUDIT_RECONSTRUCTION`(13) 은 소급 불가.** `ensureTables` 는 테이블 생성만 하고 백필하지 않는다 → **Snapshot 은 시행일 이후 전방(forward-only)으로만 축적**. "과거도 복원된다"로 오표기 금지.
- 🔴 **`CHAIN_RESOLUTION`(2)·`CANDIDATE_RESOLUTION`(3) 은 §47~§54 Candidate/Resolution 이 선행**(ⓑ §6 — 전 ABSENT · §3.4 "최종 Approval Chain 은 다음 블록"). **본 블록에서 배선 금지**(`BLOCKED_PREREQUISITE`).
- ★**Type 을 `VARCHAR` 자유문자열로 두지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8 · `PM/Enterprise.php:65-66`)를 반복하지 말고, **13종 확장 절차(additive ALTER)를 함께 정의**한 확장 가능 카탈로그로.
