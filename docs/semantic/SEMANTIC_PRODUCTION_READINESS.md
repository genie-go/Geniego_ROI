# EPIC 03-D Part 2 — Semantic Production Readiness, Canary, Cutover, Rollback & DR (정식 마스터)

> **근거**: Part 1 [`SEMANTIC_FINAL_AUDIT_REPORT.md`](SEMANTIC_FINAL_AUDIT_REPORT.md)(Certification Baseline·Blocker) + GeniegoROI 실 배포 인프라(CLAUDE.md·EPIC02-C sync). **비파괴**: 전환 프레임워크 설계·Runbook·정책만. 코드변경 0. Consumer 일괄전환·Legacy 삭제·Rollback 없는 전환 없음(§50).
> **§51 통합**: 38개 파편 대신 본 마스터가 Readiness Matrix·Risk·Feature Flag/Routing·Shadow/Canary/Limited Production·Cutover·Rollback·Cache/MV/Job Rollback·AI/Recommendation/Automation Cutover·Kill Switch·보상조치·Monitoring/SLO/Error Budget·Incident·DR·RPO/RTO·Backup·안정화·Legacy 유지를 통합. ADR=[`../architecture/ADR_SEMANTIC_PRODUCTION_CUTOVER.md`](../architecture/ADR_SEMANTIC_PRODUCTION_CUTOVER.md).

---

## 0. ★정직 프레이밍
Part 1 결과: **Semantic Query Layer 실 구현 미존재** → **운영 전환할 대상이 없다**. 본 Part 2는 (a)전환 프레임워크를 **GeniegoROI 실 인프라에 매핑 설계**, (b)전 항목 상태 = `AUDIT_COMPLETE`/`BLOCKED_PENDING_IMPLEMENTATION`(**Production Active 0·Shadow passed 0·Canary passed 0**). 허구 전환 보고 금지(§3.2). 실 전환은 구현+자격증명+빌드+배포 승인 후.

## 1. GeniegoROI 실 인프라 매핑 (프레임워크가 얹힐 실체)
| Part2 개념 | GeniegoROI 실체 | 비고 |
|---|---|---|
| Versioned Routing(§7/§14) | **`/vNNN` 버전 API 접두**(routes.php) | ★신 시맨틱 엔드포인트를 신 버전(예 /v426/metrics)으로 Legacy 병존 — Blue/Green 등가 |
| Environment 분리 | 운영 genieroi.com + 데모 demo.genieroi.com | Shadow/Canary 후보(데모 단독 승인 금지 §10) |
| Rollback(§19~23) | **dist.bak 스왑백**(rsync -a --delete) + 백엔드 파일 원복 | 기존 배포 롤백 = 검증된 절차 |
| Scheduled Job(§24) | install_crontab.sh cron(commerce/connectors/attribution) | Metric 재집계 |
| Feature Flag(§6) | **부재**(FF 시스템 없음) | ★신설 or app_setting 기반 tenant/consumer 게이트 |
| Automation Kill Switch(§30) | AutoCampaign 안전장치(adj_roas)·수동 | 명시적 Kill Switch 신설 필요 |
| Blue/Green | **부재**(수동 dist swap) | 버전 API 접두로 대체 |

**갭**: Feature Flag 시스템·명시 Kill Switch·Shadow 인프라 = 신설 대상(구현 선결).

## 2. Production Readiness Matrix (§4/§52) — 현 상태

| Metric | Consumer | Risk | Shadow | Canary | Security | Rollback | Status |
|---|---|---|---|---|---|---|---|
| MET-ADJROAS | Automation | **CRITICAL** | 미실행 | 미실행 | 설계 | dist.bak | **BLOCKED_PENDING_IMPLEMENTATION** |
| MET-REV/COGS/LTV/VAT | API/Dashboard | MEDIUM | 미실행 | 미실행 | 설계 | dist.bak | BLOCKED_PENDING_IMPLEMENTATION |
| MET-ROAS-000003 | UI | HIGH | — | — | — | — | BLOCKED_FORMULA(버그) |
| DIM-CHANNEL | 전역 | HIGH | — | — | — | — | BLOCKED_SOURCE(방향) |

**전 항목 Production Active 0.**

