# DSAR — 플랫폼 상태 (APPROVAL_PLATFORM_STATUS) (Part 3-25 §2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §2 Platform Status)
**플랫폼 상태(Platform Status)**는 운영 준비도 결재의 실시간 근거로서, 플랫폼 전반의 가동 건강도를 단일 통합 신호로 표현한다. 계약:
- **상태 도메인**: `ok | degraded | down`의 3-값 정규화 상태를 산출.
- **다중 시그널 집계**: 헬스 프로브와 시스템 메트릭을 하나의 통합 status로 집계(부분 실패는 degraded로 전파).
- **결재 입력**: 최종 검증/운영 sign-off는 이 통합 status를 필수 입력으로 소비.
- **불변식**: Unknown/미관측 시그널은 `ok`로 승격 불가(fail-closed·down 또는 degraded 취급).

## 2. Substrate 매핑
| 계약 요소 | 현행 substrate | 상태 |
|---|---|---|
| 헬스 status 산출 | `Health.php:27-45` | PARTIAL |
| 시스템 메트릭(ok/degraded/down) | `SystemMetrics.php:60-83` | PARTIAL |
| DB 연결/폴백 신호 | `Db.php:43-48` | 참고 |
| 통합 플랫폼 status 집계기 | (전용 통합기 grep 0) | ABSENT |

## 3. 설계 계약
1. **3-값 정규화**: `Health.php:27-45`의 헬스 판정과 `SystemMetrics.php:60-83`의 ok/degraded/down 메트릭을 단일 도메인으로 통합.
2. **최악치 전파**: 집계 시 구성 시그널 중 최악 상태를 통합 status로 채택 — 부분 degraded는 전체 degraded로 상향.
3. **결재 연동**: 통합 status를 Final Validation·Operational Sign-off DSAR의 필수 입력으로 제공(관측 없이는 승인 불가).
4. **Fail-closed**: 미관측/Unknown 시그널은 `ok` 금지 — degraded 이상으로 취급.

## 4. 판정
**PARTIAL** — 헬스 status(`Health.php:27-45`)와 시스템 메트릭 ok/degraded/down(`SystemMetrics.php:60-83`)이 실재하여 플랫폼 상태 원소를 제공한다. 그러나 이들을 최악치 전파 규칙으로 결합하는 통합 플랫폼 status 집계기는 부재 — 확장 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
