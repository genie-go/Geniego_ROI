# DSAR — Authorization Federation Error Contract (Part 3-18 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_ERROR_CONTRACT(§30)

Federation Error Contract는 **연합 인가 실패를 호출자가 프로그램적으로 구별·처리할 수 있도록 안정적 에러코드 집합으로 규정**하는 계약이다. Runtime Guard(§28)의 DENY, Static Lint(§29)의 위반, API(§32)의 거부는 모두 본 §30의 에러코드로 표면화된다. 계약상 각 코드는 **결정적(deterministic)·재현가능·감사가능**해야 하며, 실패 이유를 내부 구현이 아니라 계약 표면에서 드러낸다. 7종 에러코드:

- **FEDERATION_NOT_TRUSTED** — 원격 도메인이 미등록·신뢰 철회 상태.
- **FEDERATION_CONTRACT_EXPIRED** — 연합 계약 유효기간 경과.
- **REMOTE_PDP_UNAVAILABLE** — 원격 정책 결정점(PDP) 도달 불가.
- **METADATA_INVALID** — 파트너 메타데이터 서명 불일치·스키마 위반.
- **CERTIFICATE_REVOKED** — 상호 인증서 폐기/만료.
- **CROSS_DOMAIN_DECISION_FAILED** — 연합 결정 요청이 원격에서 거부/오류.
- **CONTEXT_EXCHANGE_DENIED** — 요청 scope/claim이 계약 허용 범위 초과.

계약상 에러 응답은 **정보 노출 최소화**(원격 내부 사유를 그대로 전달 금지)와 **감사 완전성**(내부적으로는 전체 사유 기록)을 동시에 만족해야 한다.

## 2. Substrate 매핑

| SPEC 개념(§30) | 현행 substrate | 상태 |
|---|---|---|
| 인증서/서명 실패 표면화 proto | SAML 서명검증 실패(`EnterpriseAuth.php:575-626`) | baseline — 실패 시 예외, 그러나 안정 에러코드 계약 아님 |
| 실패 감사 기록 | `SecurityAudit.php:14-67`·`:56`(verify) | 실패 이벤트 append 채널로 재사용 |
| 로컬 인가 거부 표면 | 로컬 RBAC 거부(`index.php:573-597`) | 로컬 403 표면, federation 코드 부재 |
| FEDERATION_NOT_TRUSTED/CONTRACT_EXPIRED/REMOTE_PDP_UNAVAILABLE/METADATA_INVALID/CERTIFICATE_REVOKED/CROSS_DOMAIN_DECISION_FAILED/CONTEXT_EXCHANGE_DENIED | 부재 | **ABSENT (grep 0)** |

## 3. 설계 계약

- **ErrorCode enum** — 7종을 안정 문자열 상수로 고정. 코드 삭제·재의미 부여 금지(하위호환 계약). 각 코드는 §28 GuardDecision.reason·§32 API 거부 응답에 1:1 매핑.
- **응답 형상** — `{error_code, correlation_id, retriable(bool)}`. `REMOTE_PDP_UNAVAILABLE`만 retriable=true, 나머지 6종은 false(신뢰/계약/인증서 문제는 재시도로 해소 불가).
- **정보 노출 경계** — 외부 응답엔 error_code+correlation_id만. 원격 내부 사유·인증서 지문 등 상세는 `SecurityAudit.php:14-67` 내부 감사에만 기록.
- **감사 재사용** — 모든 에러 발생은 해시체인(`SecurityAudit.php:56` verify 대상)에 append, 별도 에러로그 저장소 신설 금지.
- **Fail-closed** — 미분류 실패는 임의 코드가 아니라 `CROSS_DOMAIN_DECISION_FAILED`(가장 보수적)로 귀속, 침묵 성공 금지.

## 4. KEEP_SEPARATE

- **OAuth 콜백**(`OAuth.php:24`·`:369`) — 소셜 로그인 실패는 OAuth 표준 에러(access_denied 등)를 유지, federation 코드로 재라벨 금지.
- **OpenPlatform HMAC**(`OpenPlatform.php:394`) — API 서명 실패는 자체 에러 표면 유지.

## 5. 판정

**ABSENT** — federation error contract 7종 코드 grep 0(발생원·수신처 모두 부재). SAML 서명검증 실패(`EnterpriseAuth.php:575-626`)와 감사 채널(`SecurityAudit.php:14-67`·`:56`)이 실패 표면화·기록 baseline으로 존재하나, 안정적 federation 에러코드 계약은 전무. §30 7종 순신설. §28 Runtime Guard·§32 API 거부의 reason 축으로 소비. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**(에러를 발생시킬 federation 런타임·API substrate 부재).
