# EPIC 05-D Part 3 — Customer Identity Enterprise Certification, Governance, Sign-off & Permanent Recurrence Prevention (정식 마스터)

> **근거**: Part 1(Final Audit)·Part 2(Cutover/DR) + 05-A/B/C + 기존 거버넌스(docs/registry·`CHANGE_GATE.md`·`CONSTITUTION.md`·`RepeatedDefectHistory.md`). **비파괴**: 인증·거버넌스·재발방지·Sign-off만. 코드변경 0.
> **§56 통합**: ~44개 파편 대신 본 마스터가 Certification Policy/Registry/Levels/Approval·Sign-off·Version Lock·Change/New Source/Identifier/Rule/Model/Auto Merge/Consumer Gate·Segment/Audience/Automation Expansion·Duplicate/Regression Gate·CI/Release Gate·Suspension/Recert·Legacy/Migration Gate·History/Agent/Repeat Problem·Root Cause·Drift·Health·Dashboard·Doc/PM/Evidence Governance·최종 패키지를 통합. ADR=[`../architecture/ADR_CUSTOMER_IDENTITY_ENTERPRISE_CERTIFICATION.md`](../architecture/ADR_CUSTOMER_IDENTITY_ENTERPRISE_CERTIFICATION.md).
> **중복금지 배선**: 병렬 거버넌스 신설 금지 → 기존 docs/registry(DuplicatePreventionLog·RepeatedDefectHistory·RootCauseAnalysis·DecisionLog·PMApprovalHistory)·CHANGE_GATE·PM_CHANGE_HISTORY에 Customer Identity Governance 편입.

---

## 0. ★정직 프레이밍 (라이브 legacy + Canonical 미구현)
고객 엔진은 **운영 라이브**(AI Memory 전무와 대조): crm_customers·Union-Find·확률병합·Unmerge·발송게이트=일부 L2-3 실동작. **Canonical 업그레이드(360 Query Layer·Consumer Enforcement·consent identity·Normalizer·Wrong-target·PII Masking)=미구현**. 따라서:
- **Enterprise Certified(L6) 0**(Canonical 미완·Identity Accuracy 미측정·05-B Critical 미해소). **라이브 legacy 부분=최대 CONDITIONALLY_CERTIFIED(L2-3, 알려진 Blocker 동반)**.
- **EPIC 05 = Customer Identity Governance Framework 완성으로 Sign-off**. **Canonical Production=BLOCKED_PENDING_IMPLEMENTATION**.
- 실질 가치 = **Version Lock·Change/New Gate·재발방지·영구 Claude Code 규칙 + 확정 결함 백로그**(즉시 유효).

## 1. Certification Registry Matrix (§57 — 정직 수준)

| Cert ID | Target | Level | Status | 비고 |
|---|---|---|---|---|
| CERT-CUST-STORE-000001 | crm_customers(라이브) | L2-3 | **CONDITIONALLY_CERTIFIED** | tenant 격리 PASS·PII Masking X |
| CERT-CUST-RULE-000001 | Union-Find(phone/kakao 자동) | L3 | CONDITIONALLY_CERTIFIED | Precision 미측정·Kill Switch 없음 |
| CERT-CUST-MERGE-000001 | 확률병합(승인)+Unmerge | L3 | CONDITIONALLY_CERTIFIED | evidence/version·Dry Run 없음 |
| CERT-CUST-CONSENT-000001 | isMarketingSendAllowed | L2 | **BLOCKED_CONSENT** | identity 차원 없음(동의확대) |
| CERT-CUST-QUERY-000001 | 360 Query Layer | L1 | **NOT_CERTIFIED** | 미구현 |
| CERT-CUST-AUT-000001 | Wrong-target/Automation | L1 | **BLOCKED_WRONG_TARGET** | 미구현 |
| CERT-CUST-RELEASE-000001 | EPIC05 Governance Framework | — | **FRAMEWORK_SIGNED_OFF** | 거버넌스만 |

**Enterprise Certified 0 · Production Certified 0 · Conditionally Certified(라이브 L2-3) 3.**

## 2. Certification Level / Status / 승인체계 (§7~11)
- L0 DOCUMENTED→L1 SCHEMA→L2 IMPLEMENTATION→L3 IDENTITY&PRIVACY→L4 REGRESSION&RESILIENCE→L5 PRODUCTION→**L6 ENTERPRISE_CERTIFIED**. 현 최고=L3 부분(라이브 identity resolution·PII/consent 결함으로 L3 미완).
- **승인체계**: Architecture/Customer Data/Identity Resolution/Privacy/Security/QA/AI·Model/PM/Automation Risk/Operations 관점을 Claude Code 증거→**PM(사용자) 최종 Sign-off**. 형식 단독승인 금지.

