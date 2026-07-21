# DSAR — EASSF Canonical Entities Design & Judgment (Part 3-44 §2~§22)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★인프라 텔레메트리/조직 대부분 ABSENT.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 seed | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_SUSTAINABILITY_PROGRAM | 부재 | — | ABSENT |
| 2 | APPROVAL_ESG_ALIGNMENT | 부재(ESG 없음) | — | ABSENT(조직) |
| 3 | APPROVAL_GREEN_COMPUTING | 부재(인프라 텔레메트리) | — | ABSENT(인프라) |
| 4 | APPROVAL_CARBON_METRIC | 부재 | — | ABSENT(인프라) |
| 5 | APPROVAL_ENERGY_PROFILE | 부재 | — | ABSENT(인프라) |
| 6 | APPROVAL_COST_OPTIMIZATION | Part 3-34 Financial(플랫폼 비용) | (설계) | 상위 Part 참조 |
| 7 | APPROVAL_TECHNICAL_DEBT | NEXT_SESSION(비형식)·Part 3-27 | `NEXT_SESSION.md` | PARTIAL(상위 Part 통합) |
| 8 | APPROVAL_PLATFORM_LIFECYCLE | Part 3-27 Version Lifecycle | (설계) | 상위 Part 참조 |
| 9 | APPROVAL_RESPONSIBLE_AI | V4/V5 헌법·ClaudeAI/Insights | `docs/UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md`·`ClaudeAI.php` | PARTIAL(헌법 형식화) |
| 10 | APPROVAL_WORKFORCE_CAPABILITY | 부재(조직·Skills Matrix 없음) | — | ABSENT(조직) |
| 11 | APPROVAL_KNOWLEDGE_CONTINUITY | docs·메모리·Part 3-35/3-42 | `docs/`·`.claude/.../memory/` | PARTIAL |
| 12 | APPROVAL_OPERATIONAL_SUSTAINABILITY | health/metrics·Part 3-30 | `Health.php`·`SystemMetrics.php` | PARTIAL(상위 Part 참조) |
| 13 | APPROVAL_BUSINESS_CONTINUITY | schema migration·DR·Part 3-25 | `migrate.php`·`Db.php` | PARTIAL |
| 14 | APPROVAL_SUSTAINABILITY_KPI | 부재 | — | ABSENT |
| 15 | APPROVAL_SUSTAINABILITY_ROADMAP | Part 3-27 LTER 참조 | (설계) | 상위 Part 참조 |
| 16 | APPROVAL_SUSTAINABILITY_SNAPSHOT | 부재 | — | ABSENT |
| 17 | APPROVAL_SUSTAINABILITY_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 18 | APPROVAL_SUSTAINABILITY_DIGEST | 부재 | — | ABSENT |
| 19 | APPROVAL_SUSTAINABILITY_ANALYTICS | 부재 | — | ABSENT |
| 20 | APPROVAL_SUSTAINABILITY_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |

## 도메인 설계 계약(§3~§22 요지)
- **§5~7 Green Computing/Carbon/Energy**: ★인프라 텔레메트리 요구(제품 자체 인프라 미소유·단일 호스트·클라우드 계측 API 미연동). 순신설·인프라 종속.
- **§9 Responsible AI**: ★V4/V5 헌법(Explainable AI·근거표시·안전Rule·Human Oversight)·`ClaudeAI`/`Insights`/`Decisioning` 근거표시 실재. **신 원칙 도입 아닌 형식화**(Fairness/Bias Monitoring 계층 신설).
- **§9 Technical Debt·§12 Operational·§13 Business Continuity·§11 Knowledge**: 상위 Part(3-27/3-30/3-25/3-35/3-42) 통합.
- **§4 ESG·§10 Workforce**: ★조직(ESG Committee·Skills Matrix/Training). 소프트웨어 아님.

## 판정
**PARTIAL-seed(§7·§9·§11~13·§17=NEXT_SESSION/V4V5헌법/docs/Health/migration/SecurityAudit·상위 Part 참조) / ABSENT(§2~5·§10·§14·§16·§18~19 ESG/Green/Carbon/Energy/Workforce·인프라·조직).** 코드 0. BLOCKED_PREREQUISITE + 인프라 텔레메트리/조직 신설. 실행 시 헌법/상위 Part 형식화(제품 ROI/마케팅/고객 오흡수 금지).
