# DSAR — Authorization Federation API Surface (Part 3-18 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_API_SURFACE(§32)

Federation API Surface는 **연합 도메인의 등록·메타데이터 교환·신뢰 검증·정책 동기화·연합 결정 요청·분석 조회·시뮬레이션·인증서 상태 확인을 관리하는 표준 관리 표면(control-plane API)**을 규정하는 계약이다. §28 Runtime Guard·§29 Static Lint·§30/§31 Contract가 판정·표면화 계층이라면, §32는 그 대상(연합 관계)을 **생성·조회·운용**하는 관리 API다. 8종 엔드포인트:

- **Register Federation Domain** — 파트너 도메인 등록·신뢰 정책 부여.
- **Exchange Metadata** — 상호 메타데이터(엔티티ID·엔드포인트·서명키) 교환.
- **Validate Trust** — 파트너 신뢰 상태 검증.
- **Synchronize Policy** — 공유 정책 스냅샷 동기화.
- **Request Federated Decision** — 원격 PDP에 연합 인가 결정 요청.
- **Query Federation Analytics** — 연합 상호작용 지표 조회.
- **Run Federation Simulation** — 배포 전 연합 결정 시뮬레이션(dry-run).
- **Verify Certificate Status** — 상호 인증서 유효·폐기 상태 확인.

계약상 모든 API는 admin scope·`analyst+` 이상·감사 append를 요구하며(control-plane), 변경형(Register/Exchange/Synchronize)은 fail-closed 검증을 통과해야 한다.

## 2. Substrate 매핑

| SPEC 엔드포인트(§32) | 현행 substrate | 상태 |
|---|---|---|
| Exchange Metadata | samlMetadata(`EnterpriseAuth.php:307`) | proto — SAML SP 메타데이터 제공, 파트너 양방향 교환 아님 |
| Verify Certificate Status | IdP cert 소비(`EnterpriseAuth.php:596-623`·`:597-598`) | 확장 대상 — cert 소비 경로 재사용, 폐기/상태 조회 부재 |
| 라우트 재사용 기반 | `/v430/sso/*` 라우트(`routes.php:925-942`) | SSO 라우트군 — federation 관리 API 배선 지점으로 재사용 |
| 관리 API 인가 게이트 | RBAC 미들웨어(`index.php:573-597`·public bypass `:78-89`) | control-plane 게이트 재사용 |
| Register/Validate Trust/Synchronize Policy/Request Federated Decision/Query Analytics/Run Simulation | 부재 | **ABSENT (grep 0)** |

## 3. 설계 계약

- **엔드포인트 배선** — 8종은 `/api` 접두 하에 라우트 등록 파일에서 `$register`로 배선(신규 엔드포인트 컨벤션). `/v430/sso/*`(`routes.php:925-942`) 라우트군을 재사용·확장하며 병렬 신규 SSO 라우트 신설 금지.
- **Exchange Metadata 재사용** — `EnterpriseAuth.php:307` samlMetadata 출력을 양방향 교환의 우리 측 메타데이터 소스로 재사용, 별도 메타데이터 생성기 금지.
- **Verify Certificate Status 확장** — `EnterpriseAuth.php:596-623`·`:597-598`의 IdP cert 소비 경로를 폐기·만료 상태 조회로 확장.
- **인가** — 8종 모두 admin scope·`analyst+`. public bypass 목록(`index.php:78-89`)에 **추가 금지**(control-plane은 인증 필수). 변경형은 §29 Static Lint 통과·§28 Runtime Guard 하 fail-closed.
- **감사·멱등** — 변경형 API는 `SecurityAudit.php:14-67` append + 멱등키. Run Simulation은 dry-run(부작용 0, 감사에는 simulate 라벨 기록).

## 4. KEEP_SEPARATE

- **OAuth 콜백**(`OAuth.php:24`·`:369`) — 사용자 소셜 로그인 콜백. federation 도메인 등록 API와 별개, 재사용 금지.
- **OpenPlatform HMAC**(`OpenPlatform.php:39`·`:41`·`:394`) — 외부 개발자 API 표면. federation control-plane과 목적 상이.
- **Paddle**(`Paddle.php:19`·`:49`) — 결제 파트너 연동. authorization federation과 무관.

## 5. 판정

**ABSENT** — federation 관리 API 8종 순신규. Exchange Metadata는 samlMetadata(`EnterpriseAuth.php:307`), Verify Certificate Status는 IdP cert 소비(`EnterpriseAuth.php:596-623`·`:597-598`)를 확장 기반으로 삼고, `/v430/sso/*`(`routes.php:925-942`) 라우트군 재사용·`$register` 배선한다. 그러나 Register/Validate Trust/Synchronize Policy/Request Federated Decision/Query Analytics/Run Simulation은 발생원·엔드포인트 전무. §32 8종 순신설(control-plane). **NOT_CERTIFIED · BLOCKED_PREREQUISITE**(파트너 도메인·연합 계약·원격 PDP substrate 부재로 API 대상 미완).
