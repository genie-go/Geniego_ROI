# ADR — Rebate Approval Foundation & Canonical Approval Entity Governance

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **Status: ACCEPTED (설계 계약) · 코드변경 0**
> 분모 원본: [`SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md`](../segmentation/SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) · 집계: [`REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md`](../segmentation/REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md)
> 실측 정본: [`DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md`](../segmentation/DSAR_APPROVAL_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DUPLICATE_IMPLEMENTATION_AUDIT.md`](../segmentation/DSAR_APPROVAL_DUPLICATE_IMPLEMENTATION_AUDIT.md)

---

## Context

스펙 §64 는 *"**지금 즉시** 검증된 Authorization, Role, Organization, Tenant, Workspace 및 Scope Governance **위에**
Rebate Approval Foundation 을 **구축하라**"* 고 명령한다. 289차 전수조사는 **그 전제가 성립하지 않음**을 실측했다.

---

## D-1. 🔴 스펙이 전제한 기반이 코드에 없다

| 스펙 §3 전제 | 실측 |
|---|---|
| Rebate Program 기반 13종 | **`REBATE_*` 코드 0줄**(backend·frontend grep **0 file / 0 occurrence**) — 문서 35편에만 존재 |
| `AUTHORIZATION_*` 12종 | **명명 엔티티 부재**(grep 0). 대응물 `acl_permission` 은 **`menu_key`=프론트 경로 문자열 = 메뉴 게이팅**(레코드 권한 아님) |
| Workspace / Organization / Legal Entity / Country·Region / Feature Flag / Incident / Task / **Workflow** Registry | **전부 부재**(grep 0). Workspace 실체 = `tenant_kv` KV(WorkspaceState.php:59) |
| Role Version / Assignment Scope / Policy Version | **부재** → **결정 시점 권한 Snapshot 원리적 불가**(스펙 §4.6 미충족) |

**REAL 인 것**: `channel_registry`(**tenant_id 없는 글로벌**) · `channel_credential` · `fxToKrw`(24통화) ·
`audit_log`(**tenant_id·해시체인 없음**) · `api_key` RBAC · `app_user`/`user_session`.
**`PlanPolicy` 는 fail-open**(PlanPolicy.php:12 주석 자인) → **승인 게이트 기반 부적격**.

### 결정

> **본 블록은 "구축"이 아니라 "설계 계약"으로 산출한다** — 선행 06-A **9블록 전부와 동일**(코드변경 0).
> **승인 대상 엔티티(Rebate)가 0줄인 상태에서 36 Canonical Entity 를 실코드로 지으면**,
> 그것은 **287차가 적발한 "죽은 스켈레톤"**(생산자 없는 구조물)을 **사상 최대 규모로 재현**하는 것이다.
> **사용자 결정(289차): 설계 계약만 진행 · 수정은 별도 세션.**

---

## D-2. ★Canonical Approval Foundation 은 신설이 아니라 **공용 추출**이다

승인은 **부재가 아니라 존재·분산·불균등**이다. 그리고 **중복 4벌이 아니라 "1 REAL + 3 미달"**이다.

| 축 | mapping | action_request | admin_growth | catalog |
|---|---|---|---|---|
| 정족수 컬럼 | ✅ `required_approvals` | 🔴 **없음** | 🔴 없음 | 🔴 없음 |
| 정족수 집행 | ✅ `count>=required` | 🔴 **1회→approved** | 🔴 단일 | 🔴 없음 |
| 위조불가 신원 | ✅ `actorId`(289차) | 🔴 `X-User-Email` | 🟠 문자열 | 🔴 **미기록** |
| 자기승인 차단 | ✅ 403 | 🔴 없음 | 🔴 없음 | 🔴 없음 |
| actor dedup | ✅ 409 | 🔴 없음 | — | — |
| 실행 전 게이트 | ✅ `apply:309` | 🔴 **우회**(`:612` 미판독) | 🟠 | 🔴 벌크 |
| tenant 격리 | ✅ | ✅ (208차) | 🔴 **없음** | ✅ |

### 결정

> **`Mapping::approve`(Mapping.php:238-294) + `Mapping::actorId`(:36-53) + `apply` 게이트(:309) 를 공용 추출**하고
> `action_request` · `admin_growth_approval` · `catalog_writeback_job` 을 **그 위로 흡수**한다.
> **4번째 Approval Foundation 신설 금지** — 위조불가 신원·자기승인 차단·dedup·정족수·상태 게이트는
> **이미 REAL 이며 단 한 도메인에만 있다.**
> ⚠️ **`EquivalenceProof` 선행 없이 통합 금지** — 증명 없는 통합은 **286차 rank 맵 붕괴** 재현.
> ⚠️ 승인자 JSON 키 불일치(`Mapping`=`user` ↔ `Alerting`=`actor`) — 통합 시 기존 행 파싱 리스크.

---

## D-3. 🔴 `Alerting::executeAction` 승인 우회 — 재증명 완료 · 미수정

`Alerting.php:612` 가 `SELECT action_json, status` 로 status 를 가져오나 **이후 어디서도 `$r['status']` 를 읽지 않는다**(죽은 읽기).
`:619` 부터 곧장 `AdAdapters::pause`(:631) / `updateBudget`(:634) **실집행** → **`pending`·`rejected` 도 실 광고 API 집행**.

- **287차 가짜집행 수정의 부작용** — 실집행을 붙이면서 **승인 게이트를 같이 붙이지 않았다**
- **도달성**: `INSERT INTO action_request` **grep 0 → 생산자 전무 → `VACUOUS`**(현재 도달 불가)
- **등급**: **P1 · 잠복** (289차 G-02 와 같은 계열)

### 결정 — ★순서 의존성이 본 블록의 실질 산출이다

> **① `executeAction` 상태 게이트 → ② `action_request` 생산자 배선.**
> **순서가 뒤집히면 승인 우회가 즉시 활성**된다(pending 건이 실 광고비를 움직인다).
> **289차 G-01 이 같은 논리로 처리됐다** — 운영 `api_key` **0**(노출 0) 시점에 수정 → 회귀 위험 0.
> **잠복 결함은 노출 전에 고치는 것이 가장 싸다.**

---

## D-4. `VACUOUS` 를 해소로 읽지 않는다

`Alerting` 정족수(§G-02) · `executeAction` 우회 · `catalog_writeback_approval` 고아 ·
`TeamPermissions::ACTIONS['approve']`(호출부 0) · 팬텀 승인 라우트 6개 — **전부 "있어 보이나 작동 안 함"**.

> **`VACUOUS` 는 "괜찮다"가 아니라 "아직 안 터졌다"**이다.
> 289차 ① 이 실증했듯 **하나의 미배선 파일이 4개 문서의 신뢰를 오염**시킨다 — **고아는 규칙 없음보다 나쁘다.**
> 따라서 [회귀 게이트](../segmentation/DSAR_APPROVAL_FUNCTION_REGRESSION_GATE.md)는 이들을
> **보존 목록에 등재 금지**(`is_effective = false`)로 명시한다 — **실행 안 되는 건 회귀할 수 없다.**

---

## D-5. Rebate ≠ 내부 결재 테이블

스펙 §0: *"GeniegoROI 내부 운영만을 위한 결재 테이블이 아니다 — 각 **구독 고객사**가 자신의 Rebate·Campaign·
Budget·Funding·Claim·Settlement·Payout·Refund·Contract·Migration 승인을 **같은 Canonical Approval Foundation 위에서** 운영"*.

### 결정

> **Domain Type(§6 32종) 으로 확장**하되 **업무별 승인 테이블 복제 금지**(스펙 §5 단서).
> **현행 `admin_growth_approval` 이 정확히 그 안티패턴**이다 — GeniegoROI **내부 전용 · tenant_id 없음**.
> 통합 시 **`tenant_id` 보강 필수**(현재 전역 조회 · 결정 경로도 격리 없음 = AdminGrowth.php:1324 `WHERE id=?`).

---

## D-6. 본 블록이 스스로 지킨 규칙

| 규칙 | 이행 |
|---|---|
| **AL-19**(기존 Approval Foundation 중복 생성 금지) | ✅ **5번째 승인 엔진 미생성** — 본 블록이 `APPROVAL_*` 테이블을 만들었다면 자기 규칙 위반이었다 |
| **요구 날조 0** | ✅ **산출 에이전트 5개가 독립적으로 "원문이 저장소에 없다"며 정지** → 지어내지 않음 |
| **분모 영속 선행** | ✅ 설계 **착수 전** 커밋(a532fd21975) · 🔴 **단 초판은 개수만 담은 오류** → [원문 영속](../segmentation/SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md)으로 정정 |

### ★D-6-1. 289차 자기 오류 — **개수는 분모가 아니다**

초판 REQ 는 `"§6 Domain Type = 31"` 처럼 **개수만** 영속했다. **항목명은 저장소에 없었다.**

> **"31 종"은 무엇이 31 종인지 모르면 검증도 반증도 불가능하다.**
> **289차 ② 의 `351` 이 정확히 그런 값**이었다(측정 명령 없이 박힌 숫자 → 복제 → 정본화).
> **개수만 적는 것은 351 사건을 요구 목록에서 재현하는 것**이며,
> **ⓐ 를 했다고 믿은 순간에도 COV-GAP-01 은 절반만 해소돼 있었다.**
>
> ★**교훈: 분모의 영속은 "적었는가"가 아니라 "재현·반증 가능한가"로 판정해야 한다.**
> 이 오류를 **에이전트가 잡았다** — 규칙(요구 날조 0 · 역산 금지)이 문서로 영속돼 있었기 때문이다.
> **1-7 D-10 의 재실증: 규칙을 문서로 남긴 블록은 검증 가능하다 — 차이는 능력이 아니라 영속 여부다.**

---

## Consequences

**+** 승인 통합 방향이 **근거 기반으로 확정**(신설 아님 · mapping 승격) · 기존 결함 **P1 1건 재증명**(잠복 상태에서 발견) ·
**분모 영속**으로 5-3-1 커버리지 **측정 가능**(06-A 두 번째 · `source_persisted` 1→2)
**−** **코드 0** — 승인 결함 **미해소**(별도 세션) · Rebate 승인은 **대상 부재로 검증 불가** · **06-A `NOT_CERTIFIED` 불변**

## 인계 (MIGRATION_REQUIRED · 별도 승인 세션)

| ID | 항목 | 등급 |
|---|---|---|
| **MR-5-3-1-01** | `Alerting::executeAction` **상태 게이트** — ★**생산자 배선보다 반드시 선행** | 🔴 **P1(잠복)** |
| **MR-5-3-1-02** | `Alerting::actor` **인증 컨텍스트 전환**(`X-User-Email` 폐기) — 289차 G-01 수정의 **미전파분** | 🔴 P1 |
| **MR-5-3-1-03** | `Alerting` 정족수 실집행(`required_approvals` 컬럼 신설 + 판독) — `:562` 리터럴 제거 | 🔴 P1 |
| **MR-5-3-1-04** | `admin_growth_approval` **`tenant_id` 보강**(전역 조회·결정 격리 부재) | 🔴 HIGH |
| **MR-5-3-1-05** | `actor_type` 구분 — 현재 `apikey:`/`user:` 가 **정족수에 동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배) | 🟠 |
| **MR-5-3-1-06** | `catalog_writeback_approval` 고아 제거(★삭제 전 5단계 증명) · 팬텀 승인 라우트 6개 정리 | 🟠 |
| **MR-5-3-1-07** | `TeamPermissions::ACTIONS['approve']`(호출부 0) 배선 — 고아 해소 | 🟠 |
