# DSAR — Service Test Strategy (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Test Strategy)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role(Part 3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · 외부 벤더 자격증명 내부 identity 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차·279차 재플래그 금지

---

## 1. 목적

§37(테스트)는 **Unit(Service/Runtime/Secret/Certificate) · Integration(OAuth/JWT/Vault/Kubernetes) · Security(Secret Leak/API Key Abuse/Certificate Abuse/Runtime Injection) · Regression(Assignment/Dynamic Role/Workflow)**을 정의한다. ★CLAUDE.md 확정 사실 — "이 저장소에는 구성된 lint/test 스크립트가 없다(no `npm test`, no PHPUnit suite)". 따라서 §37의 4개 대분류 **전부 실행 가능한 테스트 코드 기준으로는 ABSENT**다. 본 문서는 4개 대분류·13개 세부 항목이 겨눌 **실 substrate 표적**(테스트 코드가 아니라 검증 대상 함수/시나리오)을 근접 인용과 함께 명세한다.

## 2. Canonical 필드

- **테스트 항목** — §37 원문 13종 중 1
- **분류** — Unit/Integration/Security/Regression
- **검증 표적** — 실 substrate 함수/시나리오(file:line, 없으면 ABSENT)
- **판정** — 테스트 코드 존재 여부(전항목 ABSENT) + 표적 substrate 존재 여부(PARTIAL/ABSENT)

## 3. 열거형 / 타입

