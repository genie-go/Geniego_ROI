# GeniegoROI Claude Code Implementation Specification

# CCIS Part056 — Enterprise ESG, Sustainability, Carbon Intelligence & Green IT Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise ESG·Sustainability·Carbon Intelligence·Green IT 표준을 수립한다.

> ★**성격(★MEA 063 승계 — "표면만 완비·실체 공동(空洞)"·팔고 있는데 없다)**: 본 Part 는 ★**MEA Part063(ESG/
> Carbon) 판정을 그대로 승계**한다. ESG 는 이 저장소에서 **표면(메뉴/라벨/마케팅/Pro 유료게이트/챗봇 지식)은
> 완비돼 있으나 백엔드 실체는 공동(空洞)**이다. 실측: **백엔드 ESG/carbon/emission/scope/GHG = 0**(grep 0·
> `backend/src`) · 프론트는 표면만(**`Dashboard`/`Landing`/15개국 i18n 라벨/챗봇 지식**·`ESGTab` API/state 0·
> **전 셀 noData**·MEA 063). ★★**MEA 063 판정 = "063=팔고 있는데 없었다"**(Part044 블록체인 "팔지도 않고
> 없다"와 구별) → **표면 완비가 오히려 위험**(Pro 유료게이트로 팔면서 실체 0 = **가짜녹색(288차 systemic)
> 유형**). ★★**핵심 = 비용축≠환경축(오흡수 절대 금지)**: **배송비/물류비 ≠ 탄소배출량**(배출계수 없이 비용→
> 배출량 변환 = **날조**) · **`SupplyChain` risk/delayRate ≠ ESG 리스크**(운영 리스크 축) · **`Rollup`/P&L
> 집계 ≠ Carbon Accounting(Scope 1/2/3)**(비용 회계 축). 명세가 다루는 **Carbon Accounting·Scope 1/2/3·
> Emission Factors·Energy Monitoring·ESG KPI·Sustainability Reporting·Carbon Ledger·GRI/ISSB/CSRD/TCFD**는
> **백엔드 전면 부재**한다. Part001 §4 에 따라 실측 → ESG 실체 공동 증명 → 표면만 존재·백엔드 부재 정직
> 성문화했다. ★정본=**MEA 063** 승계·**"비용축≠환경축"·날조 금지·재판정 금지**. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — ESG 표면 vs 실체 공동

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| ESG Architecture | Systems→ESG Collection→Carbon Engine→KPI→Report | **실체 공동** — 백엔드 ESG 수집/엔진 0. 표면(메뉴/라벨)만 |
| ESG Management | Strategy/Policy/Objective/Performance | **부재(표면만)** — 메뉴·마케팅 문구. 백엔드 0 |
| Sustainability Management | Program/Resource/Waste | **부재** — 백엔드 0 |
| Carbon Intelligence | Analytics/Forecast/Trend/Benchmark | **부재(실체 공동)** — `ESGTab` API/state 0·전 셀 noData |
| Carbon Accounting | Inventory/Calculation/Emission Factors/Ledger | **부재** — ★**배출계수(Emission Factors) 없음**. Carbon Ledger 0 |
| Scope 1 / 2 / 3 | Direct/Energy/Supply Chain 배출 | **부재** — Scope 계산 0. ★**`Rollup`/P&L≠Scope 회계**(오흡수 금지) |
| Green IT | Server/Cloud/Power Efficiency | **부재** — 서버 전력/효율 측정 0(단일 VPS·Part045). |
| Energy Monitoring | Electricity/Fuel/Renewable | **부재** — 에너지 사용량 측정 0 |
| Sustainability KPI | Carbon Intensity/Energy Eff/Renewable | **부재(표면만)** — KPI 라벨(15개국)·전 셀 noData |
| ESG Dashboard | KPI/Carbon/Energy/Executive | **표면만** — 메뉴·탭 존재·**`ESGTab` state 0·전 셀 noData**·Pro 빈 화면(MEA 063 부수결함) |
| Sustainability Reporting | ESG/Carbon/Regulatory Report | **부재** — 보고서 생성 0 |
| Carbon Offset | Program/Credit/Tracking | **부재** — 상쇄 0 |
| Environmental Risk | Climate/Operational/Supply Chain Risk | **부재(오흡수 경계)** — ★**`SupplyChain` risk/delayRate ≠ ESG 환경 리스크**(운영 축·환경 축 아님) |
| ESG Governance | Committee/Approval/KPI Review | **부재** — 백엔드 0 |
| Compliance Reporting | GRI/ISSB/CSRD/TCFD | **부재** — 공시 대응 0 |
| Monitoring | Carbon/Energy/KPI/Score | **부재** — ESG 지표 산출 0 |
| Logging | ESG/Carbon Record ID | **부재** — ESG 감사 대상 0 |
| Security(RBAC/격리) | ESG 데이터 보호 | **대상 없음** — ESG 데이터 자체 부재. (표면 Pro 게이트=권한만) |
| Compliance(ISO 14001/50001/GHG Protocol/CSRD) | 환경 규정 | **부재** — 형식 환경 규정 대응 0 |
| Disaster Recovery | ESG/Carbon Ledger 복구 | **대상 없음** — ESG 데이터 없음 |
| Performance | KPI/Carbon Cache | **대상 없음** — 계산 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정 (전면 실체 공동 + 오흡수 경계)

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Measure Everything/Data Driven Sustainability/Carbon Transparency/Explainable/Compliance/Tenant Isolated) | **부재(표면만)** | ★**Measure Everything 미충족**(측정 0)·Carbon Transparency 0. Tenant Isolated=대상 없음 |
| §4 ESG Architecture | **실체 공동** | 백엔드 수집/엔진 0. 표면만 |
| §5~§6 ESG/Sustainability Management | **부재(표면만)** | 메뉴·마케팅. 백엔드 0 |
| §7 Carbon Intelligence | **부재(실체 공동)** | `ESGTab` API/state 0·전 셀 noData |
| §8 Carbon Accounting | **부재** | ★배출계수 없음·Carbon Ledger 0 |
| §9 Scope 1/2/3 | **부재(오흡수 경계)** | ★`Rollup`/P&L≠Scope 회계(비용 축) |
| §10 Green IT | **부재** | 서버 전력/효율 0(단일 VPS) |
| §11 Energy Monitoring | **부재** | 에너지 측정 0 |
| §12 Sustainability KPI | **부재(표면만)** | KPI 라벨·전 셀 noData |
| §13 ESG Dashboard | **표면만** | 메뉴/탭·state 0·Pro 빈 화면 |
| §14 Sustainability Reporting | **부재** | 보고서 0 |
| §15 Carbon Offset | **부재** | 상쇄 0 |
| §16 Environmental Risk | **부재(오흡수 경계)** | ★`SupplyChain` risk≠ESG 환경 리스크 |
| §17 ESG Governance | **부재** | 백엔드 0 |
| §18 Compliance Reporting | **부재** | GRI/ISSB/CSRD/TCFD 0 |
| §19 Monitoring | **부재** | ESG 지표 0 |
| §20 Logging | **부재** | ESG 감사 0 |
| §21 Security | **대상 없음** | ESG 데이터 부재 |
| §22 Compliance | **부재** | ISO 14001/GHG Protocol 0 |
| §23 Disaster Recovery | **대상 없음** | ESG 데이터 없음 |
| §24 Performance | **대상 없음** | 계산 없음 |
| §25~§26 PHP/Claude(ESG/Carbon Accounting/Reporting Service/Emission Factor Adapter) | **부재** | ★백엔드 ESG 서비스 0·배출계수 Adapter 0 |
| §27~§28 검증(esg:health/carbon:calculate) | **대상 없음** | artisan 없음·ESG 백엔드 없음 |

