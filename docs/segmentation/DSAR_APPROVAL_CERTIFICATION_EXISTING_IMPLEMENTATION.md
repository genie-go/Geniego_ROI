# DSAR — Role Certification & Access Review 거버넌스: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_8_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE_SPEC.md`.
> 상위 ADR: `docs/architecture/ADR_DSAR_ROLE_CERTIFICATION_ACCESS_REVIEW_GOVERNANCE.md`.
> 본 문서는 EPIC 06-A-03-02-03-04 Part 3-8(Certification & Access Review) 설계의 반날조(anti-fabrication) 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR에 등장하는 `파일:라인`만 인용할 수 있다.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`(Handlers·SecurityAudit·Db) + `backend/public/index.php` + `frontend/src/` + `backend/bin/`(크론). 읽기 전용·코드 무변경.
- 중복 미러(`_be_*/`, `clean_src/`, `backup/`, `legacy_v338_pkg/`)는 스코프 외 배제.
- 방법: `certif|recertif|attest|access review|review campaign|review queue|review decision|reviewer|dormant|stale|revoke|escalation|SLA|reminder` 다중 grep + 핵심 파일 정독(Explore 스레드 ①·24 tool-use). 모든 라인 실측.

## 1. 핵심 판정 요약

**Role Certification & Access Review 거버넌스 엔진은 부재(ABSENT·그린필드)다.** 주기적 재인증(recertification), reviewer가 approve/reject/revoke하는 review queue, campaign 스케줄링, attestation 전자서명, dormant 계정 자동탐지→자동 회수 — 어느 것도 실존하지 않는다.

- **오탐 격리**: `certif`/`attest`/`reviewer`/`campaign` grep 매칭은 전부 **타 도메인**(네이버 상품 certification 필드·SAML X.509 CERTIFICATE·PM 태스크 'reviewer' 역할·마케팅 캠페인)이다. access-review 개념의 실 코드 0건.
- **재활용 substrate는 실재**: 인증검토 엔진이 **참조·통합할 수 있는** 실 필드/인프라 — api_key(is_active·expires_at·last_used_at·use_count·role·scopes)·team/app_user 상태·세션 만료·해시체인 감사(SecurityAudit) — 는 실존한다. 단 이들은 "배정 상태 substrate"이지 "인증검토 워크플로우"가 아니다.
- **역할 배정 거버넌스는 오히려 축소**: `UserAdmin.php:598` 주석 — 과거 역할관리 세트(`assignRole/revokeRole/getUserRoles`)가 **제거되었고 재신설 금지**. certification이 붙일 role-assignment 표면 자체가 얇다.

## 2. 실존 substrate 카탈로그

### A. 감사·증거 인프라 (Evidence/Snapshot substrate — PRESENT)

| 파일:라인 | 심볼 | 설명 | Certification 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/SecurityAudit.php:12` | `SecurityAudit` | 해시체인(prev_hash→hash_chain) append-only 보안감사. `log/verify/recent`. UPDATE/DELETE 경로 없음 | Decision Evidence / Immutable Audit (**유일 실 tamper-evident**) | PRESENT |
| `backend/src/SecurityAudit.php:56` | `verify()` | 해시체인 재계산으로 변조지점(`broken_at`) 탐지 | Evidence Integrity 검증 | PRESENT |
| `backend/src/SecurityAudit.php:153` | (말미) | log/recent surface 종단 | — | PRESENT |
| `backend/src/Handlers/AdminMenu.php:123` | `menu_audit_log` write | 메뉴권한 변경 감사, `hash_chain` 컬럼 보유 | Decision Evidence(부분) | PRESENT |
| `backend/src/Handlers/AdminMenu.php:200` | `menu_defaults` snapshot | 메뉴 기본권한 스냅샷 저장 | Snapshot substrate(부분) | PRESENT |
| `backend/src/Handlers/UserAuth.php:4165` | `auth_audit_log` | 인증/권한 액션 로그(actor/role/action/ip/ua/risk). 해시체인 아님(평문) | 인증 감사(비-tamper-evident) | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:686` | `member_permissions_set` | 팀 멤버 권한위임을 auth_audit_log에 `risk='high'` 기록 | 권한변경 증거 | PRESENT |
| `backend/src/Handlers/TeamPermissions.php:722` | (위임 기록 종단) | 위임 이벤트 감사 라인 | 권한변경 증거 | PRESENT |
| `backend/src/Handlers/Compliance.php:133` | audit 통합 조회 | `audit_log`+`auth_audit_log` UNION 정규화 읽기 | 감사 뷰 집계 | PRESENT |

> **정직 경계**: 감사 인프라는 견고하나 **"certification 결정(누가·언제 이 배정을 approve/revoke)"을 저장하는 전용 스키마는 없다.** SecurityAudit만 해시체인 유일 실감사 — menu_audit_log도 `hash_chain` 컬럼은 있으나 verify는 AdminMenu 내부 lastHash 참조뿐(통합 verify는 SecurityAudit::verify가 정본. Ground-Truth ② 및 `reference_menu_audit_log_not_tamper_evident` 참조).

### B. 자동 회수·비활성 (Remediation/Deprovision substrate — PARTIAL, 전부 수동/결제만)

| 파일:라인 | 심볼 | 설명 | 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/Keys.php:135` | `revoke()` `DELETE /keys/{id}` | api_key `is_active=0` 수동 설정 | Auto Revocation(수동) | PARTIAL |
| `backend/src/Handlers/Keys.php:155` | `rotate()` | 기존 키 revoke + 신규 발급 | 자격증명 교체 | PARTIAL |
| `backend/src/Handlers/UserAdmin.php:338` | 계정 활성/비활성 | `UPDATE app_user SET is_active=?` | Account Disable(수동) | PARTIAL |
| `backend/src/Handlers/UserAdmin.php:342` | 비활성 시 세션 revoke | 계정 비활성 시 해당 사용자 전 세션 삭제 | Assignment Suspension(수동) | PARTIAL |
| `backend/src/Handlers/UserAuth.php:141` | 플랜 만료 처리 | `subscription_expires_at < now` → plan free로 자동 다운그레이드 | 만료 기반 자동 강등 | PARTIAL |
| `backend/src/Handlers/TeamPermissions.php:517` | 팀 status 전환 | `status ∈ {active,disabled,archived}` 수동 | 배정 비활성(수동) | PARTIAL |
| `backend/src/Handlers/UserAdmin.php:598` | (주석) | `assignRole/revokeRole/getUserRoles` **제거·재신설 금지** 명시 | 역할 배정 표면 축소 | 이력 |

