# Segmentation, Audience & Cohort Platform — Inventory & Canonical Baseline

> **EPIC 06-A Part 1** — Enterprise Segmentation, Audience & Cohort Inventory, Eligibility, Consent, Channel Mapping & Data Isolation Baseline
> **일자**: 289차 (2026-07-16) · **상태**: Inventory 확정 (비파괴 — 코드변경 0) · **성격**: 실제 코드 기준 전수 조사(정직 — 없는 구조는 없다고 기록)
> **근거 산출**: 4개 병렬 감사 에이전트(Segment 엔진·Audience 목적지·Consent/Suppression·Cohort/소비자/AI). 모든 주장 `file:line`.
> **통합 원칙**: EPIC 06-A §75가 열거한 70개 세부 문서는 헌법 **중복금지·통합**(feedback_no_duplicate_features)·EPIC00 Ch1 선례(기존 레지스트리 매핑)에 따라 **본 마스터 문서의 섹션·매트릭스로 통합**한다. 리스크·아키텍처는 형제 문서 [`SEGMENT_RISK_REGISTER.md`](SEGMENT_RISK_REGISTER.md)·[`SEGMENT_ARCHITECTURE_BASELINE.md`](SEGMENT_ARCHITECTURE_BASELINE.md). ADR=[`../architecture/ADR_SEGMENTATION_ARCHITECTURE_BASELINE.md`](../architecture/ADR_SEGMENTATION_ARCHITECTURE_BASELINE.md).

---

## 0. 핵심 요약 (Executive)

GeniegoROI에는 성급히 교체할 "새 Segment Engine"이 필요하지 않다. **실제로 동작하는 세그먼트/오디언스 인프라가 이미 존재**하며(중복 신설 금지), 이번 단계의 결론은:

1. **"segment"라는 단어가 3개의 서로 다른 도메인**에 존재한다 — 혼동 방지를 위해 Canonical 명칭 분리 필요:
   - **Customer Segment** (`crm_segments`) — 유일한 실 고객 대상 멤버십 엔진.
   - **Decisioning Cohort** (`Decisioning::segments`) — 집계 인구통계 코호트(PII 없음, v418.1).
   - **Growth ICP Persona** (`admin_growth_segment`) — GeniegoROI **자체 B2B 세일즈 페르소나**(tenant 없음, 고객 아님).
2. **Segment Definition ↔ Membership은 물리적으로 분리**되어 있으나(2 테이블), **Version/Snapshot/Evaluation-Time이 전무** → 과거 캠페인 "누가 대상이었나" 재현 불가.
3. **Consent는 빌드 시점이 아니라 발송 시점**에 중앙 게이트 `CRM::isMarketingSendAllowed()`로 적용된다(설계상 타당). 그러나 **일부 발송 경로가 게이트를 우회**(§14 CRITICAL).
4. **Audience 아웃바운드(Meta/Google/TikTok)는 실제 동작·해시전용**이나 **업로드 시 consent 재검증·Removal·Reconciliation이 전무**(§13 HIGH).
5. **phone-키 Suppression/DNC가 존재하지 않음** → SMS/WhatsApp opt-out이 전화번호 미매핑 시 fail-open(§12 CRITICAL).

전부 **후속 EPIC 06-A Part 2(Canonical Segment Schema·DSL·Versioning)** 및 별도 승인 구현세션의 입력자료다. 본 단계는 **코드변경 0**.

---

## 1. Segment ≠ Membership ≠ Audience ≠ Destination Audience (개념 분리 실측)

| 개념 | 실 구현 | 정의 |
|---|---|---|
| **Segment (Definition)** | `crm_segments.rules` (JSON) | 조건 논리 집합. `CRM.php:64` |
| **Segment Membership** | `crm_segment_members` | 특정 시점 산출된 포함 고객. 파괴적 재계산·**버전없음** `CRM.php:1530` |
| **Audience (실행대상)** | (미분리) 발송 시 loop 내 consent 필터 통과분 | 별도 스냅샷 객체 없음 — 멤버십을 발송루프에서 즉석 자격필터 |
| **Destination Audience** | Meta CA/LA·Google user-list·TikTok CA (`AdAdapters`) | 외부 채널로 업로드된 해시 오디언스. `app_setting` 에 audience_id 만 영속 `AdAdapters.php:171-190` |

