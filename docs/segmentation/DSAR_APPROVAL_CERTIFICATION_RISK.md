# DSAR — Certification Risk (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §21(Certification Risk)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §21 Certification Risk는 access review 대상에 대한 **위험 평가(risk assessment)** 계층을 정의한다. 원문 평가 항목: Privileged Role · Sensitive Permission · Dormant Account · Stale Assignment · Unused Permission · High Risk Scope.

이 6개 항목은 "역할/권한 보유 사실"이 아니라 "그 보유가 review 우선순위를 높여야 할 위험 신호인가"를 판정하는 스코어링 계층이다. Review Queue(§9)·Analytics(§20 Risk Trend)의 입력이 되며, Simulation(§25 Risk Score 영향분석)의 기준값이기도 하다. Part 3-8 12계층 전부가 ABSENT로 확정된 상태(Ground-Truth ② §1)에서, Certification Risk는 access-review 관점의 **위험 스코어 산출 엔진 자체가 부재**하다는 것이 결론이나, 판정에 쓸 원료 데이터(휴면·미사용·위임범위) 필드는 여러 곳에 산재하므로 access-risk 판정에 한해 **ABSENT-access risk(재활용 원료 존재, 스코어링 로직 부재)**로 정직하게 구분한다.

이 문서의 판정은 Part 3-8 시리즈 중 유일하게 "ABSENT"가 아닌 "ABSENT-access risk"라는 세분 표기를 쓴다. 이는 브리프 §2 원칙(근접 substrate 근접 시 PARTIAL 표기 허용)에 따라, 6개 항목 중 3개(Privileged Role·Dormant Account·Unused Permission)가 원료 필드 재사용 가능성이 있다는 것을 정직하게 드러내되, 나머지 3개(Sensitive Permission·Stale Assignment·High Risk Scope)는 원료조차 없는 순수 신설이라는 차이를 뭉개지 않기 위함이다. §2.2 표에서 이 구분을 항목별로 명시한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT-access risk**

Ground-Truth ①은 만료·휴면·사용흔적(§2.C)을 PARTIAL substrate로 실측하며, 이는 Dormant Account·Unused Permission 판정에 쓸 원료 필드가 존재함을 뜻한다. 그러나 이 필드들을 "역할별 위험 점수"로 산출·저장·갱신하는 로직(risk scoring function, weighting, threshold)은 Ground-Truth ② §2 실측표에서 grep 0으로 확인되어 ABSENT다. 즉 Certification Risk는 **원료(raw signal) PARTIAL + 스코어링 로직 ABSENT**의 혼합 상태이며, 이를 "Risk 판정 기능이 이미 있다"로 과장하는 것은 금지된다(D-7).

### 2.2 하위항목 대조표

| SPEC §21 평가 항목 | 판정 | 실 substrate / 근거(허용목록) |
|---|---|---|
| Privileged Role | ABSENT-access risk(원료 PARTIAL) | `TeamPermissions.php:393`(effectiveForUser) — 실효 역할 산출까지는 있으나 "privileged로 분류→위험 가중치 부여" 로직 부재 |
| Sensitive Permission | ABSENT | 권한 항목별 "민감도" 태그·분류 체계 grep 0 |
| Dormant Account | ABSENT-access risk(원료 PARTIAL) | `UserAdmin.php:117`(last_login)·`UserAuth.php:206`(세션 유휴) — 휴면 판정 원료 필드는 존재하나 이를 "위험 스코어"로 환산하는 함수 없음 |
| Stale Assignment | ABSENT | 배정 시점 대비 경과일 계산·기준치 없음. `index.php:506`(is_active)·`:604`·`:608`은 활성 여부 플래그이지 staleness 스코어 아님 |
| Unused Permission | ABSENT-access risk(원료 PARTIAL) | `index.php:522`(last_used) — 최종 사용 시각 필드는 존재하나 "미사용 기간→위험도" 변환 로직 부재 |
| High Risk Scope | ABSENT | `TeamPermissions.php:356`(scopeWithinCap)·`:423`(clampActions)는 위임 상한 강제 로직이지 scope 자체의 위험도 평가가 아님 |

