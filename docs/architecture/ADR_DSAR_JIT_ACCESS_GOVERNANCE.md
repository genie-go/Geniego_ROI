# ADR — Just-In-Time (JIT) Access Governance Foundation

- **Status**: PROPOSED · NOT_CERTIFIED · BLOCKED_PREREQUISITE (설계 명세 · 코드 변경 0)
- **EPIC**: 06-A-03-02-03-04 Part 3-9
- **Date**: 2026-07-20
- **상위 SPEC**: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md` (canonical 원문 verbatim · Version 1.0 · 2026-07-20 제공·정합 완료)
- **Ground-Truth**: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①) · `DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②)
- **선행 계보**: Part 1~3-7(Auth Registry~ERRE) · **3-8(Certification & Access Review)**

---

## 1. Context

GeniegoROI의 권한은 **영속(standing)** 이다 — team_role/admin_level은 `app_user`에 영구 기록되고(`UserAuth.php:1019`·`EnterpriseAuth.php:487`), `acl_permission`에는 만료 컬럼이 없어(`TeamPermissions.php:152`) 한 번 부여된 특권이 회수 전까지 유지된다. 시간제한(time-boxed)·요청기반(on-demand) 특권 상승 개념이 없다. 이는 공격 표면(과다·영구 권한)을 상시 노출한다.

본 ADR은 **Just-In-Time(JIT) Access** — 필요 시점에 최소 기간만 상위 권한을 부여하고 만료 시 자동 회수하는 폐루프(요청→승인→시간박스 grant→자동 회수→사후 검토) — 의 거버넌스 기반을 정의한다. Part 3-8 Certification(주기적 재검토)이 **정적 배정**을 다룬다면, JIT는 **동적·일시 상승**을 다루는 상보 통제다.

## 2. Ground-Truth 판정 (2 스레드 상호검증)

### 2.1 실존 substrate (GT①)
- **유일 완전 JIT 프리미티브**: impersonation(`UserAdmin.php:451`, 2h 시한부 세션 + `impersonated_by` 원 principal `:478` + 감사 `:489`) — 단 요청/승인 게이트 없이 admin 직접 발급·하향 대행.
- **재활용 부품**: maker-checker 정족수(`Alerting.php:642-650` 정족수2·`:684-686` approved-only 집행·`:600-606` fail-closed)·제2 maker-checker `mapping_change_request`(`Db.php:623-636` `required_approvals` 컬럼 실존)·불변 감사(`SecurityAudit::log` `SecurityAudit.php:12-53`+`verify` `:56-68`+`auth.breakglass` `UserAuth.php:997-999`)·다축 만료(세션 `UserAuth.php:249-284`·구독 `:141`·api_key `Keys.php:141`).
- **★Part 3-8 AccessReview 선례(직전 세션 배포·운영+데모)**: `AccessReview.php:24-29`(Extend Golden Rule)·`:210-214`(is_active=0 revoke 재사용)·`:224-233`(SecurityAudit 증거)·`:62-80`(append-only 이력)·`:87-122`(파생분류). Part 3-9가 계승할 동형 substrate — 단 엔진 분리(AccessReview=정적 api_key 검토, JIT=동적 상승 발급/만료).
- **break-glass**: env 게이트 마스터 로그인(`UserAuth.php:793`)+전용 감사이벤트 — 시한부 grant·사후검토 없음(비상 인증 백도어).

### 2.2 거버넌스 계층 (GT②) — 8항 중 7 ABSENT, break-glass만 PARTIAL(오근접)
Request Registry·Elevation Policy·Approval(권한상승)·Grant Ledger/TTL·Session-entitlement·Auto-expiry(권한축)·Risk/Anomaly·Guard/Lint = **grep 0**.

### 2.3 종합
**JIT 판정 = ABSENT-governance / 재활용-substrate.** 최대 공백 = `acl_permission` TTL 컬럼 부재(grant ledger 앵커 없음).

## 3. Decision

### D-1. `acl_permission` 확장이 Grant Ledger의 자연 앵커 (Extend, 대체 아님)
영속 `acl_permission`(`TeamPermissions.php:152`)을 파괴하지 않고, **별도 time-bound grant 원장**(expires_at NOT NULL)을 신설해 유효 grant를 런타임에 합산 투영한다. 영속 RBAC은 유지, JIT grant는 그 위에 얹는 일시 레이어. 무기한 grant는 거부(TTL 필수).