---

## 4. 확립된 표준 (ESG 실체 공동 정직 표기 + 향후 구현 시 원칙)

- ★★**비용축≠환경축(오흡수 절대 금지·최우선 원칙)**: **배송비/물류비/광고비 등 비용을 배출계수 없이 탄소배출량으로 변환하지 않는다**(=날조). **`Rollup`/`Pnl` 집계는 Carbon Accounting(Scope 1/2/3)이 아니다** · **`SupplyChain` risk/delayRate 는 ESG 환경 리스크가 아니다**(운영 리스크 축). 이름·개념이 겹쳐도 환경 실체 아님.
- ★★**표면 완비·실체 공동 정직 표기(MEA 063)**: ESG 메뉴/라벨/Pro 게이트/챗봇 지식은 **표면**이고 백엔드는 **0**이다. ★**가짜녹색 금지(288차 systemic)**: 실데이터 없는 셀은 **noData(빈 상태)** 유지·`ok=>true` 위장 금지·**임의 배출량 산출 금지**. ★**Pro 유료게이트로 실체 공동 기능 판매 = 개선 대상**(정직 고지 또는 실구현 선행).
- ★**향후 구현 시(제품 결정 후) 원칙**:
  - ★**배출계수(Emission Factors) 확보 선행**(GHG Protocol/국가 계수 DB)·**출처/버전 기록**(DATA 헌법 lineage·Part034).
  - **Scope 1/2/3 실측 데이터**(직접 연료·구매 전력·공급망) 확보 후에만 산출·**추정 시 추정임을 명시**·근거/신뢰도(V4 Explainable).
  - ★**정직 미산출**: 데이터/계수 없으면 `null`+사유(Mmm/PriceOpt 문화·Part055). **0/임의값 금지**(0은 "배출 없음"으로 오독).
  - 기존 확장: `Rollup`(집계 인프라)·`Reports`·`DataPlatform`(출처)·V3 Trust(품질) 재사용. **중복 엔진 금지**.
