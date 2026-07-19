# DSAR — Identity Drift (06-A-03-02-03-03 · §50)

> EPIC 06-A-03-02-03-03 Actor Identity Assurance & Authentication Binding · 289차 13회차 · 능력 기반 판정 · **코드 변경 0 · 설계 명세**.
> GROUND_TRUTH 인용원: [DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION.md)(ⓑ allowlist). 전사 근거: [SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM](SPEC_06A_03_02_03_03_ACTOR_IDENTITY_ASSURANCE_VERBATIM.md) §50.

## 1. 원문 전사 (Canonical Contract)

**§50 Identity Drift** — Validation 시점과 Commit 시점 **사이**에 신원 전제가 바뀌는 사건 15종(원문 전사):
1. Account Disabled/Locked · 2. Subject Suspended · 3. Employment Terminated · 4. Tenant Membership Removed · 5. Legal Entity Membership Removed · 6. Organization Membership Removed · 7. Role Revoked · 8. Position Ended · 9. Actor Type Changed · 10. Binding Superseded · 11. Delegation Revoked · 12. Impersonation Expired · 13. Service Account Disabled · 14. System Actor Policy Changed · 15. (파생) Critical Drift.

★핵심 계약: **Validation↔Commit 사이 Critical Drift 시 Commit 차단**(§55 Commit-time Revalidation과 짝). 검증 결과의 무기한 재사용 금지 — 커밋 직전 신원 축 재검증. Conflict(§48, 정적 모순)와 구분: Drift는 **시간에 따른 전제 변화**.

## 2. 기존 구현 대조 (GROUND_TRUTH)

- **Identity Drift = ABSENT.** Drift는 **Validation 단계와 Commit 단계 분리**가 전제인데, 현행 승인 substrate는 검증-커밋이 단일 UPDATE로 융합되어 그 사이 시간창 자체가 없다: `Mapping::approve`(`Mapping.php:287-288` 정족수 2·커밋)·`Alerting::decideAction`(`Alerting.php:574`). 별도 Validation Result·§55 Commit Revalidation이 없어 재검증할 대상도 없다.
- **★is_active 게이트는 login 시점만·validation↔commit 사이 재검증 부재**:
  - 계정 상태 확인은 세션 검증 경로(`UserAuth.php:248,260` `is_active=1`)에서 **매 요청 세션 조회 시점**에만 이루어진다(`:229-318`). 이는 로그인/요청 진입 게이트이지, "승인 검증 후 커밋 직전에 그 사이 비활성화됐는가"를 묻는 drift 재검증이 아니다.
  - 계정 상태 세분 = **PARTIAL**(`:248,260` active/비활성만·locked/disabled 미세분) → `Account Disabled/Locked`(1)를 세분 탐지할 축 없음.
- **drift 감지의 원천 스냅샷 부재** — Employment/Position(**ABSENT**, team_role만 `TeamPermissions.php:120-136`)·Delegation/Authority/Assignment(**ABSENT**)·§42 Identity Snapshot(부재) → `Employment Terminated`(3)·`Role Revoked`(7)·`Position Ended`(8)·`Delegation Revoked`(11)를 대조할 검증시점 기준선이 없다.
- **Impersonation 만료 재료 실재** — member impersonation은 `imp_` 2h 만료 세션(`UserAdmin.php:472-534` `:493-497,499,525`)이나 **Original Principal 미보존** → `Impersonation Expired`(12)를 승인 결선에서 drift로 잡을 축 부재.
- **Binding Superseded(10)·Actor Type Changed(9)·Service/System Actor(13/14)** → Canonical Subject Binding·Actor Type Registry·Service/System Actor governance 전부 ABSENT이라 대상 미존재.

## 3. 판정 (Verdict)

- Verdict: **ABSENT.** 15종 drift 탐지 전무. Validation/Commit 2단계 분리·§42 Snapshot·Employment/Position/Delegation 축 부재로 **비교 기준선(검증시점 스냅샷)과 재검증 지점(커밋시점) 둘 다 없음** → 다중 BLOCKED.
- 선행 의존: §50은 §26 Validation Result·§55 Commit Revalidation·§42 Identity Snapshot·§15 Identity Profile·선행 §3.1 Canonical Identity에 종속 — 전부 미형성.
- cover: **0.** `is_active=1` 세션 게이트(`UserAuth.php:248,260`)는 login/요청 시점 방어(PARTIAL-substrate)일 뿐 commit-time drift 재검증 아님.

## 4. 확장/구현 방향 (설계)

- Identity Drift는 **파생 축** — §26 Validation Result에 §44 Actor Identity Digest를 남기고, §55 Commit-time Revalidation에서 Critical 축(Account Active·Subject·Employment·Membership·Role·Position·Delegation Active·Impersonation Active·Binding 최신)을 **재평가**하는 구조가 선행돼야 감지 가능. 선행(§26/§55/§42) 신설 전 착수 시 BLOCKED_PREREQUISITE.
- **★is_active 재검증 승격**: 현재 login 시점만인 `is_active` 게이트(`UserAuth.php:248,260`)를 **commit 직전 재조회**로 확장해 `Account Disabled`·`Subject Suspended`를 drift로 차단(§5.4). 검증 결과에 `expires_at`을 두어 무기한 재사용 금지.
- **Golden Rule=Extend**: 새 계정상태 저장소 발명 금지 — 실재 app_user `is_active`(`:248,260`)를 재검증 원천으로 재사용하되, locked/disabled/terminated 세분과 Employment/Position(선행 §3.1)을 신설해 drift 축 완성.
- **fail-closed·가짜녹색 금지**: Critical Drift(Account Disabled·Employment Terminated·Role Revoked·Delegation Revoked) 시 §63 Guard로 Commit 차단·§64 Error(`ACCOUNT_DISABLED`·`EMPLOYMENT_TERMINATED`·`IDENTITY_DRIFT_DETECTED`); 조용한 커밋 진행 금지. 실 구현 = 별도 승인 세션. 본 문서 코드 변경 0.

관련: [[DSAR_APPROVAL_ACTOR_IDENTITY_EVIDENCE]] · [[DSAR_APPROVAL_IDENTITY_CONFLICT]] · [[DSAR_APPROVAL_AUTHENTICATION_DRIFT]] · [[DSAR_APPROVAL_IDENTITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_ACTOR_IDENTITY_AUTHENTICATION_BINDING]].
