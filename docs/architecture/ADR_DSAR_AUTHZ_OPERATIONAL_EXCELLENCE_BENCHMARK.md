# ADR — Enterprise Authorization Operational Excellence Benchmark (Part 3-38)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_38_OPERATIONAL_EXCELLENCE_BENCHMARK_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAOEB_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAOEB_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-38은 운영 품질을 지속 측정·비교하는 벤치마크 체계를 규정한다. ★특이점: Part 3-28/3-30/3-34와 측정 영역 대거 중복 — 본 Part는 그 측정치의 **벤치마크 집계 계층**. 본 ADR이 그 경계를 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (측정엔진 재정의 금지·상위 Part 집계)**: §14 Maturity=Part 3-28·§6~7 SLA/SLO/Reliability/MTTR=Part 3-30·§21 Executive Dashboard=Part 3-34·§9 Security=Part 3-29/3-36의 측정치를 **벤치마크(비교/순위/목표대비)로 집계**한다. 새 측정엔진 신설 금지.
- **D-2 (형식 Benchmark 계층 순신설)**: Benchmark Catalog·Global Ranking·Continuous Benchmarking·Benchmark Score/Gap는 신설(grep 0).
- **D-3 (PARTIAL substrate 재사용)**: Benchmark History=`docs/COMPETITIVE_SCORE_HISTORY.md` 패턴 참조(★경쟁≠운영)·운영 KPI=`SystemMetrics`/`Health`·Compliance=`Compliance.php`·Scoring 패턴=DataTrust(`DataPlatform`)·Evidence=`SecurityAudit::verify`·Isolation=`Db.php`.
- **D-4 (Score Immutable·서버 집계 SSOT)**: 벤치마크 스코어=서버 집계(임의 하드코딩 금지·[[reference_real_value_autoderive]])·이력 append-only `SecurityAudit::verify`.
- **D-5 (Runtime Guard=Score Manipulation 차단)**: 벤치마크 데이터/스코어 변조 차단=admin 게이트·SecurityAudit·`index.php` RBAC 위 배치(신규 게이트 신설 금지).

## KEEP_SEPARATE (오흡수 금지)
- 경쟁 스코어 이력(`docs/COMPETITIVE_SCORE_HISTORY.md`·마케팅/경쟁력) ≠ Operational Excellence Benchmark(운영).
- 비즈니스 ROI(`Pnl`) ≠ Cost Optimization Benchmark(플랫폼 비용) · ModelMonitor ≠ AI Operations Benchmark · Part 3-28 Maturity(성숙도 프레임워크) 자체 재정의 금지(집계만).

## 결과 (Consequences)
- 판정 = PARTIAL(COMPETITIVE_SCORE_HISTORY·SystemMetrics/Health·Compliance·DataTrust·SecurityAudit substrate) / ABSENT-formal(Benchmark Catalog·Global Ranking·Continuous Benchmarking 순신설·상위 Part 집계).
- 실행 순서: 선행 Part(3-28/3-30/3-34) 인증 → Benchmark Registry 신설 → 상위 Part 측정치 집계 배선 → Gap/Ranking/Dashboard. 코드 0.
