# DSAR — Recertification (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §13(Recertification)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §13은 배정이 "한 번 승인되면 영구 유효"가 아니라 7종 트리거(Time-based·Risk Increase·Role Change·Scope Change·Policy Change·Organization Change·Regulatory Requirement) 중 하나가 발생하면 **재인증(Recertification)**을 강제해야 한다고 정의한다. 이는 Part 3-8 전체 거버넌스의 핵심 순환고리 — Certification이 1회성 승인이 아니라 지속적 루프가 되게 하는 트리거 계층이다. 본 문서는 7종 트리거 각각의 실 substrate 유무를 판정하고, 현재 시스템에 존재하는 "만료 기반 재평가"(결제·api_key)가 왜 진정한 Recertification이 아닌지를 정직하게 구분한다.

Recertification이 없으면 최소권한 원칙(least privilege)이 시간이 지날수록 붕괴한다 — 승인 당시에는 정당했던 배정이 조직 개편·역할 변경·위험 상승 이후에도 아무 재검토 없이 영구 유지되는 "권한 축적(privilege creep)" 문제가 발생한다. 7종 트리거는 이 축적을 막는 감지 신호이며, 본 문서는 그 신호원이 현재 어디까지 구축되어 있는지를 정직하게 판정한다.

7종 트리거는 서로 독립적이지 않다. 예를 들어 Organization Change(팀 이전)는 통상 Role Change(새 팀의 역할 재배정)를 동반하고, Policy Change는 다수 배정의 Scope Change를 유발할 수 있다. Recertification Scheduler는 이러한 복합 트리거가 동일 배정에 중복 발생했을 때 재인증 아이템을 중복 생성하지 않고 단일 캠페인으로 병합하는 규칙도 함께 정의해야 한다(신규 설계 대상, §3.1 확장).

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT**

Ground-Truth ①·②의 결론대로 "주기적으로 배정을 재검토해 재승인/철회를 결정하는 루프"는 grep 0다. 현재 시스템에 존재하는 것은 **재인증이 아니라 만료에 의한 일방적 강등/차단**뿐이다: `UserAuth.php:141`은 결제 구독이 만료되면 플랜을 free로 자동 다운그레이드하고, `index.php:518`은 api_key의 `expires_at`이 지나면 401로 거부한다. 두 경로 모두 (a) Reviewer의 능동적 판단이 없고, (b) Evidence·Attestation 없이 자동 실행되며, (c) "재인증 통과"라는 긍정적 결과 경로가 없다(재승인 없이는 시간이 지나면 무조건 강등/차단). 즉 이들은 Recertification의 **Time-based 트리거 자체가 아니라, 트리거 없이 결과만 자동 집행되는 별개의 만료 메커니즘**이다.

### 2.2 하위항목 대조표

| SPEC §13 트리거 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Time-based | PARTIAL(근접이지 대체 아님) | `UserAuth.php:141`(결제만료→자동강등)·`index.php:518`(api_key expires→401 차단)가 "시간 경과 시 상태 변화"라는 형태는 제공하나, Reviewer 판단·Evidence·재승인 경로가 없어 진정한 Time-based Recertification이 아님 |
| Risk Increase | ABSENT | 위험도 상승을 탐지해 재인증을 트리거하는 경로 grep 0. `ModelMonitor.php`·`AnomalyDetection.php`는 KEEP_SEPARATE(성과/이상탐지 도메인, 접근권한 위험과 무관) |
| Role Change | ABSENT | 역할 변경 시 자동 재인증 트리거 grep 0. `TeamPermissions.php:641`(putMemberPermissions)은 위임 실행이지 변경 후 재인증 예약이 아님 |
| Scope Change | ABSENT | 범위(data_scope 등) 변경 시 재인증 트리거 grep 0 |
| Policy Change | ABSENT | 정책 갱신 시 영향받는 배정을 일괄 재인증하는 경로 grep 0 |
| Organization Change | ABSENT | 조직/테넌트 구조 변경(팀 이전·매니저 교체 등) 시 재인증 트리거 grep 0. `TeamPermissions.php:517`(팀 status 전환)은 상태값 변경일 뿐 재인증 예약이 아님 |
| Regulatory Requirement | ABSENT | 규제 요구(예: 분기별 SOX 검토) 기반 예약 트리거 grep 0 |