## 3. 최종 Sign-off Gate (§12) — 현 판정
| 게이트 | 상태 |
|---|---|
| Cross-Tenant Link/Merge 0 | ✅(CRM:851) |
| Identity Accuracy/Auto Merge Precision 기준 | ✗ 미측정(라벨 Dataset) |
| Consent/Wrong-target/PII Masking | ✗(identity 차원·Wrong-target·Masking 미구현) |
| Golden/Historical Regression/Shadow/Canary | ✗ 미실행(Canonical 미구현) |
→ **Enterprise Certification 미부여**(정직). 거버넌스 프레임워크만 Sign-off.

## 4. Schema·Rule·Policy·Version Lock (§13)
- Lock 대상: Customer Entity/Schema Version·Identifier Type·Normalization Version·Match Signal/Rule/Model Version·Threshold·Auto Link/Merge Eligibility·Merge/Unmerge/Golden Record/Consent/Suppression Policy·Query Contract·Wrong-target Policy·Kill Switch Policy. **현 Lock 후보**: 라이브 L2-3(crm_customers 스키마·Union-Find rule·isMarketingSendAllowed 순서·Unmerge)를 Version Lock 등재(변경 시 Change Request 강제).

## 5. Change Governance (§14~16) — CHANGE_GATE 편입
- **Change Request** 필수(대상·현/제안 Version·영향[Source Account/Tenant/Brand/Profile 수/Identifier/Match Precision/Merge/Unmerge/Consent/Suppression/Segment/Audience/Automation/Wrong-target]·Migration/Re-resolution/Reindex/Rollback/테스트/승인). **분류**: PATCH·MINOR·**MAJOR(의미/Identifier/Normalization/Match Signal/Threshold/Model/Auto Merge 기준/Golden Record/Consent·Suppression/SoT/Query/Segment·Audience Eligibility/Automation Targeting=신 Version)**. **Emergency**(Cross-Tenant/Cross-Source Account/PII/Wrong-target/대규모 FP Merge/Unmerge 실패/Consent 철회 대상 실행/삭제 고객 재등장)=Change ID+Incident ID+Kill Switch+사후 ADR+재인증. → 기존 CHANGE_GATE/DecisionLog 편입.

## 6. New Source/Identifier/Rule/Model/Auto Merge/Consumer + Expansion Gate (§17~24)
- **New Source(§17)/Identifier(§18)/Rule(§19)/Model(§20)**: Registry 검색·중복·Source Account 식별·Scope·Consent/Suppression Mapping·Precision/Recall·FP Risk·Golden·ADR·PM. **Model=타 고객사 식별 데이터 혼합 금지**.
- **★New Auto Merge Gate(§21)**: Rule/Model Enterprise Certification·최고 신뢰 Signal·Source Account Scope·Conflict/Shared Identifier/Deleted Exclusion·**Consent 독립 유지**·Merge Dry Run·Unmerge 검증·Golden·Restricted Canary·Daily Limit·Sampling·**Kill Switch·Rollback·Cooldown**.
- **New Consumer(§22)·Segment/Audience(§23)·Automation Expansion(§24)**: Profile Access Level·PII·Scope·Identity Confidence·Consent·Suppression·**Wrong-target 검증**·Verified Destination Identifier·Preview·Kill Switch·재인증.

## 7. 중복/기능후퇴 방지 & CI/Release Gate (§25~34)
- **중복 방지(§25)**·**기능 후퇴 Gate(§27)**: Registry 외 Entity/비공식 Store/Resolver·Customer DB 직접조회·무Scope Query·이메일/전화 단독 자동 Merge·Audit 없는 Merge/Unmerge·Wrong-target 검증 없는 Action·Search/Timeline/Consent/Suppression/Unmerge/PII Masking/Wrong-target/Kill Switch/Test 감소 → 탐지·Merge 차단.
- **CI Merge Gate(§31)**: Customer Registry/Schema Validation·Duplicate Store/Resolver·Direct Customer Store Access·Source Account Scope/Normalization/Match Rule/Model/FP/Auto Merge Gate/Merge·Unmerge/Consent/Suppression/Deletion/Re-ingestion/Query/PII Masking/Segment·Audience/Wrong-target/Golden/Historical Regression Test·PM Change Entry·**Repeat Problem Reference**. ★**현실**: CI 시크릿 미등록 inert+Customer Lint 미구현 → **PLANNED**(deploy.yml 확장·중복 워크플로 금지).
- **Release Gate(§33)**+**Post-Release Audit(§34)**: Merge Gate·Certification·Flag·Shadow/Canary·Auto Merge 제한·Kill Switch·Rollback·**Identity Safety Alert**·PM Sign-off / Release 후 실 Version·Auto Merge 범위·Match Precision·Consent·Wrong-target Block·Identity Safety SLO 검증.