### 2.3 KEEP_SEPARATE (해당 시)

- `Risk.php`는 **고객 이탈(churn) 예측 ML 모델**이다. "Risk"라는 이름이 동일하지만 대상이 "이 사용자가 이탈할 확률"이지 "이 권한 보유가 접근통제상 위험한가"가 아니다 — 두 도메인은 완전히 별개이며, Certification Risk 엔진을 `Risk.php` 확장으로 오인·흡수하는 것은 가짜녹색 최상위 위험(Ground-Truth ② §4 원칙)에 해당하므로 절대 금지.
- `UserAuth.php:4165`(auth_audit_log risk 필드)는 **로그인 시도 단위의 이상탐지 risk 값**(예: 비정상 위치·다중 실패)이며, "역할/권한 보유에 대한 access-risk 스코어"가 아니다. 이름의 risk 필드가 동일 소스 파일에 있다는 이유로 Certification Risk 산출값과 동일시하면 안 된다 — 이벤트 단위 인증 이상탐지와 배정 단위 접근권한 위험평가는 계층이 다르다.
- `ModelMonitor.php:221`·`:244`(ML drift 탐지)도 §22 Drift Detection과 동일하게 모델 성능 이슈이지 권한 위험이 아니다(참조: 본 시리즈 §22 문서).
- 세 근접물(`Risk.php`·`UserAuth.php:4165`·`ModelMonitor.php`) 공통 함정: 이름에 "risk"가 들어가는 필드·클래스를 발견했다는 사실만으로 access certification risk 엔진이 "이미 존재한다"고 오판하는 것이 Ground-Truth ② §4가 경고하는 가짜녹색 최상위 패턴이다. 반드시 대상(target)이 "권한 배정"인지 확인한 후에만 재활용 후보로 검토한다.

## 3. Canonical 설계

SPEC §21 원문 기반 신규 설계 계약:

| # | 필드 | 의미 |
|---|---|---|
| 1 | risk_assessment_id | 평가 결과 식별자 |
| 2 | assignment_ref | 대상 배정(role assignment) 참조 |
| 3 | privileged_role_flag | Privileged Role 해당 여부 |
| 4 | sensitive_permission_flags[] | 보유 권한 중 민감 항목 목록 |
| 5 | dormant_score | 휴면 계정 위험도(경과일 기반) |
| 6 | stale_score | 배정 경과 대비 재검토 지연 위험도 |
| 7 | unused_permission_flags[] | 미사용 권한 목록 |
| 8 | high_risk_scope_flag | 고위험 scope 해당 여부 |
| 9 | composite_risk_score | 6개 항목 가중합 |
| 10 | evaluated_at | 평가 시각 |

가중치·임계치는 SPEC 원문에 정의되어 있지 않아 본 문서에서 확정하지 않는다(추정 금지) — 별도 승인 세션에서 정책 결정 필요.

composite_risk_score의 산출 순서는 (1) 6개 항목 각각의 개별 스코어 산출, (2) 정책 확정 가중치 적용, (3) 합산 후 정규화, (4) Review Queue(§9) 우선순위 큐에 반영이다. 개별 스코어 중 하나라도 미평가(unknown) 상태이면 §5 fail-secure 원칙에 따라 합산을 보류하고 즉시 최우선 review 대상으로 승격한다 — 이는 "낮은 점수로 오판되어 review에서 누락되는" 실결함 패턴을 사전 차단하기 위한 설계 요구사항이다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Privileged Role 판정 입력 | `TeamPermissions.php:393`(effectiveForUser) | 승격(입력원 재사용) |
| Dormant Account 원료 | `UserAdmin.php:117`(last_login)·`UserAuth.php:206`(세션 유휴)·`UserAuth.php:4263`(user_session)·`:989`·`:4284`·`:4365` | 승격(원료 필드 재사용) |
| Unused Permission 원료 | `index.php:522`(last_used) | 승격(원료 필드 재사용) |
| High Risk Scope 입력 | `TeamPermissions.php:356`(scopeWithinCap)·`:423`(clampActions) | 승격(제약 로직 참조, 위험도 산출은 신규) |
| Sensitive Permission 분류 | 부재 | 신규 |
| Stale Assignment 계산 | 부재 | 신규 |
| composite_risk_score 가중합 | 부재 | 신규 |
| 미평가(unknown) fail-secure 승격 | 부재 | 신규 |

