# V320 부분 매칭 인덱싱(성능)

부분 매칭 fallback(contains/startswith)은 후보 키를 많이 스캔하면 느려집니다.
V320은 (rule, date) 단위로 전환 키를 인덱싱합니다.

## 인덱스
1) exact: dict(key -> value) O(1)
2) prefix index: 첫 N글자(prefix_len 기본 4) -> 후보 키 목록
3) token index: 토큰(알파/숫자 덩어리) -> 후보 키 목록
4) whitelist가 있으면 후보를 크게 줄임

## 결과
- 작은 데이터에서는 체감이 적지만,
- “일 수 * 캠페인 수 * 소재 수”가 커질수록 차이가 커집니다.
