# DSAR — Approval Participant (§19·필드 15)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)

## 0. 현행 실측 (file:line)

| 질문(스펙 §0 Q11 "누가 승인자 후보인가") | 현행 | 분류 |
|---|---|---|
| 승인자 **후보** 목록 엔티티 | **부재**(`approval_participant`·`approval_candidate` grep 0) | **NOT_APPLICABLE(부재→신설)** |
| 후보 지정 없이 승인 수락 | `Mapping::approve` `Handlers/Mapping.php:238-294` — 신원 확인·자기승인·dedup·정족수는 검사하나 **"이 사람이 후보인가"는 미검사** | **MIGRATION_REQUIRED** |
| `TeamPermissions::ACTIONS` 의 `'approve'` | `Handlers/TeamPermissions.php:39` 상수 + 시드(`:708-717`)·정규화(`:186-190`)에만 존재 · **승인 경로 검사 호출부 grep 0** | **고아**(데이터만 존재) |
| 후보 산출 기반 재료 | `acl_permission`(`TeamPermissions.php:152,169`) · `team`/`team_role`(`:145`) · `api_key.role`(`Db.php:942-955`) — **존재·분산** | **CONSOLIDATION_REQUIRED** |

**핵심**: 현행에 Participant(후보) 개념 자체가 **부재**다. 승인은 "후보로 지정된 자"가 아니라 **"엔드포인트에 도달한 자"**가 한다.

## 1. Participant = 후보(잠재) · Actor = 실제 결정자

스펙 §0 Q11(후보) 과 Q12(실제 결정자)는 **다른 질문**이다. Participant 는 **결정 전에** 확정되는 집합이며,
Actor(§20)는 **결정 시점에** 그 집합에서 실현된 1인이다. `Actor ⊆ Participant` 가 성립해야 §61 "Participant↔Actor 구분" 게이트를 만족한다.

**필드 15** — 스펙 §19 원문 항목명은 **저장소 미영속**(REQ 는 개수 `15` 만 고정 · 원문 나열 부재).
→ 분류 **UNVERIFIED**. 항목명을 **지어내지 않는다**(REQ §15 역산 금지 · 자기가 쓴 것을 요구로 삼는 사고).
스펙 원문 §19 수령 시 본 절을 채운다. **현 시점 커버리지 주장 불가**(분모 항목명 부재).

확정 가능한 구조적 요구는 다음뿐이다(스펙 §0/§61 에서 직접 도출):
- Participant 는 **Request/Case 단위**로 바인딩된다(§4.1 Resource 동일시 금지).
- Participant 는 **Tenant·Workspace 스코프**를 갖는다(§61 Tenant 기록).
- Participant 지정 **근거**는 Requirement Source(§18)를 참조한다 — 임의 지정 금지.

## 2. 규칙

- **후보 미지정 승인 금지** — Actor 가 Participant 집합에 없으면 **403 fail-closed**(`Mapping::actorId` `:51-52` 의 "얼버무리지 않는다" 원칙을 후보 검사로 확장).
- **`TeamPermissions::ACTIONS['approve']` 를 후보 산출 재료로 재사용**한다 — 중복 권한 모델 신설 금지(Golden Rule = Extend).
- **부재를 있다고 가정하고 배선 금지**(287차 죽은 스켈레톤) — Participant 테이블이 생기기 전까지 "후보 검사 통과" 를 표시하지 말 것(가짜녹색).
- 실 구현 = **별도 승인 세션**. 본 문서는 코드변경 0.
