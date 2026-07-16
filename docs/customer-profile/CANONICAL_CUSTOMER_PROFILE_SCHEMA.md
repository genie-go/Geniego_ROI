# EPIC 05-B — Canonical Customer Profile Schema, Identity Graph, Merge·Unmerge & Consent Governance (정식 마스터)

> **근거**: 05-A [`CUSTOMER_PROFILE_ARCHITECTURE_BASELINE.md`](CUSTOMER_PROFILE_ARCHITECTURE_BASELINE.md)(기존 CDP·Risk) + EPIC 01(Customer=crm_customers SSOT)·02(KG graph_node/edge)·03(Semantic)·04(AI Memory). **비파괴**: Schema·Registry·Governance·통합계획만. 코드변경 0. 기존 고객 병합·Customer ID 교체·Store 삭제·미검증 Link 활성 없음.
> **§59 통합**: ~57개 파편 대신 본 마스터가 Entity Model·Profile Schema·ID/Version·Source Profile·Identifier/Normalization·Anonymous·Identity Link/Graph/Match·Merge/Unmerge/Split·Golden Record·Temporal·Consent/Suppression/Eligibility·Attribute·Event·Deletion/Anonymization/Correction·AI/Automation Eligibility·Validator/Guard/Lint·Store 분류/Migration을 통합. ADR=[`../architecture/ADR_CANONICAL_CUSTOMER_PROFILE.md`](../architecture/ADR_CANONICAL_CUSTOMER_PROFILE.md).
> **재사용 원칙**: crm_customers(Profile Primary)·Union-Find/확률병합·Unmerge·isMarketingSendAllowed·PreferenceCenter·DSAR **확장**(중복 CDP 신설 금지). 05-A Critical(동의확대) 해소 전 운영 승인 금지.

---

## 1. Canonical Entity Model (§4)
`PERSON·CUSTOMER_PROFILE·COMPANY·ACCOUNT·HOUSEHOLD·CONTACT_ROLE·ANONYMOUS_VISITOR·DEVICE·SESSION·IDENTIFIER·IDENTITY_LINK·SOURCE_PROFILE·CONSENT_RECORD·SUPPRESSION_RECORD·CUSTOMER_ATTRIBUTE·CUSTOMER_EVENT_REFERENCE·MERGE_CASE·UNMERGE_CASE·IDENTITY_CONFLICT`.
- **매핑**: CUSTOMER_PROFILE=crm_customers(확장)·IDENTITY_LINK=crm_identity_merge_link+attribution_identity_link(확장)·ANONYMOUS_VISITOR=pixel_sessions·CONSENT=crm_channel_prefs(identity 승격)·SUPPRESSION=isMarketingSendAllowed 소스. **PERSON은 crm_customers.identity_id 승격**(현 identity_id를 Person Canonical로). Company/Account/Household=신설(B2B 미구현). **PLATFORM_USER(app_user)=별개 Entity**(§3.4).

## 2. Customer ID / Profile Version (§5/§6)
- **Canonical ID**: `customer_profile_id`·`person_id`(UUID/ULID·Tenant Scope 별도·Source ID 분리·재사용 금지·Merge 후 이전 ID 보존·Unmerge 시 복원). **외부 채널/CRM/Commerce Customer ID를 Canonical ID 사용 금지**(§3.2, Identifier로 관리).
- **Profile Version**: profile_version_id·previous·effective_from/to·change_type·change_reason·changed_by·change_request. 현재상태 덮어쓰기 금지(과거 재현).

## 3. Canonical Profile 필수필드 (§7)
`customer_profile_id·person_id·tenant_id·workspace_id·brand_id·store_id·profile_type·profile_status·lifecycle_stage·primary_language·timezone·reporting_currency·country·region·data_classification·identity_confidence·identity_status·quality/trust_score·freshness_status·first/last_seen_at·first/last_purchase_at·created/updated/deleted/anonymized_at·schema_version·profile_version_id`. **민감 PII를 Profile 루트에 무분별 복제 금지**(Identifier/Attribute로).

