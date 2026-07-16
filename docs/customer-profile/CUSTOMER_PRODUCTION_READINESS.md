# EPIC 05-D Part 2 — Customer Identity Production Readiness, Canary, Cutover, Rollback & DR (정식 마스터)

> **근거**: Part 1 [`CUSTOMER_IDENTITY_FINAL_AUDIT_REPORT.md`](CUSTOMER_IDENTITY_FINAL_AUDIT_REPORT.md)(Blocker 10) + GeniegoROI 실 인프라. **비파괴**: 전환 프레임워크·Runbook·정책만. 코드변경 0. 전체 Customer 일괄 Merge·Legacy 삭제·Rule 변경+Cutover 동시·Kill Switch 없는 실행 없음(§72).
> **§73 통합**: ~62개 파편 대신 본 마스터가 Readiness Matrix·Risk·Feature Flag/Version Routing·Ingestion/Normalization/Match/Link/Merge Dry Run Shadow·360 Read Compare·Canary·Manual Merge Canary·Restricted Auto Link/Merge·360/Search/Timeline/Segment/Audience/CRM/AI/Automation Cutover·Merge Cooldown·Kill Switch·Rollback(Rule/Model/Merge/Golden/Consent/Search/Graph/Cache)·Wrong-target 보상·Monitoring/SLO/Identity Safety SLO/Error Budget·Incident/Privacy Incident·DR·RPO/RTO·Backup·안정화·Legacy를 통합. ADR=[`../architecture/ADR_CUSTOMER_PRODUCTION_CUTOVER.md`](../architecture/ADR_CUSTOMER_PRODUCTION_CUTOVER.md).

---

## 0. ★정직 프레이밍 (라이브 legacy + Canonical 업그레이드)
기존 고객 엔진(crm_customers·Union-Find·확률병합·Unmerge·발송게이트)=**운영 라이브(legacy)**. **Canonical 업그레이드(360 Query Layer·Consumer Enforcement·consent identity·Normalizer·Wrong-target·PII Masking)=미구현**. 본 Part 2 = (a)Canonical 업그레이드 전환 프레임워크를 라이브 위에 얹는 설계, (b)Canonical 전 항목 `AUDIT_COMPLETE`/`BLOCKED_PENDING_IMPLEMENTATION`(**Canonical Production Active 0·Shadow/Canary 통과 0**). 라이브 legacy는 계속 운영. 허구 전환 보고 금지.

## 1. GeniegoROI 실 인프라 매핑 + ★라이브 위험
| Part2 개념 | 실체 | 갭 |
|---|---|---|
| Version Routing | `/vNNN` API 접두(신 Canonical=신 버전·legacy 병존) | 신설 |
| 환경 분리 | 운영 genieroi.com+데모 | Canary(데모 단독 금지 §17) |
| Rollback | dist.bak 스왑백(검증)·Unmerge(CRM:913) | Merge 범위별 Rollback=신설 |
| **Feature Flag/Kill Switch/Auto Merge Kill Switch** | **전부 부재** | ★신설(구현 선결) |
| **★라이브 자동병합** | resolveIdentitiesForTenant(phone/kakao 정확일치)=**Dry Run/Kill Switch 없이 이미 라이브** | ★Kill Switch·Sampling 소급 필요 |

## 2. Production Readiness Matrix (§4/§5/§74) — 현 상태
| Target | Type | Risk | Shadow | Wrong-target | Status |
|---|---|---|---|---|---|
| crm_customers Read(라이브) | Store | LOW | — | — | **VALIDATED_LEGACY(운영 중)** |
| 자동 Merge(phone/kakao 라이브) | Engine | HIGH | — | — | VALIDATED_LEGACY(★Kill Switch 없음) |
| consent identity 차원 | Consent | CRITICAL | — | — | **BLOCKED_CONSENT** |
| 360 Query Layer/Consumer Enforcement | Consumer | — | 미실행 | 미실행 | **BLOCKED_PENDING_IMPLEMENTATION** |
| Automation Canonical Targeting | Automation | **CRITICAL** | — | ✗ | **BLOCKED_WRONG_TARGET** |

**Canonical Production Active 0.**