**핵심 갭**: "Audience"와 "Audience Snapshot"이 독립 엔티티로 존재하지 않는다. 발송 대상은 멤버십을 발송 시점에 즉석 필터링하며, **어떤 고객에게 실제 발송/업로드했는지의 스냅샷이 남지 않는다**(Part 2 설계 대상).

---

## 2. Segment/Cohort Definition & Membership 엔진 인벤토리

### 2.1 `crm_segments` + `crm_segment_members` — ★유일한 실 고객 세그먼트 엔진 (SoT)

| 항목 | 실측 | 근거 |
|---|---|---|
| 테이블 | `crm_segments`(id,tenant_id,name,description,rules TEXT,auto_refresh,member_count,color,created_at,updated_at) + `crm_segment_members`(tenant_id,segment_id,customer_id,added_at; PK(segment_id,customer_id)) | `CRM.php:64-98` |
| Scope | 양 테이블 `tenant_id`(legacy 백필 `1104-1105`) | ✔ 테넌트 격리 |
| **Version/Snapshot** | **없음** — version·snapshot·evaluated_at·definition_hash 컬럼 전무. member_count=비정규화 라이브 카운트 | ❌ CRITICAL 갭 |
| Rule DSL | JSON 평면 술어 `[{field,op,value}]` | `createSegment` `1398` |
| Ops | `gte/lte/gt/lt/eq/ne`(unknown→skip). **AND 전용**(OR·중첩·그룹 없음, `implode(' AND ')` `1591`) | `1563,1591` |
| Fields | ltv/monetary, rfm_f/frequency, recency, rfm_score, grade(string), churn_prob, predicted_clv | `1565-1574` |
| churn/clv | **저장모델 점수 아님** — 인라인 SQL 근사: `churn≈recency/(2×avg_interval)`, `clv≈ltv×(1-churn)`(주석이 "portable 근사"라 명시) | `1548-1552` |
| 평가 | **물질화 배치** — DELETE 전체 후 단일 INSERT…SELECT(crm_customers ⋈ crm_activities 집계, identity_id 통합, 취소/환불 차감) | `1530-1619` |
| Fail-closed | 룰 주어졌으나 유효술어 0 → 멤버 0(전체 테넌트 오발송 방지, 282차 하드닝) | `1587-1590` |
| Triggers | create `1401` · manual refresh `1503` · smart-seed `1450` · **cron** `autoRefreshPredictiveSegments` `1462-1479` · **on-send** `refreshSegmentForSend` `1512-1527`(실패는 삼키고 stale로 발송) | 다중 |
| Consent | **빌드 시 미적용** → 발송 시 per-recipient `isMarketingSendAllowed()` `CRM.php:1118` | §12 |

### 2.2 기타 "segment" 구조 (도메인 상이 — 통합 대상 아님, 명명 분리 대상)

| 구조 | 도메인 | 실측 | 근거 |
|---|---|---|---|
| `admin_growth_segment` | **GeniegoROI 자체 B2B ICP 페르소나** | tenant_id **없음**(admin-global), seg_key/industry/pain_point/est_cac/ltv, 하드코딩 추정치 17개 seed(빈 테이블일 때만), **멤버 테이블 없음** | `AdminGrowth.php:77-86,766-868` |
| `CustomerAI::ltvSegments` | LTV 티어 read-model | 스토어 없음·즉석 GROUP BY CASE(diamond/gold/silver/bronze/new), **집계전용 PII없음**, demo분기 dead | `CustomerAI.php:316-371` |
| `Decisioning::segments` / `segmentAffinity` | 광고/크리에이터 **인구통계 집계 코호트** | ad_insight_agg ⋈ influencer_audience_agg, 휴리스틱 score, **개인기록 없음**(v418.1 확인) | `Decisioning.php:235-347,349+` |
| `AiGenerate::generateSegment` | AI NL→세그먼트 **조언** | 실 Claude 호출이나 **DB 미기록·멤버십 미생성**, size/ltv_estimate=LLM 추정문자열, **정직게이트**(ai_not_configured/ai_generation_failed), **프론트 호출자 없음=고아** | `AiGenerate.php:186-220` |

