# DSAR — APPROVAL_TWIN_DB_CONSTRAINT (Part 3-22 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §30 Database Constraint)

`APPROVAL_TWIN_DB_CONSTRAINT`는 권한 승인 디지털 트윈(Authorization Digital Twin) 영속 계층이 준수해야 할 **데이터베이스 불변식(invariant)** 집합이다. 다음 다섯 제약을 계약한다.

- **Immutable Replay History** — 이벤트 리플레이 이력은 append-only이며 사후 UPDATE/DELETE 금지.
- **Immutable Prediction Record** — 예측 산출 레코드는 봉인 후 변경 불가(재예측은 새 버전으로만).
- **Snapshot Integrity** — 트윈 스냅샷은 결정론적 다이제스트로 무결성 증명.
- **Twin Version Integrity** — 트윈 버전축은 단조 증가·재현 결정성 보장.
- **Tenant Isolation** — 트윈/리플레이/예측 레코드는 테넌트 경계를 절대 넘지 않음.

## 2. Substrate 매핑

| 계약 제약 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Tenant Isolation | env 기반 DB 격리(테넌트별 접속 분기) | `Db.php:81-84`·`:20-21` | PARTIAL(격리 기반 존재) |
| Immutable(Replay/Prediction) | SecurityAudit append-only 해시 체인 | `SecurityAudit.php:27`·`:48-52` | PARTIAL(불변 기반만) |
| Immutable Replay History | 없음(authz 리플레이 테이블 부재) | — | ABSENT·순신설 |
| Immutable Prediction Record | 없음(authz 예측 테이블 부재) | — | ABSENT·순신설 |
| Snapshot Integrity | 없음(트윈 스냅샷 부재) | — | ABSENT·순신설 |
| Twin Version Integrity | 없음(트윈 버전축 부재) | — | ABSENT·순신설 |

현 DB는 순수 MySQL + self-healing 스키마(`Db.php:116-166`)이며, authz twin/replay/prediction/snapshot 테이블은 grep 0으로 **전무**하다. `Db.php:458`의 `risk_prediction`은 **마케팅 리스크 예측**이지 권한 트윈이 아니므로 흡수·재사용 금지(KEEP_SEPARATE §4).

## 3. 설계 계약

1. **Tenant Isolation은 `Db.php:81-84`의 env 격리를 확장**한다 — 트윈/리플레이/예측 신설 테이블은 기존 테넌트 접속 분기(`:20-21`) 경계 안에 귀속되며, 크로스테넌트 리플레이·예측 판독은 DB 계층에서 차단한다.
2. **Immutable 제약은 SecurityAudit 해시 체인(`SecurityAudit.php:27`·`:48-52`)을 확장**하여 Replay History·Prediction Record의 append-only + 다이제스트 앵커링으로 강제한다(별도 불변 저장소 신설 금지).
3. **Snapshot Integrity/Twin Version Integrity**의 실제 테이블·제약·트리거는 전부 **순신설**(선행 트윈 엔진 부재).

## 4. KEEP_SEPARATE

- **`risk_prediction`** — `Db.php:458`, 마케팅 리스크 예측 테이블. 권한 트윈 예측과 무관하며 흡수 금지.
- **`po_simulations`** — price 도메인 시뮬레이션. what-if 시나리오와 명명만 유사, 권한 트윈 아님.

## 5. 판정

**PARTIAL**. Tenant Isolation은 env DB 격리(`Db.php:81-84`·`:20-21`)에, Immutable은 SecurityAudit 해시 체인(`SecurityAudit.php:27`·`:48-52`)에 각각 확장 기반이 존재한다. 그러나 Immutable Replay History·Immutable Prediction Record·Snapshot Integrity·Twin Version Integrity의 실 테이블·제약은 전부 순신설이며 선행 트윈 엔진 부재로 **BLOCKED_PREREQUISITE**. `risk_prediction`(`Db.php:458`)은 마케팅 도메인으로 오귀속 금지. 코드 변경 0 · NOT_CERTIFIED.
