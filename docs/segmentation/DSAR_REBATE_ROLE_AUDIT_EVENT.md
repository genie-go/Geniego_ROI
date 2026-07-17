# DSAR — Audit Event (§54·27종)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 통합 정본: [CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md](CANONICAL_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE.md) · ADR: [ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md](../architecture/ADR_DSAR_REBATE_ROLE_ORGANIZATION_SCOPE_GOVERNANCE.md) · 요구 분모: [REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md](REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md)
> **★이 도메인은 부재가 아니라 존재·분산 — 통합이지 신설이 아니다.** 실 구현=고객 Rebate 도입 시 후속 승인 세션. 본 문서=**계약 명세**.

## 지원 Event (27)
ROLE_CATALOG_CREATED · STANDARD_ROLE_REGISTERED · CUSTOM_ROLE_CREATED · CUSTOM_ROLE_UPDATED · ROLE_VERSION_CREATED · ROLE_VERSION_ACTIVATED · ROLE_DEPRECATED · ROLE_ARCHIVED · ROLE_HIERARCHY_CREATED · ROLE_COMPOSITION_CREATED · ROLE_REQUESTED · ROLE_REQUEST_REJECTED · ROLE_GRANTED · **ROLE_ASSIGNED** · ROLE_INHERITED · ROLE_SCOPE_OVERRIDDEN · ROLE_SCOPE_EXCLUDED · ROLE_SUSPENDED · **ROLE_REVOKED** · ROLE_EXPIRED · **ROLE_DEPROVISIONED** · GROUP_ROLE_SYNCHRONIZED · ROLE_CONFLICT_DETECTED · ORPHAN_ROLE_DETECTED · DORMANT_ROLE_DETECTED · ROLE_DRIFT_DETECTED · MANUAL_REVIEW_REQUESTED.

## 🔴 실측 — 감사 정본이 이미 있다
✅ **`menu_audit_log`**(`AdminMenu.php:123-131`): **`hash_chain CHAR(64)`** · old_value/new_value JSON · changed_by · **changed_by_role** · reason · ip_address · user_agent · request_id. **직전 해시 조회로 실제 체인 계산**(:216).
✅ **SIEM 반출 REAL**: LEEF 2.0 + RFC 5424 Syslog(`Compliance.php:225/234-235/238` · 282차).
✅ Impersonation auditLog(`UserAdmin.php:495`).

## 🔴 5-7 판정 계승 — 상향 표준화
audit_log **12파일 스키마 편차**(5필드 vs 12필드+체인)는 **KEEP_SEPARATE 유지하되
`menu_audit_log` 를 표준으로 승격**(**하향 평준화 금지**).
**Role Audit 은 `menu_audit_log` 패턴을 따른다** — 신설 아님.

## 🔴 hash-chain 한계 정직 표기
**초판 정정 — 한계가 더 크다.** 초판은 *"append-only 무결성은 주지만 전량 삭제·테이블 교체는 못 막는다"* 라 적었으나, **`menu_audit_log` 는 append-only 무결성조차 주지 못한다**: 체인 연결은 실재하나(`AdminMenu.php:194` prev + `lastHash():216`) preimage 의 `'ts'=>date('c')`(`:195`)가 **INSERT 컬럼 목록(`:199-203`)에 `created_at` 이 없어 저장되지 않는다**(`:129` DB DEFAULT 가 채움) → **preimage 재구성 불가 = 행 단위 변조조차 탐지 불가**. 검증기도 없다(`hash_equals` 레포 24히트 중 AdminMenu **0건**). ★**"체인이 있다"가 "변조를 탐지할 수 있다"를 보증하지 않는다** — SIEM 병행 이전에 **체인 자체가 장식**이다.
검증까지 갖춘 실 정본 = **`SecurityAudit`**(`:27` tenant 포함 해시 · `:29-31` `created_at` 명시 저장 · **`verify():56-68`** `hash_equals`+prev 교차검증).

## 분류
`menu_audit_log` **필드 축**(old_value/new_value/changed_by/changed_by_role/reason/ip_address/user_agent/request_id)·SIEM = **VALIDATED_LEGACY(표준 승격 · 🔴`tenant_id` 부재 보강 조건부)** · ⚠️`menu_audit_log` **`hash_chain` 축 = `PARTIAL`**(연결 실재·검증 영구 불가 → **재사용 강제 아님**, 해시체인은 `SecurityAudit` 이식) · Role Event 27 = **NOT_APPLICABLE → 확장**.
