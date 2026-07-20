# DSAR — JIT Access Governance: 특권 상승 요청 (APPROVAL_JIT_REQUEST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_REQUEST`(SPEC §3)는 특권 상승 요청 레코드다. 필수 정보(SPEC §3): Request ID·Requester·Request Type·Target Role·Target Permission·Target Scope·Business Justification·Requested Start Time·Requested End Time·Risk Level·Status. 요청은 JIT 폐루프의 **진입점**(요청→위험분석→승인→grant→감시→회수, SPEC §0)이며, 상승은 요청 없이 상시 보유될 수 없다(Zero Standing Privilege, ADR §D-3).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT 등장 file:line) | 재활용 방식 |
|---|---|---|---|
| Elevation Request Registry(권한상승 요청) | **ABSENT** | GT② §2 "JIT Request Registry — ABSENT"·`access_request`는 DSAR/AgencyPortal뿐 | 순신규 |
| maker-checker 요청→결정 상태머신 | PRESENT | `Alerting.php:598`(decideAction)·상태게이트 `:684-686` | 요청 상태전이 패턴 재사용(ADR §D-2, 개명 금지) |
| 시한부 grant 발급 원형(요청 후 발급 대상) | PRESENT | `UserAdmin.php:451`(impersonate)·2h TTL `:474`·`impersonated_by` `:478` | 발급 페이로드·원 principal 보존 재사용 — 단 하향 대행≠상향 elevation(ADR §D-2) |
| justification 필수 이력 선례 | PRESENT | `AccessReview.php:62-80`(append-only·justification 필수)·`:219-222` | Business Justification 필수 이력 동형 계승 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **필드**(SPEC §3): 11필드 전부. Request Type은 SPEC §4 Template(Production Support·DB Admin 등)과 결합.
- **상태(Status)**: 요청→승인/거부→grant→만료/회수. 승인 결정은 Immutable Version 저장(SPEC §7·§33).
- **시간박스**: Requested Start/End Time 필수 — 무기한 요청 거부(ADR §D-1 TTL 필수).
- **Risk Level**: LOW/MEDIUM/HIGH/CRITICAL(SPEC §6) 산출값을 요청에 결합(APPROVAL_JIT_RISK 참조).
- **불변성**(SPEC §33): Immutable Request Version — 요청 변경은 새 버전.
- **테넌트 격리·다국어**: 요청은 테넌트 스코프 필수, Business Justification·Status 라벨은 i18n 대상.
- **에러 계약**(SPEC §30): `JIT_REQUEST_NOT_FOUND`.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거(GT 등장 file:line) | 분리 사유 |
|---|---|---|
| `action_request` maker-checker | `Db.php:592-600`(★grant/expiry 컬럼 없음)·`Alerting.php:571`(대상=캠페인 예산/라이트백) | 마케팅 행위 결재 — 권한상승 요청 아님(GT② B-1) |
| `mapping_change_request` | `Db.php:623-636`·소비 `Mapping.php:209,:287,:527` | 매핑 변경 정족수 — elevation 요청 아님(GT② B-1) |
| agency access request | `AgencyPortal.php:347`(myAgencyRequests)·`routes.php:338`(approveAgency) | 대행사↔클라이언트 영구 링크 승인 — 시한부 상승 아님(GT② B-1) |
| catalog writeback 승인 | `routes.php:110`(approveQueue)·`Catalog.php:2383`·고액게이트 `Catalog.php:1159`(₩5M `:1036`) | 상품 데이터/고액 승인 — elevation 아님(GT② B-1) |
| impersonation 요청 | `UserAdmin.php:451`·`routes.php:1675`(등록 `:2712`) | admin→회원 하향 대행(요청/승인 게이트 없이 직접 발급) — 상향 elevation 요청 아님(GT② B-2) |

## 5. 판정 (NOT_CERTIFIED · 재활용-substrate/ABSENT-governance · 선행의존)

- **판정 = ABSENT-governance / 재활용-substrate.** 권한상승 전용 요청 레지스트리는 grep 0(GT② §2)·순신규.
- **재활용**: maker-checker 상태머신(`Alerting.php:598`)·시한부 발급 원형(`UserAdmin.php:451`)·justification 이력(`AccessReview.php:62-80`)을 대체 아닌 **확장**. impersonation은 하향 대행이므로 발급 패턴만 차용, 요청·승인 게이트는 신설(정직 분리, ADR §D-7).
- **선행 의존**: Part 1~3-8 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
