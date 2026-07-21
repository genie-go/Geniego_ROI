# DSAR — EAAEGP Ground-Truth ② Duplicate Implementation Audit (Part 3-40)

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★목적 = 본 Part는 마케팅 자동화 오흡수가 **안전 최대 위험**(인가 무인집행). KEEP_SEPARATE 경계 확정.

## ★마케팅 자동화 오흡수 금지(안전 핵심)
| EAAEGP 개념 | 마케팅 자산(오흡수 금지) | 인용 | 판정 |
|---|---|---|---|
| Autonomous Policy/Rule Engine | channel_roas 룰엔진 | `RuleEngine.php` | ★KEEP_SEPARATE(마케팅 ≠ authz 정책 자율·오흡수=인가 무인집행 위험) |
| Autonomous Decision | AutoRecommend·Decisioning | `AutoRecommend.php`·`Decisioning.php` | ★KEEP_SEPARATE(마케팅 의사결정) |
| Autonomous Action | executeAction | `Alerting.php` | 재사용(생산자 배선+안전게이트 후·현재 부분 정직-pending) |
| Predictive Risk | AnomalyDetection·ModelMonitor | `AnomalyDetection.php`·`ModelMonitor` | KEEP_SEPARATE(마케팅/ML ≠ 거버넌스 Risk) |
| Self-Healing | ensureTables·WMS consolidate | `Handlers/*`·`Wms.php` | KEEP_SEPARATE(스키마/WMS ≠ authz Self-Healing) |
| Optimization | Mmm frontier | `Mmm.php` | KEEP_SEPARATE(마케팅 예산 ≠ Authorization Policy 최적화) |

## 동음이의/재사용
| EAAEGP 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| Human Oversight/Approval | PAUSED·킬스위치·pending_approval | `AdAdapters.php`·`Catalog.php`·`Alerting.php` | 재사용(안전장치·필수 승격) |
| Runtime Guard | index.php RBAC·writeGuard | `index.php`·`UserAuth.php` | 재사용 |
| Evidence/Isolation | SecurityAudit·Db | `SecurityAudit.php`·`Db.php` | 재사용 |
| Snapshot | 메뉴/저니 snapshot | `AdminMenu`·journey_decision_log | KEEP_SEPARATE(★정본 `SecurityAudit::verify`) |

## 확장 대상(중복 신설 금지·기존 승격)
- Human Oversight/Approval=PAUSED/pending_approval 승격(필수 안전). Runtime Guard=`index.php` RBAC. Evidence=`SecurityAudit::verify`. Isolation=`Db.php`. authz Rule/Decision Engine=순신설(마케팅 엔진 재사용 금지).

## 판정
**중복 위험 높음 + ★안전 위험 최대(마케팅 자동화 오흡수→인가 무인집행).** ★핵심=마케팅 자율(RuleEngine/AutoRecommend/Decisioning/Mmm)을 authz 자율로 **재사용 절대 금지**(도메인·리스크 상이). 재사용=PAUSED/pending_approval 안전장치·RBAC·SecurityAudit·Db. authz Autonomous Policy/Decision Engine은 순신설(Human Oversight 전제). 새 무인 집행 경로 신설 금지.
