# DSAR — Review Assignment: New/Modified/Privileged/Sensitive/Expiring/Dormant 자동생성 (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §8(Review Assignment 자동생성)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §8은 Access Review 대상을 **자동으로 선정·큐에 생성**하는 트리거 조건을 정의한다. 다루는 하위항목(6종 트리거):

- **New** — 신규 역할 배정/신규 계정에 대한 초기 검토.
- **Modified** — 역할·권한 범위가 변경된 계정에 대한 변경후 검토.
- **Privileged** — 관리자급 이상 고권한 역할 보유자에 대한 정기 검토.
- **Sensitive** — 민감 데이터(PII 등) 접근권을 가진 역할에 대한 검토.
- **Expiring** — 권한 만료가 임박한 계정에 대한 갱신 여부 검토.
- **Dormant** — 장기 미사용(유휴) 계정에 대한 회수 여부 검토.

본 문서는 이 6종 트리거가 자동으로 Review 항목을 생성하는 엔진의 실 substrate 부재를 확인하고, 트리거 판단에 필요한 원시 신호(raw signal)만 산재해 있고 "자동 선정→큐 생성" 로직은 존재하지 않음을 명확히 한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**(자동선정 로직), 원시 신호는 일부 **PARTIAL** 존재

Ground-Truth ①에 "New/Modified/Privileged/Sensitive/Expiring/Dormant 조건을 판정해 Review 큐 항목을 자동 생성"하는 엔진이 전무하다(grep 0). 다만 Expiring·Dormant 두 트리거는 판정에 필요한 **원시 시간 신호**(만료 필드, 최종 로그인/유휴 시각)가 이미 다른 목적(수동 만료 강제, 세션 타임아웃)으로 존재한다. 이 신호들은 289차 후속 EPIC 06-A Part3-4에서 확정된 "data_scope 9차원 중 4차원만 실강제" 감사와 동일 계열의 **부분 substrate**이며, ADR D-8이 "휴면 회수 자동화 부재"를 부수발견으로 등재한 것과 일치한다. New/Modified/Privileged/Sensitive 4종 트리거는 원시 신호조차 자동 판정용으로 조립되어 있지 않다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| New(신규 배정 자동검토) | ABSENT | grep 0. 역할 배정 이벤트를 구독해 검토항목을 생성하는 로직 없음 |
| Modified(변경후 자동검토) | ABSENT | grep 0. `TeamPermissions.php:686`·`:722`(member_permissions_set risk=high)는 변경 사실을 감사로그에 남길 뿐, 그로부터 Review 항목을 자동 생성하지 않음 |
| Privileged(고권한 정기검토) | ABSENT | grep 0. 관리자 역할 보유자 목록 자체는 `UserAdmin.php` 등에 존재하나(허용목록 외 라인이므로 본 문서에서 인용 안 함), "정기 검토 대상으로 자동 지정"하는 로직은 없음 |
| Sensitive(민감데이터 접근 검토) | ABSENT | grep 0 |
| Expiring(만료임박 자동검토) | PARTIAL(원시 신호만) | `index.php:518`(expires 강제)·`:522`(last_used) — 만료를 **강제 차단**하는 로직은 있으나 "만료 임박 시 검토 항목 생성"은 없음. 원시 필드만 재사용 가능 |
| Dormant(유휴계정 자동검토) | PARTIAL(원시 신호만) | `UserAdmin.php:117`(last_login)·`UserAuth.php:206`(세션 유휴)·`:4263`(user_session) — 유휴 판정에 쓸 시간 신호는 존재하나, "유휴 시 검토 큐 자동 생성"은 부재. ADR D-8 "휴면 회수 자동화 부재" 부수발견과 일치 |
| 자동생성 우선순위/스케줄러 | ABSENT | grep 0. cron 등 배치 트리거 자체가 이 목적으로 존재하지 않음 |

### 2.3 KEEP_SEPARATE

