# DSAR — Approval Decision Eligibility (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§21 ELIGIBILITY** — 필수 필드:
`eligibility_id` · `command_id` · actor subject id · slot id · assignment/claim/lease/authority/delegation/sequential state/legal entity/organization/resource/action/amount/currency match · security/SoD/CoI result · channel/signature/MFA eligibility · eligibility result · exclusion reasons · evaluated_at · status · evidence.

## 2. 기존 구현 대조

명령이 **집행 자격을 갖췄는지 다축으로 평가하는 계층이 존재하지 않는다.** 4핸들러가 수행하는 통제는 자격 평가가 아니라 단편적 방어(자기승인 차단·정족수·이미처리 방어)이며, §21 이 요구하는 assignment/authority/delegation/claim/lease/SoD/CoI match 는 전부 부재하다.

| 계약 축 | 현행 실존 | 근거(허용목록) |
|---|---|---|
| actor 존재/미확인 fail-closed | 부분 존재 | `Mapping::actorId :36-53`(미확인 null·403 `:247`) |
| maker-checker 정족수 | 부분 존재 | `Mapping::approve` 정족수 `:287` · 자기승인 차단 `:268` · dedup `:278` |
| 이미처리/중복 방어 | 부분 존재 | `AdminGrowth::approvalDecide` 409 `:1327` · pending 중복방지 `:1292` |
| assignment / claim / lease match | **부재** | §3.4 Assignment ABSENT |
| authority / delegation match | **부재** | §3.2 Authority ABSENT · §3.3 Delegation ABSENT(DELEGATION_EXCEEDED 은 부여상한 오탐) |
| sequential state match | **부재** | §3.5 Sequential ABSENT(하드코딩 status flip) |
| security / SoD / CoI result | **부재** | SecurityAudit::verify(`:56-68`)=감사무결 전용 |
| channel / signature / MFA eligibility | **부재** | §16 Channel ABSENT |
| `eligibility_id` · exclusion reasons · eligibility result | **부재** | no hits |

`Mapping` 의 정족수·자기승인 차단은 자격 평가의 **한 조각**(actor eligibility 의 SoD 근사)이지, §21 의 다축 Eligibility 레코드가 아니다.

## 3. 판정

- **Verdict: ABSENT · BLOCKED_PREREQUISITE** — Eligibility 평가 레코드 전무. `Mapping` 의 정족수/자기승인 차단(`:287`·`:268`)은 인접 부분물이나 Eligibility 엔티티가 아니다.
- **선행 의존(BLOCKED)**: §3.4 Assignment·§3.2 Authority·§3.3 Delegation(모두 ABSENT) — Eligibility 의 핵심 match 축(assignment/authority/delegation)이 존재하지 않아 **평가 자체가 불가능**. 이것이 본 엔티티가 BLOCKED 인 근본 사유.
- **cover: 0**.

## 4. 확장/구현 방향 (설계)

- Eligibility 는 **Validation Pipeline(§25) 후반의 종합 판정 레코드** — Actor Resolution(§18)·Target(§19)·Scope(§20) 결과를 받아 assignment/claim/lease/authority/delegation/sequential/SoD/CoI match 를 평가하고 eligibility result + exclusion reasons 를 기록. 실패 시 fail-closed(Commit 차단).
- **절대 선행**: Assignment/Authority/Delegation(§3.4·3.2·3.3) **실엔진 신설이 Eligibility 의 전제** — 이 3군 없이 Eligibility 를 구현하면 항상 통과(가짜녹색)하거나 항상 빈 결과가 된다. 따라서 이 문서는 BLOCKED_PREREQUISITE 로, 선행 6군 착수 전 실 구현 금지.
- 재사용: actor eligibility 의 SoD 근사(자기승인 차단·정족수)는 **`Mapping::approve`(`:268`·`:287`) 로직을 Eligibility 축으로 흡수**(신규 정족수 엔진 신설 금지·Golden Rule=Extend).
- SoD/CoI result 는 SecurityAudit::verify(`:56-68`) 무결 정본과 별개 축으로 신설(audit_log 는 장식이므로 자격 판정 근거로 삼지 말 것).
- Mandatory Control: Eligibility 미평가 상태를 "적격" 으로 기록 금지(가짜녹색 · 287/288차 클래스). Unknown≠Eligible(Fail-closed).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_ACTOR_RESOLUTION]] · [[DSAR_APPROVAL_DECISION_TARGET_RESOLUTION]] · [[DSAR_APPROVAL_DECISION_SCOPE_RESOLUTION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
