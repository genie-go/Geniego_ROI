# DSAR — Authorization Control Analytics (Part 3-19 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_CONTROL_ANALYTICS

Control Analytics 는 authz Control Plane 의 **운영 건전성·전개 성과를 집계한 지표 계층**이다. §25 계약상 다음 6개 지표를 산출한다:

1. **Deployment Success** — 정책/config 배포 성공률.
2. **Rollback Count** — 롤백 발생 횟수(전개 안정성 역지표).
3. **Sync Latency** — Control→Data Plane 정책 전파 지연.
4. **Runtime Availability** — authz 런타임(PDP/PEP) 가용성.
5. **Region Health** — 리전별 Control Plane 건전성.
6. **Policy Activation Success** — 정책 활성화 성공률.

계약상 Analytics 는 Evidence(§23)·Snapshot(§22)에서 파생되는 **집계 read-model**이며, authz 판정을 자동 변경하지 않는다(관측 전용).

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Control Analytics 집계기 | **ABSENT** (grep 0) | Control Plane 운영 지표를 집계하는 계층 부재 |
| Deployment Success 원천 | 부분 신호만 | `Health.php:56-67`(배포 마커·성공률 집계 아님) |
| Rollback Count | ABSENT | 롤백 사건 원장(§23 Evidence) 자체 미봉인 |
| Sync Latency | ABSENT | 정책 전파 계층 부재(단일 프로세스 inline `index.php:69-88`) |
| Runtime Availability | PARTIAL(단일 노드) | `Health.php:56-67`·`:102-103`(단일 노드 헬스·가용성 지표 아님) |
| Region Health | ABSENT | 단일 리전 모놀리스(`Db.php:157-162`·`:308-321` 단일 연결)·리전 개념 없음 |
| Policy Activation Success | ABSENT | 정책 활성화 사건 집계 없음 |

**판정 근거**: authz Control Plane 의 운영 지표를 집계하는 Analytics 계층은 존재하지 않는다(grep 0). 6개 지표 대부분이 원천 사건(§23 Evidence·전파 계층)의 부재로 산출 불가하다. `Health.php:56-67`·`:102-103` 는 단일 노드 헬스 신호일 뿐 가용성·성공률 집계가 아니며, `Db.php:157-162`·`:308-321` 는 단일 연결 모놀리스임을 확인해 Region Health 가 개념적으로 부재함을 뒷받침한다. 판정 **ABSENT** — 순신설.

## 3. 설계 계약(규칙)

- **R1 (관측 전용)**: Analytics 는 집계 read-model 이며 authz 판정을 자동 변경·집행하지 않는다.
- **R2 (Evidence 파생)**: 지표는 §23 Evidence(`SecurityAudit.php:14-64` 확장분)와 §22 Snapshot 에서 파생한다. 별도 원천 수집 금지.
- **R3 (헬스 소비)**: Runtime Availability 는 기존 `Health.php:56-67`·`:102-103` 신호를 소비한다. 별도 헬스 체계 재구현 금지.
- **R4 (선행 의존)**: Rollback Count·Sync Latency·Policy Activation 은 §23 Evidence·전파 계층 신설을 선행조건으로 하므로 그 전에는 BLOCKED_PREREQUISITE.
- **R5 (Region 확장성)**: Region Health 는 현행 단일 리전(`Db.php:157-162`)을 전제로 부재하며, 다중 리전 도입 시에만 유의미. 조기 구현 금지.

## 4. KEEP_SEPARATE (흡수 절대 금지)

- **ML 모델 드리프트/성과 지표** — `ModelMonitor.php:17-19`·`:21`·`:42-44`. 모델 모니터링 지표는 별개 도메인. authz Control Analytics 로 통합 금지.
- **재무 정산 지표** — `PgSettlement.php:215`·`:295`. 정산 reconciliation 지표. 혼용 금지.
- **재고 지표** — `Wms.php:2160`. WMS 운영 지표. authz 무관.
- **커넥터 sync 지표** — `Connectors.php:902`. 채널 동기화 성과. authz Control Analytics 와 분리 유지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_CONTROL_ANALYTICS 는 부재(grep 0)하다. 6개 지표 대부분이 §23 Evidence·전파 계층 부재로 산출 불가이며, `Health.php:56-67` 단일 노드 신호와 `Db.php:157-162` 단일 리전 전제만 실재한다. 순신설 설계이며 Evidence(§23)·Snapshot(§22) foundation 완료 후 별도 승인 세션에서 진행한다. ML(`ModelMonitor.php:21`)·재무(`PgSettlement.php:215`) 지표와는 영구 분리한다. 코드 변경 0.