### D-2. maker-checker·시한부 세션·감사체인을 재활용(흡수 아님·개명 금지)
- Elevation 승인 = `Alerting.php:598` maker-checker 상태머신(self 재승인 차단·정족수)을 **패턴 재사용**하되 action_request(마케팅)와 별개 테이블·경로(KEEP_SEPARATE, GT② B-1).
- 시한부 grant 발급 = impersonation 2h TTL 발급 패턴(`UserAdmin.php:471`) 재사용(원 principal 보존 포함) — 단 impersonation은 하향 대행, JIT는 상향 elevation으로 분리(GT② B-2).
- 증거 = `SecurityAudit` 불변 체인(`auth.breakglass` 전례) 확장.

### D-3. Zero Standing Privilege 지향·fail-secure
High-risk 권한은 상시 보유 금지 → JIT grant로만 획득. 런타임은 `expires_at > now` lazy gate + Auto-Expiry cron 능동 회수. 만료·모호·미승인 → 차단(Runtime Guard §13).

### D-4. Break-Glass는 시한부 grant + 필수 사후검토로 승격
현행 env 백도어(무기한 admin 세션)를 **시간제한 emergency grant + post-use review(SLA)** 로 승격 — 발급 즉시 High-risk 감사, 사후 미검토 재사용 차단. (현행 `auth.breakglass` 감사는 실 substrate로 재활용.)

### D-5. Part 3-8 Certification과의 관계 (상보·무중복)
JIT(동적 일시 상승)와 Certification(정적 배정 주기검토)은 별개 통제. JIT grant도 Certification Review Scope(§4)의 대상이 될 수 있으나, **엔진은 분리**(JIT=발급/만료, Certification=주기재검토). 중복 엔진 금지.

### D-6. KEEP_SEPARATE — 오흡수 금지
action_request(마케팅 결재)·impersonation(하향 대행)·plan 게이팅(구독)·세션 수명·api_key expires·MFA·광고 킬스위치(`AdAdapters.php:22`)는 이름·형태만 유사. JIT elevation으로 개명·흡수 금지(가짜녹색 회피).

### D-7. 정직 분리
- **실재 과신 회피**: impersonation은 하향 대행이지 상향 elevation 아님. break-glass는 무기한 백도어지 시한부 grant 아님. maker-checker는 마케팅 결재지 권한 결재 아님.
- **부재 과장 회피**: Grant Ledger/TTL/Session-entitlement grep 0은 실측 부재. `acl_permission` TTL 컬럼 부재는 확정.
- 289차 P1~P5 보안수정(writeGuard 서버강제·세션토큰 hash-only)은 JIT Session-entitlement/Guard의 실 substrate로 재활용.

## 4. Consequences

- **긍정**: 상시 특권 제거·최소기간 권한·설명가능/감사가능 elevation·break-glass 통제. 공격 표면 축소.
- **비용**: 신규(Request/Policy/Approval/Grant Ledger/TTL/Session-entitlement/Break-Glass/Post-use/Auto-expiry/Risk/Guard/Lint). `acl_permission` 확장 + grant 원장 신설.
- **선행 의존**: Part 1~3-8 인증 후 실 구현(BLOCKED_PREREQUISITE). ERRE(3-7) effective 계산에 JIT grant를 입력원으로 결합.
- **무후퇴**: 영속 RBAC·impersonation·세션/키/구독 만료는 유지·병행. Extend-only.

## 5. Compliance / Certification

- **NOT_CERTIFIED**: 코드 변경 0. SPEC은 사용자 제공 canonical 원문 verbatim(Version 1.0).
- 하위 per-entity DSAR은 본 ADR + GT①② 등장 `파일:라인`만 인용(반날조).
- Completion Gate·Performance·Regression은 실 구현 세션(RP-track) 조건.

---
**요약**: JIT = ABSENT-governance(요청·승인·grant ledger·TTL·auto-expiry·session-entitlement·risk·guard·lint 순신규) / 재활용-substrate(impersonation 시한부·Alerting maker-checker·SecurityAudit 체인·다축 만료·acl_permission 앵커). Extend: acl_permission 확장 + grant 원장 신설·시한부 발급/maker-checker 재사용·break-glass 시한부+사후검토 승격·Zero Standing Privilege·fail-secure·Certification(3-8)과 상보 분리·KEEP_SEPARATE. 코드0·NOT_CERTIFIED·선행의존.