- ★**테넌트 격리·감사**: ESG 데이터 도입 시 `SecurityAudit`·테넌트 격리·PII 미저장.
- ★★**MEA 063 중복·재판정 금지**: ESG 실체 공동=MEA 063 정본. 본 Part 는 CCIS 관점 성문화이지 재판정 아님.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 실체 공동·MEA 063 승계)

1. **Carbon Accounting·Scope 1/2/3·Emission Factors·Carbon Ledger** — 백엔드 전면 부재(grep 0). ★**배출계수 없이 산출 불가**(비용→배출량 변환=날조). GHG Protocol 계수 DB·Scope 실측 데이터 선행.
2. **Energy Monitoring·Green IT(서버 전력/효율)** — 부재. 단일 VPS(전력 계측 없음·Part045). 클라우드 이전 시 provider 지표.
3. **Sustainability Reporting·Compliance(GRI/ISSB/CSRD/TCFD/ISO 14001)** — 부재. 공시 대응 0. 실측 데이터·계수·거버넌스 선행.
4. **ESG Dashboard/KPI** — ★**표면만**(메뉴/탭/15개국 라벨·`ESGTab` state 0·전 셀 noData·Pro 빈 화면). 백엔드 산출 0.
5. **`Rollup`/`Pnl`/`SupplyChain` 을 Carbon/ESG 로 오흡수 금지** — 비용/운영 축이지 환경 축 아님(배출계수 없이 변환=날조).
6. **artisan `esg:*`/`carbon:calculate` 명령** — 없음(Slim·ESG 백엔드 없음).

★**정직 선언(MEA 063)**: ESG 는 **표면(메뉴/라벨/Pro 게이트/챗봇)만 완비·백엔드 실체 0**이며, **팔고 있으나 실체가 없다**. ★**비용축≠환경축**(배출계수 없이 비용→배출량=날조)·**가짜녹색 금지**(noData 유지·임의 산출 금지)·**Pro 유료 판매 실체 공동은 개선 대상**(정직 고지 또는 실구현).

---

## 6. Claude Code 구현 규칙

