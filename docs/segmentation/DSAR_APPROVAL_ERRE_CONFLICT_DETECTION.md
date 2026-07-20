# DSAR — ERRE Conflict Detection / SoD (per-entity)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE.
> **EPIC**: 06-A-03-02-03-04 Part 3-7 (Effective Role Resolution Engine)
> **상위 SPEC**: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md` §14
> **상위 ADR**: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md` (D-1·D-5·D-7)
> **Ground-Truth**: `DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
> **Canonical Entity**: `APPROVAL_ROLE_RESOLUTION_*`(Conflict/SoD Node)

---

## 1. 목적

본 DSAR은 ERRE Resolution Pipeline(SPEC §4)의 **13단계 Conflict Detection**(SPEC §14)의 거버넌스 계약을 정의한다. Conflict Detection은 effective role/permission/scope 산출 과정에서 발생하는 **모순·상충**을 탐지한다. SPEC §14가 정의한 상충 유형은 SoD Conflict·Role Conflict·Permission Conflict·Scope Conflict·Policy Conflict·Version Conflict·Assignment Conflict·Dynamic Rule Conflict 8종이다.

이 중 핵심인 **SoD(Segregation of Duties) Conflict는 GeniegoROI에 전면 부재(ABSENT)**하다(Ground-Truth ② 표 #9, `SoD|segregation|mutually.exclusive` 백엔드 grep 0). 다만 상한 검증·intersection clamp 형태의 **근접 substrate**(scope cap·action clamp·scope 상한)가 실재하며, 이는 SoD가 아닌 위임 상한 검증이다. 본 문서는 SoD 부재를 정직하게 기록하고, 근접 substrate를 SoD로 위장하지 않으면서 Conflict Detection의 확장 경계를 정의한다.

## 2. Ground-Truth 판정

### 2.1 SoD — 전면 부재 (ABSENT — Ground-Truth ② 표 #9)

- **SoD Conflict ABSENT**: `SoD|segregation|mutually.exclusive` 백엔드 실코드 grep 0. 유일 매치 `EnterpriseAuth.php:314`는 SAML `SPSSODescriptor` 오탐(권한 SoD 아님).
- 상호배타 role 쌍·직무분리 규칙·SoD 정책 테이블 전무.

### 2.2 근접 substrate (PARTIAL — Ground-Truth ① §2.A·E, ③ 개념 인접)

아래는 상충 "탐지"가 아니라 **위임 상한 검증·intersection clamp**다. SoD와 혼동 금지.

| 파일:라인 | 역할 | 실제 성격 | SoD와의 차이 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:356` | `scopeWithinCap()` — 요청 scope ⊆ manager scope 부분집합 검증(교차차원·무제한·전사=fail-closed) | 위임 상한(cap) | 상호배타 아님·상한 초과 탐지 |
| `backend/src/Handlers/TeamPermissions.php:423` | `clampActions()` — want∩cap 교집합(cap manage면 전체) | intersection clamp | 상충 해소가 아닌 축소 |
| `backend/src/Handlers/TeamPermissions.php:381` | `assignableMap()` — 위임 상한: owner/admin→null·manager→팀권한맵·member→[] | 위임 가능 범위 | 상한 정의 |
| `backend/src/Handlers/TeamPermissions.php:641` | `putMemberPermissions()` — manager 위임 시 assignable 초과 검증→403 `DELEGATION_EXCEEDED` + clamp | 상한 위반 차단 | escalation 차단·SoD 아님 |
| `backend/src/Handlers/TeamPermissions.php:809` | `reclampTeamMembers()` — 팀권한 축소 시 멤버 재클램프 | re-projection | 상한 재계산 |
| `backend/src/Handlers/Keys.php:99` | 클라 scopes를 `allowedScopesForRole` 상한과 교차검증, 초과→422(권한상승 차단) + `array_unique`(:102) | scope 상한 | escalation 차단 |
| `backend/src/Handlers/Keys.php:201` | `allowedScopesForRole()` — role별 scope 상한 | cap 정의 | 상한 |

**정직 분리**(ADR D-7): 위 substrate는 "요청 권한이 상한을 넘는가"(escalation 차단)를 탐지할 뿐, "두 권한이 상호배타인가"(SoD)를 탐지하지 않는다. `DELEGATION_EXCEEDED`(`:641`)는 RBAC 부여상한 초과지 직무분리 위반이 아니다(과거 세션에서 SoD 오탐으로 등재된 이력 참조 — 재오판 금지).

