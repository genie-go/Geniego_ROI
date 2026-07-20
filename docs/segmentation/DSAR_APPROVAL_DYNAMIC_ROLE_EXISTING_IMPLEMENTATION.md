# DSAR — Dynamic Role / Rule Engine / ABAC 기존 구현 전수조사 (EPIC 06-A-03-02-03-04 Part 3-5 · ⓑ GROUND_TRUTH)

- **상태**: 전수조사 정본 (코드 변경 0) · 289차 후속 (2026-07-20)
- **방법**: 능력 기반 전수조사 — grep/read 코드 정독(백엔드 PHP 전역+FE) · 2 Explore 스레드 + 핵심 인용 firsthand 재검증. 모든 발견 `파일:라인`. **반날조: 없는 것을 있다고, 있는 것을 없다고 하지 않음. ★마케팅 automation을 RBAC Rule Engine으로 오인 금지(KEEP_SEPARATE). 실재 과신·부재 과장 양방향 회피.**
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **선행(재사용)**: Part 3-4 [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md)(ABAC=data_scope) · Part 3-1 Role Registry ground-truth

---

## 0. 총평

**Dynamic Role 도메인 대부분 순신규(ABSENT).** Dynamic/Runtime/Session/Conditional Role·RBAC Rule Engine·PDP/PEP·계산형 Runtime Risk는 grep 0. 근접 substrate는 ① **ABAC=data_scope 9차원 행필터(PARTIAL·유일)** ② **Require MFA 로그인 게이트(실재·단 role 활성 입력 아님)** ③ MFA/session/risk/env 속성필드(존재하나 개별목적·role 결정 미연결). ★**RuleEngine.php 등 마케팅 automation은 KEEP_SEPARATE**(RBAC Rule Engine 아님). team_role/api_key/admin_level은 전부 **정적(fixed) role**.

---

## 1. Dynamic/Runtime/Session/Conditional Role — ABSENT (grep 0)

- `dynamic/runtime/session/conditional/context role` grep=0(backend/FE). 매치는 전부 data_scope ABAC 필터(§3)·마케팅.
- 정적 role 실증: `team_role`(로그인 시 세션 스냅샷·원본 DB persisted·`UserAuth.php:1019`·변경=팀배정 관리작업 `TeamPermissions.php:774`)·`admin_level`(`UserAuth.php:191,1022`·컨텍스트 재평가 없음)·`api_key.role`(생성 시 고정 `Db.php:942-955`·요청마다 재계산 없음·`index.php:573-576` rank 순위화만)·FE `teamRolePolicy.js:8,21-27`(고정 3단계). **context(로그인/시간/위험)에 따라 자동 생성·활성/비활성되는 role 개념 전무.**

## 2. RBAC용 Rule Engine — ABSENT · ★마케팅 automation은 KEEP_SEPARATE

- `RuleEngine.php`(`:12,24`)=**범용 IF-THEN 마케팅/재고 자동화**·조건=channel_roas/sku_stock/conversions(`:32`)·액션=alert/webhook/pause_channel/reorder(`:34`)·평가 `evaluateTenant`(`:194-220`)에 role/permission 문자열 전무. **RBAC용 아님**.
- `Alerting.php:12`·`AutoCampaign.php`(RuleEngine 디컨플릭트 `:14-15,222-226`)·`Decisioning.php:12`·FE `PolicyTreeEditor.jsx:1-24`(roas metric 조건트리·미배선)=전부 마케팅/운영 도메인 **KEEP_SEPARATE**. "IF department=X AND MFA=TRUE THEN role" 형태 RBAC Rule Engine=grep 0 완전 부재.

## 3. ABAC — data_scope가 유일 실재 substrate (PARTIAL)

- ABAC 리터럴 실사용: `Wms.php:600,1290`·`AdPerformance.php:12-13,22,25,134`·`OrderHub.php:260`·`Catalog.php:1000`·`routes.php:1582`·`TeamPermissions.php:10,227`.
- 핵심=`effectiveScope`(`TeamPermissions.php:236-265`·DATA_SCOPES 9차원 `:41`·fail-closed DENY_SCOPE `:234,251,263`)·`scopeSql`/`scopeSqlNamed`/`scopeChannelProduct`(`:286-322`)로 행필터 강제. 소비=Wms/AdPerformance/OrderHub/Catalog(Part 3-4 §1 정합·4차원만 실강제).
- ★**attribute=scope_type/scope_values로 행단위 접근 결정=ABAC 최근접이나 단일목적(데이터 행필터) 축소판**. Position/Department/Device/Network/Time을 결정 입력으로 쓰는 범용 ABAC 정책 엔진=부재.

## 4. Attribute Source — 컬럼 실재하나 role 활성 입력 아님

| 속성 | 실재 | role 활성 입력? |
|---|---|---|
| MFA 여부 | `mfa_enabled/mfa_secret/mfa_method`(`UserAuth.php:3525`·`:946,960`) | ✗ 로그인 챌린지 게이트만(§8) |
| session age | `user_session.created_at/last_seen`(`Db.php:1111-1119`·`UserAuth.php:4237`) | ✗ /auth/sessions 표시만(`:4254-4281`) |
| login time | `auth_audit_log.at`(`:4165`) | ✗ 감사 타임스탬프 |
| risk score | `auth_audit_log.risk VARCHAR(16)`(`:4165`) | ✗ **정적 심각도 라벨**(호출부 하드코딩 low/medium/high·`:4174,4203`·실사용 `:970,983`)·계산값 아님 |
| environment | `Db::envLabel()`(`Db.php:56-61`) | ✗ 배포라벨·OTP 개발모드 게이트만(`:966`) |
| employment/position/department | **부재(grep 0)** | N/A |
| device/network | 부재(컬럼 없음·`user_session.ip/ua`만 표시용) | ✗ |

