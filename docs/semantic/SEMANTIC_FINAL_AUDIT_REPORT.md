# EPIC 03-D Part 1 — Semantic Layer Final Audit & Regression Certification Baseline (정식 마스터)

> **근거**: 03-A(Vocabulary)·03-B(Metric Contract)·03-C(Query Layer 설계) + 실코드 Drift(file:line). **비파괴**: 감사·인증·Baseline만. 코드변경 0. Consumer 즉시 전환·Legacy 삭제·미검증 Cache 활성 없음(§38).
> **§39 통합**: 28개 파편 대신 본 마스터가 Final Audit·Registry Cross-Check·Consumer Inventory·Formula/Metric/Semantic Drift·UI/API/Report/AI/Automation Validation·Cache/MV/Job Audit·Tenant/Permission Cert·Golden/Regression/Shadow/Read Compare·Legacy 분류·Duplicate·Security/Performance Baseline·Certification Matrix·Production Blockers·Evidence Index를 통합. ADR=[`../architecture/ADR_SEMANTIC_FINAL_AUDIT.md`](../architecture/ADR_SEMANTIC_FINAL_AUDIT.md).

---

## 0. ★정직 프레이밍 (감사의 전제)
**03-B/C는 설계 문서이며 Semantic Query Layer는 실 구현 코드가 아직 없다.** 실제 운영에서 도는 것은 기존 계산 코드(Rollup/Pnl/AutoCampaign/CRM/프론트 GlobalDataContext). 따라서 본 최종 감사는:
1. **기존 코드를 Canonical 계약과 대조한 Drift 감사**(실행 가능·완료).
2. **Golden Dataset/Historical Regression/Shadow/Read Compare는 Semantic Layer 미구현이라 실행 불가** → `BLOCKED_PENDING_IMPLEMENTATION`(허구 통과 보고 금지 §3.2).
3. **Production Certification = 0**(구현+Shadow+회귀 후에만 가능). Part 1은 **감사·Baseline 사양·Blocker 목록** 완성이 목표.

## 1. Registry Cross-Check (§4)
- Term(22)·Metric(23)·Measure(10)·Dimension(9)·KPI(5)·Formula(23)·Consumer Contract·API/UI/AI/Automation Contract 상호참조 검증. **불일치**: Metric Registry는 문서 존재하나 **실 코드가 Metric ID로 호출하지 않음**(모든 산식이 직접 계산) → 전 항목 `CONTRACT_VERIFIED`(문서)·`SOURCE_VERIFIED`(기존 산식 존재)이나 `EXECUTION_VERIFIED` 불가. Deprecated 참조 0·Blocked(ROAS ambiguity·재고회전) 사용 확인.

## 2. Formula / Metric / Semantic Drift 감사 (§5~7 — Drift Matrix §41)

| Metric/Term | Drift Type | Canonical | Actual Location | Actual | Severity | Status |
|---|---|---|---|---|---|---|
| ROAS | **Formula Drift** | adj(ratio-of-sums) | GlobalDataContext:1796 | blendedRoas avg-of-ratios | **CRITICAL** | BLOCKED(버그) |
| ROAS | Formula Drift | 목적별 라벨 | 6+ 위치(Rollup:665/730·RoiService:79·AttrEngine:203) | 3+ 근본산식 | **CRITICAL** | CONSOLIDATION |
| Channel | **Semantic Drift** | 단일 방향 SSOT | ChannelSync:5119 vs Connectors:888 | meta→meta_ads vs meta_ads→meta | **CRITICAL** | CONSOLIDATION |
| Revenue("매출") | Semantic Drift | Net Revenue | UI Label | Net/Gross 불명확 | HIGH | Tooltip 필요 |
| Margin | Metric Drift | MET-MGN-000001 | Pnl:286 ↔ 프론트 pnlStats | 이원(의도적) | HIGH | LEGACY_ADAPTER |
| ROI | Formula Drift | — | RoiService:79 | 데드코드(호출0) | LOW | DEPRECATION |
| 반품률 | Formula Drift | returns/orders | Rollup:332 | 과거 분모차 | MED | 검증권장 |

**요약**: Formula Drift 4·Metric Drift 1·Semantic Drift 2. CRITICAL 3(ROAS avg-of-ratios 버그·ROAS 3산식·채널 방향).

