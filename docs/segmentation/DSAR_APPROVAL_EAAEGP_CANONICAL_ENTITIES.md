# DSAR — EAAEGP Canonical Entities Design & Judgment (Part 3-40 §2~§22)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★마케팅 자율≠authz 자율·Human Oversight 전제.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_AUTONOMOUS_PLATFORM | 부재 | — | ABSENT |
| 2 | APPROVAL_AUTONOMOUS_POLICY | RuleEngine(★마케팅) | `RuleEngine.php` | KEEP_SEPARATE(authz 정책 자율 순신설) |
| 3 | APPROVAL_AUTONOMOUS_DECISION | AutoRecommend·Decisioning(마케팅) | `AutoRecommend.php`·`Decisioning.php` | KEEP_SEPARATE |
| 4 | APPROVAL_AUTONOMOUS_ACTION | executeAction(부분 정직-pending) | `Alerting.php` | PARTIAL(생산자 배선+게이트 후) |
| 5 | APPROVAL_AUTONOMOUS_VALIDATION | E2E/health(Part 3-29) | (설계) | 상위 Part 참조 |
| 6 | APPROVAL_AUTONOMOUS_OVERRIDE | 부재(break-glass≠override) | `UserAuth.php` | ABSENT-formal |
| 7 | APPROVAL_AUTONOMOUS_RISK | AnomalyDetection(마케팅) | `AnomalyDetection.php` | KEEP_SEPARATE(거버넌스 Risk 신설) |
| 8 | APPROVAL_AUTONOMOUS_COMPLIANCE | Compliance readiness | `Compliance.php` | PARTIAL(auto remediation 부재) |
| 9 | APPROVAL_AUTONOMOUS_OPTIMIZATION | Mmm frontier(마케팅) | `Mmm.php` | KEEP_SEPARATE(Authorization Policy 최적화 신설) |
| 10 | APPROVAL_AUTONOMOUS_HEALING | ensureTables·WMS consolidate | `Handlers/*`·`Wms.php` | KEEP_SEPARATE(authz self-heal 신설) |
| 11 | APPROVAL_AUTONOMOUS_SNAPSHOT | 부재 | — | ABSENT |
| 12 | APPROVAL_AUTONOMOUS_EVIDENCE | append-only 정본·AI 근거표시 | `SecurityAudit.php`·`Insights.php` | PARTIAL(체인 재사용) |
| 13 | APPROVAL_AUTONOMOUS_DIGEST | 부재 | — | ABSENT |
| 14 | APPROVAL_AUTONOMOUS_ANALYTICS | 부재 | — | ABSENT |
| 15 | APPROVAL_AUTONOMOUS_BASELINE | env/config baseline | `Db.php` | PARTIAL |
| 16 | APPROVAL_AUTONOMOUS_VERSION | git·문서 버전 | git | PARTIAL |
| 17 | APPROVAL_AUTONOMOUS_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 18 | APPROVAL_AUTONOMOUS_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |
| 19 | APPROVAL_AUTONOMOUS_EXCEPTION | 부재 | — | ABSENT |
| 20 | APPROVAL_AUTONOMOUS_SIMULATION | PolicyTreeEditor·AbTesting sim(마케팅) | `AbTesting.php` | KEEP_SEPARATE(Policy Simulation 신설) |

## 도메인 설계 계약(§3~§22 요지)
- **§5 Autonomous Policy Engine·§6 Decision Engine**: ★authz 정책 자율=순신설. 마케팅 RuleEngine/AutoRecommend 재사용 절대 금지(오흡수=인가 무인집행). Human Escalation 필수.
- **§7 AI Governance Coordinator·§13 Autonomous Approval**: ★Human Approval 필수(V4/V5 헌법·Explainable). PAUSED/pending_approval 안전장치 승격.
- **§10 Self-Healing**: 스키마/WMS self-heal은 KEEP_SEPARATE. authz self-heal(Policy/Config Recovery)=순신설.
- **§14 Executive Override**: break-glass(`UserAuth.php`·인증우회)≠Executive Override(정책 재정의)·순신설(Justification/Approval Chain/Rollback).
- **§16 Autonomous Security**: Secret/Certificate Rotation=P5 세션해시/Crypto 실재이나 **자동회전 정책 부재**(신설).

## 판정
**PARTIAL(§4·§8·§12·§15~17=executeAction/Compliance/SecurityAudit substrate) / ABSENT-formal(authz Policy/Decision Engine·Control Plane·Predictive Risk·Override·Analytics) + ★마케팅 자율 KEEP_SEPARATE(§2·§3·§7·§9·§10·§20) + 무인 authz 자율 미허용.** 코드 0. BLOCKED_PREREQUISITE. 실행 시 Human Oversight/PAUSED 전제·마케팅 엔진 재사용 금지.
