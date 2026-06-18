# AI_PROFIT_OS_ARCHITECTURE.md

GeniegoROI = AI Profit Intelligence Operating System (Measure → Analyze → Decide → Execute → Learn)

- 기준: HEAD `ec389a9` (231차) · 원칙: **기존 구조 위에 얹는 통합 레이어**(신규 중복 금지)

> "GeniegoROI is the world's first AI Profit Intelligence Operating System that measures, analyzes, decides, executes, and learns across marketing, commerce, logistics, live commerce, and customer repurchase to maximize true net profit."

---

## 0. 설계 원칙
1. **단일 진실원천(SSOT)**: 주문(`channel_orders`)+광고비+정산이 진실원천, 나머지는 파생(`GlobalDataContext.pnlStats`). 한 값 변경 → 관련 전부 동시 일체화.
2. **얹기(overlay), 갈아엎기 금지**: 5단계는 기존 핸들러/페이지를 오케스트레이션하는 얇은 레이어. 기존 ROI/AI/Agent/Dashboard 재사용.
3. **승인 우선 자율성**: 민감 실행 기본값 = Approval Required. 모든 실행 → `audit_log`+`optimization_log`.
4. **무후퇴**: 모든 확장은 기존 숫자/동작 보존. DB는 backward-compatible ALTER만(DROP/컬럼삭제 금지).

---

## 1. 레이어 다이어그램 (기존 컴포넌트 매핑)

```
┌─────────────────────────── EXECUTIVE LAYER (신규=통합 진입) ───────────────────────────┐
│  Executive AI Copilot  ← AIInsights.jsx 확장 (ClaudeAI + pnlStats + Anomaly + action) │
│  Role Views (CEO/CFO/CMO/COO) ← 기존 대시보드 탭 필터(신규 대시보드 X)                 │
└───────────────────────────────────────────────────────────────────────────────────────┘
        ▲ measure         ▲ analyze        ▲ decide        ▲ execute        ▲ learn
┌───────┴────────┐ ┌──────┴───────┐ ┌──────┴──────┐ ┌──────┴───────┐ ┌──────┴────────┐
│ MEASURE         │ │ ANALYZE       │ │ DECIDE       │ │ EXECUTE       │ │ LEARN          │
│ Rollup          │ │ PnLDashboard  │ │ AutoRecommend│ │ action_request│ │ audit_log      │
│ OrderHub(COGS/  │ │  순이익워터폴 │ │  다목표/베이즈│ │  2단계 승인   │ │ Db::audit(231) │
│  배송비)        │ │ AnomalyDetect │ │ Mmm.optimize │ │ Alerting.exec │ │ optimization_  │
│ performance_    │ │  (SPC)        │ │ PriceOpt.sim │ │ AdAdapters    │ │  log           │
│  metrics        │ │ Attribution   │ │ ClaudeAI     │ │ (Meta/Google/ │ │ channel_       │
│ 정산/WMS/Pixel  │ │  Engine(markov)│ │  (언어추천)  │ │  TikTok/Naver)│ │  benchmark     │
│ kr_fee_rule     │ │ GraphScore    │ │              │ │ Approvals.jsx │ │  (cold→warm)   │
└─────────────────┘ └───────────────┘ └──────────────┘ └───────────────┘ └────────────────┘
         │                  │                                  │
         └──────────────────┴── Profit Knowledge Graph (GraphScore+Attribution+순이익가중) ──┘
         │
    Governance & Trust (DataTrustDashboard·audit_log·KPI Registry·ROI Formula Version)
    Security (멀티테넌트 X-Tenant 강제·Crypto AES-256-GCM·MFA·RBAC·하위관리자 view/edit)
```

---

## 2. 단계별 사양 (기존 → 추가)

### MEASURE — 이미 완성
- 소스: `channel_orders`(주문), `performance_metrics`(광고), `orderhub_settlements`/`kr_settlement_line`(정산), `wms_*`(창고/배송), `kr_fee_rule`(배송비·무료배송 기준), `attribution_touch`(터치).
- 파생 SSOT: `GlobalDataContext.pnlStats` = 매출 − COGS(srvCogs) − 광고비 − 수수료 − 쿠폰 − 반품 − **배송비(231차)** = operatingProfit.
- **추가 없음.**

