# DSAR — Approval Role Error / Warning Contract (EPIC 06-A-03-02-03-04 Part 3-1 · Role Registry Foundation)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_ROLE_REGISTRY_FOUNDATION`](../architecture/ADR_DSAR_ROLE_REGISTRY_FOUNDATION.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2) 실 구현 부재
- **불변**: Role ≠ Permission ≠ Authority ≠ Job Title ≠ Plan · Golden Rule · 폐기 admin_roles 재부활 금지 · 289차 P1~P4 재플래그 금지 · 반날조(file:line은 상위 ADR·전수조사 2문서만·없으면 ABSENT)

---

## 1. 목적

§60(Error)·§61(Warning)의 **Role Registry 에러/경고 코드 목록 정본**을 정의한다. Error=요청을 **차단(fail-closed)**하는 확정 위반, Warning=처리는 진행하되 **감사·후속 조치를 유발**하는 신호다. 본 문서는 두 목록을 코드 형식(`APPROVAL_ROLE_*`)으로 봉인해 §59 런타임 가드(차단)·§62 API(응답)가 공유하는 단일 소스로 삼는다. **현행 저장소에는 이 코드 체계가 전무**하며(순신규), 현재의 authz 실패는 flat HTTP 403/401(RBAC 미들웨어·`requireTeamWrite`)로만 표현된다.

## 2. 열거 / 항목

### 2.1 §60 Error 코드 (fail-closed 차단 · 정본)

| 코드 | 트리거 |
|---|---|
| `APPROVAL_ROLE_REGISTRY_NOT_FOUND` | Registry/Namespace/Definition 미존재 |
| `APPROVAL_ROLE_NOT_FOUND` | 요청 Role Code 미등록 |
| `APPROVAL_ROLE_ACTIVE_VERSION_NOT_FOUND` | Active Version 미확정 |
| `APPROVAL_ROLE_INVALID_CODE` | Canonical Code 형식/네임스페이스 위반 |
| `APPROVAL_ROLE_INACTIVE` | Draft/미활성 Role 런타임 사용 |
| `APPROVAL_ROLE_SUSPENDED` | Suspended Role 사용/신규 Assignment |
| `APPROVAL_ROLE_DEPRECATED` | Deprecated Role 신규 Assignment |
| `APPROVAL_ROLE_RETIRED` | Retired Role 런타임 사용 |
| `APPROVAL_ROLE_TENANT_MISMATCH` | Role 정의 tenant ≠ 요청 tenant |
| `APPROVAL_ROLE_ACTOR_TYPE_INELIGIBLE` | actor type(HUMAN/SERVICE/SYSTEM/API_CLIENT) 부적격 |
| `APPROVAL_ROLE_SCOPE_REQUIREMENT_UNSATISFIED` | 필요 Scope 미충족 |
| `APPROVAL_ROLE_ASSIGNMENT_POLICY_VIOLATION` | Assignment Policy 위반 |
| `APPROVAL_ROLE_OWNER_MISSING` | Business/Technical/Security Owner 부재 |
| `APPROVAL_ROLE_PERMISSION_VERSION_MISMATCH` | 결합 Permission Version 불일치(BLOCKED·Part 2) |
| `APPROVAL_ROLE_PERMISSION_RETIRED` | Retired Permission 포함(BLOCKED·Part 2) |
| `APPROVAL_ROLE_DUPLICATE_CODE` | Role Code 중복 |
| `APPROVAL_ROLE_AMBIGUOUS` | 모호 단독 Role 자동활성 시도 |
| `APPROVAL_ROLE_DIGEST_MISMATCH` | Definition digest 불일치 |
| `APPROVAL_ROLE_SNAPSHOT_MISSING` | 필수 Snapshot 부재 |
| `APPROVAL_ROLE_EVIDENCE_MISSING` | 필수 Evidence 부재 |
| `APPROVAL_ROLE_REVIEW_OVERDUE` | Review 기한 초과(정책상 차단 시) |
| `APPROVAL_ROLE_CERTIFICATION_OVERDUE` | Certification 기한 초과(정책상 차단 시) |
| `APPROVAL_ROLE_CROSS_TENANT_BLOCKED` | Cross-Tenant 참조/캐시 차단 |
| `APPROVAL_ROLE_RUNTIME_BLOCKED` | 상태/Lifecycle 위반 런타임 차단(집합) |
| `APPROVAL_ROLE_TAMPER_DETECTED` | 불변 Version/Snapshot/Evidence 변조 탐지 |
| `APPROVAL_ROLE_MANDATORY_CONTROL_DISABLED` | 고객설정으로 필수 통제 비활성 시도(§6.17) |

