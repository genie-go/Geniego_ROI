# DSAR — Authorization Federation Routing Engine (Part 3-18 §15)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §15 Routing Engine)

`APPROVAL_FEDERATION_ROUTE`는 인가 결정 요청을 **어느 권한 도메인(Authorization Domain)에서 판정할지** 선택·전달하는 라우팅 계층이다. SPEC이 규정하는 라우팅 대상 5종:

- **Local Domain** — 요청을 자기 테넌트/자기 프로세스 내 로컬 PDP로 판정.
- **Trusted Partner Domain** — 사전 신뢰협약(trust anchor)이 성립된 파트너 도메인으로 위임.
- **Global Hub** — 전역 정책 허브가 최종 판정(중앙 집중형 federation).
- **Regional Hub** — 규제·데이터주권 경계별 지역 허브로 라우팅.
- **Fallback Domain** — 상위 도메인 무응답/장애 시 안전 강등 경로(fail-secure 강등, permit 강등 금지).

라우팅은 **결정을 내리지 않는다**. 오직 "판정 주체를 고르고 전달"만 하며, 실제 판정은 §16 Decision Broker가 수행한다.

## 2. Substrate 매핑

| SPEC 라우팅 요소 | 현행 substrate | 상태 |
|---|---|---|
| 단일 요청 진입/분류 미들웨어 | `index.php:78-89`(public path bypass 목록)·`:103-123`(auth 판정 진입) | 존재(단일 도메인 내부) |
| 로컬 판정 경로 | `index.php:573-597`·`:604-606`·`:619`(PEP write-guard 강제) | 존재(로컬 전용) |
| Trusted Partner 위임 | 없음 — grep 0 | **ABSENT** |
| Global/Regional Hub 라우팅 | 없음 — grep 0 | **ABSENT** |
| Fallback Domain 강등 경로 | 없음(로컬 fail-secure만) | **ABSENT** |

## 3. 설계 계약(순신설)

- **RS-1 결정성**: 동일 (subject, resource, action, domain-hint)은 동일 라우팅 결과. 라우팅 테이블은 SecurityAudit append-only 원장(`SecurityAudit.php:14-67`)에 정책버전과 함께 봉인.
- **RS-2 도메인간 라우팅 부재의 명시화**: 현 진입 미들웨어(`index.php:78-89`)는 **경로 분류**이지 도메인 선택이 아니다. Route Engine은 이 위에 별도 계층으로 신설하며 기존 bypass 목록을 변경하지 않는다.
- **RS-3 Fallback fail-secure**: Fallback Domain은 상위 무응답 시 **deny 강등만** 허용. permit 강등·silent allow 금지(PEP 계약 `index.php:573-597` 준수).
- **RS-4 무회귀**: 라우팅 미도입 시 100% Local Domain으로 귀결 → 현행 로컬 PDP/PEP 동작과 동일해야 한다(bit-parity).

## 4. KEEP_SEPARATE

`PriceOpt.php:1496`·`:1583`의 "PDP" 문자열은 가격 `updProd` 파생값으로, 인가 PDP와 무관 — 라우팅 대상에서 영구 제외. `OpenPlatform.php:39`·`:41`, `MediaHost.php:22`·`:30`은 외부 오픈플랫폼/미디어 호스트 경계로 authz federation 도메인이 아니다(별개 유지).

## 5. 판정

**ABSENT** — 도메인간 라우팅 grep 0. 현행은 단일 진입 미들웨어(`index.php:78-89`)의 경로 분류와 로컬 PEP(`index.php:573-619`)뿐이며, Trusted Partner/Global Hub/Regional Hub/Fallback Domain 라우팅은 전무. Route Engine은 **순신설**이며 선행(§16 Decision Broker·§19 Context Exchange) 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
