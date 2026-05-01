# Journey Builder UI/UX 개선 계획

**작성일**: 2026-05-01  
**작성 시간**: 12:02 PM (KST)  
**작성자**: PM 에이전트  
**버전**: 1.0

---

## 📋 개요

Journey Builder는 GeniegoROI의 핵심 기능 중 하나로, 고객 여정을 시각적으로 설계하고 자동화하는 도구입니다. 이 문서는 Journey Builder의 UI/UX를 개선하여 사용자 경험을 향상시키기 위한 종합 계획을 제시합니다.

---

## 🎯 개선 목표

### 1. 즉시 수정 (P1 - 긴급)
- **KPI 카드 스타일 버그 수정**: 반응형, 테마 지원, 일관성 확보

### 2. 단기 개선 (1-2주)
- **온보딩 개선**: 첫 방문자를 위한 가이드 강화
- **모바일 최적화**: 터치 인터페이스 개선

### 3. 중기 개선 (1개월)
- **고급 기능 추가**: 드래그 앤 드롭, 템플릿, A/B 테스트
- **성능 최적화**: 대규모 여정 처리 개선

---

## 🔥 우선순위 1: KPI 카드 버그 수정 (긴급)

### 현재 문제점

#### 1. 코드 분석 (JourneyBuilder.jsx, 443줄)

```javascript
// 현재 코드 (문제점)
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
    {[
        { label: tr(K.totalJourneys), value: stats.total, icon: '🗺️', color: '#4f8ef7' },
        { label: tr(K.activeJourneys), value: stats.active, icon: '🟢', color: '#22c55e' },
        { label: tr(K.totalExecutions), value: stats.totalExec, icon: '🚀', color: '#a855f7' },
        { label: tr(K.avgCompletion), value: stats.avgRate + '%', icon: '📈', color: '#f97316' }
    ].map(({ label, value, icon, color }) => (
        <div key={label} style={{ ...CARD, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
            <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.03em' }}>{value}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color, marginTop: 2 }}>{label}</div>
            </div>
        </div>
    ))}
</div>
```

#### 2. 발견된 문제점

| 문제 | 설명 | 영향 |
|------|------|------|
| **CSS 클래스 미사용** | 인라인 스타일만 사용 | 테마 전환 시 스타일 깨짐 |
| **반응형 미흡** | `repeat(4, 1fr)` 고정 | 모바일에서 4열 강제 표시 |
| **라벨/값 순서 오류** | value 위, label 아래 | 다른 페이지와 불일치 |
| **하드코딩된 색상** | `#4f8ef7`, `#22c55e` 등 | 다크 모드 미지원 |
| **일관성 부족** | 다른 KPI 카드와 구조 다름 | 사용자 혼란 |

#### 3. 다른 페이지 비교

**BudgetTracker.jsx (올바른 예시)**:
```javascript
<div className="kpi-card">
    <div className="kpi-label">{tr(K.totalBudget)}</div>
    <div className="kpi-value">{formatCurrency(stats.total)}</div>
    <div className="kpi-icon">💰</div>
</div>
```

**PerformanceHub.jsx (올바른 예시)**:
```javascript
<div className="kpi-card">
    <div className="kpi-label">{tr(K.totalRevenue)}</div>
    <div className="kpi-value">{formatNumber(stats.revenue)}</div>
    <div className="kpi-trend">+12.5%</div>
</div>
```

---

### 해결 방안

#### 1. CSS 클래스 적용

**styles.css에 이미 정의된 클래스 활용**:
```css
.kpi-card {
    background: var(--card-bg);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    transition: all 0.3s ease;
}

.kpi-card:hover {
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    transform: translateY(-2px);
}

.kpi-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-secondary);
    letter-spacing: 0.03em;
    text-transform: uppercase;
}

.kpi-value {
    font-size: 26px;
    font-weight: 900;
    color: var(--text-primary);
    margin-top: 4px;
}

.kpi-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    background: var(--icon-bg);
}
```

