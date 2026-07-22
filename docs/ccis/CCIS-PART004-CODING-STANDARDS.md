# GeniegoROI Claude Code Implementation Specification

# CCIS Part004 — Coding Standards

Version 1.0 | 2026-07-22

---

## 1. 작업 목적

코딩 표준을 수립하고, **문서가 아니라 실행되는 게이트**로 강제한다.
명세 §25 는 "문서만 생성하고 실제 품질 도구와 설정을 검증하지 않았다면 부분 완료"로 규정한다 —
따라서 본 차수는 도구 실행과 위반 실측을 포함한다.

---

## 2. 언어 및 프레임워크 분석 (실측)

### 2.1 원시 카운트는 오해를 부른다

`git ls-files` 확장자 집계는 `.py 911` · `.ts 527` · `.go 449` 를 보고한다.
그러나 **위치로 분류하면 전부 우리 코드가 아니다.**

| 확장자 | 총계 | 실제 위치 | 판정 |
|--------|------|-----------|------|
| `.py` | 911 | `legacy_v338_pkg` 873 · 나머지 소수 도구 | 아카이브 |
| `.ts` / `.tsx` | 527 / 60 | **100% `legacy_v338_pkg/archives`** | 아카이브 |
| `.go` | 449 | **100% `legacy_v338_pkg/archives`** | 아카이브 |
| `.java` | 3 | `frontend/android` | Capacitor 생성물 |
| `.tf` | 11 | `infra/aws` | 미사용 스텁(Part003) |
| **`.php`** | **175** | `backend/src` 137 · `backend/bin` 36 · `tools` 1 | **우리 코드** |
| **`.jsx`/`.js`** | **344** | `frontend/src` | **우리 코드** |
| `.sql` | 21 | `backend/migrations` | 우리 코드 |

→ **Java·Kotlin·TypeScript·Go·Terraform 표준은 작성하지 않는다.** 대상이 없다.
→ 명세가 다루지 않는 **PHP 표준을 신규 작성한다**(본 저장소 백엔드의 유일 언어).

### 2.2 기존 품질 도구

| 도구 | 상태 |
|------|------|
| ESLint | **있음** — `frontend/.eslintrc.json` (`eslint:recommended` + react + react-hooks) |
| Prettier / Stylelint | 없음 |
| PHPStan / Psalm / PHP-CS-Fixer | **없음** — `composer.json` 에 `require-dev` 자체가 없다 |
| Ruff / mypy / pytest | 없음 (Python 미사용) |
| SQLFluff · yamllint · ShellCheck · hadolint | 없음 |
| SonarQube | 없음 |
| 단위테스트 프레임워크 | **없음** (`npm test` · PHPUnit · vitest 부재) |
| 실재하는 자동 검증 | `tools/triage_apply_self_test_all.sh` (i18n triage 자기검증 3종 · 16 invariants · pre-commit 훅에서 자동 실행) · `npm run e2e`/`e2e:render`/`e2e:scenario` |
| CI 품질 단계 | `deploy.yml` 의 정적 가드 4종 + `security-scan.yml`(npm audit 등) |

**중복 도입하지 않는다** — 새 린터·포매터를 설치하는 대신 **이미 있는 ESLint 와 `php -l` 을 제대로 돌리는 것**을 우선했다.

---

## 3. 착수 시점 위반 실측 — 그리고 그 소음이 덮고 있던 것

`npm run lint` 는 **실패 상태였다**(`make lint` 도 마찬가지). 즉 게이트가 죽어 있었다.

| 구분 | error | warning |
|------|-------|---------|
| 착수 시점 전체 | **7,087** | 131 |

규칙별 상위: `react/prop-types` 3296 · `no-dupe-keys` 2448 · `react/react-in-jsx-scope` 515 ·
`no-unused-vars` 410 · `no-empty` 339 · `react-hooks/exhaustive-deps` 81 · 파싱 오류 12.

### 3.1 분해

| 원인 | 건수 | 성격 |
|------|------|------|
| `locales_backup` 백업 40개 파일 검사 | 2,459 | **검사 대상 오류** — `.eslintignore` 부재 |
| `react/prop-types` | 3,296 | **적용 불가 규칙** — prop-types 를 쓴 적이 없다 |
| `react/react-in-jsx-scope` | 515 | **적용 불가 규칙** — 자동 JSX 런타임 |
| 나머지 | 958 | **실제 부채** |

