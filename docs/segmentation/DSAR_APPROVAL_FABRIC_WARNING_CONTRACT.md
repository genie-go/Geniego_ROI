# DSAR — Unified Authorization Fabric Warning Contract (Part 3-16 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — 차단 이전 열화(degradation)를 경고하는 5종

Warning Contract(§29)는 Error Contract(§28)의 **한 단계 앞**이다. 패브릭이 아직 요청을 차단하진 않지만 성능/일관성 열화가 임계에 접근했음을 non-blocking 신호로 노출해 선제 대응을 유도한다. 5종:

| 경고 | 감지 대상 | 승격 대상(악화 시) |
|------|-----------|--------------------|
| `REGION_LATENCY_HIGH` | 리전 PDP 응답지연 임계 초과 | `REGION_UNAVAILABLE` |
| `SYNC_DELAY` | 정책 동기화 지연 누적 | `FABRIC_SYNC_FAILED` |
| `CACHE_DIVERGENCE` | 노드 캐시 간 판정 발산 시작 | `CACHE_VERSION_CONFLICT` |
| `VERSION_DRIFT` | 노드 정책 버전 표류(경미) | `POLICY_VERSION_CONFLICT` |
| `CLUSTER_CAPACITY_WARNING` | PDP 클러스터 여유 용량 저하 | `PDP_CLUSTER_DOWN` |

## 2. Substrate 매핑 — 현 라이브 관측 신호와의 대비

| Fabric 경고 요구 지표 | 현 라이브 substrate | 실체 판정 |
|----------------------|--------------------|-----------|
| 노드/리전 지연·용량 지표 | 단일노드 헬스 `backend/src/Handlers/SystemMetrics.php:60-100`(`:67-76`) | PRESENT(단일노드 baseline) |
| 헬스 상태 신호 | `backend/src/Handlers/Health.php:13-26` | PRESENT(단일노드) |
| 리전 간 지연 | — | ABSENT(단일 리전) |
| 캐시 발산 | — | ABSENT(정책 캐시 계층 부재) |
| 버전 표류 | — | ABSENT(정책 버전 개념 부재) |
| 클러스터 용량 | — | ABSENT(PDP 클러스터 부재) |

현 관측 표면은 단일노드 헬스/메트릭(`SystemMetrics.php:60-100`, `Health.php:13-26`)뿐이다. 이는 "이 노드가 살아있는가/부하가 어떤가"를 말할 뿐, 리전 간·노드 간 상대 열화(발산·표류·리전 지연)를 측정하지 못한다.

## 3. 설계 계약 — 신설 시 준수할 불변식

- **Non-blocking 원칙**: 5종 경고는 요청을 차단하지 않는다(차단은 §28 Error). 경고는 관측·알림 채널로만 전파되어야 하며 authz 판정 경로에 side-effect를 주지 않는다.
- **단일노드 헬스 baseline 확장**: `CLUSTER_CAPACITY_WARNING`은 현 단일노드 용량 지표(`SystemMetrics.php:60-100`, `:67-76`)를 클러스터 집계로 확장하는 형태가 자연스럽다. 단, 클러스터가 없으므로 현재는 baseline 1개(자기 자신)만 관측 가능 = 발산/여유 판정 불가.
- **승격 연속성**: 각 경고는 대응 Error 코드(§28)로 단조 승격되어야 한다. 경고 없이 곧바로 Error로 점프하거나, 경고가 Error를 억제(masking)하지 않도록 임계·히스테리시스 설계 필요.
- **거짓경고 억제**: 단일노드에서 발생할 수 있는 순간 부하 스파이크를 리전 열화로 오인 금지. 다소스 교차 없이 단일 신호로 경고 발생시키지 않음(관측 신뢰 원칙).

## 4. 판정

**ABSENT (순신설).** Warning Contract 5종(`REGION_LATENCY_HIGH`·`SYNC_DELAY`·`CACHE_DIVERGENCE`·`VERSION_DRIFT`·`CLUSTER_CAPACITY_WARNING`)은 전부 미존재. 유일한 실 baseline은 단일노드 헬스/메트릭(`SystemMetrics.php:60-100`·`Health.php:13-26`)으로, 리전/캐시/버전/클러스터의 상대 열화를 측정할 다중 노드가 없어 5종 중 어느 것도 관측 대상이 형성되지 않는다. 실 구현은 다중 PDP 노드·정책 동기화 채널 신설 후 별도 세션(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