> **정직 경계**: 회수 트리거는 전부 **관리자 수동 액션** 또는 **결제 만료**다. "미인증/검토거부 → 자동 회수(Auto Revocation §16)"는 부재.

### C. 만료·휴면·사용흔적 (Dormant/Stale/Expiring substrate — PARTIAL)

| 파일:라인 | 심볼 | 설명 | 매핑 | 상태 |
|---|---|---|---|---|
| `backend/public/index.php:518` | 만료 강제 | api_key `expires_at < time()` → 401 거부 | Expiring Assignment 차단 | PRESENT |
| `backend/public/index.php:522` | last_used 갱신 | 키 사용 시 `last_used_at`·`use_count` 증가 | 사용흔적(Unused 판정 소재) | PARTIAL |
| `backend/public/index.php:506` | is_active 강제 | 런타임 `is_active=1` 필수 | 배정 활성 강제 | PRESENT |
| `backend/src/Handlers/UserAdmin.php:117` | `last_login` | 최근 세션 `MAX(created_at)` 표시용 조회 | 마지막 로그인 노출 | PARTIAL |
| `backend/src/Handlers/UserAuth.php:206` | `last_seen_at` 유휴 | 세션 유휴 임계 초과 시 세션 삭제(서버측 자동로그아웃) | 유휴 탐지(세션 한정) | PARTIAL |
| `backend/src/Handlers/AgencyPortal.php:60` | `last_login` | 에이전시 계정 로그인 시각 기록 | 마지막 로그인 substrate | PARTIAL |
| `backend/src/Handlers/PartnerPortal.php:57` | `last_login` | 파트너 계정 로그인 시각 기록 | 마지막 로그인 substrate | PARTIAL |

> **정직 경계**: 필드는 있으나 "N일 미로그인 계정을 골라 검토/회수 대상으로 선정"하는 쿼리·크론은 부재. `dormant/stale/inactive` 스캔 코드 0. 실제 만료 차단은 `index.php:518`(api_key expires)뿐.

### D. 위임 (Reviewer Delegation 근접 — PARTIAL, 권한위임이지 검토위임 아님)