### 3.2 소음이 덮고 있던 진짜 결함 3건

| 결함 | 파일 | 영향 |
|------|------|------|
| **`onBlur` prop 중복** | `frontend/src/pages/AuthPage.jsx` | JSX 는 뒤엣것만 남긴다 → props 로 받은 `onBlur` 가 폐기 → **회원가입 추천코드 검증(`/api/auth/referral/validate`)이 한 번도 실행되지 않아** "추천인 확인"·"유효하지 않은 코드" 안내가 표시되지 않았다 (282차 R3 기능이 죽어 있었음) |
| `target="_blank"` rel 누락 | `frontend/src/pages/InstagramDM.jsx:441` | 리버스 탭내빙 |
| 리터럴 `\n` 으로 파일 전체 파싱 불가 | `frontend/src/hooks/perf.js:1` | import 문 뒤에 역슬래시+n 두 글자. **어디서도 import 되지 않는 고아 파일**이라 빌드는 통과하고 있었다 |

세 건 모두 ESLint 가 **줄곧 신고하고 있었다.** 7,087건이라는 총량이 그것을 무의미하게 만들었을 뿐이다.

---

## 4. 조치

### 4.1 검사 대상 정정

`frontend/.eslintignore` 신설 — `locales_backup` · `dist*` · `node_modules` · `android`/`ios` 제외.

### 4.2 적용 불가 규칙 해제 (근거 있음)

`react/prop-types` · `react/react-in-jsx-scope` · `react/jsx-uses-react` → `off`.
근거는 [CODING-STANDARDS.md §9](../development/CODING-STANDARDS.md) 에 표로 남겼다.

**실제 결함을 가리키는 규칙은 하나도 끄지 않았다** — `no-unused-vars`·`no-empty`·
`react-hooks/*`·`no-dupe-keys`·`jsx-no-duplicate-props`·`jsx-no-target-blank` 전부 유지.

### 4.3 실결함 3건 수정

§3.2 의 세 건을 모두 고쳤다. `AuthPage` 는 두 핸들러를 합쳐 전달받은 `onBlur` 가 다시 호출되도록 했다.

### 4.4 결과

| | error | warning |
|---|-------|---------|
| 착수 | 7,087 | 131 |
| **현재** | **958** | **133** |

warning 이 2 증가한 것은 `perf.js` 가 이제 **파싱되어** 검사 대상이 됐기 때문이다(정상).

### 4.5 베이스라인 게이트

기존 위반 958건을 0으로 만들 때까지 게이트를 끄지 않는다. 대신 **증가분만 차단**한다.

- `config/quality/eslint-baseline.json` = `{errors: 958, warnings: 133}`
- `scripts/quality/check-code-quality.sh` 가 현재값과 비교해 **초과 시 FAIL**
- 줄이면 `make quality-baseline` 으로 기준을 낮춘다. **올리는 갱신은 금지**

### 4.6 PHP 게이트 신설

`make lint-backend` 가 `php -l src/routes.php` **단일 파일**만 검사하고 있었다.
→ 추적 PHP **175개 전수 검사**로 확장. 실측 결과 **구문 오류 0건**이라 베이스라인 없이 항상 0 을 요구한다.

---

## 5. 생성 및 수정 파일

### 신규

| 파일 | 내용 |
|------|------|
| `docs/ccis/CCIS-PART004-CODING-STANDARDS.md` | 본 문서 |
| `docs/development/CODING-STANDARDS.md` | 공통 + JS/JSX + **PHP** + SQL + YAML/JSON + Shell/PS |
| `docs/development/CODE-REVIEW-CHECKLIST.md` | 리뷰 체크리스트 |
| `docs/development/SECURE-CODING-GUIDE.md` | 보안 코딩 (실제 사고 근거 병기) |
| `scripts/quality/check-code-quality.sh` | 통합 게이트 5종 |
| `config/quality/eslint-baseline.json` | 위반 베이스라인 |
| `frontend/.eslintignore` | 검사 제외 |

