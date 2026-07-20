# DSAR — Unified Authorization Fabric API Surface (Part 3-16 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — 패브릭 운영·관측 8종 API

API Surface(§30)는 authz 패브릭의 **제어/관측 평면**을 관리자에게 노출한다. 8종:

| API | 목적 | 쓰기/읽기 |
|-----|------|-----------|
| Publish Policy | 정책 번들 배포(서명·버전) | 쓰기(admin) |
| Query Fabric Health | 패브릭 전역 헬스 조회 | 읽기 |
| Query Region | 리전별 상태/토폴로지 조회 | 읽기 |
| Synchronize Fabric | 노드 간 정책 강제 동기화 | 쓰기(admin) |
| Run Failover Test | failover 리허설 실행 | 쓰기(admin) |
| Query Analytics | 판정/배포 분석 조회 | 읽기 |
| Run Simulation | 정책 변경 영향 시뮬레이션 | 읽기(dry-run) |
| Query Snapshot | 특정 시점 정책 스냅샷 조회 | 읽기 |

## 2. Substrate 매핑 — 현 라이브 실배선과의 대비

| Fabric API 요구 | 현 라이브 substrate | 실체 판정 |
|-----------------|--------------------|-----------|
| 라우트 실배선 | `/api` 접두 자동감지 `backend/public/index.php:281-284`·라우트 등록 파일 `$register` 배선 | PRESENT(조건·패브릭 라우트 아님) |
| admin 인증/게이트 | 쓰기 게이트 `index.php:583-598`·admin plan 게이트 `backend/src/Handlers/AdminPlans.php:53-72` | PRESENT(단일노드 admin) |
| 헬스 엔드포인트 | `backend/src/Handlers/Health.php:13-26`·메트릭 `backend/src/Handlers/SystemMetrics.php:60-100` | PRESENT(단일노드 헬스 — Query Fabric Health 확장 baseline) |
| 정책 배포 채널 | — | ABSENT(Publish Policy 발행처 없음) |
| 리전/스냅샷/시뮬/failover | — | **ABSENT(8종 중 7종 순신규)** |

**Query Fabric Health만이 확장 baseline을 가진다**: 현 단일노드 헬스(`Health.php:13-26`)·메트릭(`SystemMetrics.php:60-100`)을 패브릭 집계 뷰로 확장하는 형태. 나머지 7종(Publish Policy·Query Region·Synchronize Fabric·Run Failover Test·Query Analytics·Run Simulation·Query Snapshot)은 발행/조회 대상 패브릭 산출물이 없어 순신규다.

## 3. 설계 계약 — 실 구현 시 배선 조건

- **`/api` 접두 필수**: 신규 실배선은 반드시 `/api` 접두로 등록되어야 한다(nginx SPA HTML 폴백이 미배선 라우트를 200 HTML로 착시시키는 트랩 회피). `index.php:281-284`의 basePath 자동감지 경로를 그대로 사용.
- **`$register` 배선 필수**: 라우트 등록 파일의 `$register`에 `'METHOD /path' => 'Handler::method'` 매핑을 추가하지 않으면 핸들러가 존재해도 라이브에서 호출 불가(핸들러 미배선≠실 백엔드). 8종 전부 명시 배선.
- **쓰기 API RBAC**: Publish Policy·Synchronize Fabric·Run Failover Test는 쓰기 작업이므로 `index.php:583-598` 쓰기 게이트 계약(analyst+/write:*)을 상속하고, admin 전용 정책은 `AdminPlans.php:53-72` 게이트 패턴을 준용. 공개 bypass 목록에 추가 금지(fail-secure).
- **읽기 API 최소권한**: Query 계열 5종은 읽기지만 정책/리전 토폴로지 노출이므로 admin 스코프 유지. 테넌트 격리(`index.php:614-619`) 계약을 준수해 크로스테넌트 정책 조회 차단.
- **감사 기록**: Publish/Synchronize/Failover 3종 쓰기는 `SecurityAudit.php:35-40`(`verify()`) append-only 체인에 기록. Run Simulation은 dry-run으로 side-effect·집행 금지.

## 4. 판정

**ABSENT (순신설).** API Surface 8종은 라이브에 미배선. Query Fabric Health만이 현 단일노드 헬스/메트릭(`Health.php:13-26`·`SystemMetrics.php:60-100`)을 확장할 baseline을 가지며, 나머지 7종은 발행/조회 대상 패브릭 산출물(정책 배포 채널·리전 토폴로지·스냅샷·시뮬레이터·failover)이 없어 순신규다. 실 구현 조건은 `/api` 접두 실배선 + 라우트 등록 파일 `$register` 배선(`index.php:281-284` 경로)이며, 그 이전에 대상 패브릭이 존재해야 한다(BLOCKED_PREREQUISITE). 실 구현은 별도 승인 세션. 코드 변경 0 · NOT_CERTIFIED.
