# DSAR — Role Digest (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 `ABSENT`. Role≠Permission≠Authority. 289차 확정분 재플래그 금지.

---

## ① 목적

Role Digest = **Role Definition/Snapshot/Evidence의 정본 필드 집합을 결정론적으로 직렬화해 무결성 다이제스트로 봉인**하는 축. 스냅샷·증거의 사후 변조를 탐지 가능하게 만드는 봉인기.

- **선행 Canonical Cryptographic Policy 재사용**: Role Digest는 별도 무결성 모델을 신설하지 않고, **선행 블록(Part 1 Authorization Registry)이 정의한 Canonical Cryptographic Hash Chain 봉인기를 개념 재사용**한다(Golden Rule = Extend). 매핑: Part 1 `SecurityAudit::verify`(**개념** 참조 — 실 소비는 Role 도메인 신설 시).
- **3분리 다이제스트**: Role **Definition** Digest(정의 봉인) · Role **Snapshot** Digest(캡처 봉인) · **Evidence** Digest(증거 봉인)를 분리한다. 하나의 다이제스트가 세 축을 겸하면 변조 탐지 입도가 무너진다.

## ② Canonical 필드 (Digest Input 명세 · 코드 0)

### 2.1 Role Definition Digest Input (결정론적 직렬화 대상)

| # | 입력 필드 | 비고 |
|---|---|---|
| 1 | tenant | 테넌트(다이제스트 preimage 포함 필수) |
| 2 | registry / namespace | Registry·Namespace(`{DOMAIN}:{FUNCTION}:{ROLE}`) |
| 3 | role_code / version | Canonical Code·Version 순번 |
| 4 | type / category | 유형·분류 |
| 5 | domains | Authorization Domain 매핑 |
| 6 | actor_eligibility | 부여 가능 Actor 유형 |
| 7 | risk / criticality | 리스크·중요도 |
| 8 | permission_digest | Permission 매핑 다이제스트(별편 3) |
| 9 | group_digest / bundle_digest | Group·Bundle 매핑 다이제스트 |
| 10 | scope_requirement_digest | Scope Requirement 다이제스트 |
| 11 | assignment_policy_digest | Assignment Policy 다이제스트 |
| 12 | owner_digest | Owner(Business/Technical/Security) 다이제스트 |
| 13 | review_digest / certification_digest | 검토·인증 정책 다이제스트 |
| 14 | lifecycle / validity | Lifecycle 상태·유효기간 |

### 2.2 파생 다이제스트

| Digest | preimage | 목적 |
|---|---|---|
| **Role Definition Digest** | 2.1 전 필드 결정론 직렬화 | 정의 정본 봉인 |
| **Role Snapshot Digest** | 별편 1 Snapshot 전 필드 + Definition Digest | 캡처 시점 봉인(별편 1 #21) |
| **Evidence Digest** | 별편 4 Evidence 참조 집합 + Snapshot Digest | 증거 묶음 봉인(별편 4 #14·#16) |

## ③ 열거형 (설계 · 코드 0)

- **digest_algorithm**: 선행 Canonical Cryptographic Policy가 지정(개념 재사용 · 독자 알고리즘 신설 금지)
- **digest_scope**: `DEFINITION` · `SNAPSHOT` · `EVIDENCE`(3분리)
- **verification_result**: `VALID` · `TAMPERED` · `UNVERIFIABLE`(preimage 재구성 불가 시)

## ④ substrate 매핑 (§5.2 분류 + file:line · 없으면 ABSENT)

| Digest 축 | 현행 substrate | §5.2 태그 | 근거 | 판정 |
|---|---|---|---|---|
| 봉인/검증 알고리즘 | **Part 1 선행 봉인기** `SecurityAudit::verify` | 개념 재사용 | (개념 · 선행 블록 정본) | **개념참조(Role 도메인 미소비)** |
| Definition preimage 필드 | `team_role`+`TeamPermissions`(현재값) | CANONICAL_ROLE_REGISTRY_CANDIDATE | `UserAuth.php:188`·`TeamPermissions.php:120-131` | PARTIAL(버전/동결 없음) |
| **Role Definition/Snapshot/Evidence Digest** | — | — | **ABSENT** | **ABSENT(순신규)** |
| tenant preimage 포함·체인 격리 | — | — | **ABSENT**(Role 도메인) | **ABSENT** |
| verify() 소비자 | — | — | **ABSENT**(Role 도메인) | **ABSENT** |

> ★규율: 봉인기는 **개념 재사용**이지 Role 도메인에 `SecurityAudit`를 그대로 배선한다는 뜻이 아니다. 실 배선·소비자·검증기는 Role Registry 실구현 시 별도 신설(RP-002). 검증 불가능한 장식(preimage 재구성 불가) 상속 금지 — 다이제스트 preimage는 **저장된 필드만으로 재구성 가능**해야 한다.

## ⑤ 설계원칙

- **선행 봉인기 개념 재사용**: 독자 무결성 모델 신설 금지(Golden Rule). Part 1 Canonical Cryptographic Hash Chain 봉인기 개념 재사용.
- **3분리 다이제스트**: Definition·Snapshot·Evidence를 분리 봉인. 겸용 금지(변조 탐지 입도 보전).
- **검증 가능성 = 저장 필드 재구성**: preimage(tenant 포함)는 저장된 컬럼만으로 재계산 가능해야 함. 그렇지 않으면 검증기가 있어도 영구 실패(장식화).
- **Tenant 체인 격리**: Hash Chain 적용 시 `WHERE tenant_id=?`. 전역 단일 체인 금지.
- **Role≠Permission≠Authority**: Definition Digest는 Role 정의만 봉인. Permission 다이제스트(별편 3)·승인 권한(Part 5)과 분리 결합.

## ⑥ Gap

- Role Definition/Snapshot/Evidence Digest 3분리 봉인 = **전량 ABSENT**.
- 봉인기 실 배선·verify 소비자·tenant 체인 격리 = **ABSENT**(개념=Part 1 선행 봉인기).
- Permission **Version** 다이제스트 결합 = **BLOCKED_PREREQUISITE**(Part 2 부재).
- 실 Digest 봉인 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
