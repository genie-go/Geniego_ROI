# DSAR — Task Release·Reassignment (§39)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §39 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Release 사유 축 | `release_reason` **grep 0** — 해제 사유 개념 전무 | `NOT_APPLICABLE`(부재 → 신설) |
| Release 기전(잡) | `JourneyBuilder` `$release`(:417-418 `status='processing'`→`'waiting'`) · `releaseSendOnce`(:463-471 행 DELETE) — **시각·사유 미기록** | `LEGACY_ADAPTER`(기전만) |
| 자동 회수(타임아웃) | `Omnichannel::claimBatch`(:395-400 stale **900s** → `status='queued'` 회수) · `ChannelSync`(:6136-6138 stale **600s** 회수 · 주석 "크래시한 워커가 남긴 'processing' 회수 — 영구 스턱 방지") | `LEGACY_ADAPTER`(**TIMEOUT 패턴 정본**) |
| Reassignment | **grep 0** — 재배정 개념 전무(Assignment 자체 부재 §37) | `NOT_APPLICABLE` |
| 완료 Task 의 Release 면제 | **판정 불가** — Task 개념 부재. 인접 = `Mapping::approve` 비-pending **409 차단**(:262-266) = **완료 건에 대한 재작업 차단**의 유일 선례 | `LEGACY_ADAPTER`(규율 선례) |
| 사유 문자열 선례 | `Omnichannel::mark` 의 사유 인자 — `quiet_hours_defer`(:350) · `sto_defer`(:363) · `frequency_capped`(:354) · `no_channel_available`(:369) · `no_customer`(:348) | `KEEP_SEPARATE_WITH_REASON` |

**★축 주의 — 자동 회수 ≠ Release.** `Omnichannel`(900s)·`ChannelSync`(600s)의 stale 회수는 **워커가 죽었을 때 잡을 되살리는 것**이다. 원문 §39 는 **사람이 Task 를 놓거나 빼앗기는 것**이며 **10종 사유를 구분해 기록하고 Release 이후 Candidate 를 재평가**할 것을 요구한다. 현행 회수는 사유를 남기지 않고(그럴 필요가 없다 — 사유가 항상 "워커 크래시" 하나뿐이므로) 재평가할 Candidate 도 없다. **커버로 계산하면 역산이다** → `TIMEOUT` 1종의 **패턴 재사용 근거로만** 인용한다.

**★사유 문자열 선례의 도메인 상이.** `Omnichannel::mark` 의 `quiet_hours_defer`/`sto_defer` 등은 **발송 보류 사유**다. 형태(사유 문자열 열거)는 §39 와 닮았으나 **클레임 해제 사유가 아니다** → `KEEP_SEPARATE_WITH_REASON`. 다만 **"사유를 구분해 기록한다"는 규율 자체는 레포에 실재**하며, 그 사유들이 §40 `defer≠실패` 규율을 지탱한다(§40 참조).

