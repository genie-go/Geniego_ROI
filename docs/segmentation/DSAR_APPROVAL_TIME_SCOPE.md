# DSAR — Time Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-4)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **스펙 근거**: [`EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC.md) §21 Time Scope(Date · Time · Weekday · Shift · Holiday)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실구현 후 별도 승인세션.
- **불변**: Default Intersection(§9 Scope Policy 기본) · envLabel≠Scope(배포라벨을 데이터 scope로 오분류 금지) · 반날조(부재 날조·실재 과신 양방향 금지) · 289차 P1~P4 재플래그 금지.

---

## 1. 목적

**접근 시각(Date/Time/Weekday/Shift/Holiday)에 따른 접근범위 제한**을 정형화한다. Role Assignment/Scope가 유효하더라도 특정 시간창(업무시간·교대·휴일) 밖에서는 접근을 차단하는 시간 게이트를 신설 설계한다. 순신규 엔티티(Part 2 Permission Engine의 Time Scope와 유사 계열이나 본 Part는 **Scope 계층**, Part 2는 **Permission grant 계층**으로 별개).

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `time_scope_code` | Time Scope 식별자 |
| `date_range` | 유효 날짜 구간 |
| `time_window` | 허용 시각 구간(시:분) |
| `allowed_weekdays` | 허용 요일 집합 |
| `shift_ref` | 교대(Shift) 참조 |
| `holiday_calendar_ref` | 휴일 캘린더 참조(휴일 접근 차단/허용) |
| `timezone` | 명시 timezone(IANA) — 서버 local time 암묵 의존 금지 |

## 3. 열거형 / 타입

- **time_unit**: `DATE` · `TIME` · `WEEKDAY` · `SHIFT` · `HOLIDAY`(스펙 §21 열거 그대로).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Date/Time/Weekday/Shift/Holiday 접근범위 게이트 | — | **ABSENT** | grep 0 — EXISTING §7 "Time: 접근제어용 부재(grep 0)" |
| 오탐 배제 대상(FP) | `Attribution.php:444` `time_window` | **FP(배제·별개 개념)** | EXISTING §7 "Attribution.php:444 time_window=마케팅 어트리뷰션 FP·배제" — 마케팅 전환 귀속 시간창이지 접근제어 시간 scope 아님 |
| 세션 만료(인접·부재) | `expires_at` | **PARTIAL(인접이나 접근시간창 아님)** | `UserAuth.php:609-611` — 세션 유효기간이지 "업무시간/교대/휴일" 게이트 아님 |

★`Attribution.php:444`의 `time_window`은 마케팅 어트리뷰션(전환 귀속 윈도우) 필드로, 접근제어(Access Control) 목적의 Time Scope와 이름만 같을 뿐 무관하다(EXISTING §7 명시 FP 배제) — Time Scope 설계 시 이를 substrate로 흡수하지 않는다.

## 5. 설계 원칙

- Time Scope는 세션 만료(`expires_at`)와 별개 계층으로 신설 — 세션은 "언제까지 유효한 토큰인가", Time Scope는 "지금 이 시각에 이 접근이 허용되는가"로 목적이 다름(교집합 적용 시 Default Intersection).
- `holiday_calendar_ref`·`shift_ref`는 조직/지역별 상이할 수 있으므로 Canonical Calendar Registry(순신규)를 참조 — 하드코딩 휴일표 금지.
- 마케팅 Attribution의 time_window과 접근제어 Time Scope는 네이밍이 겹치더라도 물리적으로 분리 유지(오분류 방지).
- timezone 명시 필수(서버 local time 암묵 의존 금지) — Part 2 Permission Time Scope(`DSAR_APPROVAL_PERMISSION_TIME_SCOPE`)와 동일 원칙 재사용, 단 엔티티는 분리(중복 스케줄러/시간엔진 신설 금지, 공통 timezone 유틸만 공유).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 전 필드 순신규 ABSENT — 접근제어용 시간 게이트 자체가 부재. 세션 만료만 인접 PARTIAL.
- **BLOCKED_PREREQUISITE**: Canonical Scope Registry 통합 및 선행 Permission/Role 계열 실구현 후 — **RP-002**.
- 289차 P1~P4 재플래그 금지.
