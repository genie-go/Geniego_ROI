# DSAR — Self-Healing Warning Contract (Part 3-20 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_20_SELF_HEALING_CONTINUOUS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_SELF_HEALING_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_HEALING_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_HEALING_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Warning Contract는 fail-closed 차단(에러)에 이르기 전 **추세 열화(degradation trend)를 조기 신호**하는 5종 경고를 규정한다. 경고는 비차단(non-blocking)·관찰 가능·escalate 가능해야 한다.

| 경고 | 발생 조건 |
|---|---|
| Health Score Decreasing | 거버넌스 health score 하락 추세 감지 |
| Recovery Success Rate Declining | 복구 성공률 지속 하락 |
| Drift Increasing | 정책·구성 drift 증가 추세 |
| Manual Recovery Increasing | 수동 복구 개입 빈도 증가(자동화 신뢰 저하 신호) |
| Repeated Auto-Healing Failure | 동일 대상 자동복구 반복 실패 |

## 2. Substrate 매핑

| 계약 요소 | 현존 substrate | 상태 |
|---|---|---|
| Health Score 추세 signal | 시스템 지표 수집 (`SystemMetrics.php:417`) | **baseline signal만** — 추세 경고 미산출 |
| Repeated Auto-Healing Failure | 복구 실행 원장(§26 연계) | ABSENT — 원장 부재 |
| Recovery Success Rate / Drift / Manual Recovery | (복구 텔레메트리 부재) | ABSENT |

## 3. 설계 계약

- **경고 비차단성**: 5종 경고는 복구 파이프라인을 중단시키지 않으며, 관측 채널로 방출되어 escalate 정책(임계 초과 시 §28 에러로 승격)과 연계한다.
- **Health Score Decreasing**: `SystemMetrics.php:417`의 지표를 시계열 signal로 삼아 하락 추세를 판정. 신규 지표 신설 금지 — 기존 수집 확장.
- **Recovery Success Rate Declining / Repeated Auto-Healing Failure**: §26 Runtime Guard가 남기는 복구 실행 원장(append-only)을 집계 소스로 삼는다. 원장 자체가 ABSENT이므로 선행 구축 필요(BLOCKED_PREREQUISITE).
- **Drift Increasing**: 정책·구성 drift는 Continuous Governance 상위 계약의 drift 지표를 참조하며, 증가 추세를 경고로 방출.
- **Manual Recovery Increasing**: 수동 개입 비율 상승은 자동화 신뢰 저하의 선행 지표 — 경고 후 governance review로 escalate.
- **정합**: 경고 임계가 지속 악화되면 `GOVERNANCE_HEALTH_CRITICAL`(§28)로 승격되어 fail-closed 경계와 연결.

## 4. 판정

**ABSENT (grep 0)** — 5종 추세 경고·복구 텔레메트리·성공률 집계·drift 지표 전무. 재사용 가능한 substrate는 Health Score 추세 signal `SystemMetrics.php:417` baseline 1건에 한정. Repeated Auto-Healing Failure·Recovery Success Rate는 §26 복구 실행 원장(ABSENT)에 의존하므로 선행 구축 필요. 전 항목 **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
