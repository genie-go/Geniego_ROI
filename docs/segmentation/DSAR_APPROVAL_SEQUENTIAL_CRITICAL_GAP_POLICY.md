# DSAR — Critical Gap Policy (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§59 CRITICAL_GAP_POLICY — 순차 승인 상태머신에서 High/Critical 로 취급되는 결함 목록. 아래 조건 중 하나라도 성립하면 자동 진행을 차단하고 Critical Gap 으로 분류한다:

- Sequential Version 없음 (버전 미고정)
- Definition · Runtime 혼합 (정의와 실행 상태 미분리)
- Stage / Level / Step 미구분
- Sequence 중복 (동일 Parent 내 시퀀스 충돌)
- Previous Mandatory 미완료 상태로 진행
- Completion Event / Snapshot 없이 Completed 처리
- Assignment / Authority / Delegation 미검증 Active
- 복수 Active Scope (Multiple Active Stage/Level/Step)
- Transition 없는 상태 변경 (인라인 SET status)
- Idempotency / Lock / Fencing 없음
- stale worker overwrite (오래된 워커의 상태 덮어쓰기)
- Duplicate Completion / Next Step 이중생성
- Pause / Suspension / Block 중 진행
- Mandatory Skip (필수 단계 스킵)
- Auto-skip Audit 누락
- Snapshot 누락
- 과거 상태 재작성 (history rewrite)
- Cursor 불일치
- Transition Pending 정체 (timeout)
- Orphan / Deadlock 미탐지
- Recovery History 덮어쓰기
- Cross-Tenant (테넌트 경계 위반)
- Mandatory Guard 제거
- Workflow Engine 불일치 (이중 진실원)
- Decision Reference 없이 Completion
- Active Version / Snapshot 직접수정

## 2. 기존 구현 대조

이 정책은 "결함이 있으면 차단"하는 게이트이나, **차단을 수행할 상태머신 자체가 없어 목록 상 결함 대부분이 현재 구조적으로 존재하며 미방지 상태**다. §GROUND_TRUTH 대조:

- **Sequential Version 없음** — Version(§10) ABSENT. 실존 status 3종 모두 버전 미고정. → 항시 성립.
- **Definition·Runtime 혼합 / Stage·Level·Step 미구분** — 다단 구조 ABSENT(`current_step/stage/level/step_order/sequence_no` 0 hits). → 항시 성립.
- **Transition 없는 상태 변경** — catalog_writeback_job(`Catalog.php:2397`)·admin_growth_approval(`AdminGrowth.php:1330`)·mapping_change_request 모두 **인라인 SET status 하드코딩**, Transition 정의/기록 없음. → 항시 성립.
- **Completion Event/Snapshot 없이 Completed** — Sequential Event(§18)·Snapshot(§52) ABSENT. status='approved' 만으로 완료 판정. → 항시 성립.
- **Assignment/Authority/Delegation 미검증 Active** — 선행 5군(§3.1~3.4) ABSENT. 검증 대상 실체 없음 → 미검증 진행이 기본값.
- **Idempotency/Lock/Fencing 없음** — Fencing Token ABSENT(`fencing` 0 hits·★실위험), 범용 Idempotency 미들웨어 없음, 낙관적 version CAS ABSENT. → 대부분 미방지.
- **stale worker overwrite** — Transition Lease PARTIAL(claimed_at+TTL만·리스토큰/펜싱 없음 `Omnichannel.php:395-399`·`Catalog.php:1700`) → 펜싱 부재로 stale 커밋 차단 불가.
- **Cross-Tenant** — Tenant Guard 는 PRESENT(`UserAuth.php:403-406`) — 이 한 축만 부분 방지됨.
- **Orphan/Deadlock 미탐지** — 탐지기(§43/§44) ABSENT → 미방지.

즉, 이 §59 목록 항목의 **대부분이 "이미 존재하는 결함이며 자동으로 방지되지 않는다"** — 방지 게이트(State Machine·Transition·Guard·Fencing·Snapshot·Detection)가 선행 부재이기 때문이다.

## 3. 판정

- Verdict: **BLOCKED_PREREQUISITE** (정책 자체 미구현 · 나열된 위험 대부분 현존·미방지)
- 선행 의존: §3.1 Approval Chain · §3.2 Authority · §3.3 Delegation · §3.4 Assignment · State Machine/Transition(§19/20)/Fencing(§49)/Snapshot(§52)/Orphan·Deadlock 탐지(§43/44) 전부 선행 필수
- cover: **0** — Cross-Tenant 1축만 `UserAuth.php:403-406` 로 부분 방지, 나머지 결함은 방지 substrate 부재

## 4. 확장/구현 방향 (설계)

- **정책은 상태머신 신설과 동시에 태어나야 한다**: §59 는 독립 문서가 아니라 State Machine·Transition·Guard·Fencing·Snapshot·Detection 이 실존할 때 그 위에서 강제되는 게이트다.
- ★**현존 결함 명시**: 본 정책이 나열한 위험 대부분은 "미래 위험"이 아니라 **현행 하드코딩 전이 구조에 이미 내재**한다(Version 없음·Transition 없는 SET·Event/Snapshot 없는 Completed·Fencing 없음). 실 엔진 구현 전까지는 승인 도메인에 순차 상태머신을 태우면 안 된다는 **차단 근거**로 사용.
- **Fail Closed 원칙**: 나열된 Critical 조건 성립 시 자동 진행 절대 금지 → BLOCKED(§40) + Manual Review/Recovery(§42) 로만 해소.
- **무후퇴**: 기존 3종 하드코딩 전이는 정책 도입 시 §67 DUPLICATE_IMPLEMENTATION_AUDIT 로 식별해 Canonical 로 통합(CONSOLIDATION), 병렬 진실원 금지.
- **BLOCKED_PREREQUISITE**: 선행 5군 + 상태머신/전이/펜싱/스냅샷/탐지 신설 후 활성.

관련: [[DSAR_APPROVAL_SEQUENTIAL_STATIC_LINT]] · [[DSAR_APPROVAL_SEQUENTIAL_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
