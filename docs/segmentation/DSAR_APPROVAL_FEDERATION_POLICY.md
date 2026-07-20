# DSAR — Authorization Federation Policy Engine (Part 3-18 §7 Policy Federation Engine)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC 참조)

`APPROVAL_FEDERATION_POLICY`는 서로 다른 권한 도메인의 **정책(Policy)을 상호 운용**시키는 §7 Policy Federation Engine이다. 로컬 PDP가 "한 도메인 안에서 결정"하는 것과 달리, federation policy engine은 **이질적 도메인의 정책을 교환·번역·정합**시킨다. SPEC §7 최소 구성요소:

- **Policy Exchange**: 상대 도메인의 정책 문서(스코프/룰/제약)를 인증된 경로로 수신·게시.
- **Policy Translation**: 상대 도메인의 정책 어휘(role/scope/attribute 이름공간)를 로컬 canonical 어휘로 번역(매핑 테이블 기반).
- **Version Sync**: 정책 버전 벡터 동기화·최신성 보장·stale 정책 거부.
- **Conflict Detection**: 로컬 정책과 federation 정책이 상충할 때(예: 로컬 거부 vs 원격 허용) 탐지·해소 규칙(deny-overrides 기본).
- **Compatibility**: 정책 스키마/DSL 호환성 검사·비호환 시 federation 거부.

## 2. Substrate 매핑

| SPEC 요소 | 현행 근접 substrate | 판정 |
|---|---|---|
| 로컬 authz 결정 | `TeamPermissions.php:695` 로컬 PDP | KEEP(도메인 내부 PDP) |
| 로컬 정책 프리셋 | `TeamPermissions.php:737-749` ORG_PRESET·`:704` | KEEP(로컬 어휘) |
| 라우트 authz 게이트 | `index.php:573-597`,`:604-606`,`:619` RBAC 미들웨어 | KEEP(로컬 강제점) |
| SSO 정책 근접 | `EnterpriseAuth.php:43-54` sso_config(단일 IdP 정책) | 근접·교환 아님 |
| Policy Exchange/Translation/Conflict | 없음(grep 0) | **ABSENT** |

**현행 authz 정책은 100% 로컬 PDP**(`TeamPermissions.php:695`)이며, 정책 프리셋(`:737-749` ORG_PRESET)도 로컬 어휘로만 존재한다. 도메인 간 정책을 **교환·번역·정합**하는 경로는 grep 0으로 전무하다. sso_config(`EnterpriseAuth.php:43-54`)는 단일 IdP 인증 정책일 뿐 정책 교환 엔진이 아니다.

## 3. 설계 계약 (신설 대상)

- **PolicyExchange**: 상대 도메인 정책 문서를 서명 검증(`Crypto.php:133`,`:148`) 후 수신. 미서명/검증 실패=거부.
- **PolicyTranslation**: 원격 role/scope → 로컬 canonical(ORG_PRESET `TeamPermissions.php:737-749` 어휘) 매핑 테이블. 미매핑 항목=드롭(fail-closed).
- **Version Sync**: 정책 버전 벡터·수신 시각 기록(`Db.php:942-955`,`:961-973` 스키마 자가치유 패턴 재사용). stale=거부.
- **Conflict Detection**: 로컬 PDP 결정과 federation 정책 결정 병합 시 **deny-overrides**. 결정 근거·충돌 이력은 `SecurityAudit.php:14-67`(`:56` verify) 해시체인 기록.
- **강제 위치**: federation policy는 로컬 PDP(`TeamPermissions.php:695`)를 **대체하지 않고** 그 앞단에서 교집합만 통과시키는 전치 게이트.

## 4. KEEP_SEPARATE

- **로컬 PDP/프리셋**: `TeamPermissions.php:695`,`:704`,`:737-749`는 단일 도메인 내부 결정 엔진 — federation engine이 삼키지 않는다.
- **커머스 정책/동기화**: `ChannelSync.php:378-479`·`Connectors.php:133-181` 채널 동기화는 authz 정책 아님. 별도.
- **PG·자격증명**: `Paddle.php:19`·`OAuth.php:369`·`ChannelCreds.php:586-620` 별도 도메인.

## 5. 판정

**ABSENT** — 정책 교환/번역/버전정합/충돌탐지 grep 0. 현행 authz 정책은 전부 로컬 PDP(`TeamPermissions.php:695`)이며 ORG_PRESET(`:737-749`)도 로컬 어휘 한정. 순신설 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 federation contract·trust anchor 부재). 실 구현은 별도 승인 세션.
