# DSAR — Certification Scope (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §4(Tenant..Application 15 scope)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §4가 정의하는 Certification Scope는 Campaign이 "무엇을 검토 범위로 삼는가"를 규정하는 15단계 계층 스코프(Tenant → ... → Application)다. 접근 검토는 전사 단위로만 이뤄질 수도, 특정 테넌트·팀·앱 단위로 좁혀질 수도 있다 — Scope가 이 범위를 명시적으로 선언하지 않으면 Campaign은 "무엇을 검토했는지" 증명할 수 없다. SPEC §4 하위항목: (a) 15단계 스코프 계층 정의(Tenant/Organization/BusinessUnit/Team/Role/Permission/Resource/API/DataField/Feature/Menu/Channel/Integration/ServiceAccount/Application 등), (b) 스코프 간 포함관계(containment), (c) 스코프-Assignment 교차 질의, (d) 스코프 상속(inheritance) 규칙. 본 문서는 이 15단계 스코프 모델이 실 코드베이스에 존재하는지, 재활용 가능한 근접 substrate가 있는지를 검증한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT-거버넌스(15단계 통합 모델) / PARTIAL-대상존재(개별 스코프 축은 산재 실재)**

Ground-Truth ①/②의 실측 결론: SPEC §4가 요구하는 "Tenant..Application 15단계" 통합 스코프 계층 모델은 grep 0 — 순신규다. 그러나 검토 대상이 될 개별 스코프 축(테넌트 격리, role/scopes, data_scope)은 실 코드베이스에 산재해 이미 동작 중이다: api_key의 role/scopes(`Db.php:951`), 팀 data_scope(`TeamPermissions.php:356` scopeWithinCap), tenant 격리(`index.php:608`). 이는 289차 후속 세션에서 이미 확정된 사실(§D-5 manager scope 위임상한)과 정합적이다 — data_scope 9차원 중 4차원만 실강제되고 나머지는 산재해 있다는 과거 감사 결론을 계승한다. 즉 "스코프"라는 개념 자체는 부분적으로 실재하나, 15단계 통합 계층 및 포함관계·상속 규칙은 ABSENT다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| 15단계 통합 스코프 계층 모델 | ABSENT | grep 0 — 15단계를 하나의 계층으로 정의한 모델 부재 |
| Tenant 스코프 축 | PARTIAL | `index.php:608`(tenant 격리 강제) — 개별 축으로는 실재 |
| Role/Permission/Scope 축(api_key) | PARTIAL | `Db.php:951`(api_key role/scopes) — 개별 축으로는 실재 |
| Team data_scope 축 | PARTIAL | `TeamPermissions.php:356`(scopeWithinCap)·`:423`(clampActions) — 개별 축으로는 실재하나 289차 후속 감사에서 9차원 중 4차원만 실강제로 확정된 바 있음(과거 확정분, 본 문서에서 재플래그하지 않음) |
| 스코프 간 포함관계(containment) | ABSENT | grep 0 — 15단계 간 상하위 포함관계를 정의한 로직 부재 |
| 스코프-Assignment 교차 질의 | ABSENT | Registry(§1) ABSENT이므로 교차 질의 대상 자체가 부재 |
| 스코프 상속(inheritance) 규칙 | ABSENT | grep 0 |

### 2.3 KEEP_SEPARATE

`AgencyPortal.php:69`(agency_client_link 상태전이)는 대행사-클라이언트 관계의 상태 전이이며 Certification Scope의 계층적 포함관계와 이름은 유사할 수 있으나 접근 검토 스코프가 아니다. `ChannelContract.php:14`도 채널 계약 검증이며 스코프 계층과 무관하다.

## 3. Canonical 설계

Scope는 다음 개념 계약으로 설계된다(코드 미구현, 설계 명세 단계):

- **15단계 계층**: Tenant → Organization → BusinessUnit → Team → Role → Permission → Resource → API → DataField → Feature → Menu → Channel → Integration → ServiceAccount → Application(SPEC §4 원문 순서를 그대로 따름).
- **포함관계 규칙**: 상위 스코프의 검토 결과는 하위 스코프에 상속 가능하나, 하위 스코프의 예외(exception)는 상위로 역전파되지 않는다(fail-secure — 예외는 국소화).
- **기존 축 매핑**: Tenant 계층은 `index.php:608`을, Role/Permission 계층은 `Db.php:951`을, Team 계층은 `TeamPermissions.php:356`을 각각 읽기 전용으로 매핑한다.
- **교차 질의 의존성**: Scope-Assignment 교차 질의는 Registry(§1)가 선행 완결되어야 가능 — 본 문서 단독으로는 완결될 수 없는 BLOCKED_PREREQUISITE 관계.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Tenant 축 | `index.php:608` | 승격(읽기 전용 매핑) |
| Role/Permission/Scope 축 | `Db.php:951` | 승격(읽기 전용 매핑) |
| Team data_scope 축 | `TeamPermissions.php:356`·`:423` | 승격(읽기 전용 매핑, 과거 확정된 4/9차원 한계 유지) |
| 나머지 11단계(BusinessUnit/Resource/API/DataField/Feature/Menu/Channel/Integration/ServiceAccount/Application 등) | 없음 — 신규 | 신규 |
| 포함관계/상속 규칙 | 없음 — 신규 | 신규 |

## 5. 무후퇴 · Extend

Scope 설계는 `index.php:608`의 tenant 격리 강제, `Db.php:951`의 api_key role/scopes 스키마, `TeamPermissions.php:356`·`:423`의 data_scope 강제 로직을 하나도 변경하지 않는다(Golden Rule Wrap). 289차 후속에서 이미 확정된 "data_scope 9차원 중 4차원만 실강제" 사실은 본 문서에서 재검증·재플래그하지 않고 그대로 승계한다 — Scope 신규 설계는 이 한계를 상위 검토 계층에서 인지하는 데 그치고, 4차원 확장 자체는 별도 실결함 수정 트랙(§D-5)의 범위다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Registry(§1) 및 선행 Part 3-1~3-7 완결 확인
- [ ] 15단계 계층 전체 정의(11단계 신규분 포함)
- [ ] 3개 기존 축(Tenant/Role-Permission/Team data_scope) 읽기 전용 매핑 계약 확정
- [ ] 포함관계·상속 규칙 명세
- [ ] Scope-Assignment 교차 질의 계약(Registry 완결 후 착수)
- [ ] data_scope 4/9차원 한계 재확인(재플래그 아닌 승계 확인)
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득

## 7. 반날조 인용 출처

- SPEC §4(Tenant..Application 15 scope) / ADR D-1(Extend-Wrap) · D-8(부수발견 연계)
- Ground-Truth ① §(tenant 격리·api_key scope·team data_scope 3축) · ② §(AgencyPortal/ChannelContract KEEP_SEPARATE 근거)
- ABSENT 항목(15단계 통합 모델·11단계 신규분·포함관계·상속)은 grep 0 실측 — 3개 산재 축을 "15단계 모델 완성"으로 과장하지 않음
