# DSAR — JIT Access Governance: 거버넌스 부재 + 중복/근접물 감사 (Ground-Truth ②)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`. Ground-Truth ①: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`.
> (A) 거버넌스 계층 ABSENT/PARTIAL 실측 + (B) KEEP_SEPARATE 근접물.

---

## 1. 핵심 판정 — **거버넌스 계층 8항 중 7 ABSENT, 1 PARTIAL(오근접)**

`jit_*`·`elevation`·`access_request(권한)`·`grant`·`entitlement` 테이블/핸들러/라우트 **전무**. JIT 거버넌스 골격은 그린필드. 단 재활용 substrate(GT① §2)는 실존 — "재활용 기반 신설".

## 2. 거버넌스 계층 실측표

| SPEC 항목 | 판정 | 근거(파일:라인) |
|---|---|---|
| JIT Request Registry / Elevation Policy | **ABSENT** | `elevation\|JIT\|access.request(권한)` BE 0건. `access_request`는 DSAR(정보주체)·AgencyPortal(대행사)뿐 |
| Approval Workflow for elevation | **ABSENT(권한상승용)** | 결재 엔진은 있으나(`Alerting.php:598` maker-checker) 마케팅 행위용. 권한상승 결재 경로 0 |
| Time-bound Grant Ledger / TTL | **ABSENT** | `acl_permission`(`TeamPermissions.php:152`)에 `expires_at/granted_at/valid_until` 컬럼 부재 — 부여 영구 |
| Break-Glass Policy & post-use review | **PARTIAL(오근접)** | `UserAuth.php:793`·`:995` env 마스터로그인+`auth.breakglass` 감사. 사후검토 워크플로·티켓·자동회수 없음 |
| Session-bound entitlement projection | **ABSENT** | 세션에 권한 스냅샷 투영 없음. `/auth/me`는 plan·team_role만, ACL은 매요청 DB조회 |
| Auto-expiry revocation engine | **ABSENT(권한축)** | 권한 만료 회수 엔진 0. 만료회수는 세션(`UserAuth.php:304`·`:989`)·구독(`:141`)·api_key(`Keys.php:135`) 별개축뿐. `backend/bin/` 크론 45종에 권한 purge 잡 무매치 |
| JIT Analytics / Risk / Anomaly on elevation | **ABSENT** | `AnomalyDetection.php`·`Risk.php`는 마케팅/거래 이상탐지. 권한상승 risk scoring 0 |
| Guard(만료후 차단) / Static Lint(영구권한 우회) | **ABSENT** | FE `security/SecurityGuard.js`·`ContaminationGuard.js`는 테넌트오염/XSS. 만료권한 차단·영구권한 lint 0 |

## 3. 재활용 substrate 요약 (순수 그린필드 아님 — 흡수 아닌 재활용)

1. **시한부 세션 발급 패턴** — `UserAdmin.php:471`(2h 만료 + `impersonated_by` 원principal + 감사). 시한부 grant 발급 원형.
2. **maker-checker 정족수 엔진** — `Alerting.php:634`~`:686`(self 재승인 차단·2인 정족수·approved-only 집행). elevation 결재 상태머신으로 재사용.
3. **불변 해시체인 감사** — `SecurityAudit::log` + `auth.breakglass` 전용 이벤트(`UserAuth.php:995`). post-use review 기록 기반.
4. **다축 만료 회수** — 세션·구독·api_key expires+DELETE/강등 3독립 구현. auto-expiry engine 참고(권한축 미적용).
5. **RBAC 매트릭스** — `TeamPermissions.php:152` acl_permission. **TTL 컬럼 부재가 최대 공백** — 이 테이블 확장이 grant ledger 자연 앵커.

## 4. KEEP_SEPARATE — 흡수·개명 금지 근접물

### B-1. 기존 승인 결재 (마케팅/상품/대행사 — 권한상승 아님)
- `action_request` maker-checker: `Alerting.php:642-650`(정족수2)·`:684-686`(approved-only 집행게이트)·`:600-606`(승인자 서버도출 fail-closed). 대상=캠페인 예산/라이트백(`:571`). 테이블 `Db.php:592-600`(★`required_approvals`·grant/expiry 컬럼 없음 — 정족수는 코드강제`:650`·응답상수`:588`). 라우트 `routes.php:443-445`(decide/execute·선행 커밋 드리프트 교정). ★상태머신은 재활용하되 **JIT elevation으로 개명 금지**.
- ★제2 maker-checker `mapping_change_request`: `Db.php:623-636`(`required_approvals INT DEFAULT 2` **컬럼 실존**)·소비 `Mapping.php:209,:287,:527`. 매핑 거버넌스 정족수 승인 — elevation 아님(KEEP_SEPARATE).
- catalog writeback: `routes.php:110`(`Catalog::approveQueue`)·`Catalog.php:2383`(정의)·`requiresHighValueApproval` `Catalog.php:1159`(₩5M `:1036`) — 상품 데이터/고액 승인. elevation 아님.
- agency access: `AgencyPortal.php:347`(myAgencyRequests)·`routes.php:338`(approveAgency) — 대행사↔클라이언트 영구 링크 승인.

