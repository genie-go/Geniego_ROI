# DSAR — Decision Sequence (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§37 SEQUENCE** — 결정 순번 부여의 불변 규칙.

원문 전사:
- 동일 Instance 내 **Monotonic**.
- 동일 Slot 내 **Commit Sequence Unique**.
- 동일 Step 내 **Single Committed**.
- **History Sequence ≠ Commit Sequence**(사건 순 ≠ 확정 순).
- Parallel = 후속 별도 시퀀스.
- Gap 발생 시 **Reconciliation**(§57).
- **Client 지정 금지** — 서버가 부여.

근거 축: §13 SLOT(Sequential 단일승인=동일 Slot 단일 Committed) · §45 DUPLICATE_PREVENTION(동일 Slot 복수 Committed·동일 Step 이중 차단) · §33 COMMIT(commit sequence 필드).

## 2. 기존 구현 대조

- **결정 시퀀스 개념 부재.** 어떤 핸들러도 서버 부여 monotonic commit sequence를 발급하지 않는다 — 상태는 단일 UPDATE로 뒤집힐 뿐(`Mapping.php:288` · `AdminGrowth.php:1330` · `Alerting.php:594` · `Catalog.php:2397`).
- "동일 Slot 단일 Committed"의 재료인 Slot(§13) 자체가 선행 부재(§3.5 Sequential ABSENT — 하드코딩 status flip `AgencyPortal.php:381,400`). Step/Cursor/Sequential Instance도 부재이므로 "동일 Step Single Committed"를 강제할 축이 없다.
- 부분적 중복 방지 상당물(시퀀스 아님): `AdminGrowth` pending 중복 방지(`AdminGrowth.php:1292`)·이미처리 409(`AdminGrowth.php:1327`) · `Mapping` dedup(`Mapping.php:278`) · `Catalog` CAS-lite `WHERE status`(`Catalog.php:2397`). 이들은 재확정을 부분 차단하나 monotonic 순번·Slot Unique 시퀀스가 아니다.
- commit sequence · decision round · Gap 탐지(Reconciliation) — **grep 없음(no hits)**.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §3.5 Sequential(가장 치명적 — 하드코딩 status flip) · §13 Slot · §35 Record — 순번을 부여·유일화할 Slot·Record·Step이 선행 부재 → **BLOCKED_PREREQUISITE**.
- cover: 0

## 4. 확장/구현 방향 (설계)

- Decision Sequence는 §33 Commit 트랜잭션 내에서 **서버가 부여**하는 monotonic 순번으로 신설(Client 지정 금지 — §37). 동일 Slot Commit Sequence Unique 제약을 DB UNIQUE로 강제해 §45 "동일 Slot 복수 Committed"를 원천 차단 — 이는 §13 Slot Key(tenant·case·requirement·sequential/step instance) 신설이 선행이다.
- 재사용: `Catalog` CAS-lite `WHERE status`(`Catalog.php:2397`)·`AdminGrowth` 409(`AdminGrowth.php:1327`)의 재확정 차단 의도를 Slot Unique·Single Committed 제약으로 승격(Extend). Paddle UNIQUE(notification_id) 멱등(`Paddle.php:343-368`)은 "동일 key 단일 결과"의 DB 제약 선례(VALIDATED_LEGACY).
- **Mandatory Control**: History Sequence(사건 순)와 Commit Sequence(확정 순)를 별개 축으로 유지(§36·§37). Parallel 결정은 후속 별도 시퀀스로 분기. Sequence Gap은 §57 Reconciliation이 탐지·Manual Review로 에스컬레이션(자동 재작성 금지).
- **실위험**: 시퀀스 부재 = 동일 Slot에 복수 Committed가 들어와도 탐지 불가. 무트랜잭션 UPDATE(`Mapping.php:288`)와 결합 시 동시 승인이 각각 "확정"되어 정족수·단일승인 불변식이 조용히 깨진다. 서버 부여 monotonic 시퀀스 + Slot Unique가 이 결함의 구조적 봉인이다.
- 실 구현 = 별도 승인 세션. 본 문서는 코드 변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