### 수정

| 파일 | 변경 |
|------|------|
| `frontend/.eslintrc.json` | `root: true` + 적용 불가 규칙 3개 해제 |
| `frontend/src/pages/AuthPage.jsx` | **onBlur 중복 제거 — 추천코드 검증 복구** |
| `frontend/src/pages/InstagramDM.jsx` | `rel="noreferrer"` 추가 |
| `frontend/src/hooks/perf.js` | 리터럴 `\n` → 개행 (구문 복구) |
| `Makefile` | `quality`·`quality-baseline` 신설 · `lint-backend` 전수 검사 · `test` 를 quality 기반으로 |

### 만들지 않은 것

| 명세 §6 요구 | 사유 |
|--------------|------|
| `config/checkstyle` · `pmd` · `spotbugs` | Java 부재 |
| `pyproject.toml`(ruff·mypy) | Python 부재 |
| `.prettierrc` · `.prettierignore` | Prettier 미도입. **도입 시 전 파일 재포맷이 발생**하며 이는 명세 §23 "기존 코드 전체 일괄 Format 금지"와 충돌한다. 별도 결정 사안 |
| `.sqlfluff` · `.yamllint` · `.shellcheckrc` | 해당 도구 미설치. 설치 없는 설정 파일은 허구다 |
| `eslint.config.js` | 기존 `.eslintrc.json`(ESLint 8) 을 확장했다. flat config 이관은 별도 사안 |
| `scripts/lint/` · `scripts/format/` | `make lint`/`make quality` 로 흡수(중복 방지) |

---

## 6. 검증 결과

| 검증 | 명령 | 결과 |
|------|------|------|
| 품질 게이트 | `make quality` | **EXIT 0** — PASS 6 / FAIL 0 |
| 게이트 실효성 | 의도적 위반 파일 투입 | **EXIT 1** — `error 958 → 960 (+2)` 감지 후 차단. 시험 파일 제거 완료 |
| PHP 전수 | `make lint-backend` | **175 files, 0 error** |
| Shell 구문 | 게이트 내 `bash -n` | 22개 파일 0 error |
| JSON 파싱 | 게이트 내 | 125개 파일 0 error |
| 프론트 빌드 | `npm run build` | **✓ built in 49.18s** · EXIT 0 |
| 저장소 게이트 | `make validate` | 4/4 PASS |

### 미실행 (정직 보고)

| 항목 | 사유 |
|------|------|
| Unit Test | **단위테스트 프레임워크가 없다**(PHPUnit·vitest 부재). 다만 i18n triage 자기검증(16 invariants)은 pre-commit 에서 자동 실행되며 본 차수 커밋에서 3 PASS/0 FAIL 확인 |
| Type Check | TypeScript 미사용 |
| Static Analysis (PHPStan 등) | 미설치. 도입은 별도 결정 |
| SQL / YAML / Terraform Validation | 해당 도구 미설치 · Terraform 은 스텁 |
| E2E (`npm run e2e`) | 백엔드 기동이 필요해 미실행 |
| ~~런타임 회귀 확인~~ | **해소** — 운영·데모 배포 후 브라우저 실검증 완료. 회원가입 폼에서 blur 시 `POST /api/auth/referral/validate` 200 발생 + "⚠ 유효하지 않은 추천코드입니다" 표시 확인(양쪽) |

---

## 7. 신규 코드 품질 게이트 정의

| 대상 | 기준 |
|------|------|
| 신규/수정 JS·JSX | ESLint error **증가 0**. `eslint-disable` 신규 추가 금지 |
| 신규/수정 PHP | `php -l` 오류 0 (전수) |
| 신규 Shell | `bash -n` 오류 0 |
| 모든 변경 | 병합 충돌 표식 0 · `git diff --check` 통과 |
| 생성물 | 검사 제외 — `.eslintignore` 와 게이트 스크립트에 **명시적으로** 열거 |

---

## 8. Completion Criteria

