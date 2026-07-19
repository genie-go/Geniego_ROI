# DSAR — Approval Role API Contract (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

§62의 **Role Registry API 계약**을 정의한다. Registry/Definition/Permission Mapping/Owner/Snapshot/Evidence를 관리하는 관리·조회·시뮬레이션 API의 그룹·공통 규약·불변(수정 금지 표면)을 명세한다. 실 엔드포인트는 본 저장소의 라우팅 컨벤션(`/api/...`·`/v{NNN}/...` 이중 shape·`routes.php` 문자열 매핑)에 정합해야 하며, **본 차수 코드 0**(설계 계약만).

## 2. 열거 / 항목

### 2.1 API 그룹 (8)

| 그룹 | 책임 |
|---|---|
| **Registry** | Registry 컨테이너 등록/조회/Lifecycle 전이 |
| **Namespace** | Namespace 등록/조회(`{DOMAIN}:{FUNCTION}:{ROLE}` 예약) |
| **Definition** | Role Definition CRUD(신규 Version 발행·In-place Update 금지) |
| **Permission (Mapping)** | Role→Permission Version Mapping 조회/발행(BLOCKED·Part 2 결합) |
| **Scope · Eligibility** | Scope Requirement·Actor Type Eligibility 조회/검증 |
| **Owner · Review · Snapshot** | Owner 지정·Review/Certification 스케줄·Snapshot 발행(불변) |
| **Evidence · Migration** | Evidence 조회·Alias/Migration 경로(읽기·발행) |
| **Simulation** | Role 해석/Assignment 사전 시뮬레이션(부작용 없음) |

### 2.2 공통 규약

- **Auth / Authorization**: Bearer/api_key + RBAC(쓰기=analyst+/admin·keys 관리=admin:keys) — 현행 미들웨어 계승.
- **Expected Version(낙관적 동시성)**: 쓰기는 기대 Version 헤더 필수(경합 시 충돌 반환).
- **Idempotency-Key**: 발행/전이 멱등 보장.
- **Correlation ID · Causation ID**: 요청 추적·인과 체인 기록.
- **Approval Reference**: 위험 전이(Retire/Deprecate 등)는 승인 참조 필수.
- **Audit / Evidence**: 모든 쓰기는 감사 이벤트 + Evidence 생성.
- **Rate Limit**: 그룹별 레이트리밋.
- **Sensitive Redaction**: 민감 필드 응답 마스킹.
- **Server-side Enforcement**: 모든 판정 서버측 강제(FE 미러는 UX 힌트).

### 2.3 불변 (수정 금지 표면)

- **Snapshot · Evidence · Audit · Historical Version 수정 API 금지** — 조회/발행만 허용. In-place Update·과거 재작성 API 미제공(Append-only).

## 3. substrate 매핑 (§5.2)

| Canonical API 축 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| 라우팅 컨벤션(`/api`·`/v{NNN}`·routes.php) | **재사용(컨벤션)** | 상위 CLAUDE.md 라우팅 규약 · `routes.php` 문자열 매핑(신규 라우트 등록 필요) |
| Auth/Authorization 미들웨어 | **CANONICAL(계승)** | RBAC roleRank `index.php:573` · scopes `Keys.php:189-194` |
| 현행 role 관리 API(최근접) | **PARTIAL/DEPRECATED** | api_key 관리(`Keys.php`) · team_role 쓰기가드(`UserAuth.php:1134`) · **admin_roles CRUD=289차 폐기(`routes.php:1670`·`UserAdmin.php:596-599`) 재부활 금지** |
| Registry/Definition/Snapshot/Simulation API | **ABSENT → 신설** | 없음 |
| Permission Mapping API | **BLOCKED_PREREQUISITE** | Part 2 이후 |

## 4. 설계 원칙

1. **라우팅 정합 필수** — 신규 실 배선은 `/api` 접두(SPA HTML 폴백 착시 회피) 또는 최신 `/v{NNN}` 프리픽스로 등록하고 `routes.php`에 명시 매핑([[reference_api_prefix_routing]]).
2. **폐기 admin_roles API 재부활 금지** — role-mgmt API는 신설 Registry로만 제공. 289차 DORMANT 제거 역행 금지.
3. **불변 표면 봉인** — Snapshot/Evidence/Audit/Historical Version 수정 API를 애초에 제공하지 않는다(수정 불가가 계약).
4. **Server-side Enforcement** — FE `teamRolePolicy.js`·`AuthContext.jsx` 미러는 UX 힌트일 뿐 판정은 서버(무후퇴·기존 서버가드 삭제 금지).
5. **Expected Version + Idempotency** — 정의 발행은 낙관적 동시성·멱등으로 In-place/중복 발행 방지.

## 5. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Permission Mapping API는 Part 2 Permission Engine 이후.
- **Gap(순신규)**: Registry/Namespace/Definition/Scope·Eligibility/Owner·Review·Snapshot/Evidence·Migration/Simulation API 전무.
- **PARTIAL/DEPRECATED**: api_key·team_role 관리 API가 부분 존재하나 Registry 통합 API 아님 · admin_roles API=폐기(재부활 금지).
- **판정**: NOT_CERTIFIED · 실 API = Registry 신설 + Part 2 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_ROLE_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]]
