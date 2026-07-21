# DSAR — Certification Rule (EPIC 06-A-03-02-03-04 Part 3-8)

> **거버넌스 상태**: 설계 명세(Design Specification) · 코드 변경 0 · **NOT_CERTIFIED** · **BLOCKED_PREREQUISITE** · 289차 후속 (2026-07-20)
> **상위 SPEC**: [`EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md) §5(정책→룰 파생)
> **상위 ADR**: [`ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE`](../architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md)
> **Ground-Truth**: ①[`DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CERTIFICATION_EXISTING_IMPLEMENTATION.md) · ②[`DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT`](DSAR_APPROVAL_CERTIFICATION_DUPLICATE_IMPLEMENTATION_AUDIT.md)
> **불변 원칙**: fail-secure · 무후퇴 · **반날조**(파일:라인=허용목록만) · KEEP_SEPARATE 오흡수 금지 · 289차 확정분 재플래그 금지

## 1. 목적

SPEC §5가 정의하는 Certification Rule은 Policy(§5 별도 문서)의 추상 원칙을 실행 가능한 조건-행동(condition-action) 단위로 파생시키는 최하위 실행 계층이다. Policy가 "무엇을 검토해야 하는가"를 선언한다면, Rule은 "구체적으로 어떤 조건에서 어떤 검토자에게 어떤 기한으로 배정하고, 미이행 시 무엇을 하는가"를 결정한다. SPEC §5 하위항목: (a) Policy→Rule 파생 매핑, (b) 조건(condition) 표현식, (c) 행동(action) — 검토자 배정/승인/회수/에스컬레이션, (d) 미이행 시 fail-secure 자동 조치. 본 문서는 이 Rule 계층이 실 코드베이스에 존재하는지, 그리고 이름이 유사한 "룰 엔진" 근접물과 명확히 분리되는지를 검증한다.

## 2. Ground-Truth (실 substrate 대조 / PARTIAL / ABSENT)

### 2.1 판정 요약 — **ABSENT(순신규 그린필드)**

Ground-Truth ①/②의 실측 결론: Policy를 조건-행동 Rule로 파생시켜 접근 검토를 실행하는 엔진은 grep 0. 코드베이스에 "rule engine"이라는 이름의 실 구현이 존재하기는 하나(마케팅 도메인 RuleEngine, `Alerting.php:571` action_request 결재 룰), 이들은 289차 후속 세션(EPIC 06-A Part3-5)에서 이미 KEEP_SEPARATE로 확정된 마케팅/알림 도메인 룰이며 권한 검토 룰이 아니다 — 재확정하되 재플래그하지 않는다.

### 2.2 하위항목 대조표

| SPEC 하위항목 | 판정 | 실 substrate / 근거(허용목록 파일:라인) |
|---|---|---|
| Policy→Rule 파생 매핑 | ABSENT | grep 0 — Policy 자체가 ABSENT이므로 파생 대상 부재 |
| 조건(condition) 표현식 | ABSENT | grep 0 — 마케팅 RuleEngine(KEEP_SEPARATE)의 조건 표현식은 형태만 유사, 권한 도메인 조건 부재 |
| 행동(action) — 검토자 배정 | ABSENT | grep 0 |
| 행동(action) — 승인/회수 집행 | PARTIAL(집행 substrate는 재활용 가능) | `Keys.php:135`(revoke)·`UserAdmin.php:342`(세션 revoke) — 개별 회수 동작은 실재, Rule이 이를 트리거하는 연계는 부재 |
| 행동(action) — 에스컬레이션 | ABSENT | grep 0 — `Reviews.php:174`(escalateNegatives)는 상품 리뷰 에스컬레이션이며 권한 검토 에스컬레이션과 무관(KEEP_SEPARATE) |
| 미이행 시 fail-secure 자동 조치 | ABSENT | grep 0 |

### 2.3 KEEP_SEPARATE

- 마케팅 RuleEngine: 289차 후속(EPIC 06-A Part3-5)에서 이미 KEEP_SEPARATE로 확정 — ABAC/동적 역할 조건과 유사한 조건-행동 구조를 갖지만 대상이 마케팅 세그먼트/캠페인 조건이지 권한 배정 검토 조건이 아니다. 본 문서에서 재플래그하지 않고 과거 확정을 그대로 승계한다.
- `Alerting.php:571`~`:723`(action_request decideAction/executeAction/approvals_json; 라우트 `routes.php:432`~`:434`): 알림/자동화 액션의 결재 룰이며, 승인 대상이 "액션 실행 여부"이지 "권한 배정 유지 여부"가 아니다 — 구조(조건→승인→집행)는 유사하나 도메인이 다르므로 흡수 금지.
- `Reviews.php:174`·`:179`(escalateNegatives): 부정적 상품 리뷰 에스컬레이션 — 이름의 "에스컬레이션"은 공유하나 상품 리뷰 도메인이다.
- `Catalog.php:2383`(approveQueue)·`:2312`~`:2392`(catalog_writeback pending_approval; 라우트 `routes.php:99`): 상품 카탈로그 승인 큐이며 접근 권한 승인이 아니다.

