# DSAR — Authorization Control Snapshot (Part 3-19 §22·§35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_CONTROL_SNAPSHOT

Control Snapshot 은 authz Control Plane 의 **특정 시점 전체 상태를 불변(immutable)으로 봉인한 판본**이다. §22·§35(Immutable Snapshot) 계약상 스냅샷은 다음 5개 구성요소를 하나의 원자적 판본으로 포착한다:

1. **Configuration** — 활성 authz 설정(정책 세트·게이트·바이패스 목록 등 Control Plane 구성) 전체.
2. **Policy** — 그 시점에 유효(active)한 authz 정책 정의의 완전한 사본.
3. **Runtime State** — PDP/PEP 런타임의 유효 상태(발효 중인 결정 규칙·활성 스코프).
4. **Version** — 스냅샷 판본 식별자(단조 증가·불변).
5. **Timestamp** — 봉인 시각(위·변조 불가하게 고정).

계약상 Snapshot 은 **읽기 전용·append-only**이며, 일단 봉인되면 갱신·삭제되지 않는다. 이후 판본은 항상 **새 스냅샷 신설**로만 생성된다(in-place mutation 금지).

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Control Snapshot 아티팩트 | **ABSENT** (grep 0) | authz Control Plane 상태를 시점 봉인하는 스냅샷 클래스/테이블 부재 |
| Immutable 봉인 substrate | PRESENT(재사용 앵커) | `SecurityAudit.php:14-64`(append-only 해시체인)·`:56`(verify) |
| 해시체인 링크 구조 | PRESENT | `SecurityAudit.php:14-31`(레코드 구성)·`:29-31`(prev-hash 연쇄) |
| Version(단조 판본) | PARTIAL(간접) | 마이그레이션 판번호 `migrate.php:9-15`·`:48`(스키마 판본 개념만·authz 스냅샷 판본 아님) |
| Configuration 원천 | 산재(봉인 안 됨) | authz 구성은 `index.php:69-88`(바이패스)·`TeamPermissions.php:695-701`(권한 판정)에 분산·시점 스냅샷 없음 |
| Timestamp 불변 고정 | PARTIAL | `SecurityAudit.php:35-38`(레코드 시각 기록)·전용 스냅샷 timestamp 계약 부재 |

**판정 근거**: authz Control Plane 의 상태를 하나의 원자적 판본으로 봉인하는 Control Snapshot 은 존재하지 않는다(grep 0). Configuration/Policy/Runtime State 는 각기 `index.php:69-88`·`TeamPermissions.php:695-701` 등에 산재하며 시점 봉인·판본화되지 않는다. 다만 **불변성(immutability) 자체의 substrate** 는 `SecurityAudit.php:14-64` 의 append-only 해시체인(`:29-31` prev-hash 연쇄, `:56` verify)이 이미 존재하므로, Snapshot 은 이 앵커를 확장한 **순신설**로 설계한다. 판정 **ABSENT**.

## 3. 설계 계약(규칙)

- **R1 (원자적 봉인)**: 스냅샷은 Configuration·Policy·Runtime State·Version·Timestamp 5요소를 하나의 트랜잭션으로 포착한다. 부분 스냅샷 금지.
- **R2 (불변 앵커 확장)**: 봉인 무결성은 `SecurityAudit.php:14-64` 해시체인을 확장해 보장한다(`:29-31` 연쇄·`:56` verify 재사용). 별도 불변 저장소 재구현 금지.
- **R3 (판본 단조성)**: Version 은 단조 증가·불변. 기존 판본 in-place 수정 절대 금지 — 변경은 새 스냅샷 신설로만.
- **R4 (구성 SSOT 소비)**: Configuration 은 라이브 authz 원천(`index.php:69-88`·`TeamPermissions.php:695-701`)을 읽어 포착하며, 스냅샷이 authz 판정의 2차 SSOT 가 되지 않는다(집행은 여전히 라이브).
- **R5 (Timestamp 위조 불가)**: 봉인 시각은 `SecurityAudit.php:35-38` 레코드 시각 규약과 정합하게 고정하며 사후 변경 불가.

## 4. KEEP_SEPARATE (흡수 절대 금지)

- **ML 모델 스냅샷/드리프트** — `ModelMonitor.php:17-19`·`:21`·`:42-44`. 모델 상태 스냅샷은 별개 도메인. authz Control Snapshot 으로 통합 금지.
- **재무 정산 스냅샷** — `PgSettlement.php:215`·`:295`. 정산 시점 상태 봉인은 재무 reconciliation 영역. authz 스냅샷과 혼용 금지.
- **재고 스냅샷** — `Wms.php:2160`. WMS 재고 시점 상태. authz 무관.
- **커넥터 상태 스냅샷** — `Connectors.php:902`. 외부 채널 동기화 상태. authz Control Plane 스냅샷과 분리 유지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_CONTROL_SNAPSHOT 는 authz Control Plane 에 부재(grep 0)하다. 불변성 substrate 는 `SecurityAudit.php:14-64`(append-only·`:56` verify)로 실재하므로, Snapshot 은 이 해시체인을 확장한 **순신설** 설계이며 선행 foundation(Registry §1·Configuration SSOT 정립) 완료 후 별도 승인 세션에서 진행한다. 코드 변경 0.
