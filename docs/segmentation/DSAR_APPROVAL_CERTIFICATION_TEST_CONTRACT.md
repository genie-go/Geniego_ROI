# DSAR — Certification Test Contract (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §37(테스트)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §37(테스트)은 Certification & Access Review 엔진이 통과해야 할 5개 테스트 계층을 정의한다: Unit(Campaign/Review/Decision/Evidence/Attestation)·Integration(Assignment/RBAC/Approval/Workflow/Audit)·Performance(1M Assignments/500K Reviews/100K Decisions)·Security(Reviewer Spoofing/Decision Tampering/Evidence Manipulation/Escalation Bypass)·Regression(RBAC/Authorization/Workflow/Audit/Compliance 무후퇴). 이 테스트 계약이 요구되는 이유는 명확하다 — 접근권한 검토 엔진 자체가 잘못 동작하면(예: 위조된 Reviewer가 Decision을 등록) 컴플라이언스 신뢰가 통째로 무너지므로, 일반 기능보다 높은 보증 수준이 필요하다. 본 문서는 이 계약을 현행 저장소의 테스트 인프라 부재 상황과 대조하고, 5개 계층 각각의 완료 기준을 명세한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(5계층 전부) · 테스트 하네스 자체가 저장소 전역에 부재**

Ground-Truth ①/②의 실측 결론과 CLAUDE.md(리포지토리 정본 문서)의 명시 사실을 종합하면, Certification 테스트 5계층은 이중으로 ABSENT다: (a) 테스트 대상인 Certification 엔진 자체가 코드 0(grep 0)이므로 테스트할 대상이 없고, (b) 이 저장소 전체에 **구성된 lint/test 스크립트가 없다**(`npm test` 없음, PHPUnit 스위트 없음 — CLAUDE.md "there are no configured lint or test scripts in this repo... Verification is manual / by deploying"). 따라서 Certification Regression 스위트는 대상 엔진뿐 아니라 **실행 하네스 자체**부터 신규로 구축해야 한다.

### 2.2 하위항목 대조표

| SPEC §37 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Unit(Campaign/Review/Decision/Evidence/Attestation) | **ABSENT** | 대상 클래스 자체 grep 0. 테스트 하네스도 부재 |
| Integration(Assignment/RBAC/Approval/Workflow/Audit) | **ABSENT(RBAC 대상만 실재)** | RBAC substrate 자체는 실재(`index.php:506`~`:522` 인증 미들웨어, `TeamPermissions.php:393` effectiveForUser)하나 이를 검증하는 Integration 테스트는 grep 0 |
| Performance(1M/500K/100K) | **ABSENT** | 부하 테스트 하네스 grep 0. PERFORMANCE_REQUIREMENTS DSAR(§36)와 상호의존 |
| Security(Reviewer Spoofing/Decision Tampering/Evidence Manipulation/Escalation Bypass) | **ABSENT** | 4종 공격 시나리오 테스트 grep 0. 대상 엔진 없이 공격 표면 자체가 정의 불가 |
| Regression(RBAC/Authorization/Workflow/Audit/Compliance) | **ABSENT** | 회귀 스위트 grep 0(CLAUDE.md 명시). 수동/배포 검증이 유일한 현행 관례 |

### 2.3 KEEP_SEPARATE

- `docs/CHANGE_GATE.md`·`docs/registry/`(리포지토리 변경 게이트) — 코드 변경 전 10단계 게이트는 존재하나 이는 **작업 프로세스 게이트**이지 Certification 도메인의 자동화 테스트 스위트가 아니다. Test Contract가 이를 "이미 테스트가 있다"로 오인하지 않는다.

## 3. Canonical 설계

5개 테스트 계층은 다음 계약으로 설계된다(코드 미구현, 설계 명세 단계):

