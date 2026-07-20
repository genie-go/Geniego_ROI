# DSAR — PDP/PEP Governance: 런타임 가드 (Part 3-12 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

SPEC §25는 런타임에서 다음 6종 공격/오류를 **차단**할 것을 요구한다: **PDP Bypass**(PEP가 PDP 미경유), **PEP Disable**(강제점 비활성화), **Invalid Context**(위조/결손 컨텍스트), **Invalid Policy**(미검증 정책 적용), **Cache Poisoning**(결정 캐시 오염), **Unauthorized Decision**(권한 밖 결정 주입). 상위 원칙은 SPEC §5 "PEP는 PDP를 우회할 수 없다"이며, SPEC §33 Security 테스트(PDP Bypass/PEP Disable/Cache Poisoning/Context Manipulation/Policy Injection)가 검증 대상이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| 가드 대상 | 판정 | 재활용/신규 근거 |
|---|---|---|
| PEP Disable(강제점 부재) | **PARTIAL** | 중앙 PEP 상시통과: `index.php:78-89`(guardTeamWrite 전역 mutating 가드)·`:572-598`(roleRank write 차단). 그러나 비활성화 탐지 감시 ABSENT |
| Invalid Context(테넌트 위조) | **PARTIAL** | X-Tenant-Id 강제 주입 `index.php:619`·auth_tenant 주입 `:608-619` 재활용. device/geo/계산 risk는 PDP 미배선(GT① §D `UserAuth.php:3446-3454`) |
| PDP Bypass(PDP 미경유) | **ABSENT** | 중앙 PDP 자체 미배선 — proto-PDP `effectiveForUser`(`TeamPermissions.php:393-421`)가 private·전역경로 미배선(GT① §C). 우회차단은 신규 |
| Cache Poisoning | **ABSENT** | Decision Cache 부재(`TeamPermissions.php:202-225` 매 호출 DB 재계산·GT② §2). 캐시 없으면 오염가드도 없음 |
| Unauthorized Decision | **PARTIAL** | `__deny__` fail-closed 센티넬(`TeamPermissions.php:234`)·mfa Challenge(`UserAuth.php:929-964`) 재활용. 결정 무결성 검증 ABSENT |
| Invalid Policy | **ABSENT** | Policy Registry/Version 부재(GT② §2) — 미검증 정책 차단 대상 자체가 그린필드 |

## 3. 설계 계약 (항목·규칙 — SPEC 근거)

1. **PDP Bypass 차단(§25)**: 모든 리소스 접근은 PIP→PDP→PEP(SPEC §0 흐름)를 통과. PEP가 PDP 결정 토큰 없이 target에 도달하면 fail-closed 거부. 중앙 PEP(`index.php:78-89`)를 PDP 결정 소비점으로 재배선(ADR D-2·D-7).
2. **PEP Disable 차단**: 분산 PEP(`requireTeamWrite` `UserAuth.php:1134`·`guardWarehouse` `Wms.php:557`)의 부재/우회를 §26 Static Lint(Missing PEP)로 상시 탐지·런타임 heartbeat.
3. **Invalid Context 차단**: X-Tenant-Id(`index.php:619`) 격리 위반·컨텍스트 해시 불일치 시 거부. SPEC §13 Runtime Context(Device/MFA/Geo/Risk/Session) 결손·위조 검사.
4. **Cache Poisoning 차단**: Decision Cache(SPEC §14 subject/resource/action/context-hash→decision) 신설 시 서명/TTL·§15 invalidation 트리거로 오염 무효화.
5. **Unauthorized Decision 차단**: 결정은 PDP만 생성. deny-overrides(SPEC §10 기본·ADR D-4) 하 어떤 경로도 PDP 밖 Permit 주입 불가. `__deny__`(`:234`)를 전역 결합규칙으로 승격.

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

본 가드는 **authz 런타임 무결성** 전용이다. 마케팅/ops의 policy·decision·cache는 별개이며 흡수 금지(GT② §5·ADR D-8): Catalog `evaluatePolicy`(`Catalog.php:1104`)·RuleEngine(`RuleEngine.php:24`)·Decisioning(`Decisioning.php:12`)·action_request policy(`Db.php:576`)·attribution_model_cache. 이들 캐시/결정은 PDP Cache Poisoning 가드 대상이 아니다.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

**NOT_CERTIFIED · 코드 변경 0.** PDP Bypass·Cache Poisoning·Invalid Policy 가드 = **ABSENT(순신규)**. PEP Disable·Invalid Context·Unauthorized Decision = **PARTIAL(재활용)** — 중앙 PEP(`index.php:78-89`)·X-Tenant-Id(`:619`)·`__deny__`(`:234`)·mfa Challenge(`UserAuth.php:929-964`) 위에 신설. 선행의존: 중앙 PDP·Decision Cache(ADR D-1·D-3) 구축 후에만 우회/오염 가드가 성립(BLOCKED_PREREQUISITE). Part 1~3-11 인증 후 RP-track 실구현.