## 8. Suspension / 재인증 / 정기검토 / Legacy / Migration (§35~41)
- **Suspension/Revocation(§35)**: Cross-Tenant Link/Merge·Source Account 혼입·FP Merge 초과·Auto Merge Precision 저하·Unmerge 실패·Consent/Suppression Drift·Deleted 사용·Re-ingestion 실패·**Wrong-target 실행**·PII 노출·Golden 실패·Identity Safety SLO 위반·반복 재발.
- **재인증(§36)/정기검토(§37)/만료(§38)**: Schema MAJOR·Identifier/Normalization/Match/Model/Threshold/Auto Merge/Golden/Consent/Query/Segment·Audience/Automation 변경. 고위험(Auto Merge/Model/Consent Resolver/Audience Upload/Automation Execution/Deletion) 짧은 주기.
- **Legacy(§39/§40)/Migration(§41)**: 제거 전 모든 Consumer 전환·**Consent/Suppression·Unmerge·Deletion 재현**·Rollback·Backup·Removal/Regression Test. **현 Legacy 제거 금지**(Canonical 미구현·라이브 운영 중).

## 9. 재발방지 & 이력 (§42~46) — 기존 Registry 편입
- **History 영구보존(§42)**: Entity/Schema/Identifier/Normalization/Match/Rule/Model/Identity Link/Merge·Unmerge/Golden/Consent·Suppression/Query/Segment·Audience/Certification/Suspension/Incident/Privacy Incident/**Wrong-target Incident**/Rollback/Recovery/Legacy History·Evidence·ADR·PM. 삭제/덮어쓰기 금지.
- **Agent Execution History(§43)**: 본 288차 Customer EPIC 작업 = PM_CHANGE_HISTORY+본 문서.
- **Repeat Problem(§44)/Root Cause(§45)/Recurrence Test(§46)**: → 기존 RepeatedDefectHistory/RootCauseAnalysis 편입. ★**등재 대상(288차 확정 고객 결함)**: **①병합 시 동의확대(Root=Consent 게이트가 customer_id·identity 차원 아님)②합성 buyer_email 오병합(Root=email 없는 주문 name@channel.noemail 합성키·동명이인 미구분)③PII 무마스킹(Root=column-level RBAC 부재)④정규화 3종 불일치(Root=저장 시 미정규화·소비처별 재정규화)⑤DSAR 병합형제 누락(Root=email/phone 매칭·identity_id 미기반)⑥라이브 phone/kakao 자동병합 Kill Switch 부재(Root=resolveIdentitiesForTenant 즉시실행)**. 재발 방지 테스트=구현 시 Match Precision/Consent/Wrong-target/Deletion Test 연결.

## 10. Drift / Health / Dashboard / Doc·PM·Evidence Governance (§47~54)
- **Drift 상시탐지(§47)**: Schema/Store/Source Account/Identifier/Normalization/Match Signal/Rule/Model/Threshold/Identity Link/Merge State/Golden/Consent/Suppression/Deletion/Re-ingestion/Query/Segment/Audience/CRM/AI/Automation/Wrong-target Guard Drift → 인증 재평가.
- **Registry Health(§48)·Governance Dashboard(§49)·Alert(§50)**: Certified·Level 분포·Expiring·**Auto Merge Precision·FP Merge·Wrong-target Block·Deleted Block·Re-ingestion Block**·Legacy·Blocker·Repeat Problem·Identity Safety SLO·PM 승인대기. Critical=점수 무관 차단.
- **Doc/PM/ADR/Evidence Governance(§51~54)**: 문서 실코드 일치·중복 통합·PM(§52)·ADR(§53 MAJOR 필수)·Evidence 보존(§54).

