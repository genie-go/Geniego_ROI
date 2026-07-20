# DSAR — Authorization Knowledge Graph Reconciliation (Part 3-21 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §24)

APPROVAL_GRAPH_RECONCILIATION은 인가 지식그래프의 **여러 표현(representation)을 상호 대조하여 불일치를 식별**하는 읽기전용 대사 계약이다. 계약 대상 4개 비교 축:

- **Live Graph 비교** — 현시점 실시간 유효권한 해석 결과.
- **Snapshot 비교** — 특정 시점 고정 스냅샷 형상.
- **Graph Version 비교** — §17/§30 버전 라벨 간 형상.
- **Source Data 비교** — 그래프 파생 원천(권한/위계/스키마) 원자료.

Reconciliation은 4축 간 델타를 산출하되 어떤 인가 상태도 변경하지 않으며(read-only), 산출 델타는 §21 Drift·§23 Revalidation의 입력이 된다(SPEC §24 파이프라인 계약).

## 2. Substrate 매핑 표

| 비교 축 | 현행 substrate | file:line | 대사 대상 존재? |
|---|---|---|---|
| Live Graph(실시간 유효권한) | effectiveForUser SOURCE | `TeamPermissions.php:393-421` | SOURCE만(그래프 아님) |
| Snapshot(시점 고정 형상) | (없음 — grep 0) | — | **ABSENT** |
| Graph Version(버전 형상) | (없음 — §17/§30 미구현) | — | **ABSENT** |
| Source Data(원자료) | 순수 MySQL 스키마·질의 | `Db.php:126-127` | 실재(원천만) |
| 변경 대사 앵커 | append-only 해시체인 | `SecurityAudit.php:25-31` | 앵커만 |

## 3. 설계 계약

1. **비교 대상 불완전 인정**: 4축 중 Live Graph SOURCE(`TeamPermissions.php:393-421`)와 Source Data(`Db.php:126-127`)만 실재하고, Snapshot·Graph Version(§17/§30)은 부재하므로 현시점 reconciliation은 **부분 대사조차 성립 불가**(비교 대상 2/4 미완). 완전 대사는 §17/§30 선행이 전제다.
2. **Read-only 델타 산출**: 대사 엔진은 SOURCE·원자료를 읽기만 하며, 델타를 §21 Drift·§23 Revalidation으로 전달할 뿐 인가 상태를 개작하지 않는다(무후퇴).
3. **감사 앵커링**: 각 델타 항목은 `SecurityAudit.php:25-31` append-only 원천 이벤트에 앵커링되어 재현 가능해야 한다(Explainable·근거 없는 불일치 경보 금지).
4. **SSOT 존중**: Live Graph의 정본은 유효권한 SOURCE(`TeamPermissions.php:393-421`)이며, 대사 결과가 SOURCE를 대체하지 않는다(단일 진실원 유지).

## 4. KEEP_SEPARATE

- **authz reconciliation ≠ 정산 reconciliation**: 재무 정산 대사(`PgSettlement.php:294-295`·`KrChannel.php:415-419`)는 결제·채널 금액 대사 도메인으로 명명만 동일할 뿐 인가 그래프 대사와 완전히 별개다 — 재사용·병합 절대 금지. 외부 커넥터 대사(`Connectors.php:902`)도 동일 경계.
- 마케팅 귀속(`AttributionEngine.php:242`)·데이터 대사(`DataPlatform.php:313-345`)는 각각 별도 도메인으로 authz 대사와 통합하지 않는다.

## 5. 판정

**ABSENT (graph/snapshot 부재로 비교 대상 미완)**. 인가 지식그래프의 Live/Snapshot/Version/Source 4축 대사 엔진은 존재하지 않는다. 4축 중 Live SOURCE(`TeamPermissions.php:393-421`)·Source Data(`Db.php:126-127`)만 실재하고 Snapshot·Version(§17/§30)이 부재하여 대사 성립 자체가 불가하며, 대사 계층은 **순신설**이다. 정산 reconciliation(`PgSettlement.php:294-295`·`KrChannel.php:415-419`·`Connectors.php:902`)과 명명 동일하나 도메인 완전 분리 — KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 §17/§30 Snapshot·Version·KG substrate 부재).
