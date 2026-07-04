# ChangeHistory — 변경 이력 (포인터)

> **정본(SSOT)**: `NEXT_SESSION.md`(세션별 작업로그·차수별) + `git log`(feat/n236) + `docs/*_CHANGELOG.md`(API) + `SESSION_HISTORY.md`.
> 메모리: `MEMORY.md` → `project_n*`(차수별 상세).

## 265차 변경 요약 (feat/n236·master 미접촉)
| 커밋 | 내용 |
|------|------|
| 5ff01556d50 | 전수감사 확정결함5 수정 |
| 923707a7ea5·216f0577116 | DigitalShelf·Promotion 백엔드 신설 |
| ae49e023f8f·26df5ea5ef1·ccf38572df6·0159462075f | 확장 초고도화 14건 |
| 3b195f6eeea | 라이브 스키마 드리프트5 수정 |
| abd0fc93cb0 | rules-of-hooks 정합3 |
| 94258fb1e14·730f4200243 | php-l CI가드(backend전체) |
| c11393a6478 | audit_routes 중복제거 |
| 9ccc89e9685 | 라우트 등록정합 CI가드 |
| b09b~a1d1 | CHANGE_GATE 5중게이트 문서 |

## 갱신 규칙
매 변경 커밋은 `NEXT_SESSION.md`(세션로그) 갱신 + git 커밋메시지에 [Change Impact Analysis]/[Regression Prevention] 요약. 차수 종료 시 인계서 작성(명시 승인 후).