## 3. 위험 등급 & 전환 순서 (§6/§3.4)
- LOW(360 Read-only·Masked·Timeline·Explain)→MEDIUM(Candidate·Identity Link·Golden·Segment·AI Insight)→HIGH(Manual Merge·Auto Link·Audience Build·CRM Sync·Retargeting)→**CRITICAL(Auto Merge·Audience Upload·Email/SMS/Push·Retargeting 실행·고객상태·예산 자동화·Consent/Suppression 변경·Deletion·대규모 Backfill)**.
- **순서(§3.4 Auto Merge 최후)**: Read-only 360→Candidate→Identity Link Shadow→Manual Review→Manual Merge→Restricted Auto Link→**Restricted Auto Merge**. **Write/Read Path 분리(§3.2)**·**Match Rule/Model/Consent 정책 Cutover 중 고정(§3.3)**.

## 4. Feature Flag / Version Routing (§7/§8)
- **Flag Scope**: Environment/Tenant/Workspace/Brand/Store/Source System/Source Account/Connector/Identifier Type/Match Rule/Match Model/Auto Link/Auto Merge/Consumer/Segment/Audience Destination/CRM Destination/Automation Workflow/Percentage. (부재→신설). Flag: Source Ingestion·Normalization V2·Candidate·Identity Link Write·Auto Link·Auto Merge·360 Read·Segment/Audience Canonical·Automation Canonical Targeting.
- **Version Routing**: Schema/Normalization/Match Rule/Match Model/Merge Policy/Golden Record/Consent/Suppression/Query Contract/Segment/Audience Snapshot/Automation Eligibility Version(비호환 혼합 금지).

