# DSAR — Runtime SoD Enforcement: 정적 린트 (Part 3-10 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_10_RUNTIME_SOD_ENFORCEMENT_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_SOD_ENFORCEMENT_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_SOD_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_SOD_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §32 Static Lint는 코드·구성 정적 분석으로 SoD 통제의 **구조적 결함**을 배포 전 탐지하는 계층이다: (a) Missing SoD Rule, (b) Hardcoded Exception, (c) Direct Permission Bypass, (d) Missing Evidence, (e) Missing Snapshot, (f) Disabled Runtime Check. §40 Completion Gate의 "Static Lint 구축" 및 §39 Security 테스트(SoD Bypass)와 연결된다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §32 항목 | 판정 | 근거 | GT 인용 |
|---|---|---|---|
| SoD Runtime Guard / Static Lint | **ABSENT(grep 0)** | 하드코딩 예외·SoD 규칙부재·권한우회 탐지 lint 0(히트는 i18n/migration 데이터뿐) | GT②2 마지막 행 |
| Missing SoD Rule 탐지 | **ABSENT** | Conflict Rule/Matrix/Registry 자체 grep 0 → 부재 규칙 탐지 대상 없음 | GT②2·ADR 2.2 |
| Hardcoded Exception 탐지 | **ABSENT** | SoD 예외 워크플로 부재. break-glass/MFA는 로그인 통제(재활용 substrate) | GT②2·GT①§F |
| Direct Permission Bypass 탐지 | **ABSENT** | 인가 게이트는 존재하나(재활용) 우회 정적탐지 lint 없음 | GT②3.1·`index.php:572-611` |
| Missing Evidence/Snapshot 탐지 | **ABSENT** | SoD 전용 Evidence/Snapshot 스키마 부재 → 누락 정적탐지 불가 | GT②2 |
| Disabled Runtime Check 탐지 | **ABSENT** | Runtime Evaluator 부재(§31 DSAR) → 비활성 탐지 대상 없음 | GT②2.2 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

- **완전 순신규 정적분석층**: 6종 탐지(Missing SoD Rule/Hardcoded Exception/Direct Permission Bypass/Missing Evidence/Missing Snapshot/Disabled Runtime Check)는 grep 0 기반 그린필드. CI/배포 전 게이트로 배치(§40 Completion Gate).
- **재활용 관점 앵커**: 정적 인가 게이트(`index.php:572-611`·`guardTeamWrite` `UserAuth.php:1167-1186`·`guardWarehouse` `Wms.php:557-590`)는 "Bypass 없음"을 검증할 **분석 대상 코드경로**이지 lint 자체가 아니다(ADR D-1).
- **Evidence/Snapshot 앵커**: Missing Evidence/Snapshot 린트는 SecurityAudit 체인(`SecurityAudit.php:14-33`) 및 신규 Conflict Snapshot(§23·ADR D-4) 배선 여부를 정적 검사한다.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

- **FE 가드 ≠ SoD Static Lint**: FE `SecurityGuard.js`/`ContaminationGuard.js`는 XSS·테넌트오염 방어이지 권한 SoD 린트 아님(GT② B-8). 개명·흡수 금지.
- **위임상한 클램프 ≠ Permission Bypass 린트**: `TeamPermissions.php:599-621`·`:642-658`는 권한상승 방지 런타임 클램프이지 정적 우회탐지 lint 아님(GT② B-4).
- **"conflict" 41파일 decoy**: 409/sync/merge conflict는 SoD 규칙 부재 탐지 대상 아님(GT② B-1). lint 히트 오인 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

Static Lint **전 6종 = ABSENT·완전 순신규(grep 0)**. 유일 인접물(FE 가드·위임상한 클램프)은 관심사 상이 → KEEP_SEPARATE. 코드 변경 0·NOT_CERTIFIED. 선행: Conflict Rule/Matrix/Evidence/Snapshot 신설(ADR D-2/D-4) 후에야 "누락/비활성" 탐지 대상이 존재(BLOCKED_PREREQUISITE).
