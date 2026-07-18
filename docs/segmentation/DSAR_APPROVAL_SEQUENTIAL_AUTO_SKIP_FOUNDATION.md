# DSAR — Auto Skip Foundation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§36 AUTO_SKIP_FOUNDATION — 자동 Skip 성립 조건:
- 명시적 Policy 존재(암묵 자동 스킵 금지)
- Deterministic(결정론적 판정)
- Not Applicable(대상 아님) 확정
- Optional Scope 에 한함
- Mandatory Financial / Legal / Compliance / Security **아님**
- Skip Snapshot 생성
- Audit 기록
- Downstream 재평가

## 2. 기존 구현 대조

- **Auto Skip(승인) 부재**(§GROUND_TRUTH): §35 Skip Foundation 이 ABSENT 이므로 그 자동화 변형도 당연 ABSENT — Optional Scope·Mandatory 구분·Skip Snapshot 대상 전무.
- **명시적 Policy 부재**(§8): auto-skip 지원 Policy 필드 없음 — "명시적 Policy 존재" 전제 불충족.
- **자동 처리 substrate(승인 아님)**: 자동 조건부 스킵의 유일 유사물은 큐 도메인의 조건부 UPDATE(`Catalog.php` stale 회수 등)나, 이는 재고/발송 처리이지 승인 Optional Skip 이 아님(KEEP_SEPARATE).
- Mandatory Financial/Legal/Compliance/Security 승인 계층 자체가 없어 "그 아님" 판정 대상도 없음.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Skip Foundation(§35)·Skip Policy(§8)·Stage/Level/Step·Dependency(§23·Downstream 재평가) 부재.
- cover: 0

## 4. 확장/구현 방향 (설계)

- 순신규. §35 위에서만 성립 — Optional Scope 로 한정, Mandatory(Financial/Legal/Compliance/Security)는 절대 자동 스킵 금지를 Static Lint(§60)로 강제.
- **Mandatory Control**: Auto-skip 은 반드시 (1) 명시적 Policy version 참조 (2) Deterministic evaluator (3) Skip Snapshot + Audit(§65 SKIPPED·Warning §63 AUTO_SKIP) (4) Downstream Dependency 재평가 — 네 요소 결여 시 §59 Critical Gap(Auto-skip Audit 누락).
- 결정론성: 동일 입력에 동일 스킵 판정을 보장(비결정 자동 스킵 금지) — §67 Duplicate Implementation Audit 의 "Scheduler 자동진행" 리스크 회피.
- 확장 substrate: 없음(순신규).
- **BLOCKED_PREREQUISITE**: 선행 5군 + Skip Foundation 선행 필수.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
