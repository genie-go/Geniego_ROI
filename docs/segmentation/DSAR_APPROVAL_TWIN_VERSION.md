# DSAR — Authorization Twin Version Integrity (Part 3-22 §18·§30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

APPROVAL_TWIN_VERSION은 **인가 트윈의 버전 무결성(Version Integrity)**을 규정하는 계약이다(§18 버전, §30 Twin Version Integrity). 트윈은 시간에 따라 진화하는 상태 모델이므로, 각 트윈 버전은 (twin_version_id, derived_from_policy_version, created_at, content_hash, prev_version_hash)로 식별·연쇄되어야 하며, 버전 간 전이는 **불변(immutable)·추적가능(traceable)**이어야 한다.

버전 무결성이 보장하는 것:
- **식별성** — 임의 인가 결정이 어느 트윈 버전에서 산출됐는지 역추적.
- **불변성** — 봉인된 트윈 버전은 사후 변조 불가.
- **연쇄성** — 버전 체인이 끊기거나 재배열되면 탐지 가능(tamper-evident).
- **재현성** — 특정 버전으로 과거 결정을 재현(§24 Reconciliation의 Snapshot State 근거).

## 2. Substrate 매핑

| SPEC 계약 요소 | 현행 substrate | 상태 |
|---|---|---|
| 불변·연쇄 무결성 기반(append-only) | `SecurityAudit.php:27` 이벤트 append | 존재(기반만) |
| 해시체인 봉인(prev_hash 연쇄·tamper-evident) | `SecurityAudit.php:56-67` | 존재(봉인 기반) |
| Twin version 스키마·version_id 발급 | — | **ABSENT (grep 0)** |
| 버전 content_hash·전이 이력 | — | **ABSENT (grep 0)** |
| 버전별 트윈 상태 저장(재현 근거) | — | **ABSENT (grep 0)** |

## 3. 설계 계약

- **버전 발급(Mint)**: 트윈 상태가 갱신될 때마다 twin_version_id를 발급하고 derived_from_policy_version으로 원본 정책 버전에 결속. 정책 버전 자체는 별도 도메인(Part 3-x)이며 본 §은 트윈 버전만 관장.
- **불변 봉인(Immutable Seal)**: 각 트윈 버전의 content_hash와 prev_version_hash를 `SecurityAudit.php:27`에 append하고 `SecurityAudit.php:56-67` 해시체인으로 연쇄. Immutable 보장은 신규 저장소가 아니라 **기존 SecurityAudit 해시체인의 확장**으로 달성(중복 무결성 엔진 금지).
- **연쇄 검증(Verify Chain)**: 버전 체인의 prev_version_hash 연속성을 검증하여 재배열·삭제 탐지. 검증 정본은 SecurityAudit의 체인 검증 경로를 재사용.
- **재현(Reproduce)**: 특정 twin_version_id로 §24 Snapshot State를 복원.

## 4. KEEP_SEPARATE

- **demo 형제 환경**(`Db.php:20-21`) — 데모/운영 환경 분기. 서로 다른 env 인스턴스일 뿐 트윈의 **버전 사본**이 아니다. "형제 twin"으로 오인 금지 — 환경 격리와 트윈 버전 무결성은 별개.
- **ML 모델 버전 관리**(`ModelMonitor.php:18-19`) — 예측 모델 버전 추적. 인가 트윈 버전과 도메인 상이. 흡수 금지.

## 5. 판정

**ABSENT (twin version 없음)** · BLOCKED_PREREQUISITE. twin_version 스키마·version_id 발급·버전 상태 저장 전부 부재. Immutable·tamper-evident 요건은 신규 엔진이 아닌 `SecurityAudit.php:27`·`:56-67` 해시체인 확장으로 충족해야 하며, 이는 substrate만 존재하고 트윈 버전 계층은 순신설이 필요함을 뜻한다. §22~§24 선행 부재로 착수 불가. 코드 변경 0 · NOT_CERTIFIED.
