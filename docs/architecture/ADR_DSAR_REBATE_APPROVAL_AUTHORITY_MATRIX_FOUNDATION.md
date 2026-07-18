# ADR — Approval Authority Matrix Foundation (EPIC 06-A 5-3-3-4)

> 289차 11회차(2026-07-18) · **비파괴 설계 결정 — 코드변경 0** · 상태: **Accepted(설계정본)**
> 근거: [ⓑ 전수조사](../segmentation/DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · [스펙 원문](../segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) · [§79 84문서](../segmentation/) (전 엔티티 전사·측정기 커버 0)

## Context

EPIC 06-A 5-3-3-4는 "이 행위자가 이 **Domain·Action·Scope·Amount**에서 승인할 권한이 있는가"를 판정하는 **Approval Authority Matrix**를 요구한다. 6클러스터 병렬 능력기반 전수조사(ⓑ) 결과:

**★레포에 Approval Authority 개념이 없다.** 승인은 ①진입 게이트(analyst+ / requirePro / requirePlan('admin')) 통과 + ②상태 전이로만 이뤄지며, 금액축·후보 도출·특이성/충돌 해소·버전/스냅샷이 전무하다. §72 Canonical Entity 20종 + §79 전 엔티티 = 측정기 커버리지 **0**(VALIDATED_LEGACY 0/전 블록).

## Decision

### D-1. Authority SoT = **신설**(선례 0 · "중복이 아니라 부재")
- §73 중복 감사: 여러 Authority Matrix / DOA Table / Approval Limit Table = **전부 0**. 통합할 "동일 목적 Authority"가 없다(승인 4경로는 서로 다른 스키마의 상태머신). 신규 Matrix가 §63 "중복 생성" 위반이 아니다.
- 신설 시 §66 Static Lint·§67 Runtime Guard를 처음부터 fail-closed로 고정.

### D-2. 재구현 금지 · **확장 대상 인접 자산**(Golden Rule = Extend)
| 축 | 정본 인접 자산 | file:line |
|---|---|---|
| Evidence / immutable_hash | **`SecurityAudit::verify()`**(preimage ts 저장·hash_equals·prev_hash·tenant) | `backend/src/SecurityAudit.php:27,31,56-68` · 🔴`menu_audit_log.hash_chain` 인용 금지([[reference_menu_audit_log_not_tamper_evident]]) |
| Amount 조건 | `HIGH_VALUE_KRW`(₩5M 상수·boolean만) → **§24 Amount Band로 승격·상수 은퇴** | `Catalog.php:1016`,`:1103-1105` |
| 정족수 maker-checker | `mapping_change_request`(4중 방어·`required_approvals`) — **패턴 확장** | `Mapping.php:238-294`(정족수 `:287`) |
| Utilization(누적차감) | `AutoCampaign` 예산 상한(마케팅 도메인) | `AutoCampaign.php:843-889`(`periodSpentToDate:855`) |
| Effective dating(질의계층) | `kr_fee_rule.effective_from`(open-interval·수수료) → `WHERE effective_from<=:as_of` 술어 추가 | `Db.php:898` |
| 자동집행 억제 | `agent_mode`('recommend'/'approval'/'auto') | `AdAdapters.php:42-55` |

### D-3. 신설 필수(선행) — 저장계층부터 부재
- **환율 이력**(rate_date/business_day) — §27 FX Reference의 저장계층 신설 선행(현행 `app_setting` KV 덮어쓰기·`Connectors.php:1790`). ★세율(질의계층만 부재)과 **깊이 상이·균질화 금지**.
- **Tenant 마스터 테이블** — §63 Reconciliation의 canonical 기준(현행 `api_key.tenant_id` FK 없는 VARCHAR·`Db.php:944`).
- **Legal Entity 엔티티** — §20 전면 부재(`biz_no`/`corp_reg`/`tax_id` grep 0).
- **불변 prev-링크 버전체인** — §10/§55(현행 version 6컬럼 전부 하드코딩 태그).

### D-4. Explicit Deny 우선(§4.9) — 신설 필수
`acl_permission`은 **allow-only**(deny 표현 자체 0). §54 "Explicit DENY > Allow"·§65 "Explicit Deny 우회" 방어는 순수 신규.

## Consequences

### ★실 결함 (별도 승인세션 · 코드 변경 · 배포 필요)
1. 🔴 **high_value 라우팅 갭** — `approval_type='high_value'`가 승인자·경로를 하나도 선택 않고 소멸 → high_value(₩5M+)와 unregister가 **동일 경로·동일 권한**으로 결재(`Catalog::approveQueue:2350-2357`).
2. 🔴 **1인 결재 3경로** — catalog/admin_growth/action_request는 정족수 없이 1인 승인(mapping만 2인 maker-checker).
3. 🔴 **Actor Authorization Snapshot 부재** — 3경로 다 user/ts만 저장 → as-of 재구성 불가.
4. 🔴 **action_request VACUOUS** — 집행기(`Alerting::executeAction:601`)는 실코드나 생산자 0 = 죽은 파이프라인. §72-25 구현이력 정본 오염(`IMPLEMENTATION_STATUS.md:130` 거짓·인용 금지).
5. 🔴 **Payment Execution Control Hook 부재** — 승인만으로 자금이동 억제 훅 미배선(agent_mode 인접뿐).

### 후속 EPIC
- ⓓ 후속: 실 Authority 엔진 구현(선행 D-3 4건 신설 → Registry/Definition/Matrix/Binding/Threshold/Resolution/Snapshot/Reconciliation).
- 실 결함 5건은 **별도 승인세션**(Golden Rule + verify + 배포 승인). 본 세션 코드 변경 0.

## Status of coverage
`node tools/measure_06a_coverage.mjs`(블록 5334) 기준 전 엔티티 **VALIDATED_LEGACY 0 = 커버 0**. LEGACY_ADAPTER는 확장 대상 인접 자산이지 커버가 아니다.