## 3. Canonical 설계

Rule은 다음 개념 계약으로 설계된다(코드 미구현, 설계 명세 단계):

- **Rule 엔티티**: `derived_from_policy`(§5 Policy 참조) × `condition`(예: role=critical AND last_reviewed_at > 90일) × `action`(reviewer_assign/approve/revoke/escalate) × `on_timeout`(fail-secure 자동 조치, 기본값=자동 회수 아님, pending 유지 후 에스컬레이션).
- **집행 위임**: Rule의 `action=revoke`는 기존 회수 substrate(`Keys.php:135`, `UserAdmin.php:342`)를 그대로 호출하는 상위 오케스트레이션으로 구현하며, 회수 로직 자체를 재작성하지 않는다.
- **조건 표현식 격리**: 마케팅 RuleEngine의 조건 문법을 참고 패턴으로만 삼되(D-2 참조·흡수 아님 원칙 준용), 별도 네임스페이스로 신규 구현한다 — 동일 엔진 공유 금지.
- **fail-secure 기본값**: 조건 판정이 모호하거나 데이터 부족 시, Rule은 항상 "검토 보류(pending)" 쪽으로 기본 동작해야 하며 자동 승인 방향으로 기본값을 두지 않는다.

## 4. Kernel/substrate 매핑

| SPEC 하위항목 | 재활용/승격 대상 substrate | 판정(신규/승격) |
|---|---|---|
| 회수 집행(action=revoke) | `Keys.php:135`(revoke)·`UserAdmin.php:342`(세션 revoke) | 승격(집행 위임, Rule 판정 로직 자체는 신규) |
| 조건-행동 구조 설계 참조 | 마케팅 RuleEngine(KEEP_SEPARATE) | 참조만(패턴 참고, 흡수 아님) — 승격 아님 |
| 결재 승인/거부 구조 참조 | `Alerting.php:571`(decideAction) | 참조만(패턴 참고, 흡수 아님) — 승격 아님 |
| Rule 엔티티/조건 표현식/파생 매핑 | 없음 — 신규 | 신규 |
| 에스컬레이션 로직 | 없음 — 신규 | 신규(`Reviews.php:174`는 흡수 대상 아님) |

## 5. 무후퇴 · Extend

Rule 신규 설계는 마케팅 RuleEngine, `Alerting.php:571`~`:723`의 action_request 결재 흐름, `Reviews.php:174`의 리뷰 에스컬레이션, `Catalog.php:2383`의 카탈로그 승인 큐를 하나도 변경·재사용·개명하지 않는다(Golden Rule Wrap, D-6 KEEP_SEPARATE 준수). Rule이 회수를 집행할 때는 `Keys.php:135`·`UserAdmin.php:342`의 기존 회수 함수를 그대로 호출하는 상위 오케스트레이션으로만 동작하며 회수 로직 자체를 재구현하지 않는다. 289차 후속에서 마케팅 RuleEngine에 대해 이미 내려진 KEEP_SEPARATE 판정은 본 문서에서 재검증 없이 그대로 승계한다.

## 6. 완료 게이트

- [ ] BLOCKED_PREREQUISITE 해소: Policy(§5) 및 선행 Part 3-1~3-7 완결 확인
- [ ] Rule 엔티티/조건 표현식 문법 확정(코드 0 유지)
- [ ] 회수 집행 위임 계약(`Keys.php:135`/`UserAdmin.php:342`) 확정
- [ ] fail-secure on_timeout 기본 동작(pending 유지) 확정
- [ ] 마케팅 RuleEngine/`Alerting.php:571` KEEP_SEPARATE 재검증(오흡수 여부)
- [ ] 에스컬레이션 로직 신규 설계(Reviews.php escalateNegatives 비참조 확인)
- [ ] NOT_CERTIFIED 상태에서 실제 코드 구현 착수 승인 획득

## 7. 반날조 인용 출처

- SPEC §5(정책→룰 파생) / ADR D-2(참조·흡수아님) · D-6(KEEP_SEPARATE) · D-1(Extend-Wrap)
- Ground-Truth ① §(회수 substrate 2종) · ② §(마케팅 RuleEngine·Alerting action_request·Reviews escalateNegatives·Catalog approveQueue KEEP_SEPARATE 근거, 289차 Part3-5 확정 승계)
- ABSENT 항목(Rule 엔티티·조건 표현식·파생 매핑·에스컬레이션)은 grep 0 실측 — 마케팅/알림 룰 구조를 "이미 구현된 권한검토 룰"로 과장하지 않음
