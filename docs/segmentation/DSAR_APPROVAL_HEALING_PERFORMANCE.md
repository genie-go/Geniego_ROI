# DSAR — Approval Recovery Performance (Part 3-20 §33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_PERFORMANCE

§33은 self-healing 파이프라인의 각 단계가 지켜야 하는 **6개 성능 예산(latency/성공률)**을 규정한다. 자기치유가
"연속 거버넌스(continuous)"로 성립하려면 감지→계획→집행이 사람 개입 없이 예산 내에 완결돼야 한다. 원문 6종(§33):

| # | 지표 | 목표 |
|---|------|------|
| P1 | Health Assessment | ≤ 10초 (권한 상태 건전성 1회 평가) |
| P2 | Drift Detection | ≤ 5초 (baseline 대비 이탈 감지) |
| P3 | Auto-Remediation Start | ≤ 3초 (이탈→복원 착수 지연) |
| P4 | Recovery Plan | ≤ 30초 (복원 계획 산출 완료) |
| P5 | Governance Health Refresh | ≤ 60초 (거버넌스 스코어 갱신 주기) |
| P6 | Recovery Success | ≥ 99% (복원 시도 대비 성공률) |

성능 예산은 측정 대상(self-healing 단계)이 존재해야만 검증 가능하다.

## 2. Substrate 매핑

| SPEC 지표 | 현존 substrate | 상태 |
|-----------|----------------|------|
| P1 Health Assessment | 시스템 health probe(`SystemMetrics.php:60`·구성요소 점검 `SystemMetrics.php:67-76`)·헬스 엔드포인트(`Health.php:27`) | PARTIAL(인프라 health·권한 상태 assessment 아님) |
| P2 Drift Detection | (없음) | ABSENT — grep 0 |
| P3 Auto-Remediation Start | (없음) | ABSENT — grep 0 |
| P4 Recovery Plan | schema rollback(`Migrate.php:310`)·DB 프로브 지표(`SystemMetrics.php:323`·`:334`) | PARTIAL(스키마 롤백만·authz recovery plan 아님) |
| P5 Governance Health Refresh | 컴플라이언스 상태 조회(`Compliance.php:53`·`:120`) | PARTIAL(정적 상태·주기 refresh 예산 없음) |
| P6 Recovery Success | (없음) | ABSENT — grep 0 |

## 3. 설계 계약

- **판정=ABSENT**: 측정 대상인 self-healing 단계(drift 감지·auto-remediation·recovery plan·success 집계)가
  부재하므로 P1~P6 성능 예산을 부과·검증할 실체가 없다. 최근접은 **인프라 health probe**(`SystemMetrics.php:60`·
  `:67-76`·헬스 `Health.php:27`)와 **schema rollback**(`Migrate.php:310`)뿐으로, 이는 권한 상태 자기치유가 아니다.
- **RP-track 조건**: P1~P6은 self-healing 엔진 실구현 이후의 성능 인증(RP-track) 조건이다. 본 §33은 예산 계약만
  고정하고, 측정은 §34 Performance 테스트(100K health checks/min 등)에서 부하로 검증한다.
- **health probe 확장 금지 아님·재정의 금지**: `SystemMetrics.php:60`의 인프라 health를 authz Health Assessment로
  개명·전용하지 않는다 — 권한 상태 평가는 별개 신설 엔진이며, 인프라 지표(`SystemMetrics.php:323`·`:334`)는
  참조 substrate로만 존치한다.
- **예산의 계층화**: P3(≤3초 착수)≤P2(≤5초 감지)≤P1(≤10초 평가)≤P4(≤30초 계획)≤P5(≤60초 refresh)의 단조
  포함관계를 설계 불변으로 둔다 — 감지보다 늦은 착수, 평가보다 빠른 계획은 계약 위반이다.

## 4. 판정

**ABSENT** (측정 대상 self-healing 단계 부재·drift/remediation/success grep 0). 현 substrate는 인프라 health probe
(`SystemMetrics.php:60`·`:67-76`·`Health.php:27`)와 schema rollback(`Migrate.php:310`)·DB 지표(`SystemMetrics.php:323`·
`:334`)·컴플라이언스 상태(`Compliance.php:53`·`:120`)로, authz 자기치유 성능 예산의 측정 대상이 아니다. P1~P6은
self-healing 엔진 실구현 후의 **RP-track 조건**이며 §34 부하 테스트로 검증. 코드 변경 0 · NOT_CERTIFIED ·
BLOCKED_PREREQUISITE.
