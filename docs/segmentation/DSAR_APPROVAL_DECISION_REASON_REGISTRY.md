# DSAR — Approval Decision Reason Registry (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§35 REASON_REGISTRY 필수 필드:
- `registry_id` · `tenant_id` · `code` · `name`
- `approval domain`
- `supported action types`
- `localization support` · `hierarchy support` · `customer extension support`
- `owner` · `active_version` · `valid_from` / `valid_to`
- `status` · `evidence`

(핵심: 사유는 정본 등록소에 코드로 선언·테넌트 격리·액션 타입/도메인 스코프·버전 관리. 자유텍스트 사유는 Registry 부재의 증상.)

## 2. 기존 구현 대조

- 사유 정본 등록소(`registry_id`/`code`/`name`/`approval domain`/`supported action types`)를 선언하는 자산 → **no hits**.
- 실존하는 "사유"는 전부 정규화되지 않은 값 저장뿐:
  - 반품 사유 = 자유텍스트 컬럼 `reason TEXT NOT NULL DEFAULT ''`(`Handlers/ReturnsPortal.php:36`) · 조회/기록(`ReturnsPortal.php:324`). 코드 taxonomy·enum·FK 없음.
  - 결정 사유 = `Mapping` note 자유텍스트, `AdminGrowth::approvalDecide` 거절 시 사유 미입력(`Handlers/AdminGrowth.php:1319-1331`).
- `reason_code`·`rejection_reason` 컬럼/enum → 전 도메인 부재(GROUND_TRUTH: Reason=ABSENT).
- `localization`/`hierarchy`/`customer extension`/`active_version` = 사유에 대한 개념 자체가 없음(등록소 부재이므로 그 하위 속성도 부재).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §7 Action Registry(ABSENT — Registry는 그 `reason registry reference`의 피참조 대상) · §3.1 Decision Core(ABSENT — Reason Snapshot 결합 대상 불변 Record 부재) → **BLOCKED_PREREQUISITE**.
- cover: **0** (자유텍스트 `ReturnsPortal.php:36`은 값 저장일 뿐 등록소가 아님).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_decision_reason_registry` — `registry_id`/`tenant_id`/`code`/`approval domain`/`supported action types`/`active_version`를 데이터로 선언. 테넌트 격리 필수(재사용: Tenant Guard `index.php:404-420`).
- 무후퇴: `ReturnsPortal.php:36`의 자유텍스트 `reason`는 삭제하지 않고 **Registry 코드로 승격 매핑**(레거시 값 보존 + `reason_code` FK 병행). Golden Rule = Extend.
- Registry는 §36 Reason Definition·§37 Reason Version·§38 Applicability의 상위 컨테이너 — 본 등록소 없이 하위 3엔티티 구현 금지(고아 방지).
- `supported action types`는 §11 Action Type(PARTIAL)과 결합 — REJECT/RETURN/REQUEST_CHANGES/CANCEL/WITHDRAW별 허용 사유 집합을 등록소 레벨에서 스코프.
- 실위험: 등록소 없이 사유를 자유텍스트로 유지하면 §58 Critical Gap(Reason 누락·Applicability 미검증) — 잘못된 Action에 임의 사유 문자열이 결합되어 감사/화해(§55) 불가.

관련: [[DSAR_APPROVAL_DECISION_ACTION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
