# DSAR — Approval Delegation Priority (§32)

> EPIC 06-A-01 Rebate Delegation Foundation · 289차 12회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md](SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md) §32 · ⓑ전수조사: [DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_DELEGATION_EXISTING_IMPLEMENTATION.md) · 상위 해소: [DSAR_APPROVAL_DELEGATION_RESOLUTION.md](DSAR_APPROVAL_DELEGATION_RESOLUTION.md) · 결과: [DSAR_APPROVAL_DELEGATION_RESOLUTION_RESULT.md](DSAR_APPROVAL_DELEGATION_RESOLUTION_RESULT.md) · 특이성: [DSAR_APPROVAL_DELEGATION_SPECIFICITY_POLICY.md](DSAR_APPROVAL_DELEGATION_SPECIFICITY_POLICY.md) · 타입: [DSAR_APPROVAL_DELEGATION_TYPE.md](DSAR_APPROVAL_DELEGATION_TYPE.md) · ADR: [ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_DELEGATION_FOUNDATION_GOVERNANCE.md)(예정)
>
> **측정기 분모(육안 금지)**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_01_DELEGATION_FOUNDATION_VERBATIM.md --sec=32` → **§32 = 15**(줄범위 1494-1517 · 불릿 0 · **번호 15** ← 번호목록·불릿만 세면 0). 분할 = **권장 기본 우선순위 15단**(Emergency Delegation ~ Block). 하위 ENUM/필드 없음(정책 순서 목록).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| Delegation 우선순위 해소 로직 | `delegation_priority`·`redelegation` 복합어 grep **0** — 복수 위임 간 우선순위 순서 산출 개념 부재(ⓑ §0·§1) | `NOT_APPLICABLE`(우선순위 로직 부재) |
| 인접 우선순위 선례 | `Alerting`/`AutoRecommend` severity·`PM` priority enum 은 **알림/태스크 도메인** — 승인 위임 우선순위 아님(도메인 상이) | `KEEP_SEPARATE_WITH_REASON` |
| Acting Position / Vacation / OOO / Backup 타입 | 🔴 Delegation Type(§8) 엔티티 부재 → `ACTING_POSITION`·`VACATION`·`OUT_OF_OFFICE`·`BACKUP_APPROVER` **타입 자체가 미시드**(ⓑ §4 전량 ABSENT·`acting`/`vacation`/`backup` grep 오탐만) | `ABSENT`(타입 부재) |

★**우선순위는 복수 위임이 존재할 때 비로소 의미를 갖는데, Delegation 엔티티·타입·해소 엔진이 통째로 부재하므로 순서 단계 단위 커버는 원천 불가.** 아래는 원문 전사(신설 명세)이며 현행 대조는 "부재 깊이/타입 부재"를 기록한다. `VALIDATED_LEGACY`는 §58 금지(커버 0).

## 1. 원문 전사 + 판정 — **원문 15종**(권장 기본 우선순위 15단 · 번호목록)

### 권장 기본 우선순위 (15)

| 순위 | 원문 우선순위 항목 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | Emergency Delegation | 🔴 우선순위 해소 로직 부재 · `EMERGENCY` 타입도 미시드(§8·`emergency` grep 부재·ⓑ 헤더) | `NOT_APPLICABLE` |
| 2 | Task-specific Approved Delegation | 우선순위 해소 부재 · Task 별 위임 승인 개념 0(Task Reassignment 은 §5.10 별 도메인) | `NOT_APPLICABLE` |
| 3 | Chain Level-specific Delegation | 우선순위 해소 부재 · Approval Chain Level(5-3-3-3) 자체 부재 | `NOT_APPLICABLE` |
| 4 | Authority-specific Delegation | 우선순위 해소 부재 · Approval Authority(5-3-3-4) 전면 부재 | `NOT_APPLICABLE` |
| 5 | Legal Entity-specific Delegation | 우선순위 해소 부재 · Legal Entity 전면 void(`biz_no` grep 0) | `NOT_APPLICABLE` |
| 6 | Resource-specific Delegation | 우선순위 해소 부재 · Resource Binding(§13) 미구동 | `NOT_APPLICABLE` |
| 7 | Action-specific Delegation | 우선순위 해소 부재 · Action Binding(§14) 미구동 | `NOT_APPLICABLE` |
| 8 | Acting Position Delegation | 🔴 `ACTING_POSITION` 타입 부재(§8) · Position 엔티티 0(`position_idx`=Gantt 정렬 오탐·ⓑ §3.3) | `ABSENT` |
| 9 | Vacation Delegation | 🔴 `VACATION` 타입 부재(§8) · `vacation` grep 부재 · HRIS/Leave 엔티티 0(ⓑ §4) | `ABSENT` |
| 10 | Out-of-office Delegation | 🔴 `OUT_OF_OFFICE` 타입 부재(§8) · `sharedCalendarEvents`=콘텐츠 캘린더 오탐(OOO 아님·ⓑ 헤더) | `ABSENT` |
| 11 | Scheduled Temporary Delegation | 우선순위 해소 부재 · `SCHEDULED`/`TEMPORARY` 타입 미시드(§8) | `NOT_APPLICABLE` |
| 12 | Backup Approver | 🔴 `BACKUP_APPROVER` 타입 부재(§8) · `backup` grep=DB백업/`.bak` 오탐(승인자 아님·ⓑ 헤더) | `ABSENT` |
| 13 | Tenant Default Delegation | 우선순위 해소 부재 · 테넌트 기본 위임 개념 0 | `NOT_APPLICABLE` |
| 14 | Manual Review | 우선순위 해소 부재 · 수동 검토 라우팅 미구동 | `NOT_APPLICABLE` |
| 15 | Block | 우선순위 해소 부재 · 차단 결과 산출 주체(Resolution 엔진) 부재 | `NOT_APPLICABLE` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `NOT_APPLICABLE` 11 · `ABSENT` 4.

> 🔴 **커버 0.** 우선순위는 복수 위임 해소 시 순서를 정하는 정책인데, Delegation 엔티티·타입·해소 엔진이 통째로 부재하므로 어떤 단계도 `VALIDATED_LEGACY` 가 아니다. `NOT_APPLICABLE` 11건은 **우선순위 해소 로직 부재**(순서를 매길 대상이 없음), `ABSENT` 4건(Acting Position·Vacation·Out-of-office·Backup Approver)은 **Delegation Type(§8) 자체가 미시드**돼 순위 후보로 등장조차 못 한다(ⓑ §4 전량 ABSENT·`acting`/`vacation`/`backup` grep 오탐만).

## 2. 규칙

- 🔴 **원문 §32 "단, 우선순위가 높아도 Scope, Authority, Eligibility, Legal Entity, Amount, Currency 및 Period 검증을 우회할 수 없다."** — 이 조항은 우선순위 신설 시 **절대 우회 불가 게이트**다. Emergency Delegation 이 1순위여도 Delegate 의 Eligibility(§25·§27)·원본 Authority Scope(§5.2)·Legal Entity 경계(§5.5·§16)·Monetary 상한(§18)·Currency(§19)·Period(§20) 검증을 모두 통과해야 채택된다. 우선순위를 "검증 스킵 패스"로 구현하면 §65 "고액·Payment 위임이 우선순위만으로 승인" gap 을 유발한다.
- 🔴 **우선순위 15단을 상수 배열로 하드코딩하지 마라** — `pm_audit_log.entity_type` ENUM 이 신규 타입 INSERT 예외를 낸 선례(5-3-3-1 §8)를 반복하지 말고 테넌트 오버라이드 가능한 확장 카탈로그로. 특히 Emergency 와 Vacation/OOO 충돌 해소(§34 `EMERGENCY_STANDARD_CONFLICT`·`VACATION_OUT_OF_OFFICE_CONFLICT`)는 우선순위 표만으로 끝나지 않고 Conflict 산출기(§34)가 동반돼야 한다.
- 🔴 **`ABSENT` 4타입(Acting Position/Vacation/OOO/Backup)을 "우선순위 낮음"으로 오독 금지** — 이들은 순위가 낮은 게 아니라 **타입 엔티티 자체가 없어 후보로 존재하지 않는다**. Delegation Type(§8) 신설이 선행돼야 순위표에 등장한다. 우연한 부재를 준수/저순위로 계산 금지(§58 ⑦·⑧ "열거에 없다는 ENUM 실재 확인 후").
- 🔴 **우선순위는 §33 특이성(Specificity)과 동반 구동돼야 한다** — 원문은 우선순위(§32)와 특이성(§33)을 별 축으로 규정한다. 우선순위만으로 승자를 정하면 "가장 넓은 Full Delegation 무조건 선택"(§33 금지)을 유발할 수 있다. Resolution Result(§31) `winning delegation` 은 우선순위+특이성 합성 결과여야 한다.
