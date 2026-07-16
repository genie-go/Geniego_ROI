# EPIC 05-C — Customer Identity Resolution Engine, Profile Assembly, Query Layer & Consumer Enforcement (정식 마스터)

> **근거**: 05-A(Inventory)·05-B [`CANONICAL_CUSTOMER_PROFILE_SCHEMA.md`](CANONICAL_CUSTOMER_PROFILE_SCHEMA.md)(Schema/Governance) + 실코드(crm_customers·Union-Find·merge/unmerge·isMarketingSendAllowed·소비처). **비파괴**: 실행 계층 설계·Engine/Query/Consumer Enforcement·통합계획만. 코드변경 0. 전체 고객 일괄 Merge·Customer ID 폐기·Legacy 삭제·미검증 Profile 자동화·소급 귀속 없음(§69).
> **§70 통합**: ~57개 파편 대신 본 마스터가 Source Ingestion·Normalizer·Candidate/Match Engine·Conflict/Manual Review·Link/Merge/Unmerge/Split Orchestrator·Identity Graph Projection·Profile Assembly·Golden Record·Temporal·Consent/Suppression/Eligibility Resolver·Event Link/Re-attribution·Derived Pipeline·360 Query Layer·Consumer Enforcement(CRM/Segment/Audience/AI/Recommendation/Automation)·Wrong-target·삭제/정정 전파·Reconciliation·Shadow/Golden/Test를 통합. ADR=[`../architecture/ADR_CUSTOMER_IDENTITY_EXECUTION.md`](../architecture/ADR_CUSTOMER_IDENTITY_EXECUTION.md).

---

## 0. ★정직 프레이밍 (부분 실동작)
AI Memory와 달리 **일부 실동작**: Identity Resolution(Union-Find CRM:600)·확률병합(CRM:848)·**Unmerge(CRM:913)**·발송게이트(isMarketingSendAllowed CRM:1118)=VALIDATED_LEGACY(확장). **미구현/설계(PLANNED)**: 단일 Identifier Normalizer·**Customer 360 Query Layer**(소비처 crm_customers 직접조회)·Consumer Enforcement·PII Masking·Wrong-target Prevention·consent 실행시점 identity 재평가. → Engine 확장 + Query Layer 신설. **Production 0**(05-B Critical[동의확대] 미해소·구현 전).

## 1. Source Ingestion (§4~6)
- **Contract(§5)**: ingestion_event_id·tenant/workspace/brand/store·source_system·**source_account_id**·connector·credential_reference·external_profile_id·source_version·payload_reference·occurred/received_at·environment·**idempotency_key**·deletion_signal·consent_payload. **Credential/Secret Profile 저장 금지**.
- **단계(§4)**: Connector 인증→Scope→Source Account→Schema/Idempotency→Environment→**Mock/Demo 판정**→PII 분류→Source Profile 저장→Identifier 추출→정규화→Consent/Suppression 추출→**Identity Candidate Event 발행**→Audit. **Idempotency(§6)**=tenant+source+account+external_profile_id+version(웹훅 재전송/재시도 중복 방지).
- 기존 배선: ChannelSync recordCrmPurchase(CRM 유입)·PixelTracking syncToCRM. **Adapter 자체 Match/Merge 금지**(§7).

## 2. Identifier Normalizer (§7~10) — ★단일화
- **Canonical Normalizer**(Email/Phone/External/Cookie/Device/CRM/Commerce): normalized_value·normalization_version·validation_status·warning·sensitivity·match_eligibility. → 05-A 해시 3종 불일치 통일(pixel/attribution/review 단일 Hash Version).
- **Email(§9)**: domain 소문자·Unicode·공백 제거·**Plus/Gmail Dot 자동병합 금지**·Private Relay 표시·공용/Disposable 탐지·Hash Version. **Phone(§10)**: E.164·국가코드·Extension 분리·Verification·재사용/VoIP 위험·Hash Version.

