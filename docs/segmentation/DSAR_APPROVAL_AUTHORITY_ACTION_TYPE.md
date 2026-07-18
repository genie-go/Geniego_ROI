# DSAR — Action Authority Binding · 지원 Action (§23 분할1)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §23(1209-1263) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
>
> **★분모(§23 측정기 정합)**: `measure_spec_denominator.mjs --sec=23` 실측 **41**(불릿 41·번호 0). §23 = **지원 Action 28 + 필수필드 13 = 41**. 본 문서(분할1)는 **지원 Action 28**을 전사한다. 필수필드 13 = [DSAR_APPROVAL_AUTHORITY_ACTION_BINDING.md](DSAR_APPROVAL_AUTHORITY_ACTION_BINDING.md)(분할2).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_AUTHORITY_ACTION_BINDING` 엔티티 | 🔴 Registry(§6)·Matrix(§12)·Entry(§14) 전량 부재 → Action Binding(액션↔권한 엔트리 결속) 부재 · `authority_matrix`·`action_binding` grep **0**(ⓑ §1) | `NOT_APPLICABLE`(부재→신설) |
| 승인 판정축 = **Action이 아니라 HTTP 메서드** | `roleRank` 게이트는 GET/POST/PUT/PATCH/DELETE로 write 여부만 판정(`index.php:568`) — 도메인 Action(APPROVE·SETTLE…) 축 없음(ⓑ §4.2) | `ABSENT` |
| **Approve/Override/Activate/Pay 권한 분리**(§23 마지막 문장) | 🔴 **미분리** — 승인 4경로 전부 단일 진입 게이트(analyst+ / requirePro / requirePlan('admin'))로 통과 · Action별 권한 구분 0(ⓑ §2·§3) | `ABSENT`(SoD gap §65) |
| 상태전이 실재성 | 상태전이 다수·전이 가드 8곳·`SET status` 128건이나 **합법 전이집합 선언 0**(전 도메인·ⓑ 5-3-3-3 앵커 · [DSAR_APPROVAL_ALLOWED_TRANSITIONS.md](DSAR_APPROVAL_ALLOWED_TRANSITIONS.md)) · 직접 덮어쓰기 예 `Alerting.php:653` | `LEGACY_ADAPTER` |

★**Action Binding 엔티티 전체가 부재하므로 Action 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "인접 자산/부재 깊이"를 기록한다. **Action이 인접 자산에 매핑돼도 그것은 `authority action`(권한으로서의 액션)이 아니라 상태머신 전이/도메인 파이프라인**이다.

## 1. 원문 전사 + 판정 — **§23 지원 Action 28**

| # | 원문 Action | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | CREATE | 승인권한 축의 CREATE 액션 부재 · CRUD create는 HTTP POST 게이트(도메인 무차별·ⓑ §4.2) | `NOT_APPLICABLE` |
| 2 | SUBMIT | 제출 액션 부재 · `pending_approval` 진입은 상태값이지 authority action 아님(ⓑ §2) | `NOT_APPLICABLE` |
| 3 | REVIEW | 검토 단계 액션 부재 · 1인 결재 3경로는 review/approve 미분리(ⓑ §2·§3) | `NOT_APPLICABLE` |
| 4 | APPROVE | 🔴 인접 = `acl_permission.approve` **장식** — ACTIONS 8종 중 실재(`TeamPermissions.php:39`)·seedOrg 5개소 시드(`:708`~`:717`)이나 **approve 비트를 읽어 승인 가부를 판정하는 핸들러 0**(소비처=scopeSql 데이터-행 필터뿐·ⓑ §3) | `LEGACY_ADAPTER` |
| 5 | REJECT | 인접 = 승인 상태전이(`Mapping::approve`/`AdminGrowth::approvalDecide` decision 분기) — 상태전이 실재이나 authority action 선언 아님·합법 전이집합 0(ⓑ §2·5-3-3-3) | `LEGACY_ADAPTER` |
| 6 | RETURN | 인접 = 반려 상태전이(REJECT와 동축) — 전이 가드 인접이나 authority action 아님(ⓑ §2) | `LEGACY_ADAPTER` |
| 7 | REQUEST_CHANGES | 인접 = 변경요청 상태전이 — 상태값 전이 인접·authority action 미선언(ⓑ §2) | `LEGACY_ADAPTER` |
| 8 | ACTIVATE | 🔴 활성화 authority action 부재 · `status='active'` SET는 존재하나 **Approve와 분리된 Activate 권한 없음**(§23 분리 요구 위반·ⓑ §3) | `NOT_APPLICABLE` |
| 9 | MODIFY | 수정 authority action 부재 · UPDATE는 HTTP PUT/PATCH 게이트(ⓑ §4.2) | `NOT_APPLICABLE` |
| 10 | INCREASE | 증액 authority action 부재 · 금액축(monetary authority) 자체가 없음(ⓑ §4) | `NOT_APPLICABLE` |
| 11 | DECREASE | 감액 authority action 부재 · 금액축 부재(ⓑ §4) | `NOT_APPLICABLE` |
| 12 | EXTEND | 연장 authority action 부재 · effective dating(valid_to) 부재로 연장 대상 없음(ⓑ §5) | `NOT_APPLICABLE` |
| 13 | TERMINATE | 종료 authority action 부재 · 합법 전이집합 미선언(ⓑ §2·§5) | `NOT_APPLICABLE` |
| 14 | CANCEL | 취소 authority action 부재 · 도메인 취소 파이프라인은 있으나 승인권한 아님(ⓑ §2) | `NOT_APPLICABLE` |
| 15 | REOPEN | 재개 authority action 부재 · `PENDING`류 종결 후 재개 2단계 미구현(ⓑ 5-3-3-3) | `NOT_APPLICABLE` |
| 16 | OVERRIDE_REFERENCE | 인접 = `agent_mode='approval'`(AI 에이전트 권한모드·`UserAdmin.php:524`·`AdAdapters::agentMode:42-49` VARCHAR 이진 게이트) + 위임상한 자기정합 스칼라 override(`TeamPermissions.php:639` `DELEGATION_EXCEEDED`) — Authority Override 액션 아님(ⓑ §2·§3) | `LEGACY_ADAPTER` |
| 17 | SETTLE | 도메인 정산 파이프라인 인접(정산 도메인 실재)이나 **정산 승인권한(authority action) 부재** — 파이프라인 유무 ≠ authority action(ⓑ §1·§4) | `KEEP_SEPARATE_WITH_REASON` |
| 18 | PAY | 결제 파이프라인 인접이나 payment authority action 부재 · `payment_authority` grep 0(ⓑ §1) | `KEEP_SEPARATE_WITH_REASON` |
| 19 | PAYOUT | 지급 파이프라인 인접이나 payout authority action 부재 · `payout_authority` grep 0(ⓑ §1) | `KEEP_SEPARATE_WITH_REASON` |
| 20 | REFUND | 환불 파이프라인 인접이나 refund authority action 부재 · `refund_limit` grep 0(ⓑ §1) | `KEEP_SEPARATE_WITH_REASON` |
| 21 | CREDIT | 크레딧 파이프라인 인접이나 credit authority action 부재 · `credit_limit` grep 0(ⓑ §1) | `KEEP_SEPARATE_WITH_REASON` |
| 22 | WRITE_OFF | 상각 파이프라인 인접이나 write-off authority action 부재 · `writeoff_limit` grep 0(ⓑ §1) | `KEEP_SEPARATE_WITH_REASON` |
| 23 | COMMIT | 확약 authority action 부재 · `commitment_authority` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 24 | SIGN | 서명 authority action 부재 · `signature_authority` grep 0(ⓑ §1) | `NOT_APPLICABLE` |
| 25 | RELEASE | 릴리스 authority action 부재 · 큐 소비(`Catalog::approveQueue`)는 상태 UPDATE이지 authority action 아님(ⓑ §2) | `NOT_APPLICABLE` |
| 26 | POST | 전기(posting) authority action 부재 · 회계 posting 권한 축 0(ⓑ §1) | `NOT_APPLICABLE` |
| 27 | REVERSE | 역분개(reversal) authority action 부재 · 도메인 역분개 로직은 있으나 승인권한 아님(ⓑ §1) | `NOT_APPLICABLE` |
| 28 | CUSTOM | 확장 authority action 부재 — 커스텀 액션 카탈로그 0(ⓑ §1) | `NOT_APPLICABLE` |

**실측 개수: 28 / 28 전사** (§23 지원 Action). 커버리지 = **`VALIDATED_LEGACY` 0** · `LEGACY_ADAPTER` 5 · `KEEP_SEPARATE_WITH_REASON` 6 · `NOT_APPLICABLE` 17.

> 🔴 **커버 0.** Action Binding 엔티티가 통째로 부재하므로 어떤 Action도 `VALIDATED_LEGACY` 가 아니다. `LEGACY_ADAPTER` 5건(APPROVE=acl_permission.approve 장식·REJECT/RETURN/REQUEST_CHANGES=승인 상태전이·OVERRIDE_REFERENCE=agent_mode/스칼라 override)은 **확장 대상 인접 자산**이지 커버가 아니다. `KEEP_SEPARATE_WITH_REASON` 6건(SETTLE/PAY/PAYOUT/REFUND/CREDIT/WRITE_OFF)은 **도메인 파이프라인은 실재하나 authority action이 아니므로** 별도 도메인으로 분리 유지한다(파이프라인 유무 ≠ 승인권한). 나머지 17건은 authority action 축 자체가 구조적으로 부재하여 `NOT_APPLICABLE`.

## 2. 규칙

- 🔴 **`APPROVE` 를 `acl_permission.approve` 로 재구현하지 마라**(`LEGACY_ADAPTER`) — approve 비트는 seed·표시·위임정합에만 쓰이고 **승인 가부 판독이 0**이다(ⓑ §3). Authority Action 축을 신설하되 approve 비트를 승인 게이트로 승격하는 방식은 §65 "Actor에게 Authority 없는데 승인 성공"을 재현한다.
- 🔴 **§23 마지막 문장 "Approve·Override·Activate·Pay 권한을 분리하라" 를 반드시 이행하라** — 현행은 4경로 전부 단일 진입 게이트로 **미분리**(SoD gap §65). Action Binding 신설 시 APPROVE / OVERRIDE_REFERENCE / ACTIVATE / PAY 를 서로 다른 authority action으로 결속하여 SoD(직무분리)를 1급 시민으로 세워라.
- 🔴 **SETTLE/PAY/PAYOUT/REFUND/CREDIT/WRITE_OFF 를 도메인 정산·결제 파이프라인으로 흡수하지 마라**(`KEEP_SEPARATE_WITH_REASON`) — 파이프라인은 실재하나 authority action이 아니다. 도메인 실행과 **금융 통제 승인권한**은 분리 유지하되, 승인권한 신설은 재무 통제 위험을 동반하므로 별도 승인세션에서 `BLOCKED_FINANCIAL_CONTROL_RISK` 검토를 선행하라.
- 🔴 **REJECT/RETURN/REQUEST_CHANGES 를 임의 `SET status` 로 두지 마라** — 전이 가드 8곳·`SET status` 128건이 존재해도 **합법 전이집합 선언이 0**이라 `Alerting.php:653` 같은 직접 덮어쓰기가 2단계 전이를 원천 위반한다(ⓑ 5-3-3-3). Action↔허용 상태전이 집합을 [DSAR_APPROVAL_AUTHORITY_ACTION_BINDING.md](DSAR_APPROVAL_AUTHORITY_ACTION_BINDING.md)의 `prohibited state transitions`/`before/after state`와 함께 선언하라.
