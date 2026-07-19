# DSAR — Role Audit Event (EPIC 06-A-03-02-03-04 Part 3-1)

> **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
> **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
> **전수조사 근거**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
> **반날조**: 모든 `file:line`은 상위 ADR·전수조사 2문서에서만 인용한다. 그 밖은 `ABSENT`. Role≠Permission≠Authority. 289차 확정분 재플래그 금지.

---

## ① 목적

Role Audit Event = **Role Registry/Namespace/Definition/Version의 전 생애주기 변화를 SSOT 감사 로그에 append-only로 기록**하는 이벤트 어휘. Evidence(별편 4)가 상태 동결 근거라면, Audit Event는 **"무슨 변화가 언제 누구에 의해 일어났는가"의 변경 축**이다.

- **매핑 SSOT**: 모든 Role Audit Event는 **`auth_audit_log`을 SSOT**로 기록한다(변경 로그·Evidence substrate). 단 현행 `auth_audit_log`은 Role 어휘를 발화하지 않으므로, 아래 이벤트는 **전건 발화 지점 부재(CONTRACT_ONLY)**.
- Role≠Permission≠Authority: 본 이벤트는 Role 정의/버전/결합 변화이지, 실 Subject 부여 이벤트(Part 3-3)도 승인 권한 결정(Part 5)도 아니다.

## ② Canonical 필드 (이벤트 레코드 · 코드 0)

`ROLE_AUDIT_EVENT`

| # | 필드 | 의미 |
|---|---|---|
| 1 | event_id | 식별자 |
| 2 | tenant | 테넌트 스코프(체인 격리 필수) |
| 3 | event_type | 이벤트 유형(③ 열거형) |
| 4 | role_definition_ref / role_version_ref | 대상 |
| 5 | actor_ref | 발화 Actor(위조 불가 신원 축) |
| 6 | before_ref / after_ref | 변경 전후 Snapshot 참조(별편 1·2·3) |
| 7 | reason | 변경 사유 |
| 8 | occurred_at | 발생 시각 |
| 9 | prev_hash / hash_chain | 선행 Hash Chain 봉인기 개념(별편 6) |

## ③ 열거형 — Role Audit Event 어휘 (전건 CONTRACT_ONLY · 발화 지점 0)

원문 전사:

| # | event_type | 축 |
|---|---|---|
| 1 | ROLE_REGISTRY_CREATED | Registry |
| 2 | NAMESPACE_CREATED | Namespace |
| 3 | DEFINITION_CREATED | Definition |
| 4 | VERSION_CREATED | Version |
| 5 | SUBMITTED_FOR_REVIEW | Lifecycle |
| 6 | APPROVED | Lifecycle |
| 7 | ACTIVATED | Lifecycle |
| 8 | SUSPENDED | Lifecycle |
| 9 | REACTIVATED | Lifecycle |
| 10 | DEPRECATED | Lifecycle |
| 11 | RETIRED | Lifecycle |
| 12 | ARCHIVED | Lifecycle |
| 13 | PERMISSION_ADDED | Permission Mapping |
| 14 | PERMISSION_REMOVED | Permission Mapping |
| 15 | PERMISSION_VERSION_CHANGED | Permission Mapping(Version) |
| 16 | GROUP_ADDED | Group Mapping |
| 17 | GROUP_REMOVED | Group Mapping |
| 18 | BUNDLE_ADDED | Bundle Mapping |
| 19 | BUNDLE_REMOVED | Bundle Mapping |
| 20 | SCOPE_REQUIREMENT_CHANGED | Scope |
| 21 | ACTOR_ELIGIBILITY_CHANGED | Actor |
| 22 | RISK_CHANGED | Risk |
| 23 | CRITICALITY_CHANGED | Criticality |
| 24 | OWNER_CHANGED | Ownership |
| 25 | ASSIGNMENT_POLICY_CHANGED | Policy |
| 26 | REVIEW_POLICY_CHANGED | Policy |
| 27 | CERTIFICATION_POLICY_CHANGED | Policy |
| 28 | REPLACEMENT_CREATED | Replacement |
| 29 | ALIAS_CREATED | Alias/Localization |
| 30 | SNAPSHOT_CREATED | Snapshot(별편 1) |
| 31 | EVIDENCE_CREATED | Evidence(별편 4) |
| 32 | DRIFT_DETECTED | Integrity |
| 33 | REVALIDATION | Integrity |
| 34 | RECONCILIATION | Integrity |
| 35 | MIGRATION | Integrity |
| 36 | RUNTIME_BLOCKED | Enforcement(Retired/Deprecated 부여 차단) |