## 3. 전환 위험 등급 & 순서 (§5/§3.4)
- LOW(Admin Read-only·Tooltip·Explain) → MEDIUM(Dashboard·Report·Export) → HIGH(API 기본응답·AI Insight·Recommendation·Alert) → **CRITICAL(예산 자동조정·캠페인 중지/재개·CRM 발송·리타겟팅·Segment 자동변경·Billing·고객 Export·권한/보안)**.
- **자동화는 최후**(§3.4): 내부검증→Admin→Dashboard→Detail→Report→Export→AI Insight→Recommendation→**Automation Preview→승인형→제한 자동실행→전체**. Dashboard 안정 ≠ 자동화 전환 근거.

## 4. Feature Flag / Version Routing (§6/§7)
- **Flag Scope**: Environment·Tenant·Workspace·Role·Consumer·Metric ID·**Metric Version**·Percentage·Allow/Denylist. (기존 FF 부재→app_setting 기반 신설·중복 시스템 금지)
- **Version Routing**: 신 시맨틱 계산은 **신 버전 API 접두**(Legacy /v424 병존, 신 /v426)·Emergency Override. 응답에 내부 Route/Version 추적(사용자 노출 금지).

## 5. Shadow → Canary → Limited Production (§8~13)
- **Shadow**(§8/§9): Legacy 결과 제공 + Semantic 병렬 계산·비교(Difference/Latency/Q/T/C). Sampling·비용한도. **Exit 기준**: 최소 요청/Tenant 수·기간·Match율·허용오차·**Unexplained Difference 0·Cross-Tenant 0·Critical Regression 0**·P95/99·Error/Fallback Rate. 미달→Canary 금지.
- **Canary**(§10~12): **대표성 실 운영 Tenant**(내부/동의 고객·채널 다양성)·**Demo 단독 증거 금지**. 단계: 단일 Metric→Consumer→Workspace→Tenant→소수→업종/국가→비율→전체 Read-only→쓰기/자동화. Critical Incident 시 즉시 Rollback.
- **Limited Production**(§13): 특정 Consumer/Read-only/Metric/Tenant 그룹/국가/비율/자동화 Preview만.

## 6. Cutover / Change Freeze / Post-Validation (§15~18)
- **Checklist**(§15): 승인 Version·Contract·Shadow/Canary 통과·Performance 여유·Security·Cache·Alert·Dashboard·Incident 담당·**Rollback 명령·Fallback Route·Kill Switch**·변경동결·Freshness·Job 충돌 없음·PM 승인.
- **Window**(§16): 저트래픽·담당자 가용·정산/월말/대규모 집행 회피.
- **Change Freeze**(§17): Cutover 전후 Formula/Version/Schema/Currency/Cache/Automation/DB Migration 동결(긴급 보안만 별도).
- **★Cutover 중 Formula/의미 변경 금지**(§3.6)·승인 Version 고정.

## 7. Rollback (§19~23) — GeniegoROI 실체
- **즉시 Rollback**: Cross-Tenant 노출·권한 우회·PII·핵심 Metric 대규모 오류·잘못된 자동화·예산 오조정·데이터 손실·API 광범위 장애.
- **범위**(§20): Request Route/Metric/Version/Consumer/Workspace/Tenant/그룹/전체/AI만/Automation만. **전체 Rollback만 가능한 구조 회피**(버전 API 접두로 부분 가능).
- **절차**(§21): Incident 선언→Kill Switch/Flag off→**Legacy Route 복구(신 버전 접두 비활성)**→Cache Namespace 전환→Job 중지→Automation 중지→오류 식별→데이터 영향→보상조치→증거보존→RCA→PM.
- **실 롤백 수단**: dist.bak 스왑백(rsync -a --delete)·백엔드 파일 원복(검증됨). Cache(§22)=Semantic/Legacy 분리·오염 삭제·tenant/version 무효화. MV(§23)=버전드(Rollup은 실시간이라 해당 적음).

## 8. Scheduled Job / 중복 실행 방지 (§24/§25)
- Job별 개별 전환(Report/Export/Aggregation/AI Summary/Alert/Automation Eval/Backfill/Reconciliation). 기존 Job ‖ 신 Job **동시 발송/실행 금지**.
- **중복 차단**: 보고서/이메일/Alert/CRM Action/예산변경/Segment/Export/Webhook. **Idempotency Key + Execution Ownership**(기존 OpenPlatform outbox·journey_node_sent 멱등 승계).

