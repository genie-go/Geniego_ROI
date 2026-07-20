# DSAR — Multi-Region & Disaster Recovery Coordinator (Part 3-19 §14·§15)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §14·§15)

- **§14 Multi-Region Coordinator** — 인가 Control Plane이 다수 리전에 배치될 때 리전 간 정책·결정 상태 정합과 리전 장애 격리(Region Failover)를 조율.
- **§15 Disaster Recovery Coordinator** — 재해 시 인가 통제 지속성을 위한 복구 조율. 하위 5개 절차:
  - **Recovery Plan** — RTO/RPO 목표·복구 순서 계약.
  - **Region Failover** — 주 리전 장애 시 대체 리전 승격.
  - **Backup Activation** — 백업 통제 평면 활성화.
  - **Snapshot Restore** — 정책·결정 스냅샷 복원.
  - **Configuration Restore** — 인가 구성(키·역할·정책) 복원.

불변식: 복구 중에도 인가는 **fail-closed**(불확실 시 deny)를 유지하고, 복구 절차 전 과정을 `SecurityAudit.php:14-64` 체인에 기록한다.

## 2. Substrate 매핑

| SPEC 절차 | 현행 substrate | 상태 |
|---|---|---|
| 배포 토폴로지 | `deploy.sh` (단일 호스트 rsync) · `.github/workflows/deploy.yml` | PRESENT (단일 리전) |
| prod/demo 분리 | `AdminPlans.php:53-72` · `:56-58` (형제 스키마) | PRESENT |
| DB 접속·폴백 | `Db.php:18` · `:20-21` · `:308-321` (MySQL→SQLite 폴백) | PRESENT (단일 인스턴스) |
| 상태 점검 | `Health.php:56-67` | PRESENT |
| 접근 재검토 증적 | `AccessReview.php:176-225` · `:225` | PRESENT |
| §14 Multi-Region Coordinator | — | **ABSENT** (리전 개념 grep 0) |
| Recovery Plan / Failover | — | **ABSENT** |
| Backup Activation | — | **ABSENT** |
| Snapshot / Configuration Restore | — | **ABSENT** |

현행 배포는 `deploy.sh`가 수행하는 **단일 호스트** 모델이며, prod/demo는 리전이 아니라 `AdminPlans.php:56-58`의 **형제 스키마**로 분리된다. 리전 페일오버·백업 활성화·스냅샷 복원을 조율하는 코드는 존재하지 않는다.

## 3. 설계 계약 (순신설)

- **DR Coordinator 순신설**: 복구 절차를 조율하되, 실제 데이터 계층은 `Db.php:308-321`의 MySQL→SQLite 폴백을 substrate로 삼는다(신규 저장소 신설 아님).
- **복구 중 fail-closed**: Configuration Restore 완료 전에는 인가 결정을 deny 우선으로 강등, `Health.php:56-67` 상태가 정상 확인될 때까지 정책 활성화 보류.
- **증적 연속성**: Snapshot Restore는 `SecurityAudit.php:14-64` 체인의 연속성을 깨지 않도록 복원 지점·해시를 기록. 접근 재검토 상태는 `AccessReview.php:176-225`를 참조.
- **RPO/RTO**: 단일 호스트 현행 기준 목표를 명시하고, Multi-Region은 선행 인프라 확정 후 확장.

## 4. KEEP_SEPARATE

- `infra/aws/terraform/autoscaling.tf` · `infra/aws/terraform/codedeploy_bluegreen.tf` — **죽은 terraform**(미배선·미적용). Multi-Region/Failover 근거로 **PRESENT 인용 금지**. 현행 실배포는 `deploy.sh` 단일 호스트가 정본.
- `WmsCctv.php:634-638` — "PIP"는 파이프(pipe) 문자열이며 정책정보점(PIP)이 아님. 흡수 금지.
- `Dsar.php` — GDPR DSAR. 재해복구와 무관.

## 5. 판정

**ABSENT** — Multi-Region Coordinator 및 Recovery Plan/Region Failover/Backup Activation/Snapshot·Configuration Restore 코드는 grep 0. 현행은 `deploy.sh` 단일 호스트 + `AdminPlans.php:56-58` 형제 스키마 + `Db.php:308-321` 단일 폴백. terraform autoscaling/blue-green은 죽은 파일로 근거 불가. DR Coordinator는 **순신설**이며 선행 멀티리전 인프라 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
