# DSAR — Certification Static Lint (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §30(Static Lint)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §30은 **런타임이 아니라 개발/배포 파이프라인 단계**에서 Certification 거버넌스를 위반하는 코드 패턴을 정적으로 탐지하는 Lint 계층을 정의한다. Runtime Guard(§29)가 "행위 시점" 방어라면, Static Lint는 "코드 작성 시점" 방어다. 탐지 대상 6종:

- **Hardcoded Reviewer**: 검토자 ID/이메일을 코드에 하드코딩(동적 배정 우회)
- **Missing Evidence**: Decision 기록 코드 경로에 Evidence 필드 채우기가 누락된 패턴
- **Missing Attestation**: 인증(attestation) 서명/기록 없이 Certification 상태를 변경하는 코드 경로
- **Missing Snapshot**: §26 Snapshot 생성 없이 Certification 완료로 표시하는 코드 경로
- **Bypass Certification**: Certification 절차를 건너뛰고 직접 권한을 부여/변경하는 코드 경로
- **Direct Revocation**: Certification 재검토(review)를 거치지 않고 권한을 직접 회수(revoke)하는 코드 경로

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①·②의 실측 결론에 따르면, 위 6종을 탐지하는 정적 분석 규칙(lint rule, CI 스캔 스크립트, AST 검사기 등)은 코드베이스 전체에서 grep 0이다. CLAUDE.md에 명시된 대로 "no configured lint or test scripts"(No PHPUnit, no npm test)이며, Certification 전용 정적 분석은 더더욱 존재하지 않는다. 다만 **Direct Revocation이 탐지해야 할 대상 코드**(검토 절차 없이 직접 회수하는 기존 함수)는 실제로 여러 곳에 존재하며, 이들이 Lint 규칙의 1차 스캔 표적이 된다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Hardcoded Reviewer 탐지 | ABSENT | grep 0. Lint 규칙 자체 부재. 탐지 대상이 될 수 있는 reviewer 열거형: `PM/Assignees.php:14`(reviewer role enum) — 열거형 자체는 정상 코드이며 하드코딩 오남용 사례는 별도 스캔 필요 |
| Missing Evidence 탐지 | ABSENT | grep 0. §26 Evidence 필드 자체가 ABSENT이므로 탐지 대상 코드 경로도 없음(향후 §26 구현 후 탐지 규칙 의미 발생) |
| Missing Attestation 탐지 | ABSENT | grep 0. 인증서명 개념 자체가 이 도메인에 없음 |
| Missing Snapshot 탐지 | ABSENT | grep 0. §26 Snapshot이 ABSENT이므로 종속적으로 탐지 규칙도 부재 |
| Bypass Certification 탐지 | ABSENT | grep 0. Certification 절차 자체가 ABSENT이므로 "우회"할 절차가 존재하지 않음(선행 §26~§29 확정 후 의미 발생) |
| Direct Revocation 탐지 | ABSENT(탐지 규칙) / 탐지 대상은 실재 | grep 0(lint 규칙). 탐지 **대상** 코드: `Keys.php:135`(revoke)·`:155`(rotate), `UserAdmin.php:338`(is_active)·`:342`(세션 revoke)·`:598`(assignRole 제거 주석) — 이들은 검토 절차를 거치지 않는 직접 회수 함수로, Lint 규칙이 "Certification 경유 없는 revoke 호출"로 플래그해야 할 1차 표적 |

### 2.3 KEEP_SEPARATE (해당 시)

- `Keys.php:135`(revoke)·`:155`(rotate) — API 키 회수/로테이션이며 정상적인 운영 기능이다. Direct Revocation Lint 규칙의 "탐지 대상"이지 그 자체가 부정 행위는 아니다 — 향후 Certification 절차가 도입되면 이 호출부에 "검토 경유 여부" 주석/게이트를 점진 추가하는 것이 목표이지, 이 함수들을 삭제·차단하는 것이 아니다.
- `UserAdmin.php:338`(is_active)·`:342`(세션 revoke) — 관리자의 계정 비활성화/세션 강제 종료 기능이며 정상 운영 도구다. 마찬가지로 Direct Revocation 탐지의 대상일 뿐 금지 대상이 아니다.
- 문서(`docs/**/*.md`) 자체는 Lint 대상이 아니다 — **"docs 명세는 lint 아님"**: Part 3-8 설계 문서 스스로가 6종 위반 패턴 예시를 텍스트로 서술하더라도, 이는 정적 분석기가 스캔하는 실행 코드가 아니므로 Lint 위반으로 취급하지 않는다. Lint의 스캔 대상은 `backend/src/**/*.php`, `frontend/src/**/*.jsx` 등 실행 코드에 한정된다.

## 3. Canonical 설계

