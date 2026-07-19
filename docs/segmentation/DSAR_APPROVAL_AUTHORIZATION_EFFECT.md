# DSAR — Authorization Effect (06-A-03-02-03-04 Part 1 · §23)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용은 GROUND_TRUTH([[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]]) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract · §23)

`APPROVAL_AUTHORIZATION_EFFECT` enum (8종·원문 전사):
`PERMIT` / `DENY` / `NOT_APPLICABLE` / `INDETERMINATE` / `CHALLENGE` / `CONDITIONAL_PERMIT` / `MANUAL_REVIEW` / `ERROR`.

원문 규율(전사): **최종 Commit = `PERMIT` 또는 충족된 `CONDITIONAL_PERMIT`만 허용. `NOT_APPLICABLE`/`INDETERMINATE`/`CHALLENGE`/`MANUAL_REVIEW`/`ERROR`를 Permit으로 변환 금지.**

의미: Effect는 Evaluation(§22) combining result가 산출한 판정 결과값이다. Permit/Deny 이진을 넘어 "적용 안 됨(NOT_APPLICABLE)·판정 불가(INDETERMINATE)·추가확인 필요(CHALLENGE)·조건부 허용(CONDITIONAL_PERMIT)·수동검토(MANUAL_REVIEW)·엔진오류(ERROR)"를 **서로 다른 최종 상태로 구분**해, 비-Permit 상태가 실수/기본값/장애로 Permit이 되는 것을 원천 차단(§5.2 Default Deny·§5.13 Fail Open 금지)한다.

## 2. 기존 구현 대조

- **★현재 Effect는 이진(Permit/Deny)이며 그마저도 결과체가 아니라 절차 반환이다(ABSENT)**. 중앙 RBAC 미들웨어(`index.php:553-603`)는 조건 불충족 시 즉시 401/403을 반환한다: 키조회 예외→401(`index.php:490-493`)·write 권한 미달→403(`index.php:568-578`)·admin:keys 미달→403(`index.php:564-567`). 통과 시엔 attribute attach 후 다음 미들웨어로 진행(`index.php:590-593`)할 뿐 "PERMIT"이라는 명시적 Effect 값을 만들지 않는다.
- **NOT_APPLICABLE/INDETERMINATE/CHALLENGE/CONDITIONAL_PERMIT/MANUAL_REVIEW/ERROR 구분 전무**: 현행 판정은 rank 비교 통과 여부(`index.php:554`)·roleOf 서열(`TeamPermissions.php:120-136`)의 boolean 결과다. "적용되는 정책이 없음(NOT_APPLICABLE)"과 "판정 불가(INDETERMINATE)"와 "엔진 오류(ERROR)"가 모두 동일한 fail-closed 분기(403) 또는 fail-open 통과로 뭉개진다.
- **★Fail-open으로 비-Permit이 Permit이 되는 실위험 실재**:
  - `requireFeaturePlan` 3중 fail-open(`UserAuth.php:64-84`·특히 `:68,72,82-84`) — plan null→allow·catch→allow·admin bypass. 이는 원문이 금지하는 "ERROR/INDETERMINATE를 Permit으로 변환"의 실사례(과금·정책 게이트 도입 시 fail-closed 전환 필요).
  - 레이트리밋 catch→통과(`index.php:550`)는 LEGACY 저위험(인증 통과 후라 무권한 노출 아님)이나 동일 패턴.
  - `subjectScope` catch→null(`TeamPermissions.php:211,224`)은 조건부 fail-open이며 상위 effectiveScope의 DENY_SCOPE(`TeamPermissions.php:251,234`)로만 부분 보완된다.
- **CONDITIONAL_PERMIT substrate 미약**: Obligation/Constraint 결합이 없어(§27·§29 부재) "조건부 허용 후 충족 시에만 Commit"이라는 상태가 없다. 유사물로 data_scope 행필터(`TeamPermissions.php:236-322`)가 결과를 제한하나 이는 Effect 상태가 아니라 쿼리 필터다.

## 3. 판정

- Verdict: **ABSENT** (8종 Effect 열거·비-Permit 상태 구분 순신규). 현행=이진 절차 반환.
- cover: **0** — Effect 값 자체를 데이터로 산출·저장하지 않음. Permit/Deny도 즉시 HTTP status로 소모.
- ★핵심 위험: `requireFeaturePlan` fail-open(`UserAuth.php:64-84`) 등 여러 지점에서 ERROR/미결 상황이 사실상 Permit으로 귀결 — 원문 §23 "비-Permit을 Permit 변환 금지"의 명시적 위반 substrate. Part 1은 방향만 설계, 실 fail-closed 전환은 후속 enforcement Part.
- 선행 의존: Evaluation(§22 ABSENT)·Obligation(§27 ABSENT·CONDITIONAL_PERMIT 충족판정 종속)으로 상위 공회전(BLOCKED_PREREQUISITE).

## 4. 확장/구현 방향 (설계)

- 순신규 Effect 8종 enum을 Evaluation combining result(§22)의 산출 타입으로 정의. 각 Effect의 Commit 가능성을 §39 Commit Binding에서 강제: **PERMIT·충족 CONDITIONAL_PERMIT만 Commit 통과**, 나머지 5종은 Commit 차단.
- **Fail-closed 전환(무후퇴 예외=개선)**: `requireFeaturePlan`(`UserAuth.php:64-84`)의 null→allow·catch→allow·admin bypass를 정책엔진 도입 시 ERROR/INDETERMINATE Effect로 매핑해 Deny로 귀결(§45 Fail-Closed). `subjectScope` catch→null(`TeamPermissions.php:211,224`)도 INDETERMINATE→DENY로 승격. 단 Approval/Payment/Settlement/Contract/Legal/Compliance/Security/Administrative는 Fail-open 절대 금지(§45).
- Golden Rule=Extend: 현행 fail-closed idiom(DENY_SCOPE `TeamPermissions.php:234`·roleOf 미해결→member `TeamPermissions.php:120-131`·키조회 예외→401 `index.php:490-493`)을 Effect 산출의 Default Deny(§5.2) 표준 패턴으로 일반화.
- CONDITIONAL_PERMIT은 Obligation(§27)·Constraint(§29) 결합 후에만 의미를 가지므로 후속 Part에서 완성. Part 1은 8종 enum과 "비-Permit→Commit 차단" 계약만 확정.

관련: [[DSAR_APPROVAL_AUTHORIZATION_EVALUATION]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION_RESULT]] · [[DSAR_APPROVAL_AUTHORIZATION_OBLIGATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
