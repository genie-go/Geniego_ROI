# GeniegoROI Claude Code Implementation Specification

# CCIS Part014 — Testing Strategy & Quality Assurance Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

테스트 전략·품질 보증(QA) 표준을 수립한다.

> ★**성격(Part001~013 과 부분 상이)**: 사용자가 Part014 명세(Test Pyramid·PHPUnit/Pest·Infection
> Mutation·Rector·Contract/Performance Test·Code Coverage·Architecture Test)를 제공했으나 **그대로
> 따르지 않았다.** 실측 결과 이 저장소에 **단위테스트 프레임워크(PHPUnit/Pest/vitest)는 부재**하나,
> **pre-commit 게이트(G2·G9~G15) + `make quality`(ESLint/PHPStan/composer audit) + E2E(smoke/render/
> scenarios) + i18n triage 자기검증(16 invariants)** 이라는 **다른 형태의 강한 QA 스택**이 실재한다.
> Part001 §4 에 따라 **실측 → 매핑 → 부재 증명 → 실재 QA 모델 성문화**했다. (문서 차수 — 코드 무변경.
> ★§26 CI 게이트 갭은 권고.)

---

## 2. 실측 — 현행 QA 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| 단위테스트 | PHPUnit/Pest | **부재**(composer 0·`tests/` 없음·`*Test.php` 0) |
| Mutation(Infection)/Rector/Pint | 도입 | **부재** |
| Code Coverage | Domain 95%… | **측정 안 함**(테스트 프레임워크 부재) |
| Test Pyramid | Unit 최다 | **미적용**(단위 계층 부재) |
| E2E | 사용자 시나리오 | ★**실재** — `npm run e2e`(smoke)·`e2e:render`(playwright)·`e2e:scenario`(`tools/e2e/`) |
| API/Security Test | 자동화 | **부분** — E2E smoke 가 로그인+엔드포인트 프로브. 전용 계층 아님 |
| 정적분석(PHPStan) | Level 8 | ★**PHPStan Level 5 + baseline**(Part004·본 세션 확장). Level 8 아님 |
| ESLint | — | ★**ESLint baseline**(error 618/warn 131·증가분 차단·Part004) |
| composer audit | Quality Gate | ★**게이트 편입**(Part012 §7·취약 0) |
| pre-commit 게이트 | — | ★**실재(매 커밋)** — 자격증명 스캔·G2(i18n sacred SHA)·G9(routes $custom↔$register 등록)·G10(react-hooks/no-undef)·G11(php -l)·G14(정적자산 팬텀)·G15(헤더리스 getJson 인가) |
| i18n triage | — | ★**자기검증 3종**(`tools/triage.mjs`·16 invariants·pre-commit 자동) |
| 통합 게이트 | `make test` | ★**`make quality`**(ESLint·PHP구문·Shell·JSON·Git·PHPStan·composer audit) + `make validate`(저장소 구조) |
| ★CI Quality Gate(§26) | PR 마다 정적분석·차단 | **부분 갭** — `deploy.yml` CI 는 **build+deploy 만**. `make quality`/e2e 미실행(로컬·pre-commit 전용) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(자동화·결정적·독립·빠름) | **부분 준수** | 게이트/E2E 자동화·결정적. "Test First"·단위테스트는 아님 |
| §4~§6 Test Pyramid/Unit | **미적용** | 단위테스트 프레임워크 부재. 검증=게이트+E2E+invariant |
| §7 Integration Test | **부분** | E2E smoke 가 실서버 통합 프로브(Test Container 아님) |
| §8 API Test | **부분** | E2E smoke: status/auth/엔드포인트. OpenAPI 대조 아님(Part011) |
| §9 E2E | **★실재** | smoke(로그인+프로브)·render(playwright 렌더)·scenario |
| §10 Contract Test | **미적용** | 부재. 웹훅 서명검증(Part012)이 부분 대응 |
| §11 Architecture Test | **부분(대응물)** | 전용 도구 아님. 단 **pre-commit G9(routes 등록)·G10(react-hooks)·G14(정적자산)** 가 구조 위반 차단 |
| §12 Mutation(Infection) | **미적용** | 부재 |
| §13 Performance Test | **미적용** | k6/JMeter 부재. 285차 502 등 실측 대응 |
| §14 Security Test | **부분 준수** | composer audit·SSRF/SQLi 감사(287~289차)·자격증명 스캔(pre-commit) |
| §15~§16 PHPUnit/Pest | **미적용** | 부재 |
| §17 PHPStan(Level 8) | **부분** | Level 5+baseline. Level 8=대규모 baseline(향후) |
| §18 Rector | **미적용** | 부재 |
| §19~§22 Mock/Stub/Fake/Fixture | **대상 없음** | 단위테스트 부재 |
| §23 Test Data | **부분** | E2E 는 데모환경(otp_dev 자동통과)·운영데이터 미사용 준수 |
| §24 Code Coverage | **미적용** | 측정 안 함 |
| §25 Static Analysis(PR 자동) | **부분** | pre-commit + `make quality`(로컬). ★PR/CI 자동은 갭(§26) |
| §26 CI/CD Quality Gate | **부분 갭** | 로컬/pre-commit 은 강함. deploy.yml CI 는 build+deploy 만 → §6 권고 |
| §27~§29 Test Dir/Naming/Isolation | **대상 없음** | tests/ 부재 |
| §30 PHP 테스트 구현 | **미적용** | PHPUnit/Pest 부재 |
| §31 Claude Code(테스트 없이 기능금지) | **상이(대체)** | 단위테스트 대신 **게이트 통과 + E2E + 라이브 브라우저 검증**(무후퇴 원칙·본 세션 배포검증) |
| §32 검증(phpunit/pint/infection) | **부분** | phpstan·composer audit·e2e 실동작. phpunit/pint/infection 대상 없음 |

