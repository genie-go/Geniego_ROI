# DSAR — Authorization Federation Runtime Guard (Part 3-18 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC) — APPROVAL_FEDERATION_RUNTIME_GUARD(§28)

Federation Runtime Guard는 **연합(federation) 참여 도메인과 실제로 인가 컨텍스트를 주고받는 요청 시점(request-time)에, 신뢰되지 않은 연합 상호작용을 차단**하는 런타임 PEP 계약이다. 로컬 RBAC PEP는 "이 요청자가 이 로컬 리소스를 쓸 수 있는가"만 판정하지만, Runtime Guard는 그 앞단에서 "이 요청이 참여한 연합 관계 자체가 지금 유효·신뢰 가능한가"를 판정한다. 본 §28은 6개 차단 조건을 규정한다.

- **Untrusted Domain** — 등록되지 않았거나 신뢰가 철회된 원격 도메인으로부터/으로의 컨텍스트 교환.
- **Expired Certificate** — 상호 인증 인증서/키가 만료된 파트너와의 상호작용.
- **Invalid Federation Contract** — 연합 계약이 부재·만료·서명 불일치.
- **Metadata Spoofing** — 위조된 메타데이터(엔티티ID·엔드포인트·서명키)로 파트너를 사칭.
- **Unauthorized Context Exchange** — 계약이 허용하지 않는 scope/claim의 컨텍스트를 요청.
- **Cross-Domain Replay Attack** — 이미 소비된 연합 assertion/토큰의 재전송.

계약상 Runtime Guard는 **fail-closed**다. 판정 불능(원격 상태 미확인)은 허용이 아니라 거부다.

## 2. Substrate 매핑

| SPEC 개념(§28) | 현행 substrate | 상태 |
|---|---|---|
| Cross-Domain Replay 차단 | SAML replay consume(`EnterpriseAuth.php:279-286`) | baseline — SAML assertion 단건 재사용 방지, federation 계약 인지 없음 |
| Metadata Spoofing 차단 | SAML 서명검증(`EnterpriseAuth.php:575-626`) | baseline — IdP 서명 검증, 파트너 도메인 신뢰 판정 아님 |
| 현행 런타임 PEP | 로컬 RBAC 미들웨어(`index.php:573-597`·`:604-606`·`:619`) | 로컬 역할/scope만, federation guard 아님 |
| 감사 채널 | `SecurityAudit.php:14-67` | 차단 이벤트 기록 채널로 재사용 가능 |
| Untrusted Domain/Expired Cert/Invalid Contract/Unauthorized Exchange Guard | 부재 | **ABSENT (grep 0)** |

## 3. 설계 계약

- **GuardDecision** — `{interaction, verdict(ALLOW/DENY), reason, evaluated_at}`. reason은 §30 Error Contract 7종 중 하나로 매핑. 로컬 RBAC PEP(`index.php:573-619`) **이전** 단계에서 평가(연합 관계가 무효면 로컬 권한 판정 자체를 생략).
- **Replay 재사용** — Cross-Domain Replay는 신설이 아니라 `EnterpriseAuth.php:279-286`의 consume 로직을 federation assertion으로 확장(2차 소비 시 DENY). 중복 replay 저장소 금지.
- **Metadata Spoofing 재사용** — `EnterpriseAuth.php:575-626` 서명검증을 파트너 메타데이터 서명 검증으로 승격, 별도 검증기 신설 금지.
- **감사** — 모든 DENY(및 임계 ALLOW)는 `SecurityAudit.php:14-67` 해시체인에 append.
- **Fail-closed** — 원격 도메인 상태·인증서 유효성 미확인 시 DENY. 판정불능≠허용.

## 4. KEEP_SEPARATE

- **OpenPlatform HMAC**(`OpenPlatform.php:39`·`:41`·`:394`) — 외부 개발자 API 서명 인증. 파트너 도메인 간 연합 신뢰가 아니라 단일 API 소비자 인증. 통합 금지.
- **OAuth 콜백**(`OAuth.php:24`·`:369`) — 사용자 소셜 로그인 콜백. federation context exchange 아님.

## 5. 판정

**ABSENT** — federation runtime guard(Untrusted Domain·Expired Certificate·Invalid Contract·Unauthorized Context Exchange 차단) grep 0. Replay는 `EnterpriseAuth.php:279-286`, Metadata Spoofing은 `:575-626`가 baseline 가드로 존재하나 둘 다 federation 계약을 인지하지 않는 로컬 SAML 방어다. 현 PEP는 로컬 RBAC(`index.php:573-619`)에 국한. §28 차단 계약은 이들 baseline 위에 순신설한다. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**(원격 파트너 도메인·연합 계약 substrate 부재).
