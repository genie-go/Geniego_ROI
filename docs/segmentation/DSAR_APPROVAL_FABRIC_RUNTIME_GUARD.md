# DSAR — Unified Authorization Fabric Runtime Guard (Part 3-16 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — Runtime Guard가 실행시점에 차단해야 할 6종

Unified Authorization Fabric은 다중 리전·다중 PDP 노드·중앙 Control Plane으로 정책을 분산 배포하는 authz 패브릭을 전제한다. Runtime Guard(§26)는 이 패브릭의 **실행시점(request-time) 방어선**으로, 아래 6종의 위험 상태에서 요청을 fail-closed 차단해야 한다.

| 코드 | 차단 대상 | Fail 방향 |
|------|-----------|-----------|
| `UNAUTHORIZED_DISTRIBUTION` | 서명/승인 없는 정책 번들이 노드로 유입 | 배포 거부 |
| `FABRIC_SPLIT_BRAIN` | 두 Control Plane이 동시에 권위 주장(분열) | 쓰기 동결 |
| `POLICY_VERSION_CONFLICT` | 노드 간 정책 버전 불일치로 판정 상이 | 요청 차단 |
| `CACHE_POISONING` | 로컬 PDP 캐시가 위조/오염된 판정 반환 | 캐시 무효화·재조회 |
| `CLUSTER_DRIFT` | 클러스터 멤버 구성/설정 표류 | 신규 트래픽 격리 |
| `ROUTING_LOOP` | 요청이 노드 사이를 순환 라우팅 | 루프 절단 |

## 2. Substrate 매핑 — 현 라이브에서 "가드처럼 보이는 것"의 정체

| Fabric Guard 요구 | 현 라이브 substrate | 실체 판정 |
|-------------------|--------------------|-----------|
| 실행시점 PEP(정책 집행점) | in-process 미들웨어 `backend/public/index.php:69-622` | PRESENT(단일 프로세스 RBAC·패브릭 아님) |
| 쓰기 권한 게이트 | 쓰기 메서드 role/scope 검사 `index.php:583-598` | PRESENT(단일노드) |
| PDP(정책 판정) | `backend/src/Handlers/TeamPermissions.php:695-701` | PRESENT(in-process 함수 호출) |
| 테넌트 격리 | `index.php:614-619` | PRESENT(단일 baseline·분산 아님) |
| 분산 배포/서명 가드 | — | **ABSENT** |
| Split-Brain/버전충돌/캐시오염/드리프트/루프 가드 | — | **ABSENT** |

현 authz는 단일 PHP/MySQL 모놀리스 안의 in-process PEP+PDP다. "런타임 가드"라 부를 수 있는 것은 `index.php:69-622`의 요청별 RBAC 검사와 `:583-598`의 쓰기 게이트뿐이며, 이는 **단일 노드 내부 방어**이지 패브릭(다중 노드·다중 리전) 방어가 아니다. 6종 위험은 분산 패브릭이 존재해야 발생하는데, 그 패브릭 자체가 없다.

## 3. 설계 계약 — 신설 시 준수할 불변식

- **Fail-closed 원칙**: 6종 중 어느 위험이든 판정 불확실(Unknown)이면 `deny`. 현 in-process 게이트의 fail-secure 관성(`index.php:583-598`)을 패브릭 층으로 승격·확장하되 대체하지 않는다(Golden Rule: Extend).
- **정책 번들 무결성**: Unauthorized Distribution 차단은 배포 번들의 서명 검증을 전제한다. 감사 append-only 체인의 유일 실 정본은 `backend/src/SecurityAudit.php:35-40`(`verify()`)이며, 배포 이벤트는 이 체인에 기록되어야 tamper-evident. 장식용 해시체인 재도입 금지.
- **버전 단조성**: Policy Version Conflict 가드는 정책 버전이 노드 전역에서 단조 증가함을 요구. 현 시스템에 정책 버전 개념 자체가 ABSENT이므로 선행 버전 레지스트리가 없으면 이 가드는 판정 불가.
- **캐시 신뢰경계**: Cache Poisoning 가드는 PDP 판정을 캐시 이전에 서명하고 조회 시 재검증. 현 in-process PDP는 캐시 계층 없이 매 요청 직접 호출(`TeamPermissions.php:695-701`)이므로 오염 표면이 아직 없음 = 가드 발생원도 없음.

## 4. 판정

**ABSENT (순신설).** Fabric Runtime Guard 6종은 전부 미존재. 현 라이브의 유일한 런타임 가드는 in-process RBAC 미들웨어(`index.php:69-622`)와 쓰기 게이트(`index.php:583-598`)이며, 이는 단일노드 방어로 패브릭 6종 위험(분산 배포·Split-Brain·버전충돌·캐시오염·드리프트·루프)을 다루지 못한다. 6종 위험은 분산 authz 패브릭의 **선행 존재를 전제**(BLOCKED_PREREQUISITE)하므로, 패브릭 미구축 상태에서 Guard 단독 구현은 불가. 실 구현은 Control Plane·PDP 클러스터·정책 배포 채널 신설 후 별도 승인 세션에서. 코드 변경 0 · NOT_CERTIFIED.
