# DSAR — RBAC Analytics & Governance Dashboard: 정합 대조 (APPROVAL_ANALYTICS_RECONCILIATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_RECONCILIATION`은 대시보드가 보여주는 값의 **여러 표현이 서로 일치하는지 대조**하여 불일치를 드러내는 엔티티다. SPEC §33 Reconciliation이 4개 소스 비교를 규정한다.

| 대조 대상 | SPEC 근거 | 의미(authz 축) |
|---|---|---|
| Live Data | §33(SPEC:502) | acl_permission/audit 실시간 집계 |
| Snapshot | §33(SPEC:503) | 불변 스냅샷(§27·§40 Immutable Snapshot) 저장값 |
| Cache | §33(SPEC:504) | TTL 캐시(§30) 캐시값 |
| Analytics Result | §33(SPEC:505) | KPI/Metric 엔진(§20) 산출값 |

4자 불일치 시 §31 Drift·§32 Revalidation과 연동되어 캐시 무효화·재계산으로 수렴한다. 목적은 대시보드 값의 단일 진실성(SSOT) 보증이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| authz Reconciliation 전용 대조 엔진 | **ABSENT(grep 0)** | GT② §2(authz Snapshot/…/Simulation/**Reconciliation** substrate grep 0) |
| Live Data 소스 | PRESENT | `TeamPermissions.php:10`(acl_permission)·`SecurityAudit.php:71-83`·`:118-153`(recent·acquisition 집계) |
| Snapshot substrate(불변 저장·대조 기준) | PARTIAL(재활용) | `SecurityAudit.php:14-33`·`:56-68`(append-only·verify broken_at)·`AccessReview.php:62-81`(추가전용 이력) |
| Cache substrate(캐시값) | PARTIAL(패턴 차용) | `AttributionEngine.php:1754`·`:1765`·`:1748`(ckey+computed_at+ttl·테이블 신설 대상)·`WebPush.php:305`·`:307`(GC) |
| 대조 결과 증거 | PARTIAL(재활용) | `SecurityAudit.php:14-33`(불일치 기록 substrate) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(신규)**: `reconciliation_id`·`tenant_id`·`metric_key`·`live_value`·`snapshot_value`·`cache_value`·`analytics_value`·`mismatch`(bool)·`checked_at`·`resolution`(REVALIDATION_TRIGGERED 등).
- **상태**: `CHECKED → MATCHED | MISMATCHED`. MISMATCHED 시 §32 Revalidation·§31 Drift Alert 연계.
- **제약**: 테넌트 격리 필수(§40 Tenant Isolation·`index.php:614-619` X-Tenant-Id 서버도출·ADR D-6). Snapshot은 불변(§40)이므로 대조 기준(SSOT)이며, Live/Cache/Analytics가 Snapshot 대비 이탈한 경우만 불일치 판정. KPI Formula Version(§40) 동일 버전 간에만 대조 유효.
- **substrate 재사용**: Snapshot 무결성·불일치 증거는 `SecurityAudit.php:14-33`/`:56-68` verify 재활용(ADR D-4), Cache는 `AttributionEngine.php:1754-1765` TTL 패턴 차용·전용 authz 캐시 테이블 신설(ADR D-3).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

★**Reconciliation ≠ 정산 recon**: 본 엔티티는 대시보드 **값 표현 4자(Live/Snapshot/Cache/Analytics) 정합 대조**이지, 커머스 정산(settlement) 대사가 아니다. 저장소의 마케팅·정산 집계(`Pnl.php` 손익·`Reports.php:27`·`:141`·`:336` DataExport DATASETS=orders/ad_metrics/attribution/kpi_summary·GT② §B-4·§B-5)는 `performance_metrics`/`channel_orders` 소스로 데이터 소스·목적이 완전 분리된다. 정산/손익 recon 로직을 흡수·개명 절대 금지.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT-순신규**. authz 4자 정합 대조 엔진 grep 0(GT② §2). 그린필드.
- **재활용(흡수 아님·확장)**: Live 소스 `TeamPermissions.php:10`·`SecurityAudit.php:71-83`/`:118-153`·Snapshot `SecurityAudit.php:14-33`/`:56-68`·Cache `AttributionEngine.php:1754-1765`/`:1748`·`WebPush.php:305`/`:307`.
- **선행 의존**: 대조 대상인 Snapshot(§27)·Cache(§30)·KPI/Analytics Result(§20) 실 구현 후 대조 가능(BLOCKED_PREREQUISITE). Live Data는 Part 1~3-10 통제 상태를 읽어 집계(ADR D-1·D-7).
- **코드 변경 0 · NOT_CERTIFIED**. 실 엔진은 선행 Decision Core 인증 후 RP-track 승인세션.
