# DSAR — RBAC Analytics & Governance Dashboard: 테스트 계약 (Part 3-11 §43)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_11_RBAC_ANALYTICS_GOVERNANCE_DASHBOARD_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_RBAC_ANALYTICS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ANALYTICS_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ANALYTICS_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §43은 6개 테스트 축을 요구한다 — **Unit**(KPI/Widget/Trend/Forecast/Recommendation)·**Integration**(RBAC/Authorization/JIT/SoD/Certification/Audit)·**Performance**(10M Metrics/1000 Concurrent Dashboards/100K Widget Refreshes)·**Security**(Dashboard Access Control/Cross-Tenant Isolation/Data Leakage/Widget Injection)·**Compliance**(SOX/ISO27001/SOC2/NIST/COBIT)·**Regression**(Authorization/Policy/Workflow/Audit). 리포지토리에 PHPUnit/npm test 스위트가 없으므로(CLAUDE.md) 이는 RP-track 신규 테스트 계약이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 테스트 축(§43) | 판정 | 근거 |
|---|---|---|
| Unit(KPI/Widget/Trend/Forecast/Recommendation) | **ABSENT** | 대상 엔진 grep 0(GT② §2). Trend 근접 선례 `SecurityAudit.php:118-153`(acquisition 일자별)만·테스트 없음 |
| Integration(RBAC/Authz/JIT/SoD/Cert/Audit) | **PARTIAL(소스 실존)** | 소스는 실존 — acl_permission `TeamPermissions.php:10`·JIT/Service 축 `AccessReview.php:87-122`·SoD 집행 `Mapping.php:268-271`·감사 `SecurityAudit.php:71-153`. 통합 테스트 하네스 ABSENT |
| Performance(10M/1000/100K) | **ABSENT** | 부하 시나리오 부재. §42 SLO 계측 자체 미배선(별도 DSAR §2) |
| Security(Access/Cross-Tenant/Leakage/Injection) | **PARTIAL(가드 실존)** | admin 게이트 `SystemMetrics.php:50-58`·`:107-117`·cross-tenant 격리 `index.php:614-619`(ADR D-6). 대시보드 접근·data leakage 전용 테스트 ABSENT |
| Compliance(SOX/ISO27001/SOC2/NIST/COBIT) | **PARTIAL(프레임)** | RBAC를 SOC2 control 1행 readiness%로 `Compliance.php:53-126`·`:93`(access-rbac). 5규제 검증 스위트 ABSENT |
| Regression(Authorization/Policy/Workflow/Audit) | **ABSENT** | 회귀 스위트 부재. 감사 무결성 재계산 `SecurityAudit.php:56-68`(verify)이 유일 검증 primitive |

## 3. 설계 계약 (항목·기준 — SPEC 근거)

| # | 테스트 | 커버 기준(설계) |
|---|---|---|
| T-1 Unit | KPI 산식(§20 8종)·Widget 렌더·Trend/Forecast/Recommendation 로직. formula_version 고정 검증 |
| T-2 Integration | Part 1~3-10 산출 읽기 소비(ADR D-7)·acl_permission/JIT/SoD/Cert/Audit 소스 조인 정합 |
| T-3 Performance | 10M Metrics·1000 Concurrent Dashboards·100K Widget Refreshes → §42 SLO 대조 |
| T-4 Security | Dashboard Access Control(`SystemMetrics.php:50-58` 확장)·Cross-Tenant Isolation(`index.php:614-619`)·Data Leakage·Widget Injection |
| T-5 Compliance | SOX/ISO27001/SOC2/NIST/COBIT — `Compliance.php:53-126` posture 확장 앵커로 매핑 |
| T-6 Regression | Authorization/Policy/Workflow/Audit 무후퇴. Audit=`SecurityAudit::verify`(`:56-68`) 무결성 재계산 |

## 4. KEEP_SEPARATE / 선행의존

- **KEEP_SEPARATE**: 마케팅 analytics 엔진(Insights/Mmm/AttributionEngine/AutoRecommend/CustomerAI·GT② §4)의 테스트와 authz 테스트는 별개 스위트(ADR D-2). 마케팅 KPI/dataset를 authz Unit 대상으로 오흡수 금지.
- **선행의존**: T-1~T-6 전부 대응 엔진(KPI/Widget/Forecast/Guard) 신설 후 작성 가능(BLOCKED_PREREQUISITE). Integration은 JIT/SoD 엔진 실 구현 산출이 소스(ADR D-7).

## 5. 판정 (NOT_CERTIFIED · RP-track 실구현 조건 · 선행의존)

- **판정**: Test Contract 6축 = ABSENT(Unit/Performance/Regression 스위트 전무·리포지토리 무 테스트) / PARTIAL(Integration 소스·Security 가드·Compliance posture 프레임 실존).
- **RP-track 실구현 조건**: T-1~T-6 스위트 신규 작성 + Regression 100% 통과(§44 Completion Gate). Compliance 5규제·Security 4항 필수.
- 현 단계 코드 변경 0 · NOT_CERTIFIED. 마케팅 테스트 흡수 금지.
