# DSAR — Authorization Compliance Error Contract (Part 3-17 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Compliance Error Contract는 compliance 위반이 확정(deny)되었을 때 호출자에게 반환하는 **결정적·기계판독 가능** 에러 표면이다. §27 Runtime Guard의 각 차단 사유가 정확히 하나의 에러 코드로 사상된다. SPEC §29의 7대 코드:

| 에러 코드 | 발생 조건 | 대응 Guard 사유 |
|-----------|-----------|-----------------|
| COMPLIANCE_RULE_FAILED | compliance 규칙 평가 실패(deny) | Regulatory Conflict |
| CONTROL_MAPPING_NOT_FOUND | 요청 리소스에 통제 매핑 부재 | Missing Mandatory Control |
| AUDIT_NOT_READY | 감사 준비 상태 미달로 판정 불가 | (readiness 게이트) |
| EVIDENCE_INCOMPLETE | 증거 누락·불완전 | Invalid Evidence |
| REGULATION_DEPRECATED | 폐기 규제 참조 | (정적·런타임 공통) |
| COMPLIANCE_EXCEPTION_EXPIRED | 만료 예외 근거 접근 | Unapproved/Expired Exception |
| CONTROL_VALIDATION_FAILED | 통제 검증 로직 실패 | Evidence Tampering 등 |

## 2. Substrate 매핑
| SPEC 요구 | 현행 substrate | 상태 |
|-----------|----------------|------|
| 결정적 에러 코드 표면 | 기존 핸들러의 일반 4xx/오류 응답 | compliance 전용 코드 없음 |
| AUDIT_NOT_READY 판독원 | `Compliance.php:115-120` readiness 산출 | 판독 baseline·에러화 없음 |
| 에러 발생 지점(PEP) | RBAC PEP `index.php:600-619` | RBAC 거부만 표면화 |

## 3. 설계 계약
- **1:1 사상 원칙**: 7대 코드는 §27 6대 차단 사유 + readiness 게이트(AUDIT_NOT_READY)로 완결 사상. 가드가 판정하고 Error Contract가 코드·메시지·재시도 가능성(retryable)을 부여한다(관심사 분리).
- **결정성**: 동일 위반 입력 → 항상 동일 코드. 코드 문자열은 안정 계약(하위호환 append-only, rename 금지).
- **retryable 구분**: AUDIT_NOT_READY·EVIDENCE_INCOMPLETE는 데이터 보강 후 재시도 가능(transient), COMPLIANCE_RULE_FAILED·COMPLIANCE_EXCEPTION_EXPIRED는 정책 변경 없이는 비재시도(terminal).
- **표면화 경로**: compliance 판정 엔드포인트가 신설되면 `/api` 접두·라우트 등록 파일에 `$register` 배선하고, 에러 응답 스키마는 본 계약을 준수(`code`·`regulation`·`control_ref`·`evidence_ref` 필드).

## 4. 판정
**ABSENT** — 7종 compliance 에러 코드는 전부 신규이며 **발생원(producer) 자체가 부재**하다. 현행은 RBAC 거부(`index.php:600-619`)와 일반 오류 응답뿐이고 compliance 차원의 결정적 코드가 없다. AUDIT_NOT_READY만 `Compliance.php:115-120` readiness를 판독 baseline으로 재사용 가능하나 에러화 로직은 미존재. 7대 코드 **순신설**. BLOCKED_PREREQUISITE(§27 Guard·§28 Lint 선행). 신설 시 `Compliance.php` EXTEND 원칙 준수.
