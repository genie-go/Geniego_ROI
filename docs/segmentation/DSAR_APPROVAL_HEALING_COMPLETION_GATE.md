# DSAR — Approval Recovery Completion Gate (Part 3-20 §35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_COMPLETION_GATE

§35는 Part 3-20 전체가 "완료(certified)"로 판정되기 위한 **구축 항목 + 검증 100% 조건**을 규정한다. self-healing은
스스로 권한을 바꾸는 능력이므로, 아래 17개 컴포넌트가 전부 구축되고 성능·자기치유 검증·회귀가 100% 통과해야만
인증된다.

| 구분 | 게이트 항목 |
|------|-------------|
| 엔진 컴포넌트 | Self-Healing Registry · Health Assessment · Continuous Governance · Drift Detection · Auto-Remediation · Recovery Planner · Config Healing · Integrity Validator · Compliance Recovery · AI Recovery Advisor · Recovery Workflow · Snapshot · Evidence · Digest · Analytics · Guard · Lint |
| 검증 100% | Performance(§33) · Self-Healing Validation(§34) · Regression(무후퇴) |

## 2. Substrate 매핑

| 게이트 항목 | 현존 substrate(확장 기반) | 상태 |
|-------------|---------------------------|------|
| Health Assessment | 인프라 health probe(`SystemMetrics.php:60`·`:67-76`) | 기반만(인프라·authz 아님) |
| Integrity Validator · Digest · Evidence · Snapshot | SecurityAudit 해시체인·verify(`SecurityAudit.php:14-68`·`:56-68`·시드 `:8`) | 확장 기반 |
| Compliance Recovery | 컴플라이언스 상태(`Compliance.php:53`·`:120`) | 부분 기반 |
| Recovery Planner(rollback 요소) | schema rollback(`Migrate.php:310`) | 부분 기반(스키마 한정) |
| Guard(승인 게이트) | maker-checker(`Mapping.php:287`) | 확장 기반 |
| Continuous Governance(주기 검토) | AccessReview(`AccessReview.php:87`·`:141-171`·`:180-242`) | 부분 기반 |
| Registry/Drift/Auto-Remediation/Config Healing/AI Advisor/Workflow/Analytics/Lint | (없음) | ABSENT — grep 0 |

## 3. 설계 계약

- **판정=미충족**: 17개 컴포넌트 중 대부분(Registry·Drift·Auto-Remediation·Config Healing·AI Recovery Advisor·
  Recovery Workflow·Recovery Planner·Analytics·Lint)이 ABSENT이며, SystemMetrics(health probe)·SecurityAudit
  (무결성/증거)·maker-checker(guard)·AccessReview(주기 검토)·Compliance만이 **확장 기반**으로 존재한다.
- **확장 기반 4종의 역할**: ① Integrity Validator/Digest/Evidence/Snapshot = SecurityAudit 해시체인
  (`SecurityAudit.php:14-68`·`:56-68`) 확장 ② Guard = maker-checker(`Mapping.php:287`) 확장 ③ Continuous Governance
  = AccessReview(`AccessReview.php:141-171`) 확장 ④ Health Assessment 관측 = SystemMetrics(`SystemMetrics.php:60`).
  이들은 재정의·개명 없이 신규 recovery 타입만 추가하는 방식으로 확장한다.
- **선행 인증 종속**: 본 게이트는 Part 1~3-19 전 파트가 인증(certified)된 이후에만 평가 가능하다. self-healing은
  effective role resolution·permission·approval workflow가 정본으로 확립된 위에서만 안전하게 작동한다.
- **검증 100% 조건**: Performance(§33 P1~P6 예산)·Self-Healing Validation(§34 Security/Integration 시나리오)·
  Regression(기존 authz·감사·헬스 표면 무후퇴)이 전부 통과해야 게이트 개방. 하나라도 미달이면 NOT_CERTIFIED 유지.
- **Tenant 격리 무후퇴 절대**: 모든 게이트 항목은 미들웨어 격리(`index.php:610`)를 상속하며, 격리 완화는 어느
  단계에서도 게이트 실패 사유다.

## 4. KEEP_SEPARATE

- `ModelMonitor.php:221`(ML drift)·`AnomalyDetection.php:49`(데이터 이상탐지)·`PgSettlement.php:215`(재무 정산) —
  authz self-healing 컴포넌트로 흡수·재사용 금지. 도메인 상이·별개 관심사.

## 5. 판정

**미충족** (17개 컴포넌트 대부분 ABSENT·grep 0). 확장 기반=SecurityAudit 해시체인/verify(`SecurityAudit.php:8`·
`:14-68`·`:56-68`)·SystemMetrics health(`SystemMetrics.php:60`·`:67-76`)·maker-checker guard(`Mapping.php:287`)·
AccessReview 주기검토(`AccessReview.php:87`·`:141-171`·`:180-242`)·Compliance(`Compliance.php:53`·`:120`)·schema
rollback(`Migrate.php:310`)뿐. Registry/Drift/Auto-Remediation/Config Healing/AI Advisor/Workflow/Analytics/Lint은
순신설. 완료=전 컴포넌트 구축 + Performance/Self-Healing Validation/Regression 100% + 선행 Part1~3-19 인증. 코드
변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE.