## 4. Source Profile & Identifier Schema (§8~12)
- **Source Profile(§8)**: source_profile_id·tenant/workspace/brand/store·source_system·**source_account_id**·connector·external_profile_id·raw/normalized_reference·environment·deletion_status·lineage. (채널별 고객 객체=원본 보존).
- **Identifier(§9)**: identifier_id·type·**canonical_normalized_value**·hashed_value·original_value_reference·verification_status·source_account_id·external_identifier_id·tenant/workspace/brand·person_id·profile_id·valid_from/to·confidence·quality·sensitivity·consent_scope·status·deletion_status·lineage.
- **Type(§10)**: EMAIL·PHONE·CRM_CONTACT_ID·COMMERCE_CUSTOMER_ID·MARKETPLACE_BUYER_ID·LOYALTY·SUBSCRIPTION·PAYMENT·APP_USER_ID·ANONYMOUS·COOKIE·DEVICE·ADVERTISING·SESSION·HASHED_EMAIL·HASHED_PHONE·CLICK·EXTERNAL_ACCOUNT_SCOPED.
- **Scope(§11)**: Unique Key=`tenant+source_system+source_account_id+type+normalized_value/external_id+environment`. **외부 ID 글로벌 Unique 가정 금지**.
- **★Normalization(§12) 통일**: Email(공백/Unicode/domain 소문자·**Plus/Gmail Dot 자동병합 금지**·Private Relay 구분·Hash Version)·Phone(**E.164**·국가코드·Extension 분리·재사용 위험·Hash Version)·Address(국가별·배송/청구 구분·Household Match 직접사용 제한). → 05-A 해시 3종 불일치 통일(저장 시 정규화).

## 5. Anonymous & Anonymous-to-Known (§13/§14)
- **Anonymous Profile(§13)**: anonymous_profile_id·domain/app·anonymous_id·cookie/device·session_ids·consent_context·expires_at·bot_status·deletion_status. **Anonymous ID를 영구 Person ID 사용 금지**.
- **Link(§14)**: anonymous↔person·link_signal/evidence/confidence·rule_version·**unlinked_at/reason**(가역).

## 6. Identity Link / Graph / Match (§15~21)
- **Identity Link Schema(§15)**: identity_link_id·left/right_entity·link_type·**match_method·match_rule_id·model_version·evidence·confidence**·status·valid_from/to·verified_by·revoked_at·lineage. ★**05-A Merge evidence/version 소실 해소**(reasons·version 컬럼 신설).
- **상태(§16)**: CANDIDATE/EXACT/DETERMINISTIC/PROBABLE/POSSIBLE_MATCH/CONFLICT/MANUAL_REVIEW/MANUALLY_VERIFIED/ACTIVE/REVOKED/SUPERSEDED/DELETED/BLOCKED.
- **Match Signal Registry(§17)**: Verified Email/Phone(강)·Authenticated Login(강)·CRM/Commerce/Payment ID(강)·Shared Device/Address/Name/Behavioral(약). Strength·Verification·False Pos/Neg Risk·Allowed Merge Use. **약한 Signal 단독 자동 Merge 금지**.
- **Method(§18)**: EXACT/DETERMINISTIC/PROBABILISTIC/FUZZY/GRAPH_ASSISTED/MODEL/MANUAL/SOURCE_PROVIDED/AUTHENTICATED. **Confidence(§19)**: Match Score≠Source Reliability≠Identity Confidence≠Merge Eligibility≠Automation Eligibility(단일숫자 금지).
- **Identity Graph(§20/§21)**: Node(Person/CustomerProfile/SourceProfile/Identifier/Anonymous/Device/Session/Company/Account/Household)·Edge(HAS_IDENTIFIER·REPRESENTED_BY_SOURCE·**POSSIBLY_SAME_AS·VERIFIED_SAME_AS**·BELONGS_TO_ACCOUNT·MEMBER_OF_HOUSEHOLD·USED_DEVICE·LINKED_FROM_ANONYMOUS·MERGED_INTO·CONSENTED_FOR·SUPPRESSED_FOR). **KG graph_node/edge(02-B) 확장·Cross-Tenant Edge Runtime 차단**·Graph는 PII 저장소 아님.

## 7. Merge / Unmerge / Split (§22~28)
- **Merge Case(§22)**: merge_case_id·source_profile_ids·target·merge_reason/method·rule/model_version·evidence·confidence·**affected(entities/events/orders/consents/segments/recommendations/automations)**·initiated/approved_by·rollback_reference·audit. 상태(§23) PROPOSED~ROLLED_BACK.
- **자동 Merge Gate(§24)**: 동일 Tenant·**강한 Match Signal**·Source Account 일치·높은 Confidence·Conflict 없음·삭제 아님·**Consent 미병합**·Shared Device 위험 없음·Golden 통과·Rule Version 고정·**Unmerge 가능·Rollback**. ★**합성 buyer_email(05-A HIGH)=약한 Signal→자동 Merge 금지·Manual Review**.
- **Manual Review(§25)**: 공용 이메일·재사용 전화·가족 디바이스·B2B 공용 Contact·이름/주소만 유사·Confidence 중간·Source/Consent 충돌·삭제 이력·High-value·고위험 Automation 대상.
- **Unmerge Case(§26/§27)**: 원본 복구·Identifier 분리·Event 재귀속·Consent 원상복구·Segment/LTV/CAC/Attribution 재계산·Automation 정정·Cache/Index 무효화. (기존 identityUnmerge CRM:913 확장).
- **Split/Re-link(§28)**: 공용 회사 이메일·가족 계정·Shared Device→하나의 Source Profile이 여러 Person 포함 가능→Split·Re-link Workflow 별도.

