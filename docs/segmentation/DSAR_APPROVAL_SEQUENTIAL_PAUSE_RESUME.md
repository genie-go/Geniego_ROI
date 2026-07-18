# DSAR — Pause / Resume (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§37 PAUSE — Pause 중 계약:
- Pause 중 Activation / Next Resolution **금지**
- Assignment / Claim / Lease 유지(Policy 에 따름)
- Decision 기본 금지
- Snapshot(PAUSE §52) 생성
- Audit 기록

§38 RESUME — Resume 재검증:
- 현재 상태가 Pause 상태여야 함
- Version Active
- Current(Stage/Level/Step) 유효
- Assignment / Authority / Delegation / Claim / Lease 유효
- Cursor 일치
- Drift / Deadlock 없음
- Lock 획득 / Fencing Token 최신

## 2. 기존 구현 대조

- **승인 Pause/Resume 부재**(§GROUND_TRUTH): 승인 Instance 를 Pause 하고 Activation/Next Resolution 을 차단하는 자산 없음 — Stage/Level/Step·Cursor 자체가 ABSENT.
- **★PARTIAL — 저니 resume_at/waiting(KEEP_SEPARATE)**: JourneyBuilder 는 delay 노드에서 `resume_at`/`wait_until` 설정 후 waiting 상태로 두고 cron 이 픽업해 재개(`JourneyBuilder.php:403`·상태 `:82`). 이는 **마케팅 저니 일시정지/재개**의 성숙한 패턴이나 **승인 Pause 가 아님**(KEEP_SEPARATE). 재개 시 §38 이 요구하는 Assignment/Authority/Delegation/Claim/Lease/Cursor 재검증·Drift/Deadlock 검사는 없음(저니엔 그 개념 부재).
- **Resume 재검증 요소 부재**: Assignment(§3.4)·Authority(§3.2)·Delegation(§3.3) ABSENT → 재개 시 유효성 재검증 대상 없음. Cursor(§45)·Fencing(§49) ABSENT → Cursor 일치·Fencing 최신 검증 불가. Drift(§57)·Deadlock(§44) 탐지 자산 없음.
- Lease 는 시간기반 회수만 PARTIAL(`JourneyBuilder.php:396` 1800s·`Omnichannel.php:395-399` 900s·`Catalog.php:1700` 600s) — 리스토큰/펜싱 없음.

## 3. 판정

- Verdict: **PARTIAL**
- 선행 의존: 승인 Pause/Resume 실체는 ABSENT. Resume 재검증(Assignment/Authority/Delegation/Cursor/Fencing/Drift/Deadlock) 전부 선행 5군·Cursor·Fencing 부재에 막힘(BLOCKED_PREREQUISITE).
- cover: 승인 도메인 0. 인접 substrate = JourneyBuilder resume_at/waiting(`JourneyBuilder.php:403,82,396`) — **KEEP_SEPARATE**(마케팅 저니·승인 무관·패턴 참조정본).

## 4. 확장/구현 방향 (설계)

- 순신규(승인). Pause/Resume 는 Instance/Stage/Level/Step 상태(§11~§16 PAUSED/PAUSE_PENDING/RESUME_PENDING) + Cursor 위에서만 성립.
- **Mandatory Control**: Pause 중 Activation·Next Resolution·Decision 을 Runtime Guard(§61)에서 Fail-Closed 차단(NOT_PAUSED 가드 §21). Resume 은 §38 전 재검증을 통과해야만 — 특히 Pause 기간 중 만료된 Authority/Delegation·회수된 Assignment 를 재검증으로 걸러 무후퇴 보장.
- 확장 substrate: JourneyBuilder 의 resume_at→cron 픽업 + 원자적 선점 CAS(`:415-425`) 패턴을 **참조 정본**으로 인용하되, 승인 Resume 재검증 로직(Assignment/Authority/Delegation/Cursor/Fencing/Drift/Deadlock)은 순신규. 저니 코드 재사용 아님(KEEP_SEPARATE).
- **★실위험**: Fencing Token 부재 → Pause 중 지연된 worker 가 Resume 후 stale 상태로 커밋할 창. Resume 은 Fencing Token 최신 검증 하에 둘 것.
- Lease 는 무기한 금지(§47) — Pause 중 Claim/Lease 유지 Policy 에 heartbeat/최대 갱신 상한 명시.
- **BLOCKED_PREREQUISITE**: 선행 5군 + Cursor/Fencing 신설 전 승인 Pause/Resume 실 구현 불가.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
