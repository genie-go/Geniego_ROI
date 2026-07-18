# DSAR — Error / Warning Contract (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

### §62 ERROR CONTRACT — Error 54코드
순차 승인 상태머신의 표준 에러 코드 집합(총 54코드). 원문 경계:
- 시작: `APPROVAL_SEQUENTIAL_REGISTRY_NOT_FOUND`
- 끝: `APPROVAL_SEQUENTIAL_RUNTIME_BLOCKED`

54코드는 계약상 다음 계층의 실패를 전 구간 커버한다(원문 카테고리): Registry/Policy/Definition/Version Not Found·Inactive·Invalid · Instance Not Found/Initialization Failure · Stage/Level/Step Not Found/Not Ready/Duplicate Active · Previous Not Completed · Missing Completion Event/Snapshot · Assignment/Claim/Authority/Delegation Missing·Invalid · Sequence/Dependency Conflict · Transition Not Defined/Duplicate/Conflict · Guard/Precondition Failed · Lock/Lease/Fencing Stale·Conflict · Idempotency Conflict · Cursor Mismatch · Pause/Suspension/Block Violation · Retry/Recovery Failure · Orphan/Deadlock Detected · Snapshot/Replay/Reconciliation Failure · Cross-Tenant Violation · Runtime Blocked. (개별 54코드 원문 전체 열거는 스펙 §62 정본; 본 문서는 계약 경계·범위만 전사.)

### §63 WARNING CONTRACT — Warning 16코드
비차단 경고(진행은 가능하나 주의/검토 신호):
1. APPROVAL_SEQUENTIAL_OPTIONAL_STEP_WARNING
2. APPROVAL_SEQUENTIAL_OPTIONAL_LEVEL_WARNING
3. APPROVAL_SEQUENTIAL_SKIP_WARNING
4. APPROVAL_SEQUENTIAL_AUTO_SKIP_WARNING
5. APPROVAL_SEQUENTIAL_ASSIGNMENT_WARNING
6. APPROVAL_SEQUENTIAL_AUTHORITY_WARNING
7. APPROVAL_SEQUENTIAL_DELEGATION_WARNING
8. APPROVAL_SEQUENTIAL_LOCK_EXPIRING_WARNING
9. APPROVAL_SEQUENTIAL_LEASE_EXPIRING_WARNING
10. APPROVAL_SEQUENTIAL_CURSOR_DRIFT_WARNING
11. APPROVAL_SEQUENTIAL_ORPHAN_WARNING
12. APPROVAL_SEQUENTIAL_DEADLOCK_WARNING
13. APPROVAL_SEQUENTIAL_RECOVERY_WARNING
14. APPROVAL_SEQUENTIAL_REPLAY_WARNING
15. APPROVAL_SEQUENTIAL_RECONCILIATION_WARNING
16. APPROVAL_SEQUENTIAL_MANUAL_REVIEW_REQUIRED

## 2. 기존 구현 대조

- **미구현**: 이 표준 에러/경고 계약을 방출할 순차 승인 엔진이 없다. 54 에러코드가 지목하는 계층(Registry/Definition/Version/Instance/Stage/Level/Step/Transition/Guard/Lock/Fencing/Cursor/Snapshot/Reconciliation) 대부분이 §GROUND_TRUTH 상 ABSENT — 방출 지점 자체가 없다.
- **실존 오류 반응은 임시(ad-hoc)**: 하드코딩 전이가 내는 유일한 "에러"는 이미처리 시 HTTP 409(admin_growth_approval `AdminGrowth.php:1327`·mapping_change_request 재승인 `Mapping.php:262`) 수준으로, 표준 코드 체계가 아니라 엔드포인트 로컬 응답이다.
- `STALE_FENCING`·`CURSOR_MISMATCH` 계열 에러/경고 = Fencing Token·Cursor 부재(ABSENT)로 방출 불가.
- `AUTHORITY_WARNING`·`DELEGATION_WARNING`·`ASSIGNMENT_WARNING` = 선행 5군(§3.2~3.4) 부재로 판정 대상 없음.
- Warning 계열(Optional/Skip/Orphan/Deadlock/Recovery/Replay/Reconciliation)은 각 기능(§35/36/43/44/42/54/57)이 전부 ABSENT/PARTIAL 이라 경고를 생성할 substrate 없음.

## 3. 판정

- Verdict: **미구현 (ABSENT / BLOCKED_PREREQUISITE)** — 표준 코드 계약만 존재, 방출 엔진 부재
- 선행 의존: 전 계층(Registry~Runtime) 상태머신·Transition·Guard·Fencing·Cursor·Snapshot·탐지기 신설이 선결
- cover: **0** (실존 409 임시응답은 표준 계약 아님 — 계약 커버로 계상하지 않음)

## 4. 확장/구현 방향 (설계)

- **순신규 · 단일 코드 카탈로그**: 54 Error + 16 Warning 을 한 곳(코드 상수/enum)에 정의해 전 API(§68)가 동일 계약으로 방출 — 엔드포인트 로컬 문자열/HTTP 상태 난립 금지.
- **Error=차단 / Warning=비차단 이분법 강제**: Error 54 는 전이 거부(REJECTED/BLOCKED — §20), Warning 16 은 진행 허용 + 신호 기록. `MANUAL_REVIEW_REQUIRED` 는 경고이나 실질 진행 차단으로 취급(BLOCK §40 연결).
- **Fencing/Cursor 에러 최우선 배선**: `STALE_FENCING`·`CURSOR_MISMATCH` 는 §49/§45 신설과 동시에 실장 — 현재 부재가 stale overwrite 실위험(§59).
- **관측성**: 모든 Error/Warning 은 Audit Event(§65)·Evidence(§64)로 lineage 기록. 단 Evidence 에는 §64 저장금지 항목(Credential/PII 등) 배제.
- **BLOCKED_PREREQUISITE**: 선행 5군 + 전 계층 엔진 신설 후.

관련: [[DSAR_APPROVAL_SEQUENTIAL_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_SEQUENTIAL_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