## 3. Candidate / Match Engine (§11~18) — 기존 확장
- **Candidate Generation(§11)**: 강한 Identifier Exact·인증 Login·Source/CRM Link·Commerce/Payment 관계·Anonymous-to-Known·Graph·제한 Fuzzy. candidate_id·signals·method·preliminary_score·expiry. **Blocking(§12)**: Tenant+Verified Email/Phone Hash·Source Account+External ID(**Tenant Scope 없는 Global Blocking 금지**).
- **Match Rule Engine(§13)**: Registry(rule_id·version·allowed/required_signals·threshold·auto_link/merge_eligible·tests·status). **하드코딩 Rule 분산 금지**. 기존 scoreIdentityPair(CRM:750) 래핑.
- **Probabilistic/Model(§14)**: model_version·feature_set·calibration·FP/FN rate·fairness·rollback·evidence. **모델 점수만으로 자동 Merge 금지**.
- **Signal 강도(§15)**: STRONG(Authenticated Link·Verified Email+Scope·Source Explicit·CRM Verified)·MEDIUM(Commerce ID+결제·Verified Email/Phone 단독)·WEAK(Name/Address/Device/Cookie/IP/Behavioral). **Result(§16)**: NO/POSSIBLE/PROBABLE/DETERMINISTIC/EXACT_VERIFIED/CONFLICT/MANUAL_REVIEW/BLOCKED. **Confidence(§17)**: match_score·identity_confidence·source_reliability·evidence_strength·conflict/freshness_penalty·**shared_identifier_risk**·merge_eligibility(별도 산출).
- **Conflict Detection(§18)**: 동일 Verified Email 복수 Person·Phone 재사용·다른 Tenant/Source Account·이름/Account 충돌·Consent 충돌·Deleted/Anonymized·Demo/Prod·**Shared Device·B2B 공용·Household**.

## 4. Manual Review / Link / Merge / Unmerge (§19~26)
- **Manual Review Queue(§19)**: candidate·identifiers·signals·confidence·conflicts·source timeline·consent/segment/automation impact·approve/reject/merge/keep separate/request evidence·audit.
- **Auto Link Gate(§20)**: Scope·허용 Rule·Confidence·Conflict 없음·비삭제·비Demo·Evidence 완전·Rule Version·Golden 통과·Audit.
- **★Auto Merge Gate(§21)**(Link보다 엄격): 강한 Signal 조합·동일 Tenant·Source Account 검증·높은 Identity Confidence·**Consent 독립 유지**·Shared Identifier 위험 없음·**Unmerge 가능**·영향 계산 완료·Flag·Dry Run·Rollback·Audit. **합성 buyer_email(05-A HIGH)=자동 Merge 금지**.
- **Merge Dry Run(§22)**: 병합 Profile·Golden 값·충돌 Attribute·Consent/Suppression·영향 Event/Order/Segment/Audience/LTV/Attribution/Recommendation/Automation·Rollback 가능성·Warning.
- **Merge Orchestrator(§23)**: Case Lock→Scope 재검증→Snapshot(Consent/Source/Identifier/Event/Segment)→Target 선정→Identity Link 갱신→**Golden 재계산**→Temporal→Consent Projection 재계산→Event 재귀속→Derived 재계산 요청→Segment 재평가→AI/Recommendation Cache 무효화→Automation Eligibility 재평가→Audit. 부분실패 보상.
- **Concurrency(§24)**: 동일 Profile 동시 Merge·Merge+Delete·Merge+Consent Update·Merge+Unmerge 방지(Lock).
- **Unmerge Orchestrator(§25)**(기존 CRM:913 확장): 원본/Identifier 복원·Event 재귀속·Consent 복원·Attribute Version 복원·Segment/Metric/Attribution 재계산·Automation 보상·Cache 무효화·Audit. **Split/Re-link(§26)**: 공용 Profile 분리·잘못 연결 Identifier 분리·B2B 역할 분리·Household 분리.

## 5. Identity Graph / Profile Assembly / Golden Record / Temporal (§27~31)
- **Graph Projection(§27)**: Canonical Link만 KG graph_node/edge(02-B) 투영·Node/Edge Version·Tenant Scope·Valid Time·Confidence·Status·**비공식 Link 생성 금지**.
- **Profile Assembly(§28)**: Source Profiles+Verified Identifiers+Active Links+**Golden Record**+Temporal+Lifecycle+Consent+Suppression+Derived/Predicted+Quality/Trust/Freshness+Merge History.
- **Golden Record Resolver(§29/§30)**: 속성별 Source Authority→Verification→User Confirmation→Admin Override→Recency→Valid Time→Quality→Conflict/Null Policy→Sensitivity. 응답=selected_value/source/verification/effective_time/confidence/conflict/alternatives/explain/lineage. **전체 Source 우선순위 금지**.
- **Temporal(§31)**: 과거 시점 Profile 재현(이름/주소/Lifecycle/Consent/Suppression/Loyalty/Golden 선택).

