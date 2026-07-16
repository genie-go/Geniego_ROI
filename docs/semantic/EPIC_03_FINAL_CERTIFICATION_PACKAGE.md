# EPIC 03-D Part 3 — Enterprise Certification, Governance, Sign-off & Permanent Recurrence Prevention (정식 마스터)

> **근거**: Part 1(Final Audit)·Part 2(Cutover/DR) + 03-A/B/C + 기존 거버넌스(docs/registry 19개·`CHANGE_GATE.md`·`CONSTITUTION.md`). **비파괴**: 인증·거버넌스·재발방지·Sign-off만. 코드변경 0.
> **§49 통합**: 34개 파편 대신 본 마스터가 Certification Policy/Registry/Levels/Approval·Sign-off·Version Lock·Change Request·New Metric/Consumer Gate·Duplicate Prevention·CI/Release Gate·Revocation/Recert·Legacy Gate·History/Agent/Repeat Problem·Root Cause·Drift·Health·Dashboard·Doc/PM/Evidence Governance·최종 패키지를 통합. ADR=[`../architecture/ADR_SEMANTIC_ENTERPRISE_CERTIFICATION.md`](../architecture/ADR_SEMANTIC_ENTERPRISE_CERTIFICATION.md).
> **중복금지 배선**: 병렬 거버넌스 신설 금지 → 기존 `docs/registry/`(DuplicatePreventionLog·RepeatedDefectHistory·RootCauseAnalysis·DecisionLog·PMApprovalHistory)·`CHANGE_GATE.md`·`PM_CHANGE_HISTORY.md`에 Semantic Governance를 편입.

---

## 0. ★정직 프레이밍 (인증의 정점)
Part 1/2 결과: **Semantic Query Layer 실 구현 미존재**. 따라서:
- **어떤 Metric/Consumer도 ENTERPRISE_CERTIFIED(Level 6) 불가**. 최대 **Level 1(CONTRACT_VERIFIED, 설계)** 또는 기존 SSOT 실존분은 **Level 2(IMPLEMENTATION_VERIFIED)**. Golden/회귀/Shadow/Canary 미실행이라 Level 3+ 불가.
- **EPIC 03 = 거버넌스·설계 프레임워크 완성으로 Sign-off**. **Production Certification은 BLOCKED_PENDING_IMPLEMENTATION**. "완료" 오선언 금지(§3.1).
- 본 Part 3의 실질 가치 = **Version Lock·Change Gate·재발방지·영구 Claude Code 규칙**(즉시 유효·기존 코드에도 적용).

## 1. Certification Registry Matrix (§50 — 정직 수준)

| Cert ID | Target | Version | Level | Status | Regression | Production | 비고 |
|---|---|---|---|---|---|---|---|
| CERT-METRIC-000001 | MET-ADJROAS-000006(adj ROAS) | v1 | **L2**(SSOT 실존 AutoCampaign:680) | CONDITIONALLY_CERTIFIED | 미실행 | 미실행 | 자동화 사용 중·Golden 전 |
| CERT-METRIC-000002 | MET-REV-000001(Net Revenue) | v1 | L2(Pnl:100) | CONDITIONALLY_CERTIFIED | 미실행 | 미실행 | — |
| CERT-METRIC-000003 | MET-COGS/LTV/VAT | v1 | L2 | CONDITIONALLY_CERTIFIED | 미실행 | 미실행 | SSOT 실존 |
| CERT-METRIC-000004 | MET-ROAS-000003(Blended) | v1 | L1 | **BLOCKED_FORMULA** | — | — | 프론트 avg-of-ratios 버그 |
| CERT-DIM-000001 | DIM-CHANNEL | — | L1 | **BLOCKED_SOURCE** | — | — | 방향 상충 |
| CERT-CONSUMER-* | UI/API/AI/Automation | — | L1 | NOT_CERTIFIED(설계) | — | — | Layer 미구현 |
| CERT-RELEASE-000001 | EPIC03 Governance Framework | v1 | — | **FRAMEWORK_SIGNED_OFF** | — | — | 거버넌스만 |

