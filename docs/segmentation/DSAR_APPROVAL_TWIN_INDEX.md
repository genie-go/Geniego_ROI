# DSAR — APPROVAL_TWIN_INDEX (Part 3-22 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §31 Index)

`APPROVAL_TWIN_INDEX`는 권한 승인 디지털 트윈 영속 계층의 **조회 인덱스 계약**이다. 트윈 동기화·시나리오 분기·예측 산출·이벤트 리플레이·스냅샷 판독·용량 예측 질의가 요구하는 인덱스 축을 계약한다.

- **Twin Index** — 트윈 인스턴스(테넌트·버전) 조회 축.
- **Scenario Index** — what-if 시나리오 분기 조회 축.
- **Prediction Index** — 예측 레코드(대상·시각) 조회 축.
- **Replay Index** — 이벤트 리플레이 이력 시퀀스 조회 축.
- **Snapshot Index** — 스냅샷 시점·버전 조회 축.
- **Forecast Index** — 용량/리스크 예측 시계열 조회 축.

## 2. Substrate 매핑

| 계약 인덱스 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Twin Index | 없음(authz 트윈 테이블 부재) | — | ABSENT |
| Scenario Index | 없음(시나리오 테이블 부재) | — | ABSENT |
| Prediction Index | 없음(authz 예측 테이블 부재·`risk_prediction`은 마케팅) | `Db.php:458` | ABSENT |
| Replay Index | 없음(authz 리플레이 테이블 부재) | — | ABSENT |
| Snapshot Index | 없음(트윈 스냅샷 부재) | — | ABSENT |
| Forecast Index | 없음(용량/리스크 예측 축 부재) | — | ABSENT |
| 인덱스 정의 기반 | self-healing 스키마(테이블·인덱스 자동 보정) | `Db.php:116-166` | PARTIAL-substrate(정의 기반만) |

authz twin/scenario/prediction/replay/snapshot/forecast 테이블 및 인덱스는 grep 0으로 **전무**하다. 현 DB는 self-healing 스키마(`Db.php:116-166`)로 테이블·인덱스를 핸들러별 `ensureTables`에서 자동 보정하나, 대상 트윈 테이블 자체가 없어 인덱스도 부재하다. `Db.php:458`의 `risk_prediction`은 마케팅 예측으로 authz Prediction Index와 무관하다.

## 3. 설계 계약

1. **인덱스 정의는 self-healing 스키마(`Db.php:116-166`)를 확장**한다 — 트윈 테이블 신설 시 인덱스는 동일 `ensureTables` 패턴으로 idempotent하게 보정하며, 별도 마이그레이션 도구를 신설하지 않는다.
2. **Twin/Scenario/Prediction/Replay/Snapshot/Forecast Index**는 각각 §30(DB Constraint)의 신설 테이블에 **종속**하며, 테이블 순신설이 완료되기 전까지 정의 불가(BLOCKED_PREREQUISITE).
3. Tenant Isolation 축은 모든 인덱스의 선두 컬럼으로 강제하여 크로스테넌트 스캔을 물리적으로 차단한다.

## 4. 판정

**ABSENT**(authz twin 인덱스 전무). 인덱스 정의 기반만 self-healing 스키마(`Db.php:116-166`)에서 확장 가능하고, 6종 인덱스는 전부 순신설이며 §30 신설 테이블에 종속한다. `risk_prediction`(`Db.php:458`)은 마케팅 도메인으로 오귀속 금지. 선행 트윈 테이블 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
