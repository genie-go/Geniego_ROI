# DSAR — Client Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-4)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **스펙 근거**: [`EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC.md) §24 Client Scope(Browser · Mobile · API Client · Service Client)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실구현 후 별도 승인세션.
- **불변**: Default Intersection(§9 Scope Policy 기본) · envLabel≠Scope(배포라벨을 데이터 scope로 오분류 금지) · 반날조(부재 날조·실재 과신 양방향 금지) · 289차 P1~P4 재플래그 금지.

---

## 1. 목적

**호출 클라이언트 유형(Browser/Mobile/API Client/Service Client) 단위 접근범위**를 정형화한다. api_key.scopes_json의 role scope(동작권한 축)는 "무엇을 할 수 있는가"를 정의하지만 "어떤 종류의 클라이언트가 호출하는가"는 별개 개념이며 현재 구분되지 않는다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `client_scope_code` | Client Scope 식별자 |
| `client_class` | BROWSER / MOBILE / API_CLIENT / SERVICE_CLIENT(§3) |
| `client_id_ref` | 클라이언트 애플리케이션 식별자 참조 |
| `client_trust_level` | 1st-party / 3rd-party / Service-to-service 신뢰수준 |

## 3. 열거형 / 타입

- **client_class**: `BROWSER` · `MOBILE` · `API_CLIENT` · `SERVICE_CLIENT`(스펙 §24 열거 그대로).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Client 유형 식별/분류 게이트 | — | **ABSENT** | grep 0 — EXISTING §7 "Client: 부재(grep 0)" |
| api_key role scope(별개 개념 — 오분류 방지) | `api_key.scopes_json` | **NOT_SCOPE(별개 축·근접 아님)** | EXISTING §7 "api_key role scope와 다른 개념" · `Keys.php:189-210` |

★api_key의 role scope(`read:*`/`write:*`/`admin:keys` 등)는 "이 키로 무엇을 할 수 있는가"(동작권한)를 정의하며, "이 호출이 브라우저에서 왔는지 서비스간 호출인지"(클라이언트 유형)는 별개 축이다. 같은 api_key라도 브라우저 프록시 경유와 서버간 직접 호출은 클라이언트 유형이 다를 수 있으므로, api_key scope를 Client Scope의 근접 substrate로 흡수하면 오분류다(EXISTING §7 명시 구분).

## 5. 설계 원칙

- Client Scope는 api_key scope(동작권한)와 물리적으로 분리된 신규 축 — 인증 컨텍스트에 client_class 속성을 추가하는 형태로 설계(Golden Rule: 기존 인증 미들웨어 확장, 별도 병렬 인증경로 신설 금지).
- Service Client(서비스간 호출)는 향후 mTLS/서비스 계정(SERVICE_ACCOUNT_GRANT — Part 2 substrate 존재)과 결합 가능 — 단 이번 Part는 Reference 설계만.
- Browser vs Mobile 구분은 User-Agent 자기신고에 의존할 수밖에 없어 신뢰수준이 낮음(Device Scope와 동일한 spoof 한계) — 고신뢰 판정은 API Client/Service Client(키 기반) 우선 적용.

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 전 필드 순신규 ABSENT — 클라이언트 유형 식별/분류 게이트 전무. api_key role scope는 별개 축으로 오분류 배제.
- **BLOCKED_PREREQUISITE**: Canonical Scope Registry 통합 및 선행 Permission/Role 계열(특히 Part 2 Service Account Grant) 실구현 후 — **RP-002**.
- 289차 P1~P4 재플래그 금지.
