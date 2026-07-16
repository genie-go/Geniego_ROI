# EPIC 01-D — Entity Foundation Validation Report (Master)

> **근거**: EPIC 01-A [`ENTITY_INVENTORY.md`](ENTITY_INVENTORY.md) · 01-B [`CANONICAL_ENTITY_REGISTRY.md`](CANONICAL_ENTITY_REGISTRY.md) · 01-C [`CANONICAL_RELATIONSHIP_REGISTRY.md`](CANONICAL_RELATIONSHIP_REGISTRY.md) + 288차 **실코드 재검증 3건**(Plan·ROAS/CAC/LTV·OrderItem/격리).
> **§20 통합**: 13 파편 문서 대신 본 마스터가 Validation·Approval Matrix·Consolidation Execution·Migration·Compatibility·Regression Baseline+Matrix·Security·Data Isolation·Analytics Impact·Automation Impact·Blocked·Final Status를 통합(EPIC 00 §2.2 중복금지). ADR=[`../architecture/ADR_ENTITY_FOUNDATION_APPROVAL.md`](../architecture/ADR_ENTITY_FOUNDATION_APPROVAL.md).
> **비파괴**(§19): 코드변경 0. 테이블 병합·API 제거·모델 교체·산식 변경 없음. 본 단계는 검증·계획·게이트 확정.

---

## 1. Step 1 — 선행 산출물 상호 검증(불일치)

EPIC 01-A/B/C는 상호 정합. **단, 실코드 재검증으로 EPIC 01-A/B의 2개 주장을 정정**(§3.5 정직):

| 선행 주장 | 재검증 결과 | 조치 |
|---|---|---|
| **"Plan 4중 저장"**(billing_plan/plan_pricing/subscription_packages/plan_config) | **과장** — 4테이블은 목적·스키마·통화 상이(동일값 4중복사 아님). plan_config=SaaS티어 SSOT·plan_pricing=레거시KRW폴백·billing_plan=별도 B2B(tenant_subscription)·subscription_packages=메뉴번들 상품. `plan_catalog`는 **부재**(주장 오기). | 중복→**레거시 미정리**로 재분류. CRITICAL→MEDIUM 강등 |
| **"ROAS/CAC/LTV 이원(PHP+JS)"** | **실질 ROAS만 이원**. CAC=백엔드-only(프론트 데모전용), LTV/CLV=백엔드 SSOT(프론트 패스스루+폴백). | ROAS만 통합대상 유지, CAC/LTV=APPROVED_CANONICAL |

---

## 2. Step 2~3 — Canonical 실구현 검증 요약(증거)

### VERIFIED (실코드 근거)
- **Order SSOT=channel_orders**: `Db.php:414` 유일정의. 요청경로 조회 전부 `WHERE tenant_id=?`(OrderHub:255/611, Pnl:92).
- **Customer SSOT=crm_customers**: 목록/단건/삭제 전부 tenant 강제(CRM:141/212/259). Buyer→Customer 배선=recordCrmPurchase.
- **Inventory 물리 SSOT=wms_stock**: Wms 전 조회 tenant 강제. ProductCost=FEFO→WAC→aggregateCogs(OrderHub:188).
- **Plan 정의 SSOT=plan_config**(PlanLimits:50·Paddle:219·AdminPlans CRUD). **현재플랜 상태=app_user.plan/plans**(PlanLimits:37) — 정의/상태 정상 분리(중복 아님). 게이팅=plan_config(한도)+plan_menu_access(메뉴).
- **CAC=Rollup:413 백엔드-only**, **LTV=CRM:288 환불차감 SSOT**.

### VERIFIED-DEFECT (실 결함 확인 — 계획 대상)
- **OrderItem 부재**: channel_orders=주문1건=단일상품행. 다품목 유실 실지점 = **ChannelSync:413(Shopify)·1266(eBay)·1356(TikTok)** `line_items[0]`만 추출. COGS 왜곡 = OrderHub:190/210(`o.sku` 단일조인). **★신규발견: TikTok `qty=count($items)`(ChannelSync:1356) — 수량이 아니라 라인개수(원가/수량 왜곡)**.
- **ROAS 3술어 혼재**: 매체보고(raw)/광고귀속(Rollup avg_roas)/취소차감(adj_roas). P&L 화면 ROAS=프론트 `blendedRoas`(GlobalDataContext:1796)이며 **백엔드 /v424/pnl은 roas 미반환** → 화면별 값 상이 위험.

