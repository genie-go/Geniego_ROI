# DSAR — EAGAIGM Canonical Entities Design & Judgment (Part 3-52 §2~§20)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★Part 3-46 EAINGA 동일 substrate·글로벌 aspirational.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_GLOBAL_INTELLIGENCE | 부재(형식 글로벌) | — | ABSENT-aspirational |
| 2 | APPROVAL_INTELLIGENCE_DOMAIN | 마케팅/데이터 AI 도메인 | `ClaudeAI.php`·`DataPlatform.php` | PARTIAL-informal(KEEP_SEPARATE) |
| 3 | APPROVAL_AI_FEDERATION | 부재(Federated Learning) | — | ABSENT-aspirational |
| 4 | APPROVAL_GLOBAL_POLICY | 부재(글로벌 정책 sync·단일 리전) | — | ABSENT-aspirational |
| 5 | APPROVAL_COLLECTIVE_DECISION | 승인 워크플로우 seed | `AgencyPortal.php`·`/v423/approvals` | PARTIAL-informal |
| 6 | APPROVAL_EXPLAINABLE_AI | ★근거/신뢰도 강제 | 헌법 V4·`Decisioning.php` | PARTIAL(정책·형식 Trace 아님) |
| 7 | APPROVAL_AUTONOMOUS_POLICY | 헌법 V5 자동집행 승인정책 | 데이터 헌법 V5 | PARTIAL-informal |
| 8 | APPROVAL_GLOBAL_COMPLIANCE | Privacy·감사(리전 단일) | `GdprConsent.php`·`Dsar.php` | PARTIAL |
| 9 | APPROVAL_GLOBAL_RISK | 이상탐지 | `AnomalyDetection.php` | PARTIAL(Geopolitical 부재) |
| 10 | APPROVAL_INTELLIGENCE_KNOWLEDGE | 부재(Part 3-49 참조) | — | ABSENT |
| 11 | APPROVAL_INTELLIGENCE_KPI | 부재(형식 KPI) | — | ABSENT |
| 12 | APPROVAL_INTELLIGENCE_SNAPSHOT | 부재 | — | ABSENT |
| 13 | APPROVAL_INTELLIGENCE_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 14 | APPROVAL_INTELLIGENCE_DIGEST | 부재 | — | ABSENT |
| 15 | APPROVAL_INTELLIGENCE_ANALYTICS | 드리프트/이상 | `ModelMonitor.php`·`AnomalyDetection.php` | PARTIAL(형식 Index 아님) |
| 16 | APPROVAL_INTELLIGENCE_BASELINE | env/config·git | `Db.php`·git | PARTIAL |
| 17 | APPROVAL_INTELLIGENCE_VERSION | git·모델 상수 | git·`AiGenerate.php` | PARTIAL-informal |
| 18 | APPROVAL_INTELLIGENCE_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 19 | APPROVAL_INTELLIGENCE_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |
| 20 | APPROVAL_INTELLIGENCE_EXCEPTION | 부재 | — | ABSENT |

## 도메인 설계 계약(§3~§20 요지)
- **§8 Explainable Decision**: 헌법 V4(근거/신뢰도) + `Decisioning` 형식화(Decision Trace 신설·Part 3-46 정합).
- **§6·§9 Decision Orchestrator/AI Oversight**: 승인 워크플로우·`ModelMonitor` 드리프트 승격. Bias/Safety=순신설.
- **§5 Federated AI**: 마케팅 AI(ClaudeAI/AiGenerate) KEEP_SEPARATE. Federated Learning=미래.
- **§4·§7·§12 Global Coordination/Policy Sync/Collective**: 단일 호스트라 ABSENT-aspirational(멀티리전 인프라 전제).
- **§13 Knowledge Graph / §20 AI Advisor**: Part 3-49 참조 / 마케팅 AI KEEP_SEPARATE.

## 판정
**PARTIAL-informal(§2·§5·§6·§7·§8·§9·§13·§15=Explainable AI/승인/드리프트/Privacy — Part 3-46 동일) / ABSENT-aspirational(§1·§3·§4·§10~12·§14=Global/Federated/Multi-Region/Knowledge Graph).** 코드 0. BLOCKED_PREREQUISITE. ★Part 3-46 상위집합(재설계 금지)·마케팅 AI 분리·글로벌/federated 조기구현 금지.
