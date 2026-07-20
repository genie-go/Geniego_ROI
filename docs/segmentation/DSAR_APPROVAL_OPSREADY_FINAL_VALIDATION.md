# DSAR — 최종 검증 (APPROVAL_FINAL_VALIDATION) (Part 3-25 §2·§23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §2·§23 Final Revalidation)
플랫폼 릴리스 직전 **최종 검증(Final Validation)**은 후보 산출물 전체가 배포 게이트를 통과했음을 단일 시점에 재확인하는 승인 행위다. 계약:
- **트리거(재검증 유발)**: Release Candidate 확정, Configuration 변경, Infrastructure 변경, Security Patch 적용, Certificate(인증서) 교체 — 5종 이벤트 중 하나라도 발생하면 이전 검증 결과는 무효화되고 최종 재검증을 다시 요구한다.
- **입력**: 후보 버전 식별자, 검증 대상 헬스 시그널, 배포 아티팩트 무결성 증거.
- **출력**: `VALIDATED | REVALIDATION_REQUIRED | BLOCKED` 판정과 그 근거(불변 증거 참조).
- **불변식**: 트리거 이벤트 이후 재검증 없는 릴리스 승인은 금지(fail-closed). Unknown 상태는 VALIDATED로 승격 불가.

## 2. Substrate 매핑
| 계약 요소 | 현행 substrate | 상태 |
|---|---|---|
| 최종 재검증 오케스트레이션 | (전용 엔진 grep 0) | **ABSENT** |
| 플랫폼 헬스 프로브 | `Health.php:27-45` | PARTIAL(참고) |
| 트리거(배포/인프라 변경 검증) | 배포 CI 파이프라인(`.github/workflows/deploy.yml`) | 외부·부분 |
| 검증 증거 불변 기록 | `SecurityAudit.php:25-31`,`:60-64` | PARTIAL(append-only) |

## 3. 설계 계약
1. **재검증 상태기계**: 트리거 5종 각각을 이벤트로 정규화 → 직전 `VALIDATED` 스탬프 무효화 → 재검증 큐 진입. 상태는 `VALIDATED / REVALIDATION_REQUIRED / BLOCKED`만 허용.
2. **헬스 게이트 연동**: 최종 검증은 `Health.php:27-45` 프로브 결과를 필수 입력으로 소비. degraded/down이면 `VALIDATED` 승격 차단.
3. **증거 앵커**: 판정과 근거는 `SecurityAudit.php:25-31`·`:60-64` append-only 해시체인에 기록하여 사후 위변조 불가.
4. **Fail-closed**: 트리거 이후 재검증 미완료 상태에서의 릴리스 승인 요청은 거부. Unknown 헬스는 실패로 간주.

## 4. 판정
**ABSENT** — 전용 최종 재검증(Final Revalidation) 오케스트레이션은 코드베이스에 부재(grep 0, ②에서 중복 없음 확인). 헬스 프로브(`Health.php:27-45`)와 배포 CI가 부분 신호를 제공하나 트리거 5종 이벤트 기반의 재검증 상태기계는 순신설 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
