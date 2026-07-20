# DSAR — Service Digest (EPIC 06-A-03-02-03-04 Part 3-6)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
> **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
> **전수조사 근거**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
> **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실구현 후 별도 승인세션.
> **불변**: Digest preimage=저장 필드만으로 재구성 가능해야 함(검증 불가능한 장식 금지) · **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용. 그 밖은 `ABSENT`. 외부 벤더 자격증명≠내부 identity. 289차 확정분(P1~P5) 재플래그 금지.

---

## 1. 목적

Service Digest = Service **Identity·Role·Scope·Runtime·Credential**(스펙 §25) 정본 필드를 결정론적으로 직렬화해 무결성 다이제스트로 봉인하는 축. Part 3-1 Role Digest의 비인간 대응.

- **선행 봉인기 개념 재사용**: 독자 무결성 모델을 신설하지 않고, ADR §3에서 언급한 "SecurityAudit tamper-evident 체인 승격"을 **개념** 참조한다(본 3문서에 `SecurityAudit` file:line 인용 없음 — 실 배선은 아니며 개념 재사용만).
- **5분리 다이제스트**: Identity Digest · Role Digest(service) · Scope Digest · Runtime Digest · Credential Digest를 분리한다. 하나가 다섯 축을 겸하면 변조 탐지 입도가 무너진다.

## 2. Canonical 필드

### 2.1 Digest Input (결정론적 직렬화 대상)

| # | 입력 필드 | 비고 |
|---|---|---|
| 1 | tenant | 다이제스트 preimage 포함 필수 |
| 2 | service_identity_ref / identity_type | Identity 축 |
| 3 | service_role_ref | Role 축(비인간) |
| 4 | scope_digest_input | Runtime Scope 필드 |
| 5 | runtime_digest_input | Runtime Context 필드(Environment/Namespace/Cluster/Pod 등) |
| 6 | credential_digest_input | Secret/Certificate Version |
| 7 | trust_level / authentication_state | 봉인 시점 신뢰·인증 상태 |

### 2.2 파생 다이제스트

| Digest | preimage | 목적 |
|---|---|---|
| **Identity Digest** | service_identity_ref+identity_type | Identity 정본 봉인 |
| **Role Digest(service)** | service_role_ref | Service Role 봉인 |
| **Scope Digest** | scope_digest_input | Runtime Scope 봉인 |
| **Runtime Digest** | runtime_digest_input | Runtime Context 봉인 |
| **Credential Digest** | credential_digest_input | Secret/Certificate Version 봉인 |
| **Snapshot Digest** | 위 5개 Digest + captured_at | 별편 Service Snapshot #13과 결합 |

## 3. 열거형 / 타입

- **digest_scope**: `IDENTITY` · `ROLE` · `SCOPE` · `RUNTIME` · `CREDENTIAL`(스펙 §25 5축)
- **verification_result**: `VALID` · `TAMPERED` · `UNVERIFIABLE`(preimage 재구성 불가 시)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL)

| Digest 축 | 최근접 substrate | 판정 | 근거 |
|---|---|---|---|
| 봉인/검증 알고리즘 | 선행 개념(ADR §3) | **개념참조(미인용)** | — |
| Identity digest input | `api_key`(role/scope/expires_at/is_active) | **PARTIAL**(버전/동결 없음) | `Db.php:942-958`·`Keys.php:81-133` |
| Credential digest input(Secret) | Crypto KEK 버전 | **PARTIAL**(KEK만 버전관리) | `Crypto.php:23-24` |
| Credential digest input(Certificate) | — | **ABSENT** | grep 0(cert_expires grep 0) |
| Runtime digest input | — | **ABSENT** | grep 0 |
| **Identity/Role/Scope/Runtime/Credential Digest 5축 자체** | — | **ABSENT(순신규)** | grep 0 |
| tenant preimage 포함·체인 격리 | — | **ABSENT**(Service 도메인) | — |
| verify() 소비자 | — | **ABSENT**(Service 도메인) | — |

## 5. 설계 원칙

- **선행 봉인기 개념 재사용**: 독자 무결성 모델 신설 금지(Golden Rule).
- **5분리 다이제스트**: Identity·Role·Scope·Runtime·Credential을 분리 봉인. 겸용 금지(변조 탐지 입도 보전).
- **검증 가능성 = 저장 필드 재구성**: preimage(tenant 포함)는 저장된 컬럼만으로 재계산 가능해야 함.
- **Tenant 체인 격리**: 전역 단일 체인 금지.
- **외부 벤더 오흡수 금지**: Google/Snowflake JWT는 Identity Digest 입력으로 오등록 금지(아웃바운드 자격증명).

## 6. Gap / BLOCKED_PREREQUISITE

- Identity/Role/Scope/Runtime/Credential 5축 Digest = **전량 ABSENT**.
- Snapshot Digest 결합 = **BLOCKED_PREREQUISITE**(별편 Service Snapshot 선행).
- Permission Digest 결합(Effective Service Permission 봉인) = **BLOCKED_PREREQUISITE**(Part 2 부재).
- 실 Digest 봉인 엔진 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