### 2.3 Cohort — `CRM::cohortRetention`
월별 획득 코호트 리텐션(anchor=created_at 월, 이벤트=purchase, offset 0–11월, distinct 고객). **TZ 정규화 없음·환불 netting 없음·버전/스냅샷 없음**(재계산 결정적이나 point-in-time 재현 불가). `CRM.php:1221-1270`

---

## 3. Rule / Operator / DSL 인벤토리 (§13-15)

- **DSL 형식**: JSON 평면 술어 배열(SQL/그래프/ES 미사용). Client-generated raw SQL 실행 경로 **없음**(화이트리스트 field/op 컴파일만) → 인젝션 안전.
- **미지원(Part 2 설계 대상)**: OR·중첩·그룹, 시퀀스/카운트/집계 조건, 이벤트 기반 조건, consent/suppression/channel-eligibility/identity-confidence 조건, geo/product/campaign/creator 조건, Null/Timezone/Type 정책 명세.
- **Operator 실지원**: 6종(gte/lte/gt/lt/eq/ne)만. §14가 열거한 30+ operator 대비 **대폭 축소**(현 제품 범위 반영 — regression 아님, 미구현).

---

## 4. Attribute / Event / Metric 의존성 (§16-18)

- **Attribute**: crm_customers.ltv·grade + crm_activities 파생(frequency/recency/lifespan). Canonical Customer Profile(EPIC05)의 crm_customers 확장과 정합. **Predicted(churn/clv)는 인라인 SQL 근사**(EPIC03 Semantic Metric Registry의 정본 지표를 재계산 — 중복경로).
- **Event**: `crm_activities.type IN('purchase','refund','email_sent','sms_sent','kakao_sent','whatsapp_sent','push_sent')`. Canonical Event Registry(EPIC) 와의 정합은 Part 2 대상.
- **Metric**: ltv/frequency/recency는 발송용 세그먼트가 **자체 SQL 재계산**(공식 Semantic Metric 미참조) → EPIC03 Semantic Layer 미완결의 파생. Model ID/Version/Freshness/Confidence 미부착.

---

## 5. Membership Store & Evaluation (§20-25)

- **Membership 컬럼 실측**: tenant_id·segment_id·customer_id·added_at **뿐**. segment_version·identity_version·evaluation_time·attribute/metric_version_set·consent_version·reason·lineage·effective_from/to **전무**.
- **평가 방식**: Full Rebuild(파괴적 DELETE+INSERT)만. Incremental/Streaming/Materialized-with-version 없음. 실시간 이벤트 세그먼트 **없음**.
- **Membership 상태**: 단일(존재=INCLUDED). ELIGIBLE/EXCLUDED/STALE/CONSENT_BLOCKED/SUPPRESSION_BLOCKED 등 상태분리 **없음** → 세그먼트 포함 ≠ 발송자격이 데이터로 표현되지 않음(발송루프에서만 판정).

---

## 6. Preview / Count 정확성 (§26-27)

- **Preview UI 없음**: 세그먼트 빌더에 저장전 Preview/Count 없음(`CRM.jsx` SegmentsTab). member_count는 저장 후 실멤버 수.
- **Count 정확성**: identity_id 통합으로 동일인 중복 완화(`1600-1601`). 단 consent/suppressed/deleted 제외 전 카운트라 **"발송가능 수"와 "멤버 수"가 다름**(표시 미구분).

---

## 7. Audience 목적지 동기화 (Outbound) 인벤토리 (§30-41)

### 7.1 실 구현: Meta / Google / TikTok (AdAdapters.php)

