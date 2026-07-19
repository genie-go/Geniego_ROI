# DSAR — Permission Amount & Currency Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission이 금액·통화 차원에 부여하는 **Foundation 제약**(min/max amount·allowed currencies·통화 환산 금지·정확 매칭·amount snapshot binding)을 정형화한다. **★Approval Authority(Part 5)와 혼동 금지**: 이 엔티티는 "이 Permission이 금액을 다루는 Action을 **할 수 있는가**"라는 **가능성(Action possibility)의 금액/통화 경계**만 선언한다. **실제 승인 한도·법인/조직별 결재 권한·금액 계층 승인은 Part 5 Approval Authority의 책임**이다. Permission ≠ Authority(ADR §6.2·D-5). 이 엔티티는 순신규.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `amount_scope_code` | Amount/Currency Scope 식별자 |
| `min_amount` / `max_amount` | 이 Permission이 다룰 수 있는 금액 하/상한(가능성 경계·승인한도 아님) |
| `allowed_currencies` | 허용 통화 집합(ISO 4217) |
| `currency_conversion_allowed` | Boolean(**기본 false**·환산 금지) |
| `exact_match_required` | Boolean(통화·금액 정확 매칭 강제) |
| `amount_snapshot_binding` | 판정 시점 금액 스냅샷 고정(사후 변조 무효) |
| `snapshot_ref` | 결합된 amount snapshot 참조 |
| `authority_delegation_ref` | 실 승인 한도로의 위임 참조(**Part 5 Approval Authority**) |

## 3. 열거형 / 타입

- **currency_conversion_allowed**: `false`(기본·Mandatory) · `true`(명시 정책·감사 필수).
- **exact_match_required**: `true`(통화 mismatch=거부·부동소수 환산 회피) · `false`.
- **amount_binding_mode**: `SNAPSHOT_BOUND`(판정 시점 금액 고정) · `UNBOUND`(금지 대상).

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Permission Amount/Currency Scope(min/max·allowed currencies·conversion prohibition·exact match·snapshot binding) | — | **ABSENT(순신규)** | — |
| 승인 한도/금액 결재(별개 책임) | — | **Part 5 Approval Authority로 이관(Permission 아님)** | ADR §6.2·D-5 |

★Permission 계층에 금액/통화 차원 자체가 부재(순신규). 실존 substrate(TeamPermissions acl/data_scope·index.php RBAC)는 menu×action·row scope·role/scope만 판정하며 금액/통화 경계를 담지 않는다. **금액 승인 한도는 Permission이 아니라 Approval Authority(Part 5)** 이므로, 이 엔티티에서 승인 한도 로직을 재구현하지 않는다.

## 5. 설계 원칙 / 결정

- **Permission=가능성, Authority=한도**: 이 Scope는 "APPROVE_PAYMENT 같은 Action을 다룰 수 있는 금액/통화 경계"만. 구체 결재 한도·법인/조직 계층 승인은 `authority_delegation_ref`로 Part 5에 위임(중복 구현 금지).
- **통화 환산 금지 기본값**: `currency_conversion_allowed=false`·`exact_match_required=true` — 통화 mismatch를 환산으로 우회하지 않음(정확 매칭·Mandatory).
- **Amount Snapshot Binding**: 판정 시점 금액을 스냅샷에 고정, 요청 사후 금액 변조를 무효화(불변 evidence·Part 1 Snapshot 결합).
- Golden Rule: Approval Authority(Part 5)와 Contract만 연결 — Permission 계층에 승인 워크플로/한도 엔진 신설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 전 필드 순신규 ABSENT — Permission 계층에 금액/통화 차원 부재.
- **혼동 방지 명문화**: 실 승인 한도 = Part 5 Approval Authority(별도 엔티티) — 여기서 승인 로직 재구현 금지.
- **BLOCKED_PREREQUISITE**: Amount Snapshot은 Part 1 Snapshot/Evidence(Decision Core) 신설 후 결합 — **RP-002**.
- Part 1 D-2 위험 4건 = 289차 P1~P4 해소 — 재플래그 금지.