## 9. AI / Recommendation / Automation Cutover (§26~31)
- **AI**(§26): 내부→Admin Preview→병행 비교→제한 Tenant→전체 Read-only. Context=Metric ID/Version/Q/T/C/Freshness/Warning/Lineage/Limitations.
- **Recommendation**(§27): 기존 대비 차이·수·방향·Confidence·근거·잘못된 확대/중단 검증·고위험=승인형 유지.
- **Automation Preview**(§28)→**Execution**(§29): AUTOMATION_READY·최신데이터·Q/T/C 통과·Tenant 일치·Target Preview·Approval·Budget/Freq/Suppression·Idempotency·**Kill Switch·Audit·Rollback/보상**·Canary 실행이력.
- **Kill Switch**(§30): 전체/Tenant/Workspace/Workflow/Metric/Version/Channel/Campaign/Action Type 즉시중단+감사(신설).
- **보상조치**(§31): 외부 채널 Action 완전 Rollback 불가(발송 이메일·변경 예산·중지 Campaign·생성 Audience)→Reverse/Compensating Action·Manual Review·Budget Restore·Campaign Re-enable·Audience Removal·Incident.

## 10. Monitoring / SLO / Error Budget / Incident / DR (§32~42)
- **Alert**(§32): Metric Difference↑·Formula Version 불일치·Freshness↓·Q/T Gate 실패·Low Confidence↑·Query Error↑·Latency↑·Cache Drift·Cross-Tenant Block·Permission Deny↑·Fallback↑·Automation Block/Target 차이·Report 실패·Job 중복.
- **Dashboard**(§33)·**SLO**(§34, ★**정확성 SLO를 성능보다 낮게 취급 금지**)·**Error Budget**(§35, 소진 시 신규 전환 중단).
- **Incident**(§36/§37): SEV1(Cross-Tenant/PII/대규모 오자동화/핵심지표 오류/데이터 손실)~SEV4. Runbook 16단계(탐지→Severity→Kill Switch→Rollback/Fallback→RCA→Postmortem→PM).
- **DR**(§38~42): Semantic Service/Analytics DB/Cache/Registry/MV/Currency/KG/Queue/Region 장애 대비. 복구=Legacy Route·Snapshot·Registry 복구·Cache 재구축·SoT 직접조회·KG Projection 재구축·Job Replay·Metric Backfill·PITR. **RPO/RTO Consumer별**(자동화/Billing 엄격). **Backup**: Registry/Formula/Contract/Version/Flag/Routing/MV정의/Cache정책/Job/Automation Contract/Approval/ADR/PM. **복구 테스트 실제 수행**(문서만=준비완료 아님 §42).

## 11. 데이터 정정 / 고객 커뮤니케이션 / 안정화 / Legacy (§43~48)
- **Backfill**(§43): 영향 기간/Metric/Consumer/Tenant·재계산·Cache 무효화·Report/AI 재생성·Automation 영향·Corrected Version·Audit.
- **고객 안내**(§44): 지표정의 변경·과거값 수정·Report 재발송·Export 변경·자동화 오실행·장기 장애·격리 사고 → 고객 영향+조치 명확히.
- **안정화**(§45/§46): Legacy Fallback 유지·변경동결·강화 모니터링. 통과=SEV1/2 0·Unexplained 0·Cross-Tenant 0·Golden 지속통과·SLO·Automation 오실행 0·Report/Export 일치.
- **Legacy 유지/제거**(§47/§48): Fallback/Read Compare/Compatibility/Historical/Incident 용도로 유지. **제거 금지 조건**: Fallback 미검증·Historical 재현 불가·일부 Tenant 의존·Consumer 미전환·Rollback 미검증·안정화 미완·Audit/Billing 의존·미설명 차이. 무기한 금지·Part3 인증 후 Deprecated.

## 12. §57 완료 보고 수치
Production Readiness 대상=핵심 Metric 14 · **Shadow 통과 0·Canary 통과 0·Limited Production 0·Production Active 0·Stable 0·Rolled Back 0**(구현 전) · Blocked=전부(BLOCKED_PENDING_IMPLEMENTATION + BLOCKED_FORMULA ROAS + BLOCKED_SOURCE 채널/재고회전) · High/Critical Risk 대상=자동화/Billing/예산 · Automation Preview 통과 0·Execution 승인 0 · Incident 0(전환 없음) · Rollback 테스트=dist.bak 절차 검증됨(기존)·Semantic 롤백 미실행 · DR 테스트=미실행(사양 완성) · SLO/Error Budget=사양 정의 · 문서=본 마스터+ADR+PM · ★**남은 리스크=Semantic Layer+Feature Flag+Kill Switch+Shadow 인프라 구현이 모든 전환의 선결** · **EPIC03-D Part3(Enterprise Certification·Governance·Sign-off·Recurrence Prevention) 준비 완료(단 실 구현 선결)**. 코드변경 0.
