# DSAR — Approval Compliance Snapshot (Part 3-17 §19·§32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §19·§32)

APPROVAL_COMPLIANCE_SNAPSHOT은 특정 시점(t)의 인가·승인 컴플라이언스 자세를 **불변(Immutable)하게 봉인**한 단일 레코드다. 스냅샷은 다음을 포함한다.

- **Control State**: 통제 항목별 상태(구현/부분/미구현/면제).
- **Policy State**: 적용 정책 버전·유효성.
- **Evidence State**: 증거 수집 완결도(수집됨/누락/만료).
- **Compliance Score**: 위 세 상태에서 파생된 정규화 점수(0~100).
- **Timestamp + Immutability Seal**: 생성 시각과 위변조 방지 봉인(§32).

스냅샷은 감사(Audit) 시점의 자세를 재현 가능한 기준선으로 고정하며, 이후 §21 Digest·§22 Analytics·§23 Drift의 **비교 기준(baseline)**이 된다.

## 2. Substrate 매핑

| SPEC 요소 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| Readiness posture(자세 원천) | flat readiness 산출 | `Compliance.php:53-130` | PARTIAL(flat·비봉인) |
| Score 원천 | readiness 판정 필드 | `Compliance.php:115-120` | PARTIAL |
| Immutability seal 기반 | SecurityAudit 해시체인 | `SecurityAudit.php:14-68` | 확장 대상 |
| 봉인 append 지점 | 해시체인 append | `SecurityAudit.php:56-68` | 확장 대상 |
| 스냅샷 저장 substrate | 컴플라이언스 스냅샷 테이블 | — | **ABSENT** |

현행 `Compliance.php:53-130`은 요청 시점마다 flat readiness를 재계산할 뿐 시점 봉인 레코드를 남기지 않는다. compliance snapshot 의미의 grep 결과 0 — 봉인·재현 가능한 스냅샷 개념 자체가 부재하다.

## 3. 설계 계약

1. **생성**: Snapshot은 Control/Policy/Evidence State를 수집→정규화→Compliance Score 파생 후 단일 레코드로 조립한다. Score 파생은 `Compliance.php:115-120`의 현행 readiness 필드를 상위 입력으로 재사용한다(재구현 금지).
2. **봉인(§32 Immutable)**: 조립된 레코드는 `SecurityAudit.php:14-68` 해시체인을 확장하여 append하고, 직전 해시를 preimage로 포함해 위변조 시 체인 검증 실패로 드러나게 한다. 검증 정본은 `SecurityAudit::verify()`이며 본 스냅샷은 그 append-only 계약을 상속한다.
3. **불변성**: 봉인 후 스냅샷은 UPDATE/DELETE 금지. 정정은 새 스냅샷 발행으로만 표현한다.
4. **참조**: §21 Digest·§22 Analytics·§23 Drift는 스냅샷을 읽기 전용 baseline으로 참조하며 스냅샷을 변형하지 않는다.

## 4. KEEP_SEPARATE

- `ModelMonitor.php`(ML drift)·`AnomalyDetection.php:2-6`(통계 이상탐지)는 compliance snapshot과 무관 — 봉인·자세 재현 기능을 여기에 병합 금지.
- 스냅샷 봉인은 audit 이벤트 통합(`Compliance.php:143-190`)의 이벤트 스트림과 구분된다: 이벤트는 흐름, 스냅샷은 시점 봉인.

## 5. 판정

**ABSENT** — compliance snapshot(시점 봉인·재현 가능 자세 레코드) 부재. Immutable Snapshot은 `SecurityAudit.php:14-68` 해시체인 확장으로 **순신설**. flat readiness(`Compliance.php:53-130`·`:115-120`)는 Score 원천으로 재사용하되 봉인 계층은 신설. NOT_CERTIFIED · BLOCKED_PREREQUISITE(§21~§23 선행).
