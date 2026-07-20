# DSAR — Scope Constraint 승인 (EPIC 06-A-03-02-03-04 Part 3-4 · Scoped Role Governance)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **ground-truth**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy(Part 3-1/3-2)·Role Assignment(Part 3-3)·Decision Core 실구현 후 별도 승인세션
- **불변**: Default Intersection(§9) · Scope 자동확대 금지 · Scope Hierarchy ≠ Organization Hierarchy(§13·D-3) · 반날조(부재 날조·실재 과신 양방향 금지)

---

## 1. 목적

Scope Constraint(스펙 §12)는 이미 확정된 Scope Assignment/Resolution 위에 얹는 **부가 제약**이다 — 접근 자체를 새로 부여하지 않고, 이미 부여된 scope를 좁힌다(Read Only · Time Window · Amount Limit · Country/Region/Device/Client/API Restriction). Part 3-4에서는 Canonical Constraint Type을 정의하고, 기존 substrate 중 유일하게 근접한 Amount 축을 흡수 대상으로 명시한다.

## 2. Canonical 필드

스펙 §2 Canonical Entity `APPROVAL_SCOPE_CONSTRAINT`. 필드: Constraint Type · 적용 대상 Scope Assignment 참조 · Constraint Value/임계 · 활성 여부. (스펙 §12 원문은 타입 열거뿐 — 세부 컬럼 스키마는 정의되지 않아 이 이상 세분화하지 않는다.)

## 3. 열거형 / 타입

Constraint Type(스펙 §12 원문): READ_ONLY · TIME_WINDOW · AMOUNT_LIMIT · COUNTRY_RESTRICTION · REGION_RESTRICTION · DEVICE_RESTRICTION · CLIENT_RESTRICTION · API_RESTRICTION.

## 4. 실 substrate 매핑 (PARTIAL/PRESENT/ABSENT)

| Constraint Type | 판정 | 근거 |
|---|---|---|
| AMOUNT_LIMIT | **PARTIAL(근접)** | `HIGH_VALUE_KRW=5000000.0`(`Catalog.php:1036`) · evaluatePolicy(`Catalog.php:1104-1148`) · requiresHighValueApproval 서버측 강제(`Catalog.php:1159-1169`). 단일 정적임계·역할/팀/테넌트별 차등·다단계 approver 부재(ADR D-1 AMOUNT_SCOPE 확장 대상). |
| READ_ONLY | **ABSENT** | ground-truth 문서 전체에 인용 없음(grep 0). |
| TIME_WINDOW | **ABSENT** | EXISTING_IMPLEMENTATION §7 Time — 접근제어용 부재(grep 0). `Attribution.php:444` time_window은 마케팅 어트리뷰션 지표(FP·배제 — 접근제어 아님). |
| COUNTRY_RESTRICTION / REGION_RESTRICTION | **ABSENT** | EXISTING_IMPLEMENTATION §7 Network/IP 부재(grep 0)와 동일 계열 — country/region 접근제어 인용 없음. |
| DEVICE_RESTRICTION | **ABSENT** | EXISTING_IMPLEMENTATION §7 — device_id/trusted_device grep 0. |
| CLIENT_RESTRICTION | **ABSENT** | EXISTING_IMPLEMENTATION §7 — Client 부재(grep 0)·api_key scope와 다른 개념으로 명시 구분. |
| API_RESTRICTION | **ABSENT(Constraint로서)·근접 축은 별개 분류** | api_key 게이트웨이(`index.php:573-598`·`Keys.php:189-210`)는 **PROGRAMMATIC_SCOPE**(ADR D-1)로 이미 별도 분류된 축이지 Scope Constraint 계층이 아님 — 오분류 금지. |

## 5. 설계 원칙

- Default Intersection(§9) — Constraint는 기존 Resolution 결과를 narrowing만 하고 expansion 금지(ADR D-2).
- AMOUNT_LIMIT은 기존 `HIGH_VALUE_KRW` 단일임계를 Canonical Constraint로 흡수하되, 신규 다단계·역할별 차등은 이번 설계 범위에서 Gap으로만 등재(구현 아님).
- 나머지 7종은 순신규 — 발명이 아니라 향후 조립 대상(현재 substrate 0).
- API_RESTRICTION을 api_key scope(PROGRAMMATIC_SCOPE)와 혼동 금지 — Constraint는 Resolution 이후 필터, api_key scope는 Resolution 이전 게이트.

## 6. Gap / BLOCKED_PREREQUISITE

- 8종 중 7종(READ_ONLY/TIME_WINDOW/COUNTRY/REGION/DEVICE/CLIENT/API_RESTRICTION) substrate 0 — 순신규.
- AMOUNT_LIMIT도 "역할/팀/테넌트별 차등·다단계 approver" 미구현(ADR D-1) — Constraint Value 다변화는 Gap.
- BLOCKED_PREREQUISITE: RP-002. 실 구현은 Scope Resolution(§10) 및 Assignment 확정 후에만 의미 있음(Constraint는 Resolution 산출물에 적용되는 후행 계층).