### 2.3 KEEP_SEPARATE (오흡수 금지 · Ground-Truth ② §4)

`PM/Dependencies.php:77`~`:90`(task DFS cycle)·`AdminMenu.php:504`·`:551`(wouldCycle=menu_tree 조상체인)·`GraphScore.php:13`~`:25`(마케팅 그래프)는 순환·의존 탐지지 **권한 SoD가 아니다**(ADR D-5). Role Conflict의 role↔role 그래프 순환과 혼동 금지.

## 3. Canonical 설계

### 3.1 Canonical Entity: Conflict Node

```
RESOLUTION_CONFLICT {
  subject_ref        : 정규화 Subject 식별자
  resolution_version : 불변 버전 바인딩
  conflicts          : [
     { type: sod|role|permission|scope|policy|version|assignment|dynamic_rule,
       parties: [ 상충 당사자 ],
       severity: block|warn,
       source: 근거 substrate }
  ]
  digest             : 정규화 후 해시
}
```

### 3.2 8종 상충 탐지 (SPEC §14)

1. **SoD Conflict** — 상호배타 role/permission 쌍(신규·ABSENT). 예: 발주 권한 ∧ 승인 권한 동시 보유 차단.
2. **Role Conflict** — 상충 role 동시 활성(신규).
3. **Permission Conflict** — allow/deny 동일 target 상충 → Deny 우선 해소(ADR D-4).
4. **Scope Conflict** — `scopeWithinCap()`(`:356`) 상한 위반 승격.
5. **Policy Conflict** — 정책 간 모순(Policy Evaluation 연동).
6. **Version Conflict** — 버전 불일치(Snapshot version binding 의존).
7. **Assignment Conflict** — `DELEGATION_EXCEEDED`(`putMemberPermissions:641`) 상한 초과 승격.
8. **Dynamic Rule Conflict** — 동적 규칙 상충(Part 3-5 계보 연동).

### 3.3 해소 규칙

- **SoD block**: 상호배타 쌍 탐지 시 최종 DENY(fail-secure). SoD는 신규 정책 테이블 필요.
- **상한 위반**: `clampActions`(`:423`)·`scopeWithinCap`(`:356`)의 intersection clamp를 해소 구현체로 재활용(축소로 해소).
- **Permission 상충**: deny>allow(ADR D-4)로 해소.
- **Determinism**(ADR D-2): 동일 입력 → 동일 conflict 집합. Snapshot 영속.

### 3.4 SoD 신규 설계의 최소 요건

SoD가 순신규이므로 최소 다음이 필요하다:
- **상호배타 규칙 테이블**: (role_a, role_b, severity) 또는 (permission_a, permission_b) 쌍. 예 발주 권한 ∧ 발주 승인 권한 동시 보유 금지.
- **탐지 시점**: Assignment write 시(사전)와 Effective Generation 시(사후) 이중 탐지.
- **해소 정책**: block(둘 다 차단) 또는 승인 예외(REQUIRE_APPROVAL) 선택 가능하되 기본 fail-secure=block.
- 이는 근접 substrate(cap 검증)와 **완전히 별개의 신규 로직**이다 — cap은 "상한 초과"를, SoD는 "상호배타"를 본다.

### 3.5 Snapshot·Explain·Error·Warning (SPEC §17·§18·§30·§31)

- **Snapshot**(SPEC §18): conflicts 집합을 Resolution Version과 불변 영속.
- **Explain**(SPEC §17): "어떤 상충 때문인가"를 당사자·유형과 함께 제공.
- **Error**(SPEC §30): 상충 탐지 실패 시 `ROLE_RESOLUTION_FAILED`. Version 불일치 시 별도 Version Conflict.
- **Warning**(SPEC §31): 경미한 상충(warn severity)은 차단 없이 `Policy Updated`류 경고.

## 4. Kernel 매핑 (Resolution Pipeline)

| Pipeline 단계(SPEC §4) | 본 계산기 관여 | substrate 승격/신규 |
|---|---|---|
| 13. Conflict Detection | 8종 상충 탐지 | scope: `scopeWithinCap`(`:356`)·`clampActions`(`:423`); SoD: 신규 ABSENT |
| 14/15. Effective Generation | 상충 해소(clamp/deny) | `putMemberPermissions`(`:641`)·`reclampTeamMembers`(`:809`) |
| 28. Runtime Guard | escalation 차단 | `Keys.php:99` |

SPEC §17 Explain이 "어떤 상충 때문인가" 제공. SPEC §36 Security(Permission/Scope Escalation) 회귀 대상.

