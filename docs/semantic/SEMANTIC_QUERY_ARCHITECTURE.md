# EPIC 03-C — Semantic Query Layer, Metric Execution & Cross-Layer Enforcement (정식 마스터)

> **근거**: 03-A(Vocabulary)·03-B [`CANONICAL_SEMANTIC_MODEL.md`](CANONICAL_SEMANTIC_MODEL.md)(Metric Contract 23·Calculation Layer=Rollup/Pnl/AutoCampaign 확장) + 실코드 계산경로/소비처. **비파괴**: 실행 계층 설계·Resolver·Gate·Enforcement·통합계획만. 코드변경 0. 기존 계산경로 삭제·API 무통보 변경·자동화 Version 자동교체·Golden/회귀 없는 전환 없음(§50).
> **§51 통합**: 30개 파편 대신 본 마스터가 Query Architecture·Contract·Resolver(Metric/Measure/Dimension/Formula/Grain/Aggregation/Filter/Eligibility/Time/Currency/Refund)·Q/T/C Gate·Result Contract·Explain/Lineage·Cache·Consumer Enforcement·Linting·Shadow/Read Compare·Fallback·Security·SLO·Observability·Test·통합계획을 통합. ADR=[`../architecture/ADR_SEMANTIC_QUERY_EXECUTION.md`](../architecture/ADR_SEMANTIC_QUERY_EXECUTION.md).
> **승인 데이터만**: 03-B BLOCKED(ROAS ambiguity·재고회전)은 운영 결과 승인 금지. **하드코딩/우회 계산 금지 — Metric ID+Version으로 Layer 호출**.

---

## 1. Semantic Query Layer 구조 (§4 — 24 Layer)
Auth Context → Tenant/Workspace Scope Resolver → Consumer Contract Resolver → Metric Registry Resolver → Metric Version Resolver → Permission Validator → Query Contract Validator → Dimension → Filter → Time → Currency → Measure → **Formula Resolver** → Grain/Aggregation Resolver → **Q/T/C Gate** → Execution Planner → Data Source Adapter → **Calculation Executor** → Result Validator → Cache → Explain/Lineage → Audit → Metrics/Tracing → Response Contract. **Consumer가 DB/Graph/외부 직접조회로 공식 Metric 계산 금지**(§3.1).

## 2. Semantic Query Contract (§5)
request_id·consumer_id·consumer_type·purpose·tenant_id·workspace_id·actor·**metric_id·metric_version**·dimensions·grain·filters·time_range·timezone·reporting_currency·attribution_model·quality/trust/confidence/freshness_requirement·comparison_period·pagination·sort·include_explain/lineage. **클라 metric_version/filter/dimension이 Consumer Contract 허용범위인지 서버 검증**. 목적(§6): DASHBOARD/DETAIL/REPORT/EXPORT/ALERT/AI_INSIGHT/AI_RECOMMENDATION/AUTOMATION_PREVIEW/EXECUTION/ADMIN_AUDIT/BILLING/EXTERNAL/INTERNAL_VALIDATION/SHADOW_COMPARE별 차등.

## 3. Resolver 체계 (§7~17 — 기존 SSOT 래핑)

