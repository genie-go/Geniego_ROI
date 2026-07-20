# DSAR — Approval Mesh Governance Routing (Part 3-24 §2·§16)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §16 Governance Routing)
`APPROVAL_MESH_ROUTE`는 인가 판단 요청을 **적절한 거버넌스 노드로 라우팅**하는 계층이다. 5종 라우트 축:
- **Region Route** — 지역·데이터 잔류 기반.
- **Tenant Route** — 테넌트별 정책노드.
- **Policy Route** — 정책 도메인별.
- **Context Route** — 컨텍스트(위험/규제)별.
- **Decision Route** — 결정 등급(로컬/에스컬레이션)별.

라우팅 목표함수 4종: **Latency·Availability·Trust·Compliance**(+Cost). governance routing은 mesh control-plane 결정라우팅이지 HTTP URL 라우팅이 아니다.

## 2. Substrate 매핑
| Mesh Route 축 | 현행 substrate | file:line | 관계 |
|---|---|---|---|
| Tenant Route(소스) | 테넌트 경계 파생 | `Db.php:519-527` | 테넌트 라우팅 키 소스(라우터 아님) |
| Decision 에스컬레이션 | 로컬 권한 평가 | `TeamPermissions.php:704-711` | 로컬/에스컬레이션 분기 시드 |
| Compliance 라우팅 | 에이전시 대행 경계 | `AgencyPortal.php:86-89` | cross-org compliance 경계 |
| 감사 라우트 | 해시체인 원장 | `SecurityAudit.php:27` | 라우팅 결정 감사 sink |

## 3. 설계 계약
1. **목표함수 명시** — 각 라우팅 결정은 Latency/Availability/Trust/Compliance 가중을 명시. 임의 라우팅 금지.
2. **Compliance 우선** — 데이터 잔류·규제 제약은 다른 목표(latency 등)에 우선. compliant 노드 부재 시 deny(우회 라우팅 금지).
3. **Decision Route 상한** — 로컬 결정 가능 등급만 로컬 라우팅; 고위험/high-value는 중앙 에스컬레이션 강제(`TeamPermissions.php:704-711` 분기 확장).
4. **테넌트 격리 라우팅** — 테넌트 라우팅 키(`Db.php:519-527`)로 cross-tenant 노드 혼선 방지.
5. **감사** — 모든 라우팅 결정은 `SecurityAudit.php:27` 대상 기록.

## 4. KEEP_SEPARATE
- **HTTP 정적 라우트(`routes.php:759-764`·`:3756`)** = URL→핸들러 정적 매핑이지 governance 결정 라우팅 아님.
- **Menu-tree(`routes.php:1512-1523`)** = 프론트 메뉴 위계이지 mesh routing 아님.
- **ChannelSync(`ChannelSync.php:12`,`:19`)·GraphScore(`GraphScore.php:19`)·SSE(`PM/Events.php:50`)** = 마케팅 sync·그래프·이벤트 스트림이지 policy/라우팅 아님.

## 5. 판정
**ABSENT — greenfield.** governance routing grep 0. HTTP 정적 라우트(`routes.php:759-764`·`:3756`)·menu-tree(`:1512-1523`)는 mesh routing이 **아니다**(KEEP_SEPARATE). Region/Tenant/Policy/Context/Decision 라우팅+목표함수 계층은 **순신설**. NOT_CERTIFIED. 코드 변경 0.