| 파일:라인 | 심볼 | 설명 | 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:641` | `putMemberPermissions()` | owner/manager가 멤버에 메뉴권한 위임. manager는 assignable 상한 초과 불가(403) | 권한 위임(≠검토 위임) | PARTIAL |
| `backend/src/Handlers/TeamPermissions.php:393` | `effectiveForUser()` | 역할별(owner/manager/member) 유효권한 산출 + fail-closed(미해결→member) | 최소권한 상한 | PARTIAL |
| `backend/src/Handlers/TeamPermissions.php:379` | (assignable 계열) | 위임 상한 교집합 계산 substrate | 위임 상한 | PARTIAL |

> **정직 경계**: 여기 "delegation"은 **권한 부여 위임**이지 access-review의 **검토자 위임(reviewer delegate §7)**이 아니다. Escalation/SLA/Reminder는 접근검토 맥락에서 부재.

### E. 배정 상태·만료 필드 스키마 (Certification Scope가 붙을 substrate — PRESENT)

| 파일:라인 | 스키마/필드 | 내용 |
|---|---|---|
| `backend/src/Db.php:951` | `api_key(is_active, expires_at, last_used_at, use_count, role, scopes_json)` | 키 배정 상태/만료/최종사용 — 인증검토 핵심 substrate |
| `backend/src/Handlers/Keys.php:119` | api_key 컬럼 정의부 | 스키마 ensure |
| `backend/public/index.php:506` | api_key 런타임 강제 | is_active + expires + last_used 갱신 |
| `backend/src/Handlers/TeamPermissions.php:148` | `team(status, manager_user_id)` | 팀(배정 그룹) 상태·관리자 |
| `backend/src/Handlers/UserAuth.php:54` | `app_user(is_active, team_role, plan, subscription_expires_at, team_id, parent_user_id)` | 사용자 배정·구독 만료·역할 |
| `backend/src/Handlers/UserAuth.php:4263` | `user_session(expires_at, last_seen, ip, ua)` | 세션 만료·최종접속 |
| `backend/src/routes.php:2800` | `license_key(expires_at, is_active, used_by, used_at)` | 라이선스 키 만료/사용 |

## 3. 오탐 격리 (재플래그 금지 — access-review와 무관)

| 파일:라인 | 매칭어 | 실제 도메인 |
|---|---|---|
| `backend/src/Handlers/PM/Assignees.php:14` | `'reviewer'` | 프로젝트 태스크 담당자 역할값(PM) |
| `backend/src/Handlers/ChannelSync.php:2651` | `reviewer` | 네이버 스토어 **상품 리뷰** 작성자 |
| `backend/src/Handlers/ChannelSync.php:3099` | `certificationTargetExcludeContent` | 네이버 상품 **인증대상** 필드 |
| `backend/src/Handlers/ChannelSync.php:3322` | `certification` | 네이버 상품 인증 필드 |
| `backend/src/Handlers/EnterpriseAuth.php:597` | `CERTIFICATE` | SAML IdP X.509 인증서 파싱(SSO) |
| `backend/bin/review_collect_cron.php` | `review` | **상품 리뷰 수집** 크론(접근검토 아님) |
| `frontend/src/pages` PricingPublic | "PCI DSS certified" | 마케팅 문구 |

## 4. 명명관습·위치 교차확인

- BE `certif|recertif|attest|access review|review campaign|review queue|review decision` → 실 substrate **0건**(전부 §3 오탐).
- FE `frontend/src`: certification/access-review **페이지 없음**. `Approvals.jsx`·`Audit.jsx`·`TeamMembers.jsx`·`ApiKeys.jsx`는 존재하나 재인증 캠페인 UI 아님.
- `backend/bin/` 크론 34종: access-certification/dormant-sweep/deprovision 잡 **없음**(`review_collect_cron`=상품리뷰, `oauth_refresh_cron`=토큰갱신).
- 자동화 트리거: 결제 만료(UserAuth:141)·세션 유휴(UserAuth:206)·api_key expires(index.php:518)뿐 — 접근권한 재인증 주기와 무관.

## 5. 종합 판정

**Certification/Access-Review 거버넌스 = ABSENT-engine / PARTIAL-substrate.** campaign·review-queue·decision·attestation·auto-revocation·SLA·escalation·drift·reconciliation·simulation은 **순신규 그린필드**. 재활용 substrate는 (A) SecurityAudit 해시체인(Evidence 유일 실감사)·(B) 수동 revoke/deactivate(Remediation 근접)·(C) expires/last_used/last_seen(Dormant 판정 소재)·(D) team 권한위임(Reviewer 위임과 구별)·(E) api_key/app_user/session/license 상태 필드. 실 엔진은 이 substrate를 **대체가 아닌 참조·통합(Extend)** 한다.