- **탐지 방식**: AST 기반 정적 분석(PHP: 함수 호출 그래프 분석, JS: import/호출 패턴 분석) — 정규식 단순 매칭은 오탐률이 높아 최소 규칙으로만 사용.
- **Direct Revocation 규칙 예시**: `revoke(...)`, `is_active = false`, `assignRole(null)` 계열 호출부 중, 호출 스택에 Certification Review 통과 마커가 없는 경로를 플래그.
- **심각도 단계**: `ERROR`(배포 차단) / `WARNING`(리뷰 필요, §32 Warning Contract와 별개 — 이것은 코드 리뷰 단계, §32는 런타임 경고) / `INFO`(참고).
- **점진 적용(무후퇴 원칙)**: Lint 도입 시점에 기존 위반이 대량 검출될 것이 예상되므로(`Keys.php`, `UserAdmin.php` 기존 revoke 경로), 신규 코드에는 `ERROR`, 기존 코드에는 `WARNING`으로 시작해 Certification 경유 리팩토링을 점진적으로 유도한다. 일괄 강제 차단(빅뱅)은 하지 않는다.
- **CI 통합**: 현재 CLAUDE.md 기준 "no configured lint" 상태이므로, Lint 규칙 자체보다 **CI 파이프라인에 lint 단계를 신설하는 선행 작업**이 필요하다는 점을 SPEC에 명시.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Direct Revocation 탐지 대상 | `Keys.php:135`·`:155`, `UserAdmin.php:338`·`:342`·`:598` | 승격(탐지 대상 목록화, 함수 자체는 미변경) |
| Hardcoded Reviewer 탐지 대상 | `PM/Assignees.php:14`(reviewer role enum) | 승격(탐지 대상 후보, 오탐 가능성 명시) |
| 정적 분석 인프라 | 없음(CI에 lint 단계 자체 부재) | 신규 |
| Missing Evidence/Attestation/Snapshot/Bypass 탐지 규칙 | 없음(§26~§29 종속) | 신규 |

## 5. 무후퇴 · Extend

- `Keys.php`·`UserAdmin.php`의 revoke/rotate/is_active 함수는 Lint 도입 시점에 **수정하지 않는다**. Lint는 이 함수들의 **호출부**를 스캔·경고할 뿐, 함수 자체를 Certification 절차로 강제 리팩토링하지 않는다(무후퇴 — 기존 운영 기능 보존).
- Direct Revocation 규칙은 "Certification 경유로 수렴"을 **장기 목표**로 삼되, 초기 도입은 `WARNING` 수준에 그쳐 기존 배포 파이프라인을 깨뜨리지 않는다.
- §26~§29가 모두 ABSENT인 현재 시점에서는 Missing Evidence/Attestation/Snapshot/Bypass Lint 규칙이 검사할 "정상 경로" 자체가 정의되지 않았으므로, 이 4종 규칙은 §26~§29 구현 이후에만 활성화 가능하다(순서 의존성 명시).
- CI에 lint 단계를 신설하는 것은 기존 `.github/workflows/deploy.yml`의 EN locale syntax guard·build·SCP·smoke test 단계를 대체하지 않고 **추가 단계**로 삽입한다.

## 5-A. Runtime Guard(§29)와의 역할 분담

Static Lint(§30)와 Runtime Guard(§29)는 동일한 위반 개념(예: Bypass Certification ↔ Unauthorized Decision)을 다루더라도 개입 시점이 다르다.

| 구분 | §29 Runtime Guard | §30 Static Lint |
|---|---|---|
| 개입 시점 | 요청 처리 중(런타임) | 코드 커밋/CI 빌드 시점 |
| 대상 | 실행 중인 요청 데이터 | 소스 코드 구조 |
| 실패 시 결과 | HTTP 에러 응답(§31) | CI 실패(배포 차단) 또는 경고 |
| Direct Revocation 대응 | 해당 없음(§29 목록에 없음) | 핵심 탐지 대상 |
| Missing Evidence 대응 | 런타임 값 검증 | 코드 경로상 Evidence 채우기 누락 여부 정적 검증(상호 보완, 중복 아님) |

두 계층은 서로 대체하지 않는다 — Runtime Guard가 실 데이터를 막고, Static Lint는 애초에 그런 데이터 흐름을 만드는 코드가 병합되지 않도록 사전 차단한다(방어 심층화, defense-in-depth).

### 5-B. 타 Part 3-8 엔티티와의 관계

- §26~§29가 정의하는 "정상 경로"(Snapshot 생성 방식, Digest 계산 시점, Guard 통과 조건)가 확정되어야 Static Lint가 "이 정상 경로를 벗어난 코드"를 식별할 기준을 가질 수 있다 — Lint는 Part 3-8 내부에서 가장 하류의 방어 계층이다.
- §31(Error Contract)의 `REMEDIATION_FAILED`는 런타임 시정조치 실패를 다루지만, Static Lint가 사전에 Bypass Certification 경로를 차단하면 애초에 시정조치가 필요한 상황 자체를 줄일 수 있다는 점에서 두 문서는 예방-대응 관계다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: §26(Snapshot)~§29(Runtime Guard) 선행 확정
- [ ] AST 기반 정적 분석 도구 선정(PHP/JS 각각)
- [ ] Direct Revocation 규칙의 오탐 방지 기준 확정(Keys.php/UserAdmin.php 정상 운영 호출과의 구분)
- [ ] CI 파이프라인에 lint 단계 신설 방식 확정(기존 deploy.yml 단계 무변경 전제)
- [ ] ERROR/WARNING/INFO 단계별 적용 로드맵(점진 적용) 확정
- [ ] §29 Runtime Guard와의 역할 중복 여부 최종 검증(방어 심층화 원칙 준수)
- [ ] 코드 변경 0 유지 확인
- [ ] NOT_CERTIFIED 상태 유지 — 실 구현은 별도 승인 세션

## 7. 반날조 인용 출처

- SPEC §30(Static Lint)
- ADR D-5(Reviewer Delegation 상한) · D-6(KEEP_SEPARATE) · D-8(부수발견: 휴면회수부재 — Direct Revocation 탐지가 다뤄야 할 문제의 근거)
- Ground-Truth ① §(Keys.php/UserAdmin.php revoke 함수 목록) · ② §(PM/Assignees 순수오탐)
- ABSENT 항목(Lint 규칙 자체, Missing Evidence/Attestation/Snapshot/Bypass 탐지)은 grep 0 실측 명시 — Direct Revocation은 "탐지 대상 코드는 실재하나 탐지 규칙 자체는 ABSENT"로 구분 판정(과장 금지)
