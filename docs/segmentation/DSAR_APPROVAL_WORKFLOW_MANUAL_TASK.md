# DSAR — Manual Task (§26)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §26 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Manual Task(외부 수행 활동 추적) | **부재** — "시스템 밖에서 벌어진 일"을 기록하는 축 grep 0 | `NOT_APPLICABLE` |
| Evidence 저장소 | 승인 도메인 Evidence 첨부 **부재**. 현행 승인 기록 = `approvals_json` 의 `user`/`ts` 뿐(Mapping.php:285) | `NOT_APPLICABLE` |
| 인접 = 자동집행 불가 표기 | `Alerting::executeAction` 의 `approved_manual`(Alerting.php:628,:650 "이 액션 유형은 자동 집행 대상이 아니라 수동 처리가 필요합니다") — **수동 처리 필요성만 표기하고 수행 결과는 영영 받지 않는다** · 게다가 `VACUOUS`(생산자 0) | `KEEP_SEPARATE_WITH_REASON` |
| 인접 = PM 도메인 | `pm_tasks`(PM/Tasks.php:29-47) — 오프라인 활동을 담을 수 있으나 **프로젝트 일정관리**(Gantt/RAID) · Evidence/확인자/Resource Version 축 없음 | `KEEP_SEPARATE_WITH_REASON` |

**★축 주의 — `approved_manual` 은 Manual Task가 아니다.** Alerting.php:650은 "수동 처리가 필요합니다"라고 **선언만** 하고 상태를 종결시킨다 — 누가·언제·무슨 결과로 처리했는지 **되받는 경로가 없다**. 이름에 `manual` 이 들어간다는 이유로 §26 커버로 계산하면 **역산**이다. §26의 본질은 "외부에서 수행된 활동의 **결과와 증거를 시스템으로 되받아 기록**"인데, 현행은 **되받기 자체가 없다**.

## 1. 원문 전사 + 판정 — Manual Task 예 **원문 5종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 서면 계약 검토 | 부재 | `NOT_APPLICABLE` |
| 2 | 오프라인 회의 | 부재 | `NOT_APPLICABLE` |
| 3 | 외부 은행 확인 | 부재 · 정산/Funding 확인 축은 §27 예시와 연동 필요 | `NOT_APPLICABLE` |
| 4 | 고객 승인서 수령 | 부재 | `NOT_APPLICABLE` |
| 5 | 법률 문서 확인 | 부재 | `NOT_APPLICABLE` |

**실측 개수: 5 / 5 전사.** 커버리지 = 부재 5.
※ 원문은 이 5종을 **"예:"** 로 열거한다 — **폐쇄 목록이 아니다.** 5종을 열거형 값으로 고정하지 마라(원문이 요구하지 않은 제약을 만드는 것 = 날조의 다른 얼굴).

## 2. 원문 전사 + 판정 — Manual Task 완료 시 요구 항목 **원문 8종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | 수행자 | 부재 · 인접 = `Mapping::actorId`(위조불가 신원) — **재사용 대상** | `LEGACY_ADAPTER` |
| 2 | 수행 일시 | 부재 — 외부 수행 시각(≠ 기록 시각) 축 없음 | `NOT_APPLICABLE` |
| 3 | 수행 결과 | 부재 | `NOT_APPLICABLE` |
| 4 | Evidence | 부재 — 승인 도메인 첨부/증빙 저장소 grep 0 | `NOT_APPLICABLE` |
| 5 | 외부 Reference | 부재 | `NOT_APPLICABLE` |
| 6 | 확인자 | 부재 — 수행자와 **별개 축**(Maker-Checker 와 동형) | `NOT_APPLICABLE` |
| 7 | Resource Version 확인 | 부재 · §23 Resource Snapshot 검증과 동일 결번 | `NOT_APPLICABLE` |
| 8 | Comment | 부재 · §23 Decision Reason 과 동일 결번 | `NOT_APPLICABLE` |

**실측 개수: 8 / 8 전사.** 커버리지 = 부재 7 · 어댑터 1.
※ 원문 §26 요구 목록은 **`Comment` 로 끝난다 — `evidence` 종결이 아니다**(`Evidence` 는 4번으로 중간에 위치). 스펙 타 엔티티의 `evidence` 종결 관례를 **투사하지 않았다**.

## 3. 규칙

- 🔴 **원문 마지막 줄 = 하드 게이트: "Evidence 없이 Critical Manual Task를 완료하지 못하게 하라."** 이는 **fail-closed** 규율이다 — Evidence 미첨부 시 완료를 **거부**해야 하며, 경고 후 통과는 위반이다. 289차 G-01의 `actorId` fail-closed(Mapping.php:246-250, 미확인 null→403)와 **같은 형태**로 구현하라.
- **"Critical" 의 판정 기준은 원문에 없다** — 지어내지 마라. Manual Task 정의(§Definition)에 **criticality 축이 선행**되어야 이 게이트가 성립한다. 기준 미정 상태에서 임의 임계를 코드에 박으면 §23 정족수 `2` 리터럴(Mapping.php:209)과 **같은 실수**의 반복이다.
- **수행자(1번)는 `Mapping::actorId` 를 재사용하라** — 신설 금지. 🟠 단 `actor_type` 부재 결함(apikey/user 동등 계수)을 함께 인지하라: **오프라인 활동의 수행자가 API 키여선 안 된다.**
- **확인자(6번) ≠ 수행자(1번)** — 두 축을 한 컬럼으로 접지 마라. 접으면 자기확인이 성립해 §23 자기승인 차단(:268-271)이 무의미해진다.
- 🔴 **`approved_manual`(Alerting.php:650)을 Manual Task 완료로 승격 금지.** 이 상태는 **결과 되받기 경로가 없고**, 소속 `action_request` 자체가 `VACUOUS`(생산자 0)다.
- 🔴 **13종(예 5 + 요구 8) 중 현행 충족 0** — "있다고 가정"하고 배선 금지.
