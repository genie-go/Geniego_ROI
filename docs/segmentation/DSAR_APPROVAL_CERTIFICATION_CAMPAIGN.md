# DSAR — Certification Campaign (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §3(Certification Campaign — 8유형·속성)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §3이 정의하는 Certification Campaign은 Registry(§1)에 인덱싱된 Assignment 집합을 실제로 "검토하는 행위 단위"다. 접근 검토는 임의 시점에 즉흥적으로 이뤄지지 않고, 명시적으로 개시(launch)·범위 지정(scope)·완료(close)되는 Campaign 단위로 조직화되어야 감사 가능성(auditability)이 성립한다. SPEC §3은 Campaign을 8유형으로 분류한다: Annual/Quarterly/Monthly/Weekly 정기형, Event-triggered(조직개편·이직 등), Risk-based(고위험 role 우선), Regulatory(법규 대응), Emergency(사고 대응 긴급 검토). 각 Campaign은 속성(대상 범위, 개시자, 기한, 검토자 배정, 완료율)을 가진다. 본 문서는 이 Campaign 엔티티가 실 코드베이스에 존재하는지 여부와, "campaign"이라는 이름을 공유하지만 전혀 다른 도메인인 근접물과의 경계를 규정한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(순신규 그린필드)**

Ground-Truth ①/②의 실측 결론: 접근 검토(access review) 목적의 "Certification Campaign" 엔티티는 grep 0. 코드베이스에 "campaign"이라는 명칭을 쓰는 실 구현이 존재하기는 하나(`AdminGrowth.php:1063` admin_growth_campaign, `AutoCampaign.php`, `CampaignManager.jsx`), 이들은 전부 **광고/마케팅 캠페인**이며 사람의 역할·권한 인증과 무관하다. 8유형 스케줄 기반 검토 개시 로직도 grep 0.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Annual/Quarterly/Monthly/Weekly 정기 Campaign | ABSENT | grep 0 — 주기적 접근 검토 개시 로직 부재 |
| Event-triggered Campaign(조직개편·이직) | ABSENT | grep 0 — `UserAdmin.php:598`(assignRole 제거 주석)는 개별 회수 동작이지 Campaign 개시 트리거 아님 |
| Risk-based Campaign(고위험 role 우선) | ABSENT | grep 0 — `TeamPermissions.php:722`(member_permissions_set risk=high) 필드는 존재하나 이를 소비해 Campaign을 개시하는 로직은 부재 |
| Regulatory Campaign | ABSENT | grep 0 |
| Emergency Campaign | ABSENT | grep 0 |
| Campaign 속성(범위/개시자/기한/검토자 배정/완료율) | ABSENT | grep 0 |
| Campaign-Assignment 연계(Registry §1 소비) | ABSENT | Registry 자체가 ABSENT이므로 연계 대상 부재 |

### 2.3 KEEP_SEPARATE

- `AdminGrowth.php:1040`~`:1069`·`:1063`(admin_growth_campaign): 관리자 성장 자동화의 **마케팅 캠페인** 테이블 — 접근 검토와 무관, 명칭 충돌만 존재.
- `AutoCampaign.php`·`:917`(driftFromSeries): 광고 자동화 캠페인 드리프트 감지 — 예산/타겟 드리프트이지 권한 검토 아님.
- `CampaignManager.jsx`: 프론트엔드 광고 캠페인 관리 UI — 접근 인증 UI 아님.
- 위 3개는 이름이 완전히 동일한 단어("campaign")를 쓰지만 도메인이 광고/마케팅 자동화이므로 Certification Campaign 엔진에 절대 흡수·개명하지 않는다(가짜녹색 회피, D-6 KEEP_SEPARATE).

## 3. Canonical 설계

Campaign은 다음 개념 계약으로 설계된다(코드 미구현, 설계 명세 단계):

- **Campaign 엔티티**: `type`(annual/quarterly/monthly/weekly/event/risk_based/regulatory/emergency) × `scope`(대상 Assignment 집합, Registry §1 질의 결과) × `initiator` × `due_at` × `reviewer_assignments`(Rule §6에서 파생) × `completion_rate`.
- **개시 조건**: 정기형 4종은 Schedule(§ Part 3-8 별도 문서)이 트리거하고, Event/Risk-based/Regulatory/Emergency 4종은 외부 이벤트(조직변경·고위험 role 탐지·법규 마감·보안사고)가 트리거한다.
- **완료 판정**: Campaign 내 모든 대상 Assignment가 검토(승인/회수/보류) 처리되어야 종료 가능 — fail-secure 원칙상 미검토 Assignment가 남아있는 Campaign은 종료 불가.
- **감사 연계**: Campaign 개시/종료 이벤트는 감사 로그에 append-only로 기록되어야 한다(참조: `SecurityAudit.php:8` append-only 주석, 흡수 아님).

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 고위험 role 판정 신호 | `TeamPermissions.php:722`(risk=high) | 승격(Risk-based Campaign 트리거 후보 신호로 재활용) |
| 회수 동작(Event-triggered 시 실행) | `UserAdmin.php:342`(세션 revoke)·`Keys.php:135`(revoke) | 승격(Campaign 결과 집행 시 재활용, Campaign 자체는 신규) |
| 감사 기록 연계 | `SecurityAudit.php:8`·`:56` | 승격(참조 연계, 흡수 아님) |
| Campaign 엔티티/8유형 개시 로직 | 없음 — 신규 | 신규 |
| admin_growth_campaign(광고) | `AdminGrowth.php:1063` | KEEP_SEPARATE — 매핑 대상 아님 |
| AutoCampaign(광고) | `AutoCampaign.php` | KEEP_SEPARATE — 매핑 대상 아님 |

## 5. 무후퇴 · Extend

Campaign 신규 설계는 `AdminGrowth.php:1063`(admin_growth_campaign), `AutoCampaign.php`, `CampaignManager.jsx`의 광고 캠페인 스키마·로직을 절대 변경·재사용·개명하지 않는다(Golden Rule Wrap 위반 방지). Campaign이 실행 결과로 회수를 집행할 때는 기존 회수 substrate(`UserAdmin.php:342`, `Keys.php:135`)를 그대로 호출하는 상위 오케스트레이션으로만 동작하며, 회수 로직 자체를 재구현하지 않는다. `TeamPermissions.php:722`의 risk=high 필드는 읽기 전용 신호로만 소비한다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Registry(§1) 및 선행 Part 3-1~3-7 완결 확인
- [ ] Campaign 엔티티 스키마 확정(코드 0 유지)
- [ ] 8유형별 개시 조건 명세 확정
- [ ] Risk-based 트리거 신호(`TeamPermissions.php:722`) 소비 계약 확정
- [ ] Campaign-Assignment(Registry) 연계 계약 확정
- [ ] KEEP_SEPARATE 3근접물(admin_growth_campaign/AutoCampaign/CampaignManager.jsx) 오흡수 재검증
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득

## 7. 반날조 인용 출처

- SPEC §3(Certification Campaign 8유형·속성) / ADR D-6(KEEP_SEPARATE) · D-5(Reviewer Delegation 상한, 검토자 배정 관련)
- Ground-Truth ① §(risk=high 신호·회수 substrate) · ② §(admin_growth_campaign/AutoCampaign/CampaignManager.jsx KEEP_SEPARATE 근거)
- ABSENT 항목(Campaign 엔티티·8유형 개시 로직 전체)은 grep 0 실측 — 광고 캠페인 근접물로 채우지 않음
