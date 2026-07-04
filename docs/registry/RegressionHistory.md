# RegressionHistory — 회귀 검증 이력 (Regression Prevention Gate 결과)

> 매 수정 후 7회귀(변경/느려짐/삭제/비활성/숨김/중복/재구현) 검증 결과 기록. 회귀 발견 시 revert.

## 265차 세션 (전 커밋 회귀0 확인)
| 커밋 | 변경 | 회귀 검증 |
|------|------|----------|
| 5ff01556d50 | 확정결함5 수정 | 빌드/php-l PASS·라이브검증·additive/alias보존·회귀0 |
| 923707a7ea5 | DigitalShelf 백엔드 | e2e·홈200·기존탭 무영향·회귀0 |
| 216f0577116 | Promotion 백엔드 | e2e·홈200·회귀0 |
| ae49e023f8f | 확장9(프론트배선) | 빌드·홈200·기존 백엔드 무변경·회귀0 |
| 26df5ea5ef1·ccf38572df6 | 확장batch2 | 빌드·홈200·회귀0 |
| 0159462075f | Rollup 툴팁 | 레이아웃 무변경·회귀0 |
| 3b195f6eeea | 드리프트5 수정 | php-l·라이브쿼리실증·기존 정상경로 무변경·회귀0 |
| abd0fc93cb0 | rules-of-hooks 정합3 | 빌드·동작보존(eslint-disable/rename)·회귀0 |
| 94258fb1e14·730f4200243 | php-l 가드 | 도구·backend 155 clean·회귀0 |
| c11393a6478 | audit_routes 중복제거 | verify-before-delete·G9 라이브재검증·회귀0 |
| b09b~a1d1(게이트문서) | CHANGE_GATE 확장 | 문서만·additive·회귀0 |

## 갱신 규칙
매 수정 커밋마다 (변경요약, 회귀검증 방법·결과) append. 회귀 발견 시 revert 기록 + 원인.