## 5. 무후퇴 · Extend

- Golden Rule Wrap(D-1): Dormant/Unused 원료 필드(`last_login`·`last_used`·세션 유휴)는 그대로 유지한 채, 그 위에 위험 스코어링 함수를 **신설**해 얹는다. 원료 필드의 의미·소비처(`UserAuth.php:141` 결제만료 강등 등 기존 로직)는 변경하지 않는다.
- 위임 상한 강제 로직(`TeamPermissions.php:356`·`:423`, P4에서 실결함 봉인 완료된 manager scope 위임상한 포함)은 그대로 유지하며, High Risk Scope 판정은 이 강제 로직을 **참조**할 뿐 대체하지 않는다.
- `Risk.php`(churn ML)·`UserAuth.php:4165`(로그인 이상탐지 risk)는 KEEP_SEPARATE로 영구 분리 유지 — 이름 유사성으로 인한 향후 리팩터링 시 병합 시도 금지.
- fail-secure: composite_risk_score 산출이 실패하거나 원료 필드가 결측인 경우 "위험 없음(낮음)"으로 기본값 처리하지 않고 **미평가(unknown) → review 우선순위 최고**로 처리하는 것을 설계 원칙으로 명시(가중치 확정 세션에서 재확인 필요).

## 6. 완료 게이트

- [ ] Sensitive Permission 분류 체계 정책 확정(SPEC 원문 미정의 — 별도 정책 결정 필요)
- [ ] Stale Assignment 임계치 정책 확정
- [ ] composite_risk_score 가중치 정책 확정 및 승인
- [ ] Dormant/Unused 원료 필드 승격 매핑 구현(§4 표 기준) — Part 1~3-7 인증 이후
- [ ] `Risk.php`·`auth_audit_log` risk 필드 KEEP_SEPARATE 재검증(오흡수 0 확인)
- [ ] 미평가(unknown) 상태의 fail-secure 처리(최우선 review 승격) 로직 설계 재확인
- [ ] Privileged Role 판정 입력원(`TeamPermissions.php:393`)이 Part 3-7 ERRE 인증본과 일치하는지 교차 확인
- [ ] 코드 0 유지 확인 — 본 편은 설계 명세만

## 7. 반날조 인용 출처

- SPEC §21(Certification Risk 6개 평가 항목) / SPEC §9(Review Queue 소비처) / SPEC §20(Risk Trend 소비처) / SPEC §25(Simulation Risk Score 기준값)
- ADR D-1(Extend-Wrap) · D-5(Reviewer Delegation 상한 — scopeWithinCap 참조 근거) · D-6(KEEP_SEPARATE) · D-7(정직 분리)
- Ground-Truth ① §2.C(만료·휴면·사용흔적: `UserAdmin.php:117`·`UserAuth.php:206`·`index.php:506`·`:522`·`:604`·`:608`)·§2.D(위임: `TeamPermissions.php:356`·`:423`·`:393`)
- Ground-Truth ② §2(SPEC §7~§30 실측표, §21 ABSENT 확정)·§4 B-2(ModelMonitor)·§4(churn/로그인 이상탐지류 KEEP_SEPARATE 원칙)
- ABSENT 항목(Sensitive Permission 분류·Stale Assignment 계산·High Risk Scope 판정·composite score)은 grep 0 실측 — `Risk.php`(churn ML)·`auth_audit_log` risk 필드로 채우기 금지
- 본 문서는 6개 평가 항목 중 3개를 ABSENT-access risk(원료 PARTIAL)로, 3개를 순수 ABSENT로 구분 판정했다 — 이 구분 자체가 반날조 원칙(§2 근접 substrate 과장 금지·부재 과장 금지 양방향 준수)의 적용 사례다.