## 6. Consent / Suppression / Eligibility / Event / Derived (§32~37)
- **Consent Resolver(§32)**(isMarketingSendAllowed 확장·identity 차원): 입력 Person/Purpose/Channel/Brand/Region/Policy Version/Time→출력 eligibility_status·consent_source/version·restriction·suppression·valid_until·explain. **Suppression Resolver(§33)**: Legal>Global DNC>Spam>Hard Bounce>Brand/Channel Unsub>Frequency>Manual>Fraud(**Consent Granted여도 우선**).
- **★실행 시점 재평가(§3.5)**: Assembly 시 계산된 과거 Eligibility 영구 신뢰 금지·Segment/Audience/Recommendation/Automation 실행 시 최신 Consent/Suppression 재확인.
- **Eligibility Projection(§34)**: email/sms/push/personalized_ads/profiling/recommendation/retargeting/automation_eligible(Policy Version+계산 시각).
- **Event Link(§35)**: 우선순위 Authenticated Person>Verified Source Profile>Deterministic Identifier>Anonymous-to-Known>제한 Candidate(**낮은 Confidence Candidate 영구 귀속 금지**). **Re-attribution(§36)**: Merge/Unmerge 후 Window·Locked Period·Metric Recalc·Idempotency·Backfill·Rollback.
- **Derived(§37)**: Semantic Layer/Model Registry 공식 결과 참조(metric/model_version·window·confidence·freshness·expiry·explain·lineage). **프론트/Consumer 직접 LTV/Churn 계산 금지**(03-C 정합).

## 7. Customer 360 Query Layer (§38~46) — ★단일 진입점
- **16계층(§38)**: Auth→Actor→Tenant/Workspace/Brand Scope→Consumer Contract→Permission→Profile Resolver→Identity Resolver→Attribute Resolver→Consent/Suppression Resolver→Derived Resolver→**Masking**→Response→Explain/Lineage→Audit→Cache→Monitoring. **UI/CRM/Segment/AI/Automation의 DB/Graph/Source 직접 조합 금지**.
- **Contract(§39)**: consumer/purpose/tenant/workspace/brand·actor·profile_id·identifiers·requested_attributes·include(identifiers/links/timeline/consents/predictions/explain/lineage)·as_of_time·**masking_level**.
- **목적(§40)**: PROFILE_UI/CRM/SEGMENT/AUDIENCE/ANALYTICS/AI_INSIGHT/RECOMMENDATION/DECISION/AUTOMATION_PREVIEW/EXECUTION/SUPPORT/EXPORT/ADMIN_AUDIT/COMPLIANCE. **조회 수준(§41)**: AGGREGATE/PSEUDONYMOUS/MASKED/OPERATIONAL/FULL/SENSITIVE_RESTRICTED(최소 수준만).
- **Search(§42)**: Canonical/Source Profile ID·Verified/Masked Identifier·CRM/Commerce ID·Consent/Lifecycle/Segment(PII Search=별도 권한·Rate Limit·Audit). **Timeline(§43)**: Identity/Profile/Consent/Order/Refund/Touchpoint/Support/Recommendation/Automation/Merge Events(Source/Time/Scope 표시). **Explain(§44)**: 왜 같은 고객·Match Rule/Evidence·Golden 선택·Consent 산출·Derived·Merge/Unmerge·기여 Source.
- **Cache(§45/§46)**: Key=tenant/workspace/brand/consumer/purpose/permission_version/profile_id/profile_version/identity_version/consent_version/suppression_version/attribute_version_set/as_of_time/masking_level. 무효화=Attribute/Identifier/Link/Merge/Consent/Suppression/Derived/Permission/Deletion/Correction 변경.

## 8. Consumer Enforcement (§47~54) — 현 우회 → CONSOLIDATION

| Consumer | 현행 | Canonical 전환 |
|---|---|---|
| CRM/Segment/Audience | ★crm_customers 직접조회 | Query Layer+Attribute Version·Consent·Identity Confidence·Evaluation Time |
| AI(ClaudeAI:703) | ★raw email 프롬프트 | 최소 속성·Masked Identifier·Consent 결과·Confidence(전체 Raw PII 금지) |
| Recommendation | 직접 | Identity Confidence·최신 Consent/Suppression·Prediction Confidence·Sensitive 제한·Explain |
| Automation(발송 채널) | isMarketingSendAllowed | Preview+Execution Gate(§53) |

