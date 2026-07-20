# DSAR — EAGMM Ground-Truth ② Duplicate Implementation Audit (Part 3-28)

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = EAGMM 신설이 기존 스코어링/평가 자산과 중복(엔진 난립)하지 않도록 KEEP_SEPARATE 경계 확정.

## 동음이의(같은 이름·다른 도메인) — 오흡수 금지
| EAGMM 개념 | 코드베이스 동명 자산 | 인용 | 판정 |
|---|---|---|---|
| Score / Scoring | DataTrust·GraphScore·AbTesting 통계 | `DataPlatform.php`·`GraphScore.php`·`AbTesting.php` | KEEP_SEPARATE(데이터/통계 ≠ 거버넌스 성숙도) |
| Drift | 모델 드리프트 | `ModelMonitor` | KEEP_SEPARATE |
| Assessment/Readiness | 컴플라이언스 readiness | `Compliance.php` | 재사용 대상(승격)·단 성숙도 레벨은 순신설 |
| Certification | 채널 인증·kc_cert | `PriceOpt.php`·채널 어댑터 | KEEP_SEPARATE(제품 인증 ≠ ISO/SOC/NIST readiness) |
| Benchmark | (부재) | — | 순신설 |
| Assessment History | 경쟁 스코어 이력 | `docs/COMPETITIVE_SCORE_HISTORY.md` | KEEP_SEPARATE(경쟁 ≠ 거버넌스) |
| Snapshot/Evidence | 메뉴/저니 snapshot | `AdminMenu`·journey_decision_log | KEEP_SEPARATE(★tamper-evident 아님·정본 `SecurityAudit::verify`) |

## 확장 대상(중복 신설 금지·기존 승격)
- Control/Certification Assessment = `Compliance.php` control inventory 승격(중복 대시보드 금지).
- Evidence Integrity = `SecurityAudit::verify` 재사용(신규 해시체인 금지).
- Tenant Isolation = `Db.php` 격리 재사용. Score 변조 차단 = `index.php` RBAC/writeGuard 위에 배치.

## 판정
**중복 위험 중간(스코어링 동명 자산 다수).** 형식 Maturity 엔티티는 grep 0으로 겹치지 않으나, Score/Drift/Certification/Snapshot 동명 자산 7종은 **오흡수 금지**. 실행 시 Compliance·SecurityAudit·Db를 확장하고 새 스코어 엔진/해시체인/격리 엔진을 신설하지 않는다.
