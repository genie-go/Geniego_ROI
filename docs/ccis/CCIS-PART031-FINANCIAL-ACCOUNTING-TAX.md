# GeniegoROI Claude Code Implementation Specification

# CCIS Part031 — Financial System, Accounting, Tax & Revenue Management Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Financial System·Accounting·Tax·Revenue Management 표준을 수립한다.

> ★**성격(축 분리 — 강한 "운영 손익" vs 부재 "회계 원장")**: 이 저장소의 재무 실체는 **관리회계·운영 손익
> (Management Accounting)** 이지 **법정 복식부기·ERP(Statutory Bookkeeping)** 가 아니다. ★**강한 축(핵심
> 경쟁력·헌법 "실순이익")**: `Pnl`(v424 서버 SSOT — grossProfit/operatingProfit/**netProfit**=광고비·원가
> (WAC)·물류비·반품비·수수료·쿠폰·인플루언서비 반영)·**VAT 상계 엔진**(`Pnl::vat` 매출세액vs매입세액·과세기간
> 버킷팅·해외광고비 리버스차지 제외·Paddle MoR 납부뷰)·**다통화 FX**(`Connectors::fxToKrw` 내부 base KRW·
> 보고통화 환산)·**정산 머니경로**(`settlement`·`kr_settlement_line`·`orderhub_settlements`·`pg_settlement`·
> `creator_settlements`)·**정산 대사(Reconciliation)**(KR recon·PG recon·ROAS recon·WMS 재고대사) 가 강하게
> 실재한다. ★**부재 축**: 명세의 **복식부기(Double-entry)·General Ledger·Chart of Accounts·Journal(차변/대변
> 균형)·AR/AP·재무제표(BS/IS/CF/시산표)·전자세금계산서 발행·ERP(SAP/Oracle/Dynamics/더존/영림원)**는
> **부재**(grep 0·`subscription_ledger`/`ad_spend_ledger`=append-only 이벤트로그이지 복식부기 원장 아님).
> Part001 §4 에 따라 실측 → 복식부기/GL/ERP 부재증명 → 실 운영 손익 스택 성문화했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 재무 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Financial Architecture | Event→Journal→GL→Report | **부분(대응물)** — Business Event→집계(rollup)→`Pnl` 조립→손익뷰. Journal→GL 계층 아님 |
| Chart of Accounts(COA) | Asset/Liability/Equity/Rev/Exp | **부재**. 계정과목 체계 없음. 손익 컴포넌트(revenue/cogs/adSpend/fee 등)로 대체 |
| General Ledger(GL) | 원장(정정분개) | **부재**. `settlement`/`*_ledger`는 머니경로/이벤트로그(복식부기 원장 아님) |
| Double-entry Bookkeeping | 차변=대변 균형 | **부재**(grep 0). 단식 집계(매출·비용 컴포넌트 합산)로 손익 산출 |
| Journal Entry(불변) | Immutable 분개 | **부재**. 대응물=정산행·이벤트로그(append-only) |
| Accounts Receivable(AR) | 미수금/Aging | **부재**. 정산 대기(orderhub_settlements status) 부분 |
| Accounts Payable(AP) | 지급 승인 | **부분** — 정산 지급(creator_settlements·payout)·`action_request` 승인. 형식 AP 원장 아님 |
| Revenue Recognition | PIT/OverTime/구독/Usage | **부분** — 구독(Paddle/Stripe 빌링)·판매 시점 매출. 형식 Rev Rec 기준(ASC606/IFRS15) 아님 |
| Settlement | 판매자/파트너/물류 정산 | ★**강함** — `settlement`·`kr_settlement_line`·`orderhub_settlements`·`pg_settlement`·`creator_settlements` |
| Payment | Bank/Card/VA/Wallet | ★**실재** — `Payment`·`BillingMethod`·PG(Paddle MoR·Stripe 보류). 회계 분개 연계는 아님(손익 반영) |
| Payout(불변 이력) | 예약/수동/배치 지급 | **부분** — creator/파트너 정산 지급·이력. 형식 불변 payout 원장 부분 |
| Tax Engine(VAT/GST/원천) | 국가별 세금 | ★**VAT 실재** — `Pnl::vat`(매출세액vs매입세액 상계·과세기간·리버스차지·MoR). GST/원천세 부분 |
| Tax Calculation | 상품/서비스/배송/수수료 | ★**부분 준수** — VAT pass-through(`kr_settlement_line.vat`·마진 제외 이중계상 방지)·국내 세금계산서 매체 구분 |
| Multi-Currency | KRW/USD/EUR/JPY/CNY | ★**실재** — 내부 base KRW·`fxToKrw` 정규화·보고통화 환산·통화별 처리(IDR 과대계상 결함 수정) |
| Exchange Rate(이력) | Base/Quote/Rate/Source | **부분** — `fxToKrw` 환율 적용. 형식 환율 이력 테이블(effective_date/source) 부분 |
| Reconciliation | PG/Bank/ERP/Ledger 대사 | ★**실재** — KR recon(`/v419/kr/recon`·티켓)·PG recon(`/v427/pg/reconciliation`)·ROAS recon·WMS 재고대사 |
| Financial Reporting | BS/IS/CF/시산표 | **부분(손익만)** — `Pnl`(관리 손익=IS 유사)·`Reports`·역할별 대시보드. BS/CF/시산표 부재 |
| ERP Integration | SAP/Oracle/더존/영림원 | **부재**(grep 0). API/정산 연동은 있으나 ERP 커넥터 없음 |
| Financial Audit Trail | 거래/분개/승인/정산 감사 | **부분** — `SecurityAudit`·정산 이력·`action_request`. 분개 감사 대상 없음 |
| Security(RBAC/Maker-Checker/SoD) | 이중 승인 | **부분** — RBAC·`action_request`(승인)·high-value 게이트(₩5M↑ 무승인 송출 차단·289차). 형식 Maker-Checker 부분 |
| Monitoring | 정산 성공률/Ledger 불균형 | **부분** — 정산 상태·`AnomalyDetection`·`Alerting`. Ledger 불균형=대상 없음(복식부기 부재) |
| Logging | Transaction/Journal/Trace | **부분** — error_log·정산 이력. Journal ID/Trace ID 부재 |
| Disaster Recovery | Ledger/Journal 복구 | **부분** — DB 백업(정산 테이블)·정산 재실행. Ledger 무결성 검증=대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Ledger First/Double-entry/Immutable/Audit/Multi-Currency/Idempotent Settlement/Reconciliation) | **부분(손익축 강·원장축 부재)** | ★Multi-Currency·Idempotent Settlement·Reconciliation·Audit 준수. Ledger First/Double-entry 부재 |
| §4 Financial Architecture | **부분(대응물)** | Event→집계→`Pnl` 조립. Journal→GL 계층 아님 |
| §5 COA | **부재** | 계정과목 체계 없음. 손익 컴포넌트로 대체 |
| §6 GL | **부재** | 원장 없음(정산/이벤트로그는 복식부기 아님) |
| §7 Double-entry | **부재** | 차변/대변 균형 없음. 단식 컴포넌트 합산 |
| §8 Journal Entry | **부재** | 불변 분개 없음. 대응물=정산행/이벤트로그 |
| §9~§10 AR/AP | **부재/부분** | AR 부재(정산 대기 status 부분)·AP 부분(정산 지급+`action_request`) |
| §11 Revenue Recognition | **부분** | 구독(Paddle/Stripe)·판매시점. ASC606/IFRS15 형식 아님 |
| §12 Settlement | **★강함** | 정산 5종 테이블·머니경로·멱등 재실행 |
| §13 Payment | **★실재** | `Payment`·`BillingMethod`·PG(MoR). 분개 연계는 손익 반영 |
| §14 Payout | **부분** | creator/파트너 지급·이력. 불변 payout 원장 부분 |
| §15 Tax Engine | **★VAT 실재** | `Pnl::vat` 상계·과세기간·리버스차지·MoR. GST/원천 부분 |
| §16 Tax Calculation | **부분 준수** | VAT pass-through·마진 제외(이중계상 방지)·국내 세금계산서 매체 구분 |
| §17 Multi-Currency | **★실재** | base KRW·`fxToKrw`·보고통화·통화별 처리 |
| §18 Exchange Rate | **부분** | `fxToKrw` 적용. 환율 이력 테이블 부분 |
| §19 Reconciliation | **★실재** | KR/PG/ROAS/WMS 대사·recon 티켓 |
| §20 Financial Reporting | **부분(손익만)** | `Pnl`(IS 유사)·`Reports`. BS/CF/시산표 부재 |
| §21 ERP Integration | **부재** | SAP/Oracle/더존/영림원 커넥터 없음 |
| §22 Financial Audit Trail | **부분** | `SecurityAudit`·정산 이력·`action_request`. 분개 감사 대상 없음 |
| §23 Security(Maker-Checker/SoD) | **부분** | RBAC·`action_request`·high-value 게이트(289차). 형식 Maker-Checker 부분 |
| §24 Monitoring | **부분** | 정산 상태·`AnomalyDetection`. Ledger 불균형=대상 없음 |
| §25 Logging | **부분** | error_log·정산 이력. Journal/Trace ID 부재 |
| §26 Disaster Recovery | **부분** | DB 백업·정산 재실행. Ledger 무결성=대상 없음 |
| §27~§28 PHP/Claude(Accounting Engine/Ledger Repo/Journal Service/Event Sourcing) | **부분** | ★`Pnl` SSOT·정산·VAT·FX·대사. 복식부기 Engine/Journal Service/Event Sourcing 부재 |
| §29~§30 검증(ledger:health/journal:validate 등) | **대상 없음** | artisan 없음. `/v424/pnl`·`/v419/kr/recon`·`/v427/pg/reconciliation` API 로 대체 |

---

## 4. 확립된 표준 (신규 재무 코드가 따를 정본)

- ★**손익 SSOT = `Pnl`**(v424 서버). 신규 손익/재무 지표는 이 핸들러 확장(중복 손익 산식 신설 금지). ★**산식은 클라(GlobalDataContext.pnlStats)와 100% 동일**(무회귀). 컴포넌트 소스=`orderhub_settlements`·`channel_orders`(WAC COGS)·`performance_metrics`·`influencer_store`.
- ★**VAT 정본 = `Pnl::vat`**: 매출세액vs매입세액 상계·과세기간 버킷팅·**해외광고비 리버스차지 제외**·Paddle MoR 납부뷰. ★**VAT 는 pass-through(마진 미반영·이중계상 방지)** — `kr_settlement_line.vat` 캡처. 신규 세금은 이 원칙 승계.
- ★**다통화 정본 = 내부 base KRW + `Connectors::fxToKrw`**. 신규 외화 금액은 반드시 `fxToKrw` 정규화(무변환 방치=IDR ~12배 과대계상 상시결함). 보고통화 환산은 역방향 뷰.
- ★**정산 = 멱등(Idempotent) 재실행**. `settlement`/`kr_settlement_line`/`orderhub_settlements`/`pg_settlement`/`creator_settlements` 확장. ★**가짜녹색 금지**(288차 정산 zero-out·`ok=>true` 위장 금지)·취소제외 술어 2축 통일(286차).
- ★**대사(Reconciliation) 정본**: KR recon(`/v419/kr/recon`)·PG recon(`/v427/pg/reconciliation`)·ROAS recon·WMS 재고대사 확장. 대사 티켓 상태관리.
- ★**정직 미산출·SSOT**: 산출 불가=null+사유(임의값 금지)·값 단일소스 실시간 일체화(한 값 변경=관련 전부 동기화). PII 미저장(집계 코호트).
- ★**고위험 재무 승인**: high-value 게이트(₩5M↑ 무승인 송출 차단·289차)·`action_request` 승인·RBAC. 테넌트 격리 절대(헤더위조 정산행 주입 차단·`KrChannel` fail-secure).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **복식부기(Double-entry)·General Ledger·Chart of Accounts·Journal(차변/대변)** — 안 함. 이 플랫폼은 **관리회계·운영 손익**(마케팅/커머스 수익성)이 목적이지 **법정 부기 시스템**이 아니다. 복식부기 도입=회계 도메인 전면 신설.
2. **AR/AP 원장·재무제표(BS/CF/시산표)** — 부재/부분. `Pnl` 이 관리 손익(IS 유사)을 제공하되 GAAP/IFRS 재무제표는 대상 아님.
3. **전자세금계산서 발행(국세청 연계)** — 안 함. VAT 는 **계산·상계·납부뷰**(`Pnl::vat`)까지. 세금계산서 발행은 별도 인증/연계 선행.
4. **ERP 연계(SAP/Oracle/Dynamics/더존/영림원)** — 안 함. ERP 커넥터 없음(정산 API/CSV export 는 존재). ERP 연동=커넥터 표준(Part028) 확장 시 재검토.
5. **Revenue Recognition 형식 기준(ASC606/IFRS15)·Event Sourcing 회계** — 안 함. 구독(Paddle/Stripe)·판매시점 매출. 형식 Rev Rec 엔진 부재.
6. **환율 이력 테이블·Ledger 무결성 검증·형식 Maker-Checker** — 부분. `fxToKrw`·정산 재실행·`action_request` 승인·high-value 게이트가 대응물.
7. **artisan `ledger:*`/`journal:*`/`settlement:*` 명령** — 없음(Slim). `/v424/pnl`·`/v419/kr/recon`·`/v427/pg/reconciliation` API 로 대체.

★**준수하는 실 원칙(강함)**: **실순이익 SSOT(핵심 경쟁력)·VAT 상계(pass-through·이중계상 방지)·다통화 fxToKrw 정규화·멱등 정산·다도메인 대사·정직 미산출(null+사유·가짜녹색 금지)·값 단일소스 일체화·high-value 승인 게이트·테넌트 격리**.

---

## 6. Claude Code 구현 규칙

1. 손익=`Pnl` SSOT 확장(중복 산식 금지·클라와 100% 동일 유지·무회귀). 컴포넌트 소스=orderhub_settlements/channel_orders(WAC)/performance_metrics/influencer_store.
2. ★세금=`Pnl::vat` 확장(매출vs매입 상계·리버스차지·MoR). **VAT pass-through·마진 미반영**(이중계상 방지).
3. ★외화=`Connectors::fxToKrw` 정규화 필수(무변환 방치 금지). 내부 base KRW·보고통화 환산.
4. ★정산=멱등 재실행·정산 5종 테이블 확장. **가짜녹색 금지**(288차)·취소제외 술어 통일(286차)·대사(recon) 연계.
5. ★정직 미산출=null+사유(임의값 금지)·SSOT 일체화·PII 미저장. 고위험=high-value 게이트·`action_request` 승인·테넌트 격리.
6. 복식부기/GL/COA/AR-AP/전자세금계산서/ERP(SAP/더존 등) 를 "명세에 있다"는 이유로 이식하지 않는다(관리회계 범위·법정부기 아님). ERP/부기 도입은 회계 도메인 신설 결정 후.

---

## 7. Completion Criteria

- [x] 재무 스택 **실측**(복식부기/GL/COA/Journal/AR-AP/재무제표/전자세금계산서/ERP 부재·`Pnl` 손익 SSOT·VAT 상계·`fxToKrw`·정산 5종·대사 4종 실재)
- [x] 명세 §3~§30 **섹션별 매핑·판정**(Double-entry/GL/ERP 부재 증명·운영 손익 강함 명시)
- [x] 실 재무(Pnl SSOT+VAT+FX+정산+대사) 성문화(§4)
- [x] ★실순이익 SSOT(핵심 경쟁력)·VAT pass-through(이중계상 방지)·fxToKrw·멱등 정산·정직 미산출·high-value 승인·테넌트 격리 명시
- [x] 의도적 미적용 + 사유(§5) — 복식부기/GL/COA/AR-AP/전자세금계산서/ERP/Rev Rec
- [x] Claude Code 규칙(§6) · `/v424/pnl`·`/v419/kr/recon`·`/v427/pg/reconciliation` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **관리회계·운영 손익**(실순이익 SSOT + VAT 상계 + 다통화 FX +
> 멱등 정산 + 다도메인 대사)의 성문화이지 **법정 복식부기·GL·ERP** 이식이 아니다. 이 저장소는 **손익 계산이
> 핵심 경쟁력**(강함)이나 **회계 원장(GL)은 별개**(부재) — 두 축을 혼동하지 않는다. ERP/부기는 회계 도메인
> 신설 결정 후 재검토.

---

## 다음 Part

**CCIS Part032 — Workflow Engine, BPMN, Business Rules & Decision Automation** — ★사전 실측 예고: 형식 BPMN 2.0/DMN 엔진(Camunda/Flowable)은 **부재**하나, 워크플로 실체는 **`JourneyBuilder`(정본 워크플로 캔버스·MEA 054 워크플로 엔진 실재)·`RuleEngine`(규칙)·`Decisioning`/`AutoRecommend`(의사결정)·`action_request`+`agent_mode`(승인 워크플로·Human Task)·cron 스케줄러(Part019)·`Alerting`(SLA)**로 실재. Part032 도 실측→BPMN/DMN 엔진 부재증명→JourneyBuilder+RuleEngine+Decisioning+action_request 성문화(BPM 엔진 이식 금지). ★MEA 060 Hyperautomation=PARTIAL·"워크플로 엔진 실재 vs BPM 엔진 부재" 스코프 분리(060 D-2) 승계.