| 항목 | 실측 | 근거 |
|---|---|---|
| 진입 | `POST /v421/connectors/audience/sync` → `Connectors::audienceSync` → `AdAdapters::syncAudience`; cron refresh(optimize) `AutoCampaign.php:1565` | `routes.php:940`, `Connectors.php:348` |
| 소스 멤버 | `crm_customers.email` + `channel_orders.buyer_email`, tenant-scoped, cap 10k, demo→[] | `AdAdapters.php:1772-1791` |
| 식별자 | **이메일만**(phone/name/addr 없음). normalize+SHA-256(원문 미전송) | `1784-1785` |
| Meta | 매콜 신규 Custom Audience 생성 + `/users` 5k배치 + Lookalike(ratio 0.01), audience_id 영속 | `1879-1917` |
| Google | Customer Match user-list(CONTACT_INFO, life 540d) + OfflineUserDataJob | `1920-1953` |
| TikTok | 파일 업로드 EMAIL_SHA256 custom audience | `1981-2014` |
| Naver SA/Kakao | **정직 `unsupported` 스텁**(가짜녹색 아님) | `1807-1808` |

### 7.2 Audience Destination Matrix

| 채널 | 소스 | 식별자 | Dest계정 검증 | **Consent 재검증(업로드)** | **Removal** | **Reconciliation** | 실API/스텁 | Cross-account 위험 |
|---|---|---|---|---|---|---|---|---|
| Meta | crm/orders email | SHA-256 | tenant-scoped cred(is_active=1) | ❌ **없음** | ❌ **없음** | ❌ 없음 | 실 | 낮음(동일테넌트 자격 self-consistent) |
| Google | 〃 | SHA-256 | tenant-scoped(customer_id) | ❌ | ❌ | ❌ | 실 | 낮음 |
| TikTok | 〃 | SHA-256 | tenant-scoped(advertiser_id) | ❌ | ❌ | ❌ | 실 | 낮음 |
| Naver/Kakao | — | — | — | — | — | — | unsupported | 없음 |

**구조적 갭**: (a) 업로드 시 consent/suppression 술어 전무(grep opt_in/consent/suppress=0매치) → 동의철회 고객도 해시업로드. (b) `users_remove`/삭제 op 없음 → 세그먼트 이탈·동의철회가 목적지에 전파 안 됨(Google 540일 잔존). (c) 내부수↔목적지보고수 대조 없음. (d) refresh마다 신규 audience 생성 → 이전 audience 고아 누적.

**Cross-tenant 판정**: 업로드는 동일 테넌트 자격증명으로 self-consistent → 잘못된 광고계정 업로드 **모듈 내 도달불가**. 유일 벡터=상위 `tenantId()` 해석(286차 platform_growth 하이재킹 클래스, 이미 수정).

### 7.3 Inbound(대상선정 아님 — 올바른 분류)
`Insights::ingestAdAudience`(ad_audience_breakdowns)·`ingestInfluencerAudience`(influencer_audience_breakdowns)·`Db.php:725` influencer_audience_agg = **인바운드 인구통계 분석**(식별자 업로드 없음). Decisioning 소비.

---

## 8. Consent / Suppression / Eligibility / Frequency (§33-34)

### 8.1 중앙 게이트
`CRM::isMarketingSendAllowed()` `CRM.php:1118` = 채널 opt-out(`PreferenceCenter::isChannelAllowed` 1127) + 토픽 opt-out(1132) + 이메일 하드 suppression(1136) + quiet-hours + frequency cap(1161). **핸들러가 호출해야 적용**.

### 8.2 저장소
| 저장소 | 내용 | 근거 |
|---|---|---|
| `crm_channel_prefs` | consent(채널 email/sms/kakao/whatsapp/push + 토픽 promo/newsletter/product/event `topic:*` + 글로벌 `all`), **opt-out/기본허용** | `PreferenceCenter.php:30,35,64,112-134` |
| `email_suppression` | 하드 suppression(unsubscribe/bounce/complaint), UNIQUE(tenant,email), **실 pre-send 필터** | `EmailMarketing.php:67,653,156-162` |
| freq cap | `CRM::isFrequencyCapped` crm_activities `*_sent`, cross-channel, 기본 4/7d, customer_id>0만 | `CRM.php:1025-1027` |

