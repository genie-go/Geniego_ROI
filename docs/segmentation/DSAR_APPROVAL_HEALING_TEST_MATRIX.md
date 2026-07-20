# DSAR — Approval Recovery Test Matrix (Part 3-20 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_TEST_MATRIX

§34는 self-healing 인증에 필요한 **6개 테스트 계열**을 규정한다. 자기치유는 잘못 동작하면 스스로 권한을 변경하는
위험한 능력이므로, 기능·부하·오남용 방어를 회귀로 고정해야 인증된다.

| 계열 | 항목 |
|------|------|
| Unit | Health Assessment · Drift · Recovery Planner · Auto-Remediation · Governance Score |
| Integration | Fabric · Federation · AI Governance · Zero Trust · Compliance · Observability |
| Performance | 100K Health Checks/min · 10K Concurrent Recovery · 1K Regions · 100M Recovery Events |
| Security | Recovery Abuse · Rollback Attack · Fake Recovery Approval · Snapshot Forgery · Cross-Tenant Recovery |
| Compliance | ISO27001 · ISO22301 · SOC2 · NIST 800-53 · CIS |
| Regression | 무후퇴(기존 authz·감사·헬스 표면 불변) |

## 2. Substrate 매핑

| 테스트 계열 | 현존 substrate(라이브 표적/기반) | 상태 |
|-------------|----------------------------------|------|
| Unit(Health/Drift/Planner/Remediation/Score) | self-healing 엔진 (없음) | 미구현 — grep 0 |
| Security · Snapshot Forgery | SecurityAudit verify 재계산(`SecurityAudit.php:56-68`) | 라이브 표적(무결성 검증 실재) |
| Security · Cross-Tenant Recovery | 미들웨어 tenant 강제덮어쓰기(`index.php:610`) | 라이브 표적(격리 실재) |
| Security · Fake Recovery Approval | maker-checker 승인 게이트(`Mapping.php:287`·요청 `Mapping.php:240`) | 라이브 표적(승인 분리 실재) |
| Integration · Compliance | 컴플라이언스 상태(`Compliance.php:53`·`:120`) | 부분 기반(정적 상태) |
| Integration · Observability | health probe(`SystemMetrics.php:60`·`:67-76`)·헬스(`Health.php:99`) | 부분 기반(인프라 관측) |
| Integration · AccessReview 연계 | 접근검토 스냅샷(`AccessReview.php:141-171`·증거 `AccessReview.php:180-242`·`:87`) | 부분 기반 |
| Performance(부하) | 측정 대상 엔진 (없음) | 미구현(§33 RP-track 종속) |

## 3. 설계 계약

- **판정=미구현**: self-healing 엔진 부재로 Unit·Performance 계열은 테스트할 대상이 없다. 다만 **Security 계열
  일부는 라이브 표적이 실재**하므로 해당 시나리오는 기존 방어를 회귀로 고정하는 것부터 시작한다.
- **Snapshot Forgery**: 스냅샷 위조 방어는 SecurityAudit 해시체인 재계산 verify(`SecurityAudit.php:56-68`)를 표적으로
  변조된 recovery 스냅샷이 verify 실패로 거부됨을 검증한다.
- **Cross-Tenant Recovery**: 타 테넌트 recovery 레코드 접근/집행 시도가 미들웨어 격리(`index.php:610`)로 차단됨을
  회귀로 고정한다 — 크로스테넌트 유출은 최상위 취약점이므로 격리 필터 누락은 즉시 실패.
- **Fake Recovery Approval**: 단일 주체가 복원을 자기승인하는 위조가 maker-checker 게이트(`Mapping.php:287`, 요청
  분리 `Mapping.php:240`)로 거부됨을 검증한다 — 요청자≠승인자 분리 강제.
- **Recovery Abuse / Rollback Attack**: self-healing 능력을 악용해 권한 상향/롤백을 유발하는 시나리오. 엔진
  미구현으로 현재는 설계 계약만 — 엔진 신설 시 rate/권한/승인 게이트로 방어.
- **RP-track 조건**: Performance(100K checks/min·10K concurrent·1K regions·100M events)와 Unit 계열은 §33 성능·
  엔진 실구현 이후 RP-track에서 인증. Regression은 기존 authz·감사·헬스 표면 무후퇴를 매 단계 고정.

## 4. KEEP_SEPARATE

- `ModelMonitor.php:221`(ML drift)·`AnomalyDetection.php:49`(데이터 이상탐지) — authz Drift 테스트로 흡수 금지.
- `PgSettlement.php:215`(재무 정산 스냅샷) — Snapshot Forgery 테스트 대상 아님.

## 5. 판정

**미구현** (self-healing 엔진 부재로 Unit·Performance 계열 테스트 대상 없음). 단 Security 계열은 라이브 방어가
표적으로 실재 — Snapshot Forgery=SecurityAudit verify(`SecurityAudit.php:56-68`)·Cross-Tenant=미들웨어 격리
(`index.php:610`)·Fake Approval=maker-checker(`Mapping.php:287`·`:240`). Integration 기반=Compliance
(`Compliance.php:53`)·Observability(`SystemMetrics.php:60`·`Health.php:99`)·AccessReview(`AccessReview.php:141-171`).
Performance/Unit은 §33 RP-track 종속, Regression은 무후퇴 상시 고정. 코드 변경 0 · NOT_CERTIFIED ·
BLOCKED_PREREQUISITE.