#### 2. 개선된 코드

```javascript
// 개선된 코드
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
    {[
        { label: tr(K.totalJourneys), value: stats.total, icon: '🗺️', colorClass: 'blue' },
        { label: tr(K.activeJourneys), value: stats.active, icon: '🟢', colorClass: 'green' },
        { label: tr(K.totalExecutions), value: stats.totalExec, icon: '🚀', colorClass: 'purple' },
        { label: tr(K.avgCompletion), value: stats.avgRate + '%', icon: '📈', colorClass: 'orange' }
    ].map(({ label, value, icon, colorClass }) => (
        <div key={label} className="kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className={`kpi-icon kpi-icon-${colorClass}`}>{icon}</div>
                <div style={{ flex: 1 }}>
                    <div className="kpi-label">{label}</div>
                    <div className={`kpi-value kpi-value-${colorClass}`}>{value}</div>
                </div>
            </div>
        </div>
    ))}
</div>
```

#### 3. 추가 CSS (styles.css에 추가)

```css
/* KPI 아이콘 색상 클래스 */
.kpi-icon-blue { background: rgba(79, 142, 247, 0.12); }
.kpi-icon-green { background: rgba(34, 197, 94, 0.12); }
.kpi-icon-purple { background: rgba(168, 85, 247, 0.12); }
.kpi-icon-orange { background: rgba(249, 115, 22, 0.12); }

/* KPI 값 색상 클래스 */
.kpi-value-blue { color: #4f8ef7; }
.kpi-value-green { color: #22c55e; }
.kpi-value-purple { color: #a855f7; }
.kpi-value-orange { color: #f97316; }

/* 다크 모드 지원 */
[data-theme="dark"] .kpi-icon-blue { background: rgba(79, 142, 247, 0.2); }
[data-theme="dark"] .kpi-icon-green { background: rgba(34, 197, 94, 0.2); }
[data-theme="dark"] .kpi-icon-purple { background: rgba(168, 85, 247, 0.2); }
[data-theme="dark"] .kpi-icon-orange { background: rgba(249, 115, 22, 0.2); }

[data-theme="dark"] .kpi-value-blue { color: #6ba3ff; }
[data-theme="dark"] .kpi-value-green { color: #4ade80; }
[data-theme="dark"] .kpi-value-purple { color: #c084fc; }
[data-theme="dark"] .kpi-value-orange { color: #fb923c; }

/* 반응형 */
@media (max-width: 768px) {
    .kpi-card {
        padding: 12px;
    }
    
    .kpi-value {
        font-size: 22px;
    }
    
    .kpi-icon {
        width: 36px;
        height: 36px;
        font-size: 18px;
    }
}
```

---

### 작업 단계

#### Phase 1: 코드 수정 (30분)
- [ ] `frontend/src/pages/JourneyBuilder.jsx` 443줄 수정
- [ ] 인라인 스타일 → CSS 클래스 교체
- [ ] 반응형 그리드 적용 (`repeat(auto-fit, minmax(180px, 1fr))`)
- [ ] 라벨/값 순서 수정 (label 위, value 아래)

#### Phase 2: CSS 추가 (15분)
- [ ] `frontend/src/styles.css`에 색상 클래스 추가
- [ ] 다크 모드 지원 CSS 추가
- [ ] 반응형 미디어 쿼리 추가

#### Phase 3: 테스트 (1시간)
- [ ] **데스크톱 테스트** (1920x1080, 1366x768)
- [ ] **태블릿 테스트** (iPad, 768x1024)
- [ ] **모바일 테스트** (iPhone, 375x667)
- [ ] **테마 전환 테스트** (라이트 → 다크 → 라이트)
- [ ] **다른 페이지와 일관성 검증** (BudgetTracker, PerformanceHub)

