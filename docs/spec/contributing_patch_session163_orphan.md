# 163차 731 orphan refs 정량화 + §6 #41 v2 영구화

> **세션**: 163차
> **트랙**: #43 → 731 orphan 후속 (부분 종결)
> **저장**: 2026-05-26
> **방식**: CC inline heredoc (§7 #37 v4)

## 1. 731 orphan refs 정량

JSX 호출하지만 ko.js 미존재 = runtime `i18next::translator: missingKey ko` warning.

| 항목 | 값 |
|---|---:|
| direct refs (literal) | 5,272 |
| ko leaves (canonical) | 30,656 |
| **orphan refs** | **731 (5,272 의 14%)** |

## 2. namespace 분포 (top)

| namespace | orphan count | 비중 |
|---|---:|---:|
| performance | 146 | 20% |
| pnl | 101 | 14% |
| influencer | 63 | 9% |
| recon | 56 | 8% |
| email | 53 | 7% |
| marketing | 37 | 5% |
| priceOpt | 28 | 4% |
| approvalsPage / dataProduct / writebackPage | 23 each | 3% each |

상위 5 namespace = 419 / 731 = **57%**.

## 3. root cause 분석

### 3.1 가설 1: pnl ↔ performance rename (반박)

**가설**: 247 orphan (34%) 이 두 namespace 에 집중 → rename mid-flight.

**검증 (M2-3)**:
- pnl.X orphan AND performance.X exists in ko: **1건** (kpiRoas)
- performance.X orphan AND pnl.X exists in ko: **2건** (adSpend 외)
- 총 3건 (247 의 1.2%) → **rename 가설 반박**

### 3.2 가설 2: 미완성 namespace (확정)

**resolution rate** (JSX refs 중 ko 존재 비율):

| namespace | ko leaves | JSX refs | resolved | rate |
|---|---:|---:|---:|---:|
| pnl | 46 | 110 | 9 | 8% |
| performance | 24 | 150 | 4 | 3% |

**확정**: 두 namespace 가 **mid-build abandoned** — JSX 는 호출, ko 는 미작성. `influencer` / `recon` / `email` 도 동일 패턴 추정 (별도 검증 필요, P5 트랙).

### 3.3 가설 3: guide* template multiplier (확정)

orphan tail 교집합 9건 중 5건 = guide template:
- `dismiss`, `guideStepsTitle`, `guideSub`, `guideTipsTitle`, `guideTitle`

**해석**: 온보딩 tooltip template 이 N 페이지에 copy-paste, locale 미완. 1회 수정 → N 페이지 healing.

## 4. 영구화 항목

### §6 #41 v2 (강화)

**163 본 세션 §6 #41 재발 3회 누적**:

| # | 가설 | 반박 |
|---|---|---|
| 1 | pages_backup useT 7 hits → consumer count inflated | SKIP_PATH_SUBSTRINGS patch Δ=0, line 56 SKIP_DIRS 사전 prune |
| 2 | orphan prefix-covered 137 = false alarm | prefix consumer 와 ko 존재 별개, 137 도 runtime warning |
| 3 | pnl ↔ performance rename 가설 | 247 중 3건 (1.2%) 만 매칭, 반박 |

**v1 mitigation 한계**: "실측 명령 동시 작성" 의무 만으로 본인 추론 brake 부족. 검수자가 실측 명령 작성 시 가설 방향성에 편향.

**v2 강화**:
- (a) 가설 수립 시 **반대 가설 (null hypothesis) 명시** 의무 — "가설 X 이면 실측 Y, 가설 ¬X 이면 실측 Z"
- (b) 1 세션 내 §6 #41 재발 2회 이상 시 **자동 carry-over** — 본 트랙 종결, 별도 세션에서 재진입
- (c) 본인 추론 발화 후 CC 가 반박/정정 시 **§6 #41 카운트 명시** (자기 추적 강화)

### 후속: P5 트랙 (i18n locale completion)

별도 세션 영역. 본 spec 의 데이터:
- 731 orphan 의 namespace 분포
- pnl/performance abandoned 확정
- guide template multiplier
- 영향 페이지 N 미산정 (P5 진입 시 첫 step)

P5 전제 조건:
- 162 G8 영구 보호 + 163 trap J/K/L 영구화 ✓ (충족)
- §6 #41 v2 적용 (가설 brake 강화)
- guide template 출처 식별 1 step (N 페이지 multiplier 효율 측정)

## 5. 부분 종결 사유

163 본 세션 작업 누적:
- 3 commit / 2 push batch / 3 트랙
- §6 #41/#42/#43 + §7 trap G/H/I/J/K/L 6 trap 영구화
- 18,001 dead-key + 731 orphan 정량화

**잔여 step (carry-over)**:
- M3: guide* template 출처 식별
- M4: influencer / recon / email abandoned 검증
- 영향 페이지 N 산정

본 트랙 부분 종결, 잔여는 164 P5 트랙 진입 시.