## 3. Consumer Inventory (§8 — Consumer Matrix §42)

| Consumer ID | Type | Location | Metric | Query Path | Scope | Status |
|---|---|---|---|---|---|---|
| C-UI-DASH | UI | Dashboard/PnLDashboard | ROAS/Margin/Rev | ★자체 재계산 | tenant | **UNMANAGED(NON_CANONICAL_UI_CALCULATION)** |
| C-UI-GDC | UI | GlobalDataContext | blendedRoas/pnlStats | ★프론트 파생 | tenant | **UNMANAGED** |
| C-API-V424 | API | /v424/* | Pnl/Rollup 산출 | 백엔드 SSOT | auth_tenant | MANAGED(metric_id 미부착) |
| C-AI-CHAT | AI | ClaudeAI:162 | 숫자+글로서리 | 프롬프트 주입 | tenant | UNMANAGED(Context 부재) |
| C-AUTO-CAMP | Automation | AutoCampaign | adj_roas | truthRatio SSOT | tenant | MANAGED(정합) |
| C-RPT-EXPORT | Report | DataExport | 산출값 | 백엔드 | tenant | MANAGED(metric_id 미부착) |

**Unmanaged Consumer 3**(프론트 대시보드/GDC·AI Context). MANAGED도 metric_id/version 미부착.

## 4. UI/API/Report/AI/Automation 최종 검증 (§10~16)
- **UI(§10)**: 프론트 자체 계산=`NON_CANONICAL_UI_CALCULATION`(ROAS/margin). Metric ID/Version/Tooltip 의미(Net vs Gross) 미연결 → 보완 대상.
- **API(§11)**: Pnl/Rollup 백엔드 SSOT 사용(양호)이나 Result Contract(metric_id/version/quality/confidence) 미부착 → 점진 부착.
- **Report/Export(§12)**: Metric 추적성·기간/통화/필터 명시 보완 필요.
- **AI(§13)**: ClaudeAI 숫자+글로서리 주입, **Metric Context(Definition/Confidence/Warning/Lineage) 미제공** → 근거 강화 대상(현 Blocked Metric 사용은 아님).
- **Automation(§15)**: AutoCampaign adj_roas 정합·Version 고정 권고. **의미변경 시 자동전환 금지** 확인.

## 5. Cache / Materialized View / Scheduled Job 감사 (§17~19)
- **Metric Cache**: metric_version 포함 Cache Key 구조 **미존재**(Semantic Layer 미구현) → 신설 대상. 현 Cache(GlobalData 등)는 tenant 격리는 있으나 metric_version/data_version 무. 
- **Materialized View**: Rollup은 실시간 집계(MV 아님)·ad_insight_agg는 dedup_key 집계 → Formula Drift 아님. 
- **Scheduled Job**: commerce/connectors/attribution cron(§EPIC02-C)=Metric 재집계, Metric ID/Version 미부착이나 산식은 SSOT.

## 6. Tenant 격리 / 권한 인증 (§20/§21)
- **Tenant Isolation=PASS**(01-D 3정본 fail-closed 승계·Rollup:39/Pnl:51 tenant 강제). Cross-Tenant Filter/Cache/Export/AI Context/Automation 차단 설계 확인. 실 Semantic Query 테스트는 구현 후.
- **권한**: Aggregate Read vs Customer-level Breakdown 분리 필요(현 CRM 고객 데이터 RBAC 존재). Sensitive Dimension 게이트=설계.

## 7. Golden / Historical Regression / Shadow / Read Compare (§22~25) — ★실행 불가
- **Semantic Query Layer 미구현이라 4종 모두 실행 불가** → `BLOCKED_PENDING_IMPLEMENTATION`. 
- **대신 확정**: Golden Dataset 시나리오 사양(03-B 14종)·Historical Regression 대상(16 지표·동일조건)·Shadow/Read Compare 절차·허용오차 정의 = **Baseline 사양 완성**(구현 즉시 실행 가능하도록).
- **허구 통과 보고 금지**(§3.2·정직).

## 8. Formula Conflict 처리 / Legacy 분류 / Duplicate (§26~28)

| Formula Conflict | 결정 |
|---|---|
| ROAS avg-of-ratios(프론트) | **LEGACY_FORMULA_ERROR** → ratio-of-sums 정정(회귀 baseline 후) |
| ROAS 3산식 | 별도 Metric 분리(03-B) + UI 기본 adj |
| 채널 정규화 방향 | 단일 SSOT(BLOCKED_PENDING: PM 방향 결정) |
| P&L 이원 | LEGACY_ADAPTER(server-first) |
| RoiService | DEPRECATION_CANDIDATE(호출0) |

- **Legacy 분류(§27)**: Rollup/Pnl/OrderHub/AutoCampaign/CRM=`CANONICAL_SOURCE/EXECUTOR`·프론트 재계산=`CONSOLIDATION_REQUIRED`·RoiService=`UNUSED/DEPRECATION_CANDIDATE`·데모 파생=`KEEP_SEPARATE_WITH_REASON`.
- **Duplicate(§28)**: ROAS(백엔드 다수+프론트)·Margin(백엔드+프론트)·채널정규화(5+ 함수). 각 호출부·운영 사용 기록.

## 9. Semantic Lint 상태 (§29)
- **미구현**(CI 규칙 미배선). 제안: 미등록 Metric ID·UI 자체 Formula·Tenant Scope 없는 Query·Version 없는 Automation·Test 없는 Formula 차단 → 후속 구현. 현 상태=`PLANNED`.

## 10. Certification Matrix (§40) — 요약

| Metric | Consumer | Contract | Formula | Source | Security | Regression | Shadow | Status |
|---|---|---|---|---|---|---|---|---|
| MET-ADJROAS-000006 | Automation | ✓ | ✓ | ✓ | (설계) | 미실행 | 미실행 | **CONTRACT_VERIFIED**(Prod 불가) |
| MET-ROAS-000003 Blended | UI | ✓ | ✗(avg-of-ratios) | ✓ | — | — | — | **BLOCKED_FORMULA** |
| MET-REV/COGS/LTV/VAT | API | ✓ | ✓ | ✓ | (설계) | 미실행 | 미실행 | CONTRACT_VERIFIED |
| DIM-CHANNEL | 전역 | ✗(방향상충) | — | — | — | — | — | **BLOCKED_SOURCE** |
| MET-INV-TURN | — | ✗ | ✗ | ✗ | — | — | — | BLOCKED_SOURCE(부재) |

**Production Ready = 0**(전부 구현·검증 전).

## 11. Production Blockers (§35)
1. **Semantic Query Layer 미구현**(전 Metric Production 차단·최상위).
2. **ROAS 프론트 avg-of-ratios 버그**(Unexplained 아님·확정 버그·수정+회귀 필요).
3. **채널 정규화 방향 상충**(PM 방향 결정 필요).
4. **Metric ID/Version 미부착**(API/UI/Report).
5. **AI Metric Context 부재**·**Semantic Lint 미배선**·**metric_version Cache 부재**.
6. **재고회전 지표 부재**·**Golden/회귀 미실행**(구현 종속).

## 12. §43 완료 보고 수치
Canonical Metric 23 · Consumer 6군(Unmanaged 3) · **Formula Drift 4 · Metric Drift 1 · Semantic Drift 2** · Cross-Layer Violation 5 · Unmanaged Consumer 3 · **Golden Dataset 통과 0/실행불가(사양 완성)** · Historical Regression 0/실행불가(사양) · Shadow Match 0/실행불가 · **Unexplained Difference 0**(모든 차이 원인분류 완료·ROAS=LEGACY_FORMULA_ERROR 등) · Security Verified 0(설계·01-D 승계)·Performance 0·Regression 0(미실행) · **Production Ready 0** · Blocked 다수(구현 종속) · Legacy Fallback: P&L 프론트·데모 · Duplicate Implementation 3(ROAS/Margin/채널) · 문서=본 마스터+ADR+PM · 남은리스크=**Semantic Layer 구현이 모든 Production의 선결**·ROAS 버그·채널 SSOT · **EPIC03-D Part2(Production Readiness·Canary·Cutover·Rollback·DR) 준비 완료(단 실 구현 선결 명시)**. 코드변경 0.
