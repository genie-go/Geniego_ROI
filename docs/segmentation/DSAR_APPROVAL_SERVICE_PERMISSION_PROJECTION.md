# DSAR — Service Permission Projection 승인 (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Permission Projection · 스펙 §16)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(ADR D-2) · 외부 벤더 자격증명 ≠ 내부 identity(ADR D-3) · 반날조(모든 `file:line`은 상위 ADR·ground-truth 2문서에서만 인용 — 없으면 ABSENT)

---

## 1. 목적

스펙 §16 Service Permission Projection은 비인간 주체(Service/System/Machine/API Client/Integration/AI Agent 등)에 대해 **Static Permission · Runtime Permission · Dynamic Permission · Service Scope** 4축을 판정 시점의 투영값으로 산출하는 계층이다. EXISTING_IMPLEMENTATION §1·§10이 명시하는 api_key의 `role`(4단계 rank)+`scopes_json`(화이트리스트)이 4축 중 Static Permission/Service Scope에 가장 근접한 substrate다. Runtime Permission·Dynamic Permission은 근접 substrate가 grep 0이다.

## 2. Canonical 필드

| # | 필드 | 의미 |
|---|---|---|
| 1 | projection id | Service Permission Projection 식별자 |
| 2 | service identity id | 투영 대상(비인간 주체) |
| 3 | projection axis | 아래 §3 열거형 |
| 4 | computed value | 투영 산출값 |
| 5 | computed at | 산출 시각 |
| 6 | source credential / scope | 이 투영을 발생시킨 api_key role/scope 참조 |

## 3. 열거형 / 타입

**Projection Axis**(스펙 §16 원문): `STATIC_PERMISSION` · `RUNTIME_PERMISSION` · `DYNAMIC_PERMISSION` · `SERVICE_SCOPE`

## 4. 실 substrate 매핑 (PARTIAL/ABSENT — api_key role+scope가 정적 축에만 근접)

| Projection Axis | 근접 substrate | file:line | 판정 |
|---|---|---|---|
| STATIC_PERMISSION | `api_key.role`(4단계 rank: viewer < connector < analyst < admin) — 생성 시 role 화이트리스트 검증 | `Db.php:942-958`·`Keys.php:81-133,95` | **근접(정적 부여값)** — 생성 시 1회 지정, 이후 요청마다 재계산되는 투영이 아니라 DB 컬럼값 그대로 읽음 |
| SERVICE_SCOPE | `api_key.scopes_json`(화이트리스트: `write:*`/`write:ingest`/`admin:keys` 등) | `Keys.php:99-114,201-210` | **근접(정적 부여값)** — role과 동일하게 생성 시 스냅샷, Context에 따른 재산정 없음 |
| RUNTIME_PERMISSION | 없음 — index.php 인증 게이트(`index.php:477-622`)는 role/scope를 **읽어서 매 요청 게이트 판정**(§572-598)에 쓰지만, 이는 "권한을 매 요청 재산출"하는 Runtime Permission 계층이 아니라 정적 role/scope에 대한 단순 조회+비교다 | `index.php:572-598` | **ABSENT(Runtime Permission 계층 자체 부재)** — 근접값은 있으나 §16이 요구하는 "Static과 구분되는 Runtime 산출 로직"은 grep 0 |
| DYNAMIC_PERMISSION | 없음 — 이번 ground-truth 2편에 비인간 주체 대상 Context/Risk 기반 permission 산출 로직 인용 없음 | — | **ABSENT** |

**경계 보존**: `channel_credential`(ChannelCreds.php:252 등)·`connector_token`(Connectors.php:154-177)은 자격증명 저장소이지 Permission Projection이 아니다(ADR D-1 INTEGRATION_CREDENTIAL 분류·오흡수 금지).

## 5. 설계 원칙

- ★4축 중 **STATIC_PERMISSION·SERVICE_SCOPE 2축만** api_key role/scope로 근접하며, 이마저도 "생성 시 1회 스냅샷"이지 스펙이 의도하는 "투영(매 판정 시점 재산출)"이 아니다 — RUNTIME_PERMISSION·DYNAMIC_PERMISSION은 완전 ABSENT. 4축을 동등한 성숙도로 서술하지 않는다(실재 과신 금지).
- `index.php:572-598`의 RBAC rank+scope 비교를 "Runtime Permission 산출"로 오판하지 않는다 — 이는 정적 role/scope 값에 대한 게이트 조회일 뿐, Projection이 산출하는 별도 값이 아니다.
- 신설 시 api_key role/scope를 Static Permission/Service Scope의 입력 소스로 재사용하고(병렬 신규 조회 경로 신설 금지), Runtime/Dynamic Permission은 §22 Runtime Authorization(별편)·§17 Effective Service Permission(별편) 설계가 선행된 후에만 값이 채워질 수 있다.
- Service/System/Machine 내부 identity(api_key 외)가 ABSENT(EXISTING_IMPLEMENTATION §2)인 이상, api_key 이외 비인간 주체(cron/batch/AI Agent)에 대해서는 Permission Projection의 입력값 자체가 없다 — cron=시스템 공유 자격증명(`Db.php:122-123`), agent_mode=인간 설정(`UserAuth.php:1741-1749`)이므로 이들을 Service Permission Projection 대상으로 오등록 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- 4축 중 STATIC_PERMISSION·SERVICE_SCOPE만 정적 스냅샷 근접, RUNTIME_PERMISSION·DYNAMIC_PERMISSION은 완전 ABSENT.
- Projection 자체(매 판정 시점 재산출·영속화)는 순신규(ADR §3).
- 실 구현 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실구현 후 별도 승인세션(RP-002). 본 편 코드 0 · NOT_CERTIFIED.