| Resolver | 기능 | 기존 SSOT 래핑 |
|---|---|---|
| Metric(§7) | ID/상태/Version/Effective/Consumer허용/Deprecated/Formula ID 반환·PRODUCTION_READY 아니면 제한 | Metric Registry(03-B) |
| Measure(§8) | Measure ID·Source Field/Entity·Dedup Key·Aggregation·Null/Negative | channel_orders/performance_metrics 필드 |
| Dimension(§9) | Dimension ID·Hierarchy·Allowed/Unknown/Null Member·Temporal·**민감 Dimension 권한** | ★채널 정규화 단일 SSOT 필요 |
| Formula(§10) | Formula Registry 조회·분자/분모·Null/Zero·Refund·Currency·Time·Attribution·**문자열 임의 Formula 실행 금지** | Rollup/Pnl/AutoCampaign 산식 |
| Grain(§11) | 지원 Grain·데이터부족/PII Grain 차단·**비율 단순평균 차단**·상위 재집계 | 03-B Grain 정책 |
| Aggregation(§12) | Type 강제(Revenue SUM·Order COUNT_DISTINCT·**비율 재집계 ratio-of-sums**)·Consumer 임의변경 금지 | 03-B(ROAS avg-of-ratios 버그 차단) |
| Filter(§13) | Registry Filter만·Operator·Alias→Canonical·**Raw SQL Filter 금지**·Injection 차단 | — |
| Eligibility(§14) | Revenue(취소/테스트/Fraud/Demo 제외)·Conversion(유효/Dedup/Bot/Window)·Customer(New/Returning) | OrderHub cancelExclusion·IS_DEMO |
| Time(§15) | 기준시간·TZ(UTC)·Boundary·Lookback/Attribution/Late Window·Locked Period·혼용 금지 | Rollup:85 기간버킷 |
| Currency(§16) | Source/Reporting/Default·Rate Source/Date·**환율 없으면 임의값 금지→경고** | Connectors fxToKrw·Pnl:247 |
| Refund(§17) | Full/Partial/Cancel/Return/Exchange/Chargeback/원거래 연결·불명확 시 Confidence↓/차단 | OrderHub 토큰 |

## 4. Quality / Trust / Confidence Gate (§18~20)
- **Quality Gate**: completeness·필수필드·중복률·invalid률·freshness·tenant격리·currency/time completeness·ER·refund linkage·sync health·lineage → PASS/PASS_WITH_WARNING/PARTIAL/BLOCKED. (DataPlatform dataQuality 재사용)
- **Trust Gate**: source auth·connector status·API reliability·sync 성공률·cross-source·provenance·Fraud/Bot/Spam risk. 출처불명/무권한 데이터=공식 Metric 미사용. (Vol3·truthRatio)
- **Confidence Gate**: 표본수·완성도·통계 불확실성·Attribution/Model/ER confidence·coverage·drift → 낮으면 확정적 표현 금지.

## 5. Execution / Result / Explain / Lineage (§21~27)
- **Execution Planner**: Source 선택(Transactional DB/Rollup 집계/Graph/Cache) by SoT·Freshness·Grain·Cost·Version. 다중 Source 시 우선순위/비교.
- **Data Source Adapter**: 공통 Contract(Tenant Scope 강제·Binding·Timeout·Pagination·Retry·Circuit Breaker·Lineage). **Adapter마다 Formula 중복구현 금지**.
- **Calculation Executor**: Measure추출→Filter→Dedup→Time→Currency→Refund→Aggregation→Formula→Q/T/C→검증→Explain→Audit. **모든 계산 Metric ID+Formula Version 연결**.
- **Result Validator**: Type/Unit/범위/NaN/Infinity/Negative/Zero분모/Currency/Grain/Tenant/Row Count/Baseline 편차/Anomaly. 비정상=Production Response 반환 금지.
- **Result Contract**(§25): metric_id·version·formula_id/version·value·status·unit·currency·grain·dimensions·filters·time_range·comparison·quality/trust/confidence·freshness·data_version·warning·partial·explain/lineage_reference·generated_at.
- **Explain**(§26): 공식정의·Formula·Measure·Dimension·Filter·Grain·기준시간·Currency·Refund·제외데이터·Q/T/C·Source·Version·Warning·Limitations(PII/내부쿼리 노출 금지).
- **Lineage**(§27): Source→CE→Measure→Filtered→Aggregation→Formula→Metric→Consumer→AI/Automation, 각 Version/시간.

## 6. Cache & Invalidation (§30/§31)
- **Cache Key**: tenant+workspace+consumer/permission+metric_id+**metric_version**+grain+normalized_dimensions+normalized_filters+time_range+timezone+currency+attribution_model+data_version+source_version. **타 Tenant/Version/Filter 혼합 금지**.
- **무효화**: Source 변경·Refund/Cancel·Late Event·Metric/Formula Version·환율·Dimension Mapping·ER·Tenant 설정·Permission·Quality 상태 변경. 무효화 실패 탐지 Reconciliation.

