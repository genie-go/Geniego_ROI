# CWIS Part004-04 ST07 (Frontend) — 종결 기록

| 항목 | 값 |
|---|---|
| 대상 | `CWIS-P004-U04-WS01-SP02-TK002-ST07` (Frontend UI·State·API 연동) |
| **종결 판정** | **CLOSED** — net-new 완료·배포, 서버형 잔여는 BLOCKED(Option B 종속) |
| 종결 결정 | 사용자 확정 (2026-07-24) — "권장순"(push → ST07 종료) |
| 종결 리비전 | `affc6fbd63f` (+ reorder `3c3205e9ae1`·배포됨) |

---

## 1. 8분할 하위 스텝 결과

사용자가 ST07 을 60~100줄 단위 8분할로 재구성("한 번에 한 기능")했다. 각 결과:

| 스텝 | 대상 | 결과 | 근거 |
|---|---|---|---|
| ST07-01 | 기존 구조 분석 | **READY** | 27축 실측·15기능축 재사용판정 |
| ST07-02 | API Client/Types | **BLOCKED** | favorites 서버 엔드포인트 0 → HTTP 클라이언트=404 죽은코드 |
| ST07-03 | Query/State | **BLOCKED** | 쿼리 라이브러리 0(설치금지)+서버 API 0. device-local 상태는 이미 존재 |
| **ST07-06** | **Reorder** | **★DONE·배포** | device-local ▲▼ 재정렬·i18n 15국·fav:test 26항·운영/데모 라이브 |
| ST07-04 | Toggle UI | **REUSE** | FavStar 이미 존재·배포(aria-pressed·44×44) |
| ST07-05 | Sidebar/List | **REUSE** | QuickAccessPanel 이미 존재(스크롤·빈상태) |
| ST07-07 | 권한/오류/접근성 | **부분 REUSE / N/A** | a11y 이미 적용. 서버 권한·오류는 API 부재로 N/A |
| ST07-08 | 테스트/통합 | **부분 충족** | fav:test 26항 + nav:test 36항. 컴포넌트 테스트 프레임워크 부재 |

---

## 2. 핵심 결론

ST07 을 실측 매핑하니 **세 갈래로 수렴**했다:

- **UI 축(토글·사이드바·리스트·빈상태·네비게이션·i18n·a11y)** = 이미 구현·배포됨(REUSE)
- **서버 연동 축(API·Query·Mutation·Optimistic·권한·Workspace)** = favorites 서버 부재(ST05 BLOCKED)로 전부 **BLOCKED**
- **순수 net-new = Reorder(ST07-06) 하나** → **구현·검증·운영/데모 배포 완료**

즉 Option A(UI 프리퍼런스) 범위에서 **프론트 즐겨찾기는 실질 완성**이다. 남은 것은 서버형 요구뿐이며, 그것은 Option B(MEMBER_DATA) 재결정 + 백엔드 선행 없이는 만들 수 없다(만들면 도달 가능한 죽은 코드).

---

## 3. 최종 즐겨찾기 기능 (device-local · 라이브)

| 기능 | 상태 |
|---|---|
| 추가/해제 토글(별표) | ✅ aria-pressed·44×44 |
| 사이드바 패널(즐겨찾기/최근방문 탭) | ✅ 스크롤·빈상태 숨김 |
| 6개 이상 열람 | ✅ (BACKLOG-1) |
| 모바일 터치 44×44 | ✅ (BACKLOG-2) |
| 패널 소멸 결함 | ✅ 수정(flexShrink:0) |
| **순서 변경(▲▼)** | ✅ **(BACKLOG-3·ST07-06)** |
| 네비게이션 이동 | ✅ |
| i18n 15개국 | ✅ (addFav/removeFav/moveFavUp/moveFavDown) |
| 회귀 가드 | ✅ fav:test 26항 |

**미구현(범위 밖)**: 기기 간 동기화·서버 권한·Workspace 스코프 — 전부 Option B 종속.

---

## 4. Option B 재개 자산 (보존)

즐겨찾기를 서버 회원데이터로 재결정 시 즉시 조립 가능:

| 계층 | 자산 |
|---|---|
| 스키마 | `favorites-persistence-schema-requirements.json` (★MySQL 부분유니크 미지원 우회) |
| API | `favorites-api-contract.json` (9엔드포인트) |
| Query | `favorites-query-key-map.json` (4 Query + 5 Mutation) |
| 구조 | Domain/App 조사 요약 |

구현 형태 = `ensureFavoriteTable` + `Handlers\Favorites` + `routes.php`(/api) + `PM\Shared::gate`(Controller/Migration 아님).

---

## 5. 종결

**ST07 CLOSED.** net-new(Reorder) 완료·운영/데모 배포·라이브 검증. 서버형 하위 스텝은 Option A 결정 하에서 BLOCKED 유지(후속 투입 시 동일 판정 반복).

→ 신규 Part 로 이동. (즐겨찾기 CWIS = SP02-TK002 계열 종결 + ST07 종결로 사실상 완료.)
