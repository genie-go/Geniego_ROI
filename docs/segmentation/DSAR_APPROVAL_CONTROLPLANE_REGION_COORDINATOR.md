# DSAR — Authorization Region Coordinator (Part 3-19 §14 Multi-Region)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §14)
`APPROVAL_REGION_COORDINATOR`는 승인 제어 평면(Authorization Control Plane)의 **다중 리전(Multi-Region)** 조정자로서 다음 다섯 능력을 계약한다.
- **Active-Active**: 둘 이상 리전이 동시에 authz 결정을 수용하고 정책/할당 상태를 양방향 수렴시킨다.
- **Active-Passive**: 1차 리전이 결정을 담당하고 대기 리전은 read-replica로 지연 추종한다.
- **Geo Routing**: 요청 origin을 최근접·규제경계(data residency) 리전으로 라우팅한다.
- **Regional Isolation**: 한 리전의 장애/오염이 타 리전 authz 판정에 전파되지 않도록 격벽을 세운다.
- **Failover**: 1차 리전 소실 시 승격(promote)·정족수 재구성·정책 스냅샷 재적재를 자동 수행한다.

## 2. Substrate 매핑 (현행 → 계약)
| SPEC 능력 | 현행 substrate | 상태 |
|---|---|---|
| 리전 토폴로지 | 단일 호스트 배포 스크립트 `deploy.sh`(rsync 1개 docroot) | ABSENT |
| 리전=격리경계 | prod/demo는 **형제 스키마** `AdminPlans.php:56-58`(같은 호스트·다른 DB) — 리전 아님 | ABSENT |
| 연결 substrate | `Db.php:20-21` PDO 싱글톤(단일 커넥션·복제 토폴로지 없음) | ABSENT |
| 배포 파이프라인 | `.github/workflows/deploy.yml`(master push→단일 docroot) | 리전 무관 |
| 감사 근거 | `SecurityAudit.php:14-64`(append-only 해시체인) — 단일 저장소 | 리전 복제 없음 |

## 3. 설계 계약 (신설, 코드 0)
- **Region Registry**: `{region_id, role(active|passive), residency_class, health_epoch, quorum_weight}` 논리 테이블. Ground-Truth ①에 등재 후에만 배선.
- **Replication Contract**: authz 상태 변경(정책·할당·위임)은 `SecurityAudit.php:14-64` 스타일 append-only 이벤트로 방출 → 리전 간 재생(replay) 수렴. 물리 복제 이전에 **이벤트 계약**을 SSOT로 고정.
- **Failover Quorum**: 승격은 다수결 정족수 + `SecurityAudit` 서명 이벤트 없이는 불성립(fail-closed). 무정족수 승격 금지.
- **Residency Guard**: Geo Routing은 residency_class 위반 라우팅을 거부(fail-closed). 규제경계 우선.
- **Isolation Invariant**: 한 리전 오염 시 타 리전은 마지막 정합 스냅샷으로 계속 판정 — cross-region write-through 금지.

## 4. KEEP_SEPARATE (혼입 금지)
- `infra/aws/terraform/autoscaling.tf`·`infra/aws/terraform/codedeploy_bluegreen.tf` = **죽은 IaC**. Region Coordinator의 근거로 인용 금지 — **PRESENT로 오판 금지**(배선된 authz 리전 조정 아님).
- `deploy.sh`/`deploy.yml` = 단일 docroot 코드 배포. 리전 오케스트레이션과 명명 분리.
- prod/demo 형제 스키마(`AdminPlans.php:56-58`) = 테넌트·환경 격리이지 지리 리전 아님.

## 5. 판정
**ABSENT (순신설)**. 현행에 authz 다중 리전 조정자는 부재하다: 배포는 단일 호스트 `deploy.sh`, 환경 분리는 형제 스키마 `AdminPlans.php:56-58`(리전 아님), 연결은 단일 PDO 싱글톤 `Db.php:20-21`. 죽은 terraform은 PRESENT 근거가 될 수 없다. 본 조정자는 Region Registry·Replication/Failover 계약을 **순신설**하되, 물리 복제보다 append-only 이벤트 계약(`SecurityAudit.php:14-64` 패턴)을 SSOT로 먼저 고정한다. BLOCKED_PREREQUISITE — 선행 Cluster Coordinator(§2·§9) 부재로 코드 착수 불가. NOT_CERTIFIED.
