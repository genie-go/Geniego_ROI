# DSAR — Approval Mesh Node (Part 3-24 §2·§5·§8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC §2·§5·§8)

`APPROVAL_MESH_NODE`는 Mesh의 **정책 결정 실행 단위(PDP node)** 다. 계약상 역할:

- Registry(§DSAR_REGISTRY)가 배포한 정책 epoch를 로컬로 소비하여, 요청별 authorization 결정을 내린다(§5 결정 실행).
- 자신의 identity·health·현재 epoch를 Registry에 보고하고, join/leave 라이프사이클을 따른다(§2 membership).
- 결정 이력을 append-only 감사 기저에 기록한다(§8 감사 연동).

노드는 정책의 **소비자**이자 결정의 **생산자**이며, 정책 세대의 권위는 갖지 않는다(그 권위는 Registry).

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| 계약 요소 | 라이브 substrate | 판정 | 근거(허용목록) |
|---|---|---|---|
| 노드 레지스트리(복수 노드 membership) | 없음 | **ABSENT** | grep 0 — 단일 노드/단일 PDO(`Db.php:63-87`) |
| 로컬 PDP(정책 결정 지점) | 존재(단일프로세스) | **PARTIAL** | `TeamPermissions.php:695-700`·`:704-711`·`:707` — 노드화 대상 |
| 미들웨어 authz 게이트 | 존재(단일 진입점) | **PARTIAL** | `index.php:116-121`·`:157-437`(단일 프로세스 인가 미들웨어) |
| 노드 identity/health 보고 채널 | 없음 | **ABSENT** | `composer.json:6-13` 분산 런타임 의존 전무 |
| 결정 이력 append-only 연동 | 존재(비-mesh) | **PARTIAL** | `SecurityAudit.php:29-31`·`:38` |

라이브의 authz 결정은 단일 PHP 프로세스(`Db.php:20-21`) 안에서 `TeamPermissions`의 로컬 권한판정(`TeamPermissions.php:695-700`)과 진입점 미들웨어(`index.php:157-437`)로 이뤄진다. 이는 **노드화(node-ification)의 대상**이지, 이미 mesh 노드인 것이 아니다. 노드 레지스트리·health 프로토콜·복수 노드는 전부 부재하다.

### ★ KEEP_SEPARATE — "node" 동음이의 오흡수 금지

| 유사물 | 실체 | 근거 | 처리 |
|---|---|---|---|
| GraphScore node | 마케팅 그래프 정점(scoring) | `GraphScore.php:19`·`:22` | **KEEP_SEPARATE** — authz mesh 노드 아님 |
| Journey node | 저니 캔버스 스텝 노드 | `JourneyBuilder.php:535`·`:539-540` | **KEEP_SEPARATE** — 마케팅 워크플로우 |

두 "node"는 명칭만 동일할 뿐 authz Mesh 노드와 무관하며, 흡수·통합 대상이 아니다.

## 3. 설계 계약 (규칙)

- **R1 (정책 소비자)**: 노드는 Registry epoch를 소비만 하고 발명하지 않는다(R1↔§DSAR_REGISTRY R1).
- **R2 (기존 PDP 확장)**: 노드 PDP는 기존 `TeamPermissions` 로컬 판정(`TeamPermissions.php:695-700`)을 **확장(Extend)** 하여 도출하며, 병렬 판정 엔진을 신설하지 않는다.
- **R3 (deny-by-default)**: Registry/정책 미도달 시 노드는 거부 우선 판정. Unknown≠Allowed.
- **R4 (감사 필수)**: 모든 노드 결정은 기존 append-only 해시체인 계약(`SecurityAudit.php:29-31`·`:50`·`:63-64`)으로 기록.
- **R5 (테넌트 경계)**: 노드는 요청 시점의 테넌트 해석을 고정하며, 크로스테넌트 결정 하이재킹을 금지한다.

## 4. KEEP_SEPARATE

§2 표 기재대로 GraphScore node(`GraphScore.php:19`·`:22`)·Journey node(`JourneyBuilder.php:535`)는 마케팅 도메인 정점/스텝으로 **분리 유지**. authz mesh 노드 계약과 병합 금지.

## 5. 판정 (NOT_CERTIFIED)

`APPROVAL_MESH_NODE`는 **ABSENT-greenfield(node registry 없음)** — 순신설. 라이브 단일노드 PDP(`TeamPermissions.php:695-700`)·진입점 미들웨어(`index.php:157-437`)는 노드화 대상이지 mesh 노드가 아니다. GraphScore/Journey "node"는 동음이의 → **PRESENT 오판 금지**. 코드 변경 0 · **BLOCKED_PREREQUISITE · NOT_CERTIFIED**.