## 7. Consumer Enforcement (§32) & 기존 소비처 매핑

| Consumer | 현행(우회 계산) | Canonical 전환 | 분류 |
|---|---|---|---|
| **Frontend(GlobalDataContext/rollupDemoDerive)** | ★자체 ROAS/margin 재계산 | 백엔드 Metric 결과 소비(데모만 파생) | **CONSOLIDATION_REQUIRED** |
| API(/v424 등) | 산출값 반환(roas 일부 미반환) | Result Contract+metric_id/version | CONSUMER_ONLY→Adapter |
| Report/Export | — | metric_id/version·기간/통화/필터 기록 | LEGACY_ADAPTER |
| **AI(ClaudeAI:162)** | 숫자+글로서리 주입 | Metric Context(Definition/Confidence/Warning/Lineage)·**숫자만 금지** | CONSOLIDATION_REQUIRED |
| **Automation(AutoCampaign)** | adj_roas 이미 사용 | Metric ID+Version 고정·Freshness/Quality Gate·Dry Run·Rollback | LEGACY_VALIDATED(강화) |

## 8. 비표준 계산 탐지 & Cross-Layer Enforcement & Linting (§33~35)
- **탐지**: UI 수식·중복 SQL Formula·Report/Export/Automation/AI Prompt Formula·Utility 계산·중복 Materialized View → Registry 기록.
- **Cross-Layer Enforcement**(§34): UI Label↔Metric ID·API Field↔Version·Report Formula↔Registry·Automation Threshold↔Unit·Currency 없는 금액·TZ 없는 기간·Grain 불일치·Deprecated/Blocked Metric·AI Unverified Metric·Cache 다른 Version → 차단/경고.
- **Semantic Linting**(§35 — CI 제안): Registry 없는 Metric ID 금지·Deprecated 신규 금지·중복 Formula 탐지·**UI 자체계산 탐지**·Tenant Scope 없는 Query·Currency 미지정 금액·Version 미지정 Automation·Consumer Contract 없는 사용·Test 없는 Formula 차단.

## 9. Shadow / Read Compare / Fallback / 점진 전환 (§36~39)
- **Shadow Calculation**: 기존 계산 ‖ Semantic Layer 병행 → 값/Grain/기간/Currency/Filter/Row/Null/Refund/Conversion/Attribution/Confidence 비교 → EXPECTED/EXPLAINED/DATA_ISSUE/**FORMULA_CONFLICT**/IMPLEMENTATION_BUG/SOURCE_MISMATCH/BLOCKED.
- **Read Compare**(§53 Matrix): request_id·metric_id·legacy_value·semantic_value·abs/rel_difference·reason·status·reviewed_by. Production 사용자에 비교정보 노출 금지.
- **점진 전환**(§38): Internal Validation→Shadow→Admin-only→Canary Tenant→Limited Dashboard→Read Compare→Consumer별→Default→Legacy Adapter→Deprecated→제거. **즉시 전체전환 금지**.
- **Fallback**(§39): Semantic Layer 장애→기존 검증 경로/최근 Cache/Snapshot/Partial/자동화 차단/경고. **오래된 값 최신인 척 금지**.

