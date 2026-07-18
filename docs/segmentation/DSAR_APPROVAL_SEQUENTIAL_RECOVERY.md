# DSAR — Recovery (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §42 RECOVERY — 대상 / 원칙
- **대상**: Orphan Step · Missing Assignment · Expired Lease · Stale Lock · Unprocessed Event · Transition Pending Timeout · Cursor Drift · Snapshot Missing · Assignment/External Workflow Drift · Dead-letter.
- **★원칙**: 상태 임의 덮어쓰기 금지 · **Recovery Transition 을 생성**해 복구(감사 가능·재생 가능).

## 2. 기존 구현 대조

- **잡 도메인의 stale 회수 = PARTIAL.** 크래시 워커가 남긴 stale 'processing' 잡을 시간 기준으로 'queued' 로 되돌리는 하우스키핑이 존재한다: `UPDATE catalog_writeback_job SET status='queued' ... WHERE status='processing' AND updated_at < (now-600s)`(`Catalog.php:1700`). 이는 §42 의 "Stale Lock/Expired Lease → 재소비" 를 잡 도메인에서 실현한다.
- **그러나 §42 계약의 핵심 부재**:
  - **Recovery Transition 개념 없음.** 회수는 **상태 문자열 직접 덮어쓰기**(`status='processing'` → `status='queued'`)로 수행된다 — 이는 §42 ★"상태 임의 덮어쓰기 금지 · Recovery Transition 생성" 원칙과 정면으로 어긋난다. 복구 사실을 별도 Recovery Transition/Snapshot 으로 남기지 않아 재생·감사가 불가능하다.
  - **대상 다양성 없음.** Orphan Step·Missing Assignment·Cursor Drift·Snapshot Missing·Transition Pending Timeout 은 다단/Assignment/Cursor/Snapshot 자체가 ABSENT 이라 회수 대상이 되지 못한다. 실존 회수는 오직 시간 초과 stale 'processing' 잡뿐.
  - **Dead-letter replay 는 별개(KEEP_SEPARATE).** DLQ replay(`routes.php:1927-1932`)는 데드레터 적재이지 리플레이가 아니다.
- **선행 SoT 부재.** `Missing Assignment` 복구는 Assignment(§3.4 ABSENT)·`Expired Lease` 는 Lease SoT(리스토큰 없음) 없이 성립 불가.

## 3. 판정

- Verdict: **PARTIAL** — 시간초과 stale 'processing' 잡 회수(`Catalog.php:1700`)만 존재. **Recovery Transition 개념·Snapshot·다양한 복구 대상·감사가능 복구** 전무.
- 선행 의존: Assignment(§3.4)·Lease/Fencing SoT 부재로 대부분 복구 대상 **BLOCKED_PREREQUISITE**.
- cover: 부분(stale 잡 회수 1종) · 나머지 0

## 4. 확장/구현 방향 (설계)

- ★핵심 교정: 현행 stale 회수(`Catalog.php:1700`)의 상태 직접 덮어쓰기를 **Recovery Transition + Recovery Snapshot** 경유로 승격(§52 Snapshot: 과거 대체 금지·Immutable Hash·Replay 기준). 복구 사실이 감사·재생 가능해야 §42 ★원칙 충족.
- 재사용: 시간초과 판정 로직(600s TTL, `Catalog.php:1700`)을 Sequential Lease 만료 회수(§47)의 런타임 트리거로 흡수 — 폐기 아닌 확장(§71 무후퇴).
- 순신규 **Recovery 대상 분류기**: Orphan/Missing Assignment/Cursor Drift/Snapshot Missing/Transition Pending Timeout 각각을 Recovery Transition 으로 생성. 이들은 각 선행 SoT(Assignment/Cursor/Snapshot/Lease) 신설 후에만 실효 — 그 전까지 잡 stale 회수만 정직하게 유지.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
