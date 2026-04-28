
# V406 현장 운영형 고도화 (V405 유지 + V406 통합 업그레이드)

본 문서는 V406에서 추가된 **현장 운영형 레이어**(정밀 mapper registry, rollup 집계 레이어, 알림 정책 엔진)를 설명합니다.

## 1) 목표
- 다양한 플랫폼 원문 이벤트(raw)를 **정확하게 표준 이벤트(normalized)** 로 변환
- 표준 이벤트를 **SKU/캠페인/크리에이터/플랫폼 단위**로 일/주 집계
- 집계 지표를 기준으로 **임계치/증감률/이상탐지 룰 기반 알림**을 UI에서 관리

## 2) 구성요소
### A. Mapper Registry (정밀 매핑)
- 위치: `backend/app/services/mapper_registry_v406.py`
- 구현: `backend/app/connectors/mappers/*`
- 방식: PlatformType별 매퍼를 등록하고, raw payload의 필드 별 alias를 폭넓게 지원.

### B. Rollup 집계 레이어 (Daily / Weekly)
- 위치: `backend/app/services/rollup_service_v406.py`
- DB 테이블:
  - `activity_rollup_daily`
  - `activity_rollup_weekly`

### C. 알림 정책 엔진 (UI 관리)
- 위치: `backend/app/services/alert_policy_engine_v406.py`
- DB 테이블:
  - `alert_policy`
  - `alert_instance`
- UI:
  - `frontend/src/pages/AlertPolicies.jsx`
  - 경로: `/alert-policies`

## 3) API
- `/v406/events/normalize` : raw → normalized
- `/v406/rollups/compute` : normalized → rollups(in-memory)
- `/v406/rollups/persist` : rollups upsert 저장
- `/v406/alert_policies` : 정책 CRUD
- `/v406/alerts/evaluate` : 최신 rollup을 기준으로 알림 생성
- `/v406/alerts` : 생성된 알림 조회

## 4) 운영 권장 플로우
1. 수집(raw) → normalize
2. normalize 이벤트를 스트림/배치로 적재
3. 매일/매주 rollup 갱신
4. 정책 엔진 evaluate 수행
5. Slack/Email/PagerDuty 등 외부 알림 채널로 전송(추가 확장)