**Enterprise Certified = 0 · Production Certified = 0 · Conditionally Certified(L2 SSOT) = 3군.**

## 2. Certification Levels / Status (§7/§8)
- L0 DOCUMENTED→L1 CONTRACT_VERIFIED→L2 IMPLEMENTATION_VERIFIED→L3 REGRESSION_VERIFIED→L4 SECURITY&PERF→L5 PRODUCTION_VERIFIED→**L6 ENTERPRISE_CERTIFIED**. 자동화 실행 최소 수준=L6+AUTOMATION_READY.
- 현 최고 도달=**L2**(기존 SSOT 실존). L3부터는 Golden/회귀 실행(구현 종속).

## 3. 승인자 체계 (§10/§11) — GeniegoROI 매핑
- 실 조직=사용자(PM role 위임)+Claude Code. **분리 원칙**: Architecture/Data/Analytics/QA/Security 관점을 Claude Code가 증거로 제시→**PM(사용자)이 최종 Sign-off**(feedback_pm_operational_rules). 형식적 단독승인 금지(증거 기반).

## 4. 최종 Sign-off Gate (§12) — 현 판정
| 게이트 | 상태 |
|---|---|
| Registry/Formula/Source/Consumer 일치 | ✓(문서)·✗(실행 미연결) |
| Golden/Historical Regression 통과 | **✗ 미실행(구현 전)** |
| Unexplained Difference 0 | ✓ |
| Cross-Tenant/Security/Performance | 설계·01-D 승계·실테스트 미실행 |
| Shadow/Canary/Cutover/안정화 | **✗ 미실행** |
| Rollback/DR 검증 | dist.bak 기존 검증·Semantic 미실행 |
→ **Enterprise Certification 미부여**(정직). 거버넌스 프레임워크만 Sign-off.

## 5. Formula & Version Lock (§13)
- **Lock 대상**: Metric/Formula ID·Version·분자/분모·Grain·Aggregation·Filter·Time/Currency/Refund·SoT·Consumer Contract·Automation Threshold Unit. **변경=신 Version**(기존 직접수정 금지). **현 Lock 후보**: L2 도달 SSOT(adj_roas·Net Revenue·COGS·LTV·VAT)를 Version Lock 등재(기존 산식 변경 시 Change Request 강제).

## 6. Change Governance (§14~16) — CHANGE_GATE 편입
- **Change Request** 필수(ID·대상·현/제안 Version·영향[UI/API/Report/AI/Automation/Historical/Security]·Migration/Rollback/테스트/승인). **분류**: PATCH(표시)·MINOR(호환 확장)·**MAJOR(Formula/Grain/의미/Source/Currency/Time/Attribution=기존 Version 직접수정 금지)**.
- **Emergency Change**(보안/Cross-Tenant/PII/핵심지표 오류/자동화 오실행)=Change ID+Incident ID+임시조치+Rollback+사후 ADR+재인증. → 기존 `CHANGE_GATE.md`·`docs/registry/DecisionLog.md` 편입.

## 7. New Metric / Consumer Gate (§17/§18)
- **신규 Metric**: Metric Registry 검색→Alias→기존 Version/Dimension 확장 가능성→Formula 재사용→별도 의미 필요성→SoT/Grain/Time/Currency/Refund→Consumer→AI/Automation→테스트→Owner→ADR→PM. 하나 불충분=생성 금지.
- **신규 Consumer**: Consumer Contract(목적/Metric/Version/Dimension/Grain/Filter/Permission/Freshness/Confidence/Fallback/Explain/Lineage/테스트/Owner) 없이 공식 Metric 사용 금지.

