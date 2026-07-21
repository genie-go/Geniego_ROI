# DSAR — EAINGA Canonical Entities Design & Judgment (Part 3-46 §2~§21)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★마케팅/데이터 AI 재사용·KEEP_SEPARATE·authz AI 거버넌스 greenfield.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_AI_GOVERNANCE | 부재(형식 authz AI 거버넌스) | — | ABSENT-formal |
| 2 | APPROVAL_AI_MODEL | Claude 모델 상수 | `ClaudeAI.php:20`·`AiGenerate.php:27` | PARTIAL-informal(하드코딩·형식 Registry 아님) |
| 3 | APPROVAL_AI_POLICY | 부재(AI 정책 오케스트레이션) | — | ABSENT |
| 4 | APPROVAL_AI_DECISION | 집계 의사결정·confidence | `Decisioning.php`·`AutoRecommend.php` | PARTIAL(마케팅·집계전용) |
| 5 | APPROVAL_AI_REASONING | 부재 | — | ABSENT |
| 6 | APPROVAL_AI_PROMPT | 인라인 프롬프트(버전/승인 없음) | `ClaudeAI.php`·`AiGenerate.php` | ABSENT(거버넌스) |
| 7 | APPROVAL_AI_CONTEXT | 요청 컨텍스트(형식 Manager 아님) | `Db.php` | PARTIAL-informal |
| 8 | APPROVAL_AI_MEMORY | 부재(형식 Memory Governance) | — | ABSENT |
| 9 | APPROVAL_AI_SAFETY | Data Leakage=No-PII/격리·**Prompt Injection 부재** | `Db.php` | PARTIAL(데이터 안전만) |
| 10 | APPROVAL_AI_EXPLAINABILITY | ★근거/신뢰도 강제 | 헌법 V4·`Decisioning` | PARTIAL(정책·형식 Trace 아님) |
| 11 | APPROVAL_AI_COMPLIANCE | 부재(ISO42001/NIST AI RMF/EU AI Act) | — | ABSENT-formal |
| 12 | APPROVAL_AI_RISK | 부재(형식 AI Risk Assessment) | — | ABSENT |
| 13 | APPROVAL_AI_ANALYTICS | 드리프트/이상 | `ModelMonitor.php`·`AnomalyDetection.php` | PARTIAL(형식 Trust Index 아님) |
| 14 | APPROVAL_AI_BASELINE | env/config·git | `Db.php`·git | PARTIAL |
| 15 | APPROVAL_AI_VERSION | 모델 상수·git | `AiGenerate.php:25`·git | PARTIAL-informal |
| 16 | APPROVAL_AI_SNAPSHOT | 부재 | — | ABSENT |
| 17 | APPROVAL_AI_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 18 | APPROVAL_AI_DIGEST | 부재 | — | ABSENT |
| 19 | APPROVAL_AI_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 20 | APPROVAL_AI_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |

## 도메인 설계 계약(§3~§21 요지)
- **§6 AI Model Registry / §14 Operations / §15 Lifecycle**: `ClaudeAI`/`AiGenerate` 모델 상수 + `AiGenerate.php:25` **모델 은퇴 교체**(lifecycle rollback seed) + `ModelMonitor`/`AnomalyDetection`(드리프트) 승격. 형식 Model Card/Registry 신설. ★중복 드리프트 엔진 금지(V3).
- **§10 AI Safety**: Data Leakage/Cross-Tenant Context=`Db.php` 격리+No-PII 재사용. **Prompt Injection Defense·Hallucination Detection·Model Boundary=순신설**(실 갭).
- **§11 Explainability**: 헌법 V4 "근거/신뢰도·근거없는 결론 금지" 실 정책. Decision Trace/Reason Chain 형식화.
- **§7~9 Prompt/Context/Memory Governance**: 순신설(인라인 프롬프트→버전/승인/롤백·Memory Isolation).
- **§3 AI Governance**: Human Oversight/Executive Approval=상위 Part 3-40 참조. authz AI 거버넌스=greenfield.

## 판정
**PARTIAL(§2·§4·§9·§10·§13·§17=마케팅/데이터 AI·격리·드리프트·해시체인 재사용) / ABSENT-formal(§1·§3·§5·§6프롬프트·§8·§11·§12·§16·§18=형식 authz AI 거버넌스 greenfield).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 ModelMonitor/Decisioning/DataTrust 승격·마케팅 AI 오흡수 금지·Prompt Injection Defense 순신설.
