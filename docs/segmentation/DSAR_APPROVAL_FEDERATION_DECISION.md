# DSAR — Authorization Federation Decision Broker & Cross-Domain PDP (Part 3-18 §16·§17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §16 Decision Broker·§17 Cross-Domain PDP)

`APPROVAL_FEDERATION_DECISION`은 라우팅된 인가 요청을 받아 **실제 permit/deny 판정을 확정**하는 브로커다. SPEC이 규정하는 판정 모드 5종:

- **Local Decision** — 자기 도메인 로컬 PDP가 단독 판정.
- **Remote Decision** — 신뢰 원격 도메인 PDP에 판정 위임·결과 수신.
- **Hybrid Decision** — 로컬+원격 부분판정을 합성.
- **Cached Decision** — 유효 TTL 내 이전 판정 재사용(무효화 계약 포함).
- **Consensus Decision** — 복수 도메인 판정의 정족수 합의.

§17 Cross-Domain PDP는 Remote/Hybrid/Consensus 모드에서 **원격 정책결정점**을 표준 계약(요청/응답 스키마·Deny-override 결합)으로 규정한다.

## 2. Substrate 매핑

| SPEC 판정 요소 | 현행 substrate | 상태 |
|---|---|---|
| Local Decision(로컬 PDP) | `TeamPermissions.php:695`·`:704`(권한 판정)·`:715-731`·`:737-749` | 존재(로컬 전용) |
| PEP 강제(판정→집행) | `index.php:573-597`·`:604-606`·`:619` | 존재(로컬) |
| Remote/Hybrid/Consensus Decision | 없음 — grep 0 | **ABSENT** |
| Cross-Domain PDP 계약 | 없음 — grep 0 | **ABSENT** |
| Cached Decision + 무효화 | 없음(로컬 판정 매요청) | **ABSENT** |

## 3. 설계 계약(순신설)

- **DB-1 Deny-override**: Hybrid/Consensus 합성 시 어느 도메인이든 deny면 최종 deny. permit은 전 참여 도메인 permit일 때만.
- **DB-2 로컬 PDP 불변**: 현행 로컬 PDP(`TeamPermissions.php:695`·`:704`·`:715-731`·`:737-749`)와 PEP(`index.php:573-619`)는 Local Decision 경로로 **그대로 보존**. Broker는 상위 오케스트레이션만 신설.
- **DB-3 Cached 무효화**: Cached Decision은 정책버전·컨텍스트 해시 키로만 재사용, 정책 변경/컨텍스트 변화 시 즉시 무효. 판정·재사용을 SecurityAudit 원장(`SecurityAudit.php:14-67`·`:56`)에 봉인.
- **DB-4 Consensus 정족수**: 정족수·타임아웃 명시. 미달·무응답 시 fail-secure deny(silent permit 금지).

## 4. KEEP_SEPARATE / False Positive

★ "PDP" grep 히트는 **인가 PDP가 아님** — `PriceOpt.php:1496`·`:1583`의 가격 `updProd` 파생 문자열 false positive. 인가 federation 대상에서 영구 제외. `OpenPlatform.php:39`·`:41`, `MediaHost.php:22`·`:30`은 외부 경계로 Cross-Domain PDP와 무관.

## 5. 판정

**ABSENT** — remote/consensus 결정 grep 0. 현행은 로컬 PDP(`TeamPermissions.php:695`·`:704`)와 로컬 PEP(`index.php:573-619`)뿐이며, Remote/Hybrid/Cached/Consensus Decision·Cross-Domain PDP 계약 전무. Decision Broker·Remote PDP는 **순신설**, 선행(§15 Route·§19 Context) 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