7종 중 6종이 순수 ABSENT라는 사실은 Recertification이 단순히 "기존 만료 로직에 몇 가지 조건을 추가"하는 확장 작업이 아니라, 이벤트 발행·구독·큐잉·상태전이라는 새로운 아키텍처 레이어 전체를 요구함을 의미한다.

### 2.3 KEEP_SEPARATE

- 본 SPEC 절에는 해당 없음(§13은 트리거 정의 절이며 근접 도메인 명명 충돌이 없음). 참고로 `ModelMonitor.php`·`AnomalyDetection.php`(§2.2 Risk Increase 행)는 마케팅/운영 지표 드리프트 감지이며 접근권한 재인증 트리거가 아니므로 흡수하지 않는다.

### 2.4 판정 근거 상세 — Time-based가 왜 "대체 아님"인가

`UserAuth.php:141`·`index.php:518`은 시간 경과에 따른 상태 변화라는 **형태**만 Time-based Recertification과 유사할 뿐, 다음 세 가지가 결정적으로 다르다. 첫째, 결과가 항상 부정적(강등/차단)이며 "재인증 통과 → 유지"라는 긍정 경로가 없다. 둘째, Reviewer의 능동적 검토·Evidence·Attestation이 전혀 개입하지 않는 완전 자동 집행이다. 셋째, 트리거 대상이 "결제 상태"·"키 만료"라는 단일 축에 고정되어 있어 §13이 요구하는 배정 단위의 범용 재인증 주기 관리가 불가능하다. 이 세 차이 때문에 PARTIAL 판정에서도 "대체 가능"이 아니라 "참조 가능"으로만 격상한다.

## 3. Canonical 설계

### 3.1 트리거 아키텍처

Recertification Scheduler는 7종 트리거를 각각 별도 이벤트 소스로 구독한다. Time-based는 배정별 `next_recert_due_at`을 두어 Certification 완료 시마다 정책 주기(예: 90일)만큼 갱신하고, 도래 시 Review Queue에 신규 캠페인 아이템을 생성한다(§13 Time-based는 §29 Runtime Guard·§28 Digest와 연동해 캠페인 스냅샷을 남김). 나머지 6종(Risk/Role/Scope/Policy/Org/Regulatory)은 이벤트 기반 트리거로, 해당 변경이 발생한 배정을 즉시 Pending 상태의 재인증 아이템으로 큐에 삽입한다 — 즉 예정된 주기를 기다리지 않고 조기 재인증을 강제한다(fail-secure: 변경 발생 시 기본값은 "재검토 필요").

### 3.2 실패 시 집행

재인증에 실패(거부/미응답 SLA 초과)하면 D-3 상태머신에 따라 Remediation(§15)의 Auto Revocation을 호출하여 기존 수동 revoke 액션(`Keys.php:135`·`UserAdmin.php:338`)을 실행한다. 이 지점에서만 §2.2의 PARTIAL substrate(`UserAuth.php:141`·`index.php:518`과 동일 계열의 강제 집행 함수)가 실제로 재사용되며, 트리거 판단 자체는 재사용하지 않는다는 점이 핵심 설계 경계다.

### 3.3 이벤트 발행 선행조건

Role/Scope/Policy/Org/Regulatory 6종 트리거는 해당 변경이 발생했을 때 이벤트를 발행하는 훅이 선행 구현되어야 하는데, 현재 `TeamPermissions.php:641`(putMemberPermissions)·`:517`(팀 status)은 변경을 실행할 뿐 이벤트를 발행하지 않는다. Recertification Scheduler 구현 이전에 이 이벤트 발행 계층이 먼저 신설되어야 한다(선행 의존, §6 게이트).

## 4. Kernel/substrate 매핑

| SPEC §13 트리거 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| Time-based (결과 집행) | `UserAuth.php:141`·`index.php:518` | 참조만(대체 아님) — Recertification 실패 시 최종 집행 액션으로 재사용 가능하나, 트리거·평가·Evidence 절차는 완전 신규 |
| Risk Increase | 없음(KEEP_SEPARATE: ModelMonitor/AnomalyDetection) | 완전 신규(별도 도메인 흡수 금지) |
| Role/Scope/Policy/Org/Regulatory | 없음 | 완전 신규 |
| Scheduler/Queue 인프라 | 없음 | 완전 신규 |

