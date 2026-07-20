# DSAR — Approval Fabric Digest (Part 3-16 §20)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §20)

`APPROVAL_FABRIC_DIGEST`는 fabric의 여러 산출물을 하나의 결정론적 요약(digest)으로 압축해 무결성·비교·감사 기준점을 제공한다. SPEC §20 입력:

- **Fabric State**: 현재 fabric 런타임 상태.
- **Snapshot**: §18 `APPROVAL_FABRIC_SNAPSHOT` 봉인 결과.
- **Analytics**: §21 `APPROVAL_FABRIC_ANALYTICS` 집계 지표.
- **Evidence**: §19 `APPROVAL_FABRIC_EVIDENCE` 증거 체인.

Digest는 위 4입력을 정규화 후 단일 해시로 축약하며, 동일 입력 → 동일 digest(결정론)를 보장한다.

## 2. Substrate 매핑

| SPEC 요구 (§20) | 라이브 substrate | 상태 |
|---|---|---|
| Fabric State digest | 없음 — fabric 런타임 부재 | ABSENT |
| Snapshot 입력(§18) | 없음(§18 자체 ABSENT) | ABSENT |
| Analytics 입력(§21) | 없음(§21 자체 ABSENT) | ABSENT |
| Evidence 입력(§19) | `SecurityAudit.php:4-33` 단일노드 체인(부분) | 참고만 |
| 결정론적 해시 축약 규약 | `SecurityAudit.php:4-33` 해시 패턴 참고 | 참고만 |

## 3. 설계 계약

- **저장·계산 모델**: `authz_fabric_digest`(신설) — `digest_version`·`fabric_state_hash`·`snapshot_ref`·`analytics_ref`·`evidence_ref`·`combined_digest`·`created_ts`. 해시 축약은 `SecurityAudit.php:4-33` 패턴을 **참고**하되, 4입력 정규화(canonical order)를 선결.
- **결정론**: 입력 4종을 각각 안정 정렬 후 연결→해시. 입력 누락 시 digest는 NOT_CERTIFIED(부분 입력 금지).
- **선행 의존**: §18 Snapshot·§19 Evidence·§21 Analytics가 모두 ABSENT이므로 digest는 입력 전무 — BLOCKED_PREREQUISITE.
- **재구현 금지**: SecurityAudit 해시체인 외 별도 해시엔진 신설 금지, 기존 패턴 확장.

## 4. 판정

**ABSENT.** 라이브에 fabric digest는 존재하지 않으며(fabric 자체 부재), 4입력(Fabric State/Snapshot/Analytics/Evidence)이 모두 부재하여 계산 불가. `SecurityAudit.php:4-33`은 해시 축약 패턴 **참고**로만 인용. 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
