# DSAR — Runtime Guards (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§61 RUNTIME_GUARDS — 전이 실행 **시점**에 런타임으로 차단해야 하는 조건 목록(요청/전이 처리 게이트):

- Instance Not Found (인스턴스 부재)
- Version Inactive (비활성 버전 전이 시도)
- Previous 미완료 (이전 Mandatory Stage/Level/Step 미완료 상태 진행)
- Assignment 누락 (assignment required 인데 실체 없음)
- Authority / Delegation 무효 (권한/위임 미해결·만료)
- Duplicate Active (복수 Active Scope)
- Stale Fencing (낮은 Fencing Token 커밋 시도)
- Cursor Mismatch (Cursor Version 불일치)
- Pause / Suspension / Block 중 진행
- Deadlock / Orphan (탐지 시 차단)
- Snapshot 오류 (Snapshot 생성 실패 시 전이 중단)
- Kill Switch (긴급 전역 차단)

## 2. 기존 구현 대조

대부분 **미구현**. 런타임 가드가 검사할 전이 파이프라인(전이 실행 진입점)이 승인 도메인에 없다. 다만 일부 인접 substrate 는 부분 실재한다:

- **Tenant 격리 = PARTIAL(실재)**: 테넌트 경계 Guard 는 `UserAuth.php:403-406` 로 실존한다 — §61 의 Cross-Tenant/테넌트 일치 검사에 대응하는 유일한 부분 실재 축.
- **requirePro / 플랜 게이트 = 부분 실재**: 플랜 등급 기반 접근 차단(requirePro 류)이 일부 실재하나, 이는 승인 순차 전이의 런타임 가드가 아니라 **기능 접근 권한 게이트**로 성격이 다르다(§61 Authority/Delegation 무효 검사와 동일 아님).
- **Instance Not Found / Version Inactive / Previous 미완료 / Cursor Mismatch / Duplicate Active** = ABSENT: Instance(§11)·Version(§10)·Cursor(§45)·다단 구조가 부재하므로 검사 대상 자체가 없다.
- **Assignment / Authority / Delegation 무효** = ABSENT: 선행 5군(§3.1~3.4) 부재 — 무효 판정할 실체 없음.
- **Stale Fencing** = ABSENT(★실위험): Fencing Token 0 hits(`fencing` no hits). 낮은 토큰 커밋을 차단할 수단 없음. Transition Lease 는 PARTIAL(claimed_at+TTL 시간회수만 — `Omnichannel.php:395-399`·`Catalog.php:1700`·`JourneyBuilder.php:396`)이라 stale 커밋을 **막지 못한다**.
- **Duplicate Active 차단 primitive** = 인접 CAS/SKIP LOCKED 는 실존(`Catalog.php:1726-1730`·`Omnichannel.php:405`)하나 이는 큐 잡/저니 선점용이지 승인 다단 Active 유일성 강제가 아니다.
- **Deadlock / Orphan / Kill Switch** = ABSENT: 탐지기(§43/44)·전역 스위치 부재.

## 3. 판정

- Verdict: **미구현 (대부분 ABSENT · Tenant 격리 1축 + requirePro 플랜게이트만 부분 실재)**
- 선행 의존: Instance(§11)·Version(§10)·Cursor(§45)·Fencing(§49)·Assignment/Authority/Delegation(§3.2~3.4)·Orphan/Deadlock 탐지(§43/44) 선행 필수
- cover: **부분** — 테넌트 격리 `UserAuth.php:403-406` 실재, requirePro 플랜 게이트 부분 실재. 그 외 런타임 가드 축 = 0

## 4. 확장/구현 방향 (설계)

- **순신규(전이 파이프라인 게이트)**. 런타임 가드는 Transition Instance(§20) 실행 진입점에 강제되며, 그 진입점이 없으면 붙을 자리가 없다.
- **Tenant Guard 재사용**: 실재하는 `UserAuth.php:403-406` 테넌트 격리를 Cross-Tenant 가드의 substrate 로 **확장 재사용**(Golden Rule: Replace 아님·Extend). requirePro 플랜 게이트는 접근 계층으로 유지하되 승인 Authority(§3.2)와 혼동 금지 — 별 개념.
- ★**Fencing 최우선**: Stale Fencing 가드는 Fencing Token(§49) 신설을 전제 — 현재 부재는 stale worker overwrite(§59)의 직접 실위험이므로 실 엔진 착수 시 최우선 신설.
- **Fail Closed**: 모든 Mandatory 런타임 가드는 실패 시 전이 거부(REJECTED/BLOCKED — §20 TRANSITION_RESULT), 통과 못한 상태로 진행 절대 금지.
- **Kill Switch**: 전역 긴급 차단은 Suspension(§39) SYSTEM_FAILURE/AUDIT_HOLD 경로로 구현.
- **정적/런타임 이중 방어**: §60(배포 전 정의 검사) + §61(전이 시점 검사) 병행 — 한쪽만으로 불충분.
- **BLOCKED_PREREQUISITE**: 선행 5군 + Transition/Cursor/Fencing 신설 후.

관련: [[DSAR_APPROVAL_SEQUENTIAL_STATIC_LINT]] · [[DSAR_APPROVAL_SEQUENTIAL_CRITICAL_GAP_POLICY]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
