# DSAR — JIT Access Governance: 상승 세션 (APPROVAL_JIT_SESSION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_JIT_SESSION은 승인된 특권 상승(elevation)이 **실제로 활성화되어 사용되는 시한부 컨텍스트**를 관리한다. SPEC §11(Elevation Session)이 정의하는 관리 항목: Session ID·Authentication Context·Device·Client·Network·IP Address·Region·Start Time·End Time·Last Activity. 상위 워크플로(요청→승인→시간박스 grant)의 산출물로서 **상승된 권한이 부여된 세션**이며, 만료 시 자동 회수(§14)·연장(§16)의 대상이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(파일:라인) | JIT 매핑 |
|---|---|---|---|
| `user_session` 스키마(token 해시·expires_at·created_at+인덱스) | PARTIAL | `Db.php:1111-1119`(GT① 4-D) | 세션 원장 앵커 |
| userByToken 만료 게이트 `expires_at > ?` | PARTIAL | `UserAuth.php:249-284`(GT① 4-D·ADR §2.1) | 런타임 세션 유효성 |
| 세션 발급 30일 | PARTIAL | `UserAuth.php:986,:990`(GT① 4-D) | 세션 수명 발급 |
| 세션 TTL 30일 상수 | PARTIAL | `UserAuth.php:606`(GT① A) | 세션 수명 |
| impersonation 2h 시한부 세션+`impersonated_by` 원 principal | PRESENT | `UserAdmin.php:472-482`(TTL `:474`·컬럼 `:478`)(GT① 4-C) | **시한부 상승세션 발급 원형** |
| `X-Act-As-Tenant` 컨텍스트 오버라이드(admin+`platform_growth`·시간제한 없음) | PARTIAL | `UserAuth.php:418-420`(GT① 4-C) | 컨텍스트 전환(근접) |
| 역할 세션 해석(team_role/admin_level → 페이로드) | PARTIAL | `UserAuth.php:1019`(ADR §1) | 영속 role(세션 아님) |
| Session-bound entitlement projection(세션에 권한 스냅샷 투영) | **ABSENT** | GT② §2 — `/auth/me`는 plan·team_role만·ACL은 매요청 DB조회 | 세션 권한투영 순신규 |
| **단일등급 세션 / 상승세션 개념** | **ABSENT** | GT① §1·§4-D — `user_session` 단일등급, 상승(elevated) 세션 계층 grep 0 | 상승세션 순신규 |

> **정직 경계**: `user_session`은 **단일 권한등급 세션**이다. 상승(elevated) 세션과 일반 세션을 구분하는 계층·상승 컨텍스트(authentication assurance·device trust 스냅샷)는 GT① 4-D·GT② §2 기준 ABSENT. impersonation(`UserAdmin.php:472-482`)만이 유일하게 시한부+원 principal 보존 세션의 실 프리미티브이나 이는 admin→회원 **하향 대행**이지 상향 elevation 세션이 아니다(§4 KEEP_SEPARATE).

## 3. 설계 계약 (필드·상태·제약)

- **필드**(SPEC §11): Session ID·Authentication Context·Device·Client·Network·IP·Region·Start/End Time·Last Activity. 289차 세션토큰 hash-only(ADR §D-7) 재활용 — 토큰 평문 미저장.
- **불변 버전**: 상승세션 발급·연장은 Immutable Version으로 저장(SPEC §7·§16). SecurityAudit 불변 체인(`SecurityAudit.php:12-53`, ADR §2.1) 참조.
- **테넌트 격리**: 세션은 `auth_tenant`·`X-Tenant-Id` 축으로 격리(SPEC §33 Tenant Isolation). `X-Act-As-Tenant`(`UserAuth.php:418-420`)와 혼동 금지 — 후자는 platform_growth 전용 컨텍스트.
- **제약**: 상승세션은 승인된 grant의 End Time을 초과 불가(SPEC §14 End Time 도달 → 자동 회수). Standing Assignment로 승격 불가(SPEC §10).
- **재활용 발급 패턴**: 2h 시한부 발급(`UserAdmin.php:474`)·원 principal 보존(`:478`)·즉시 회수(`UserAdmin.php:344`, GT① 4-D)를 **대체 아닌 확장**으로 재사용.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거 | 분리 사유 |
|---|---|---|
| impersonation 세션 | `UserAdmin.php:451`·`:466-469`(GT② B-2) | admin→회원 **하향** 2h 대행 — 상향 elevation 세션 아님 |
| act-as tenant | `UserAuth.php:418`(GT② B-2) | `platform_growth` 컨텍스트 전환 — 상승세션 아님 |
| 세션 만료/유휴 로그아웃 | `UserAuth.php:304,:280,:206`(GT② B-4) | 세션 수명이지 상승세션 수명 아님 |
| plan/feature 게이팅 | `UserAuth.php:364,:77`·`PlanPolicy.php`(GT② B-3) | 구독 등급 접근 — 시한부 상승 아님 |

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: 코드 변경 0. 상승세션 계층·세션 권한투영은 **ABSENT(순신규)**. `user_session`·impersonation 시한부 발급·hash-only 토큰은 **재활용(Extend)** substrate.
- **재활용/ABSENT 분리**: 재활용=`user_session`(`Db.php:1111-1119`)·시한부 발급(`UserAdmin.php:472-482`)·만료 게이트(`UserAuth.php:249-284`). ABSENT=상승세션 등급·session-entitlement projection(GT① §4-D·GT② §2).
- **선행 의존**: Part 1~3-8 인증 후 실 구현. 상위 Request/Approval/Grant Ledger(선행 DSAR) 확정 후 세션이 그 산출물로 결합. ERRE(3-7) effective 계산에 JIT 상승세션을 입력원으로 합산(ADR §4).
