# DSAR — Zero Trust & Continuous Authorization: 디바이스 신뢰 (APPROVAL_DEVICE_TRUST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_DEVICE_TRUST`는 SPEC §4(Device Trust Engine)가 정의하는 **디바이스 신뢰 평가 엔티티**다. 인가 대상 요청을 발신한 단말이 관리·건전한 상태인지 지속 평가해 Trust Score(§14)·Authorization Confidence(§15)에 결합한다.

평가 요소(SPEC §4): Managed Device · Certificate · EDR 상태 · OS Patch Level · Jailbreak 여부 · Root 여부 · Secure Boot · TPM · Device Health. 신뢰 저하 시 Adaptive Authorization(§11)이 Challenge/Read Only/Deny로 전환하고, Device Compromise는 Runtime Guard(§28)·Simulation(§27)의 차단/시나리오 대상이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §4 요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| Managed/Certificate/EDR/OS Patch/Jailbreak/Root/Secure Boot/TPM/Health | **ABSENT(grep 0)** | 디바이스 지문/managed/EDR/TPM/root/health 전무. `recordSessionMeta`가 ua 1개만 기록(`UserAuth.php:4247`, GT②) |
| 디바이스 raw material(ua/ip 기록만) | **PARTIAL(비authz)** | `recordSessionMeta`/`ensureSessionMeta`(ip/ua/last_seen) — ua 255자·**기록만·authz 미반영**(`UserAuth.php:4232-4251`·`:4247`, GT①) |
| 동시세션 목록/폐기(디바이스 축) | **PARTIAL** | `listSessions`·`revokeOtherSessions`(타기기 폐기·**제한/차단 없음**)(`UserAuth.php:4253-4298`, GT①) |
| 디바이스 정보노출 차폐(비 device-trust) | 방어 프리미티브 | `Health.php:82`(서버 fingerprint 차폐)=정보노출 방지·device trust 아님(GT②) |

**요약**: Device Trust Engine은 순신규(그린필드). 유일 substrate는 `recordSessionMeta`의 ua/ip 기록이며 이는 authz에 반영되지 않는 raw material이다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력 승격(ADR D-1)**: 현 `recordSessionMeta`(`UserAuth.php:4232-4251`)의 ip/ua 기록을 Device Trust(지문/health) 신호로 **승격(Extend·대체 아님)**. 재사용 시 변화 대조(session hijack 탐지)는 Session Trust(§6)와 연동 신설.
- **필드**: `device_managed`·`edr_status`·`os_patch_level`·`jailbroken`·`rooted`·`secure_boot`·`tpm_present`·`device_health`·`device_fingerprint`(SPEC §4). 전부 순신규.
- **상태 출력**: Trusted / Conditional / Restricted / Untrusted 등급을 Trust Score(§14)에 기여. Device Compromise는 Runtime Guard(§28) 차단 사유.
- **제약(SPEC §33)**: Immutable Trust Snapshot·Trust Version·**Tenant Isolation**·Digest Validation. 디바이스 신뢰 스냅샷은 테넌트별 격리 저장, `user_session`/`auth_audit_log` 축(마케팅 데이터소스와 분리).

## 4. KEEP_SEPARATE (마케팅 trust/risk 흡수금지)

- **★device-sig 오인 절대 금지**: `Attribution.php:144-150`(`attribution_device_sig` ip+ua 해시)는 **광고 cross-device 식별(마케팅 attribution)**이다. Device Trust로 오인·흡수 금지(GT② B-3).
- cross-device confidence(`Attribution.php:145-242`)도 마케팅 신뢰이지 authz device trust 아님.
- `Health.php:82` fingerprint 차폐는 정보노출 방지 방어이지 device trust 아님(GT②).
- 데이터소스 `attribution_*` ≠ authz `user_session`.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Device Trust Engine = **ABSENT(순신규)**. 재활용 substrate = `recordSessionMeta` ua/ip(PARTIAL·비authz raw material, ADR D-1로 승격).
- **선행 의존**: Part 1~3-12 인증 후 실 구현(BLOCKED_PREREQUISITE). PDP(3-12)가 device trust 신호 소비지점(ADR D-6).
- **NOT_CERTIFIED**: 코드 변경 0. 마케팅 device-sig 흡수 금지·정보노출 차폐≠device trust. 무후퇴·Extend-only.
