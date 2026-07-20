# DSAR — Service Runtime Guard (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Runtime Guard)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role(Part 3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · 외부 벤더 자격증명 내부 identity 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차·279차 재플래그 금지

---

## 1. 목적

§30(Runtime Guard)은 비인간 identity의 **매 요청 시점** 발동 차단 목록이다: **Expired Secret · Expired Certificate · Unknown Identity · Revoked Client · Invalid Runtime · Invalid Role**(6종). ★ADR/GROUND_TRUTH가 확정한 대로, Service Identity Registry·Trust Level·Certificate Governance·Runtime Authorization은 이 저장소에 **순신규(ABSENT, grep 0)**다. 가장 근접한 실 substrate는 **api_key 인증 게이트**(`index.php:477-622`) — sha256 조회+`is_active`(`:502-508`)·만료(`:518-520`)·레이트리밋(`:527-570`)·RBAC rank+scope(`:572-598`)이며, 이는 **비인간 identity 전 스펙트럼(Service/System/Machine/AI Agent/Integration)이 아니라 api_key 단일 substrate에 한정된 이진 게이트**다(ADR D-2 "현행 api_key expires_at/is_active 게이트가 Runtime Guard 근접 substrate이나 강제 TTL·cert guard 없음"). 본 문서는 6개 차단 항목 각각을 실 substrate와 대조해 PARTIAL/ABSENT를 정직 판정한다.

## 2. Canonical 필드

- **Guard ID** — §30 6종 중 1
- **Trigger Condition** — 차단 발동 조건(§30 원문)
- **Related Error Code** — §32 대응 코드([[DSAR_APPROVAL_SERVICE_ERROR_WARNING_CONTRACT]])
- **Enforcement Point** — Read-time(Runtime Access) / Write-time(Credential 생성·회전)
- **현재 substrate** — file:line(없으면 ABSENT)

## 3. 열거형 / 타입

§30 Runtime Guard 6종(원문 그대로): `EXPIRED_SECRET_BLOCKED` · `EXPIRED_CERTIFICATE_BLOCKED` · `UNKNOWN_IDENTITY_BLOCKED` · `REVOKED_CLIENT_BLOCKED` · `INVALID_RUNTIME_BLOCKED` · `INVALID_ROLE_BLOCKED`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §30 차단 항목 | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Expired Secret 차단 | **PARTIAL(근접·불충분)** | api_key `expires_at` 만료 검사(`index.php:518-520`)가 유일한 실 게이트 — 단 강제 max TTL 없음(생성 시 클라 지정, ADR D-2·EXISTING §4). channel_credential/connector_token/mfa_secret 등 나머지 Crypto 암호화 credential(EXISTING §3 표)은 만료 필드·게이트 자체가 이 인용 범위에서 확인되지 않음(오분류 금지·해당 substrate=api_key 한정) |
| 2 | Expired Certificate 차단 | **ABSENT(순신규)** | Certificate Governance 완전 부재(`cert_expires` grep 0·EXISTING §5) — SAML sig 검증(`EnterpriseAuth.php:268`)·OIDC JWKS 소비(`:522-531`)는 **발급/검증만**이지 만료 추적·차단 게이트가 아님 |
| 3 | Unknown Identity 차단 | **PARTIAL(근접)** | api_key sha256 조회 실패 시 게이트 거부(`index.php:502-508`)가 "식별 불가 identity" 요청을 이진 차단하는 근접 substrate — 단 Trust Level(Unknown~Critical)·Runtime Authentication(Valid/Expired/Revoked/Unknown) 통합 열거형 자체가 grep 0(EXISTING §9)이라 "Unknown" 전용 상태 판정이 아니라 범용 인증 실패 |
| 4 | Revoked Client 차단 | **PARTIAL(근접·실재)** | revoke(`Keys.php:135-148` `is_active=0`)+게이트 `is_active` 검사(`index.php:502-508`)가 기능적으로 실 차단 — 단 api_key(연결 role='connector' 근접, ADR §Integration Identity)에만 적용, Service/System/Machine/AI Agent/Integration 전용 Client 등록 자체가 ABSENT(EXISTING §2·§7)이라 "Client" 개념 전체가 api_key로 축소됨 |
| 5 | Invalid Runtime 차단 | **ABSENT(순신규)** | Runtime Context/Trust 개념 자체가 이 저장소에 없음(ADR §거버넌스 계층 완전 부재·EXISTING §9 grep 0). SystemMetrics unknown/critical(`:376,393,397-417`)은 cron 잡 상태 모니터링이지 identity 신뢰등급과 무관(오탐 배제, EXISTING §9) |
| 6 | Invalid Role 차단 | **PARTIAL(근접·범위 협소)** | index.php RBAC rank+scope 게이트(`:572-598`)가 role 부적격 요청을 이진 차단 — 단 이는 api_key `role`(4단계: viewer/connector/analyst/admin, `Db.php:942-958`) 판정이지 §7 Service Role(API/Integration/Scheduler/Worker/AI/ETL/Batch/K8s Role) 전용 판정이 아님(Service Role 자체 ABSENT, ADR §3) |