### 8.3 Consent Send Matrix (채널별 게이트 준수)

| 경로 | Consent 발송시 적용 | Freq | 갭 |
|---|---|---|---|
| Email 캠페인/async/single | ✔ `653,656,739,796` | ✔ | 없음(레퍼런스) |
| SMS 캠페인 dispatch | ✔ `SmsMarketing.php:281` | ✔ `289` | 미매핑 phone fail-open |
| **`/sms/broadcast`** | ❌ **opt-out 우회**(freq만 `506`) | ✔ | **CRITICAL** |
| **`/sms/send`** | ❌ **무조건 발송** `429-464` | ❌ | **CRITICAL** |
| **SMS 인바운드 STOP** | ❌ **무료거부 처리 전무** | — | **CRITICAL**(정통망법) |
| WebPush broadcast | ✔ `WebPush.php:393,436` | ✔ | 익명 subs 테넌트레벨만 |
| WhatsApp broadcast | ✔ `WhatsApp.php:271` | ✔ | 미매핑 phone fail-open |
| **`/whatsapp/send`+`sendOne`** | ❌ **무게이트** `198,402` | ❌ | **CRITICAL** |
| Omnichannel | △ enqueue 시 미적용→worker `deliverWaterfall` 지연 | ✔ | PARTIAL |

### 8.4 phone-키 DNC 부재 (CRITICAL)
`isChannelAllowed`는 customer_id·email 로만 조회(`PreferenceCenter.php:120-129`). **phone은 lookup key 아님** → 미매핑 전화번호는 `customerId<=0 && email=='' → return true`(115) = consent 우회. **phone suppression/DNC 리스트가 코드 전체에 없음**.

### 8.5 삭제(DSAR) 연동
`Dsar::eraseSubject` = crm_customers + crm_segment_members(DEL_BY_CUSTOMER_ID 65) + crm_channel_prefs/customer_prefs(70-71) 하드삭제. `email_suppression` **의도적 보존**(817, GDPR 17(3)(b)). **갭**: push_subscription/line_sends/instagram_messages/onsite_assignment/web_popup_assign **DSAR 도달불가**(`Dsar.php:734-746`), phone opt-out 기억 상실.

---

## 9. Consumer 인벤토리 (§52-53)

| Consumer | segment 해석 | 멤버 스토어 | PII | Consent | 근거 |
|---|---|---|---|---|---|
| Kakao sendCampaign | kakao_campaigns.segment_id | crm_segment_members⋈customers | phone,name | ✔ kakao | `KakaoChannel.php:295-343` |
| SMS sendCampaign | sms_campaigns.segment_id | 〃 | phone | ✔ sms(cid=0 fail-open) | `SmsMarketing.php:249-303` |
| Email sendCampaign | email_campaigns.segment_id | 〃 | email,name | ✔ suppression+opts | `EmailMarketing.php:602-632` |
| Omnichannel | omni_campaigns.segment_id | 〃(→omni_outbox) | id | △ worker 지연 | `Omnichannel.php:178-213` |
| JourneyBuilder | trigger_config.segment_id **또는 이름매칭** | crm_segment_members | customer_id | 하류 채널노드 | `JourneyBuilder.php:365-374` |
| AutoCampaign | **segment_id 미소비**(audience_mode 별도) | n/a | n/a | n/a | grep 무매치 |
| Decisioning | 집계(개인 아님) | n/a | 없음 | n/a | `Decisioning.php:235` |

**중복 소비자 코드**: Kakao/SMS/Email/Omni가 동일 `JOIN crm_segment_members` 를 **4회 복붙**(공유 헬퍼는 refreshSegmentForSend 만) → Part 2 통합 후보.

---

## 10. API 인벤토리 (§10)

