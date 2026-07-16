# DecisionLog — 주요 결정 이력

> 되돌리기 어렵거나 방향을 정하는 결정 기록. 참조: `COMPETITIVE_REVALIDATION_*.md`·`NEXT_SESSION.md`.

| 결정 | 차수 | 근거 | 결과 |
|------|------|------|------|
| 구독 PG **Paddle 유지**(Stripe 전환 보류) | 263·264 | Stripe 한국 사업자 미지원(지원국 제외) | 운영/데모 Paddle 원복·Stripe코드 로컬보관 |
| 데이터 수집 정규화(fxToKrw KRW) 단일화 | 228차 S5~ | 통화 비대칭 방지 | channel_orders.total_price=KRW(currency 컬럼 불요) |
| PG정산 netProfit 미합산(de-silo KPI) | 235 | 이중계산 방지 | FP-1 확정·재플래그 금지 |
| **A3 CustomerAI 배선 기각** | 265 | 운영경로 빈스텁(201/208차 가짜차단)·CRM 예측 중복 | 배선 안함(빈화면/가짜 방지) |
| **audit_routes 중복 통합** | 265 | check_routes_registered.mjs가 상위 재구현($pfx/api 정확) | 구 php 도구 제거·node 정본 |
| 검출기 근본제거(패치→CI가드) | 265 | 반복재발 클래스 | G9 라우트·G10 훅·G11 php-l |
| 신규 백엔드는 도메인구분 후만 | 265 | 중복금지 | DigitalShelf(키워드SoS≠SKU가격)·Promotion(머천트≠구독쿠폰) |
| **EPIC06-A: Segmentation Baseline=기존 확장(신 엔진 금지)** | 289 | crm_segments+members 실 SoT·isMarketingSendAllowed 중앙게이트 존재 | Option E(Hybrid) 확장·재구현 금지(ADR_SEGMENTATION_ARCHITECTURE_BASELINE) |
| **"segment" 3도메인 명명 분리(통합 아님)** | 289 | Customer/Decisioning-cohort/Growth-ICP 의미 상이 | Canonical 명칭 분리·admin_growth_segment/Decisioning KEEP_SEPARATE |
| **발송 게이트 표준화 P0(코드는 별도 세션)** | 289 | /sms/send·/whatsapp/send·sendOne 무게이트·/sms/broadcast 우회·phone DNC 부재(PM 재증명) | baseline은 리스크기록만·수정은 verify+배포승인 후 |

## 갱신 규칙
방향/보류/기각/원복 등 결정 발생 시 append(근거·결과 포함). 삭제 금지(이력 보존).
