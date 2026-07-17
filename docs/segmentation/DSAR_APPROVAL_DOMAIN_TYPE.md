# DSAR — Approval Domain Type (§6)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line) — 도메인별 승인 존재 여부

| 도메인 | 현행 실측 (코드 근거) | Canonical 분류 |
|---|---|---|
| **Mapping**(canonical value 변경) | `mapping_change_request` + `Mapping::approve` **Mapping.php:238-294** — 위조불가 actor(`actorId` :36-53) · pending 검증 · 자기승인 403 · dedup 409 · `count>=required_approvals` 정족수 · `apply` status 게이트(:309) | **VALIDATED_LEGACY**(유일 REAL maker-checker · **참조 원형**) |
| **Agency Access**(대행사↔클라이언트 위임) | `agency_client_link` status pending→approved→revoked · **매 요청 approved 재검증 fail-closed**(AgencyPortal.php:24,80) | **VALIDATED_LEGACY** |
| **Campaign/Action**(광고 집행) | `action_request`(Db.php:592-600) · `Alerting::decideAction` :572-599 — **1회 approve→즉시 approved**(정족수·자기승인·dedup 전무) · actor = 클라이언트 `X-User-Email` 헤더 **위조가능**(:33-36) · `executeAction` :601-660 이 `status` SELECT(:612)하나 **미독** → 승인 우회. **단 `INSERT INTO action_request` grep 0 = 생산자 전무 → 도달 불가** | **MIGRATION_REQUIRED**(취약) · 집행경로 **VACUOUS** |
| **Catalog Writeback** | 실 SSOT = `catalog_writeback_job.status='pending_approval'`. `catalog_writeback_approval`(Catalog.php:86-94)은 **고아 테이블** — 읽는 코드 0(CREATE :86/:126 + 자인 주석 :2269-2272 뿐) | **CONSOLIDATION_REQUIRED**(고아 제거) |
| **Admin Growth** | `admin_growth_approval`(AdminGrowth.php:142-149) — **tenant_id 없음 · 단일 결재**(decided_by 1인) | **MIGRATION_REQUIRED** |
| **Budget** | `routes.php:1868` `/v384/budget/requests/{id}/approve` — **핸들러 부재 · 템플릿 501 폴백**(:1821-1827) | **팬텀 라우트** · **NOT_APPLICABLE(신설)** |
| **Recon Report** | `routes.php:1943,1953,1967,1998,2059` approve — **동일 팬텀** | **팬텀 라우트** · **NOT_APPLICABLE(신설)** |
| **Funding · Claim · Settlement · Payout · Refund · Contract · Migration** | **부재(grep 0)** | **NOT_APPLICABLE(부재 → 신설)** |
| **REBATE_\*** | **부재(backend/src·frontend/src grep 0)** — ★**승인 대상 엔티티 자체가 코드에 0**. Rebate 는 현재 **문서에만 존재** | **NOT_APPLICABLE(전방호환 계약)** |

### 0-1. 공통 결함 (도메인 무관)

| 항목 | 실측 | 분류 |
|---|---|---|
| `audit_log` | `Db.php:540-546` — `id, actor, action, details_json, created_at`. **tenant_id 없음 · 해시체인 없음**(해시체인은 `menu_audit_log` 전용 — AdminMenu.php:123-131) | **MIGRATION_REQUIRED** |
| Workflow/State Machine/BPMN/Temporal/Camunda/Flowable/Zeebe/Step Functions | **backend/src grep 0** | **NOT_APPLICABLE(신설)** |
| `TeamPermissions::ACTIONS` 의 `'approve'`(:39) | 데이터만 존재 · **검사 호출부 grep 0 = 고아** | **MIGRATION_REQUIRED** |

## 1. 스펙 §6 Domain Type 31종 전사 — **BLOCKED**

**분류: `BLOCKED_SPEC_TEXT_UNAVAILABLE`**

REQ 분모(§7 표)는 **"§6 Approval Domain Type = 31"** 이라는 **개수만** 영속한다. **31종의 항목명은 저장소 어디에도 없다**(`grep -rl "APPROVAL_DOMAIN" docs/` → REQ 1건, 개수 표만).

**31종 항목명을 추측 생성하지 않는다.** 근거:
- REQ §16 **"요구 날조 0 — 스펙 원문 항목만 전사(轉寫)"**
- REQ §9 경고 **"289차 ② 351 사건 = 근거 없는 숫자가 복제돼 정본이 된 사고"**
- 지어낸 목록을 분모로 삼으면 **자기가 쓴 것을 요구로 삼는 역산**(REQ §15) — 커버리지가 정의상 100%가 되어 측정이 아니라 동어반복이 된다.

**해제 조건**: 스펙 §6 원문 수령 → 본 §1 을 전사로 교체(§0 은 그대로 유효).

## 2. 규칙

- **Rebate 전용 Approval Entity 복제 금지**(스펙 §5 단서) — 공통 Canonical Foundation + Domain Type 확장. **`REBATE_*` 승인 대상이 코드에 0인 현 시점에 Rebate 승인 테이블 선행 신설 = 287차 "죽은 스켈레톤" 재발**.
- **참조 원형 = `Mapping::approve`**(유일 REAL). 신규 Domain Type 은 **이것을 확장**하지 신설하지 않는다(헌법 Golden Rule = Extend).
- **팬텀 approve 라우트(budget·recon 6개)를 "구현됨"으로 계산 금지** — 501 폴백이다.
- **`NOT_APPLICABLE` 을 "있다고 가정"하고 배선 금지**(287차 교훈).