---

## 3. Canonical Approval Matrix (§21)

| CE/REL ID | Name | Type | Validation | Canonical Status | Strategy | Migration | Compat | Security | Regr Risk | Score | Approval |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CE-ORD-* | Order(channel_orders) | Entity | VERIFIED | **APPROVED_WITH_MIGRATION** | EXTEND_CANONICAL | order_item 신설 | DUAL_READ_SINGLE_WRITE | PASS | **CRITICAL** | 72 | 조건부 |
| REL-ORD-000002 | Order→OrderItem | Rel | ABSENT | **BLOCKED_PENDING_EVIDENCE** | EXTEND_CANONICAL | 라인수집 필요 | — | PASS | CRITICAL | — | 라이브검증 후 |
| CE-CUS-* | Customer(crm_customers) | Entity | VERIFIED | **APPROVED_CANONICAL** | KEEP | — | — | PASS | LOW | 92 | 승인 |
| CE-INV-* | Inventory(wms_stock) | Entity | VERIFIED | **APPROVED_CANONICAL** | KEEP | — | — | PASS | MED(이중차감) | 85 | 승인 |
| REL-ORD-000007 | Order→Inventory(이중차감) | Rel | VERIFIED | **APPROVED_WITH_MIGRATION** | DUAL_READ_SINGLE_WRITE | 파생-only 단일화 | Shadow Read | PASS | HIGH | 70 | 조건부 |
| CE-BIZ-Plan | Plan(plan_config) | Entity | VERIFIED | **APPROVED_CANONICAL** | KEEP | — | — | PASS | LOW | 90 | 승인 |
| — plan_pricing | Plan(레거시KRW) | Entity | VERIFIED | **DEPRECATE_AFTER_VALIDATION** | LEGACY_ADAPTER | 폴백 제거 | Read Fallback 유지 | PASS | LOW | — | 폐기예정 |
| — billing_plan | B2B구독모델 | Entity | PARTIAL | **KEEP_AS_BOUNDED_CONTEXT** | KEEP_SEPARATE | — | — | PASS | LOW | — | 별개유지 |
| — subscription_packages | 메뉴번들상품 | Entity | VERIFIED | **KEEP_SEPARATE** | KEEP_AS_BOUNDED_CONTEXT | — | — | PASS | LOW | — | 별개유지 |
| CE-ANA-ROAS | ROAS | Entity | VERIFIED | **APPROVED_WITH_MIGRATION** | MERGE_INTO_CANONICAL | 공용헬퍼 | Compat DTO | PASS | HIGH | 68 | 조건부 |
| CE-ANA-CAC | CAC | Entity | VERIFIED | **APPROVED_CANONICAL** | KEEP | — | — | PASS | LOW | 88 | 승인 |
| CE-ANA-LTV | LTV/CLV | Entity | VERIFIED | **APPROVED_CANONICAL** | KEEP | — | — | PASS | LOW | 87 | 승인 |
| CE-DAT-Norm | NormalizedRecord | Entity | ORPHANED | **BLOCKED_PENDING_EVIDENCE** | BLOCKED_PENDING_EVIDENCE | — | — | PASS | LOW | — | 라이브검증 |
| CE-AUT-ActReq | ActionRequest | Entity | ORPHANED | **BLOCKED_PENDING_EVIDENCE** | BLOCKED_PENDING_EVIDENCE | — | — | PASS | LOW | — | 제품결정 |
| CE-BIZ-Coupon | subscription_coupon→free_coupons | Entity | PARTIAL | **APPROVED_WITH_MIGRATION** | MERGE_INTO_CANONICAL | 통합 | WRITE_REDIRECT | PASS | MED | 74 | 조건부 |
| CE-CUS-Grade | grade/tier/VIP | Entity | PARTIAL | **APPROVED_WITH_COMPATIBILITY** | EXTEND_CANONICAL | 단일등급 SSOT | Mapper | PASS | MED | 76 | 조건부 |
| CE-DAT-Trust | TrustScore/QualityScore | Entity | COMPUTED | **APPROVED_WITH_MIGRATION** | EXTEND_CANONICAL | 영속화(Vol3) | — | PASS | LOW(신설) | 78 | 조건부 |
| 이름충돌(Account5/Channel3/Campaign5/Session3/Role4/Segment3) | — | Entity | VERIFIED | **APPROVED_CANONICAL(분리)** | KEEP_AS_BOUNDED_CONTEXT | — | — | PASS | LOW | 90 | 승인 |
| Alias(Buyer/User/Creator/AdSet) | — | Alias | VERIFIED | **APPROVED_CANONICAL** | KEEP | — | — | PASS | LOW | 95 | 승인 |

