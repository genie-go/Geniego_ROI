# 85차 종결 검증 (f428dfd 기반)

## 85차 종결 상태
- master HEAD: f428dfd (push 완료, origin 동기화)
- working tree: clean
- 85차 commit 1건: f428dfd refactor(OrderHub): migrate fetch to apiClient.postJson - 85th #1

## 85차 #1 완료 (OrderHub.jsx)
- L111 GET → apiClient.postJson (84차 인계 GET 표기는 오류, 실제 POST)
- L117 POST → apiClient.postJson
- +3 insertions / -8 deletions, fetch 잔존 0건

## 85차 #2 시도 후 롤백 (WmsManager.jsx)
- L891 마이그레이션 시도 → r.ok 분기 회귀 위험 발견 → checkout 롤백
- 회귀 원인: apiClient.postJson 반환값은 이미 파싱된 JSON, r.ok는 undefined
- L892 setTesting(r.ok && d.ok !== false) 조건 손상
- L1941도 동일 패턴 (r.ok 분기 + demo fallback)
- 86차에서 백엔드 /api/carrier-track POST 응답 스키마 확인 후 재설계 필요

## 86차 최우선
- #1 AIPrediction.jsx fetch 1건 + useT dead 검증 (84차 인계 #3, 가장 안전)
- #2 WmsManager.jsx 재설계 (응답 스키마 확인 후 L891 L1941 동시 또는 부분)

## 85차 신규 교훈
- CC Read 도구 자율 호출 빈발 - Get-Content/cat/type 모두 우회 가능, sed -n로 raw 출력 우회 학습 성공
- 84차 인계 메타데이터 (GET/POST) 신뢰 금지 - 회차 시작 시 실제 raw 재검증 필수
- apiClient.postJson 교체 시 r.ok/r.status 분기 코드 동반 점검 필수 (반환값 변화)
- fetch then r.json 단순 패턴은 안전, r.ok 분기 패턴은 회귀 위험
- 검수자 추천 (롤백) 즉시 수용으로 안전한 부분 종결 달성
- 자율 텍스트 t 프리픽스 덮어쓰기 패턴 정착 (15회+ 차단 성공)
- PowerShell Add-Content 명령은 965 bytes 이하로 분할 필수 (한글 + 따옴표 다수 시 초과)
