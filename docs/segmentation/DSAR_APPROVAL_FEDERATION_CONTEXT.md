# DSAR — Authorization Federation Context Exchange (Part 3-18 §19)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §19 Context Exchange)

`APPROVAL_FEDERATION_CONTEXT`는 인가 판정을 다른 도메인에 위임할 때 **어떤 판정 근거 컨텍스트를 어디까지 노출할지** 규정하는 교환 계약이다. SPEC이 규정하는 컨텍스트 6종:

- **Identity Context** — 주체 식별·역할·테넌트.
- **Trust Context** — 발급 도메인 신뢰수준·trust anchor 등급.
- **Risk Context** — 세션/행위 위험 신호.
- **Device Context** — 디바이스 지문·자세(posture).
- **Session Context** — 세션 수명·인증 강도.
- **Compliance Context** — 규제 경계·데이터주권 태그.

핵심 원칙 **Least Disclosure**: 원격 도메인이 판정에 **필요한 최소 컨텍스트만** 전달하고, 나머지는 불투명(opaque) 참조로 유지한다.

## 2. Substrate 매핑

| SPEC 컨텍스트 요소 | 현행 substrate | 상태 |
|---|---|---|
| Identity Context(요청단위 내부 주입) | `index.php:117-121`(auth 속성 주입)·`EnterpriseAuth.php:483-511`(provision) | 존재(로컬 내부 전용) |
| 세션 근거(불투명 토큰) | `CreativeStore.php:207-217`(opaque 세션·JWT 아님) | 존재(로컬·비교환) |
| 도메인간 context 교환 | 없음 — grep 0 | **ABSENT** |
| Trust/Risk/Device/Compliance Context 전파 | 없음 | **ABSENT** |
| Least Disclosure 필터 | 없음 | **ABSENT** |

## 3. 설계 계약(순신설·least-disclosure)

- **CX-1 최소노출**: 교환 컨텍스트는 판정 필요 필드로 화이트리스트 제한. 미필요 필드는 opaque handle(현행 `CreativeStore.php:207-217` 불투명 세션 패턴 계승)로 대체, 원본 PII 미전파.
- **CX-2 로컬 주입 불변**: 현행 요청단위 내부 주입(`index.php:117-121`·`EnterpriseAuth.php:483-511`)은 **로컬 판정 경로 그대로 보존**. Context Exchange는 그 위에 별도 직렬화 계층으로만 추가.
- **CX-3 무결성·감사**: 교환 컨텍스트 봉투는 서명·정책버전 포함, 발신·수신을 SecurityAudit append-only 원장(`SecurityAudit.php:14-67`)에 기록.
- **CX-4 fail-closed**: 필수 컨텍스트 누락/검증 실패 시 Unknown≠permit — 판정 거부(deny)로 귀결.

## 4. KEEP_SEPARATE

`OpenPlatform.php:39`·`:41`, `MediaHost.php:22`·`:30`은 외부 플랫폼/미디어 경계로 authz context 교환 대상이 아님. `PriceOpt.php:1496`·`:1583`("PDP" 파생) 무관.

## 5. 판정

**ABSENT** — 도메인간 context 교환 없음(grep 0). 현행은 요청단위 내부 주입(`index.php:117-121`·`EnterpriseAuth.php:483-511`)과 로컬 opaque 세션(`CreativeStore.php:207-217`·JWT 아님)뿐이며, Trust/Risk/Device/Compliance Context 전파·Least Disclosure 필터 전무. Context Exchange는 **순신설(least-disclosure)**, 선행(§15 Route·§16 Broker) 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
