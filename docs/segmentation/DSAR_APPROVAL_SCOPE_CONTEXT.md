# DSAR — Scope Context 승인 (EPIC 06-A-03-02-03-04 Part 3-4 · Scoped Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실구현 후 별도 승인세션
- **불변**: Default Intersection(§9) · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy(§13·D-3) · 반날조(부재 날조·실재 과신 양방향 금지)

---

## 1. 목적

Scope Context(스펙 §8)는 scope 판정 시점의 **런타임 환경**(누가/어느 세션/어느 기기/어느 네트워크/어느 위치/어느 조직/어느 프로젝트/어느 애플리케이션에서 접근하는가)을 Scope Resolution(§10)에 입력으로 제공하는 계층이다. 현재는 계정/테넌트 신원 판정만 있고, Context 자체를 별도 엔티티로 캡처·전달하는 구조는 없다.

## 2. Canonical 필드

스펙 §2 Canonical Entity `APPROVAL_SCOPE_CONTEXT`. Context 축(스펙 §8 원문): User · Session · Device · Network · Location · Organization · Project · Application.

## 3. 열거형 / 타입

Context Axis: USER · SESSION · DEVICE · NETWORK · LOCATION · ORGANIZATION · PROJECT · APPLICATION.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT)

| Context 축 | 판정 | 근거 |
|---|---|---|
| USER | **ABSENT(Context 엔티티로서)·인접 substrate 有** | 인증된 user_id/tenant는 매 요청 재계산되어 effectiveScope 호출부에 암묵 전달(`UserAuth.php:399,401-429`)되지만, "Scope Context"로 별도 캡처·영속되지 않음 — 요청 파라미터일 뿐 Context 엔티티 아님. |
| SESSION | **ABSENT(만료 외)** | 세션 만료(`expires_at`)만 PRESENT(`UserAuth.php:609-611`) · ip/ua는 관측·포렌식 기록만(`UserAuth.php:4243-4268`) · 변경 시 세션무효/재인증 차단 로직 grep 0. |
| DEVICE | **ABSENT** | device_id/trusted_device grep 0(EXISTING_IMPLEMENTATION §7). |
| NETWORK | **ABSENT** | IP/네트워크 접근제어 grep 0 — CORS Origin은 브라우저 검사이지 IP 접근제어 아님(EXISTING_IMPLEMENTATION §7). |
| LOCATION | **ABSENT** | ground-truth 인용 없음(grep 0). |
| ORGANIZATION | **ABSENT(Context로서)·인접 substrate 有** | TEAM_TYPES/ORG_PRESET(`TeamPermissions.php:44-49,706-722`)은 Organization **Scope**(§14) substrate이지 요청시점 **Context** 캡처가 아님. |
| PROJECT | **ABSENT** | PM 게이트는 role rank만(`PM/Shared.php:59-89`)이며 data_scope/effectiveScope 호출 grep 0 — 요청 컨텍스트로서 Project 전달 경로 없음. |
| APPLICATION | **ABSENT** | ground-truth 인용 없음(grep 0). |

## 5. 설계 원칙

- Scope Context는 Resolution(§10) 입력이지 그 자체가 권한 판정이 아님 — 혼동 금지.
- USER/ORGANIZATION은 인접 substrate(인증·team preset)가 있으나 "Context로서 매 요청 캡처·전달"과 "권한 substrate로서 존재"는 별개 — 오승격 금지(실재 과신 회피).
- 신설 시 Context capture는 Effective Scope Engine(§27) 입력 파이프라인으로만 연결 — 별도 저장소 남설 금지.

## 6. Gap / BLOCKED_PREREQUISITE

8축 전부 Scope Context 엔티티로는 ABSENT(순신규). USER/ORGANIZATION/PROJECT/SESSION은 인접 substrate가 있으므로 완전 백지가 아니라 "재배선 대상" — 이 구분을 설계 시 보존해야 한다(부재 과장 회피). BLOCKED_PREREQUISITE: RP-002.
