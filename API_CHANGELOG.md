# API_CHANGELOG.md

## 231차 (HEAD ec389a9, 운영/데모 라이브)
- **이관**: `GET /api/v1/ad-performance/summary` → `AdPerformance::summary`(PerformanceController 제거, 동작·응답형식 보존).
- **제거(dead)**: `GET/POST /api/performance`, `GET /api/performance/recommendations`(Helpers\Auth 부재로 항상 500·소비처0).
- **확장(응답 필드 추가, 하위호환)**: `/api/v424/orderhub/settlements/stats` → `totalShippingFee` 추가.
- **확장(요청/응답 필드)**: 팀멤버·하위관리자·파트너 create/update/list에 `photo` 필드. 하위관리자 menus에 `{경로:'view'|'edit'}` 맵 수용(배열도 호환).
- 신규 라우트 0(전부 기존 확장). 응답 봉투는 기존 형식 유지.

## OS 디렉티브 예정
- 표준 응답 봉투 `{success,data,message,error,meta}`를 `TemplateResponder.ok/fail` 신메서드로 추가(기존 respond 보존, 점진 적용). 신규 OS 기능은 기존 라우트 확장 우선(중복 라우트 금지).