## 11. EPIC 05 최종 Certification Package (§55) — 구성 확인
Customer Inventory(05-A)·Architecture Baseline(05-A)·Canonical Schema(05-B)·Identifier Registry(05-B)·Identity Graph(05-B)·Match Rule/Model Governance(05-B)·Merge/Unmerge Governance(05-B/C)·Golden Record(05-B/C)·Consent/Suppression(05-B/C)·360 Query Layer 설계(05-C)·Segment/Audience/CRM/AI/Automation Enforcement(05-C)·Wrong-target(05-C)·Final Audit(P1)·Identity Accuracy Baseline(P1·미측정)·Golden/Regression 사양(P1)·Shadow/Canary/Cutover/Rollback/Kill Switch/DR 프레임워크(P2)·Certification Matrix(P3)·Governance/CI/Release Gate(P3)·Legacy Plan(P3)·Recurrence Prevention(P3)·ADR(10+)·PM History·**Sign-off(프레임워크)**. → **전 구성요소 문서 존재·비파괴·코드변경 0.**

## 12. 영구 규칙 (§63/§64) — CLAUDE.md/CONSTITUTION 배선 대상
**신규 Customer Source/Identifier/Normalization/Match Rule/Model/Threshold/Auto Link·Merge 확대/Merge·Unmerge/Golden Record/Consent·Suppression/Query/Segment·Audience/CRM/AI/Automation 확대/Deletion·Correction/Legacy 제거/Migration 전 → Customer Identity Governance 통과 필수**. **모든 Claude Code 에이전트 Customer Identity 작업 전 §64 18개 Registry 조회**(Metadata·CE·Customer Entity·Store·Source/Source Account·Identifier·Normalization·Match Signal/Rule/Model·Identity Link·Merge/Unmerge·Golden Record·Consent/Suppression·Consumer·Certification·Repeat Problem·ADR·PM·Agent Execution History). 조회 없이 동일기능 재구현·Certified 단순화/교체/삭제·Legacy+Canonical 동시 장기 Write 금지. → docs/registry/README SSOT 매핑 편입.

## 13. §61 완료 보고 수치
전체 인증 대상=Entity/Store/Identifier/Rule/Model/Consumer 다수 · L1(설계) 다수 · **L2-3 라이브 3(crm_customers/Union-Find/확률병합+Unmerge)** · L4~L5 0 · **Enterprise Certified 0** · Conditionally Certified 3 · Locked Schema/Rule/Policy 후보 3 · 신규 Source/Identifier/Rule/Model/Auto Merge Gate=정의(차단 도구 PLANNED) · Duplicate Store 탐지=Identity 4파편 · Function Regression Gate=정의(CI PLANNED) · **Open Repeat Problem 6**(동의확대·합성 buyer_email·PII 무마스킹·정규화·DSAR 병합형제·라이브 자동병합 Kill Switch→RepeatedDefectHistory 편입) · Recurrence Test=구현 종속 · Legacy Deprecation 대상=현 제거 금지(라이브) · CI Gate=inert/PLANNED · **Auto Merge Precision 미측정** · Wrong-target Incident 0(미구현) · 문서=본 마스터+ADR+PM · ★**EPIC05 Sign-off=Customer Identity Governance Framework SIGNED_OFF·Canonical Production BLOCKED_PENDING_IMPLEMENTATION** · 다음 권장 EPIC06-A(Segmentation/Audience). 코드변경 0.

## 14. ★EPIC 05 최종 Sign-off 판정 (정직)
- **SIGNED_OFF**: Customer Inventory·Architecture Baseline·Canonical Schema·Identity Graph·Match/Merge/Unmerge Governance·Golden Record·Consent/Suppression·360 Query 설계·Consumer Enforcement·Wrong-target·Final Audit·Rollback/DR 프레임워크·Certification 체계·Version Lock·Change/New Gate·재발방지·영구 규칙 = **문서·거버넌스 완성**.
- **BLOCKED(미완)**: Canonical Engine 업그레이드(360 Query Layer·Consumer Enforcement·consent identity·Normalizer 통일·Wrong-target·PII Masking) 실 구현·Golden/Regression·Shadow/Canary/Cutover·CI Lint·**라이브 자동병합 Kill Switch**·Identity Accuracy Dataset. → 후속 구현 EPIC(승인 시).
- **★핵심 잔여 결함(실코드 백로그·즉시 유효)**: ①병합 시 동의확대②합성 buyer_email 오병합③PII 무마스킹(ClaudeAI raw email)④정규화 3종 불일치⑤DSAR 병합형제 누락⑥라이브 phone/kakao 자동병합 Kill Switch 부재. = Canonical CDP 구현과 별개로도 **우선 처리 백로그**(자격증명·구현 시).
- **결론**: EPIC 05는 **"Customer Identity Governance Framework" 수준에서 완결**(무후퇴·비파괴·코드변경 0). 라이브 crm_customers/CRM은 legacy로 계속 운영.