#### Phase 4: 문서화 및 커밋 (15분)
- [ ] 변경 사항 문서화
- [ ] Git commit & push
- [ ] 사용자에게 완료 보고

---

## 🎨 우선순위 2: 온보딩 개선 (단기)

### 현재 상태

Journey Builder에는 "가이드" 탭이 있지만:
- ❌ 첫 방문 시 자동으로 표시되지 않음
- ❌ 인터랙티브 요소 부족
- ❌ 단계별 진행 상황 추적 없음

### 개선 계획

#### 1. 첫 방문 감지 (localStorage)

```javascript
// JourneyBuilder.jsx에 추가
useEffect(() => {
    const hasVisited = localStorage.getItem('journeyBuilder_visited');
    if (!hasVisited) {
        setTab('guide'); // 가이드 탭 자동 표시
        setShowWelcome(true); // 환영 모달 표시
        localStorage.setItem('journeyBuilder_visited', 'true');
    }
}, []);
```

#### 2. 환영 모달

```javascript
{showWelcome && (
    <div className="welcome-modal">
        <div className="welcome-content">
            <h2>🗺️ Journey Builder에 오신 것을 환영합니다!</h2>
            <p>고객 여정을 시각적으로 설계하고 자동화하세요.</p>
            <div className="welcome-steps">
                <div className="step">
                    <div className="step-icon">1️⃣</div>
                    <div className="step-text">트리거 선택 (가입, 구매 등)</div>
                </div>
                <div className="step">
                    <div className="step-icon">2️⃣</div>
                    <div className="step-text">채널 추가 (이메일, SMS, 푸시)</div>
                </div>
                <div className="step">
                    <div className="step-icon">3️⃣</div>
                    <div className="step-text">조건 설정 및 활성화</div>
                </div>
            </div>
            <button onClick={() => setShowWelcome(false)}>시작하기</button>
            <button onClick={() => { setShowWelcome(false); setTab('guide'); }}>가이드 보기</button>
        </div>
    </div>
)}
```

#### 3. 인터랙티브 체크리스트

```javascript
const [checklist, setChecklist] = useState({
    createJourney: false,
    addChannel: false,
    setCondition: false,
    activate: false
});

// 가이드 탭에 체크리스트 표시
<div className="onboarding-checklist">
    <h3>🎯 빠른 시작 체크리스트</h3>
    <div className={`checklist-item ${checklist.createJourney ? 'completed' : ''}`}>
        <input type="checkbox" checked={checklist.createJourney} readOnly />
        <span>첫 여정 만들기</span>
    </div>
    <div className={`checklist-item ${checklist.addChannel ? 'completed' : ''}`}>
        <input type="checkbox" checked={checklist.addChannel} readOnly />
        <span>채널 추가하기 (이메일, SMS 등)</span>
    </div>
    <div className={`checklist-item ${checklist.setCondition ? 'completed' : ''}`}>
        <input type="checkbox" checked={checklist.setCondition} readOnly />
        <span>조건 설정하기</span>
    </div>
    <div className={`checklist-item ${checklist.activate ? 'completed' : ''}`}>
        <input type="checkbox" checked={checklist.activate} readOnly />
        <span>여정 활성화하기</span>
    </div>
</div>
```

#### 4. 툴팁 시스템

```javascript
// 주요 버튼에 툴팁 추가
<button 
    onClick={handleCreate}
    data-tooltip="새로운 고객 여정을 만듭니다. 트리거, 채널, 조건을 설정할 수 있습니다."
>
    + {tr(K.createJourney)}
</button>

// CSS
[data-tooltip] {
    position: relative;
}

[data-tooltip]:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    white-space: nowrap;
    z-index: 1000;
}
```

---

## 📱 우선순위 3: 모바일 최적화 (단기)

### 현재 문제점

- ❌ 테이블이 모바일에서 가로 스크롤
- ❌ 버튼이 너무 작아 터치하기 어려움
- ❌ 모달이 화면을 벗어남

