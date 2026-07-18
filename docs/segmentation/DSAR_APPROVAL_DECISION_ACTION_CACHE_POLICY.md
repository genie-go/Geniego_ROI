# DSAR — Action Cache Policy (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§67 `ACTION_CACHE_POLICY` — Capability 캐시 규격(원문 전사).

### Capability Cache Key (전 구성요소 — 원문 전사)
`tenant` · `decision instance / slot` · `actor` · `action definition version` · `decision / sequential state` · `assignment / authority / delegation version` · `reason / comment / attachment / target policy version` · `case / resource version` · `amount` · `currency` · `effective timestamp`.

### 캐시 인식 차원 (Cache-aware, 원문 전사)
- **Tenant-aware** · **Version-aware** · **Actor-aware** · **State-aware** · **Assignment-aware** · **Authority-aware** · **Delegation-aware** · **Action-aware** · **Return-target-aware** · **Resubmission-version-aware**.

### 무효화 (Invalidation)
- **전(全) 이벤트 Invalidation** — Registry/Definition/Version·Policy·Assignment/Authority/Delegation·State·Reason/Comment/Attachment/Target Policy 변경 이벤트 시 즉시 무효화.
- **Critical Conflict 차단** — Conflict(§50) 감지 시 캐시 사용 금지·강제 재평가.

## 2. 기존 구현 대조

- **Capability 캐시 부재 → ABSENT.** 캐시 키의 필수 구성요소인 Capability(§11)·Action Definition Version·Assignment/Authority/Delegation·Return Target·Resubmission Version이 전부 부재하여 캐시할 대상 자체가 없음.
- 결정 액션은 매 요청 직접 `UPDATE SET status`(`Alerting.php:594,653`·`AdminGrowth.php:1330`·`Catalog.php:2383`)로 처리 — 능력 사전평가·캐시 계층 없음.
- 리포 캐시 인프라(예: 데이터 플랫폼/i18n 지연로드)는 존재하나 **결정 액션 능력 캐시로는 no hits**.

## 3. 판정

- Verdict: **ABSENT** (Capability Cache 미구현)
- 선행 의존: 캐시 키 구성요소 대부분이 부재 엔티티(§11 Capability·Version·Assignment/Authority/Delegation) → BLOCKED_PREREQUISITE.
- cover: **0**

## 4. 확장/구현 방향 (설계)

- 순신규: Capability(§11) 신설과 동반해 위 Cache Key 전 구성요소를 포함한 캐시 도입. **부분 키(예: version/actor 누락) 절대 금지** — stale capability는 권한 오판(Fail-open) 위험.
- **전 이벤트 Invalidation** 필수: Policy/State/Assignment/Delegation/Version 변경 시 즉시 무효화. **Critical Conflict(§50) 시 캐시 우회 강제 재평가**(무후퇴·안전측 Fail-closed).
- Golden Rule(Extend): 기존 캐시 인프라(지연로드/데이터 플랫폼)를 재사용하되 결정 액션 능력 캐시는 **단일 키 규격**으로 통일(중복 캐시 엔진 금지).
- 실위험: 캐시 도입 전이라도 능력 재평가 없는 직접 UPDATE는 stale 권한 판정 위험 — Capability 신설이 선행되어야 캐시가 의미를 가짐.

관련: [[DSAR_APPROVAL_DECISION_ACTION_INDEX_PERFORMANCE]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