| Method Path | Handler | Auth |
|---|---|---|
| GET `/crm/cohort-retention` | CRM::cohortRetention | api_key+Pro |
| GET `/crm/segments` | CRM::listSegments | api_key+Pro |
| POST `/crm/segments` | CRM::createSegment | analyst+Pro |
| DELETE `/crm/segments/{id}` | CRM::deleteSegment | analyst+Pro |
| POST `/crm/segments/{id}/refresh` | CRM::refreshSegment | analyst+Pro |
| POST `/crm/segments/smart-seed` | CRM::smartSeedSegments | analyst+Pro |
| POST `/ai/generate/segment` | AiGenerate::generateSegment | api_key(**UI 호출자 없음=고아**) |
| GET `/customer-ai/ltv-segments` | CustomerAI::ltvSegments | api_key |
| GET/POST/DELETE `/email/suppression` | EmailMarketing::*Suppression | api_key(+analyst 쓰기) |
| GET `/v418x/decisioning/segments`·`/segment/{g}/{a}/{r}/affinity` | Decisioning::* | api_key(집계·PII없음) |
| POST `/v418x/insights/audience-breakdowns`·`/influencer-audience` | Insights::ingest* | connector+/ingest |
| POST `/v421/connectors/audience/sync` | Connectors::audienceSync | api_key |
| GET/POST/DELETE `/v424/admin/growth/segments[...]`(+`/api/`) | AdminGrowth::segment* | **session admin**+subAdminMenu |

**주의**: `crm_segment_members` 행을 노출하거나 export 하는 라우트 **없음**(서버 발송루프 내부에서만 읽힘) → 멤버/PII export 권한 확대 위험 없음.

---

## 11. UI 인벤토리 & 미배선(§11)

- `CRM.jsx` **SegmentsTab**(398-460): 실 백엔드 배선(create/delete/refresh/smart-seed). **AISegmentsTab**(292-393): ⚠️ **UI 전용 클라이언트 휴리스틱**(useMemo VIP ltv>500000·churn purchase_count===1), `/ai/generate/segment` 미호출, 액션은 navigate 만 = "AI"라벨이나 백엔드 없음.
- `SuppressionPanel`(637)·`CohortRetentionPanel`(862) 배선 ✔.
- **빌더에 Preview/Count·consent·suppression 토글·Destination 계정 선택 없음**.
- `AutoMarketing.jsx` audience_mode(retarget/lookalike/prospect)→AdAdapters ✔; targetAudience=자유텍스트(설명용).
- `JourneyBuilder.jsx` segment=**자유텍스트**→백엔드 이름 정확매칭(오타 시 sid=0 무발송, 느슨결합 위험).

---

## 12. AI / Predictive / Lookalike 정직 상태 (§46-48)

| 항목 | 상태 | 근거 |
|---|---|---|
| CLV/Churn 모델 | **REAL BG/NBD+Gamma-Gamma**(pAlive/expected, 365d), 단 **Model ID/Version/Confidence/Freshness/Expiry 미영속**(요청마다 인라인 적합) | `CRM.php:398-445` |
| Predictive **Segment** | **HEURISTIC(SQL 근사)** — 정직 라벨·주석명시, BG/NBD 아닌 monotone 근사 | `CRM.php:1548-1552,1462-1479` |
| Lookalike | **REAL**(Meta LOOKALIKE ratio 0.01·Google·TikTok, 해시 소스) | `AdAdapters.php:1878-1918` |
| AI NL→Segment | **REAL Claude 호출·ADVISORY 전용·고아**(실행/영속 없음, 프론트 호출자 0) | `AiGenerate.php:186-220` |
| Decisioning segments | **집계 코호트**(개인 아님, PII 없음) | `Decisioning.php:307` |

---

## 13. 중복 구현 & 기능 후퇴 (§68-69)

**중복/중첩(통합 후보 — 삭제 금지, Canonical 명명 분리)**:
1. 3개 "segment" 네임스페이스(Customer/Decisioning/Growth ICP) — 공유 모델 없음.
2. LTV 개념 이중: `CustomerAI::ltvSegments` 티어(1M/500k/200k/50k `339-343`) vs `crm_segments` VIP(ltv≥500000 `1432`) — **임계 상이 → 동일고객 gold≠VIP 불일치**.
3. Predicted 지표 재계산: 세그먼트 SQL 근사 vs BG/NBD 엔진 — drift 가능.
4. 소비자 JOIN 4중 복붙(Kakao/SMS/Email/Omni).