### 3.1 Unit
Campaign/Review/Decision/Evidence/Attestation 5개 신규 클래스 각각에 대해, 상태 전이 규칙(Pending→InReview→...)·불변성(Immutable Decision)·필수 필드(Evidence 없는 Approve 거부) 단위 검증. 대상 클래스가 코드 0이므로 실 구현과 테스트가 동시에 작성되어야 한다(TDD 권장, 강제 아님).

### 3.2 Integration
- **Assignment**: Registry(별도 DSAR)가 통합한 4소스(api_key/app_user/team_role/license_key)와 Review 대상 선정이 정합하는지.
- **RBAC**: `index.php:506`~`:522` 인증 미들웨어·`TeamPermissions.php:393`(effectiveForUser)를 통과한 사용자만 Reviewer로 동작하는지.
- **Approval**: Decision 등록 API(API_SURFACE DSAR)가 Evidence 필수 요구를 실제로 강제하는지.
- **Workflow**: Campaign→Review→Decision→Remediation 전체 파이프라인 종단 테스트.
- **Audit**: SecurityAudit(`SecurityAudit.php:56` verify) 참조가 실제로 무결성 검증에 사용되는지.

### 3.3 Performance
PERFORMANCE_REQUIREMENTS DSAR(§36)의 5개 SLA를 1M Assignments·500K Reviews·100K Decisions 규모 데이터로 검증. 부하 생성 스크립트·측정 하네스는 순신규 구축 대상.

### 3.4 Security
- **Reviewer Spoofing**: 타인의 Reviewer 신원을 위조해 Decision을 등록할 수 없는지(인증 미들웨어 `index.php:506` 기반 신원 검증 필수 통과).
- **Decision Tampering**: Immutable Decision(DATABASE_CONSTRAINT §34) 위반 시도(직접 SQL UPDATE 등) 차단 확인.
- **Evidence Manipulation**: Evidence Integrity(§34) — SecurityAudit 해시체인(`SecurityAudit.php:56` verify) 기반 변조 탐지.
- **Escalation Bypass**: Escalation Engine(§19)을 우회해 SLA 초과 항목이 상위 검토자에게 도달하지 않는 경로 차단.

### 3.5 Regression
RBAC/Authorization/Workflow/Audit/Compliance 5개 축에서 **Certification 구현이 기존 substrate를 후퇴시키지 않는지** 검증. 특히 `index.php:506`~`:608` 인증 미들웨어의 응답 계약(401/403 코드·헤더)이 Certification 배선 이후에도 그대로 유지되는지가 핵심 회귀 항목이다.

## 4. Kernel/substrate 매핑

| SPEC §37 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| RBAC Integration 대상 | `index.php:506`~`:522`·`TeamPermissions.php:393` | 검증 대상 참조(테스트 자체는 신규) |
| Audit Security 대상 | `SecurityAudit.php:56`(verify)·`:63`(hash_chain) | 검증 대상 참조(흡수 아님) |
| 테스트 실행 하네스 | 없음(CLAUDE.md 명시 — 리포지토리 전역 미구성) | 신규(Certification뿐 아니라 저장소 최초 스위트가 될 가능성) |
| Unit/Performance/Security 대상 자체 | 없음 | 신규 |

## 5. 무후퇴 · Extend

Golden Rule(Wrap)에 따라 Certification 테스트는 `index.php:506`~`:608` 인증 미들웨어·`TeamPermissions.php:393`(effectiveForUser)의 코드를 수정하지 않고, 이들을 **검증 대상(SUT)** 으로만 참조한다. 이 저장소에 테스트 하네스가 부재하다는 사실(CLAUDE.md 명시)은 Certification 구현 세션이 **저장소 전역 테스트 인프라 부재**라는 더 큰 부채와 만난다는 뜻이며, Certification 전용 테스트를 작성하기 전에 최소 실행 하네스(PHPUnit 설정 등) 도입 여부를 먼저 판단해야 한다(범위 확장은 별도 승인 필요 — Certification 세션에서 저장소 전역 CI를 임의로 신설하지 않는다).

### 5.1 무후퇴 회귀 시나리오