### 2.2 §61 Warning 코드 (진행 + 감사 · 정본)

| 코드 | 트리거 |
|---|---|
| `APPROVAL_ROLE_DEPRECATION_WARNING` | Deprecated 예정 Role 사용 |
| `APPROVAL_ROLE_RETIREMENT_WARNING` | Retire 예정 Role 사용 |
| `APPROVAL_ROLE_VERSION_WARNING` | 비-Active Version 참조/버전 지연 |
| `APPROVAL_ROLE_OWNER_WARNING` | Owner 정보 불완전 |
| `APPROVAL_ROLE_REVIEW_DUE` | Review 임박 |
| `APPROVAL_ROLE_CERTIFICATION_DUE` | Certification 임박 |
| `APPROVAL_ROLE_HIGH_RISK` | 고위험 Role 사용 |
| `APPROVAL_ROLE_CRITICAL` | Critical Role 사용 |
| `APPROVAL_ROLE_DIRECT_ASSIGNMENT` | 직접(정책 외) Assignment |
| `APPROVAL_ROLE_TEMPORARY_ASSIGNMENT` | 임시 Role Assignment |
| `APPROVAL_ROLE_EMERGENCY_ASSIGNMENT` | Emergency(break-glass) Assignment |
| `APPROVAL_ROLE_DUPLICATE_WARNING` | 유사/중복 후보 Role |
| `APPROVAL_ROLE_MIGRATION_WARNING` | Migration/Alias 경로 사용 |
| `APPROVAL_ROLE_DRIFT_WARNING` | 정의-실사용 Drift 감지 |
| `APPROVAL_ROLE_RECONCILIATION_WARNING` | Reconciliation 필요 |
| `APPROVAL_ROLE_MANUAL_REVIEW` | 수동 검토 라우팅 |

## 3. substrate 매핑 (§5.2)

| Canonical 코드축 | §5.2 태그 | 실 substrate (file:line) |
|---|---|---|
| 구조화 Error/Warning 코드 체계 | **ABSENT → 신설** | 없음 — 현행은 flat HTTP 403/401 |
| 현행 authz 실패 표면(최근접) | **PARTIAL(flat)** | RBAC 미들웨어(roleRank `index.php:573`) · `requireTeamWrite`(`UserAuth.php:1134`) · roleOf fail-closed(`TeamPermissions.php:120-131`) |
| fail-closed 정규화(코드 유사) | **PARTIAL** | roleOf 미해결→member(`TeamPermissions.php:120-131`) · validRoles(`Keys.php:95`) |
| Snapshot/Evidence/Digest/Tamper 코드 | **ABSENT** | Snapshot/digest 부재 · Evidence=auth_audit_log 변경로그만 |
| Permission Version 코드 | **BLOCKED_PREREQUISITE** | Part 2 Permission Engine 실 구현 후 |

## 4. 설계 원칙

1. **Error=차단·Warning=진행+감사 이분법 고정** — Lifecycle/Tenant/Actor/Digest/Tamper 위반은 Error(fail-closed), Deprecation/Review/Risk/Migration/Drift는 Warning. 혼용 금지.
2. **코드 목록 단일 정본** — §59 가드·§62 API·§66 테스트가 본 문서의 코드 이름을 공유. 코드 문자열 중복 정의 금지.
3. **fail-closed 계승** — 현행 roleOf(미해결→member)·RBAC 기본거부를 Registry Error 코드로 승격하되 기본거부 방향 유지(권한상승 금지).
4. **Mandatory Control 코드(§6.17)** — 필수 통제 비활성 시도는 `_MANDATORY_CONTROL_DISABLED` Error로 차단(고객설정으로 끌 수 없음).
5. **Tamper/Digest 코드는 무결성 정본에 결합** — 새 해시엔진 남립 금지(본 Part 코드 0).

## 5. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: `_PERMISSION_VERSION_MISMATCH`·`_PERMISSION_RETIRED`는 Part 2 이후 실효.
- **Gap(순신규)**: Error 26 + Warning 16 코드 전부 신설 — 현행은 flat HTTP 상태만 존재.
- **PARTIAL(최근접)**: RBAC/`requireTeamWrite`/roleOf가 차단은 하나 구조화 코드·Warning 신호 미표현.
- **정직 부재**: JobTitle/isManager/isApprover 기반 에러 코드 불필요(개념 부재).
- **판정**: NOT_CERTIFIED · 실 코드 방출 = Registry 신설 + Part 2 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_ROLE_RUNTIME_GUARDS]] · [[DSAR_APPROVAL_ROLE_API_CONTRACT]] · [[DSAR_APPROVAL_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ROLE_REGISTRY_FOUNDATION]]