| 기준 | 상태 |
|------|------|
| 사용 언어 분석 | ✅ 위치 기반 분류로 아카이브와 분리 |
| 기존 Coding Standard 분석 | ✅ 문서 부재 확인 → 신규 작성 |
| 기존 Formatter 식별 | ✅ **부재 확인**(Prettier 없음) |
| 기존 Linter 식별 | ✅ ESLint 1종 |
| 기존 Static Analysis 식별 | ✅ **부재 확인**(PHP 측 도구 0) |
| 기존 Test Tool 식별 | ✅ 단위테스트 프레임워크 **부재 확인** · i18n 자기검증·E2E 스모크는 **실재 확인** |
| CI 품질 단계 식별 | ✅ deploy.yml 가드 4종 + security-scan |
| 공통 Coding Standards | ✅ (**PHP 포함** — 명세 미수록분 신규) |
| Code Review Checklist | ✅ |
| Secure Coding Guide | ✅ |
| Java / Python / Terraform 품질 설정 | ✅ **대상 부재 확인** — 도입하지 않음 |
| TypeScript 품질 설정 | ✅ 대상 부재(우리 코드에 TS 없음) |
| SQL / YAML / Shell 품질 설정 | ⚠️ 전용 린터 미설치 · **구문 게이트로 대체** |
| Root Lint / Quality 명령 | ✅ `make lint` · `make quality` |
| Root Format 명령 | ❌ **미제공** — 포매터 미도입(§5 사유) |
| 신규 코드 품질 Gate 정의 | ✅ §7 |
| Generated Code 검사 정책 | ✅ §4.1 |
| Security 코딩 규칙 | ✅ SECURE-CODING-GUIDE.md |
| 대규모 자동 Format 미실행 | ✅ 포맷 변경 0 |
| 기존 기능 무단 변경 없음 | ✅ 수정 3건은 **모두 결함 수정**이며 근거를 §3.2 에 명시 |
| 기존/신규 위반 구분 | ✅ 베이스라인으로 분리 |
| 실패·미완료 보고 | ✅ §6 |

**판정: 조건부 완료.** 문서·게이트·도구 실행·위반 실측·실결함 수정까지 완료했으나,
포매터 미도입과 전용 린터(SQL/YAML/Shell) 부재는 미해결로 남는다.

---

## 9. 미결 항목

| # | 항목 | 결정 필요 사항 |
|---|------|----------------|
| 1 | ESLint 부채 958 error / 133 warning | 감축 계획. 최다는 `no-unused-vars` 553 · `no-empty` 339 (빈 catch = 무음 오류 삼킴) |
| 2 | Prettier 도입 여부 | 도입 시 전 파일 재포맷 → 대규모 diff. 신규 파일에만 적용하는 방식 검토 필요 |
| 3 | PHP 정적분석(PHPStan) | `require-dev` 부터 신설해야 한다. 도입 시 초기 위반 규모 미상 |
| 4 | 단위테스트 프레임워크 부재 | i18n 자기검증·E2E 스모크는 있으나 도메인 로직 단위테스트가 없다. 품질 게이트의 최대 공백 |
| 5 | `perf.js` 고아 파일 | 구문은 고쳤으나 여전히 어디서도 import 되지 않는다. 삭제 여부 결정 필요 |
| 6 | ESLint 9 flat config 이관 | 현재 `.eslintrc`(ESLint 8). 별도 사안 |

---

## 10. 다음 Part 선행 조건

**CCIS Part005 — Naming & Package Standards** 착수 전:

- PHP 네임스페이스는 `Genie\` / `Genie\Handlers\` 로 **이미 고정**돼 있다(PSR-4). 재정의하지 않는다.
- 명세 §8.1 의 Hexagonal 패키지 구조(`domain`/`application`/`adapter`)는 이 저장소에 없다 —
  백엔드는 `Handlers/` 103개 + 루트 서비스 클래스 구조다. 구조 변경은 Part005 범위를 넘는 별도 ADR 사안이다.
- 프론트엔드 디렉터리 명명은 이미 관행이 있고 `context/`·`contexts/` **둘 다 실재**한다.
  통합 여부는 Part005 에서 다룰 값어치가 있는 실제 중복이다.
- DB 테이블 명명은 `snake_case` 복수형으로 일관돼 있다.

---

*다음 Part: CCIS Part005 — Naming & Package Standards*
