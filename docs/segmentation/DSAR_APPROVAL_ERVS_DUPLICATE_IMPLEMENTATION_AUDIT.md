# DSAR — ERVS Ground-Truth ② Duplicate Implementation Audit (Part 3-29)

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = ERVS 신설이 기존 검증/테스트 자산과 중복(러너 난립)하지 않도록 KEEP_SEPARATE 경계 확정.

## 동음이의(같은 이름·다른 목적) — 오흡수 금지
| ERVS 개념 | 코드베이스 동명 자산 | 인용 | 판정 |
|---|---|---|---|
| Validation / Test | 기능 E2E smoke·계약가드 | `tools/e2e`·`render.mjs` | 재사용(승격)·단 Enterprise Reference conformance는 신설 |
| Security Validator | CI vuln scan(composer audit·CodeQL) | `.github/workflows/security-scan.yml` | KEEP_SEPARATE(report-only CI ≠ Validator 엔진) |
| Runtime Validator | health/metrics probe | `Health.php`·`SystemMetrics.php` | 재사용(승격) |
| Digital Twin Validator | 모델 드리프트 | `ModelMonitor` | KEEP_SEPARATE(ML ≠ Digital Twin) |
| Knowledge Graph Validator | 그래프 스코어 | `GraphScore.php` | KEEP_SEPARATE(마케팅 그래프 ≠ IAM KG) |
| Baseline | sacred SHA baseline·PM baseline | `.githooks/baseline.json`·`PM/Enterprise.php` | KEEP_SEPARATE(로케일 SHA/프로젝트 ≠ Reference Baseline) |
| Evidence/Snapshot | 메뉴/저니 snapshot | `AdminMenu`·journey_decision_log | KEEP_SEPARATE(★tamper-evident 아님·정본 `SecurityAudit::verify`) |

## 확장 대상(중복 신설 금지·기존 승격)
- Runtime/Architecture Validation = E2E smoke(`render.mjs`) 승격(중복 러너 금지·매 배포 실행 규율 유지).
- Static Lint = pre-commit 게이트 확장. Compliance Validator = `Compliance.php` 승격.
- Evidence Integrity = `SecurityAudit::verify` 재사용. Isolation = `Db.php`. Certificate 게이트 = `index.php` RBAC.

## 판정
**중복 위험 중간(검증 동명 자산 다수).** 형식 ERVS 엔티티는 grep 0으로 겹치지 않으나, Validation/Test·Security scan·Runtime probe·Baseline·Snapshot 동명 자산 7종은 **오흡수 금지 또는 승격 구분**. 실행 시 E2E/CI/pre-commit/health/Compliance/SecurityAudit/Db를 확장하고 새 러너/스캐너/해시체인/격리 엔진을 신설하지 않는다.