해당 없음 — 본 SPEC 하위항목에서 발견된 근접물은 이름 충돌형 오탐이 아니라, 전부 "판정에 쓸 수 있는 원시 신호(raw signal)"이며 §4에서 재활용 후보로 명시한다. 다만 이 신호들의 **원 목적**(수동 만료 차단, 세션 타임아웃)은 대체하지 않고 그대로 보존한다.

## 2.4 트리거 간 우선순위

한 subject_user_id가 동시에 복수 트리거(예: Privileged이면서 Dormant) 조건을 만족할 수 있다. 이 경우 단일 큐 항목에 복수 `trigger_type`을 이력으로 누적하되, 리뷰어 배정 시 가장 높은 위험도의 트리거(Sensitive > Privileged > Dormant > Expiring > Modified > New 순, 잠정)를 기준으로 SLA를 산정한다. 우선순위 값 자체는 후속 리뷰에서 테넌트 정책으로 조정 가능하도록 설계하며 하드코딩하지 않는다(임의 숫자 금지 원칙).

## 3. Canonical 설계

- **자동생성 규칙 테이블**(신규): `role_certification_assignment_trigger` — `trigger_type`(NEW/MODIFIED/PRIVILEGED/SENSITIVE/EXPIRING/DORMANT), `subject_user_id`, `scope_ref`, `triggered_at`, `source_signal`(원시 신호 출처 기록), `review_queue_id`(§9 큐로 연결).
- **New**: 역할 배정 이벤트(§Part 3-3 Role Assignment Governance 완결분과 연결) 발생 시 즉시 검토 항목 생성.
- **Modified**: 권한 범위 변경 이벤트(`member_permissions_set` risk=high와 유사한 변경-기록 패턴을 참고) 발생 시 생성.
- **Privileged**: 정기 배치(예: 월 1회)로 admin급 이상 역할 보유자 전수를 대상화.
- **Sensitive**: §Part 3-4 Scoped Role Governance의 data_scope 민감 차원과 연동해 판정(선행 계층 CERTIFIED 필요).
- **Expiring**: `index.php:518` 계열의 만료 필드를 임계일(예: D-14) 기준으로 조회해 생성 — 기존 강제차단 로직은 무수정, 조회만 추가.
- **Dormant**: `UserAdmin.php:117`·`UserAuth.php:206` 계열 유휴 신호를 임계일 기준으로 조회해 생성 — ADR D-8의 "휴면 회수 자동화 부재"를 본 트리거가 정식으로 해소하는 설계.
- **fail-secure 원칙**: 트리거 판정 자체가 실패(신호 부재/오류)할 경우 "검토 불필요"로 낙관 처리하지 않고 "검토 필요"로 큐에 생성(안전측 편향).
- **중복 생성 방지**: 동일 subject_user_id·scope_ref·trigger_type 조합에 대해 이미 OPEN(§9 PENDING~ESCALATED) 상태의 큐 항목이 존재하면 신규 생성을 억제하고 기존 항목에 트리거 이력만 추가한다(큐 폭증 방지).
- **임계값의 테넌트별 커스터마이징**: Expiring D-14, Dormant 임계일수 등은 테넌트별 정책값으로 설계하되 기본값은 보수적(짧게)으로 설정한다 — 완화 방향의 임계값 변경은 admin 승인 하에서만.
- **Privileged 판정 기준**: "admin급 이상"의 정의는 §Part 3-1 Role Registry의 role rank 체계를 참조하며, 본 문서가 독자적인 권한등급 체계를 새로 정의하지 않는다(무후퇴·단일 정본 원칙).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Expiring 원시 신호 | `index.php:518`(expires)·`:522`(last_used)·`:506`(is_active)·`:604`·`:608` | 승격 후보 — 조회만 추가, 강제차단 로직 무수정 |
| Dormant 원시 신호 | `UserAdmin.php:117`(last_login)·`UserAuth.php:206`(세션 유휴)·`:4263`(user_session)·`:54`(app_user)·`:989`·`:4284`·`:4365` | 승격 후보 — ADR D-8 부수발견 해소 설계 |
| Modified 변경기록 참고 | `TeamPermissions.php:686`·`:722`(risk=high) | 참고 패턴(트리거 판정 힌트) |
| 대행사/파트너 유휴 신호 | `AgencyPortal.php:60`·`:208`·`PartnerPortal.php:57`·`:180` | 승격 후보(대행사/파트너 채널의 Dormant 판정 확장 시 참고) |
| New/Privileged/Sensitive 트리거 자체 | 없음 | 신규 |
| 자동생성 스케줄러 | 없음 | 신규 |

