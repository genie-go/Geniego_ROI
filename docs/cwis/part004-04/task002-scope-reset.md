# CWIS Part004-04 Task002 — 범위 재설정 (Domain Layer 미구현 결정)

| 항목 | 값 |
|---|---|
| 대상 명세 | `CWIS-P004-U04-WS01-SP02-TK002-ST01` (Favorites Core Domain Implementation) |
| **판정** | **미구현 (NOT_IMPLEMENTED)** |
| 결정 | 사용자 확정 (2026-07-24) — "미구현·범위 재설정" |
| 근거 | 아래 5건 전부 실측 |

---

## 1. 미구현 사유 5건

### ① PHASE_1 결정과 정면 충돌

ST10 로드맵이 조건을 명시적으로 기록해 두었다:

```
PHASE_2  conditional_on = "PHASE_1 정의 = MEMBER_DATA"
PHASE_4  conditional_on = "PHASE_1 정의 = MEMBER_DATA"
```

사용자 확정 답은 **UI 프리퍼런스**다. 본 명세의 Domain Layer는 서버 지속화 계층의 첫 단계이며, 그 결정으로 소멸시킨 9개 Gap(CRITICAL 3 포함)의 출발점이다.

### ② 명세가 지정한 변경 허용 경로가 4개 전부 부재

| 경로 | 실재 |
|---|---|
| `Domain/**` · `app/Domain/**` · `src/Domain/**` · `Shared/Domain/**` | **전부 부재** |
| `app/` · `src/` (저장소 루트) | **부재** — 백엔드는 `backend/src/` |

### ③ 저장소에 DDD 계층이 0건

```
backend/src 전수 실측
  interface 0 · trait 0 · enum 0
  ValueObject 0 · DomainEvent 0 · Specification 0 · RepositoryInterface 0
  Handlers 103개 = 전부 절차적 (Slim 4 + raw PDO)
```

DDD 스트라텀 신설 = 저장소에 없던 **두 번째 아키텍처 도입**. 헌법 Golden Rule(Replace 아닌 Extend)·중복 구현 금지 위반.

### ④ 요구된 Resource/Principal 타입 대부분 부재

| 타입 | 실재 |
|---|---|
| Workspace · Document · Meeting · Channel · Team · Role | **전부 부재** (ST07 `NavigationContext::ABSENT_AXES` 확정) |
| Project · Task | `pm_projects` · `pm_tasks` 로 존재 |
| Menu · Navigation | 존재 (현행 즐겨찾기 대상) |

### ⑤ ★구조적으로 죽은 코드가 된다

본 명세는 Controller·API·Repository 구현을 **금지**한다. 따라서 생성될 도메인 클래스 약 15개는 **호출부가 존재할 수 없다**.

이는 본 Unit이 방금 발견·수정한 결함 클래스와 동일하다 — 즐겨찾기가 초기 커밋부터 죽어 있던 이유가 *"구현은 완벽한데 진입점이 없어서"* 였다. 같은 것을 **설계상 보장된 형태로** 재생산하게 된다.

→ 재발 방지는 메모리 `reference_reachability_check_dead_feature` 에 기록됨.

---

## 2. UI 프리퍼런스 전제에서 실제로 남은 것

지어내지 않고 **코드 실측으로 확인된 항목만** 싣는다.

### BACKLOG-1 · 즐겨찾기 6개 이상은 볼 방법이 없다 (우선)

```
Sidebar.jsx:431   items.slice(0, 5)
"더 보기"·showAll·viewAll 경로   0건
```

즐겨찾기는 무제한 저장되지만 패널은 **5개만** 표시하고 나머지를 여는 경로가 없다.

★**이 조건은 현 차수 변경이 만들었다.** 이전에는 추가 진입점이 없어 아무도 즐겨찾기를 가질 수 없었으므로 제한이 드러날 수 없었다. 추가가 가능해진 지금부터 6번째 이후는 저장은 되는데 보이지 않는다.

- 현재는 최신순 정렬(`.reverse()`)로 **방금 추가한 항목은 항상 보이도록** 완화해 둔 상태
- 근본 해소는 (a) 더 보기 토글 (b) 표시 개수 상향 (c) 전체 목록 화면 중 택1
- 판단 근거가 되는 실사용 데이터가 없으므로 **임의 선택하지 않고 보류**

### BACKLOG-2 · 별표 버튼의 모바일 터치 타깃 미달

```
FavStar   fontSize 12~13px · padding 2px 5px  →  약 23×17px
.sidebar .nav-item   min-height: 44px !important   (행 자체는 준수)
```

행 높이는 44px를 지키지만 **클릭 가능 영역은 별표 버튼 박스뿐**이라 모바일 권장치(44×44)에 미달한다.

★**이것도 현 차수가 만든 항목이다.** 접근성 Gap(CAP-04 `aria-pressed`)을 메우면서 터치 타깃 항목을 새로 만들었다 — 정직하게 기록한다.

- 해소는 간단(패딩 확대 또는 히트박스 확장)하나 **행 높이 44px 유지**가 조건이다. 사이드바 아코디언 `maxHeight` 계산이 `items.length * _itemH` 라 행이 커지면 클리핑이 생긴다(무후퇴 조건).

### BACKLOG-3 · 드래그 순서 변경 (CAP-05)

ST10에서 LOW·P3. 실사용 요구 미확인이라 **의도적 미구현** 상태 유지. 표시 5개 제한 하에서 사용자 정렬의 실익이 불분명하므로 BACKLOG-1이 먼저 정리되어야 판단 가능하다.

---

## 3. 결론 — Task002는 사실상 비어 있다

UI 프리퍼런스 결정 이후 남은 것은 **UX 다듬기 3건**이며, 그중 2건은 실사용 데이터 없이는 방향을 정할 수 없다. 서버 도메인·API·테이블·마이그레이션은 **요구사항 자체가 없다**.

즐겨찾기 기능은 **현재 운영에서 정상 동작 중**이며(사용자 확인 완료), 회귀 가드 `npm run fav:test` 가 진입점 부재 회귀를 차단한다.

---

## 4. 후속 명세 작성 시 참고

Task002 이후 명세를 만드실 때 아래 전제를 반영하시면 왕복이 줄어든다.

| 전제 | 실제 |
|---|---|
| 아키텍처 | DDD 아님 — Slim 4 + 절차적 Handler + raw PDO. `Genie\` 네임스페이스, `routes.php` 문자열 매핑 |
| 스키마 경로 | 마이그레이션 아님 — `backend/src/**` 의 `ensureTables()` 자가치유 (migrations 는 세션 172 정지) |
| 경로 | `backend/src/Handlers/` · `frontend/src/` (루트 `app/`·`src/` 없음) |
| 존재하는 협업 축 | Tenant · Project(`pm_projects`) · Task(`pm_tasks`) — Workspace·Team·Role·Document·Meeting 은 부재 |
| 즐겨찾기 정의 | UI 프리퍼런스 (device-local). 서버 계층 요구 없음 |