**Unit(원문)**: Service · Runtime · Secret · Certificate.
**Integration(원문)**: OAuth · JWT · Vault · Kubernetes.
**Security(원문)**: Secret Leak · API Key Abuse · Certificate Abuse · Runtime Injection.
**Regression(원문)**: Assignment · Dynamic Role · Workflow.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | 분류 | 항목 | 검증 표적(현행 근접 substrate) | 판정 |
|---|---|---|---|---|
| 1 | Unit | Service | api_key CRUD(create `Keys.php:81-133`·revoke `:135-148`·rotate `:150-187`) — 단 2경로 산재(UserAuth.php `:4339-4379`, DUPLICATE_AUDIT D-1) | **PARTIAL(표적 존재·테스트 0)** |
| 2 | Unit | Runtime | Runtime Trust/Context/Authentication 통합 개념 자체 grep 0(EXISTING §9) | **ABSENT(표적 없음)** |
| 3 | Unit | Secret | Crypto AES-256-GCM 암호화/복호(`Crypto.php:108-126,133-148,161-182`) — fail-closed·평문폴백 거부 실 동작 | **PARTIAL(표적 존재·테스트 0)** |
| 4 | Unit | Certificate | Certificate Governance 완전 부재(cert_expires grep 0·EXISTING §5) | **ABSENT(표적 없음)** |
| 5 | Integration | OAuth | SSO OIDC client_secret(`sso_config.oidc_client_secret`·`EnterpriseAuth.php:218`)·JWKS 소비(`:522-531` kid 매칭) | **PARTIAL(표적 존재·테스트 0)** |
| 6 | Integration | JWT | Google GCP 서비스계정 JWT(`Connectors.php:3781-3815`)·Snowflake 키페어 JWT(`DataExport.php:550-584`) — ★외부 아웃바운드(오흡수 금지, ADR D-3), 내부 identity JWT 발급/검증 자체는 별개 표적 없음 | **PARTIAL(외부 표적만·내부 JWT 없음)** |
| 7 | Integration | Vault | HashiCorp Vault/AWS Secrets Manager/KMS 연동 grep 0(DUPLICATE_AUDIT D-3, AdminGrowth 1건=무관) | **ABSENT(표적 없음)** |
| 8 | Integration | Kubernetes | Kubernetes Service Account·mTLS grep 0(EXISTING §5 "mTLS grep 0") | **ABSENT(표적 없음)** |
| 9 | Security | Secret Leak | ★DUPLICATE_AUDIT D-5 평문 토큰 gap이 최우선 실 표적: `agency_session.token`(`AgencyPortal.php:81,203-205`)·`partner_session.token`(`PartnerPortal.php:60-66,177`)·`channel_webhook_token.token`(`ChannelSync.php:5771-5795,5863-5866`)·`journeys.webhook_token`(`JourneyBuilder.php:88,131,159`)·`webhook_endpoint.secret`(`OpenPlatform.php:84,117-121`) 전부 평문 저장 — DB덤프 시 즉시 재사용 가능(수정 아님, 이번 차수 설계) | **REAL(최우선 표적·실 gap)** |
| 10 | Security | API Key Abuse | 레이트리밋(`index.php:527-570`)·사용량 카운트(`:522-525`)가 근접 방어 substrate | **PARTIAL(표적 존재·테스트 0)** |
| 11 | Security | Certificate Abuse | Certificate Governance 부재(#4와 동일 근본 원인) | **ABSENT(표적 없음)** |
| 12 | Security | Runtime Injection | index.php RBAC 게이트(`:572-598`)·테넌트 바인딩(`:609-619`, 헤더 위조 차단)이 근접 — 단 전용 Runtime Context Injection 시나리오는 아님 | **PARTIAL(표적 존재·테스트 0)** |
| 13 | Regression | Assignment/Dynamic Role/Workflow | Part 3-3(Role Assignment)·Part 3-5(Dynamic Role)는 이 저장소에서 **이미 설계 완결(코드 0)** 상태 — 별도 DSAR 문서군 참조. Workflow는 이 3문서 인용범위 밖(반날조 원칙상 타 도메인 근거 차용 금지) | **BLOCKED_PREREQUISITE(Assignment·Dynamic Role) / OUT_OF_SCOPE(Workflow)** |

## 5. 설계 원칙

1. **"테스트 스크립트 0"과 "검증 표적 부재"는 다르다** — Unit > Service/Secret(#1·#3)·Integration > OAuth/JWT(#5·#6)·Security > API Key Abuse/Runtime Injection(#10·#12)은 검증할 실 substrate가 이미 존재한다(PARTIAL). Runtime/Certificate(#2·#4)·Vault/Kubernetes(#7·#8)·Certificate Abuse(#11)만 표적 자체가 없다.
2. **Security > Secret Leak(#9)이 최우선 테스트 표적** — DUPLICATE_AUDIT D-5가 확정한 평문 토큰/secret at-rest 노출 gap의 재현·검증 테스트는 "신규 기능 검증"이 아니라 "기존 안전 결함이 아직 수정되지 않았음"을 실증하는 항목. 이번 차수는 코드 미변경(설계만), 별도 Secret Governance fix 세션 대상.
3. **Integration > JWT(#6)는 내부/외부를 혼동 금지** — Google/Snowflake JWT는 아웃바운드 통합 테스트 표적일 뿐, 내부 Service Identity JWT 발급/검증(§15 JWT Governance)은 순신규이며 별도 표적.
4. **Regression > Assignment/Dynamic Role(#13)은 Part 3-3/3-5가 실구현되지 않은 채로 설계만 완결된 상태를 그대로 반영** — BLOCKED_PREREQUISITE. Workflow는 이 3문서 인용범위 밖으로 정직 유보(타 Part의 무후퇴 근거를 차용하지 않는다).
5. **Vault/Kubernetes(#7·#8)는 근접값 날조 금지** — Vault Reference credential type(스펙 §4)은 순신규이며, K8s SA/mTLS는 이 저장소에 grep 0인 현실을 그대로 유지.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 전체 테스트 코드 실행은 Canonical Service Identity/Secret/Certificate Registry 실구현 + Permission Engine(Part 2)·Role Assignment(Part 3-3) 실구현 이후. Regression > Assignment/Dynamic Role(#13)은 선행 자체가 코드 0.
- **ABSENT(표적 없음)**: Unit > Runtime(#2)·Certificate(#4)·Integration > Vault(#7)·Kubernetes(#8)·Security > Certificate Abuse(#11).
- **OUT_OF_SCOPE**: Regression > Workflow(#13 일부) — 인용범위 밖, 별도 재조사.
- **REAL(최우선 표적)**: Security > Secret Leak(#9) — 평문 토큰 at-rest 노출 gap, 실 확정된 안전 결함(수정은 별도 세션).
- **PARTIAL(표적 존재·테스트 코드 0)**: Unit > Service(#1)·Secret(#3)·Integration > OAuth(#5)·JWT(#6, 외부만)·Security > API Key Abuse(#10)·Runtime Injection(#12).
- **판정**: NOT_CERTIFIED · 실 테스트 스위트 = Canonical Service Identity/Secret/Certificate Registry 신설 + PHPUnit/CI 파이프라인 구축 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SERVICE_FUNCTION_REGRESSION_GATE]] · [[DSAR_APPROVAL_SERVICE_RUNTIME_GUARD]] · [[DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT]] · [[ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE]]
