# DSAR — Authorization Compliance Warning Contract (Part 3-17 §30)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Compliance Warning Contract는 위반은 아니지만 **저하·임박·열화** 신호를 비차단(non-blocking)으로 통지하는 계약이다. §29 Error가 deny(hard)라면 §30 Warning은 관측·선제 대응(soft)을 담당한다. SPEC §30의 5대 경고:

| 경고 | 발생 조건 | 임계 |
|------|-----------|------|
| Compliance Score Decreasing | compliance 점수 하락 추세 | 추세 기울기 |
| Regulation Update Pending | 규제 개정 대기 | 미반영 규제 존재 |
| Evidence Aging | 증거 노후화 | 증거 age > 임계 |
| Attestation Expiring | 인증 만료 임박 | 만료 D-day |
| Audit Readiness Below Threshold | 감사 준비도 임계 미달 | readiness < 기준 |

## 2. Substrate 매핑
| SPEC 요구 | 현행 substrate | 상태 |
|-----------|----------------|------|
| Audit Readiness 판독 | `Compliance.php:115-120` readiness 산출 | baseline(경고화 없음) |
| Compliance Score 추세 | posture 점수 시계열 | 스냅샷만·추세 부재 |
| Evidence age·Attestation 만료 | 증거·인증 메타 타임스탬프 | ABSENT |

## 3. 설계 계약
- **비차단 원칙**: 5대 경고는 요청을 막지 않는다. 관측성 신호로 대시보드·알림에 노출되며 §29 Error로 승격되는 임계(예: Attestation Expiring → 만료 후 COMPLIANCE_EXCEPTION_EXPIRED)를 명시적으로 정의한다.
- **Readiness baseline 재사용**: Audit Readiness Below Threshold는 `Compliance.php:115-120` readiness 산출을 단일 소스로 삼아 임계 비교만 추가(신규 점수 엔진 난립 금지).
- **추세 계약**: Compliance Score Decreasing은 단일 스냅샷이 아니라 시계열 기울기를 요구 → posture 이력 저장이 선행 필요(현재 스냅샷만 존재).
- **소비 경로**: 경고 조회 API가 신설되면 `/api` 접두·라우트 등록 파일에 `$register` 배선, `/v424/compliance/*` 스코프 재사용. 경고 스키마는 `level=warning`·`metric`·`threshold`·`observed` 필드 포함.

## 4. 판정
**ABSENT** — compliance 경고 계약은 전무하다. Audit Readiness Below Threshold만 `Compliance.php:115-120` readiness를 baseline으로 재사용 가능하며, 나머지 4종(Score Decreasing·Regulation Update Pending·Evidence Aging·Attestation Expiring)은 시계열·메타 저장이 부재하여 **순신설**이다. BLOCKED_PREREQUISITE(posture 이력·증거/인증 타임스탬프 저장 선행). 신설 시 `Compliance.php` EXTEND 원칙 준수(단일 readiness 소스).
