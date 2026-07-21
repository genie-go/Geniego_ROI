# MEA Part 051 — Canonical Entities Design & Judgment (§5~§17)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★AI 엔진 다수 재사용·형식 AI Platform Infra 순신설·★★마케팅 AI/dev AI KEEP_SEPARATE·오흡수 금지·과대주장 금지.

## §5 15 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | AI_MODEL | ml_models·통계/LLM | `ModelMonitor`·`ClaudeAI` | PARTIAL |
| 2 | AI_SERVICE | AI 핸들러 다수 | `AutoRecommend`/`Decisioning`/`Mmm` | PARTIAL-strong |
| 3 | AI_AGENT | 코파일럿 seed | `ClaudeAI`(282/283차) | PARTIAL-weak |
| 4 | AI_PIPELINE | attribution/forecast | `Attribution`/`DemandForecast` | PARTIAL-weak |
| 5 | AI_RUNTIME | 외부 LLM API·인프로세스 | `ClaudeAI`(self-host 부재) | ABSENT-formal |
| 6 | AI_WORKSPACE | 형식 부재 | (워크스페이스 부재) | ABSENT |
| 7 | AI_PROJECT | 형식 부재 | (프로젝트 관리 부재) | ABSENT |
| 8 | AI_PROMPT | 프롬프트 seed | `ClaudeAI`/`AiGenerate` | PARTIAL-weak |
| 9 | AI_POLICY | 헌법 V4/V5·안전장치 | 헌법·`CHANGE_GATE` | PARTIAL-strong |
| 10 | AI_DATASET | DataTrust(READY) | `DataPlatform`·데이터 헌법 V3 | PARTIAL |
| 11 | AI_DEPLOYMENT | 배포 승인 게이트 | deploy(형식 AI 배포 부재) | ABSENT-formal |
| 12 | AI_ENDPOINT | /api/models·/v422/ai | routes(형식 Endpoint 표준 부재) | PARTIAL-weak |
| 13 | AI_EXPERIMENT | 형식 부재 | (Experiment Mgmt 부재·Part 052) | ABSENT |
| 14 | AI_VERSION | ml_models version seed | `ModelMonitor` | PARTIAL-weak |
| 15 | AI_AUDIT | 해시체인 | `SecurityAudit.php` | PARTIAL |

## §6~§17 표준 판정
- **§6 Domain(10)**: ML=`ModelMonitor`·Generative=`AiGenerate`·Recommendation=`AutoRecommend`·Predictive=`DemandForecast`/`Mmm`·Decision=`Decisioning`·마케팅 AI=`ClaudeAI`. ★Deep Learning/Computer Vision=ABSENT(통계 모델·GPU 부재).
- **§7 Lifecycle(10)**: Data Prep=`DataPlatform`(V3 READY)·Monitoring=`ModelMonitor`(drift)·Version=ml_models. ★Model Development/Experiment/형식 Deployment=순신설(Part 052 정합).
- **§8 Infrastructure(8)**: 없음(외부 LLM API·인프로세스). ★GPU/AI Cluster/Distributed Computing/Model Repository/Experiment/Compute Scheduling=ABSENT(GPU/멀티노드 부재).
- **§9 Runtime(8)**: 외부 Anthropic API 호출·인프로세스 추론. ★Model Serving(self-host)/Model Routing/Multi Model Serving/Runtime Scaling=ABSENT(★외부 API≠Serving Runtime 오흡수 금지).
- **§10 Service Mgmt(8)**: AI 핸들러 라우트 등록·Rollback seed. ★AI Service Discovery/Endpoint 표준/Service Analytics=순신설.
- **§11 Operations(8)**: Monitoring=`ModelMonitor`·Incident seed=`AnomalyDetection`·배포=deploy.yml. ★AI Scaling/Scheduling/Capacity Planning=ABSENT.
- **§12 Governance**: 헌법 V4/V5·안전장치·Quality=데이터 헌법 V3·Audit=`SecurityAudit`. ★형식 Approval/Version/Usage Policy=순신설.
- **§13 Security**: Tenant=`Db`·RBAC/IAM=`index.php`(047)·암호화=`Crypto`(049)·Secret=CRED_ENC_KEY·Audit=`SecurityAudit`(048). ★Secure Model Storage(형식)=순신설.
- **§17 AI**: Multi-LLM/Knowledge=`ClaudeAI`·Predictive=`DemandForecast`·Recommendation=`AutoRecommend`·XAI=헌법 V4·Responsible=헌법 V5. ★★AI 운영 정책 자동 변경/단독 의사결정 불가=헌법 V5+`CHANGE_GATE`·마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE.

## 판정
**PARTIAL-strong(§2·§9 AI_POLICY·§6·§7·§12 AI 서비스/정책/거버넌스) / PARTIAL(§1·§4·§10·§15) / ABSENT-formal(§5·§6·§8·§9·§11 AI_RUNTIME/WORKSPACE/PROJECT/DEPLOYMENT/EXPERIMENT·형식 AI Platform Infra·Serving Runtime·Model Repository·Experiment·Deep Learning/CV).** 코드 0. ★AI 능력 강하게 실재(마케팅 AI/ML/추천/의사결정/예측/MMM)이나 형식 AI Platform 인프라(GPU/클러스터/서빙 런타임/워크스페이스/실험)는 부재(부재증명 완료·과대주장 금지·★ml_models≠Model Repository·외부 API≠Serving Runtime·통계 모델≠DL/CV 오흡수 금지). AI 엔진 다수 재사용(★중복 AI 엔진 절대 금지=헌법 V4)·형식 AI Platform Infra/Serving Runtime/Experiment 순신설(GPU/멀티노드 선행)·★★마케팅 AI(`ClaudeAI`)/dev AI(Claude Code) KEEP_SEPARATE·Part 047/048/049 상속·★AI 운영 정책 자동 변경/단독 의사결정 불가(V5+CHANGE_GATE).