### ANALYZE — 분석 완성 + 상위 판정 추가
- 기존: `PnLDashboard` 워터폴 · `AnomalyDetection`(SPC) · `AttributionEngine`(markov) · `Mmm`(반응곡선) · `GraphScore`.
- **추가(통합 레이어)**:
  - **Profit Health Score**(신규 탭, PnLDashboard): Gross/Operating Margin·반품률·배송비율·CAC를 Green/Yellow/Red 판정. 순수 파생(pnlStats) → 무후퇴.
  - **Root Cause**(AnomalyDetection 확장): 이상점 발생 시 워터폴 항목별 델타 기여 분해(어느 비용/채널이 순이익을 깎았나).

### DECIDE — 의사결정 엔진 통합
- 기존: `AutoRecommend`(채널 예산) · `Mmm.optimize`(예산배분) · `PriceOpt.simulation`(가격) · `ClaudeAI`(언어).
- **추가**: **What-if Scenario Builder**(PnLDashboard ForecastTab): 광고비±/배송비±/반품률± 입력 → Mmm.optimize+PriceOpt.sim+pnlStats 재계산으로 순이익 영향 출력. 시나리오 비교.

### EXECUTE — 폐쇄루프 + Agent 권한모드
- 기존: `action_request`(2단계 승인 approvals_json) → `Alerting.executeAction` → `AdAdapters`(4채널, PAUSED 기본·킬스위치) → `Approvals.jsx`.
- **추가**: **Agent 권한모드** — `app_user.agent_mode`('recommend'|'approval'|'auto', 기본 approval) 컬럼 + AdAdapters 실행 전 게이트. auto는 신뢰도 임계·정책 범위 내만.

### LEARN — 학습 루프 표준화
- 기존: `audit_log`+`Db::audit`(231차) · `optimization_log`(전후 alloc) · `channel_benchmark`(cold→warm 실측 갱신).
- **추가**: **Before/After Profit 비교**를 optimization_log에 표준 필드로 + Copilot이 결과를 다음 추천에 반영(Learning Memory = audit/optimization 조회).

---

## 3. Profit Knowledge Graph
- 기존 `graph_node`/`graph_edge`(GraphScore) + `attribution_*`(MTA) 재사용.
- **확장**: 엣지 가중치에 **순이익 기여**(margin − 배송비 − 반품비) 추가 → Customer/Campaign/Product/SKU/Channel/Warehouse/Carrier/LiveSession/Influencer/Coupon/Cost/Profit 노드 간 순이익 흐름 질의. 신규 테이블 불요(meta_json·weight 확장).

## 4. Governance & Trust
- `DataTrustDashboard` 확장 + **KPI Definition Registry / Metric Dictionary**를 DB 메타(app_setting 또는 신규 경량 테이블 `metric_def`)로 외부화 + **ROI Formula Version**(`roi_formula_version`) — 계산식 변경 이력·소급. Agent Decision Trace = audit_log details_json 확장.

## 5. Security (SECURITY_REVIEW.md 상세)
- 견고: 멀티테넌트 X-Tenant 강제·Crypto AES-256-GCM·MFA(TOTP)·RBAC(api_key role+scope, team_role, 하위관리자 view/edit)·SQLi(PDO)·로그인 rate-limit·HMAC webhook.
- 보강: ABAC·SSO Ready·OAuth 토큰 암호화 검증·일반 API rate-limit·CSRF 토큰/SameSite·**응답 표준 봉투**·세션 쿠키 보안.

---

## 6. 구현 순서(권장) — 전부 기존 확장
1. **Profit Health Score 탭**(PnLDashboard, 순수 파생·무위험) ← 즉시 가치
2. **Root Cause 분해 + action_request 연결**(AnomalyDetection 확장)
3. **What-if Scenario Builder**(ForecastTab, Mmm/PriceOpt 통합)
4. **Agent 권한모드**(app_user.agent_mode + AdAdapters 게이트)
5. **Executive Copilot 흐름**(AIInsights에 KPI/원인/액션/승인 연결)
6. **거버넌스**(ROI 공식 버전·KPI Registry DB)
7. **보안 보강**(응답 표준·rate-limit·CSRF·OAuth 토큰 암호화)
8. **역할별 View 프리셋**(기존 대시보드 탭 필터)

각 단계는 무후퇴·운영/데모 배포·헤드리스 검증·문서 갱신(IMPLEMENTED_UPGRADES/API_CHANGELOG/TEST_RESULTS/DB_MIGRATION_NOTES).
