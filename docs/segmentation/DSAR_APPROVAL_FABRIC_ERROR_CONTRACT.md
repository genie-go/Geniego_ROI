# DSAR — Unified Authorization Fabric Error Contract (Part 3-16 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — 패브릭 장애를 호출자에게 알리는 7종 에러코드

Error Contract(§28)는 authz 패브릭의 **비가역/차단성 장애**를 표준 에러코드·HTTP 상태로 노출한다. 전부 fail-closed(장애=요청 거부)이며 재시도 정책을 명시한다. 7종:

| 에러코드 | 발생원 | HTTP | 재시도 |
|----------|--------|------|--------|
| `FABRIC_SYNC_FAILED` | 정책 동기화 실패 | 503 | 백오프 후 가능 |
| `REGION_UNAVAILABLE` | 대상 리전 판정 불가 | 503 | failover 후 |
| `PDP_CLUSTER_DOWN` | PDP 클러스터 정족수 상실 | 503 | 불가(수동복구) |
| `CACHE_VERSION_CONFLICT` | 캐시 버전 불일치 판정 거부 | 409 | 재조회 후 |
| `POLICY_DISTRIBUTION_FAILED` | 정책 배포 파이프라인 실패 | 500 | 배포 재시도 |
| `ROUTING_FAILURE` | 요청→PDP 라우팅 실패 | 502 | 불가 |
| `CONTROL_PLANE_UNAVAILABLE` | Control Plane 접근 불가 | 503 | 백오프 후 |

## 2. Substrate 매핑 — 현 라이브 에러 표면과의 대비

| Fabric 에러 요구 | 현 라이브 substrate | 실체 판정 |
|------------------|--------------------|-----------|
| 인증/인가 거부 에러 | in-process RBAC 401/403 `index.php:69-622`·`:583-598` | PRESENT(단일노드 authz 거부·패브릭 장애 아님) |
| DB 연결 실패 폴백 | `backend/src/Db.php:116-166`(MySQL→SQLite 투명 폴백) | PRESENT(단일 DB 폴백·리전 failover 아님) |
| 헬스 실패 신호 | `backend/src/Handlers/Health.php:13-26` | PRESENT(단일노드 헬스) |
| 감사 무결성 실패 | `backend/src/SecurityAudit.php:35-40`(`verify()`) | PRESENT(단일 체인) |
| 7종 패브릭 에러 발생원 | — | **ABSENT(패브릭 부재 → 발생 불가능)** |

현 시스템의 장애 표면은 전부 단일 프로세스/단일 DB 범주다. `Db.php:116-166`의 MySQL→SQLite 폴백은 "리전 failover"처럼 보이나 실제로는 한 노드 내부의 스토리지 폴백이므로 `REGION_UNAVAILABLE`의 substrate가 아니다.

## 3. 설계 계약 — 신설 시 준수할 불변식

- **전부 신규 코드**: 7종 에러코드는 현 코드베이스 어디에도 emit되지 않는다. 발생원(정책 동기화·리전·PDP 클러스터·캐시 버전·배포 파이프라인·패브릭 라우팅·Control Plane)이 전부 ABSENT이므로 에러도 논리적으로 발생 불가.
- **Fail-closed 일관성**: 모든 7종은 판정을 반환하지 못할 때 `deny`로 귀결해야 한다. 현 authz의 fail-secure 관성(`index.php:583-598` 쓰기 게이트)과 정합. 장애 시 open(허용) 폴백은 절대 금지.
- **관측 가능성**: 각 에러는 `SecurityAudit.php:35-40` append-only 체인에 correlation id와 함께 기록되어야 사후 추적 가능. verify() 외 장식 체인 신설 금지.
- **HTTP 매핑 안정성**: 503(일시)·409(충돌)·502(라우팅)·500(배포)의 구분은 호출자 재시도 로직의 계약이므로, 구현 시 이 매핑을 변경하면 클라이언트 회귀. 계약 확정 후 불변.

## 4. 판정

**ABSENT (순신설).** Error Contract 7종(`FABRIC_SYNC_FAILED`·`REGION_UNAVAILABLE`·`PDP_CLUSTER_DOWN`·`CACHE_VERSION_CONFLICT`·`POLICY_DISTRIBUTION_FAILED`·`ROUTING_FAILURE`·`CONTROL_PLANE_UNAVAILABLE`)은 전부 신규 에러코드이며, 발생원인 분산 authz 패브릭이 없어 emit될 수 없다. 현 장애 표면(단일노드 RBAC 거부 `index.php:69-622`, DB 폴백 `Db.php:116-166`, 헬스 `Health.php:13-26`)은 패브릭 장애와 범주가 다르며 substrate로 인정 불가. 실 구현은 패브릭 컴포넌트 신설 후 별도 세션(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