---

## 4. Consolidation Execution Plan (§7 전략·비파괴)

| 대상 | 전략 | 절차(삭제 없이) | 우선 |
|---|---|---|---|
| **OrderItem 신설** | EXTEND_CANONICAL | ①어댑터가 line_items 전체 수집(라이브 스키마 검증) ②order_item 자식테이블 신설(FK channel_orders) ③COGS/귀속을 라인단위로 확장하되 **기존 주문단위 집계 병행(DUAL_READ)** ④Backfill=raw_json 재파싱 ⑤회귀 후 전환 | CRITICAL(제품결정+라이브) |
| **재고 이중차감 단일화** | DUAL_READ_SINGLE_WRITE | wms_stock=물리 SSOT 쓰기, channel_inventory=파생 투영(Shadow Read 검증 후 쓰기 제거) | HIGH |
| **ROAS 술어 통일** | MERGE_INTO_CANONICAL | 백엔드 공용헬퍼(취소차감=adj 정본) 신설→프론트 blendedRoas/adFunnel 소비 전환. 매체보고 raw는 "매체 자가보고" 라벨 명시 보존 | HIGH |
| plan_pricing 폐기 | DEPRECATE_AFTER_VALIDATION | Payment 폴백체인에서 plan_config USD로 일원화, plan_pricing은 Read Fallback만 남기고 신규 write 중단 | MEDIUM |
| subscription_coupon→free_coupons | MERGE_INTO_CANONICAL | WRITE_REDIRECT 후 백필 | MEDIUM |
| grade/tier/VIP | EXTEND_CANONICAL | crm_customers.grade 단일 SSOT + Mapper로 tier/VIP 파생 | MEDIUM |
| TrustScore 영속화 | EXTEND_CANONICAL | Vol3 신설테이블(무후퇴) | MEDIUM |
| billing_plan/subscription_packages | KEEP_SEPARATE | Bounded Context 라벨만 부여(통합 안 함) | LOW |
| normalized_event·action_request | BLOCKED_PENDING_EVIDENCE | 라이브검증/제품결정 전 배선·삭제 금지 | 보류 |

---

## 5. Migration Plan (§8) — OrderItem(대표·비파괴)
- Source: channel_orders.raw_json(line_items 원본 보존됨) → Target: **신설 order_item**(order_id FK, sku, qty, unit_price, tenant_id).
- ID/Tenant 매핑: 부모 channel_orders(tenant_id, channel, channel_order_id) 상속. External ID 보존.
- Backfill: raw_json 재파싱(멱등·중복행 UNIQUE(order_id, line_idx)). 검증쿼리=Σorder_item.total vs channel_orders.total_price, Row Count/Checksum.
- Rollback: order_item DROP + 기존 주문단위 집계 유지(부모 무변경이라 안전). Cutover=DUAL_READ 검증 후.
- **선결(BLOCKED)**: 각 채널 어댑터가 다품목 line_items를 실제로 수신하는지 라이브 검증 필요(현재 [0]만 추출) → 블라인드 구현 금지.

## 6. Compatibility Plan (§9)
- 모든 통합은 기존 API 응답 필드 **유지**(Deprecated Field 보존) + Adapter/Mapper. ROAS는 Compat DTO로 화면별 기존 값 유지하며 점진 전환. 무기한 이중쓰기 금지(전환기간 명시).

---

## 7. Regression Baseline & Test Matrix (§11)

**Baseline(변경 전 저장)**: 대표 테넌트의 ①ROAS(P&L·DashMarketing·AdFunnel 3화면 값) ②주문 COGS/마진 ③LTV/CAC ④재고 스냅샷 ⑤정산 rollup — 통합 착수 전 스냅샷 필수.

