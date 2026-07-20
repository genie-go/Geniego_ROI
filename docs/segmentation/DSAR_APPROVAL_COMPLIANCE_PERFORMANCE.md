# DSAR — 성능 요구 계약 (Part 3-17 §34)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §34)

Compliance 엔진은 다음 SLO 를 만족해야 한다:

- **P-1 Assessment ≤ 30초** — 규정/통제 세트 전체 평가 1회.
- **P-2 Gap Analysis ≤ 15초** — 미충족 통제 갭 산출.
- **P-3 Report ≤ 60초** — 컴플라이언스 리포트(감사 대응) 생성.
- **P-4 Evidence Verify ≤ 3초** — 증거 무결성(해시체인) 검증.
- **P-5 Score Refresh ≤ 10초** — 컴플라이언스 점수 재집계.

## 2. 라이브 substrate 매핑

| SPEC SLO | 실 substrate | 상태 |
|---|---|---|
| P-1 Assessment | 평가 프레임워크 ABSENT — 현재는 요청 시 flat readiness posture 재계산(`Compliance.php:53-130`)뿐 | **측정 대상 부재** |
| P-2 Gap Analysis | 갭 산출 엔진 ABSENT | **ABSENT** |
| P-3 Report | 리포트 생성 파이프라인 ABSENT(감사 이벤트 CEF/SIEM 익스포트 `Compliance.php:143-190` 는 스트림 익스포트이지 컴플라이언스 리포트 아님) | 대용 익스포트만 |
| P-4 Evidence Verify | SecurityAudit 해시체인 재계산 `verify()` `SecurityAudit.php:56-68` = 측정 가능한 실 표적 | **PRESENT(측정 가능)** |
| P-5 Score Refresh | posture 필드 산출 `Compliance.php:90-113`·`:115-120` = flat·비집계 | 대용 지표만 |

## 3. 설계 계약(신설 시)

- P-1/P-2/P-3/P-5 는 **측정 대상 compliance 프레임워크가 실재해야** 벤치마크 가능하다. 현 substrate 는 요청 시점 flat posture 재계산(`Compliance.php:53-130`)에 그쳐 평가·갭·점수 재집계 단위 계측이 없다.
- P-4 Evidence Verify 만 실 표적이 존재한다 — `SecurityAudit::verify()`(`SecurityAudit.php:56-68`)는 해시체인 재계산·변조탐지의 실 경로이므로, ≤3초 SLO 는 현 verify 경로에 대한 마이크로벤치로 우선 정의 가능(단 `LIMIT` 기본 5000 스캔 범위를 벤치 파라미터로 고정).
- P-3 Report 는 `Compliance.php:143-190` 의 CEF/SIEM 직렬화를 재사용 입력으로 삼되, 컴플라이언스 리포트(규정별 충족/증거 인용)는 §32 evidence 테이블 신설 후에만 산출 대상 발생.
- 성능 벤치·부하 하네스는 저장소에 전무 — 실 구현 세션(RP-track)이 하네스 도입을 선행 포함해야 한다.

## 4. 판정

**ABSENT(단 P-4 예외).** 5개 SLO 중 Assessment/Gap/Report/Score Refresh 는 측정 대상 프레임워크가 부재하다(현 posture=`Compliance.php:53-130`). Evidence Verify(P-4)만 `SecurityAudit.php:56-68` 라이브 표적으로 우선 벤치 가능. 나머지 SLO 는 RP-track 세션에서 compliance substrate 신설 후에만 벤치·인증 가능.

NOT_CERTIFIED · 코드 변경 0 · BLOCKED_PREREQUISITE.
