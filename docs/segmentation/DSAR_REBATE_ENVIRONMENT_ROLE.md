# DSAR — Environment Role (§23)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 계약 — 환경 분리(8)
DEVELOPMENT_ROLE · TEST_ROLE · QA_ROLE · STAGING_ROLE · SANDBOX_ROLE · **PRODUCTION_ROLE** · DEMO_ROLE · TRAINING_ROLE.

## 🔴 규칙
**Production Role 은 별도 Assignment·유효기간·인증 요구사항을 가진다.**
**Non-production Role 에서 Production Permission 을 상속하지 못하게 한다.**

## 실측 — Environment 구분은 REAL, 권한 분리는 부재
| 요소 | 실측 |
|---|---|
| **Environment 식별** | ✅ **REAL** — `GENIE_ENV`(production/demo) · `IS_DEMO` · **`Db::envLabel()`** |
| **환경별 권한 분리** | ❌ **부재** — 5-1 §59 ㉝ = "Environment Mismatch 차단 **0(권한 분리 부재)**" |
| 데모 면제 | `env='demo'` 플랜게이팅 면제(286차) — **권한 분리가 아니라 면제** |

## 🔴 트랩 — 278차 실사례
**`Db::env()` 는 GENIE_ENV 부재 시 데모에서도 production 을 반환** → **`envLabel()` 사용 필수**.
**Environment 판정이 틀리면 Environment Role 전체가 무의미**해진다 — 이 함수가 **Environment Scope 의 SSOT**다.

## 분류
Environment 식별 = **VALIDATED_LEGACY**(단 `envLabel()` 강제) · Environment Role·권한 분리 = **NOT_APPLICABLE → 신설**.
