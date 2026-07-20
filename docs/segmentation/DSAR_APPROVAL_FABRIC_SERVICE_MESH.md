# DSAR — Service Mesh Integration (Part 3-16 §10)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Service Mesh Integration(§10)은 Unified Authorization Fabric의 결정을 서비스 메시 데이터 평면에 위임·통합하는 계약이다. 계약 요소:

- **Mesh Provider 통합**: Istio/Linkerd/Kuma/Envoy 등 메시와 authz 정책 연동.
- **Sidecar Enforcement**: 사이드카 프록시가 요청 경로에서 authz 결정을 강제.
- **Gateway Enforcement**: 메시 게이트웨이에서 진입 authz 강제.
- **Policy Push**: fabric 정책을 메시 제어 평면으로 배포(§14 Policy Distribution 연계).

## 2. Substrate 매핑 (라이브 실측)

| Fabric 계약 요소 | 라이브 substrate | 상태 |
|---|---|---|
| Mesh provider 연동 | 없음 — grep 0·mesh 실 config 없음 | **ABSENT** |
| Sidecar enforcement | 없음 — 현 authz는 in-process 미들웨어 `index.php:69-622` | **ABSENT** |
| Gateway enforcement | 없음 — 단일 `$app` 진입 `index.php:69-622` | **ABSENT** |
| Envoy/Istio/Linkerd/Kuma 의존 | 없음 — `composer.json:5-13` mesh 의존 전무 | **ABSENT** |
| Policy push to mesh | 없음 — §14 Policy Distribution도 ABSENT | **ABSENT** |

## 3. 설계 계약 (순신설 — 코드 0)

mesh integration plane을 신규 도입한다. fabric은 authz 결정을 사이드카/게이트웨이 강제 지점에 위임할 수 있는 정책 표현(외부화 가능한 결정 계약)을 정의하고, mesh adapter가 Istio/Linkerd/Kuma/Envoy 제어 평면으로 정책을 push한다. 현 in-process 강제(`index.php:69-622`)는 mesh 미도입/미강제 경로의 fail-secure fallback으로 보존한다(메시 강제 실패 시에도 최종 거부 계약 유지).

## 4. ★KEEP_SEPARATE — 오판 금지

- 현 authz 강제는 사이드카/프록시가 아니라 애플리케이션 in-process 미들웨어(`index.php:69-622`)이다 — sidecar/gateway enforcement의 PRESENT 근거로 오용 금지.
- `composer.json:5-13`에 Envoy/Istio/Linkerd/Kuma 관련 의존이 전무하다 — mesh 통합 존재 주장 불가.
- **죽은 terraform/compose**: `infra/aws/terraform/*`·`infra/docker-compose.yml`은 라이브 무연결 죽은 스캐폴딩이며 메시를 구성하지 않는다 — PRESENT 근거 인용 금지.

## 5. 판정

**ABSENT.** service mesh 통합은 grep 0이며 mesh 실 config·mesh 의존(`composer.json:5-13`)이 전무하다. 현 authz는 사이드카/게이트웨이가 아닌 in-process 미들웨어(`index.php:69-622`) 강제뿐이다. Mesh Integration substrate는 순신설 대상이며 선행 externalized-decision·Policy Distribution plane 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
