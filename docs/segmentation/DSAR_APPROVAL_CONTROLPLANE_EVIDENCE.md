# DSAR — Authorization Control Evidence (Part 3-19 §23·§35)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_CONTROL_EVIDENCE

Control Evidence 는 authz Control Plane 의 **배포·전개·승인·롤백 각 사건을 위·변조 불가능하게 기록한 증거원장**이다. §23·§35(Immutable Deployment History) 계약상 다음 5종 증거를 포착한다:

1. **Deployment Evidence** — 정책/config 판본이 언제·누가·어떤 판본으로 배포되었는지.
2. **Rollout Evidence** — 단계적 전개(부분→전면)의 각 단계 사건.
3. **Approval Evidence** — 배포 전 승인 결정(승인자·시각·근거)의 불변 기록.
4. **Rollback Evidence** — 롤백 발생 시 이전 판본으로의 복귀 사건.
5. **Immutable Deployment History** — 위 4종을 시계열 append-only 로 봉인한 전개 이력.

계약상 Evidence 는 **append-only·순서 보장(prev-hash 연쇄)·검증 가능(verify)**해야 하며, 임의 삭제·수정이 물리적으로 차단되어야 한다.

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Append-only 증거원장 | **PRESENT-substrate** | `SecurityAudit.php:14-64`(해시체인 원장)·`:56`(verify) |
| Prev-hash 순서 연쇄 | PRESENT | `SecurityAudit.php:29-31`(이전 해시 연결)·`:43-51`(무결성 산출) |
| 레코드 구성(actor/event/ts) | PRESENT | `SecurityAudit.php:14-31`·`:35-38` |
| 검증 함수 | PRESENT | `SecurityAudit.php:56`·`:56-64`(체인 verify) |
| Deploy 마커/헬스 신호 | PRESENT | `Health.php:56-67`(배포 마커)·`:102-103` |
| Immutable Deployment History(정책/config publish 전개) | **ABSENT**(§35 부재) | authz 정책·config publish 사건을 전개 이력으로 봉인하는 계층 없음 |
| Approval Evidence 연결 | PARTIAL | 승인 판정 substrate `TeamPermissions.php:695-701` 존재하나 배포 승인 이력으로 봉인 안 됨 |

**판정 근거**: 증거 봉인의 핵심 substrate — append-only 해시체인 — 은 `SecurityAudit.php:14-64` 로 **이미 실재**한다(`:29-31` prev-hash 연쇄, `:43-51` 무결성 산출, `:56` verify). 배포 관측 신호도 `Health.php:56-67` 마커로 존재한다. 그러나 authz **정책·config publish 사건을 전개 이력(Immutable Deployment History §35)으로 봉인하는 계층은 부재**하다. 따라서 판정은 **PRESENT-substrate**: 기존 해시체인을 정책/config publish 이벤트 불변기록으로 확장하고, Deployment History 는 순신설한다.

## 3. 설계 계약(규칙)

- **R1 (기존 원장 확장)**: Evidence 는 `SecurityAudit.php:14-64` 해시체인을 **확장**해 배포/롤아웃/승인/롤백 이벤트를 append-only 기록한다. 별도 원장 신설 금지(중복 엔진 금지).
- **R2 (순서·검증 보존)**: 모든 증거 레코드는 `SecurityAudit.php:29-31` prev-hash 연쇄를 따르며 `:56` verify 로 검증 가능해야 한다.
- **R3 (Deploy 신호 소비)**: 배포 사건 관측은 `Health.php:56-67` 마커를 소비한다. 별도 헬스/배포 감지 체계 재구현 금지.
- **R4 (Approval 연결)**: Approval Evidence 는 `TeamPermissions.php:695-701` 승인 판정 결과를 증거로 봉인하되, 판정 자체를 재구현하지 않는다.
- **R5 (Immutable History 순신설)**: §35 Deployment History 는 순신설이며, 물리 삭제·in-place 수정 불가(append-only 강제).

## 4. KEEP_SEPARATE (흡수 절대 금지)

- **ML 배포/모니터 증거** — `ModelMonitor.php:17-19`·`:21`·`:42-44`. 모델 배포 이력은 별개 도메인. authz Deployment History 로 통합 금지.
- **재무 정산 증거** — `PgSettlement.php:215`·`:295`. 정산 전개/롤백 원장은 재무 reconciliation. authz 증거와 혼용 금지.
- **재고 이동 증거** — `Wms.php:2160`. WMS 트랜잭션 이력. authz 무관.
- **커넥터 동기화 증거** — `Connectors.php:902`. 외부 채널 sync 이력. authz Control Evidence 와 분리 유지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_CONTROL_EVIDENCE 의 봉인 substrate 는 `SecurityAudit.php:14-64`(append-only·`:56` verify)와 `Health.php:56-67`(deploy 마커)로 **실재(PRESENT-substrate)**한다. 이를 authz 정책/config publish 이벤트 불변기록으로 **확장**하고, Immutable Deployment History(§35)는 **순신설**한다. 실 구현은 선행 foundation 완료 후 별도 승인 세션에서 진행한다. 코드 변경 0.