### 개선 계획

#### 1. 반응형 테이블 → 카드 레이아웃

```javascript
// 모바일에서는 카드 레이아웃으로 전환
const isMobile = window.innerWidth < 768;

{isMobile ? (
    // 카드 레이아웃
    <div className="journey-cards">
        {journeys.map(j => (
            <div key={j.id} className="journey-card-mobile">
                <div className="journey-header">
                    <span className="journey-name">{j.name}</span>
                    <span className={`journey-status ${j.active ? 'active' : 'inactive'}`}>
                        {j.active ? '🟢 활성' : '⚪ 비활성'}
                    </span>
                </div>
                <div className="journey-details">
                    <div className="detail-item">
                        <span className="detail-label">트리거</span>
                        <span className="detail-value">{j.trigger_type}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">채널</span>
                        <span className="detail-value">{j.channels.join(', ')}</span>
                    </div>
                    <div className="detail-item">
                        <span className="detail-label">실행 횟수</span>
                        <span className="detail-value">{j.executions}</span>
                    </div>
                </div>
                <div className="journey-actions">
                    <button onClick={() => handleEdit(j)}>수정</button>
                    <button onClick={() => handleToggle(j)}>
                        {j.active ? '비활성화' : '활성화'}
                    </button>
                </div>
            </div>
        ))}
    </div>
) : (
    // 데스크톱 테이블 레이아웃
    <table className="journey-table">
        {/* 기존 테이블 코드 */}
    </table>
)}
```

#### 2. 터치 최적화

```css
/* 버튼 최소 크기 44x44px (Apple HIG 권장) */
.journey-card-mobile button {
    min-width: 44px;
    min-height: 44px;
    padding: 12px 20px;
    font-size: 14px;
    border-radius: 8px;
    margin: 4px;
}

/* 터치 영역 확대 */
.journey-card-mobile {
    padding: 16px;
    margin-bottom: 12px;
    border-radius: 12px;
    background: var(--card-bg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.journey-card-mobile:active {
    transform: scale(0.98);
    box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}
```

#### 3. 스와이프 제스처

```javascript
// 스와이프로 탭 전환
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
    onSwipedLeft: () => {
        const tabs = ['builder', 'analytics', 'guide'];
        const currentIndex = tabs.indexOf(tab);
        if (currentIndex < tabs.length - 1) {
            setTab(tabs[currentIndex + 1]);
        }
    },
    onSwipedRight: () => {
        const tabs = ['builder', 'analytics', 'guide'];
        const currentIndex = tabs.indexOf(tab);
        if (currentIndex > 0) {
            setTab(tabs[currentIndex - 1]);
        }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
});

<div {...handlers} className="journey-content">
    {/* 콘텐츠 */}
</div>
```

---

## 🚀 우선순위 4: 고급 기능 추가 (중기)

### 1. 드래그 앤 드롭 여정 빌더

**목표**: 시각적으로 여정을 설계할 수 있는 캔버스 제공

**기술 스택**:
- React Flow 또는 React DnD
- 노드 기반 인터페이스

**기능**:
- 트리거 노드 (가입, 구매, 이벤트)
- 액션 노드 (이메일 발송, SMS 발송, 대기)
- 조건 노드 (if/else, 세그먼트 필터)
- 연결선으로 플로우 구성

### 2. 여정 템플릿

**목표**: 일반적인 시나리오를 빠르게 시작할 수 있는 템플릿 제공

**템플릿 예시**:
- 🎉 **신규 가입 환영 시리즈**: 가입 → 환영 이메일 → 2일 후 가이드 이메일 → 7일 후 피드백 요청
- 🛒 **장바구니 이탈 복구**: 장바구니 추가 → 1시간 대기 → 구매 안 함 → 리마인더 이메일
- 🎂 **생일 축하 캠페인**: 생일 7일 전 → 생일 축하 이메일 + 쿠폰
- 📦 **구매 후 후속 조치**: 구매 완료 → 감사 이메일 → 3일 후 리뷰 요청 → 30일 후 재구매 제안

