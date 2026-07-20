# DSAR — Approval Federation Snapshot (Part 3-18 §20·§33)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §20·§33 Immutable Trust History)

**APPROVAL_FEDERATION_SNAPSHOT**은 특정 시점의 인가 연합(Authorization Federation) 상태를 불변(immutable)하게 봉인한 레코드다. 하나의 스냅샷은 다음 6필드를 포함한다.

| 필드 | 의미 | 불변성 요구 |
|------|------|-------------|
| Domain | 연합 참여 신뢰 도메인 식별자 | 봉인 후 변경 불가 |
| Trust State | 봉인 시점의 도메인 신뢰 상태(READY/WARNING/BLOCKED) | append-only |
| Policy Version | 적용된 인가 정책 버전 해시 | 정책 버전과 1:1 고정 |
| Decision | 연합 인가 판정 결과 | 재계산 금지·봉인값 |
| Context | 판정 컨텍스트(요청 주체·리소스·스코프) | 기록 후 불변 |
| Timestamp | 봉인 시각(UTC) | 단조 증가·위조 불가 |

§33은 이 스냅샷 열(sequence)이 **Immutable Trust History** — 도메인간 신뢰 판정의 시간순 원장 — 을 구성해야 한다고 요구한다. 각 스냅샷은 직전 스냅샷 다이제스트를 참조하는 해시 연결(hash-linked)로 tamper-evident해야 한다.

## 2. Substrate 매핑

| SPEC 요구 | 현존 substrate | file:line | 상태 |
|-----------|----------------|-----------|------|
| Immutable append-only 레코드 | SecurityAudit 해시체인 | `backend/src/SecurityAudit.php:14-67` | 확장 가능 |
| 체인 무결성 검증 | `verify()` | `backend/src/SecurityAudit.php:56` | 재사용 가능 |
| Federation Snapshot 자료구조 | 없음(grep 0) | — | **ABSENT** |
| Domain/Trust State/Policy Version 봉인 | 없음(grep 0) | — | **ABSENT** |
| Cross-domain 교환 | 없음 | — | **ABSENT** |

현존하는 유일한 불변 substrate는 SecurityAudit 해시체인이다(`backend/src/SecurityAudit.php:14-67`, 삽입·연결 로직 `:27`·`:35`·`:40`, 다이제스트 `:43-52`, 검증 `:56`, 봉인 필드 `:62-67`). 이는 **단일 노드 append-only 로그**이며 도메인간 교환 개념이 없다. Federation Snapshot 자료구조·Domain/Trust State/Policy Version 봉인 필드는 grep 0 = 순신설이다.

## 3. 설계 계약 (신설)

1. `federation_snapshot` 레코드는 §20 6필드를 봉인하고, 봉인 시 SecurityAudit 해시체인(`:14-67`)에 다이제스트를 append하여 Immutable Trust History(§33)를 형성한다.
2. Snapshot 봉인은 **일방향**: 생성 후 어떤 필드도 변경 불가. 정정은 신규 스냅샷 append로만.
3. Trust State는 봉인 시점 값의 사진(photograph)이며, 이후 도메인 상태 변화가 과거 스냅샷을 소급 변경하지 못한다.
4. Timestamp는 단조 증가하며 체인 순서와 일치해야 한다(`verify()` `:56`가 순서·연결 동시 검증).

## 4. KEEP_SEPARATE

- **DataTrust**(`backend/src/Handlers/DataPlatform.php:281`)의 신뢰 산출은 데이터 품질 도메인 지표로, Federation의 Trust State와 의미가 다르다 — 통합 금지.
- **GraphScore**(`backend/src/Handlers/GraphScore.php:31`)·attribution 지표는 마케팅 도메인 소유 — Snapshot에 병합하지 않는다.

## 5. 판정

**ABSENT** — Federation Snapshot 자료구조는 grep 0으로 부재. Immutable 봉인 기반만 SecurityAudit 해시체인(`backend/src/SecurityAudit.php:14-67`)을 확장하여 순신설한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
