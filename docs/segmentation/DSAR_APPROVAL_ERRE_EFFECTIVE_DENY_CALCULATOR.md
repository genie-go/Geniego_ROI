# DSAR — ERRE Effective Deny Calculator (per-entity)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · BLOCKED_PREREQUISITE.
> **EPIC**: 06-A-03-02-03-04 Part 3-7 (Effective Role Resolution Engine)
> **상위 SPEC**: `docs/spec/EPIC_06A_PART3_7_EFFECTIVE_ROLE_RESOLUTION_ENGINE_GOVERNANCE_SPEC.md` §11
> **상위 ADR**: `docs/architecture/ADR_DSAR_EFFECTIVE_ROLE_RESOLUTION_ENGINE_FOUNDATION.md` (**D-4 핵심**·D-1·D-7)
> **Ground-Truth**: `DSAR_APPROVAL_ERRE_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_ERRE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
> **Canonical Entity**: `APPROVAL_EFFECTIVE_DENY`

---

## 1. 목적

본 DSAR은 ERRE Resolution Pipeline(SPEC §4)의 **9단계 Explicit Deny Projection** 및 **Effective Deny Calculator**(SPEC §11)의 거버넌스 계약을 정의한다. Effective Deny Calculator는 Subject의 접근을 **명시적으로 차단**하는 deny 신호를 통합 산출한다. SPEC §11이 정의한 deny 종류는 Explicit Deny·Runtime Deny·Risk Deny·Policy Deny·Environment Deny 5종이다.

본 계산기의 최상위 불변식은 **"Explicit Deny는 어떤 Allow보다 우선한다"**(SPEC §11·§8, ADR **D-4**)이다. 현행 GeniegoROI에는 이 원칙이 **scope 차원 fail-closed 센티넬(`__deny__`)**과 **member 쓰기 전역 차단(`guardTeamWrite`)**으로 국소 구현돼 있으나, 통합 "deny beats allow" 규칙과 행 단위 negative-ACL 레코드는 부재하다. 본 계산기는 국소 deny를 **전역 Effective Deny Calculator로 승격**(ADR D-4)한다.

## 2. Ground-Truth 판정

### 2.1 실존 substrate (PARTIAL — Ground-Truth ① §2, §3)

deny substrate는 두 축으로 실재하나 통합 규칙·negative-ACL은 부재하다.

| 파일:라인 | 역할 | deny 종류 | 상태 |
|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:234` | `DENY_SCOPE` 센티넬 `__deny__` — 명시적 거부 | Explicit Deny(scope) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:272` | `scopeValuesFor()` — `__deny__`→[](빈 허용값) | Deny 투영 | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:286` | `scopeSql()` — deny→`AND 1=0`(SQL 전면차단) | Deny enforcement | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:236` | `effectiveScope()` — 비-owner 조회 실패→DENY_SCOPE(fail-closed) | Deny 기본화 | PRESENT |
| `backend/src/Handlers/UserAuth.php:1167` | `guardTeamWrite()` — member 쓰기만 403(전역 미들웨어용), 그외 fail-open, demo 우회 | Runtime Deny(team_role) | PRESENT |
| `backend/public/index.php:82` | 전역 `guardTeamWrite()` 호출 — mutating 요청 라우팅 전 차단, `/auth/*` 예외 | Runtime Deny(전역 배선) | PRESENT |
| `backend/public/index.php:604` | `GENIE_STRICT_AUTH=1` + 무-tenant→403(모호성 시 deny 우선, 기본 OFF) | Deny(opt-in) | PARTIAL |

**결합 로직 실측**(Ground-Truth ① §3): "explicit deny > allow"는 **PARTIAL**이다. 통합 "deny beats allow" 규칙이 없고, deny는 도메인별 fail-closed 센티넬로만 국소 구현된다. **행 단위 negative-ACL(explicit deny 레코드) 테이블·로직 부재** — acl_permission은 allow-only grant 모델이다. member 쓰기 전역 deny는 `guardTeamWrite`(`UserAuth.php:1167`)+`index.php:82`로 전역 배선돼 있다.

### 2.2 부재 (ABSENT — Ground-Truth ② 표 #1·#7)

- **통합 Deny Calculator 부재**: Explicit/Runtime/Risk/Policy/Environment Deny를 하나로 결합하는 계산기 없음.
- **Risk Deny ABSENT**: role 기반 위험등급이 없어(Effective Risk Calculator ABSENT, ② 표 #7) Risk Deny 신호원 부재.
- **negative-ACL 레코드 부재**(① §3): allow-only grant 모델.

### 2.3 KEEP_SEPARATE (오흡수 금지 · Ground-Truth ② §4)

`Alerting.php:665`("executor identity"는 알림 실행자지 deny resolution executor 아님)·`SecurityAudit.php:25`~`:31`(append-only hash chain — deny 아닌 audit)은 deny substrate가 아니다. 오흡수 금지.

## 3. Canonical 설계

### 3.1 Canonical Entity: `APPROVAL_EFFECTIVE_DENY`

```
APPROVAL_EFFECTIVE_DENY {
  subject_ref        : 정규화 Subject 식별자
  resolution_version : 불변 버전 바인딩
  deny_set           : [
     { type: explicit|runtime|risk|policy|environment,
       target: { menu_key|scope_dim|action|resource },
       source: substrate 근거,
       reason: 사람이해 가능 사유 (SPEC §17 Explain) }
  ]
  precedence         : "DENY_BEATS_ALLOW"   // 불변식 (ADR D-4)
  digest             : 정규화 후 해시
}
```

### 3.2 최상위 불변식 — Deny > Allow 전역화 (ADR D-4·SPEC §11)

- **Explicit Deny > 모든 Allow**: deny_set에 target이 존재하면, Effective Permission·Scope Calculator가 어떤 allow를 산출했든 최종 결정은 **차단**이다.
- **국소 `__deny__` 승격**: 현행 scope 차원 한정 `__deny__`(`TeamPermissions.php:234`→`:272`→`:286`)를 전역 Deny Calculator의 Explicit Deny 소스로 승격. `AND 1=0`(`:286`) 강제는 enforcement 구현체로 재활용.
- **narrow scope > wide scope · runtime constraint > static constraint**(SPEC §8) 병행.
- **member 쓰기 전역 deny**: `guardTeamWrite`(`UserAuth.php:1167`)+`index.php:82`를 Runtime Deny 소스로 승격.

### 3.3 5종 Deny 소스 (SPEC §11)

1. **Explicit Deny** — `__deny__` 센티넬 + (신규) negative-ACL 레코드.
2. **Runtime Deny** — `guardTeamWrite` member 차단·컨텍스트 기반 차단.
3. **Risk Deny** — Effective Risk Calculator HIGH/CRITICAL → 차단(신규·ABSENT 의존).
4. **Policy Deny** — Policy Evaluation(SPEC §13) 위반.
5. **Environment Deny** — 환경(prod/staging)·IP·geo 기반 차단(`GENIE_STRICT_AUTH`(`index.php:604`) 확장).

### 3.4 Determinism·Fail-secure (ADR D-2·D-4)

동일 (Subject·Context·Version) → 동일 deny_set. 모호성·조회 실패 시 **deny 우선**(`effectiveScope`(`:236`)의 fail-closed 시맨틱을 전역 기본값으로 승격). deny 결과는 Snapshot에 불변 영속.

### 3.5 negative-ACL 레코드 신설 (ADR D-4)

현행 acl_permission은 allow-only grant 모델(Ground-Truth ① §3)이다. 통합 Deny Calculator는 **행 단위 negative-ACL(explicit deny 레코드)**를 신설해야 한다 — (subject, target, deny_type) 레코드로 명시적 차단을 영속. 기존 `__deny__` 센티넬(`TeamPermissions.php:234`)은 scope 차원 negative-ACL의 부분 선행 구현으로 승계.

### 3.6 Snapshot·Explain·Error·Warning (SPEC §17·§18·§30·§31)

- **Snapshot**(SPEC §18): deny_set을 Resolution Version과 불변 영속.
- **Explain**(SPEC §17): "어떤 Deny 때문인가"를 사람이해·JSON 양형 제공 — deny target·source·reason 명시(필수).
- **Error**(SPEC §30): deny 평가 실패 시 `POLICY_EVALUATION_FAILED`(fail-closed로 차단), 무효 컨텍스트 시 `INVALID_RUNTIME_CONTEXT`.
- **Warning**(SPEC §31): Risk Deny 활성 시 `Runtime Context Changed`, 정책 변경 반영 필요 시 `Policy Updated`.

## 4. Kernel 매핑 (Resolution Pipeline)

| Pipeline 단계(SPEC §4) | 본 계산기 관여 | substrate 승격 대상 |
|---|---|---|
| 9. Explicit Deny Projection | deny_set 산출 | `DENY_SCOPE`(`:234`)·`scopeSql`(`:286`) |
| 10. Risk Projection | Risk Deny 신호 수용 | (신규 — Risk Calculator 의존) |
| 12. Policy Evaluation | Policy Deny 수용 | (Policy Evaluation DSAR) |
| 14/15. Effective Generation | deny>allow 최종 override | `guardTeamWrite`(`UserAuth.php:1167`) |
| 28. Runtime Guard | Permission/Scope Escalation 차단 | `index.php:82` |

SPEC §27 Runtime Authorization Projection의 **Effective Deny Set**으로 노출. SPEC §17 Explain Engine이 "어떤 Deny 때문인가"를 사람이해·JSON 양형으로 제공.

### 4.1 DB·Runtime Guard·Static Lint 계약 (SPEC §28·§29·§33)

- **DB Constraint**(SPEC §33): negative-ACL 레코드는 Immutable Version·Tenant Isolation. 현행 `WHERE tenant_id=?`(② §5) 격리 승계.
- **Runtime Guard**(SPEC §28): `guardTeamWrite`(`UserAuth.php:1167`)+`index.php:82`가 mutating 요청 라우팅 전 member 쓰기 차단을 Guard 신호로 승격. Invalid Graph·Permission/Scope Escalation 차단.
- **Static Lint**(SPEC §29): deny 우회(bypass resolution engine)·하드코딩 authz(ADR D-6, 233개소)를 정적 탐지 대상으로 등록.

## 5. 무후퇴 · Extend (ADR D-1·D-4·D-7)

- **Extend-only(전역 승격)**: 국소 `__deny__`(`TeamPermissions.php:234`)와 `guardTeamWrite`(`UserAuth.php:1167`)를 파괴하지 않고 전역 Effective Deny Calculator의 소스로 승격(ADR D-4).
- **실재 과신 회피**(D-7): `guardTeamWrite`는 member 읽기전용 강제지 scope-escalation 전반 가드가 아니다. `__deny__`는 scope 차원 한정이다. 이를 통합 deny 규칙으로 오판 금지.
- **부재 과장 회피**(D-7): negative-ACL·Risk Deny grep 0은 실측 부재. acl_permission은 allow-only 모델.
- **병행 유지·강화**: 현행 fail-closed 게이트는 유지·병행. deny 우선 전역화로 fail-secure를 **강화**(무후퇴+강화). demo 전면우회(`guardTeamWrite`)의 격리 시맨틱 보존.

## 6. 완료 게이트

1. 5종 Deny 소스를 통합 deny_set으로 산출.
2. **Explicit Deny가 모든 Allow보다 우선**(deny>allow) 100% 강제(SPEC §11·§8, ADR D-4).
3. 모호성·조회실패 시 deny 우선(fail-closed) 전역 기본값.
4. Deny Snapshot·Digest·Version 불변 영속(SPEC §18·§20·§33).
5. Explain Engine이 deny 사유 제공(SPEC §17).
6. Regression: 현행 `__deny__`·`guardTeamWrite` 시나리오 100% 무후퇴(SPEC §36).
7. Security: Authorization Bypass·Permission/Scope Escalation 차단(SPEC §28·§36).

### 6.1 테스트 계약 (SPEC §36)

- **Unit**: deny>allow override(어떤 allow도 무효)·5종 deny 소스 병합·모호성→deny(fail-closed).
- **Integration**: `__deny__`(`TeamPermissions.php:234`)→`scopeSql`(`:286`) `AND 1=0`, `guardTeamWrite`(`UserAuth.php:1167`) member 차단, Risk Deny(HIGH/CRIT) 전파.
- **Performance**: P95 ≤ 20ms·lock-free read(SPEC §35).
- **Security**: Authorization Bypass·Cache Poisoning·Permission/Scope Escalation 차단(SPEC §36).
- **Regression**: 현행 `__deny__`·member 쓰기 차단·demo 우회 시맨틱 100% 동일.

> 선행 의존: Part 1~3-6 인증 후 별도 승인 세션. 코드 0.

## 7. 반날조 인용 출처

- `TeamPermissions.php:234·:236·:272·:286`·`UserAuth.php:1167`·`index.php:82·:604` — Ground-Truth ① §2·§3, ② 표 #10
- SPEC §4·§8·§11·§17·§18·§20·§27·§28·§33·§36
- ADR **D-4(deny>allow 전역화)**·D-1(Extend)·D-2(deterministic)·D-7(정직 분리)
- KEEP_SEPARATE: `Alerting.php:665`·`SecurityAudit.php:25~:31` — Ground-Truth ② §4

**요약**: Effective Deny Calculator = PARTIAL-substrate(`__deny__` scope 센티넬 + `guardTeamWrite` member 전역차단) / ABSENT-governance(통합 deny 규칙·negative-ACL·Risk Deny 순신규). 핵심=국소 deny를 **전역 deny>allow(ADR D-4)**로 승격·fail-secure 강화. Extend-only. 코드 0·NOT_CERTIFIED·선행의존.