★MFA·session·risk·env는 실재하나 전부 로깅·표시·챌린지 게이트 등 개별목적·"role 활성 입력"으로 조합되는 지점 없음. Employment/Position/Department=아예 부재.

## 5. Runtime Context — 기록/표시용·role 결정 미사용

- `user_session`(`Db.php:1111-1117`+ALTER ip/ua/last_seen `UserAuth.php:4237`)·`recordSessionMeta`(`:4243-4251`·best-effort)·`listSessions`(`:4254-4281`·표시)·`authedUser`/`authedTenant`(정적 team_role/plan 반환·context로부터 role 계산 안 함). Runtime Context가 role 결정 로직 입력으로 연결된 지점 없음.

## 6. PDP/PEP/Policy Decision — ABSENT (용어 grep 0) · 근접 이진 게이트

- `policy.?decision/PDP/PEP/permit.*deny/challenge` RBAC 맥락 grep 0. 근접=`index.php:572-598` api_key RBAC 게이트(roleRank `:573`·method별 rank/scope 비교·403/통과 **이진**)·`guardTeamWrite` 전역 쓰기가드(`:82-89` 이진). ★Permit/Deny/Challenge/Escalate/Manual Review 4~5상태 결정 모델·PDP/PEP 개념 완전 부재.

## 7. Runtime Risk (계산형) — ABSENT

- `auth_audit_log.risk`=정적 심각도 라벨(호출부 하드코딩·`audit()` `UserAuth.php:4174-4197`)·유일 소비=`if($risk==='high')` SIEM 포워딩(`:4192-4194` Compliance::forwardEvent). `SupplyChain.php:398` sc_lines.risk=공급망 도메인(RBAC 무관). fraud/anomaly=grep 0. ★session/device/network/geo/auth/user risk 계산 엔진 부재.

## 8. Require MFA / Re-authentication (로그인 시점) — ★실재 (가장 강한 확증)

- MFA 정책 3단계 `MFA_STRICTNESS=['off'=>0,'admin'=>1,'all'=>2]`(`UserAuth.php:3720`)·`mfaPolicy`(테넌트가 전역보다 완화 불가·`:3738-3759`). 로그인 강제 판정(`:945-946`)·TOTP 검증(`:955-964`)·OTP 챌린지(`:965-978`·미제출 401 mfa_required)·락아웃 예외(`:968-970`)·break-glass 우회+`auth.breakglass` 불변감사(`:995-999` SecurityAudit)·Enroll 강제(`:1029-1036`). ★단 **로그인 게이트**·임의 민감동작 단위 범용 step-up re-auth 엔진 부재(MFA disable current_password 재확인 `:3929`=좁은 사례).

## 9. Conditional Component Rule Reference (Part 3-2/3-3 선행 연동) — ABSENT (코드) · 설계 enum명만

- `CONDITIONAL_REFERENCE`=Part 3-2 Canonical Entity **enum 열거값**으로만 설계문서 존재(`EPIC_06A_PART3_2_..._SPEC.md:331,661,705`). 이를 평가하는 실제 Rule Reference Interface(코드/스키마)=전무. ★**이번 Part 3-5가 채울 정확한 빈자리**. (Part 3-3에는 CONDITIONAL 컴포넌트 참조 없음·Part 3-2에만 enum.)

## 10. Substrate ↔ Governance 경계 요약 (판정)

| 개념 | 상태 | 근거 |
|---|---|---|
| Dynamic/Runtime/Session/Conditional Role | **ABSENT** | grep 0 |
| RBAC Rule Engine (IF-THEN role) | **ABSENT** | `RuleEngine.php`=마케팅 KEEP_SEPARATE |
| ABAC | **PARTIAL**(data_scope 행필터) | `TeamPermissions.php:236-322` |
| Attribute(MFA/session/risk/env) | **존재하나 role 입력 아님** | `UserAuth.php`(개별목적) |
| Runtime Context(session/ip/ua) | **기록·표시용** | `UserAuth.php:4243-4281` |
| PDP/PEP/Policy Decision | **ABSENT**(이진 게이트만) | `index.php:572-598` |
| Runtime Risk(계산형) | **ABSENT**(정적 라벨) | `UserAuth.php:4174-4197` |
| Require MFA/Re-auth(로그인) | **PRESENT** | `UserAuth.php:929-1036,3719-3760` |
| CONDITIONAL Rule Reference | **ABSENT**(enum명만) | `EPIC_06A_PART3_2_..._SPEC.md:331` |
| 마케팅 Rule/Automation | **KEEP_SEPARATE** | `RuleEngine.php`·`Alerting.php`·`AutoCampaign.php`·`Decisioning.php`·`PolicyTreeEditor.jsx` |

★실 엔진="Dynamic Role Registry/Rule Engine/Runtime Evaluation/Session Role/PDP·PEP 제로 신설 + ABAC(data_scope)·MFA 게이트·attribute 필드를 결정 입력으로 조립". 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped·Decision Core 실구현 후 RP-002. 이번 차수 코드 0.
