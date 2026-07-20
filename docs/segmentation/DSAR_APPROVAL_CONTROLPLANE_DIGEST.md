# DSAR — Authorization Control Digest (Part 3-19 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_CONTROL_DIGEST

Control Digest 는 authz Control Plane 상태를 **요약·정규화한 파생 산출물**로, 4개 상위 입력을 취합해 사람·시스템이 소비 가능한 축약 뷰를 생성한다. §24 계약상 입력은:

1. **Configuration** — 활성 authz 구성 원천.
2. **Snapshot** (§22) — 시점 봉인된 상태 판본.
3. **Evidence** (§23) — 배포/롤아웃/승인/롤백 증거원장.
4. **Analytics** (§25) — Control Plane 운영 지표.

Digest 는 위 4입력을 결정론적으로 축약하되, **원본을 대체하지 않는 파생물(read-model)**이다. Digest 는 authz 판정의 근거가 될 수 없으며(집행 SSOT 아님), 항상 상위 4입력으로 재산출 가능해야 한다.

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| Control Digest 산출기 | **ABSENT** (grep 0) | Control Plane 상태를 취합·축약하는 digest 계층 부재 |
| 입력① Configuration | 산재(미봉인) | `index.php:69-88`·`TeamPermissions.php:695-701`(라이브 authz 원천·digest 입력 형태 아님) |
| 입력② Snapshot | ABSENT | §22 참조 — Snapshot 자체가 부재(순신설 예정) |
| 입력③ Evidence | PRESENT-substrate | `SecurityAudit.php:14-64`(해시체인)·`:56`(verify) — 참고만 |
| 입력④ Analytics | ABSENT | §25 참조 — control 지표 집계 부재 |
| 무결성 참조(digest 해시 개념) | 참고 | `SecurityAudit.php:43-51`(무결성 산출·digest 알고리즘 참고만) |

**판정 근거**: Control Plane 상태를 취합·정규화하는 Digest 계층은 존재하지 않는다(grep 0). 4개 입력 중 Snapshot(§22)·Analytics(§25)는 그 자체가 ABSENT 이고, Evidence 만 `SecurityAudit.php:14-64` substrate 로 부분 실재하나 이는 원장일 뿐 digest 가 아니다. Configuration 은 `index.php:69-88`·`TeamPermissions.php:695-701` 에 산재해 취합되지 않는다. `SecurityAudit.php:43-51` 의 무결성 산출은 digest 해시 알고리즘 **참고**만 가능하다. 판정 **ABSENT** — 순신설.

## 3. 설계 계약(규칙)

- **R1 (파생·비대체)**: Digest 는 read-model 파생물이며 authz 판정의 SSOT 가 되지 않는다. 집행은 라이브 원천(`index.php:69-88`·`TeamPermissions.php:695-701`)이 담당.
- **R2 (재산출 가능)**: Digest 는 4입력(Config·Snapshot·Evidence·Analytics)으로 항상 결정론적 재산출이 가능해야 한다. 상태 축적 금지.
- **R3 (선행 의존)**: Digest 는 입력② Snapshot(§22)·④ Analytics(§25) 신설을 선행조건으로 하므로, 그 전에는 BLOCKED_PREREQUISITE.
- **R4 (무결성 참고)**: digest 해시/무결성 산출은 `SecurityAudit.php:43-51` 방식을 **참고**하되 증거원장을 재구현하지 않는다.
- **R5 (검증 데이터 게이트)**: Analytics 입력 중 AI 파생 지표는 상위 데이터 헌법 V3 신뢰검증(READY) 통과분만 취합한다.

## 4. KEEP_SEPARATE (흡수 절대 금지)

- **ML 모델 다이제스트** — `ModelMonitor.php:17-19`·`:21`·`:42-44`. 모델 요약 지표는 별개 도메인. authz Digest 로 통합 금지.
- **재무 정산 다이제스트** — `PgSettlement.php:215`·`:295`. 정산 요약은 재무 reconciliation. 혼용 금지.
- **재고 요약** — `Wms.php:2160`. WMS 상태 요약. authz 무관.
- **커넥터 sync 요약** — `Connectors.php:902`. 채널 동기화 요약. authz Control Digest 와 분리 유지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_CONTROL_DIGEST 는 부재(grep 0)하며, 4입력 중 Snapshot(§22)·Analytics(§25)가 선행 미충족이다. `SecurityAudit.php:14-64`(`:43-51` 무결성)는 **참고**만 한다. 순신설 설계이며 입력 foundation 완료 후 별도 승인 세션에서 진행한다. 코드 변경 0.