## 8. 중복/기능후퇴 방지 & CI/Release Gate (§19~28)
- **중복 방지(§19)** & **기능 후퇴 Gate(§21)**: Registry 외 Metric/Formula·UI/SQL/Report/Automation/AI Prompt 자체계산·Version 없는 사용·Deprecated/Blocked 참조·Metric/Dimension/Filter/Explain/Lineage/Confidence/Permission/Fallback/Test 감소 → 탐지·Merge 차단.
- **CI Merge Gate(§25)**: Semantic Registry/Formula Validation·Duplicate Scan·Contract/Golden/Tenant Isolation/Permission/Regression Test·Lint·Deprecated Check·**PM Change Entry Check**. ★**현실**: 리포지 CI는 시크릿 미등록으로 inert(빌드만)·Semantic Lint 미구현 → **PLANNED**(CI 활성화·Lint 배선이 선결). 기존 `.github/workflows/deploy.yml` 확장(중복 워크플로 금지).
- **Release Gate(§27)**+**Post-Release Audit(§28)**: Merge Gate·Flag·Shadow/Canary·Rollback·Monitoring·PM Sign-off / Release 후 실 Version·Route·값·Error·Tenant·Automation 검증.

## 9. Revocation / 재인증 / 정기검토 (§29~32)
- **Revocation**: Formula/Consumer/Source Drift·Cross-Tenant·Security·Unexplained·Golden/Regression 실패·SLO 위반·자동화 오실행·Evidence 손상.
- **재인증 필요**: MAJOR Formula·Source/Grain/Currency/Time/Attribution/ER/Tenant/Permission/Consumer 경로/Cache/Analytics Engine/Automation Execution 변경.
- **정기 검토**: Registry/Drift/Data Quality/SLO/Incident/Deprecated/Legacy·위험등급별 주기(고위험 자동화/Billing 짧게).

## 10. Legacy Deprecation / 제거 Gate (§33/§34)
- **Deprecation 전**: 모든 Consumer 전환·안정화·Fallback 대체·Historical 재현·Rollback 검증·Support 이슈 0·Unexplained 0·Audit/Billing 의존 해소·PM 승인·제거 일정.
- **제거 전**: 호출부 재검색·Runtime 로그·Flag·Fallback·Historical·Backup·Removal/Regression Test·Rollback·PM 승인·Registry 상태변경·제거 후 모니터링. **현 Legacy(RoiService 등) 제거=금지**(Semantic 미구현·Fallback 필수).

## 11. 재발 방지 & 이력 (§35~39) — 기존 Registry 편입
- **History 영구보존(§35)**: Definition/Formula/Version/Certification/Revocation/Incident/Rollback/Migration/Deprecation/Approval History·Evidence·ADR·PM. 삭제/덮어쓰기 금지.
- **Agent Execution History(§36)**: 본 288차 EPIC 작업(조회 Registry·변경 파일·중복검사·기능후퇴 검사·미완료) = `PM_CHANGE_HISTORY.md`+본 문서에 기록.
- **Repeat Problem(§37)** & **Root Cause(§38)** & **Recurrence Test(§39)**: → 기존 `docs/registry/RepeatedDefectHistory.md`·`RootCauseAnalysis.md`·`RegressionHistory.md` 편입. ★**등재 대상(288차 확정 재발성)**: ROAS 산식 분산(Root=Formula 분산·Consumer 자체계산)·채널 정규화 방향 상충(Root=Registry 미조회·Formula 분산). 재발 방지 테스트=구현 시 Golden/Regression 연결.

## 12. Drift / Health / Dashboard / Alert (§40~43)
- **Drift 상시 탐지(§40)**: Formula/Metric/Term/Consumer/Source/Version/Cache/Report/AI Context/Automation/Translation/Tooltip Drift → 발견 시 인증 재평가.
- **Registry Health(§41)**·**Governance Dashboard(§42)**·**Alert(§43)**: Certified 수·Level 분포·Expiring·Drift·Unmanaged Consumer·Deprecated·Blocker·Repeat Problem·SLO·PM 승인 대기. Critical 결함=점수 무관 차단.

## 13. Documentation / PM / ADR / Evidence Governance (§44~47)
- 문서 실코드 일치(ID/Version/Owner/Status/Evidence/Related Code/Test/ADR/Last Reviewed)·중복 문서 통합(본 EPIC 03 전 마스터가 실천). PM(§45)·ADR(§46 MAJOR 필수)·Evidence 보존(§47).