## 8. Golden Record / Attribute / Temporal (§29~32)
- **Golden Record(§29)**: **속성별 Resolver**(전체 Source 우선순위 금지). Attribute별 Source Priority·Verification Priority·Recency·User-entered·Admin Override·Null/Conflict Policy·Expiry·Lineage·Sensitivity·AI/Automation Eligibility.
- **Attribute Type(§30)**: RAW·NORMALIZED·DERIVED·**PREDICTED**·MANUAL_OVERRIDE·USER_CONFIRMED·SYSTEM_INFERRED. **Predicted를 Raw Fact처럼 사용 금지**.
- **Temporal(§31)**: attribute_value_id·valid_from/to·observed/recorded_at·verification·confidence·superseded_by·lineage. **Profile 상태(§32)**: ANONYMOUS~BLOCKED(Lifecycle Stage≠Data Processing Status 분리).

## 9. Consent / Suppression / Eligibility (§33~38) — ★05-A CRITICAL 해소
- **Consent Schema(§33)**: consent_id·**person_id**·customer_profile_id·tenant/workspace/**brand**·source_account·**purpose**·channel·status·consent_version·**policy_version**·captured_at·proof·valid_from/to·withdrawn_at·**jurisdiction·processing_restriction·data_sharing_scope**. ★**Identity(person_id) 차원 승격**(병합 시 동의확대 해소·05-A CRITICAL). 상태(§34) UNKNOWN/NOT_REQUIRED/PENDING/GRANTED/DENIED/WITHDRAWN/EXPIRED/RESTRICTED/BLOCKED(**Unknown≠Granted**).
- **Consent Resolution(§35)**: Purpose/Channel/Brand/Region/Policy Version/Timestamp/Source Authority/Withdrawal/Legal 충돌 시 **가장 보수적 상태**.
- **Suppression(§36/§37)**: subject·channel·purpose·type. 우선순위 Legal Block>Global DNC>Spam>Hard Bounce>Channel/Brand Unsub>Frequency>Manual. ★**Consent Granted여도 Suppression 우선**.
- **Eligibility Projection(§38)**: email/sms/push/personalized_ads/profiling/automation_eligible(목적별). **Source Consent 대체 아님**(AI/Segment/Automation이 원본 직접해석 금지).

## 10. Event / Derived Attribute (§39~41)
- **Event Link(§39)**: event_id·anonymous_id·source_profile_id·profile_id·person_id·link_method/confidence·event/processing_time·consent_context·identity_version·lineage.
- **Re-attribution(§40)**: Merge/Unmerge 시 과거 Event 재귀속(영향 기간/Type/Rule Version/재계산 Metric/Segment/Attribution/Automation/Audit).
- **Derived Attribute(§41)**: LTV/Churn/Propensity=metric/model_version·input_period·confidence·freshness·expires·explain·lineage·ai/automation_eligibility.

## 11. Quality / AI / Automation Eligibility (§42~46)
- **Quality(§42)**·**Trust/Confidence(§43)**: Quality(데이터)≠Trust(Source)≠Identity Confidence(동일인)≠Prediction Confidence(예측) 혼용 금지.
- **AI Use(§44)**: AI_ALLOWED/**WITH_MASKING**/AGGREGATE_ONLY/RESTRICTED/BLOCKED/CONFIRMATION_REQUIRED. ★**민감 PII 전체 AI Context 전달 금지**(05-A HIGH PII 무마스킹 해소·ClaudeAI raw email→Masking).
- **Recommendation(§45)**: Identity Confidence·Consent·Suppression·Prediction Confidence·Sensitive 제한·Fairness·Explain·User Control.
- **Automation(§46)**: ALLOWED/PREVIEW_ONLY/APPROVAL/BLOCKED. **기본 차단**: Low Identity Confidence·Consent Unknown·Suppressed·Deletion Pending/Deleted/Anonymized·Conflict·Test/Demo·Source Account 불명확·Stale·**Predicted만으로 고위험 Action**.

