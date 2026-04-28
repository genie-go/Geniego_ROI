# GENIE_ROI V240 — AdOps OS (V237+V238 통합 완전체)

## 목표
- **Execution Layer (V237)**: Vault 토큰 기반 캠페인 리스트 자동 동기화 (외부 → 내부 자동 생성/업데이트)
- **Intelligence Layer (V238)**: 전략 레이어(구조 점수화/네이밍 검사/리스크 경고/이상탐지) + 의사결정 레이어(예산 재배분/정지 제안/리팩토링 제안)
- **Platform (V240)**: 멀티채널 커넥터(google/meta/tiktok/naver/kakao) + SaaS 전환 가능한 멀티테넌트/관측/이벤트 기반 운영

## 레이어
1. **Connectors** (`services/api/app/connectors/*`)
   - 각 채널 API를 내부 공통 스키마(ExternalCampaign)로 변환
   - 본 ZIP에는 *안전한 Stub 커넥터* 포함 (mock_campaigns 입력으로 동작)
   - 실 API 연동 시 Vault(권장) 또는 SecretRef(암호화)로 자격 증명 저장

2. **Sync Engine** (`campaign_sync.py`)
   - 외부 캠페인 리스트를 내부 Campaign 테이블로 idempotent upsert
   - 외부에 없어진 캠페인은 soft-deactivate

3. **Strategic Intelligence** (`strategic.py`)
   - 구조 점수화(0-100) + 이슈 설명
   - 네이밍 룰 검사(정규식)
   - 예산 쏠림/언더퍼폼 비율 기반 리스크
   - ROAS/지출 급등 등 이상 탐지(현 버전은 heuristic, SaaS에서 시계열 모델로 확장)

4. **Decision Engine** (`ai.py`)
   - 예산 재배분 추천 (설명가능/안전한 휴리스틱)
   - 비효율 캠페인 정지 “제안” (자동 실행은 정책/승인 흐름에 연결)

## 핵심 API (신규)
- `GET  /v239/connectors`
- `POST /v239/campaigns/sync`
- `POST /v239/strategy/evaluate`
- `POST /v239/ai/recommendations`

> 기존 V236 API(`v1/*`)는 그대로 유지됩니다.