1. ★★**비용축≠환경축**: `Rollup`/`Pnl`(비용)·`SupplyChain`(운영 리스크)을 Carbon/Scope/ESG 리스크로 변환·표기하지 않는다. **배출계수 없이 비용→배출량 산출 금지**(날조).
2. ★★**가짜녹색 금지**: ESG 셀 데이터 없으면 **noData(빈 상태)** 유지·임의 배출량/KPI 산출 금지·`ok=>true` 위장 금지(288차).
3. ESG 실구현 시: **배출계수(GHG Protocol) 확보+출처/버전 기록** 선행·Scope 1/2/3 **실측 데이터** 후 산출·추정은 추정 명시·근거/신뢰도(V4). ★정직 미산출(계수/데이터 없으면 null+사유).
4. 기존 확장(`Rollup`/`Reports`/`DataPlatform`/V3 Trust) 재사용·중복 엔진 금지·`SecurityAudit`·테넌트 격리·PII 미저장.
5. ★**Pro 유료게이트로 실체 공동 ESG 판매는 개선 대상** — 정직 고지 또는 실구현 선행(가짜녹색 방지).
6. ★★ESG 실체 공동 판정=MEA 063 정본(재판정 금지). 표면 완비를 실구현으로 오인하지 않는다.

---

## 7. Completion Criteria

- [x] ESG 스택 **실측**(백엔드 ESG/carbon/scope/emission 0·표면만(메뉴/15개국 라벨/Pro 게이트/챗봇·`ESGTab` state 0·전 셀 noData)·MEA 063 승계)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(ESG **실체 공동** 증명·표면 완비·백엔드 부재·"팔고 있는데 없다")
- [x] ★★비용축≠환경축(오흡수 절대 금지·배출계수 없이 변환=날조)·표면 완비·실체 공동 정직 표기·가짜녹색 금지 성문화(§4)
- [x] 향후 구현 시 원칙(배출계수 선행·Scope 실측·정직 미산출·기존 확장) 명시
- [x] 의도적 미적용 + 사유(§5) — Carbon Accounting/Scope/Emission Factors/Energy Monitoring/Reporting/Compliance(실체 공동)
- [x] Claude Code 규칙(§6) · 비용축≠환경축·가짜녹색 금지·MEA 063 재판정 금지 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 **MEA 063 승계** — ESG 는 **표면(메뉴/라벨/Pro 게이트/챗봇 지식)만
> 완비·백엔드 실체 0**이며 **팔고 있으나 없다**(Part044 블록체인 "팔지도 않고 없다"보다 더 주의). ★★**핵심 =
> 비용축≠환경축**: **배송비/물류비를 배출계수 없이 탄소배출량으로 변환하면 날조**이고, **`Rollup`/`Pnl`은 Carbon
> Accounting 이 아니며, `SupplyChain` risk 는 ESG 환경 리스크가 아니다**. ★**가짜녹색 금지**(noData 유지)·**Pro
> 유료 판매 실체 공동은 개선 대상**. ESG 실체 공동 판정=MEA 063 정본(재판정 금지).

---

## 다음 Part

**CCIS Part057 — Enterprise Edge AI, Federated Learning, TinyML & Distributed Intelligence** — ★사전 실측 예고: ★**Part027(MLOps)·Part037(IoT/Edge)와 중복** — 형식 Edge AI/Federated Learning/TinyML/On-Device Learning 은 **부재**(자체 ML 학습 없음·Part027·물리 디바이스 없음·Part037 out of scope)이나, AI 실체는 **중앙 `ClaudeAI` Gateway(외부 LLM)·통계모델(`Mmm`/`AttributionEngine`)·`ModelMonitor`·`WmsCctv`(엣지 카메라이나 서버측 리먹스)**로 부분 실재. Part057 도 실측→Edge AI/Federated Learning/TinyML 부재증명→중앙 AI 성문화. ★Part027(자체 ML 학습 부재)·Part037(디바이스 out of scope) 승계·"Edge=서버측 처리이지 On-Device 아님" 오흡수 차단·MEA 061 Edge weak.
