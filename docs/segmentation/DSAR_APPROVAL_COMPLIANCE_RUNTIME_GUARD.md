# DSAR — Authorization Compliance Runtime Guard (Part 3-17 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Compliance Runtime Guard는 인가(Authorization) 경로가 규제·통제(Control) 계약을 **런타임에** 위반할 때 요청을 차단하는 PEP(Policy Enforcement Point)이다. SPEC §27이 규정하는 6대 차단 사유:

| 차단 사유 | 의미 | 차단 시점 |
|-----------|------|-----------|
| Unapproved Exception | 승인되지 않은 compliance 예외를 근거로 한 접근 | 요청 인가 직전 |
| Missing Mandatory Control | 필수 통제가 매핑·집행되지 않은 리소스 접근 | 리소스 진입 |
| Invalid Evidence | 증거(Evidence)가 무결성 검증 실패 | 증거 참조 시 |
| Expired Attestation | 만료된 인증(Attestation)에 의존한 권한 | 권한 해석 시 |
| Regulatory Conflict | 상충하는 규제 요건 동시 적용 | 정책 병합 시 |
| Evidence Tampering | 증거 체인 변조 탐지 | 증거 체인 검증 |

## 2. Substrate 매핑
| SPEC 요구 | 현행 substrate | 상태 |
|-----------|----------------|------|
| 런타임 차단 PEP(compliance 차원) | RBAC PEP 미들웨어 `index.php:600-619` (role/scope 강제만) | 인접·compliance 무인지 |
| Evidence Tampering 탐지 | `SecurityAudit.php:56-68` verify() append-only 해시체인 검증 | baseline(전용 아님) |
| Compliance 상태 판독 소스 | `Compliance.php:53-130` posture 산출 | 판독만·차단 없음 |
| 필수 통제 정의 | `Compliance.php:90-113` 하드코딩 control 목록 | 정적·런타임 게이트 아님 |

## 3. 설계 계약
- **PEP 확장 원칙**: compliance 가드는 신규 미들웨어 난립 없이 기존 RBAC PEP(`index.php:600-619`) 뒤에 **compliance sub-decision**으로 체인. RBAC PERMIT 이후에만 compliance 평가(deny-overrides).
- **Evidence Tampering 기준선**: 증거 무결성은 신규 로직이 아니라 `SecurityAudit.php:56-68` verify() 결과(chain OK/BROKEN)를 단일 진실로 삼는다. verify=BROKEN → Evidence Tampering 차단.
- **결정 모델**: 6대 사유는 각각 §29 Error Contract 코드로 사상되며, 가드는 판정만 하고 에러 표면화는 Error Contract가 담당(관심사 분리).
- **Fail-closed**: compliance 판정 불가(데이터 부재/READY 미달)는 PERMIT 아님 — Unknown≠Compliant.
- 신규 판정 엔드포인트가 필요하면 `/api` 접두·라우트 등록 파일에 `$register` 배선(기존 `/v424/compliance/*` 스코프 재사용).

## 4. 판정
**ABSENT** — compliance 전용 런타임 가드는 전무하다. 현 런타임 차단은 RBAC 차원(`index.php:600-619`)에 국한되며 Unapproved Exception/Missing Mandatory Control/Expired Attestation/Regulatory Conflict를 인지하지 않는다. Evidence Tampering만 `SecurityAudit.php:56-68` verify()를 baseline으로 재사용 가능하고, 나머지 5대 사유는 **순신설**이다. 신설 시 `Compliance.php` EXTEND 원칙(신설 핸들러 난립 금지)을 준수. BLOCKED_PREREQUISITE(선행 Control Mapping·Evidence Store 부재).