**기능 후퇴**: 본 조사 범위에서 **삭제/축소로 인한 회귀 미발견**. 미구현(Version/Snapshot/OR-DSL/실시간/Removal/Reconciliation)은 애초 부재이지 후퇴 아님. 282차 fail-closed 가드·286차 취소제외·240차 owned-touch attribution은 **보존 확인**.

---

## 14. 데이터 계보 & Time Semantics (§19,60)

- **계보 부분단절**: Profile→Attribute/Event/Metric→Definition→Evaluation→Membership 까지는 추적가능(테넌트/식별자). Membership→Audience Snapshot→Destination 은 **스냅샷/버전 부재로 단절**(누가 실제 대상이었나 재현 불가).
- **Time Semantics 미명세**: Evaluation-time/Snapshot-time/Effective-time 컬럼 없음. Cohort/Segment 모두 **TZ 정규화 부재**(저장문자열 그대로). Lookback/Grace/Late-arrival 정책 없음.

---

## 15. 검증 게이트 (§81) 대조

전 항목 조사 완료: Entity/Store/Service/API/UI·Type/Status·Rule/Operator/DSL·Attribute/Event/Metric·Time·Batch/Realtime·Membership/Version/Snapshot·Preview/Count·Cohort·Consent/Suppression·Inclusion/Exclusion·Channel Identifier·Destination/Account/Credential·Sync/Removal/Reconciliation·Cross-Tenant/Wrong-target·Mock/Demo·AI/Predictive/Lookalike·Nested/Dependency·Consumer/Permission·Versioning/삭제/변경영향·중복·후퇴·아키텍처옵션·Critical Blocker. **기존기능 삭제·축소 0. 코드변경 0.** Mock/Demo 운영혼입: 세그먼트 소스는 라이브 crm_customers/activities(가짜유입 없음), demo 테넌트는 격리(IS_DEMO 게이트)·audience 소스 demo→[] 확인.

---

## 16. 완료 보고 수치 (§82)

| # | 항목 | 수 |
|---|---|---|
| Segment Definition/Membership 엔진 | 실 고객엔진 1(crm_segments)+read-model/집계/고아 4 | 5 |
| Segment Store(멤버십 보유) | 1(crm_segment_members) | 1 |
| "segment" 네임스페이스(도메인) | Customer / Decisioning-cohort / Growth-ICP | 3 |
| Rule Operator 실지원 | gte/lte/gt/lt/eq/ne | 6 |
| DSL 결합자 | AND 전용 | 1 |
| Cohort 엔진 | cohortRetention | 1 |
| Audience 목적지(아웃바운드 실동작) | Meta/Google/TikTok | 3 |
| Audience 목적지(정직 unsupported) | Naver SA/Kakao | 2 |
| Suppression 스토어 | email_suppression(email만·phone 없음) | 1 |
| Consent 스토어 | crm_channel_prefs | 1 |
| Frequency cap 엔진 | isFrequencyCapped(중앙·cross-channel) | 1 |
| Segment 소비자 | Kakao/SMS/Email/Omni/Journey | 5 |
| 고아 엔드포인트 | /ai/generate/segment | 1 |
| CRITICAL wrong-target 블로커 | §RISK SEG-C1~C4 | 4 |
| HIGH 블로커 | §RISK SEG-H1~H5 | 5 |
| 중복구현 후보 | 4 | 4 |
| 기능 후퇴 | 0 | 0 |
| 코드변경 | 0 | 0 |

**EPIC 06-A Part 2 준비**: Canonical Segment Schema·DSL·Rule Engine·Versioning·Dependency Governance 설계 입력자료 확정. → [`SEGMENT_ARCHITECTURE_BASELINE.md`](SEGMENT_ARCHITECTURE_BASELINE.md).
