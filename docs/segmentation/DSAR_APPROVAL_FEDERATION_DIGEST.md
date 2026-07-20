# DSAR — Approval Federation Digest (Part 3-18 §22)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §22)

**APPROVAL_FEDERATION_DIGEST**는 연합 상태의 다층 입력을 단일 검증 가능 다이제스트로 응축(condense)한 산출물이다. 감사자가 전체 원장을 재순회하지 않고도 연합 상태의 무결성을 한 값으로 확인하도록 한다.

입력(§22):

| 입력 | 출처 도메인 |
|------|-------------|
| Federation State | 연합 참여 도메인 집합·연결 상태 |
| Trust | 도메인별 신뢰 상태 집계 |
| Snapshot | §20 스냅샷 열(Immutable Trust History) |
| Evidence | §21 증거 원장 |
| Analytics | §23 연합 지표 집계 |

Digest는 결정론적(deterministic)이어야 한다 — 동일 입력 → 동일 다이제스트. 그리고 하위 입력 중 하나라도 변조되면 다이제스트가 불일치해야 한다(cascade tamper-evidence).

## 2. Substrate 매핑

| SPEC 요구 | 현존 substrate | file:line | 상태 |
|-----------|----------------|-----------|------|
| 결정론적 해시 다이제스트 기법 | SecurityAudit 다이제스트 | `backend/src/SecurityAudit.php:43-52` | 참고만 |
| 체인 검증 | `verify()` | `backend/src/SecurityAudit.php:56` | 참고만 |
| Federation Digest 산출기 | 없음(grep 0) | — | **ABSENT** |
| 다층 입력 응축(State/Trust/Snapshot/Evidence/Analytics) | 없음(grep 0) | — | **ABSENT** |

Federation Digest 산출기·다층 입력 응축 로직은 grep 0 = 전면 부재. SecurityAudit의 다이제스트 계산 방식(`backend/src/SecurityAudit.php:43-52`)과 검증(`:56`)은 **결정론적 해시·tamper-evidence 패턴의 참고 모델**로만 인용하며, Digest는 그 위에 새로 구축한다(직접 확장 아님 — Snapshot §20·Evidence §21·Analytics §23이 모두 신설 선행조건).

## 3. 설계 계약 (순신설)

1. Digest는 Federation State·Trust·Snapshot·Evidence·Analytics 다섯 입력을 결정론적 순서로 직렬화 후 해시 응축한다.
2. 각 하위 입력의 다이제스트를 포함(Merkle-유사)하여 어느 입력이 변조되어도 상위 Digest가 불일치하도록 한다.
3. Digest 계산은 SecurityAudit 다이제스트 관례(`:43-52`)를 참고하되 별도 산출기로 신설 — 기존 체인에 직접 얹지 않는다.
4. **선행조건**: Snapshot(§20)·Evidence(§21)·Analytics(§23) 부재 시 Digest는 계산 불가 → BLOCKED_PREREQUISITE.

## 4. KEEP_SEPARATE

- **DataTrust**(`backend/src/Handlers/DataPlatform.php:281`)의 데이터 품질 다이제스트/Trust와 Federation Digest는 별개 — 입력 Trust에 데이터 품질 지표를 혼입 금지.
- **GraphScore**(`backend/src/Handlers/GraphScore.php:31`)·attribution 산출은 마케팅 도메인 — Digest 입력에서 제외.

## 5. 판정

**ABSENT** — Federation Digest 및 다층 입력 응축 로직은 grep 0으로 전면 부재. SecurityAudit 다이제스트(`backend/src/SecurityAudit.php:14-67`, 특히 `:43-52`·`:56`)는 결정론적 tamper-evidence 패턴 **참고**로만 인용하며 순신설한다. Snapshot·Evidence·Analytics 선행 부재로 BLOCKED_PREREQUISITE. 코드 변경 0 · NOT_CERTIFIED.
