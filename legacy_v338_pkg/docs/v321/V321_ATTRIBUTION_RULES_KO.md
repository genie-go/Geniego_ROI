# V321 귀속 룰(오탐 감소) 설정

V321 귀속 설정은 JSON 하나로 관리합니다.

## 구조(요약)
- chain: 우선순위
- min_score: 이 점수 미만은 귀속하지 않음
- rules: 룰별로
  - weights: exact/startswith/contains/regex 점수
  - whitelist: 허용 키 목록(있으면 후보를 여기로 제한)
  - normalize: ads 값 정규화(선택)
  - regex: 허용 패턴(선택)

## 기본 예시
- ad_id는 정확도가 높으니 weight를 높게
- utm_campaign contains는 오탐이 쉬우니 weight를 낮게 + threshold로 방어

설정 파일:
- templates/v320/default_attribution.json

UI에서:
- attribution JSON 업로드로 즉시 교체 가능
