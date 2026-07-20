# DSAR — Scope Runtime Guard (EPIC 06-A-03-02-03-04 Part 3-4 · per-entity: Scope Runtime Guard)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · Tenant Isolation 무력화 금지 · Default Intersection · Scope 자동확대 금지 · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§40(Runtime Guard)는 Scope 해석·검증이 발생하는 **매 요청 시점**에 발동해야 하는 차단 목록이다: **Invalid Scope · Expanded Scope · Expired Scope · Invalid Version · Invalid Context**(5종). ★ADR/GROUND_TRUTH가 확정한 대로, 이 저장소에서 이 목록에 **가장 근접한 실 substrate는 `effectiveScope`(`TeamPermissions.php:236-265`) fail-closed 판정 + `guardWarehouse`(`Wms.php:557-590`)**이나, 이는 **Canonical Scope Registry/Version을 참조하는 전용 Runtime Guard가 아니라 매 요청 라이브 재계산(version 무관)**이다(ADR D-4). 본 문서는 §40의 5개 차단 항목 각각을 실 substrate와 대조해 PARTIAL/ABSENT를 정직 판정한다.

## 2. Canonical 필드

- **Guard ID** — §40 5종 중 1
- **Trigger Condition** — 차단 발동 조건(§40 원문)
- **Related Scope Version** — Part 3-4 §6 Scope Version 참조(순신규)
- **Related Error Code** — §42 대응 코드([[DSAR_APPROVAL_SCOPE_ERROR_WARNING_CONTRACT]])
- **Enforcement Point** — Read-time(Effective Scope 조회) / Write-time(Scope 생성·변경)
- **현재 substrate** — file:line(없으면 ABSENT)

## 3. 열거형 / 타입

§40 Runtime Guard 5종(원문 그대로): `INVALID_SCOPE_BLOCKED` · `EXPANDED_SCOPE_BLOCKED` · `EXPIRED_SCOPE_BLOCKED` · `INVALID_VERSION_BLOCKED` · `INVALID_CONTEXT_BLOCKED`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §40 차단 항목 | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Invalid Scope 차단 | **PARTIAL** | `effectiveScope` fail-closed(`TeamPermissions.php:236-265`·비owner+무tenant=DENY_SCOPE `:251`·예외=DENY_SCOPE `:260-263`)·`guardWarehouse`(`Wms.php:557-590,575-584`) — 단 4/9차원(channel/product/brand/warehouse)만 실 SQL 강제(`Catalog.php:1001-1003`·`OrderHub.php:261`·`Wms.php:1291`·`AdPerformance.php:26,62,64,90,92,115,117,134`), Canonical Scope Registry 자체가 없어 "정의된 scope 값과 대조"가 아니라 라이브 재계산 |
| 2 | Expanded Scope 차단 | **ABSENT(실결함 직결)** | `putMemberPermissions`가 menus는 `assignableMap` 상한 클램프(`TeamPermissions.php:627-646`·DELEGATION_EXCEEDED)하나 **scope는 manager 본인 범위와 비교 없이 `replaceScope` 직접 기록**(`:648-653`) — 주석의 "manager가 본인 범위보다 넓은 scope_type 부여 금지" 약속이 코드 미구현(ADR §5 부수 결함·DUPLICATE_AUDIT D-5). Expanded Scope를 차단할 Runtime Guard 자체가 존재하지 않음 |
| 3 | Expired Scope 차단 | **ABSENT** | Scope Version/만료 컬럼 부재(EXISTING_IMPLEMENTATION §9 "version/projection 영속/digest/snapshot/drift/registry/simulation grep 0 전항목"). 세션 만료(`UserAuth.php:609-611`)는 Session Scope 축이지 Scope 자체의 만료가 아님(별개 축) |
| 4 | Invalid Version 차단 | **ABSENT(순신규)** | Scope Version 개념 자체가 이 저장소에 없음 — replaceScope는 DELETE→INSERT 전량교체이지 버저닝이 아님(`TeamPermissions.php:337-346`·이력 소실). 검사 대상 자체가 부재 |
| 5 | Invalid Context 차단 | **PARTIAL** | Tenant Context는 강하게 실재(index.php 미들웨어 X-Tenant-Id 위조 배제·`index.php:609-619`·`UserAuth.php:399,401-429` authedTenant fail-closed) — 그러나 Time/Device/Network/Client/Session(만료 외) Context는 ABSENT(grep 0, EXISTING_IMPLEMENTATION §7) — Context 판정은 Tenant 축 1개만 실 강제 |

