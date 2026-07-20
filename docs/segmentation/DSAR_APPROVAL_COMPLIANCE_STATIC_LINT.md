# DSAR — Authorization Compliance Static Lint (Part 3-17 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Compliance Static Lint는 배포 전(정적·CI 단계) compliance 계약 위반을 탐지하는 검사기이다. 런타임이 아니라 **소스·구성 정합성**을 대상으로 한다. SPEC §28의 6대 lint 규칙:

| Lint 규칙 | 탐지 대상 |
|-----------|-----------|
| Missing Control Mapping | 규제 요건에 대응하는 통제 매핑 누락 |
| Missing Evidence | 통제에 증거 정의 미연결 |
| Hardcoded Compliance Rule | compliance 규칙이 코드에 하드코딩 |
| Deprecated Regulation | 폐기된 규제 버전 참조 |
| Invalid Control Reference | 존재하지 않는 통제 ID 참조 |
| Missing Review Cycle | 주기적 재검토 사이클 미정의 |

## 2. Substrate 매핑
| SPEC 요구 | 현행 substrate | 상태 |
|-----------|----------------|------|
| Hardcoded Compliance Rule 탐지 | `Compliance.php:90-113` 하드코딩 control 목록 | **정확히 이 lint의 대상 코드** |
| Control Mapping 소스 | 통제↔규제 매핑 테이블 | ABSENT |
| Review Cycle 정의 | 재검토 주기 메타 | ABSENT |
| 정적 검사 CI 훅 | 별도 lint 파이프라인 | ABSENT |

## 3. 설계 계약
- **Hardcoded Compliance Rule의 자기참조성**: 현행 `Compliance.php:90-113`이 control 목록을 코드에 직접 박아둔 것이 곧 이 lint가 잡아야 할 안티패턴이다. 즉 lint 도입은 자신의 substrate를 첫 지적 대상으로 삼는다(외부화 대상 = 규제 룰셋을 데이터/구성으로 분리).
- **정적 vs 런타임 분리**: §27 Runtime Guard가 요청 차단이라면 §28 Lint는 배포 게이트다. 두 계약은 동일 규칙 카탈로그(Control Mapping·Evidence·Regulation 버전)를 공유하되 실행 시점이 다르다.
- **CI 배선**: lint는 배포 파이프라인 정적 단계에 위치. 신규 검사 엔드포인트/스크립트가 필요하면 `/api` 접두·라우트 등록 파일에 `$register` 배선(런타임 API의 경우) 또는 CI 정적 검사기로 구현.
- **Fail-on-violation**: Missing Control Mapping·Invalid Control Reference는 배포 차단 사유(hard fail), Deprecated Regulation·Missing Review Cycle은 경고 승격 대상(§30과 연계).

## 4. 판정
**ABSENT** — compliance 정적 lint는 전무하다. 유일한 substrate는 `Compliance.php:90-113`의 하드코딩 control이며, 이는 lint의 **탐지 대상**이지 lint 구현이 아니다. 6대 규칙 전부 **순신설**이다. 구현 시 규제 룰셋 외부화(하드코딩 제거)를 선결로 하되, `Compliance.php` EXTEND 원칙 준수. BLOCKED_PREREQUISITE(Control Mapping 카탈로그·Regulation 버전 레지스트리 부재).