| 범주 | 필수 테스트 | 자동화 자산 |
|---|---|---|
| Entity | CRUD·필수필드·UNIQUE·tenant/workspace scope | `npm run e2e` + render.mjs(119라우트) |
| Relationship | 정상연결·타테넌트 차단·Orphan차단·Cardinality·Delete정책 | 신규 격리 스모크 |
| API | 기존 endpoint 응답필드 유지·권한/scope 차단 | e2e:render 무음사망 탐지 |
| UI | 페이지 표시·CRUD·필터/정렬·Alias 표시·다국어 | Playwright |
| Data | Row Count·Checksum·Null 증가0·중복0·외부ID유실0·tenant혼합0 | 무결성 스크립트(신규) |
| 분석 | ROAS/CAC/LTV/Attribution/MMM/Forecast 전후 비교 | Baseline diff |
| 자동화 | Trigger/Condition/Action·중복실행방지·품질미달 차단·Dry Run | AutoCampaign preview |

**게이트**: 분석 수치가 변경되면 "의도된 변경"임을 Baseline diff로 설명 못 하면 BLOCKED.

## 8. Security Validation (§12) — **PASS**
- channel_orders·crm_customers·wms_stock 요청경로 조회 **예외 없이 `WHERE tenant_id` fail-closed**(누출 0). 필터 없는 지점=스키마 프로브(`SELECT 1`/`LIMIT 0`)·관리 cron 의도적 열거뿐.
- 웹훅 쓰기=본문 tenant_id 불신·토큰 도출(ChannelSync:5620) → 교차테넌트 주입 차단.
- **Critical Security Risk = 0. Data Isolation Risk = 0.**

## 9. Data Isolation / Pollution (§13) — **PASS**
- Mock/Demo 격리=VITE_DEMO_MODE + IS_DEMO 게이트(운영 분석 미유입). 재동기화 중복=UNIQUE(tenant,channel,channel_order_id) 차단. 취소/환불=역분개 반영(CRM LTV·정산 zero-out). 출처/계보 메타 유지.

## 10. Analytics Impact (§14)
- OrderItem 신설 시 **상품별 COGS/ROI/매출 재분배**(현재 첫 SKU 몰림 해소) → 과거 대비 상품단위 수치 변동 예상(주문총액·전사 ROAS는 불변). Baseline diff로 설명.
- ROAS 통일 시 P&L 화면 ROAS가 adj 기준으로 이동 → 취소 많은 채널 값 하향(정확도 개선). 사전 공지 대상.
- CAC/LTV=백엔드 SSOT 유지 → 영향 없음.

## 11. Automation Impact (§15)
- AutoCampaign은 이미 adj_roas 병기(288차) → ROAS 통일이 자동화 안전장치 강화. Journey/Trigger/Segment=Customer/Order canonical 무변경 → 영향 없음. 통합 실행 시 Dry Run/Preview 필수(잘못된 대상 변경 방지).

---

## 12. Blocked Items (§16)
| 항목 | 상태 | 해제조건 |
|---|---|---|
| Order→OrderItem | BLOCKED_PENDING_EVIDENCE | 채널 어댑터 다품목 라이브 수신 검증 |
| NormalizedRecord 파이프라인 | BLOCKED_PENDING_EVIDENCE | 하류 소비처 라이브검증(프론트 스키마탐색기 유일소비 여부) |
| ActionRequest 생산자 | BLOCKED_PENDING_EVIDENCE | 승인요청 생성/임계 제품결정 |
| TikTok qty=count 버그 | BACKLOG(비파괴 단계라 미수정) | 수량 정본 확정 후 수정+회귀 |

## 13. Final Status (§16·§24)
- **Entity Foundation = APPROVED (조건부)**. 핵심 SSOT(Customer/Order/Inventory/Plan/Credential/Workflow/Rule) 실코드 검증·승인. 통합 대상은 전략·비파괴 계획 부여. Critical Security/Isolation=0. 미검증 항목 은폐 없음(BLOCKED 명시).
- **Knowledge Graph 입력자료 승인 완료** → EPIC 02-A 착수 가능.

## 14. §23 완료 보고 수치
검증 Entity ~90 · 검증 Relationship ~55 · APPROVED_CANONICAL ~48 · WITH_MIGRATION 5 · WITH_COMPATIBILITY 1 · BLOCKED 4 · Critical Security 0 · Data Isolation Risk 0 · Duplicate 통합대상 6(2건은 오탐 정정) · Migration 대상 5 · Regression Test 매트릭스 7범주(Baseline 미착수=통합 착수 시 생성) · 분석영향=상품단위 재분배+ROAS adj 이동 · 자동화영향=Dry Run 조건부 · 코드변경 0.
