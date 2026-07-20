# DSAR — Approval Recovery Analytics (Part 3-20 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_RECOVERY_ANALYTICS

자기치유 거버넌스의 **효과성을 시계열로 계량하는 지표 계층**. 개별 Evidence(§19)·Digest(§20)가 사이클
단위 사실이라면, Analytics는 다수 사이클을 가로질러 "치유가 얼마나 빠르고·안정적이며·자동화되어 있는가"를
측정해 Continuous Governance의 개선 루프를 닫는다. Part 3-20 §21은 다음 6종 지표를 규정한다.

| # | 지표 | 정의 |
|---|------|------|
| M1 | MTTD (Mean Time To Detect) | anomaly 발생→탐지(§6 event 발행)까지 평균 시간 |
| M2 | MTTR (Mean Time To Recover) | 탐지→복원 완료(§15·§19 Result)까지 평균 시간 |
| M3 | Recovery Success Rate | 착수 대비 성공 복원 비율 |
| M4 | Auto-Healing Rate | 사람 개입 없이 자동 완결된 복원 비율 |
| M5 | Manual Intervention Rate | 수동 개입이 요구된 복원 비율(M4의 보수) |
| M6 | Governance Health Score | 위 지표를 통합한 거버넌스 건전성 종합 점수 |

APPROVAL_RECOVERY_ANALYTICS는 **원본 사실(Evidence/Digest)에서 파생하는 집계 지표**이며 조치를 수행하지
않는다. 측정·집계·추세 산출까지가 §21의 책임 경계다.

## 2. Substrate 매핑

| SPEC 요소 | 현존 substrate | 상태 |
|-----------|----------------|------|
| recovery analytics 스키마(M1~M6) | (없음) | ABSENT — grep 0 |
| MTTD/MTTR 지표(M1·M2) | (없음) | ABSENT — grep 0(MTTD/MTTR 부재) |
| 지표 입력(Evidence 사실) | SecurityAudit 해시체인(`SecurityAudit.php:14-68`) | 참고만(원본 사실·지표 아님) |
| 운영 헬스 표면(M6 인접) | 시스템 헬스/메트릭 표면(별도 도메인) | 별개(authz 치유 지표 아님) |

## 3. 설계 계약

- **판정=ABSENT**: recovery analytics 도메인은 grep 0으로 전무하다. 특히 **MTTD/MTTR는 grep 0**으로
  치유 시간 지표가 존재하지 않는다. 6종 지표 전부 부재.
- **순신설·파생 전용**: Analytics는 §19 Evidence·§20 Digest의 사실을 **집계**해 시계열 지표를 산출하는
  read-only 파생 계층으로 신설한다. 원본 사실은 변경하지 않는다.
- **선행 의존**: M1~M6은 §6(탐지 시각)·§15(복원 완료 시각)·§19(Result)의 substrate에 종속된다.
  선행이 ABSENT인 한 지표는 산출 불능(BLOCKED_PREREQUISITE).
- **Explainable**: M6 Governance Health Score는 구성 지표·가중을 명시해 근거 없는 종합 점수를 금지한다.

## 4. KEEP_SEPARATE

- ★`ModelMonitor.php:221` — ML 모델 지표(drift/성능 모니터). MTTD/MTTR·치유율과 도메인 상이. **흡수 금지**.
- ★`PgSettlement.php:215` — 재무 정산 지표. 인가 복원 지표 아님. **별개 관심사·흡수 금지**.
- `GraphScore.php` — 데이터 score 지표. 권한 치유 analytics 아님. 흡수 금지.

## 5. 판정

**ABSENT** (recovery analytics grep 0·MTTD/MTTR grep 0). MTTD/MTTR/Recovery Success Rate/Auto-Healing
Rate/Manual Intervention Rate/Governance Health Score 6종 전부 부재하며, 인접 참고는 SecurityAudit
원본 사실(`SecurityAudit.php:14-68`)뿐이다(지표 아님). ML·재무·데이터 지표는 KEEP_SEPARATE. §6·§15·§19
선행에 종속되는 **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
