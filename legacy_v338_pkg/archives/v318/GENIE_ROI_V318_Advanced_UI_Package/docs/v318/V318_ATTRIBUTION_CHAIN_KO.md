# V318 전환 귀속 “우선순위 체인”

V318은 전환 데이터가 다양한 키로 들어오는 현실을 반영해,
단일 룰이 아니라 **우선순위 체인**을 사용합니다.

예)
- ad_id > campaign_id > utm_campaign

의미:
- 전환 레코드에 ad_id가 있으면 ad_id로 귀속(가장 정밀)
- 없으면 campaign_id로 귀속
- 그것도 없으면 utm_campaign로 귀속

중요:
- 전환 레코드는 체인에서 **첫 번째로 매칭되는 키 1개에만** 귀속됩니다.
- 따라서 ad_id로 귀속된 전환이 campaign_id에도 중복으로 더해지는 일이 없습니다.

설정:
- UI에서 체크박스로 우선순위를 선택/정렬
- DB의 attribution_config.rule_chain(JSON 배열)에 저장