## ④ substrate 매핑 (§5.2 분류 + file:line · 없으면 ABSENT)

| Audit Event 축 | 현행 substrate | §5.2 태그 | 근거 | 판정 |
|---|---|---|---|---|
| 감사 저장소(SSOT) | **auth_audit_log** | Evidence substrate(변경 로그만) | 전수조사 §1.1·ADR §18(team_role 감사=auth_audit_log) | **PARTIAL(SSOT·어휘 미발화)** |
| actor_ref(위조 불가) | 미들웨어 인증 신원 축 | — | (개념·Role 도메인 발화 0) | ABSENT(Role 이벤트) |
| **위 36종 이벤트 발화** | — | — | **grep 0(Role 어휘 발화 지점 전무)** | **CONTRACT_ONLY 36/36** |
| before/after Snapshot 참조 | — | — | **ABSENT**(별편 1·2·3 미존재) | **ABSENT** |
| prev_hash/hash_chain | — | — | **ABSENT**(개념=선행 Hash Chain 봉인기) | **ABSENT** |

> ★판정: 감사 **저장소**만 `auth_audit_log`으로 실재(PARTIAL·변경 로그만)하고, **36종 이벤트 어휘는 전건 발화 지점 0 = CONTRACT_ONLY**. `admin_roles/user_roles`(`routes.php:1670`·`UserAdmin.php:596-599`)의 폐기 CRUD를 이벤트 생산자로 재부활 금지(289차 확정).

## ⑤ 설계원칙

- **auth_audit_log = SSOT**: Role Audit Event는 별도 4번째 감사 스토어를 신설하지 않고 SSOT에 기록(Golden Rule). 단 어휘(event_type ENUM)·tenant 체인·Snapshot 참조는 확장 필요.
- **Append-only + Tenant 체인 격리**: 이벤트는 append-only. Hash Chain 적용 시 `WHERE tenant_id=?` 체인 격리 필수(전역 단일 체인 금지 — 테넌트 A 쓰기가 B 체인 오염 방지).
- **before/after Snapshot 참조**: 이벤트는 변경 전후 Snapshot을 가리켜 재현 가능해야 함. 변경 로그 단독은 상태 재구성 불가.
- **actor 위조 불가**: 발화 Actor는 헤더 신뢰가 아닌 미들웨어 인증 신원에서. (헤더 기반 actor 위조 안티패턴 미승계.)
- **선행 Hash Chain 봉인기 개념참조**: `prev_hash/hash_chain`은 선행 Canonical Cryptographic Hash Chain 봉인기 개념 재사용(별편 6). 봉인 검증은 별편 6.

## ⑥ Gap

- 36종 Role Audit Event 어휘 = **전건 CONTRACT_ONLY**(발화 지점 0).
- `auth_audit_log`은 **변경 로그만(PARTIAL)** · Role event_type ENUM·tenant 체인·Snapshot 참조 = **ABSENT**.
- Hash Chain 봉인·`verify` = **ABSENT**(개념=선행 봉인기·별편 6).
- 실 Audit Event 발화·저장소 확장 = **별도 승인세션(RP-002)**. 본 편 **코드/DB 0 · NOT_CERTIFIED**.