이 매핑표가 보여주는 비대칭 — 7종 트리거 중 유일한 부분 재활용이 Time-based의 "결과 집행" 단계뿐이라는 점 — 은 Recertification이 Part 3-8 12개 계층 중에서도 특히 얇은 substrate 위에 서야 함을 의미한다. 이는 Ground-Truth ②가 확정한 "12 계층 전부 ABSENT" 결론과 일치하며, 본 문서가 그 결론을 개별 트리거 단위로 재확인한 것이다.

## 5. 무후퇴 · Extend

`UserAuth.php:141`(결제만료 강등)·`index.php:518`(api_key expires 차단)은 각자의 원래 목적(구독과금·자격증명 수명관리)대로 변경 없이 유지된다(Golden Rule). Recertification Scheduler는 이 두 경로를 **대체하지 않고**, 재인증 실패 시의 최종 집행 수단(강등/차단)으로만 참조한다 — 즉 이 두 메커니즘이 Recertification 엔진으로 재구현되는 것이 아니라, Recertification 엔진이 이들을 호출하는 소비자가 된다. `ModelMonitor.php`·`AnomalyDetection.php`(KEEP_SEPARATE)는 성과/이상탐지 목적 그대로 유지하며 Risk Increase 트리거 소스로 흡수하지 않는다.

`TeamPermissions.php:641`·`:517`에 이벤트 발행 훅을 추가하는 작업(§3.3)조차도 기존 함수의 반환값·부작용을 바꾸지 않는 방식(발행은 기존 로직 실행 후 부가적으로 덧붙이는 형태)으로 구현되어야 하며, 두 함수의 기존 호출자 계약을 깨서는 안 된다.

## 6. 완료 게이트

- [ ] Part 1~3-7 선행 계보 CERTIFIED 완료 — 현재 BLOCKED_PREREQUISITE
- [ ] Recertification Scheduler(7종 트리거 이벤트 소스) 신규 설계·구현
- [ ] `next_recert_due_at` 배정별 필드 신규 스키마
- [ ] Role/Scope/Policy/Org/Regulatory 변경 이벤트 훅 신규 구현(현재 이벤트 발행 경로 부재)
- [ ] 재인증 실패 시 Remediation Auto Revocation 연동(§15 참조, 기존 revoke 액션 재사용)
- [ ] Role/Scope/Policy/Org/Regulatory 이벤트 발행 계층(현재 `TeamPermissions.php:641`·`:517`은 실행만·발행 없음) 선행 신설
- [ ] Risk Increase 신호원(KEEP_SEPARATE ModelMonitor/AnomalyDetection과 별개 도메인) 설계 확정
- [ ] Regulatory Requirement 트리거의 규제 캘린더(예: 분기별 SOX 창) 정의
- [ ] 코드 변경 0 유지 확인(본 문서는 설계 명세만)
- [ ] 코드 배포·인증(CERTIFIED) 전환 없음 확인

## 7. 반날조 인용 출처

- SPEC §13(Recertification: Time-based/Risk Increase/Role Change/Scope Change/Policy Change/Organization Change/Regulatory Requirement)
- ADR D-1(Extend·Wrap) · D-3(Review Queue 상태머신) · D-7(정직분리) · D-8(부수발견 — 휴면회수부재)
- Ground-Truth ① §2-B(회수 수동: `UserAuth.php:141`) · §2-C(만료: `index.php:518`)
- Ground-Truth ② §1(12 거버넌스 계층 전부 ABSENT)
- ABSENT 항목(Risk/Role/Scope/Policy/Org/Regulatory 6종 트리거·Scheduler)은 grep 0 실측 — 결제만료·키만료로 채우지 않음(형태만 유사한 결과 집행이지 트리거 아님)
- 본 문서는 §11(Evidence Collection)·§14(Exception Management) DSAR과 인접하며, 재인증 실패 시 Exception 신청 경로로 분기 가능하나 두 흐름은 별개 상태머신이다(교차 재인용 시에도 신규 파일:라인 창작 금지)
