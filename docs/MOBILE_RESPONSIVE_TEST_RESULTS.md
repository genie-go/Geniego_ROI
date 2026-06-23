# MOBILE_RESPONSIVE_TEST_RESULTS (238차)

도구: Playwright(실제 브라우저), 뷰포트 **390×844**(iPhone 12/13/14급), 라이브 데모(roidemo.genie-go.com, 신규 가입 초급자 계정 + 시드 데이터).

## 1. 가로 오버플로우 (docScrollW vs clientWidth)
| 페이지 | 문서 가로 스크롤 | viewport 초과 요소 | 판정 |
|---|---|---|---|
| /dashboard | 없음(390=390) | 0 | ✅ |
| /integration-hub | 없음 | 0 | ✅ |
| /team-members (폼/탭) | 없음 | 0(폼 세로 정렬) | ✅ |
| /team-members (권한 매트릭스) | 없음 | 표는 내부 스크롤(562>300) + 어포던스 / 비표 잔여 1건(+10px, 무시) | ✅ |

## 2. 사이드바 Drawer 아코디언
| 항목 | 결과 |
|---|---|
| 드로어 오픈 직후 펼쳐진 대메뉴 수 | **1 / 11** (현재 페이지 "Home" 자동 펼침) |
| 타 대메뉴(AI Marketing) 클릭 후 | AI Marketing만 펼침, Home 자동 접힘 (expandedCount=1) |
| 접힘 패널 computed | `max-height:0 · overflow:hidden · height 0` ✅ |
| ▶/▼ 화살표 상태 | 정확 ✅ |
| 시각 확인(스크린샷) | 네이티브 아코디언 외관 ✅ |

## 3. 표/매트릭스 가로 스크롤 어포던스
| 항목 | 결과 |
|---|---|
| 표 overflow-x | auto (scrollable: 562 > 300) ✅ |
| 표 scrollbar-width | thin ✅ |
| 래퍼 position / ::after | relative / gradient 페이드 ✅ |

## 4. 폼/카드/탭 세로 정렬
- 회원 등록 폼: input/select 100% 폭, 한 줄에 하나 ✅
- 탭(Team Members/Management/Permission Matrix/Audit): wrap 정상, 가로 밀림 없음 ✅

## 5. 빌드/배포
- `npm run build` 성공(운영) · `VITE_DEMO_MODE=true npm run build` 성공(데모).
- 운영 `index-B2K8xoZM.js` / 데모 `index-BZaiIp3O.js` 라이브 swap·curl 검증.

## 미수행(2차 권장)
- 섹션6 전체 17개 페이지 1:1 스크린샷 점검(본 차수는 대표 페이지 + 시스템 근본 검증).
- Capacitor 실기기(Android/iOS) safe-area 실측 — 코드 점검은 [CAPACITOR_ANDROID_IOS_CHECKLIST.md](./CAPACITOR_ANDROID_IOS_CHECKLIST.md).
- 키보드가 input을 가리는 케이스의 실기기 검증.