### B-2. Impersonation / Act-as (근접물·별개 — 재활용하되 흡수 아님)
- `UserAdmin.php:451`(impersonate·`routes.php:1675`·등록 `:2712`): admin→회원 **하향** 2h 대행(상향 elevation 아님). admin 대행 금지(`:466-469`).
- act-as tenant: `UserAuth.php:418`(`platform_growth` 오버라이드만·고객 임퍼소네이트 불가). 성장콘솔 컨텍스트 전환.

### B-3. plan/feature 게이팅 (구독 기반 — JIT 아님)
- `UserAuth.php:364`(requirePlan)·`:77`(requireFeaturePlan)·`PlanPolicy.php`. 구독 등급 접근이지 시한부 상승 아님.

### B-4. 세션 만료/유휴 로그아웃 (세션 수명 — 권한 TTL 아님)
- `UserAuth.php:304`·`:280`(expires_at)·`:206`(유휴 자동로그아웃). 세션 수명이지 grant TTL 아님.

### B-5. api_key expires/rotate (자격증명 수명 — elevation 아님)
- `Keys.php:135`(revoke)·rotate·`Db.php` api_key expires. 자격증명 회전이지 JIT 상승 아님.

### B-6. OTP/MFA (인증강화 — JIT 아님)
- `UserAuth.php:930`(mfa_policy)·`AdminMfaGate.jsx`. 2단계 인증이지 JIT 아님.

### B-7. 긴급 킬스위치 (오염어 주의 — 접근거버넌스 무관)
- `AdAdapters.php:22`·`:36`(`AD_EXECUTION_DISABLED`)·`AutoCampaign.php:447`(pause-all). "긴급/emergency"이나 **광고 집행 차단 킬스위치** — break-glass와 무관.

### B-8. 런타임 수명주기 동음이의 (2 Explore 확정 — elevation drift/monitor/recon/simulate 아님)
- **model drift**: `ModelMonitor.php`(ML 모델 드리프트) — elevation drift 아님.
- **이상탐지**: `AnomalyDetection.php`(마케팅/지표) — 상승세션 감시 아님.
- **정산 recon**: `PgSettlement.php`·`Db.php:939`(`kr_recon_ticket`) — elevation reconciliation 아님.
- **비즈니스 simulate**: `RuleEngine.php`·`Decisioning.php`·`PriceOpt.php` — elevation simulation 아님.
- **메뉴 감사체인**: `menu_audit_log`(`AdminMenu.php:98`·migration `20260526_168_102_create_menu_audit_log.sql:6-24`) — SecurityAudit(보안 tamper-evident)와 별개 관심사(장식·verify 별도). elevation snapshot/evidence 아님.
- **eligibility/risk 마케팅 동음이의**: `Referral.php:156,:161`·`Connectors.php:1238-1240`(ELIGIBLE)·`CustomerAI.php:78-80,:179,:392,:406`(churn risk_level)·`ProductAddon.php:16,:138`(billing entitlement). elevation eligibility/risk 아님.

### B-9. cron 워커 실측 (능동 만료회수 부재 확정)
- `backend/bin/` = `alerts_cron`·`optimize_cron`·`oauth_refresh_cron` 3종만 실존. **세션/권한/키 만료 능동회수 워커 ABSENT** — 모든 만료는 요청시점 lazy 게이트(`UserAuth.php:989`·`:4261`·`Keys.php:141`). Auto-Revocation(§14 SPEC)은 신설 대상.

### B-10. ★Part 3-8 AccessReview = 재활용 선례(흡수 아님·계승)
- `AccessReview.php:24-29`(Extend Golden Rule 명문화)·`:87-122`(파생분류)·`:210-214`(is_active=0 revoke 재사용)·`:224-233`(SecurityAudit 증거)·`:62-80`(append-only 이력). Part 3-9는 이 동형 패턴을 **elevation 도메인으로 확장**하되 AccessReview(정적 api_key 검토)와 **엔진 분리**(JIT=동적 상승 발급/만료).

## 5. 종합

**JIT 거버넌스 = ABSENT 골격 / 재활용 substrate.** 요청·승인·시간박스 grant·능동 revocation·session entitlement·risk·guard·lint 전부 순신규. 재활용 부품(impersonation 시한부·Alerting maker-checker·SecurityAudit 체인·다축 만료·acl_permission 앵커)은 흡수가 아닌 **확장 대상**. KEEP_SEPARATE = action_request/impersonation/plan게이팅/세션수명/api_key/MFA/광고킬스위치. 최대 공백 = `acl_permission` TTL 컬럼 부재.