## 10. Error/Warning·권한·성능·SLO·Observability·Audit (§40~45)
- **Error**: METRIC_NOT_FOUND·VERSION_UNSUPPORTED·METRIC_BLOCKED·INVALID_GRAIN/DIMENSION/FILTER·SOURCE_UNAVAILABLE·QUALITY/TRUST_GATE_FAILED·INSUFFICIENT_DATA·CURRENCY_RATE_MISSING·TENANT_SCOPE_VIOLATION·PERMISSION_DENIED·QUERY_TIMEOUT. **Warning**: PARTIAL/STALE_DATA·LOW_CONFIDENCE/QUALITY·LATE_DATA_PENDING·REFUND_PENDING·ESTIMATED_CURRENCY·DEPRECATED_METRIC·SHADOW_DIFFERENCE.
- **권한**(§41): Metric Read·Dimension Read·**Sensitive Breakdown(Customer-level)**·Export·Explain·Lineage·Admin Override·Automation/AI Use. Metric 값 가시≠고객 Dimension 가시.
- **성능/SLO**(§42/§43): Timeout·Max Metrics/Dimensions/TimeRange/Rows·Concurrent·Expensive 분류·Async Report·Pre-agg·Cache TTL. Consumer별 SLO 차등.
- **Observability/Audit**(§44/§45): Query Count·Success/Failure·P50/95/99·Cache Hit·Q/T Gate Failure·Low Confidence·Shadow Difference·Cross-Layer Violation·Deprecated/Blocked 시도·Tenant Scope Block·Automation Block·Fallback. Audit=request/consumer/actor/tenant/metric/version/formula_version/filters/result_status/Q/T/C/warning/exec_time/cache_hit(민감 Filter/PII Masking).

## 11. 기존 계산 경로 분류 (§48) & Cross-Layer Enforcement Matrix (§54)

| Consumer | Metric | Current Method | Canonical Contract | Violation | Severity | Cutover |
|---|---|---|---|---|---|---|
| Frontend | ROAS | blendedRoas avg-of-ratios(GlobalDataContext:1796) | MET-ROAS-000003 ratio-of-sums | 산식 버그 | **CRITICAL** | Shadow→전환 |
| Frontend | Margin | pnlStats 재계산 | MET-MGN-000001 | 이원(의도적) | HIGH | server-first |
| Analytics | Channel | 5+ 정규화 함수 | DIM-CHANNEL 단일 SSOT | 방향 상충 | **CRITICAL** | 어댑터 통일 |
| AI | 지표 | 숫자 주입 | Metric Context | 근거 누락 | MED | Context 전환 |
| Automation | ROAS | adj_roas | MET-ROAS-000006 | (정합) | LOW | Version 고정 |

**분류**: Rollup/Pnl/OrderHub/AutoCampaign/CRM=**CANONICAL_SOURCE/EXECUTOR**·프론트 재계산=**CONSOLIDATION_REQUIRED**·RoiService=**DEPRECATION_PLANNED**·데모 파생=**KEEP_SEPARATE_WITH_REASON**.

## 12. 핵심 Metric 검증 대상 & Validation 상태 (§47/§55)
- 검증 대상(§47): Net/Gross Revenue·Spend·Profit/Margin·ROAS 4변형·CAC·LTV·CVR·Retention·Churn·Attribution·MMM·Q/T/C.
- **현 상태(정직)**: 설계·Contract 확정. **실 구현·Shadow·Read Compare·Golden 검증 전이라 대부분 `CONTRACT_VERIFIED`**. Production 승인 0(Shadow→Read Compare→Golden→회귀 통과 후). ROAS/채널은 `BLOCKED_FORMULA`/`CONSOLIDATION_REQUIRED`.

## 13. §57 완료 보고 수치
조사 기존 계산경로 다수(Rollup/Pnl/AutoCampaign/OrderHub/CRM/프론트 GlobalDataContext·rollupDemoDerive/AI ClaudeAI) · Semantic Query Type 12(Query Matrix) · Resolver 11 · Canonical Execution Metric 23(03-B Contract) · Shadow Calculation 대상=핵심 14 · Read Compare=계획 · **Formula Conflict 5**(CRITICAL 2) · **Cross-Layer Violation 5** · Canary 승인 0 · Production 승인 0(구현 전) · Blocked Formula 1(ROAS ambiguity) · Blocked Data Quality 1(재고회전) · Blocked Security 0 · Golden Dataset=03-B 스펙 참조(구현 후) · Regression=Baseline 계획 · P95/P99=구현 후 · 문서=본 마스터+ADR+PM · 남은리스크=프론트 재계산 전환·채널 SSOT·AI Context·ROAS 정본 · **EPIC03-D(Final Validation·Regression Certification·Production Governance) 준비 완료**. 코드변경 0.
