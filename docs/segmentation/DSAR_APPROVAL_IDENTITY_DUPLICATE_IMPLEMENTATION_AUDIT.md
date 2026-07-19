# DSAR — Actor Identity Assurance: 중복 구현 감사 (§67)

> EPIC 06-A-03-02-03-03 · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]]. 규율: 중복 Principal/Subject/Session/Device Registry 신설 금지 — 실존 확장.

## 1. §67 중복 대상별 판정

| §67 항목 | 현황 | 판정·조치 |
|---|---|---|
| 여러 User Table | app_user 단일(`UserAuth.php:229-264`·`Db.php`) | **단일 SoT**. Person↔Account 분리는 신규지만 테이블 난립 아님 |
| 여러 Subject Registry | canonical subject registry 부재·app_user만 | 신규 Principal Registry/Canonical Subject Binding은 app_user 위 **상위 표준화**(KEEP app_user as source) |
| 여러 Session Store | `user_session` 단일(opaque stateful) | **단일**. 신규 Authentication Session은 이를 확장(중복 store 금지) |
| 여러 Device Registry | **0(부재)** | Device Identity Registry 신규 1개 정본 |
| Email 기반 Actor | canonical actor는 `apikey:{id}`/`user:{email}`(`Mapping.php:36-53`) | ★email이 세션경로 canonical 문자열 일부 — Canonical Subject id로 **승격 필요**(email≠PK 원칙). 단 클라이언트 email 신뢰는 아님 |
| ERP User / Workflow User 이중 Source | ERP/Workflow 사용자 인증 도메인 부재 | 해당없음(커넥터 OAuth는 아웃바운드) |
| Principal ↔ Subject 혼용 | app_user가 principal 겸 subject | 신규 Binding으로 분리(§13/§14) |
| Account ↔ Person 혼용 | app_user 단일(Person 부재) | 분리 신규(§5.2) |
| Delegation ↔ Impersonation 혼용 | Delegation 도메인 부재·Impersonation은 member session(`UserAdmin.php:472`) | 개념 분리 신규. Impersonation은 Original Principal 보존 보강 |
| Original Principal / Effective Actor 누락 | member impersonation `_impersonated` payload만·이중보존 부재 | **신규 보존 필드**(§5.1) |
| Service/System Actor Human Mapping | `apikey:{id}`·`'system'`·`'admin'` 표기 혼재 | Actor Type Registry로 명확 분류(사람-승인자 기록 방지) |
| Session 없는 Approval Token | 승인은 세션/api_key 기반이나 **Alerting은 헤더 actor**(`Alerting.php:33-36`) | ★위험. session↔command 결합으로 대체 |
| Command ↔ Session/MFA 미결합 | 결합 부재(`Alerting.php:572-665`) | 신규 Authentication Binding·commit revalidation |
| Device 문자열만 저장 | Device 개념 부재 | 신규(fingerprint digest·원문 금지) |
| Token/OTP/API Key 원문 | api_key sha256·OTP bcrypt·복구 sha256·client_secret Crypto = 준수 / ★`user_session.token` 평문(`:969`)·`mfa_secret` 평문(`:3421,3771`) = 위반 | 2건 위반 교정(세션토큰 해시화·mfa_secret Crypto) |
| Revocation 미반영 | revocation 실재(logout/revoke-others/deprovision) | 승인 commit-time에 revocation 재검증 결합 신규 |
| Disabled/Terminated Decision 허용 | is_active 게이트만(login 시)·commit 시점 재검증 부재 | Commit-time Revalidation 신규 |
| Support/Impersonation 승인 허용 | member impersonation이 승인 구별 없음 | Impersonation 승인 기본금지 신규 |
| Cross-Tenant Session / Cross-Client Token | tenant 강제 주입(`index.php:590-600`)·X-Act-As-Tenant 단일값 제한 | **양호**(위조 차단 실재). 신규는 이를 승인 binding에 결합 |
| Client-side Actor Claim 신뢰 | ★`Alerting.php:33-36` 헤더 actor 신뢰 | §62 Static Lint·§63 Guard로 차단 |
| 과거 Snapshot 없음 / Evidence 없음 / Reconciliation 없음 | 전부 부재(승인=문자열 actor) | 신규 Snapshot/Evidence/Reconciliation |
| 고객설정 Revalidation 제거 | 해당 설정 부재 | §5.12 비활성불가 명문화 |

## 2. 통합 결론

- **중복 신원/세션 엔진 난립 = 거의 없음**(User·Session·api_key 각 단일 SoT). 위험은 "중복"이 아니라 ①승인경로가 canonical actor(`Mapping::actorId`)를 **일관 사용 안 함**(Alerting 헤더 actor) ②세션↔decision 미결합·commit 재검증 부재 ③Original Principal 미보존 ④평문 저장 2건.
- **통합 방향**: Principal Registry/Canonical Subject Binding/Authentication Session/Device Registry **각 단일 정본**을 app_user·user_session·api_key **위에 상위 표준화**(source 테이블 KEEP·Adapter). 신규 Registry가 기존을 대체(Replace)하지 않고 확장(Extend). Canonical actor 정본=`Mapping::actorId` 전 승인경로 강제(Alerting 교체).
- **무후퇴 예외(=개선)**: `user_session.token` 해시화·`mfa_secret` Crypto 암호화·Alerting actor를 authedUser로 교체는 기능 후퇴 아닌 보안 강화. 단 실 구현은 선행 Decision Core 신설 + 별도 배포승인.

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
