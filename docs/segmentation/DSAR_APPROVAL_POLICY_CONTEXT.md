# DSAR — PDP/PEP Governance: 런타임 컨텍스트 (APPROVAL_POLICY_CONTEXT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_POLICY_CONTEXT`는 PDP가 평가 시점에 참조하는 **런타임 컨텍스트 스냅샷**(SPEC §2)이다. SPEC §13 Runtime Context 9요소를 포함한다.

- **Runtime Context(§13)**: Device · Browser · Client · MFA · Geo · VPN · Risk · Session · Environment.
- Decision Pipeline 2단계 Context Collection·3단계 Attribute Resolution의 입력(SPEC §8). Cache 키의 Context Hash 재료(SPEC §14).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §13 요소 | 판정 | 근거(GT file:line) |
|---|---|---|
| Session (세션 속성) | **PRESENT** | `authedUser`(team_role/plan/parent_user_id/tenant_id/admin_level) `UserAuth.php:256-268`·`:316` (GT①§D·②§2) |
| Client / Network (clientIp·ip/ua) | **PARTIAL** | `clientIp`·`recordSessionMeta`·`ensureSessionMeta`(ip/ua) `UserAuth.php:3446-3454`·`:4243-4250`·`:4232-4240` — 수집만·PDP 주입 미배선 (GT①§D) |
| MFA (컨텍스트 신호) | **PARTIAL** | `mfaPolicy`·mfaPolicyConfig off/admin/all `UserAuth.php:3745`·`:3761`·`:3779`·`:3752`; 로그인 MFA 강제 `:929-964` (GT①§F) |
| Risk | **PARTIAL** | auth_audit_log `risk` 컬럼(정적 문자열·감사용) `UserAuth.php:4165`·`:4172`·`:4190-4191` — PDP 미소비 (GT①§D) |
| Device · Browser · Geo · VPN (PDP 소비) | **ABSENT** | device/geo·계산된 risk는 PDP 미배선 (GT②§2 PIP 행·ADR D-8) |
| Environment(Time/Region/Business Calendar) | **ABSENT** | 런타임 환경 컨텍스트의 PDP 통합 부재 (GT②§2·ADR 2.2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **컨텍스트 수집원 재활용**: `clientIp`/`recordSessionMeta`(`UserAuth.php:3446-3454`·`:4243-4250`)를 Context Collection(SPEC §8 2단계)의 공급원으로 재사용하되 **PDP 주입 경로를 신설**(현행 수집만·미배선, GT①§D).
- **Context Hash**: Session+Client+MFA+Risk를 정규화해 결정 캐시 키의 Context Hash(SPEC §14)로 산출. Context 변경 시 Cache Invalidation(SPEC §15).
- **PIP 경유**: Runtime Context는 PIP(SPEC §6)를 통해 PDP에 공급 — acl_permission/data_scope 속성원(`TeamPermissions.php:39-41`)과 동일 계약(ADR D-6).
- **risk 승격**: 정적 문자열 risk(`UserAuth.php:4165`)를 계산된 Risk 속성으로 확장해야 PDP 소비 가능(현행 PARTIAL, GT②§2).
- **테넌트 격리**: 컨텍스트는 X-Tenant-Id(`index.php:619`) 스코프 내 유효(ADR D-7).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

- `Risk.php` = 공급망 fraud risk(마케팅) — authz PDP Risk 컨텍스트 아님 (GT②§C-4).
- `ModelMonitor.php:220-335`(drift)·`attribution_model_cache` = ML/마케팅 컨텍스트·캐시 — authz Runtime Context/Decision Cache 아님 (GT②§C-3·C-4).
- `PriceOpt.php:927`·`AdminGrowth.php:1239`(simulate) = 마케팅 시뮬 — authz Context Simulation 아님 (GT②§C-3).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **재활용(Extend)**: Session 속성(`UserAuth.php:256-268`)·clientIp/session meta(`:3446-3454`·`:4243-4250`)·MFA 정책(`:3745`)을 컨텍스트 공급원으로 재사용(GT①§D·ADR 2.1).
- **PARTIAL→순신규 배선**: clientIp/session meta는 수집 실존이나 **PDP 주입 미배선**; risk는 정적 문자열(PDP 미소비). Device/Browser/Geo/VPN·Environment PDP 통합은 ABSENT(순신규, GT②§2·ADR D-8).
- **정직 분리(ADR D-8)**: "PIP 실존"은 속성원 실존이지 device/geo/계산 risk PDP 소비를 뜻하지 않음(실재 과장 회피).
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-11 인증 후 실 구현. 마케팅 risk/cache 흡수 금지.
- **판정**: NOT_CERTIFIED · 코드 변경 0 · 설계 명세.
