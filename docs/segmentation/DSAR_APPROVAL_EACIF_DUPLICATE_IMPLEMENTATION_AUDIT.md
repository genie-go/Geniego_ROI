# DSAR — EACIF Ground-Truth ② Duplicate Implementation Audit (Part 3-32)

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = EACIF 신설이 기존 실험/승인/게이트 자산과 중복(엔진 난립)하지 않도록 KEEP_SEPARATE·재사용 경계 확정.

## 동음이의(같은 이름·다른 목적) — 오흡수 vs 재사용 구분
| EACIF 개념 | 코드베이스 자산 | 인용 | 판정 |
|---|---|---|---|
| Experimentation / A-B | 베이지안 A/B 엔진 | `AbTesting.php` | ★재사용(공용 엔진·중복 신설 절대 금지) |
| Tenant Pilot | onsite CRO·웹팝업 A/B | `Onsite.php`·`WebPopupCampaign.php` | 재사용(Pilot substrate) |
| Approval Workflow | pending_approval·maker-checker·high_value | `Catalog.php`·`Alerting.php` | 재사용(Innovation 승인단계 확장) |
| Feature Flag | plan 게이트·IS_DEMO | `PlanPolicy.php` | 재사용(형식 Governance 신설) |
| Innovation Decision | AutoRecommend·Decisioning | `AutoRecommend.php`·`Decisioning.php` | KEEP_SEPARATE(마케팅 의사결정 ≠ Innovation Decision) |
| Innovation ROI/KPI | 비즈니스 ROI·마케팅 KPI | `Pnl.php`·마케팅 대시보드 | KEEP_SEPARATE(비즈니스 ≠ Innovation KPI) |
| Drift | ModelMonitor | `ModelMonitor` | KEEP_SEPARATE |
| Rollout(Canary/BG) | 죽은 terraform blue-green | `infra/aws/terraform/*` | KEEP_SEPARATE(★default off·PRESENT 오판 금지) |
| Evidence/Snapshot | 메뉴/저니 snapshot | `AdminMenu`·journey_decision_log | KEEP_SEPARATE(★정본 `SecurityAudit::verify`) |

## 확장 대상(중복 신설 금지·기존 승격)
- ★Experimentation = `AbTesting` 베이지안 엔진 공용 재사용(플랫폼 실험도 동일 엔진·별도 A/B 엔진 신설 절대 금지).
- Approval Workflow = pending_approval/maker-checker 확장. Feature Flag = plan 게이트 형식화.
- Evidence = `SecurityAudit::verify`. Isolation = `Db.php`. Runtime Guard = plan 게이트·`index.php` RBAC·`deploy.yml` 위 배치.

## 판정
**중복 위험 높음(실험/승인/게이트 자산 실재·강함).** ★핵심=`AbTesting` 베이지안 엔진은 **재사용**(별도 실험 엔진 신설 금지). 마케팅 Decision/KPI·ModelMonitor·죽은 terraform은 오흡수 금지(PRESENT 오판 주의). 형식 순신설=Innovation Lifecycle·Idea Management·Feature Flag Governance·Innovation KPI 뿐. 새 실험/승인 엔진·해시체인을 신설하지 않는다.
