# DSAR — Cursor (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §45 CURSOR — 필드
`cursor_id` · `instance_id` · current stage/level/step instance id · current stage/level/step sequence · last completed stage/level/step id · next expected stage/level/step id · `cursor version` · `fencing token` · updated_by transition id · updated_at · immutable previous hash · status · evidence. **★Derived Cache 아니라 Runtime Consistency Contract**(파생 캐시가 아닌 런타임 일관성 계약).

## 2. 기존 구현 대조

- **승인 도메인 Cursor 는 ABSENT.** 승인 Instance 의 현재 Stage/Level/Step 위치를 나타내는 cursor_id·cursor version·fencing token·next expected·immutable previous hash 를 가진 커서 레코드는 존재하지 않는다(다단 Stage/Level/Step 자체가 ABSENT).
- **저니의 current_node 는 마케팅 그래프 커서(KEEP_SEPARATE).** JourneyBuilder 는 journey_enrollments 에 `current_node VARCHAR(80)`(`JourneyBuilder.php:44`)를 두고 그래프 순회 위치를 추적하며, 노드 진행/전환 로직(`JourneyBuilder.php:504`)을 갖는다. 이는 **마케팅 저니 그래프 순회 커서**이지 승인 다단 Stage/Level/Step Cursor 가 아니다 — 승인과 무관하며 **KEEP_SEPARATE**. 단, current_node + resume_at/wait_until + CAS 선점 + 멱등 send-once 를 갖춘 **가장 성숙한 cursor/pause-resume/lease 패턴 참조 정본**이다.
- **cursor version·fencing token 부재.** §45 가 요구하는 cursor version(낙관적 동시성)·fencing token 은 어느 도메인에도 없다(낙관적 version CAS ABSENT·fencing no hits). journey 의 current_node 도 버전/펜싱 없이 CAS WHERE 절로만 보호된다(`JourneyBuilder.php:415-425`).
- **큐 순서는 FIFO 근사.** 잡/아웃박스는 `ORDER BY id ASC`(`Catalog.php:1716`·`Omnichannel.php:405`) FIFO 로 처리 순서를 정할 뿐, 명시 sequence cursor 가 아니다.

## 3. 판정

- Verdict: **ABSENT** — 승인 도메인의 Cursor(current/next expected/version/fencing/previous hash) 없음.
- 선행 의존: 다단 Stage/Level/Step(ABSENT)·Fencing/version CAS(ABSENT) → **BLOCKED_PREREQUISITE**. 저니 current_node(`JourneyBuilder.php:44,504`)는 별 도메인 **KEEP_SEPARATE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규 **Cursor 레코드**: §45 필드 전체(cursor version·fencing token·next expected·immutable previous hash). ★"Derived Cache 아님 = Runtime Consistency Contract" 원칙 준수 — 커서를 진실의 원천으로 삼아 매 Transition 이 cursor version 을 CAS 로 전진(§51 Concurrent Transition Prevention: Unique Current Cursor Constraint).
- 참조 정본: JourneyBuilder 의 current_node + CAS 선점 + pause/resume(`JourneyBuilder.php:44,415-425,504`) 를 **설계 참조**하되 코드 재사용이 아닌 승인 도메인 신설(KEEP_SEPARATE 유지·§67 중복 State Machine 금지).
- 재사용: CAS WHERE 절(`Catalog.php:1726-1730` CANONICAL)을 cursor version 전진의 동시성 primitive 로 채택. ★Fencing Token(§49)·낙관적 version SoT 신설 후에만 Cursor Conflict/Drift 방어가 실효 — 그 전까지 Cursor 미구현이 정직한 상태.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