1. **기존 수동 검증 관례 존치**: CLAUDE.md가 명시하는 "Verification is manual / by deploying" 관례는 Certification 테스트 스위트가 갖춰지기 전까지 유지된다 — 테스트 부재를 이유로 배포 검증 자체를 생략하지 않는다.
2. **인증 미들웨어 응답 계약 불변**: Regression 테스트가 `index.php:506`~`:608`의 401/403 응답 형태를 SUT로 검증할 때, 검증 과정에서 해당 미들웨어 코드를 임의 수정하지 않는다.
3. **KEEP_SEPARATE(CHANGE_GATE) 오인 금지**: `docs/CHANGE_GATE.md` 10단계 게이트를 "이미 자동화 테스트가 있다"로 오판하지 않는다 — 이는 인간 검토 프로세스이지 CI 테스트 스위트가 아니다.

### 5.2 리포지토리 전역 테스트 부재라는 별도 부채 (재플래그 아님·병행 인지)

CLAUDE.md가 명시하는 테스트 인프라 부재는 Certification만의 문제가 아니라 이 저장소 전체의 구조적 특징이다. 이를 "Certification 세션이 즉시 해결해야 할 결함"으로 재해석하지 않는다 — 배포 검증(수동 pscp/plink + 헬스체크)이 현재의 정당한 검증 관례이며, Certification Regression 스위트 도입은 저장소 전역 CI 도입이라는 더 큰 결정과 분리해 판단해야 한다(범위 확장 시 별도 승인 필요).

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Part 1~3-7 선행 인증 완결 확인
- [ ] Unit 5종(Campaign/Review/Decision/Evidence/Attestation) 대상 클래스 실 구현과 동시 작성
- [ ] Integration 5종(Assignment/RBAC/Approval/Workflow/Audit) 종단 테스트 확정
- [ ] Performance 3규모(1M/500K/100K) — PERFORMANCE_REQUIREMENTS(§36) SLA와 상호 검증
- [ ] Security 4종(Reviewer Spoofing/Decision Tampering/Evidence Manipulation/Escalation Bypass) 공격 시나리오 확정
- [ ] Regression 5축(RBAC/Authorization/Workflow/Audit/Compliance) 100% 통과 — 저장소 전역 테스트 하네스 도입 여부 별도 판단
- [ ] KEEP_SEPARATE(CHANGE_GATE 프로세스 게이트) 오흡수 여부 재검증
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득(사용자 명시 승인 전 착수 금지)

## 7. 반날조 인용 출처

- SPEC §37(테스트) / ADR D-2(SecurityAudit 참조·흡수아님) · D-4(Attestation/Evidence 불변) · D-5(Reviewer Delegation 상한)
- Ground-Truth ① §A(SecurityAudit: `:56`·`:63`)·§D(위임: `TeamPermissions.php:393`) · ② §2(#1~#3 ABSENT)
- 인용 파일:라인 — `backend/public/index.php:506`~`:522`·`:608`(인증 미들웨어 SUT). `backend/src/SecurityAudit.php:56`(verify)·`:63`(hash_chain). `backend/src/Handlers/TeamPermissions.php:393`(effectiveForUser).
- CLAUDE.md 명시 사실: "no configured lint or test scripts... Verification is manual / by deploying" — 테스트 하네스 부재는 문서 정본 인용이지 grep 추정이 아님.
- ABSENT 5계층(테스트 스위트 자체)은 grep 0 실측(Ground-Truth ② §2) + 저장소 전역 테스트 부재(CLAUDE.md) 이중 근거.

---
**요약**: SPEC §37의 5개 테스트 계층 판정 = 전부 ABSENT. 대상 엔진 코드 0 + 저장소 전역 테스트 하네스 부재(CLAUDE.md)라는 이중 공백. RBAC(`index.php:506`~`:522`)·SecurityAudit(`:56`·`:63`)는 검증 대상(SUT)으로만 참조하고 흡수하지 않는다. 코드 0·NOT_CERTIFIED·BLOCKED_PREREQUISITE 유지.
