# DSAR — Authorization Reason (06-A-03-02-03-04 Part 1 · §26)

> EPIC 06-A-03-02-03-04 Part 1 Authorization Registry Foundation · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> ★인용은 GROUND_TRUTH([[DSAR_APPROVAL_AUTHORIZATION_EXISTING_IMPLEMENTATION]]) allowlist 등재분만.

## 1. 원문 전사 (Canonical Contract · §26)

`APPROVAL_AUTHORIZATION_REASON` 필드 (원문 전사):
- `category` · `reason code` · `policy(+version)` · `condition` · `detail code`
- `localized message key` · `sensitive detail reference` · `severity` · `sequence`

category enum (22종): `POLICY_MATCH` / `DENY` / `DEFAULT_DENY` / `SUBJECT` / `RESOURCE` / `ACTION` / `ENVIRONMENT` / `TENANT` / `LEGAL_ENTITY` / `ORGANIZATION` / `IDENTITY` / `AUTHENTICATION` / `ASSIGNMENT` / `AUTHORITY` / `DELEGATION` / `SEQUENCE` / `RISK` / `EXCEPTION` / `OVERRIDE` / `SYSTEM` / `ERROR` / `CUSTOM`.

원문 규율(전사): **민감 내부 Rule을 사용자 메시지로 노출 금지**(`sensitive detail reference`로 분리·`localized message key`만 사용자 대면). ★Deny만이 아니라 **Allow도 Reason 기록**(§5.9 — 어떤 Policy/Context로 허용됐는지).

의미: Reason은 Decision(§24)의 판정 근거를 category·code·policy version·condition으로 구조화한 설명체다. Allow/Deny 모두에 대해 근거를 남겨(§5.9) 재현·감사·이의제기를 가능케 하고, 사용자 대면 메시지(`localized message key`)와 내부 민감 규칙(`sensitive detail reference`)을 분리해 정보노출을 통제한다.

## 2. 기존 구현 대조

- **★현재 deny reason = HTTP detail 문자열, allow reason = 미기록(§5.9 위반)(ABSENT)**. Deny 시 미들웨어/핸들러가 HTTP 403 detail 메시지를 반환하는 방식이다: 중앙 RBAC write 게이트(`index.php:568-578`)·admin:keys(`index.php:564-567`) 미달 시 문자열 detail. Maker-Checker 거부(Mapping approve 자기승인차단·정족수 미달·fail-closed actor·GROUND_TRUTH §0-3)·Alerting decideAction 정족수2 미달도 403 메시지. 이들은 category/reason code/policy version으로 구조화되지 않은 자유 문자열이다.
- **★Allow reason 완전 부재**: 통과 시 미들웨어는 attribute attach(`index.php:590-593`) 후 그냥 진행할 뿐 "어떤 policy/scope/rank로 허용됐다"는 근거를 남기지 않는다. rank 통과(`index.php:554`)·roleOf 서열(`TeamPermissions.php:120-136`)·acl_permission 매칭(`TeamPermissions.php:39,152-159,325-336`)·data_scope 통과(`TeamPermissions.php:236-322`) 모두 boolean 결과만 소비하고 근거를 기록하지 않는다 — §5.9 명백 위반.
- **22종 category 미구분**: SUBJECT/RESOURCE/ACTION/TENANT/AUTHORITY/DELEGATION/SEQUENCE/RISK 등 판정 근거의 유형 분류가 없다. 현행은 어떤 검사에서 막혔는지가 detail 문자열의 자연어로만 암시된다.
- **`policy(+version)`·`condition` 근거 결합 부재**: 인가규칙이 코드 상수(roleRank `index.php:554`·plan==='admin' 분포 `UserAuth.php:72,104,3668,3712,3738,4208`)라 reason이 참조할 versioned policy가 없다.
- **민감정보 분리(sensitive detail reference) 부재**: 현재 403 detail이 내부 규칙/사유를 그대로 사용자에게 노출할 수 있어 원문 "민감 Rule 노출 금지"와 상충. 유사 통제로 agency 위임 재검증(`index.php:74-104`)이 있으나 reason 분리 모델은 아님.

## 3. 판정

- Verdict: **ABSENT** (구조화 Reason·22종 category·Allow reason·민감정보 분리 순신규).
- cover: **0** — deny reason은 비구조 HTTP 문자열, allow reason은 전무. §5.9 "Allow도 Evidence" 미충족.
- ★핵심 위험: (a) Allow reason 부재로 허용 판정의 감사·재현 불가, (b) deny 문자열이 내부 규칙 노출 가능(민감정보 미분리). 둘 다 순신규 설계 대상.
- 선행 의존: Policy Version(§10)·Evaluation(§22)·Decision(§24) ABSENT로 reason이 참조할 versioned policy·condition·decision 결합 부재(BLOCKED_PREREQUISITE).

## 4. 확장/구현 방향 (설계)

- 순신규 `authorization_reason` — category(22종)·reason code·policy(+version)·condition·detail code·localized message key·sensitive detail reference·severity·sequence. Decision(§24)의 `primary reason`+`reason references`로 결합하고 Evidence(§35)에 포함.
- **★Allow도 Reason 필수(§5.9)**: 통과 판정도 "어떤 policy·scope·rank로 허용됐다"를 category=POLICY_MATCH/SUBJECT/AUTHORITY 등으로 기록. 현행 boolean 소비(rank `index.php:554`·roleOf `TeamPermissions.php:120-136`·acl `TeamPermissions.php:39,152-159,325-336`·scope `TeamPermissions.php:236-322`)를 reason 산출로 정형화.
- **민감정보 분리**: 사용자 대면은 `localized message key`(i18n 15국)만, 내부 규칙/조건은 `sensitive detail reference`로 분리 저장 → §56 Error Contract의 operator/security detail과 정합. deny HTTP 문자열(`index.php:564-578`)을 message key+sensitive reference 2계층으로 재구성.
- Golden Rule=Extend: DENY_SCOPE(`TeamPermissions.php:234`)→category=DEFAULT_DENY reason, Maker-Checker 거부사유(자기승인차단·정족수 미달)→category=AUTHORITY/SEQUENCE reason으로 흡수. `SecurityAudit`(`SecurityAudit.php:48-68`) 감사기록과 reason을 결합해 감사 가능성 확보.

관련: [[DSAR_APPROVAL_AUTHORIZATION_DECISION]] · [[DSAR_APPROVAL_AUTHORIZATION_DECISION_RESULT]] · [[DSAR_APPROVAL_AUTHORIZATION_OBLIGATION]] · [[ADR_DSAR_AUTHORIZATION_REGISTRY_FOUNDATION]].
