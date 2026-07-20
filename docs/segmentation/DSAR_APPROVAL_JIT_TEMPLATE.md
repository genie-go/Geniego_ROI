# DSAR — JIT Access Governance: 상승 템플릿 (APPROVAL_JIT_TEMPLATE)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_TEMPLATE`(SPEC §4)는 반복되는 상승 시나리오를 사전 정의한 템플릿이다. 지원 템플릿(SPEC §4): Production Support·Database Administration·Financial Approval·Security Investigation·Incident Response·Disaster Recovery·Application Deployment·Emergency Maintenance. 각 템플릿은 **기본 Role·Scope·Duration·Approval Chain을 정의**(SPEC §4)하여 요청 시 반복 입력·오류·과다 권한을 줄인다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT 등장 file:line) | 재활용 방식 |
|---|---|---|---|
| Elevation Template(사전정의 상승 프로파일) | **ABSENT** | GT② §2·§5 — `elevation`/`JIT` BE 0건, 템플릿 개념 grep 0 | 순신규(순수 그린필드 항목) |
| 파생·분류 패턴 선례(임의값 금지) | PRESENT | `AccessReview.php:87-122`(휴면/만료 분류·파생·임의값 금지) | 템플릿 기본값은 파생 원칙 계승 — 하드코딩 금지 |
| Approval Chain 재사용 substrate | PRESENT | `Alerting.php:642-650`(정족수)·`mapping_change_request` `Db.php:623-636`(`required_approvals`) | 템플릿 Approval Chain 정의 시 정족수 패턴 참조 |
| Break-Glass용 Emergency Maintenance 근접 | PARTIAL | `UserAuth.php:793`(env 마스터로그인)·`:995`(`auth.breakglass` 감사) | Emergency 템플릿은 break-glass 시한부 승격(ADR §D-4)과 결합 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **템플릿 필드**(SPEC §4): 기본 Role·Scope·Duration·Approval Chain. 요청(APPROVAL_JIT_REQUEST)의 Request Type이 템플릿을 참조.
- **Scope 축**(SPEC §18): Tenant·Organization·Project·Dataset·Database·API·Document·Environment — 템플릿이 사전 지정.
- **Constraint 축**(SPEC §19): Read Only·Time Limit·Amount Limit·Device/Region/Command Restriction — 템플릿 기본 제약.
- **Duration**: 템플릿 기본 기간은 TTL 필수(ADR §D-1) — 무기한 불가. Emergency/Disaster Recovery 템플릿도 Maximum Duration 적용(SPEC §9).
- **불변성**: 템플릿 변경은 버전 관리(SPEC §33 계열), grant는 발급 시점 템플릿 스냅샷을 보존(SPEC §25).
- **테넌트 격리·다국어**: 템플릿은 테넌트 스코프 가능, 템플릿 명칭·설명은 i18n 대상.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거(GT 등장 file:line) | 분리 사유 |
|---|---|---|
| catalog writeback 승인 큐 | `routes.php:110`·`Catalog.php:2383`·고액게이트 `Catalog.php:1159`(₩5M `:1036`) | 상품 데이터/고액 결재 흐름 — 상승 템플릿 아님(GT② B-1) |
| plan/feature 등급(구독 프로파일) | `UserAuth.php:364`·`:77`·`PlanPolicy.php` | 구독 티어 접근 프로파일 — 시한부 상승 템플릿 아님(GT② B-3) |
| 광고 킬스위치 "Emergency" | `AdAdapters.php:22`·`AutoCampaign.php:447` | 광고 집행 차단 — Emergency Maintenance 템플릿과 무관(GT② B-7) |
| 비즈니스 simulate 엔진 | `RuleEngine.php`·`Decisioning.php`·`PriceOpt.php` | 마케팅/가격 시뮬레이션 — elevation 템플릿/시뮬레이션 아님(GT② B-8) |

## 5. 판정 (NOT_CERTIFIED · 재활용-substrate/ABSENT-governance · 선행의존)

- **판정 = ABSENT-governance(순신규).** Elevation Template은 grep 0(GT② §5)이며 실존 substrate 중 직접 대응물이 없다 — 부재를 결함으로 과장하지 않고 정직하게 ABSENT.
- **재활용(간접)**: 파생·임의값 금지 원칙(`AccessReview.php:87-122`)과 Approval Chain 정족수 패턴(`Alerting.php:642-650`·`Db.php:623-636`)만 설계 원칙으로 계승. 기본값 하드코딩 금지.
- **선행 의존**: Part 1~3-8 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