**근접 Runtime Guard substrate 정리**: `effectiveScope`(`TeamPermissions.php:236-265`) + `guardWarehouse`(`Wms.php:557-590`) — data_scope 4/9차원에 대해서만 라이브 재계산 fail-closed 판정을 수행하는 **정적 값 게이트**. §40이 요구하는 "Scope Version/Expansion/Expiry/Context 기반 차단"과는 판정 축이 다르다(즉시값 대조 vs 버전·확장·만료 상태머신). PARTIAL로도 표기하지 않는 항목(#2·#3·#4)은 대상 개념 자체가 substrate에 없음을 명시한다(ADR §근접 substrate 표와 정합).

## 5. 설계 원칙

1. **effectiveScope/guardWarehouse는 확장 기반이지 Scope Runtime Guard 자체가 아니다** — Canonical Runtime Guard는 이 정적 게이트를 대체하지 않고 그 위에 Version/Expansion/Expiry/Context 판정 레이어로 얹는다(무후퇴·기존 게이트 삭제 금지).
2. **Expanded Scope Guard는 D-5 실결함 해소가 최우선 설계 표적** — `putMemberPermissions`가 scope를 clamp 없이 기록하는 현행(`TeamPermissions.php:648-653`)이 정확히 §40이 막으려는 시나리오다. 단 이번 차수는 설계만(코드 0)이며 실 수정은 별도 fix 세션(배포 승인).
3. **Expired/Invalid Version 2종은 Scope Version 스키마 신설이 선행** — 버전 컬럼 없는 현행에서는 "차단"할 대상 자체가 없다(정직 부재).
4. **Invalid Context Guard는 Tenant 축 우선 재사용, 다른 축은 순신규** — Time/Device/Network/Client/Session Context는 EXISTING_IMPLEMENTATION §7이 확정한 ABSENT를 그대로 계승, 날조하지 않는다.
5. **company=wildcard 관행을 Invalid Scope Guard가 묵인하지 않도록 설계** — `company`=null 무제한(`TeamPermissions.php:258`)이 Default Intersection·Scope 자동확대 금지 원칙(ADR D-2)과 충돌하는 지점임을 Guard 설계 시 명시.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Invalid Version 차단(#4)은 Scope Version 스키마 실구현 이후에만 발동 가능. Scope Registry/Definition 자체가 Part 3-4 설계 산출물(코드 0)이므로 실 구현은 선행 Part 2/3-1/3-2/3-3 + Decision Core 실구현 후.
- **ABSENT(순신규)**: Expanded Scope(#2, D-5 실결함 직결)·Expired Scope(#3)·Invalid Version(#4) — 대상 상태/개념 자체가 substrate에 없음(날조 금지).
- **PARTIAL(근접·불충분)**: Invalid Scope(#1)·Invalid Context(#5) — effectiveScope/guardWarehouse·tenant 격리가 근접이나 전용 Runtime Guard 판정 로직 없음(4/9차원 편중, Tenant 축만 강함).
- **판정**: NOT_CERTIFIED · 실 Guard = Canonical Scope Registry/Version 신설 + Scope Expansion Guard 실구현(D-5 해소) + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SCOPE_STATIC_LINT]] · [[DSAR_APPROVAL_SCOPE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SCOPED_ROLE_GOVERNANCE]]
