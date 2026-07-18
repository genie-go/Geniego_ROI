# DSAR — Action Idempotency (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§51 ACTION_IDEMPOTENCY

- **Idempotency Key 구성요소**: `tenant` · `decision slot` · `decision round` · `action type` · `actor` · `target` · `reason version` · `comment hash` · `attachment manifest hash` · `change request hash` · `resubmission package hash`.
- **규칙**:
  - ★ 동일 key + 동일 hash = **저장된 결과 반환**(재집행 금지).
  - ★ 동일 key + 다른 hash = **Conflict**(§50 로 위임).

## 2. 기존 구현 대조

- 코드 기반 판정으로 **부분 실재(PARTIAL)** — 재승인/중복처리를 막는 상태 게이트가 있으나, §51 Idempotency Key(다차원 조합)·hash 비교·"저장된 결과 반환" 시맨틱은 부재.
- 실존(상태 기반 재처리 차단):
  - `Mapping::approve`: 처리된 건 승인 누적 금지 — `Handlers/Mapping.php:262`(`status !== "pending"` → 409). approved 재승인·applied 후 승인 차단.
  - `AdminGrowth::approvalDecide`: `Handlers/AdminGrowth.php:1327`(`status !== 'pending'` → 409, "이미 처리된 항목입니다").
- 부재/미구현:
  - 다차원 **Idempotency Key**(tenant·slot·round·action type·actor·target·reason version·comment/attachment/change-request/resubmission hash) 를 계산·저장·조회하는 구조 → **no hits**. 현행은 `status` 단일 컬럼의 pending 여부만 검사.
  - **동일 key + 동일 hash → 저장된 결과 반환**(idempotent replay)이 아니라, 재요청은 무조건 409 거부. 즉 안전하지만 idempotent가 아님(재시도가 최초 결과를 재현하지 않음).
  - **동일 key + 다른 hash → Conflict**(§50) 경로 부재 — hash를 계산·비교하지 않으므로 payload 변조 재요청도 status 게이트만 통과하면 동일하게 409.
  - `decision round`(재제출 라운드)·`reason version`·`attachment manifest hash` 개념 자체 부재(§3.1 Decision Core·Snapshot 부재에 종속).

## 3. 판정

- Verdict: **PARTIAL** (상태 기반 중복차단 실재 · Idempotency Key/hash/replay 부재)
- 선행 의존: §51 Key는 `decision round`(재제출)·`reason version`·`attachment manifest hash`·`resubmission package hash` 를 요구 — 각각 §3.1 Decision Core·§37 Reason Version·§42 Attachment Manifest·§30 Resubmission Package(전부 ABSENT)에 종속. 현행 `pending` 게이트만 유효.
- cover: **2개소 상태 게이트 존재**(`Mapping.php:262` · `AdminGrowth.php:1327`) · **Key/hash/replay = 0**.

## 4. 확장/구현 방향 (설계)

- 확장 기반(Golden Rule = Extend): 두 상태 게이트(`Mapping.php:262` · `AdminGrowth.php:1327`)를 **Idempotency 판정의 최소 baseline**으로 승격. 클라이언트 `Idempotency-Key` 헤더 + 서버측 §51 조합키 저장(`approval_decision_action_idempotency`)로 확장.
- 시맨틱 정정(Mandatory): 동일 key + 동일 hash 는 409가 아니라 **최초 결과 반환**(idempotent replay)이어야 재시도 안전성을 만족. 현행 무조건 409는 네트워크 재시도 시 사용자에게 오류로 오인됨.
- Conflict 연동: 동일 key + **다른 hash**는 반드시 §50 `ACTION_CONFLICT`(hash 불일치 = payload 변조/경합)로 라우팅 — hash 미계산 상태에서는 이 구분이 불가능하므로 comment/attachment/reason/change-request hash 산출이 선행 필수.
- 무후퇴: 기존 `pending` 게이트를 제거하지 말 것(§68 Regression Gate) — Idempotency 레이어를 **위에** 얹고, 게이트는 하위 안전망으로 유지.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
