# ComponentRegistry — 프론트 재사용 자산 레지스트리

> 신규 컴포넌트/훅/Context/util 신설 전 여기+grep 확인(중복 금지·기존 재사용). 페이지 122·핸들러 88 규모라 **재사용 공용자산** 중심 기록.

## 공용 인프라(재사용 필수·중복 신설 금지)
| 유형 | 자산 | 위치 |
|------|------|------|
| API 클라이언트 | getJson/getJsonAuth/postJson/postJsonAuth/patchJson/delJson/requestJsonAuth | `services/apiClient.js` |
| 도메인 API | wmsApi·crmApi·emailApi 등 | `services/*.js` |
| Context | AuthContext·GlobalDataContext·CurrencyContext·MobileSidebar·ConnectorSync·Toast | `context/` **및** `contexts/`(둘 다) |
| Store/영속 | tenantStorage(tGetJSON/tSetJSON)·localStorage(genie_*/demo_genie_*) | `utils/tenantStorage.js` |
| 데모격리 | IS_DEMO·isDemoMode | `utils/demoEnv.js` |
| 차트 | ChartUtils·CartesianChart·(sparkline=KpiCard 내부·seedSpark) | `components/dashboards/` |
| i18n | useT·useI18n·t(key,fallback) | `i18n/` |
| 훅 | useDemo·useSecurityMonitor·useConnectorSync·useVisibleTabs·useCurrencyFmt(페이지로컬) | `hooks/`·페이지내 |

## 라우팅/페이지
- 122 페이지 = `frontend/src/pages/` (App.jsx lazy import + Route). 신규 페이지=import+Route+chunk 전략.
- 컴포넌트 = `frontend/src/components/`.

## 원칙
- 통화포맷·CSV·날짜 등 유틸은 기존 재사용(중복 helper 금지). 페이지로컬 헬퍼(useCurrencyFmt 등)는 페이지별 존재—신규 페이지는 패턴 재사용.
- Context는 `context/`·`contexts/` **둘 다 확인** 후 신설(트랩).

## 갱신 규칙
신규 공용 컴포넌트/훅/Context/util 추가 시 append. 페이지 추가는 App.jsx 라우트 등록으로 갈음(개별 기록 불요).
