# DSAR — Identity Migration (06-A-03-02-03-03 · §18/§73)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세** · per-entity DSAR(ⓒ).
> ★ 인용은 [`DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

**Migration** (SPEC §73 실행절차 ⑱ + §72 Migration 테스트 + §84 최종명령 발췌, 원문):

- §73 ⑱ **Migration** — Legacy User/Email-only/Missing Subject/Duplicate Provider Subject/Ambiguous Mapping/Legacy Session/Missing Method·Session ID/Legacy Service·System User/Historical Backfill/Incomplete Evidence/Reconciliation.
- §84 최종명령: **"Legacy Historical Actor가 Email/문자열만이면 임의 Canonical Subject 확정 금지 — Mapping Confidence·Candidate·Manual Review 저장."** 중복 User/Session/Device/Identity Mapping 통합.
- §18 Resolution Result 연계: `MANUAL_REVIEW_REQUIRED`·`AMBIGUOUS` — 매핑 불확실 시 자동확정 대신 검토 대기.

의미: 기존 승인 이력의 actor가 email/문자열로만 남아 있을 때, 이를 근거 없이 특정 canonical subject로 단정하지 말고 **매핑 신뢰도(Confidence)·후보(Candidate)·수동검토(Manual Review)**를 함께 저장하며, 과거 증거를 backfill하되 불완전 증거는 그 상태로 표시한다.

## 2. 기존 구현 대조

- **Legacy actor가 정확히 email/문자열만인 상태로 실재 — §84 경고가 직접 겨냥하는 대상.**
  - 승인 이력 actor는 `mapping_change_request.approvals_json`(`Mapping.php:210`)에 **문자열로만** 적재된다. Canonical actor 정본 `Mapping::actorId`(`Mapping.php:36-53`)도 세션→`user:{email}` 형태의 **문자열 식별자**이지 canonical subject 엔티티가 아니다.
  - Person↔Account 분리 `ABSENT`(app_user 단일 테이블)·Employment/Position `ABSENT`(team_role만 `TeamPermissions.php:120-136`) → email 문자열을 사람/고용/직위와 연결할 원천이 없어 **임의 확정이 곧 오류**가 되는 구조.
- **매핑 신뢰도/후보/검토 저장 계층 부재**: Mapping Confidence·Candidate·Manual Review를 저장하는 구조 전무. `mapping_change_request`(`Db.php:623-634`)는 승인 정족수 처리용이지 identity 매핑 신뢰도 저장소가 아니다.
- **중복 User/Session/Identity Mapping 통합 대상**: 단일 app_user는 있으나, SSO(`EnterpriseAuth.php:206-434`)의 provider subject·Legacy email·api_key(`apikey:{id}`)가 canonical subject로 정합되지 않아 **다중 표현**이 병존. Historical Backfill·Incomplete Evidence 표시 계층 없음.
- Legacy Session/Missing Method·Session ID: 기존 세션은 opaque(`UserAuth.php:229-318`·JTI/refresh 부재)로 auth method/session id 메타가 빈약 → backfill 시 Missing Method로 분류될 이력 다수.

## 3. 판정

- Verdict: **ABSENT** (마이그레이션 계층 부재 · Legacy email-only actor는 실재하는 마이그레이션 원천).
- cover: **0.** Legacy Historical Actor를 canonical subject로 정합하는 Confidence/Candidate/Manual Review 저장·Historical Backfill·중복 Identity Mapping 통합 계층이 전무. 승인 이력 actor가 `Mapping.php:210` approvals_json에 email/문자열로만 남아 있어 **임의 canonical subject 확정 금지** 규정이 정면으로 적용된다.
- 선행 의존: §3.1 Canonical Identity Foundation(Subject Registry)·§14 Canonical Subject Binding ABSENT → 매핑 대상 canonical subject가 아직 없어 **BLOCKED_PREREQUISITE**. app_user는 단일 유지하고 SSO는 병행(중복 User 신설 금지).

## 4. 확장/구현 방향 (설계)

- 순신규 `approval_identity_mapping_candidate` — Legacy actor 문자열(email·`user:{email}`·`apikey:{id}`)마다 후보 canonical subject 목록·**Mapping Confidence 점수**·근거(SSO provider subject·app_user match·team_role)·상태(CONFIRMED/CANDIDATE/MANUAL_REVIEW/UNRESOLVED)를 저장. **Confidence 미달은 절대 자동확정하지 않고 Manual Review 큐로**(§18 `MANUAL_REVIEW_REQUIRED`).
- Golden Rule=Extend: canonical actor 규약은 `Mapping::actorId`(`Mapping.php:36-53`)를 계승하고, provider subject 원천은 기존 SSO/SCIM(`EnterpriseAuth.php:206-434`) 재사용. **app_user 단일 SoT 유지·SSO 병행**(중복 User/Session/Device Registry 신설 금지, §67/§84).
- Historical Backfill: 과거 승인 이력(`mapping_change_request.approvals_json` `Mapping.php:210`)의 actor 문자열을 candidate로 등재하되 **원장은 불변** — backfill은 매핑 테이블에만 기록하고 원 이력 문자열을 덮어쓰지 않는다. 불완전 증거는 Incomplete Evidence로 표시.
- 무회귀: 마이그레이션은 매핑 후보를 부가 기록할 뿐 기존 로그인/SSO/api_key/Mapping approve(정족수2 `Mapping.php:287`) 동작·과거 승인 이력을 변경하지 않는다. 임의 확정으로 인한 오귀속을 원천 차단(Confidence gate).

관련: [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_IDENTITY_RECONCILIATION]] · [[DSAR_APPROVAL_IDENTITY_FUNCTION_REGRESSION_GATE]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]]