---

## 4. 확립된 QA 표준 (신규 코드가 따를 정본)

이 저장소의 QA 는 **"단위테스트 피라미드"가 아니라 "게이트 + E2E + invariant + 라이브 검증"** 모델이다:

- **pre-commit 게이트(매 커밋 자동·차단)**: 자격증명 스캔 · G2(i18n sacred SHA) · G9(routes 등록 정합) · G10(react-hooks/no-undef) · G11(php -l) · G14(정적자산 팬텀) · G15(헤더리스 getJson 인가). ★위반 시 커밋 차단.
- **`make quality`**(수동/게이트): ESLint baseline(증가분 차단) · PHP -l · Shell · JSON · Git · **PHPStan Level5 baseline** · **composer audit**. `make validate`=저장소 구조.
- **E2E**: `npm run e2e`(smoke — 로그인+엔드포인트 프로브) · `e2e:render`(playwright 렌더) · `e2e:scenario`. ★**매 배포 전후 실행**(reference_e2e_smoke).
- **i18n triage**: `tools/triage.mjs`(16 invariants) 자기검증·pre-commit 자동.
- **라이브 검증**: UI/거동 변경은 **playwright 로 운영·데모 직접 검증**(무후퇴·본 세션 401 게이트 배포검증 정합).
- **베이스라인 원칙**(Part004): 규칙 끄지 않고 기존 위반 고정·증가분만 차단. 줄이면 baseline 하향.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **PHPUnit/Pest 단위테스트·Test Pyramid·Coverage** — 안 함. 도메인 계층/DI 부재(transaction-script·Part007/008)라 DB-free 단위테스트가 어렵고, 도입=대규모 신설. 대신 **게이트+E2E+라이브 검증**으로 회귀 방지.
2. **Infection/Rector/Pint/Contract/Performance Test** — 안 함. 부재. 도입은 별도 과제.
3. **PHPStan Level 8** — 안 함. Level 5+baseline 정본. Level 8=거대 baseline(향후 단계적).
4. **CI(deploy.yml) 에 `make quality`/e2e 편입** — ★**본 차수 미실행**(§6 권고). deploy CI 수정은 운영 배포경로 변경·CI 실패 이력(팬텀 콜)이라 신중. 별도 workflow 안전분리 방식 권고.