## 5. Shadow / Read Compare / Canary (§9~24)
- **Ingestion/Normalization/Match/Link/Merge Dry Run Shadow(§9~15)**: Canonical Pipeline 결정 기록(운영 Write 미교체)·비교(Profile/Identifier/Normalization/Consent/Scope/Source Account/Candidate/Match/Confidence). **Match Shadow Exit(§13)**: Auto Link/Merge Precision 기준·FP Merge/FN Match 기준·**Cross-Tenant/Cross-Source Account/Deleted/Demo Candidate 0·Unexplained 0**.
- **360 Read Compare(§16)**: Legacy ‖ Canonical Query(Profile/Identifier/Golden/Merge/Consent/Suppression/Segment/Audience Eligibility/**PII 노출**).
- **Canary(§17~20)**: **대표성 실 운영 Tenant+Source Account·Demo 단독 금지**. 단계=Read-only 360→Masked Search→Candidate→Identity Link→Manual Review→**Manual Merge→Unmerge**→Restricted Auto Link→Restricted Auto Merge→Segment→Audience Preview→CRM Preview→AI/Recommendation→Automation Preview→제한 Execution. Exit=Scope/Source Account/Match Precision/Unmerge 가역성/Consent/**Wrong-target 0·Deleted 0·Mock 0·PII 노출 0**.
- **Manual Merge Canary(§21)**: Auto Merge보다 먼저·Dry Run+Reviewer+Snapshot+Unmerge Test+Segment/Audience Rebuild+Automation Cooldown+Audit.

## 6. Restricted Auto Link / Merge (§22~24) — ★가장 엄격
- **Restricted Auto Link(§22)**: 특정 Tenant/Source/Verified Identifier/Rule·높은 Confidence·낮은 위험 Consumer·Percentage·Daily Limit·Alert·Kill Switch.
- **★Restricted Auto Merge(§23)**: 강한 Signal 조합·특정 Tenant/Workspace/Brand/Source Account·특정 Rule Version·**최고 Confidence 구간·Conflict 0·Shared Identifier Risk 0·비삭제·Consent 독립 유지·Dry Run·Unmerge 검증·Daily Merge Limit·Manual Sampling·Kill Switch·Rollback**. ★기존 라이브 phone/kakao 자동병합도 이 게이트로 소급 편입(Kill Switch/Sampling 부여).
- **Auto Merge Sample Review(§24)**: 일정 비율 사람 검토(실제 동일 고객·Signal·Golden·Consent·Event 귀속·**False Positive 가능성**).

## 7. Consumer Cutover / Merge Cooldown (§25~35)
- **360 Query Cutover(§25)**: Admin Audit→Profile UI→Support→Analytics→CRM→Segment→Audience→AI→Recommendation→Automation(별도 Flag/Contract Version). **Search/Timeline(§26/§27)**: Tenant Partition·PII Permission·Masking·Deleted 제외·Merge/Unmerge 표시.
- **Segment(§28)**: Canonical Attribute/Version·Identity Confidence·Freshness·Consent·Suppression·Evaluation Time·Legacy Membership 차이·Wrong-target Risk. **Audience Preview(§29)→Upload(§30)**: Destination Account 검증·Verified Identifier·최신 Consent·Suppression·Hash Version·Snapshot Version·Idempotency·Approval·Kill Switch·**Delete Propagation·Removal Sync**.
- **CRM(§31)**: Write Ownership·Field Authority·Conflict·Loop Prevention. **AI/Recommendation(§32)**: Masked·최소 Attribute·Identity Confidence·Consent·Predicted Label. **Automation Preview(§33)→Execution(§34)**: Canonical Profile·**Verified Destination Identifier·최신 Consent·Suppression·Identity Confidence·Segment/Audience Version·Frequency·Idempotency·Preview·Approval·Kill Switch·보상**.
- **★Merge Cooldown(§35)**: Merge/Unmerge/Split/Re-link 직후 Audience/CRM/Retargeting/발송/Recommendation/Automation Cooldown → Profile/Consent/Segment/Cache Reconciliation 후 해제.

## 8. Kill Switch (§36~38)
- **Customer Identity Kill Switch(§36)**: 전체/Tenant/Workspace/Brand/Source Account/Identifier Type/Match Rule/Model/Candidate/Identity Link Write/Auto Link/**Auto Merge**/Merge Execution/Segment/Audience/CRM/Automation.
- **★Auto Merge Kill Switch(§37)**: 신규 Auto Merge 차단·진행 Case 정책·Candidate/Manual Review 유지·Merge Queue 격리·최근 Merge Sampling·**필요 시 Batch Unmerge**·Audience/Automation Cooldown.
- **Audience/Automation Kill Switch(§38)**: Destination/CRM Channel/Workflow/Brand/Source Account/Segment Version/Profile Cohort별.

## 9. Rollback (§39~48)
- **즉시 Rollback**: Cross-Tenant Profile 노출·Cross-Tenant Link/Merge·Source Account 혼입·**False Positive Merge 급증**·Unmerge 불능·**Wrong-target 실행**·Consent 철회 대상 발송·Suppressed 실행·Deleted Profile 사용·PII 노출·Demo/Prod 혼입·데이터 손실.
- **범위(§40)**: Profile/Merge Case/Identifier Type/Match Rule/Model/Source Account/Store/Brand/Workspace/Tenant/Consumer/Segment/Audience/Automation/전체.
- **절차(§41)**: Incident→Kill Switch→Flag off→Legacy Read 복구→Write 중지→영향 Profile/Merge Case 식별→Segment/Audience/CRM/Automation 중지→Cache Purge→Search/Graph Routing 복구→**필요 시 Unmerge**→Consent/Suppression 재검증→증거보존→RCA→PM/Problem History.
- **Rule/Model/Merge/Golden/Consent/Search/Graph/Cache Rollback(§42~47)**: 이전 Version·Batch Unmerge·Snapshot 복원·Reindex·**Consent Rollback이 더 관대하게 만들면 안 됨(§46)**·Withdrawn 우선 보존. **Wrong-target 보상(§48)**: 대상 실행 중지·Audience 제거·CRM Action 취소·Follow-up Suppression·Merge Rollback·비용/고객 영향·안내·Incident·법무/Privacy 검토·재발방지 테스트.

## 10. Monitoring / SLO / Identity Safety SLO / Error Budget (§49~54)
- **Monitoring/Alert(§49/§50)**: Ingestion/Candidate/Match 분포/Auto Link/Merge/Manual Review/Conflict/Unmerge/**False Positive Report/Cross-Tenant Block/Source Account Block/Consent Block/Wrong-target Block**/Query Latency/Segment·Audience Difference/Deletion Lag/Re-ingestion Block/Match Rule·Model Drift.
- **SLO(§52)**·**★Identity Safety SLO(§53)**: **Cross-Tenant Link=0·Cross-Tenant Merge=0·Cross-Source Account Merge=0·Wrong-target Execution=0·Consent Withdrawn Execution=0·Suppressed Execution=0·Deleted Profile Execution=0·Demo/Prod Merge=0**·Auto Merge Precision 목표·Unmerge 성공률·Deletion Propagation·Re-ingestion Block.
- **Error Budget(§54)**: Match 오류·FP Link·FN Match·Merge Rollback·Query 오류·Segment/Audience Difference·Fallback·Deletion 지연. ★**Cross-Tenant/PII/Wrong-target 실제 실행은 일반 Error Budget 상쇄 금지→Critical Incident**.

## 11. Incident / Privacy Incident / DR (§55~66)
- **Incident(§55/§56)**: SEV1(Cross-Tenant 노출/Merge·Wrong-target 대규모·Consent 철회 대규모 발송·PII·대규모 FP Merge·삭제 재등장)~SEV4. Runbook 21단계(탐지→Kill Switch→Auto Merge 중지→Segment/Audience/Automation 중지→Unmerge→Consent 재검증→RCA→Postmortem→PM/Problem History).
- **★Privacy Incident Runbook(§57)**: 타 Tenant Profile 노출·타 Brand Consent 사용·Source Account 혼입·PII Export 오류·삭제 고객 재등장·Suppressed 발송·Consent 철회 후 발송·AI Context Raw PII·Audience 잘못된 Customer. 법적 신고=관할/법무 차단 표시.
- **DR(§58~66)**: Customer/Identifier/Identity Link/Merge Case/Consent/Suppression/Graph/Search/Cache/Queue 장애. 복구=Legacy Read/Source Read-only/Snapshot/Store Restore/Merge Case Replay/Consent Restore/Graph Rebuild/Reindex/Queue Replay. 모든 Projection 재구축 가능(§60)·**Primary/Identifier/Consent 손상=Backup/PITR**. RPO/RTO(§61)=**Consent/Deletion/Suppression 엄격**. Backup(§62/§63)=암호화·Tenant 분리·**Restore Suppression**. **복구 실제 테스트(§64)=Backup Restore 후 삭제 Profile 억제·Auto Merge Kill Switch·Region 복구**.

## 12. 안정화 / Legacy (§67~70)
- **안정화(§67/§68)**: Legacy Fallback 유지·Rule/Threshold 변경 제한·강화 Sampling·Auto Merge Daily Limit·Wrong-target Monitoring. 통과=**SEV1/2 0·Cross-Tenant Link/Merge 0·Source Account 혼입 0·Wrong-target 0·Consent 철회/Suppressed/Deleted 실행 0·Auto Merge Precision 목표·Unmerge 성공률·Golden 지속통과·Unexplained 0**.
- **Legacy(§69/§70)**: Read Fallback/Shadow/Historical/Incident 용도 유지. **제거 금지 조건**: Fallback/Consent·Suppression·Unmerge 재현/Rollback 미검증·Consumer 미전환·Tenant 의존·안정화 미완·미설명 차이. Part3 인증 후 Deprecated.

## 13. §80 완료 보고 수치
Production Readiness 대상=Identifier 21+Rule/Model+Consumer 다수 · **Shadow 통과 0·Canary 통과 0·Manual Merge Canary 0·Restricted Auto Link/Merge 0·Production Active 0·Stable 0·Rolled Back 0**(구현 전) · Blocked=전부(BLOCKED_PENDING_IMPLEMENTATION+BLOCKED_CONSENT+BLOCKED_WRONG_TARGET) · Consumer 전환 0·Segment/Audience/CRM/AI/Automation 전환 0 · **Auto Merge Precision 미측정** · **Wrong-target 운영테스트=미실행(미구현)** · Consent/Suppression 운영=isMarketingSendAllowed 라이브(identity 차원 없음) · Deletion 운영=DSAR 라이브(형제 누락 GAP) · Incident 0(전환 없음) · Rollback 테스트=dist.bak+Unmerge(기존 검증)·Canonical 미실행 · DR 테스트=미실행(사양) · **Identity Safety SLO=사양 정의(Cross-Tenant/Wrong-target/Consent Withdrawn=0)** · Error Budget=사양 · 문서=본 마스터+ADR+PM · ★**남은리스크=Canonical Engine 업그레이드+Feature Flag+Kill Switch(Auto Merge)+consent identity+Wrong-target 구현이 모든 Canonical 전환의 선결·라이브 phone/kakao 자동병합 Kill Switch 소급** · **EPIC05-D Part3(Enterprise Certification·Governance·Sign-off·Recurrence Prevention) 준비 완료(단 실 구현 선결)**. 코드변경 0.