## 14. EPIC 03 최종 Certification Package (§48) — 구성 확인
Semantic Inventory(03-A)·Canonical Vocabulary(03-A)·Metric Contract(03-B)·Formula Governance(03-B)·Semantic Query Layer(03-C)·Consumer Enforcement(03-C)·Final Audit(P1)·Drift Audit(P1)·Golden/Regression 사양(P1)·Shadow/Canary/Cutover/Rollback/DR 프레임워크(P2)·Certification Matrix(P3)·Governance/CI/Release Gate(P3)·Legacy Plan(P3)·Recurrence Prevention(P3)·ADR(15+)·PM History·**Sign-off(프레임워크)**. → **전 구성요소 문서 존재·비파괴·코드변경 0.**

## 15. 영구 규칙 (§56/§57) — CLAUDE.md/CONSTITUTION 배선 대상
**신규 Metric/Formula/Version/Dimension/Grain/Revenue·Cost 정의/Currency·TZ/Attribution·MMM/Dashboard 지표/Report·Export 산식/AI Context/Recommendation 근거/Automation Metric·Threshold/Cache·MV/Legacy 제거 전 → Semantic Governance 통과 필수**(Registry·Contract·Certification·Regression·Security·PM 조회). **모든 Claude Code 에이전트 작업 시작 전 §57 12개 Registry 조회**(Metadata·CE·REL·KG·Term·Metric·Formula·Consumer·Certification·Repeat Problem·ADR·PM). 조회 없이 동일 기능 재구현·Certified 기능 단순화/교체/삭제·Legacy+Canonical 동시 쓰기 금지. → docs/registry/README SSOT 매핑에 편입.

## 16. §54 완료 보고 수치
전체 Semantic 대상 다수 · L1 인증(설계) 다수 · **L2 인증 3군**(adj_roas/Net Revenue·COGS/LTV/VAT SSOT 실존) · L3~L5 0 · **Enterprise Certified 0** · Conditionally Certified 3 · Suspended 0·Revoked 0 · Recertification Required 0 · Locked Formula 후보 5(L2 SSOT) · 신규 Metric Gate=정의(차단 도구 PLANNED) · Duplicate 탐지 5·Function Regression Gate=정의(CI PLANNED) · **Open Repeat Problem 2**(ROAS 산식·채널 방향→RepeatedDefectHistory 편입) · Recurrence Test=구현 종속 · Legacy Deprecation 대상=RoiService 등(제거 금지·Semantic 미구현) · CI Gate=inert(시크릿 미등록·Lint 미구현→PLANNED) · Release Gate=정의 · 문서=본 마스터+ADR+PM · ★**EPIC 03 Sign-off = 거버넌스/설계 프레임워크 SIGNED_OFF·Production Certification BLOCKED_PENDING_IMPLEMENTATION** · **EPIC 04-A(AI Memory Inventory·Scope·Privacy·Architecture Baseline) 준비 완료**. 코드변경 0.

## 17. ★EPIC 03 최종 Sign-off 판정 (정직)
- **SIGNED_OFF**: Canonical Vocabulary·Metric Contract·Formula Governance·Semantic Query 설계·Consumer Enforcement 설계·Final Audit·Drift 관리·Rollback/DR 프레임워크·Certification 체계·Version Lock·Change/New Metric/Consumer Gate·재발방지·영구 규칙 = **문서·거버넌스 완성**.
- **BLOCKED(미완)**: Semantic Query Layer 실 구현·Golden/Historical Regression 실행·Shadow/Canary/Cutover·CI Lint 배선·ROAS 버그 수정·채널 SSOT·재고회전. → **실 Production은 구현+자격증명+빌드+배포 승인 후**.
- **결론**: EPIC 03은 **"Enterprise Semantic Governance Framework" 수준에서 완결**(무후퇴·비파괴·코드변경 0). Production Semantic Layer는 후속 구현 EPIC(승인 시)로 이관.
