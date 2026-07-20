# DSAR — Authorization Mesh Version & Policy Version Integrity (Part 3-24 §18·§30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

APPROVAL_MESH_VERSION(§18)과 Policy Version Integrity(§30)는 메시 정책 상태를 **불변 버전(immutable version)** 으로 고정하고, 각 버전의 무결성(위변조 불가)을 보장하는 계약이다.

- **Mesh Version** — 특정 시점 전체 메시 정책 상태의 단조 증가 버전 식별자.
- **Policy Version Integrity** — 각 버전 콘텐츠의 해시 봉인·append-only 체인으로 사후 변조 탐지.
- **Version Lineage** — 이전 버전 해시를 다음 버전이 포함하는 연쇄로 계보 무결성 확립.

버전은 §24 Reconciliation의 Snapshot/Runtime 비교 및 §22 Drift baseline의 정본 좌표를 제공한다.

## 2. Substrate 매핑

| 요소 | 요구 substrate | 현행 실재 | 판정 |
|---|---|---|---|
| Mesh Version 식별자 | 단조 증가 버전 저장 | 부재(grep 0) | ABSENT-greenfield |
| Policy Version Integrity | append-only 해시체인·preimage 보존 | 감사 해시체인 `SecurityAudit.php:27`·`:63-64` 확장 | 확장 대상 |
| Version Lineage | 이전 해시 연쇄 | 감사 체인 연쇄 패턴 재사용 | 확장 대상 |

## 3. 설계 계약 (greenfield)

- Mesh Version은 정책 상태 콘텐츠를 canonical 직렬화한 해시로 봉인하고, 이전 버전 해시를 포함해 계보를 잇는 것으로 설계한다. 실 배선은 후속 승인 세션.
- 불변·위변조 탐지는 기존 감사 해시체인(`SecurityAudit.php:27`·`:63-64`)의 append-only + preimage 보존 패턴을 확장 근거로 삼는다. 신규 체인 난립 금지 — 검증 정본은 해당 파일의 verify 경로.
- 버전 preimage(콘텐츠·이전 해시·타임스탬프)를 소실하지 않도록 명세 — preimage 소실 체인은 검증 불가능한 장식임을 경계한다.

## 4. KEEP_SEPARATE

- ML 합의/집계 버전(`AttributionEngine.php:1560`)은 어트리뷰션 모델 도메인이다. Mesh 정책 버전과 흡수·통합 금지 — 독립 유지.
- 정산 대사(`PgSettlement.php`·`Connectors.php:896-902`) 및 ML 모델 드리프트(`ModelMonitor.php:18-19`)의 어떤 버전 개념도 Mesh Version으로 병합 금지.

## 5. 판정

**ABSENT-greenfield.** Mesh version 코드·스키마 전무(grep 0). 순신설이며 코드 변경 0·NOT_CERTIFIED. 불변·무결성만 기존 감사 해시체인(`SecurityAudit.php:27`·`:63-64`)을 확장 근거로 재사용(신규 체인 금지). ML 합의(`AttributionEngine.php:1560`)와 영구 분리. §22 Drift baseline·§24 Reconciliation Snapshot 좌표를 제공하는 선행 요소. 실 구현은 선행 Mesh Foundation 이후 별도 승인 세션.
