# DSAR — PDP/PEP Governance: 인가 결정 대사 (APPROVAL_POLICY_RECONCILIATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_POLICY_RECONCILIATION`(SPEC §2)은 동일 Request에 대한 **세 결정 표현이 서로 일치하는지 대사(對査)**하는 엔티티다. SPEC §20(Reconciliation)은 비교 3자를 규정한다.

| 비교 대상(SPEC §20) | 의미 |
|---|---|
| Runtime Decision | 지금 PDP가 새로 산출한 결정 |
| Snapshot | 기록된 불변 결정 스냅샷(SPEC §22) |
| Cached Decision | Decision Cache에 저장된 결정(SPEC §14) |

- 3자 불일치 = 무결성 위반 신호(캐시 오염·스냅샷 변조·정책 이탈). SPEC §25 Runtime Guard `Cache Poisoning`·`Unauthorized Decision` 탐지와 결합.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 요소 | 판정 | 근거 |
|---|---|---|
| authz Decision Reconciliation 엔진 | **ABSENT(grep 0)** | GT② §2 Analytics/Drift/Simulation/Reconciliation(authz) ABSENT · GT② §1 authz 매치 0건 |
| Runtime Decision 산출원 | **PARTIAL(proto)** | `effectiveForUser`(`TeamPermissions.php:393-421`) 근접·미배선(GT① §C) |
| Snapshot(불변 기록) | **PARTIAL** | SecurityAudit 해시체인(`SecurityAudit.php:12-68`) tamper-evident·verify — 단 문자열 detail·rule/scope trace 미기록(GT② §2). Immutable Decision Snapshot은 이 체인 기반 확장(ADR §D-5) |
| Cached Decision | **ABSENT** | Decision Cache 전무(GT② §2 `TeamPermissions.php:202-225` 매 호출 DB 재계산) → 3자 중 1자 부재 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력**: 동일 Request 키(subject/resource/action/context-hash·SPEC §14) 하의 Runtime Decision + Snapshot + Cached Decision(SPEC §20).
- **출력**: `recon_status`∈{MATCH, MISMATCH}. MISMATCH 시 불일치 축 식별(runtime↔snapshot / runtime↔cache / snapshot↔cache) + Runtime Guard 경보(SPEC §25).
- **동작**: 주기/트리거 대사 → MISMATCH → 캐시 무효화(SPEC §15)·재검증(SPEC §19·본 DSAR와 결합) 유도. Snapshot은 불변(SPEC §30 Immutable Decision Snapshot)이므로 진실기준(source of truth) 후보.
- **제약**: 테넌트 격리 절대(SPEC §30·`index.php:619`). 대사는 읽기전용 비교이며 결정을 직접 변경하지 않음(불일치 처리는 Revalidation으로 위임). 결정론 유지(SPEC §4).
- **선행 의존**: 3자 중 Snapshot·Cached Decision·중앙 PDP Runtime Decision이 모두 선행 존재해야 성립. 현재 Cached Decision 부재로 대사 자체 불가(ADR §D-3 Decision Cache 순신규 후).

## 4. KEEP_SEPARATE (마케팅 policy/drift/simulate/recon 흡수금지)

★동음이의 엄격 분리(GT② §5 C-3). 본 엔티티의 reconciliation은 **authz 결정 3자 대사**이며 정산/ROAS/재고 대사와 코드·데이터 공유 없음:

- **PgSettlement**(`routes.php:655`) = PG 정산 대사 · **Connectors.php:902** = ROAS 대사 · **Wms.php:2160** = 재고 대사 · **KrChannel.php:419** = 채널 대사. 전부 finance/ops(GT② §5 C-3). authz Decision Reconciliation 아님·흡수·개명 금지.
- Catalog `evaluatePolicy`·RuleEngine·Decisioning·`action_request` policy·`alert_policies`(GT② §5 C-1·C-2) = 마케팅/알림. authz policy 아님.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT(순신규)**. authz Decision Reconciliation 엔진 grep 0(GT②·ADR §2.2).
- **재활용(흡수 아님)**: Snapshot은 SecurityAudit 해시체인(`SecurityAudit.php:12-68`) 확장(ADR §D-5·rule/scope trace 구조화), Runtime Decision은 신설 중앙 PDP(effectiveForUser 승격·ADR §D-1).
- **선행의존(BLOCKED_PREREQUISITE)**: Decision Cache(ADR §D-3)·Immutable Snapshot(ADR §D-5)·중앙 PDP 선행 필수 — 3자 중 최소 1자(Cached Decision) 현재 부재. 코드 변경 0 · NOT_CERTIFIED. 하드코딩 authz 61+12개소(GT② §4)는 부채≠결함·재플래그 금지(ADR §D-8).