### 3. A/B 테스트

**목표**: 여정의 효과를 측정하고 최적화

**기능**:
- 여정 A vs 여정 B 비교
- 트래픽 분할 (50/50, 70/30 등)
- 성과 지표 비교 (전환율, 매출, 참여도)
- 자동 승자 선택

---

## 📊 성과 측정

### KPI 지표

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| 첫 여정 생성 시간 | 15분 | 5분 | 가이드 완료 시간 추적 |
| 모바일 사용률 | 20% | 40% | 디바이스별 접속 통계 |
| 여정 활성화율 | 60% | 80% | 생성된 여정 중 활성화 비율 |
| 사용자 만족도 | 3.5/5 | 4.5/5 | 피드백 설문 |

### 사용자 피드백 수집

- **인앱 피드백 버튼**: "이 기능이 도움이 되었나요?"
- **NPS 설문**: "Journey Builder를 동료에게 추천하시겠습니까?"
- **사용 패턴 분석**: Google Analytics, Mixpanel

---

## 🗓️ 타임라인

### Week 1 (2026-05-01 ~ 2026-05-03)
- [x] PM 분석 및 계획 수립
- [ ] **KPI 카드 버그 수정** (3시간) 🔥
- [ ] 반응형 및 테마 테스트
- [ ] Git commit & push

### Week 2 (2026-05-06 ~ 2026-05-10)
- [ ] 온보딩 개선 (4시간)
  - [ ] 첫 방문 감지 및 환영 모달
  - [ ] 인터랙티브 체크리스트
  - [ ] 툴팁 시스템
- [ ] 모바일 최적화 (3시간)
  - [ ] 카드 레이아웃 구현
  - [ ] 터치 최적화
  - [ ] 스와이프 제스처

### Week 3-4 (2026-05-13 ~ 2026-05-24)
- [ ] 고급 기능 설계
  - [ ] 드래그 앤 드롭 프로토타입
  - [ ] 템플릿 시스템 설계
  - [ ] A/B 테스트 기능 설계

### Month 2 (2026-06-01 ~ 2026-06-30)
- [ ] 고급 기능 구현
- [ ] 베타 테스트
- [ ] 피드백 수집 및 개선

---

## ✅ 체크리스트

### 즉시 시작 (오늘)
- [ ] KPI 카드 코드 수정
- [ ] CSS 클래스 추가
- [ ] 반응형 테스트
- [ ] 테마 전환 테스트
- [ ] Git commit & push

### 단기 (1-2주)
- [ ] 온보딩 모달 구현
- [ ] 체크리스트 시스템
- [ ] 모바일 카드 레이아웃
- [ ] 터치 최적화

### 중기 (1개월)
- [ ] 드래그 앤 드롭 빌더
- [ ] 템플릿 시스템
- [ ] A/B 테스트 기능

---

## 📚 참고 자료

### 디자인 참고
- **Mailchimp Customer Journey Builder**: 드래그 앤 드롭 인터페이스
- **HubSpot Workflows**: 시각적 플로우 빌더
- **Intercom Product Tours**: 온보딩 가이드

### 기술 참고
- **React Flow**: 노드 기반 UI 라이브러리
- **React DnD**: 드래그 앤 드롭 라이브러리
- **Intro.js**: 인터랙티브 가이드 라이브러리

### 내부 문서
- [PM 현재 상태 보고서](./PM_CURRENT_STATUS.md)
- [PM 우선순위 계획](./PM_PRIORITY_PLAN.md)
- [버그 추적 문서](./BUGS_TRACKING.md)

---

**작성자**: PM 에이전트  
**최종 업데이트**: 2026-05-01 12:02 PM (KST)  
**문서 버전**: 1.0  
**다음 업데이트 예정**: KPI 카드 수정 완료 후
