# DSAR — RBAC Analytics & Governance Dashboard: 재검증 (APPROVAL_ANALYTICS_REVALIDATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_ANALYTICS_REVALIDATION`은 authz 상태·규칙이 변경될 때 대시보드 지표·스냅샷·캐시를 **재계산(재검증)** 하도록 촉발하는 엔티티다. SPEC §32 Revalidation이 4종 trigger를 규정한다.

| Trigger | SPEC 근거 | 의미(authz 축) |
|---|---|---|
| Policy 변경 | §32(SPEC:491) | 정책 규칙 셋 변경 → 파생 KPI/지표 재계산 |
| Assignment 변경 | §32(SPEC:492) | role/권한 할당 변경 → Assignment/Role Analytics 재계산 |
| Runtime 변경 | §32(SPEC:493) | 런타임 인가 구성 변경 → Runtime Analytics 재계산 |
| Analytics Rule 변경 | §32(SPEC:494) | KPI 산출식·집계 규칙 변경 → 전 지표 재검증 |

§31 Drift 탐지(APPROVAL_ANALYTICS_DRIFT)가 이탈을 발견하면 본 재검증이 촉발되어, 캐시(§30) 무효화·스냅샷(§27) 재생성으로 연결된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) |
|---|---|---|
| authz Revalidation 전용 trigger 엔진 | **ABSENT(grep 0)** | GT② §2(authz Snapshot/…/**Revalidation**/Reconciliation substrate grep 0) |
| 변경 이벤트 라우터(trigger 배선 substrate) | PARTIAL(도메인중립) | `Alerting.php:987`(`pushEvent`)·`:978`·`:1023-1042`(notification_channel SSOT·도메인 무관 이벤트 라우터·GT① §G) |
| 재계산 대상 소스 | PRESENT | `TeamPermissions.php:10`(acl_permission·assignment)·`AccessReview.php:87-122`(classify 파생) |
| 재검증 결과 증거 | PARTIAL(재활용) | `SecurityAudit.php:14-33`·`:56-68`(append-only·verify) |
| TTL 캐시(무효화 대상) | PARTIAL(패턴 차용) | `AttributionEngine.php:1754`·`:1765`(ckey+ttl 만료)·`WebPush.php:305`(범용 카운터) — 테이블 신설 대상 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **필드(신규)**: `revalidation_id`·`tenant_id`·`trigger_type`(Policy/Assignment/Runtime/Analytics Rule)·`trigger_ref`·`affected_scope`(KPI/Snapshot/Cache 대상)·`requested_at`·`completed_at`·`status`.
- **상태**: `TRIGGERED → RECOMPUTING → COMPLETED`(재계산 완료 시 캐시 §30 무효화·스냅샷 §27 재생성).
- **제약**: 테넌트 격리 필수(§40·ADR D-6). Analytics Rule 변경 시 KPI Formula Version(§40) 증가 후 재계산(구버전 지표와 직접 비교 금지). 원천 통제(Part 1~3-10)는 무변경, 재검증은 읽기전용 파생만 재계산(ADR D-1).
- **substrate 재사용**: trigger 배선은 `Alerting.php:987` pushEvent 라우터 재활용(ADR D-3), 결과 증거는 `SecurityAudit.php:14-33` 체인 재활용(ADR D-4).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

★Revalidation은 authz 축 **순신규** 개념이다(GT② §KEEP_SEPARATE 참조·§4). 저장소의 마케팅 재계산·재추천 로직(`AutoRecommend.php:40` 예산 재배분·`Mmm.php:24` 재적합)은 `performance_metrics`/`channel_orders` 소스의 마케팅 도메인으로, authz 정책·할당 변경 trigger와 데이터 소스·목적이 완전 분리된다. `pushEvent`(`Alerting.php:987`)는 도메인 무관 이벤트 라우터로 **재사용**하되, 마케팅 trigger 규칙·payload는 흡수 금지.

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT-순신규**. authz Revalidation trigger 엔진 grep 0(GT② §2). 그린필드.
- **재활용(흡수 아님·확장)**: `Alerting.php:987`/`:978`/`:1023-1042`(이벤트 라우터)·`SecurityAudit.php:14-33`/`:56-68`(증거)·`AttributionEngine.php:1754-1765`(TTL 캐시 패턴).
- **선행 의존**: 재검증 대상인 KPI Engine(§20)·Snapshot(§27)·Cache(§30) 실 구현 후 촉발 가능(BLOCKED_PREREQUISITE). Runtime/Assignment trigger는 Part 1~3-10 통제 이벤트를 소스로 함(ADR D-7 읽기 소비).
- **코드 변경 0 · NOT_CERTIFIED**. 실 엔진은 선행 Decision Core 인증 후 RP-track 승인세션.