## 12. Deletion / Anonymization / Correction (§47~49)
- **Deletion Workflow(§47)**: REQUESTED→IDENTITY_VALIDATION→PROCESSING_RESTRICTED→PROFILE_DISABLED→PRIMARY_DELETED→IDENTIFIERS_PURGED→**IDENTITY_LINKS_REVOKED**→EVENTS/SEGMENTS/AUDIENCES/**AI_MEMORY**/VECTOR/GRAPH/SEARCH/CACHE_PURGED→AUTOMATION_DISABLED→BACKUP_SUPPRESSION→COMPLETED. ★**05-A DSAR 병합형제 누락 해소=identity_id 기반 삭제**(email/phone 매칭 아님).
- **★삭제 Profile 자동 재병합 금지(§3.8)**: Tombstone·Restore Suppression(기존 Identifier/Event로 재생성/재병합 차단).
- **Anonymization(§48)**: 직접식별자 제거·Identifier Link 제거·재식별 위험 검토·법정보존 최소 식별자(주문 등 별도). **Correction(§49)**: Source of Truth·신규 Version·Identity 재평가·Merge/Consent 영향·Golden 재계산·재귀속.

## 13. Validator / Runtime Guard / Static Lint (§50~52)
- **Validator(§50)**: Entity Type·Tenant/Workspace/Brand/Source Account Scope·Identifier Type·Normalization Version·Consent·Classification·Identity Confidence·Duplicate·Conflict·Deleted/Anonymized·Demo/Test·Eligibility.
- **Runtime Guard(§51)**: **Cross-Tenant Profile Link·삭제 Profile 재병합·Demo/Prod 병합·Consent Unknown 발송·Suppressed 자동화·Low Confidence 자동 Merge·Unmerge 불가 Merge·Customer ID 단독 무Scope 조회·타 계정 Webhook 귀속·Mock Customer 운영 분석** 차단.
- **Static Lint(§52)**: Tenant Filter 없는 Customer Query·Source Account Scope 없는 External ID·비공식 Customer Table/Resolver·**이메일/전화 단독 자동 Merge**·Consent/Suppression 우회·Deleted Profile 사용·**AI Context Raw PII**·Automation Identity Confidence 미검증.

## 14. 기존 Store 분류 / Migration (§53/§54)

| Store | Canonical Role | Migration | 
|---|---|---|
| crm_customers | CANONICAL_PROFILE_PRIMARY | person_id 승격·workspace/brand·version 컬럼 |
| crm_identity_merge_link | CANONICAL_IDENTITY_STORE | **evidence/version 컬럼 추가** |
| crm_channel_prefs | CANONICAL_CONSENT_STORE | **identity(person) 차원·purpose/brand 분리** |
| pixel_sessions/attribution_identity_link | CANONICAL_SOURCE(익명/cross-device) | crosswalk 연결 |
| app_user | KEEP_SEPARATE(Platform User) | — |
| (신설) Identifier/Source Profile/Identity Graph crosswalk | CANONICAL(신규) | 신설 |

- **Migration(§54)**: Source ID 보존·Scope 검증·Normalization·Consent/Suppression Mapping·**자동 Merge 제한**(기존 병합 재검증)·Conflict 생성·Deleted/Anonymized 보존·Mock 제외·Checksum·Rollback·Shadow Compare. **Compatibility(§55)**: 기존 Customer/CRM/Segment/Profile UI/Merge/Consent API Adapter 점진(즉시제거 금지).

## 15. §65 완료 보고 수치
Canonical Entity Type 19 · Profile 필드 ~35 · Identifier Type 21 · Match Signal ~10 · Match Method 9 · Identity Link Type ~13 · 자동 Merge Rule=강신호 한정·Manual Review Rule ~12 · Merge/Unmerge Workflow 각1(Case) · Attribute Type 7 · Consent Purpose(Registry·현 채널5+토픽4→purpose/brand 확장) · Suppression Type ~10 · AI Allowed=Masking 기본 · Automation Blocked 다수 조건 · Existing Canonical Store 5+신설 3 · **Migration Required 3**(crm_customers person_id·merge_link evidence·consent identity 차원) · Duplicate=Identity 4파편→crosswalk 통합 · Runtime Guard ~13·Static Lint ~15 · Golden Dataset 시나리오 ~24 · 보안/Unmerge/삭제 Test=사양 · 문서=본 마스터+ADR+PM · 남은리스크=동의 identity 승격 구현·정규화 통일·PII Masking·crosswalk·자동병합 재검증 · **EPIC05-C(Identity Resolution Engine·Profile Assembly·Query Layer·Consumer Enforcement) 준비 완료**. 코드변경 0.
