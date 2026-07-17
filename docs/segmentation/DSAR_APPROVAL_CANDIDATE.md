# DSAR — Approval Candidate (§42·필드 **26**)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> **전사 근거: [SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_1_VERBATIM.md) §42**
> 🔴 **REQ 집계 불일치 — 본 문서 최대 격차**: REQ §7은 필드 **22**로 고정하나 **원문 실측 26**(4 누락). **원문이 정본** — 제목·본문을 26으로 정정한다.

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

### 1.1 필수 필드 — **원문 전사 26** (§42)

`APPROVAL_CANDIDATE`

| # | 필드(원문) | 현행 대조 (file:line) | 분류 |
|---|---|---|---|
| 1 | candidate_id | `approval_candidate` grep **0** | NOT_APPLICABLE |
| 2 | request_id | 후보↔요청 링크 부재 | NOT_APPLICABLE |
| 3 | approval domain | Domain Type 축 부재(§6) | NOT_APPLICABLE |
| 4 | requester | **부분 존재** — `mapping_change_request.requested_by`(`Db.php:623-636`) · `admin_growth_approval.requested_by`(`AdminGrowth.php:142-149`) | LEGACY_ADAPTER(요청 축 · 후보 축 아님) |
| 5 | requested for | 부재 — 대리 요청(on-behalf) 개념 없음 | NOT_APPLICABLE |
| 6 | resource | 부재(후보 축) | NOT_APPLICABLE |
| 7 | resource version | Version 축 부재(§4.4) | NOT_APPLICABLE |
| 8 | action | 부재(후보 축) | NOT_APPLICABLE |
| 9 | amount | 부재 | NOT_APPLICABLE |
| 10 | currency | 부재 | NOT_APPLICABLE |
| 11 | tenant | **부분 존재** — `mapping_change_request.tenant_id` · `action_request.tenant_id`(ALTER `Db.php:589`). 🔴 `admin_growth_approval`은 **tenant_id 없음**(전역 · `AdminGrowth.php:142-149`) | CONSOLIDATION_REQUIRED |
| 12 | workspace | 부재 — 실체는 `tenant_kv` KV(`WorkspaceState.php:59`)이며 **레지스트리 아님** | NOT_APPLICABLE |
| 13 | legal entity | 부재(grep 0) | NOT_APPLICABLE |
| 14 | environment | 부재 | NOT_APPLICABLE |
| 15 | risk | 부재(승인 도메인 risk 축 grep 0) | NOT_APPLICABLE |
| 16 | authorization decision | 부재 — 후보 산출을 인가 결정에 근거시키는 경로 없음 | NOT_APPLICABLE |
| 17 | matched policies | 부재 — Policy Reference(§33) 축 부재. `PlanPolicy`는 🔴 **fail-open**(`PlanPolicy.php:12` 주석 자인) → 게이트 기반 부적격 | BLOCKED_POLICY_DRIFT |
| 18 | generated requirements | 부재 — Requirement(§17)·Requirement Source(§18) 축 부재 | NOT_APPLICABLE |
| 19 | candidate participants | 부재 — 재료(`TeamPermissions::ACTIONS['approve']` `TeamPermissions.php:39` · `acl_permission` · `team_role` · `api_key.role` `Db.php:942-955`)는 **존재하나 승인 경로에서 미조회** | CONSOLIDATION_REQUIRED |
| 20 | resource snapshot | 부재(§30 · grep 0) | NOT_APPLICABLE |
| 21 | context snapshot | 부재(§32 · grep 0) | NOT_APPLICABLE |
| 22 | duplicate result | **부분 선례** — `AdminGrowth::createApproval`(`AdminGrowth.php:1289-1297` · 판정 `:1292`)이 동일 `ref_type/ref_id` pending 재사용 = **현행 유일한 승인측 중복 방지**. 단 **후보 축 아님** | LEGACY_ADAPTER(약한 dedup 선례) |
| 23 | proposed case type | Case 축 부재(§4.2) | NOT_APPLICABLE |
| 24 | proposed status | 부재(후보 축) | NOT_APPLICABLE |
| 25 | manual review requirement | 부재 — 수동 검토 요구 플래그 grep 0 | NOT_APPLICABLE |
| 26 | evidence | 부재([Evidence 문서](DSAR_APPROVAL_EVIDENCE.md) §0) | NOT_APPLICABLE |

🔴 **필드 26/26 중 Candidate 축으로 존재하는 것 0** — 커버리지 0/26. 4·11·19·22는 **인접/재료**일 뿐 후보 산출 구현이 아니다. **재료가 있다는 것을 "후보 검사가 있다"로 읽지 말 것**(파일 존재 ≠ 배선 ≠ 실효).

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