### 4.1 DB·Runtime Guard 계약 (SPEC §28·§33)

- **DB Constraint**(SPEC §33): SoD 상호배타 규칙 테이블은 신규(현행 `sod_*` 테이블 grep 0·② §5). Immutable Version·Tenant Isolation 적용.
- **Runtime Guard**(SPEC §28): Permission/Scope Escalation은 현행 `clampActions`(`:423`)·`scopeWithinCap`(`:356`)·Keys 422(`:99`)로 부분 차단 — Guard 신호로 승격. SoD 위반 차단은 신규.

## 5. 무후퇴 · Extend (ADR D-1·D-5·D-7)

- **Extend-only**: `scopeWithinCap`(`:356`)·`clampActions`(`:423`)·`assignableMap`(`:381`)·`DELEGATION_EXCEEDED`(`:641`)·Keys scope 상한(`:99`)을 파괴하지 않고 Conflict Detection의 상한/clamp 구현체로 승격. **SoD는 순신규 추가**.
- **실재 과신 회피**(D-7): 상한 검증(cap)은 SoD가 아니다. `DELEGATION_EXCEEDED`를 SoD 위반으로 오판 금지(과거 오탐 재발 방지).
- **부재 정직 기록**(D-7): SoD grep 0은 실측 부재. `EnterpriseAuth.php:314`는 SAML 오탐.
- **KEEP_SEPARATE**(D-5): `PM/Dependencies.php`·`AdminMenu.php` wouldCycle·`GraphScore`를 Role Conflict 순환탐지로 흡수 금지.
- **병행 유지**: 현행 상한 검증 게이트는 유지·병행. escalation 차단(422/403) 무후퇴.

## 6. 완료 게이트

1. 8종 상충을 통합 탐지(SoD 신규 포함).
2. SoD 상호배타 쌍 → 최종 DENY(fail-secure).
3. Permission 상충 → deny>allow 해소(ADR D-4 정합).
4. Conflict Snapshot·Digest·Version 불변 영속(SPEC §18·§20·§33).
5. Explain Engine이 상충 사유 제공(SPEC §17).
6. Regression: 현행 상한 검증(`DELEGATION_EXCEEDED`·Keys 422) 100% 무후퇴(SPEC §36).
7. `PM/Dependencies`/`AdminMenu` wouldCycle 오흡수 0(KEEP_SEPARATE 감사).

### 6.1 테스트 계약 (SPEC §36)

- **Unit**: SoD 상호배타 쌍 탐지→block, Permission 상충→deny>allow, Scope/Assignment 상한 위반→clamp/422.
- **Integration**: `scopeWithinCap`(`:356`)·`clampActions`(`:423`)·`DELEGATION_EXCEEDED`(`:641`) 상한 회귀, `reclampTeamMembers`(`:809`) 재클램프 정합.
- **오탐 회귀**: `DELEGATION_EXCEEDED`가 SoD로 오분류되지 않음 확인(과거 오탐 재발 방지).
- **KEEP_SEPARATE 감사**: `PM/Dependencies`·`AdminMenu` wouldCycle·`GraphScore` 오흡수 0.
- **Security**: Permission/Scope Escalation 차단(SPEC §36).

> 선행 의존: Part 1~3-6 인증 후 별도 승인 세션. 코드 0. SoD 개념 전면 ABSENT.

## 7. 반날조 인용 출처

- 근접 substrate: `TeamPermissions.php:356·:381·:423·:641·:809`·`Keys.php:99·:102·:201` — Ground-Truth ① §2.A·E
- SoD ABSENT: Ground-Truth ② 표 #9(grep 0·`EnterpriseAuth.php:314` 오탐)
- SPEC §4·§14·§17·§18·§20·§33·§36
- ADR D-1(Extend)·D-4(deny 해소)·D-5(KEEP_SEPARATE)·D-7(정직 분리)
- KEEP_SEPARATE: `PM/Dependencies.php:77~:90`·`AdminMenu.php:504/:551`·`GraphScore.php:13~:25` — Ground-Truth ② §4

**요약**: Conflict Detection = **SoD 전면 ABSENT(순신규)** + 근접 substrate PARTIAL(`scopeWithinCap`/`clampActions`/`Keys scope 상한`=위임상한 검증이지 SoD 아님). 상한 위반은 clamp/deny로 해소·SoD는 신규 정책 테이블 필요. `DELEGATION_EXCEEDED`≠SoD(과거 오탐 재발 금지). 코드 0·NOT_CERTIFIED·선행의존.
