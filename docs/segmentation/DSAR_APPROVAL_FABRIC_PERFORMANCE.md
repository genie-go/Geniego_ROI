# DSAR — 성능 요구 계약 (Part 3-16 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §33)

Fabric 은 다음 SLO 를 만족해야 한다:

- **P-1 PDP 가용성 ≥ 99.999%** (Policy Decision Point).
- **P-2 Cross-Region Sync ≤ 5초** — 정책 변경의 리전 간 전파.
- **P-3 Decision 지연 ≤ 20ms** — 단건 인가 결정.
- **P-4 Cache Hit ≥ 99%** — 결정 캐시.
- **P-5 Failover ≤ 30초** — 리전/노드 장애 절체.
- **P-6 Distribution ≤ 60초** — 정책 분배 완료.

## 2. 라이브 substrate 매핑

| SPEC SLO | 실 substrate | 상태 |
|---|---|---|
| P-1 PDP 가용성 | 라이브 PDP = 단일 PHP/Slim 미들웨어(`index.php:69-622`)·단일 MySQL(`Db.php:63-87`)·전용 PDP 프로세스 없음 | **측정 대상 부재** |
| P-2 Cross-Region Sync | 다중 리전 substrate ABSENT(수동 단일 호스트 배포 `deploy.ps1`·`deploy.sh`) | **ABSENT** |
| P-3 Decision 지연 | 요청 지연 참고치는 `response_time_ms` 산출(`SystemMetrics.php:60-100`) — decision 전용 계측 아님 | 대용 지표만 |
| P-4 Cache Hit | 결정 캐시 계층 ABSENT(opcache/apcu probe 는 존재 `SystemMetrics.php:67-76`이나 authz 결정 캐시 아님) | **ABSENT** |
| P-5 Failover | SQLite 폴백(`Db.php:414-427`·`:469-517`)은 로컬 degradation 이지 리전 failover 아님 | 리전 failover ABSENT |
| P-6 Distribution | 정책 분배 파이프라인 ABSENT | **ABSENT** |

## 3. 설계 계약(신설 시)

- 모든 SLO 는 **측정 대상 fabric 이 실재해야** 벤치마크 가능하다. 현재 fabric 벤치·부하 하네스는 전무.
- P-3 Decision 지연은 §31 인덱스·§32 조회 경로 확정 후 마이크로벤치로 검증한다. 현 `SystemMetrics.php:60-100` 의 `response_time_ms`·`avg_latency_ms` summary 는 요청 왕복 대용치이지 인가 결정 단위 계측이 아니므로 P-3 증거로 인용 불가.
- P-1/P-5 는 다중 리전·다중 노드 substrate 를 전제한다. 라이브는 단일 호스트(`deploy.ps1`·`deploy.sh`, CI inert `.github/workflows/deploy.yml`)이며 죽은 terraform(`infra/aws/terraform/*`) 은 PRESENT 아님.
- P-4 결정 캐시는 신설 대상. opcache/apcu(`SystemMetrics.php:67-76`)는 런타임 바이트코드/사용자 캐시 헬스일 뿐 authz 결정 캐시가 아님(재사용 불가).

## 4. 판정

**ABSENT.** 6개 SLO 의 측정 대상 fabric(PDP 프로세스·리전 sync·결정 캐시·failover·distribution)이 부재하다. 라이브는 단일 PHP/MySQL 모놀리스(`index.php:69-622`·`Db.php:63-87`)이고 계측은 요청 헬스 수준(`SystemMetrics.php:60-100`)에 그친다. 성능 계약은 실 구현 세션(RP-track) 에서 fabric substrate 신설 후에만 벤치·인증 가능.

NOT_CERTIFIED · 코드 변경 0 · BLOCKED_PREREQUISITE.
