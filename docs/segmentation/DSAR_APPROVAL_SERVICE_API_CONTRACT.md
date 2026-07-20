# DSAR — Service API Contract (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service API Contract)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role(Part 3-5)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Historical(과거 Secret/Certificate Version) 수정 API 금지 · 외부 벤더 자격증명 내부 identity 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차·279차 재플래그 금지

---

## 1. 목적

§34(API)는 **Service 조회 · Runtime 조회 · Secret Rotation · Certificate 조회 · Effective Permission 조회**(5종)를 정의한다. ★이 저장소에는 전용 Service Identity API 표면(`/service-identity/*`류 REST 엔드포인트) 자체가 없다 — 현행 비인간 identity 관련 API는 **api_key CRUD 2경로**(`Keys.php`·`UserAuth.php`)에 비전용으로 흩어져 있다(DUPLICATE_AUDIT D-1). 본 문서는 5개 API 항목 각각을 근접 substrate와 대조한다.

## 2. Canonical 필드

API 항목:
- **Service 조회** — Service/System/Machine Identity 목록·상세 조회
- **Runtime 조회** — Runtime Context/Trust 상태 조회
- **Secret Rotation** — Credential/Secret 회전 실행
- **Certificate 조회** — Certificate 목록·만료/trust chain 조회
- **Effective Permission 조회** — 특정 Service Identity의 실효 Permission 산출 결과 조회

## 3. 열거형 / 타입

§34 API 5종(원문 그대로): `SERVICE_READ` · `RUNTIME_READ` · `SECRET_ROTATION` · `CERTIFICATE_READ` · `EFFECTIVE_SERVICE_PERMISSION_READ`. Write API 공통요구(ADR §3·Historical 수정 금지 원칙 계승): Secret/Certificate 회전은 **과거 버전 수정 금지** — 신규 버전 추가(또는 신규 row)만 허용.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §34 API | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Service 조회 | **PARTIAL(근접·2경로 산재)** | api_key(가장 근접한 API Client Identity substrate)가 create/revoke/rotate로 조회 가능하나, **2경로 산재**: `/v421/keys`(`Keys.php:81-133`, 라우트 `routes.php:867-871,2344-2348`) vs `/auth/api-keys`(`UserAuth.php:4339-4362`, 라우트 `routes.php:1557-1560,2537-2540`)(DUPLICATE_AUDIT D-1). Service/System/Machine 전용 identity 조회 대상 자체는 ABSENT(EXISTING §2) |
| 2 | Runtime 조회 | **ABSENT** | Runtime Trust/Authentication/Context 통합 조회 API 자체가 grep 0(EXISTING §9). SystemMetrics(`:376,393,397-417`)는 cron 잡 상태 모니터링이지 identity Runtime 조회가 아님(오탐 배제) |
| 3 | Secret Rotation | **PARTIAL(실재·2경로+감사 비대칭)** | ★가장 강한 근접 substrate: api_key rotate가 **이미 동작 중인 API**(`Keys.php:150-187`·`UserAuth.php:4379`) — 단 2경로 감사 비대칭(DUPLICATE_AUDIT D-1: Keys.php 경로 감사 0건 vs UserAuth.php 경로 REAL `:4360,4375`) + 전부 **수동 HTTP**(자동/스케줄 없음, D-4). KEK rotateKek(`Crypto.php:133-148`, admin 수동 `routes.php:920`→`EnterpriseAuth.php:466-473`)도 근접이나 credential 전체가 아닌 KEK 단위 |
| 4 | Certificate 조회 | **ABSENT** | Certificate Governance 완전 부재(cert_expires grep 0·EXISTING §5). SAML `saml_idp_cert` 컬럼(`EnterpriseAuth.php:49,143,268`)은 저장·검증용이지 조회 API가 아님 |
| 5 | Effective Permission 조회 | **BLOCKED_PREREQUISITE** | ADR D-5가 명시: "선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core가 아직 설계(코드 0)라 Service Role↔Permission 결합·Effective Service Permission = BLOCKED_PREREQUISITE" — 근접 substrate조차 인용 불가(선행 자체 부재) |

## 5. 설계 원칙

1. **api_key CRUD 2경로를 전용 Service API로 승격하기 전에 먼저 단일 경로로 통합** — DUPLICATE_AUDIT D-1의 감사 비대칭을 방치한 채 신규 `/service-identity/*` 표면을 얹으면 우회 잔존(Golden Rule, ADR D-1 CONSOLIDATION).
2. **Secret Rotation(#3)은 rotate 함수를 재구현하지 않고 전용 스케줄·정책 API로 승격** — `Keys.php:150-187`/`Crypto.php:133-148` 무후퇴, 그 위에 Rotation Policy API 신설.
3. **Service/Runtime/Certificate 조회(#1·#2·#4)는 순신규, 근접 substrate로 오분류 금지** — api_key 조회를 Service Identity 전체 조회의 대체 근거로 사용하지 않는다(EXISTING §2 "내부 non-human identity=전무" 확정).
4. **Effective Permission 조회(#5)는 Permission Engine(Part 2) 실구현 없이는 설계조차 착수 불가** — BLOCKED_PREREQUISITE를 다른 항목처럼 ABSENT/PARTIAL로 완화 판정하지 않는다(ADR D-5 원문 그대로).
5. **Historical 수정 금지 원칙은 Secret/Certificate Rotation API 신설 시 최우선 강제** — api_key rotate가 이미 "기존 row `is_active=0`+신규 생성"(파괴적 UPDATE 아님, `Keys.php:150-187`)이므로 이 패턴을 Certificate/Vault Reference 등 신규 credential type에도 그대로 계승.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Service 조회(#1)·Runtime 조회(#2)·Certificate 조회(#4)는 Canonical Service Identity Registry+Certificate Governance 실구현 이후. Effective Permission 조회(#5)는 Permission Engine(Part 2) 자체가 선행 부재.
- **PARTIAL(근접·불충분)**: Service 조회(#1, 2경로 산재)·Secret Rotation(#3, 실재하나 2경로+수동+감사 비대칭).
- **ABSENT(순신규)**: Runtime 조회(#2)·Certificate 조회(#4).
- **판정**: NOT_CERTIFIED · 실 API = Canonical Service Identity Registry/Trust/Certificate 신설 + api_key 2경로 통합 + 전용 `/service-identity/*` 표면 구축 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SERVICE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_SERVICE_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT]] · [[ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE]]