## 4.1 트리거별 소스 신호 요약

| 트리거 | 소스 신호 상태 | 소비 방식 |
|---|---|---|
| New | 없음(§Part 3-3 이벤트 필요) | 신규 이벤트 구독 |
| Modified | 부분(risk=high 기록만) | 참고 패턴 |
| Privileged | 없음(role rank 조회만 가능) | 정기 배치 조회 |
| Sensitive | 없음(§Part 3-4 필요) | 선행 계층 연동 |
| Expiring | 있음(원시 필드) | 임계일 조회 |
| Dormant | 있음(원시 필드) | 임계일 조회 |

## 5. 무후퇴 · Extend

- `index.php:518` 계열 만료 강제와 `UserAuth.php:206` 계열 세션 유휴 타임아웃은 **원 목적(즉시 차단)** 을 그대로 유지한다. 본 설계는 이 신호를 **읽기 전용으로 조회**해 검토 큐를 생성할 뿐, 만료/유휴 처리 로직 자체를 재구현하지 않는다.
- ADR D-8 부수발견(휴면 회수 자동화 부재)은 본 문서의 Dormant 트리거 설계로 정식 추적되며, 별도 엔진 난립 없이 단일 트리거 테이블로 수렴한다.
- P1~P5 무후퇴 유지. §Part 3-3(Role Assignment)·§Part 3-4(Scoped Role) 선행 계층이 CERTIFIED 되기 전까지 New/Sensitive 트리거는 설계만 유효하고 구현 착수 불가.

## 6. 완료 게이트

- [ ] §Part 3-3 Role Assignment Governance, §Part 3-4 Scoped Role Governance 선행 CERTIFIED (New/Sensitive 트리거 전제조건)
- [ ] `role_certification_assignment_trigger` 스키마 리뷰 승인
- [ ] Expiring/Dormant 원시 신호 조회 쿼리가 기존 만료/유휴 강제 로직에 부작용 없음을 검증
- [ ] fail-secure 안전측 편향(신호 실패 시 검토 필요로 처리) 규칙 확정
- [ ] 중복 생성 방지(OPEN 상태 항목 존재 시 억제) 규칙 확정
- [ ] Privileged 판정 기준을 §Part 3-1 Role Registry role rank와 단일 정본으로 통일
- [ ] ADR D-8 부수발견 해소 여부 재검증
- [ ] 코드 변경 0 유지 확인
- [ ] 사용자 명시 승인 없이 구현 착수 금지

## 7. 반날조 인용 출처

- SPEC §8(Review Assignment 자동생성) / ADR D-1(Extend-Wrap) · D-8(부수발견 — 휴면회수부재)
- Ground-Truth ① — New/Modified/Privileged/Sensitive 자동선정 엔진 없음(grep 0). Expiring/Dormant는 원시 신호만 PARTIAL 존재
- Ground-Truth ② — 해당 없음(이름 충돌형 KEEP_SEPARATE 없음, 전부 원시 신호 재활용 후보)
- ABSENT 판정 항목은 grep 0 실측이며, 원시 신호(index.php:518, UserAdmin.php:117 등)의 존재를 "자동선정 로직이 이미 구현됨"으로 과장하지 않았음을 명시
