# V390: 추천 → 실행(승인/체크리스트) 자동 전환 가이드

V390은 V389의 기능을 **그대로 유지**하면서, 추천 결과를 운영자가 바로 실행할 수 있도록:

1) **Meta/TikTok**: 예산 이동/소재 교체/타겟 수정안을 **승인 워크플로(ApprovalRequest)** 로 자동 생성
2) **Shopify**: 상품별 ROAS/CPA 목표 달성 여부에 따라 **운영 체크리스트(OpsChecklist)** 를 자동 생성

> 외부 채널 API에 바로 반영하지 않습니다. **반드시 승인 후 실행**하도록 설계되었습니다.

---

## 1) Ads 추천 → ApprovalRequest 자동 생성

### 엔드포인트
- `POST /v390/actions/ads/from-recommendations`

### 입력 예시
```json
{
  "as_of": "2026-03-01",
  "window_days": 14,
  "target_roas": 2.5,
  "target_cpa": 30,
  "max_actions": 30,
  "per_action_budget_cap_pct": 0.2
}
```

### 헤더
- `X-Tenant-ID: TENANT1`
- `X-User-Email: ops@company.com` (선택)

### 생성되는 ApprovalRequest 타입
- `ads_budget_move`
- `ads_creative_swap`
- `ads_targeting_update`

각 ApprovalRequest의 `payload`에는 추천 근거(윈도우, 지표, 목표, 제안 변경)가 포함됩니다.

---

## 2) Shopify 상품 운영 체크리스트 자동 생성

### 엔드포인트
- `POST /v390/shopify/checklists/generate`

### 입력 예시
```json
{
  "as_of": "2026-03-01",
  "window_days": 14,
  "target_roas": 2.5,
  "target_cpa": 30,
  "max_items": 80
}
```

### 생성되는 항목(예)
- Tracking: UTM/creative_id 매칭 누락 감지
- Conversion: ROAS 목표 미달 → 상세페이지/오퍼/랜딩 개선
- Pricing/Promo: 가격/프로모션 테스트 제안
- Creative/Targeting: 고비용 저전환 → 소재 교체/타겟 재설계

### 매칭/할당 방식(실무형)
- Shopify 매출(상품/creative_id 포함)이 있을 때
- 광고 spend/conversions(creative_id 기준)을
- **creative별 매출 비율**로 상품에 분배하여 상품 ROAS/CPA를 계산합니다.

> 이는 인과(실험) 기반이 아니라, 운영 의사결정을 빠르게 만들기 위한 **실무형 할당(heuristic)** 입니다.

---

## 3) 권장 운영 루프(실전)

1) (매일) Shopify 주문 + Meta/TikTok 성과를 V389/V388 ingestion으로 적재
2) (매일) `/v390/actions/ads/from-recommendations`로 승인 요청 생성
3) (매주) `/v390/shopify/checklists/generate`로 상품 최적화 체크리스트 생성
4) 승인/체크리스트를 기반으로 실제 운영자가 변경 수행
5) 성과 개선 여부를 다음 주에 목표 기반/증분 프록시로 재평가