**근접 Runtime Guard substrate 정리**: api_key 인증 게이트(`index.php:477-622`) 전체가 6개 차단 항목 중 4개(Expired Secret·Unknown Identity·Revoked Client·Invalid Role)의 유일한 근접 substrate다. Expired Certificate·Invalid Runtime 2종은 대응 substrate 자체가 없다(순신규). ★이 게이트는 api_key 단일 identity type에 한정 — Service/System/Machine/AI Agent/Integration 등 나머지 13개 Identity Type(스펙 §3)은 Runtime Guard 적용 대상 자체가 존재하지 않는다(ADR §2 "이 외 내부 non-human identity=전무").

## 5. 설계 원칙

1. **api_key 게이트(`index.php:477-622`)는 확장 기반이지 Service Runtime Guard 자체가 아니다** — Canonical Runtime Guard는 이 게이트를 대체하지 않고 그 위에 Trust Level·Certificate·Runtime Context 판정 레이어로 얹는다(무후퇴, ADR D-1).
2. **UNKNOWN Permit 금지(ADR D-2)는 현행 `is_active`/`expires_at` fail-closed 판정을 전체 비인간 identity 스펙트럼으로 확장하는 것이지 재발명이 아니다** — `index.php:502-508,518-520` 패턴을 Runtime Authentication(Valid/Expired/Revoked/Unknown) 4상태 모델의 안전 기준선으로 승격.
3. **Expired Certificate·Invalid Runtime(#2·#5)은 순신규이며 근접 substrate로 오분류 금지** — Certificate Governance·Runtime Trust/Context 전부 grep 0을 그대로 정직 유지.
4. **Invalid Role Guard(#6)는 api_key `role` 4단계를 삭제·재구현하지 않고 Service Role의 attribute source로 편입** — 신규 Service Role(API/Integration/Scheduler/Worker/AI/ETL/Batch/K8s)은 api_key role 위에 추가되는 분류 레이어.
5. **외부 벤더 JWT(Google/Snowflake, `Connectors.php:3781-3815`·`DataExport.php:550-584`)는 이 Guard의 판정 대상이 아니다** — 아웃바운드 자격증명이며 내부 Runtime Guard가 통제할 내부 identity가 아니다(ADR D-3, EXISTING §2).

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 6종 전부 Canonical Service Identity Registry·Trust Level·Certificate Governance 실구현 이후에 실 Guard 발동 가능. 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core가 코드 0(설계만)이므로 Service Role↔Permission 결합 자체가 성립 불가.
- **ABSENT(순신규)**: Expired Certificate(#2)·Invalid Runtime(#5) — 대상 개념 자체가 substrate에 없음(날조 금지).
- **PARTIAL(근접·불충분)**: Expired Secret(#1)·Unknown Identity(#3)·Revoked Client(#4)·Invalid Role(#6) — api_key 게이트가 근접이나 강제 TTL·Trust Level·Service Role 전용 판정 없음.
- **판정**: NOT_CERTIFIED · 실 Guard = Canonical Service Identity Registry + Trust Level + Certificate Governance 신설 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SERVICE_STATIC_LINT]] · [[DSAR_APPROVAL_SERVICE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE]]
