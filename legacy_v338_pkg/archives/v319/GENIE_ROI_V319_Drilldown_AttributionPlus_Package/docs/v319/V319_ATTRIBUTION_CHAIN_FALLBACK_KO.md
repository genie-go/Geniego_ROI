# V319 귀속 체인: 우선순위 + fallback(부분 매칭)

## 핵심
- 기본은 `exact` 매칭
- 실패하면 설정에 따라 `contains` 또는 `startswith` 같은 fallback을 적용
- 전환 레코드는 체인의 첫 매칭 룰 1개에만 귀속(중복 없음)

## 예시
체인: `ad_id > campaign_id > utm_campaign`

fallback:
- ad_id: exact → startswith
- campaign_id: exact → contains
- utm_campaign: exact → contains

## 언제 유용한가
- utm_campaign 값이 'sale_C001_kr' 처럼 캠페인ID를 포함
- ad_id가 'AD01_v2' 처럼 접미사가 붙는 경우

주의:
- 부분 매칭은 오탐 위험이 있으므로, 가능한 한 정확한 키(ad_id)를 우선 적용하세요.
