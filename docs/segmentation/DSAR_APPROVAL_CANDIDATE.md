# DSAR — Approval Candidate (§42·필드 22)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q11 "누가 승인자 후보인가") | 현행 | 분류 |
|---|---|---|
| **APPROVAL_CANDIDATE** 엔티티 | **부재** — `approval_candidate` grep **0** | **NOT_APPLICABLE(부재→신설)** |
| 승인자 후보 **산출 함수** | **부재**(grep 0) — "이 요청은 누가 승인할 수 있는가"를 답하는 코드 없음 | **NOT_APPLICABLE** |
| 후보 검사 없이 승인 수락 — `Mapping::approve` | `Handlers/Mapping.php:238-294` — 신원 확인(`:246-252` fail-closed) · 종결건 차단(`:260-264`) · 자기승인 차단(`:267-271`) · 동일행위자 dedup(`:277-284`) · 정족수(`:287`)는 검사하나 **"이 사람이 후보인가"는 미검사** | **MIGRATION_REQUIRED** |
| 후보 검사 없이 승인 수락 — `Alerting::decideAction` | `Handlers/Alerting.php:572-599` — 테넌트 소유 검증(`:581-582` 208차 P0 IDOR)만. **후보·자기승인·dedup·정족수 전부 미검사** · `:590` 첫 결정으로 즉시 `approved` | **MIGRATION_REQUIRED** |
| 후보 산출 **재료** | `TeamPermissions::ACTIONS`의 `'approve'`(`Handlers/TeamPermissions.php:39`) · `acl_permission`(`:15`) · `team_role`(`:13,17`) · `api_key.role`(`Db.php:942-955`) — **존재·분산** | **CONSOLIDATION_REQUIRED** |

> **핵심**: 현행 승인자는 **후보로 지정된 자가 아니라 엔드포인트에 도달한 자**다. 재료(`acl_permission` × `approve`)는 이미 있으나 **승인 경로에서 조회되지 않는다** — 부재는 **데이터의 부재가 아니라 배선의 부재**다.

## 1. Candidate = **결정 전에 확정되는 · 승인 가능한 주체 집합**

| 축 | Participant(§19) | **Candidate(§42)** | Actor(§20) |
|---|---|---|---|
| 성격 | 요청에 관여하는 자 전반 | **승인 자격을 갖춘 후보** | **실제 결정한 1인** |
| 시점 | 요청 생성 시 | **결정 전 산출** | 결정 시점 |

`Actor ⊆ Candidate` 가 성립해야 §61 "Participant↔Actor 구분" 게이트를 만족한다.

**필드 22** — 스펙 §42 원문 항목명은 **저장소 미영속**(REQ §7은 개수 `22`만 고정).
→ 분류 **UNVERIFIED**. 항목명을 **지어내지 않는다**(REQ §15 역산 금지). 원문 수령 시 채운다. **현 시점 필드 축 커버리지 주장 불가**.

영속된 요구(§0 Q11·Q13·Q14·§4.6·§61)에서 확정 가능한 구조 요구:
- Candidate 산출은 **Requirement Source(§18)를 근거로** 한다 — 임의 지정 금지(누가 왜 후보인지 재현 가능해야 §0 Q20 충족).
- Candidate는 **Tenant·Workspace 스코프**를 갖는다(§61) — 테넌트 격리 절대.
- Candidate 자격은 **결정 시점에 유효**해야 한다(§4.6) — 후보 산출 시각과 결정 시각 사이의 권한 변경은 **Actor Authorization Snapshot(§21)**이 잡는다.
- **요청자는 후보에서 제외**된다(§0 Q13 자기승인) — `Mapping.php:267-271`이 이미 결정 시점에 막고 있으나, **후보 산출 단계에서 배제**하는 것이 정본(사용자가 누를 수 없는 버튼이 더 정직하다).

## 2. 규칙

- **`TeamPermissions::ACTIONS['approve']` + `acl_permission`을 후보 산출 재료로 재사용**한다 — 중복 권한 모델 신설 **금지**(Golden Rule = Replace가 아니라 Extend).
- **후보 미지정 승인 금지** — Actor가 Candidate 집합에 없으면 **403 fail-closed**(`Mapping::actorId` `:246-252`의 "얼버무리지 않는다" 원칙을 후보 검사로 확장).
- **289차 G-01 수정을 후보 모델로 대체하지 않는다** — 자기승인·dedup·정족수 게이트는 **그대로 두고**, 후보 검사를 **앞에 추가**한다(무후퇴).
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — 후보 테이블이 없는 동안 "후보 검사 통과"를 표시하지 않는다(가짜녹색).
- 실 구현 = **별도 승인 세션**. 본 문서 **코드변경 0**.