- **Automation Preview(§52)**: 대상/제외 Profile·Consent/Suppression/Low Confidence/Stale 제외·중복 제거·Channel Mapping 실패·예상 Action·차이. **Execution Gate(§53)**: Canonical Profile·Verified Destination Identifier·최신 Consent·Suppression·Identity Confidence·Freshness·Segment/Audience Version·Frequency·Preview·Approval·Kill Switch·Rollback/보상.
- **★Wrong-target Prevention(§54)**: 대상 Profile ID·Destination Identifier·Source Account·Channel·Consent·Suppression·Merge 상태·Identity Version·Audience Snapshot·**실행 시점 Eligibility**. Merge/Unmerge 직후 Automation Cooldown.

## 9. 삭제/정정 전파 / Reconciliation (§55~57)
- **Deletion 전파(§55)**: Profile Query 차단·Identifier Tombstone·Identity Link 해제·Segment/Audience 제거·**AI Memory 연계 제거**·Vector/Graph/Search·Cache·Recommendation/Automation 차단·Backup Suppression·**Re-ingestion 차단**. **Correction 전파(§56)**: Verification·Candidate·Link·Golden·Consent·Segment·Derived·AI/Recommendation/Automation·Cache 재평가.
- **Reconciliation(§57)**: Source vs Canonical Profile·Identifier vs Graph·Consent vs Eligibility·Profile vs Search/Cache·Merge Case vs 상태·Deleted vs 잔존·Segment vs Current Eligibility·Source Account Mapping·Mock/Demo Flag.

## 10. Observability / Shadow / Test (§58~66)
- **Metrics(§58)**: Ingestion/Identifier/Candidate/Match 분포/Auto Link/Merge/Manual Review/Conflict/Unmerge/**Cross-Tenant Block/Source Account Block/Consent Block/Suppression Block**/Query Latency/Event Re-attribution/Automation Block/Deletion Lag/Reconciliation Drift. **Audit(§59)**: match_rule/model_version/confidence/merge_case/consent_result/suppression_result(PII 원문 복제 금지).
- **Shadow/Read Compare(§61/§62)**: 기존 Customer/CRM/Segment ‖ Canonical → Profile Count/Identifier/Merge/Golden/Consent/Suppression/Segment/Audience/AI Context/Automation/PII 노출 비교 → MATCH/EXPECTED_DEDUP/SCOPE/CONSENT/SUPPRESSION/MERGE 보정/LEGACY_DEFECT/CANONICAL_DEFECT/**UNEXPLAINED**(Production 차단).
- **Golden Dataset(§63)**: Verified Email·공용 Email 분리·재사용 Phone 분리·Guest·Login Link·Anonymous-to-Known·**Shared Device·B2B 공용·Cross-Tenant 동일 ID·Wrong Merge·Unmerge·Split·삭제 재유입·Automation 차단** 26 시나리오. **Fallback(§66)**: 검증 Legacy Read·Source Read-only·Cached Snapshot·Pseudonymous·개인화 제한·Automation 차단(오래된 Profile 최신인 척 금지).

## 11. 기존 경로 분류 (§67) & §75 완료 보고
- Union-Find/확률병합/Unmerge/isMarketingSendAllowed=**CANONICAL_IDENTITY_ENGINE(확장)**·crm_customers=CANONICAL_PROFILE·소비처(CRM/Segment/AI/발송)=**CONSOLIDATION_REQUIRED**(Query Layer 편입)·Normalizer/Query Layer/Wrong-target=UNVERIFIED(신설).
- 수치: Source Adapter 다수 · Identifier Normalizer=1(단일화 목표) · Match Rule=Registry화(기존 scoreIdentityPair 래핑) · Auto Merge=강신호 한정 · **Cross-Tenant/Source Account Block 테스트=사양(기존 tenant 격리 PASS·구현 후)** · Wrong-target=사양 · Shadow/Golden=계획 · **Unexplained Difference 0** · Production 승인 0(구현·05-B Critical 해소 전) · 문서=본 마스터+ADR+PM · 남은리스크=Query Layer/Consumer Enforcement/Normalizer/consent 실행시점/PII Masking 구현·동의확대 해소 · **EPIC05-D(Final Validation·Production Certification·Governance·Recurrence Prevention) 준비 완료**. 코드변경 0.