## 1. 원문 전사 + 판정 — **원문 10종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | USER_RELEASE | 부재 — 사람이 놓는 경로 없음(클레임 자체 부재 §38) | `NOT_APPLICABLE` |
| 2 | ROLE_REVOKED | 부재 — **전제인 `actor authorization snapshot` 이 grep 0**(§38 #4). 인가 스냅샷이 없으면 "역할이 회수됐다"를 판정할 기준 시점이 없다 | `NOT_APPLICABLE` |
| 3 | ASSIGNMENT_EXPIRED | 부재 — **전제인 Assignment `valid_from`/`valid_to` 부재**(§37 #18,19) | `NOT_APPLICABLE` |
| 4 | ORGANIZATION_TRANSFER | 부재(Release 사유) · 전제 자산은 존재 = `app_user.team_id` 이동(TeamPermissions.php:22 "`UserAuth::updateTeamMember` 가 team_id 동기화") — **이동은 일어나나 Task 에 파급되는 경로 0** | `LEGACY_ADAPTER`(전제 자산) |
| 5 | UNAVAILABLE_REFERENCE | 부재 · 이름 유사 = `no_channel_available`(Omnichannel.php:369 "어떤 채널도 자격 미등록/미도달") = **채널 미가용이지 사람 부재 아님** | `KEEP_SEPARATE_WITH_REASON` |
| 6 | TIMEOUT | 부재(Task) · **능력은 REAL** = stale 리스 회수 `Omnichannel` 900s(:395) · `ChannelSync` 600s(:6136) | `LEGACY_ADAPTER`(**패턴 강제 재사용**) |
| 7 | ADMINISTRATIVE | 부재 — 관리자 강제 해제 경로 없음 | `NOT_APPLICABLE` |
| 8 | SECURITY_INCIDENT | 부재(Release) · 인접 킬스위치 = `AdAdapters::executionEnabled`(:34-40 · **호출부 9곳 실배선 REAL**) — **집행 차단이지 클레임 해제 아님** | `LEGACY_ADAPTER`(차단 기전 재사용) |
| 9 | WORKFLOW_MIGRATION | 부재 — 워크플로 정의(`workflow_*`/`flow_*`/`wf_*`) grep 0 → 마이그레이션 대상 자체가 없음 | `NOT_APPLICABLE` |
| 10 | TASK_CANCELLED | 부재(Task) · 인접 취소 선례 = OrderHub 수동취소 역분개(268차) · `Omnichannel::mark(..., 'skipped', ...)`(:348,354,369) | `NOT_APPLICABLE` |

**실측 개수: 10 / 10 전사.** 커버리지 = 부재(`NOT_APPLICABLE`) 6 · 인접 위임(`LEGACY_ADAPTER`) 3 · 도메인 분리(`KEEP_SEPARATE_WITH_REASON`) 1 · **현행 충족 0**.

## 1-2. 원문 규율 전사 — **원문 2종**

| # | 원문 규율 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Release 이후 Task 상태와 Assignment Candidate를 재평가한다 | **재평가 0** — 현행 회수는 `status` 를 되돌릴 뿐(`Omnichannel`:396 `status='queued'` · `ChannelSync`:6137 `status='queued'` · `JourneyBuilder`:417 `status='waiting'`) **후보 재평가 없음**(후보 개념 부재 §37) | `NOT_APPLICABLE` |
| 2 | 완료된 Task는 일반 Release 대상으로 사용하지 않는다 | **규율 선례 존재** = `Mapping::approve` 비-pending **409**(:262-266 "proposal is not pending (status={$curStatus})" · 289차 G-01 "이미 처리된 건에 승인 누적 금지") — **승인 누적 차단이지 Release 면제 아님** | `LEGACY_ADAPTER`(규율 이식) |

**실측 개수: 2 / 2 전사.**

## 2. 규칙

- 🔴 **`ROLE_REVOKED`·`ASSIGNMENT_EXPIRED` 를 §39 에서 먼저 구현 금지 — 전제가 없다.** `ROLE_REVOKED` 는 §38 `actor authorization snapshot`(grep 0)이, `ASSIGNMENT_EXPIRED` 는 §37 `valid_from`/`valid_to`(부재)가 **선결**이다. 전제 없이 사유만 열거하면 **영원히 발생하지 않는 사유**가 된다 — `action_request` 의 `required_approvals:2` 가 응답에만 있고 `decideAction` 은 1명에 approved 하는 것(Alerting.php:562)과 **같은 실패 형태**(계약만 있고 실체 없음)다.
- 🔴 **`TIMEOUT` 은 신설 금지 — stale 회수 패턴을 재사용하라.** `Omnichannel`:395-400 · `ChannelSync`:6136-6138 이 이미 **"크래시한 소유자가 남긴 처리중 상태를 기한 초과로 회수해 영구 스턱을 막는다"**를 구현한다. 단 **TTL 이 900s/600s 2공식 병존**이므로 신설분은 **§38 `claim expires at` 컬럼 기반**으로 통일하라(쿼리 내 `time()-N` 계산 금지 — Task 별 기한을 못 준다).
- 🔴 **Release 를 상태 되돌리기로만 구현 금지.** 현행 3경로 전부 **사유·시각을 남기지 않는다**. §39 가 10종 사유를 구분하라고 요구하는 이상 **Release 는 §38 `released_at`+`release reason` 에 기록되는 이벤트**여야 한다. 현행 패턴을 그대로 베끼면 §39 는 성립 불가다.
- 🔴 **"Release 이후 Candidate 재평가"를 잊지 마라 — 이것이 §39 의 실질이다.** 사유 10종 전사는 쉽고, **재평가 배선이 진짜 요구**다. 재평가 없이 `status` 만 되돌리면 **같은 사람에게 다시 배정**되어 `ROLE_REVOKED`·`ORGANIZATION_TRANSFER` 가 무의미해진다.
- **`ORGANIZATION_TRANSFER` 의 전제 자산은 이미 있다** — `app_user.team_id` 이동(`UserAuth::updateTeamMember` · TeamPermissions.php:22). **부재한 것은 이동이 아니라 이동이 Task 에 파급되는 경로다.** 조직 이동을 승인 도메인이 자체 감지하려 들지 말고 **`UserAuth` 이동 지점에서 파급**시켜야 SSOT 가 유지된다.
- **`SECURITY_INCIDENT` 의 차단 기전은 `AdAdapters::executionEnabled`(:34-40) 재사용.** 킬스위치는 **호출부 9곳 실배선 REAL** 이다 — 승인 도메인이 두 번째 킬스위치를 만들면 하나만 내려도 다른 하나가 통과시킨다.
  ⚠️ 오탐 주의: `pause()` 가 킬스위치 면제인 것은 **279차 D-P1 의도된 설계**(킬스위치는 지출을 **늘리는** 방향만 차단)다 — 재플래그 금지. `ClaudeAI.php` 의 "killswitch 내장" **주석은 실효와 불일치**하므로 주석만 읽고 판단 금지.
- **"완료된 Task 는 일반 Release 대상 아님"은 `Mapping::approve` 비-pending 409(:262-266) 규율을 이식하라.** 289차 G-01 이 이미 "이미 처리된 건에 상태 변경 누적 금지"를 확립했다 — **재작성이 아니라 이식**이다.
- 🔴 **6종 "있다고 가정"하고 배선 금지.**
- **`*_REFERENCE` 접미 1종**(`UNAVAILABLE_REFERENCE`)은 **참조 유형** — 해당 정의를 참조만 하고 **중복 정의 금지**.
