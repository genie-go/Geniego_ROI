# APIRegistry — API 레지스트리 (포인터)

> **정본(SSOT)**: **`backend/src/routes.php`** — $custom(METHOD /path => Handler) + $register(등록) 2단계. 라우트 정합 가드=`tools/check_routes_registered.mjs`(G9).
> 변경이력: `docs/API_CHANGELOG.md`(루트)·`PERMISSION_API_CHANGELOG.md`·`ADMIN_GROWTH_API_CHANGELOG.md`.
> 개발자문서: DeveloperHub(프론트)·`docs/REAL_AD_OAUTH_SETUP.md`.

## 규약 (필수)
- 신규 EP: $custom + **$register 둘 다**(누락=런타임 Not found). /api 변형은 $custom에 추가·$register는 plain만(basePath strip).
- v428+/v429+ 는 nginx가 /api 접두로만 프록시(v3~v427 직접). 프론트는 /api/v429/... 호출.
- 인증: index.php public bypass 목록 + 핸들러 requirePro/requirePlan. 신규 세션 self-auth EP는 /v429/ 등 bypass 프리픽스 활용.

## 갱신 규칙
신규/변경 EP는 routes.php($custom+$register) + 해당 CHANGELOG 갱신. 커밋 전 G9 가드 통과.
