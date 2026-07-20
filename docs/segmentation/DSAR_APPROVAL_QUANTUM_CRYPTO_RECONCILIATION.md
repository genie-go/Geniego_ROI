# DSAR — Approval Crypto Reconciliation (Part 3-23 §23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

**Crypto Reconciliation**은 인가 crypto 자산의 상태를 서로 다른 관점(view) 간에 대사(reconcile)하여 불일치를 정합화하는 거버넌스 계약이다. Part 3-23은 §21 Drift(이탈 감지)·§22 Revalidation(재검증)의 판정을 신뢰 가능하게 만들기 위해, 비교의 기준이 되는 4개 view가 서로 일치함을 보장해야 한다고 규정한다.

Reconciliation 4-view 비교:
- **Live Crypto State** — 런타임이 실제로 사용하는 암호 상태(실사용 알고리즘/키/모드).
- **Snapshot** — 특정 시점에 포착된 인벤토리 스냅샷.
- **Baseline** — 승인된 기준 상태(정책이 허용한 목표).
- **Inventory** — §2 카탈로그가 선언한 등록 자산 집합.

Reconciliation은 (Live vs Snapshot vs Baseline vs Inventory) 4자간 차분을 산출하여 누락·초과·불일치 항목을 정합 큐로 올린다.

## 2. Substrate 매핑 (Reconciliation이 대사할 Live 자산)

| View | 현행 SOURCE(Live 상태 관측점) | 인용 |
|---|---|---|
| Live(암복호) | AES-256-GCM envelope 실사용 | `Crypto.php:108-126` |
| Live(비대칭) | 엔터프라이즈 인증 비대칭 키 | `EnterpriseAuth.php:536` |
| Live(키 버전) | KEK 회전 상태 | `Crypto.php:133-148` |
| Baseline 후보 | 감사 해시 알고리즘 | `SecurityAudit.php:27` |
| Inventory 후보 | 의존성 선언 | `composer.json:5-13` |

Live view는 위 산재된 실사용 지점에서 도출된다. **문제: Snapshot·Baseline·Inventory 3개 view가 모두 부재**하므로 4자 대사의 비교 대상이 미완이다(비교항 3/4 결손).

## 3. 설계 계약 (Design Contract)

- **4-view 정합**: Reconciliation은 4 view의 차분을 산출하고, 결손 view가 있으면 대사를 `INCOMPLETE`로 표기(추정 금지, fail-closed).
- **Drift/Revalidation의 기반**: §21 Drift는 (Live vs Baseline) 차분, §22 Revalidation은 (변경 이벤트 vs Inventory) 무효화. 두 계약 모두 Reconciliation이 제공하는 정합된 view에 의존한다.
- **Inventory/Snapshot 선행**: §2 Inventory·Snapshot 부재로 대사 미완 → **BLOCKED_PREREQUISITE**. Reconciliation은 Inventory 신설 이후에만 유의미.
- **감사 append-only**: 대사 결과·불일치 항목은 `SecurityAudit.php:27`·`:56-68` 해시체인에 기록.
- **비파괴 관측**: Live 자산(`Crypto.php:108-126`·`EnterpriseAuth.php:536`)은 수정하지 않고 상태만 읽는다.

## 4. KEEP_SEPARATE

- **정산 Reconciliation(비암호)**: `PgSettlement.php`·`KrChannel.php:415`·`Connectors.php:896-902` 는 결제/채널 정산 금액 대사로, 암호 상태 대사와 완전 별개다. "reconciliation" 명칭만 공유하며 도메인(금액 vs 암호자산)·비교 대상이 전혀 다르므로 통합·재사용 금지.

## 5. 판정

**ABSENT** — Crypto Reconciliation 엔진은 grep 0. Live view의 관측점(`Crypto.php:108-126`·`EnterpriseAuth.php:536`·`Crypto.php:133-148`)은 산재 실재하나, Snapshot/Baseline/Inventory 3 view가 부재하여 **비교 대상 자체가 미완**이다. §2 Inventory 선행 부재로 **BLOCKED_PREREQUISITE**. 정산 reconciliation과 명명만 겹칠 뿐 KEEP_SEPARATE. 순신설 대상. 코드 변경 0 · NOT_CERTIFIED.
