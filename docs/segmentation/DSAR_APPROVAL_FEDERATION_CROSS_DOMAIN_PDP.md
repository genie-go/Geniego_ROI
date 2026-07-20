# DSAR — Cross-Domain Policy Decision Point (Part 3-18 §17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC 참조)

`APPROVAL_FEDERATION_CROSS_DOMAIN_PDP`는 §17 Cross-Domain Policy Decision Point로, **로컬 정책·원격 정책·공유 정책을 함께 평가**하여 단일 결정을 산출하는 판정 엔진이다. 로컬 PDP가 자기 도메인 룰만 보는 것과 달리, cross-domain PDP는 결정 시점에 이질 도메인의 정책·컴플라이언스 규칙·신뢰 수준을 입력으로 받는다. SPEC §17 최소 구성요소:

- **Local Policy Eval**: 로컬 도메인 룰·스코프 평가(현행 PDP 재사용).
- **Remote Policy Eval**: 원격 도메인이 게시한 정책을 인증 경로로 수신해 평가.
- **Shared Policy Eval**: 공동 소유 리소스에 적용되는 공유 정책 평가.
- **Compliance Rule Eval**: 결정에 컴플라이언스 제약(지역·규제)을 추가 제약으로 적용.
- **Trust Level Eval**: 원격 도메인의 trust level에 따라 결정 가중·거부(저신뢰=fail-closed).

## 2. Substrate 매핑

| SPEC 요소 | 현행 근접 substrate | 판정 |
|---|---|---|
| Local Policy Eval | `TeamPermissions.php:695` PDP·`:704` 권한 해석 | KEEP(로컬 평가) |
| 로컬 프리셋 어휘 | `TeamPermissions.php:737-749` ORG_PRESET | KEEP(로컬 정책원) |
| 역할 상수/랭크 | `TeamPermissions.php:16`,`:33` role 정의 | KEEP(로컬 어휘) |
| 컴플라이언스 posture 근접 | `Compliance.php:71-73` posture·`:87` | 근접(로컬 posture) |
| Remote/Shared Policy Eval·Trust Level Eval | 없음(grep 0) | **ABSENT** |

**현행 판정은 100% 로컬**(`TeamPermissions.php:695`,`:704`)이며, 정책원도 로컬 ORG_PRESET(`:737-749`)·로컬 role 상수(`:16`,`:33`) 한정이다. 결정 시점에 **원격/공유 정책을 입력으로 받는 평가 경로는 grep 0**으로 전무하다. Compliance posture(`Compliance.php:71-73`)는 로컬 상태 조회일 뿐 PDP 결정에 규제 제약을 주입하는 rule eval이 아니다. Trust level 기반 결정 가중도 부재하다.

## 3. 설계 계약 (신설 대상)

- **원격 확장**: 로컬 PDP(`TeamPermissions.php:695`)를 **base evaluator**로 유지하고, RemotePolicyEval·SharedPolicyEval을 병렬 입력으로 추가. 로컬 어휘(`:737-749`)를 canonical 기준으로 원격 정책을 번역.
- **ComplianceRuleEval**: `Compliance.php:71-73` posture를 결정 제약으로 승격 — 지역/규제 미충족=거부.
- **TrustLevelEval**: 원격 도메인 trust level < 임계=fail-closed. Unknown=저신뢰 취급.
- **병합 규칙**: Local ∩ Remote ∩ Shared에 Compliance·Trust 제약을 곱한 **deny-overrides** 최종 결정. 결정 근거·입력 정책 스냅샷은 `SecurityAudit.php:14-67`(`:56` verify) 해시체인 기록.
- **스키마**: 정책 캐시·버전은 `Db.php:942-955`,`:961-973` 자가치유 패턴 재사용. stale=거부.

## 4. KEEP_SEPARATE

- **로컬 PDP/어휘**: `TeamPermissions.php:695`,`:704`,`:737-749`,`:16`,`:33`는 단일 도메인 평가 엔진 — cross-domain PDP가 대체하지 않고 확장한다.
- **커머스 동기화**: `ChannelSync.php:378-479`는 채널 동기화이지 정책 평가 아님. 별도.
- **가격/자격**: `PriceOpt.php:1496`·`OAuth.php:24` 등은 별도 도메인.

## 5. 판정

**ABSENT** — 원격 정책 평가·공유 정책 평가·trust level 평가 grep 0. 현행 판정은 전부 로컬 PDP(`TeamPermissions.php:695`,`:704`,`:737-749`)이며 원격 정책을 결정 입력으로 받지 않는다. 로컬 PDP를 원격 확장하는 순신설 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 remote policy exchange·trust anchor 부재). 실 구현은 별도 승인 세션.
