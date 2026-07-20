# DSAR — RBAC Analytics & Governance Dashboard: 통합 Control Tower (APPROVAL_GOVERNANCE_DASHBOARD)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_GOVERNANCE_DASHBOARD`는 SPEC §0·§1(2. Governance Dashboard)이 규정하는 **Enterprise Authorization의 운영 센터(Control Tower)** 다. SPEC §0은 "단순한 통계 화면이 아니라 운영 센터 역할"을 명시하며, RBAC/Authorization/Role/Permission/Assignment/Scope/Dynamic Role/Service Identity/JIT/SoD/Certification/Runtime/Policy/Compliance/Risk/Audit Governance 16개 영역을 **하나의 통합 Dashboard**에서 제공하도록 요구한다.

- **역할**: 분산된 authz 화면·이벤트·지표를 단일 프레임으로 집약·가시화·경보·추천(ADR §1 "읽어 집약·가시화·경보·추천하는 상보 계층").
- **성격**: 읽기전용 파생 계층 — 원천 통제(Part 1~3-10)를 재구현하지 않고 산출을 소비(ADR §D-7).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 영역 | 판정 | 근거(GT ①②/ADR 등장분) |
|---|---|---|
| **통합 Governance Dashboard(Control Tower)** | **ABSENT** | "통합 role-기반 대시보드 부재"(GT② §2). Control Tower grep 0 |
| Authorization Health / Operations 근접 | PARTIAL | `SystemMetrics.php:60`(8모듈 프로브)·`:96-102`(ok_count/avg_latency/error_rate)·`:372-419`(cronHealth) — 인프라 헬스지 RBAC 지표 아님(ADR §D-8) |
| 접근검토 슬라이스 | PARTIAL | `AccessReview.php:36`·`:87-122`(api_key 축만·사람계정 미커버) |
| 감사 화면 | PARTIAL | `SecurityAudit.php:71-83`·`:93-110`·`:118-153`; `AdminGrowth.php:1411-1431`(securityAudit 통합 반환); `Audit.jsx:371`·`:522-536` |
| 컴플라이언스 posture | PARTIAL | `Compliance.php:53-126`·`:93`(RBAC를 SOC2 control 1행 readiness%) |
| admin 콘솔 카운트 | PARTIAL | `UserAdmin.php:528-576`·`:550-552`(active_sessions)·`TeamPermissions.php:454-478`(member/permission COUNT) |
| Dashboard 접근 게이트 | PARTIAL | `SystemMetrics.php:50-58`·`:107-117`(isAdmin) — Runtime Guard 앵커(ADR §D-6) |
| 통합 API·라우트 프레임 | ABSENT/근접 | 개별 라우트만: `routes.php:1049-1050`·`:3465-3466`(/v424/system/metrics). 통합 dashboard API 없음 |
| 프론트 대시보드 렌더 선례 | PARTIAL | `SystemMonitor.jsx:209-212`·`:9-21`; `AccessReview.jsx:65`·`:75`·`:95`; `UserManagement.jsx:523`·`:533` |

**정직 분리(ADR §D-8)**: 위 화면들은 전부 **분산·부분** — SystemMetrics=인프라 헬스, AccessReview=api_key 축만, Compliance posture=RBAC 1행만, admin 콘솔=카운트 수준. 어느 것도 통합 Control Tower·authz KPI가 아니다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·불변버전/테넌트격리)

- **구성**: dashboard_id·dashboard_type(§3 10유형)·widget[]·kpi[]·refresh_policy(§42 KPI Refresh ≤30s)·snapshot_ref(§27)·tenant_id.
- **이중 모드**: 실시간 라이브 + 스냅샷(ADR §D-1). 스냅샷은 불변(SPEC §40 Immutable Snapshot).
- **접근 제어**: admin 게이트(`SystemMetrics.php:50-58`) + cross-tenant 격리(`index.php:614-619`)를 재활용해 Runtime Guard(§35 Unauthorized Dashboard Access·Cross-Tenant Query·Data Leakage) 신설(ADR §D-6).
- **증거**: Dashboard Evidence/Digest는 `SecurityAudit.php:14`·`:56-68` 해시체인 확장(ADR §D-4).
- **성능**: Dashboard Load ≤2s·Cache Hit ≥98%(SPEC §42) — 실 구현 세션 조건(ADR §5).

## 4. KEEP_SEPARATE (마케팅 analytics 흡수금지)

Control Tower는 authz 화면만 집약한다. 아래 마케팅 대시보드를 **흡수·개명 금지**(GT② §4·§B-4·ADR §D-2):

- `AdPerformance.php:7`·`:40`(광고 KPI 대시보드)·`Pnl.php`(손익 대시보드)·`AdminGrowth.php:434`·`:625`·`:675`·`:687`(growth 마케팅 funnel/channel 집계).
- `Reports.php`의 `/dashboard`=프론트 리다이렉트 문자열, analytics 프레임 아님(GT② §B-6).
- 데이터 소스 상이: 마케팅=`performance_metrics`/`channel_orders`, Control Tower=`acl_permission`/`security_audit_log`.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: **ABSENT-governance / PARTIAL-substrate** — 통합 Control Tower는 grep 0(GT② §2·ADR §2.3). 재료(운영헬스·접근검토·감사·컴플라이언스 posture·admin 콘솔)는 분산 실존이나 통합·집약 계층 없음.
- **재활용(Extend)**: §A~E 분산 화면 + §G 중립 인프라를 대체 아닌 재활용으로 통합(ADR §D-1). 원천 통제 무변경·읽기전용 파생.
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-10 산출을 소비하므로 인증 완료가 선결(ADR §D-7·Consequences).
- **NOT_CERTIFIED**: 코드 변경 0. 무후퇴 — 기존 분산 화면·중립 인프라 유지·병행(ADR Consequences).