★**준수하는 실 원칙**: 자동화 게이트(pre-commit+quality)·E2E·i18n invariant·라이브 검증·베이스라인 무증가·운영데이터 미사용·배포 전후 회귀검증.

---

## 6. ★관찰 및 권고 (§25/§26 — CI Quality Gate 갭)

- **현황**: 품질 게이트(`make quality`: ESLint/PHPStan/composer audit)와 pre-commit 게이트는 **로컬/커밋 시점** 강력히 작동한다. 그러나 **`deploy.yml` CI 는 build+deploy 만** 하고 `make quality`·`npm run e2e` 를 실행하지 않는다. → 커밋을 우회(`--no-verify`)하거나 pre-commit 미설치 환경의 푸시는 CI 에서 걸러지지 않는다.
- ★**본 차수 미실행 사유**: ① `deploy.yml` 은 master push 시 **운영 배포를 자동 발동** — 여기에 게이트 추가는 배포경로 변경(민감). ② 이 저장소 CI 는 과거 "팬텀 콜"(존재하지 않는 스크립트 호출)로 무음 실패 이력(CLAUDE.md). ③ 게이트 CI 는 runner 에 php8.1/composer/node20/make 셋업이 정확해야 하며, gh 미인증으로 실행 검증 불가 → **미검증 CI 파일 추가는 red-X 리스크**.
- **권고(향후·승인)**: **deploy.yml 을 건드리지 말고 별도 `.github/workflows/quality.yml` 신설**(PR/비-master push 트리거) — setup-node(.nvmrc)+setup-php(8.1)+composer install+npm install → `make quality`(+선택 e2e:render). deploy 워크플로와 격리해 배포 파괴 위험 0. **최초 1회 실제 실행 검증(gh 인증) 후 확정**.

---

## 7. Claude Code 구현 규칙

1. 기능 추가/수정 = **게이트 통과 필수**(pre-commit + `make quality`). 단위테스트 대신 **E2E + 라이브 브라우저 검증**으로 회귀 확인(무후퇴).
2. **베이스라인 무증가**(ESLint/PHPStan). 줄이면 baseline 하향. 규칙 끄지 않기.
3. UI/거동 변경은 **playwright 로 운영·데모 직접 검증**(reference_browser_verify_always).
4. i18n 신규 키는 triage invariant 통과(16종). routes 신규는 G9 등록 정합.
5. 운영 데이터·랜덤·sleep 의존 검증 금지. 배포 전후 `npm run e2e`.
6. PHPUnit/Pest/Infection/Coverage/Test Pyramid 를 "명세에 있다"는 이유로 대규모 신설하지 않는다(게이트+E2E 모델 유지).

---

## 8. Completion Criteria

- [x] QA 스택 **실측**(단위테스트 0·E2E 3종·pre-commit G2~G15·make quality·i18n triage 16 invariants)
- [x] 명세 §3~§32 **섹션별 매핑·판정**(Test Pyramid/PHPUnit/Coverage/Mutation 부재 증명)
- [x] 실 QA 모델(게이트+E2E+invariant+라이브 검증) 성문화(§4)
- [x] 자동화 게이트·E2E·베이스라인·라이브 검증 준수 명시
- [x] 의도적 미적용 + 사유(§5) — 단위테스트/Coverage/Level8
- [x] ★§26 CI Quality Gate 갭 관찰·권고(별도 quality.yml·미실행)(§6)
- [x] Claude Code 규칙(§7) · `make quality` 8 PASS 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 게이트+E2E+invariant QA 모델의 성문화이지 Test Pyramid/PHPUnit 이식이 아니다. ★CI 게이트 편입은 별도 workflow 로 향후 권고.

---

## 다음 Part

**CCIS Part015 — CI/CD Pipeline, Build & Release** — ★사전 경고: CI=`deploy.yml`(master push→**빌드만·실배포는 수동 pscp/plink**·CI inert). 브랜치=`master` 트렁크(★`origin/main` 과 공통조상 없음). 배포=수동 dist swap+fpm reload(본 세션 실측·SHA 검증 필수). Semantic Versioning/Blue-Green/Canary/Docker 부재. Part015 는 실측→매핑→기존 수동배포+CI inert 성문화.
