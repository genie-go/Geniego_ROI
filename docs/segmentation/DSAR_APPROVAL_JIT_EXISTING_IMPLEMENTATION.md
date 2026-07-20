# DSAR — JIT Access Governance: 실존 구현 substrate 전수조사 (Ground-Truth ①)

> **거버넌스 상태**: Ground-Truth 증거 문서 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical 원문 verbatim · Version 1.0).
> 상위 ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> 본 문서는 Part 3-9(JIT) 설계의 반날조 인용 **정본 허용목록**이다. 하위 per-entity DSAR은 본 문서 + Ground-Truth ② + ADR 등장 `파일:라인`만 인용.

---

## 0. 조사 범위·방법

- 대상: `backend/src/`·`backend/public/index.php`·`frontend/src/`·`backend/bin/`(크론). 읽기 전용. 배제: `_be_*/`·`clean_src/`·`backup/`·`locales_backup/`·`legacy_v338_pkg/`.
- 방법: `jit|elevation|access.request|grant|entitlement|break.glass|emergency|impersonat|expires_at|valid_until|ttl` 다중 grep + 핵심 파일 정독(Explore 2스레드·36 tool-use). 라인 실측.

## 1. 핵심 판정 요약

**완전한 JIT 워크플로(요청→승인→시간제한 부여→자동 회수)는 부재(ABSENT)다.** 그러나 순수 그린필드는 아니며 — 재활용 가능한 하부 substrate(시간제한 세션 발급·maker-checker 정족수·불변 감사체인·다축 만료회수)가 흩어져 실존한다. 성격은 **"재활용 기반 신설"**.

- **핵심 공백**: `acl_permission` 스키마에 `expires_at`/`granted_at`/`valid_until` 컬럼이 없다(권한 부여는 영구). Grant Ledger의 자연 앵커가 될 이 테이블에 TTL 축이 없다.
- **유일한 완전동작 JIT 프리미티브**: impersonation(2시간 시간제한 세션 + 원 principal 추적 + 감사) — 단 요청/승인 게이트 없이 admin 직접 발급, 하향(admin→회원) 대행.

## 2. 실존 substrate 카탈로그

### A. 시간제한 세션·자격증명 TTL (Time-bound 근접 — PARTIAL)

| 파일:라인 | 심볼 | 설명 | JIT 매핑 | 상태 |
|---|---|---|---|---|
| `backend/public/index.php:518` | api_key expires 강제 | `strtotime(expires_at) < time()` → 401 | Grant TTL(자격증명축) | PARTIAL |
| `backend/src/Handlers/UserAuth.php:606` | 세션 TTL 30일 | `time()+30*24*3600` | 세션 수명 | PARTIAL |
| `backend/src/Handlers/UserAuth.php:986` | 세션 발급 | 로그인 세션 만료 설정 | 세션 수명 | PARTIAL |
| `backend/src/Handlers/UserAuth.php:541` | 체험판 20일 만료 | `subscription_expires_at` | 구독 수명 | PARTIAL |
| `backend/src/Handlers/UserAuth.php:141` | 만료 강등 | 만료 시 plan→free | 만료 회수(구독축) | PARTIAL |
| `backend/src/Handlers/UserAdmin.php:474` | 대행 세션 2시간 TTL | impersonate 토큰 수명 | **시한부 grant 원형** | PRESENT |

### B. Impersonation / Act-as (유일 완전 JIT 프리미티브 — PRESENT)

| 파일:라인 | 심볼 | 설명 | JIT 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/UserAdmin.php:451` | `impersonate()` | admin→회원 2시간 대행 세션 발급 | 시한부 grant 발급 | PRESENT |
| `backend/src/Handlers/UserAdmin.php:466` | 권한상승 방지 | admin 계정 대행 금지·비활성 회원 금지 | Guard | PRESENT |
| `backend/src/Handlers/UserAdmin.php:478` | `impersonated_by` 보존 | 원 principal(발급 admin) 추적 | Evidence(원 principal) | PRESENT |
| `backend/src/Handlers/UserAdmin.php:489` | 감사 기록 | impersonate 감사 | Audit | PRESENT |
| `backend/src/routes.php:1675` | 라우트 | `POST /v423/admin/users/{id}/impersonate`(등록 `:2712`) | API | PRESENT |
| `backend/src/Handlers/UserAuth.php:418` | `X-Act-As-Tenant` | admin 전용 `platform_growth` 오버라이드 | 컨텍스트 전환(근접) | PARTIAL |

### C. Break-Glass (비상 인증 — PARTIAL, 시한부 grant 아님)

| 파일:라인 | 심볼 | 설명 | JIT 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:793` | env 마스터 로그인 | `GENIE_BREAKGLASS_PW`(+선택 EMAIL)로만 활성, admin 승격 | Break-Glass 자격증명 | PARTIAL |
| `backend/src/Handlers/UserAuth.php:995` | `auth.breakglass` 감사 | 불변 해시체인 전용 이벤트(`mfa_bypassed=true`) | 사후감사(이벤트만) | PARTIAL |
| `backend/src/Handlers/UserAuth.php:930` | MFA 우회 | break-glass는 MFA 우회 | — | PARTIAL |

> **정직 경계**: break-glass는 "env 게이트 비상 로그인 백도어"다. 성공 후 **일반 30일 admin 세션**을 받으며 상승 자체에 만료/자동회수/사후검토 워크플로가 없다. SPEC이 상정하는 시간제한 emergency grant + post-use review는 ABSENT.

### D. maker-checker 정족수 엔진 (Approval 재활용 substrate — PRESENT, 단 권한상승 결재 아님)

| 파일:라인 | 심볼 | 설명 | JIT 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/Alerting.php:598` | `decideAction()` | 승인/거부 결정 | Approval 상태머신(재활용) | PRESENT |
| `backend/src/Handlers/Alerting.php:660` | `executeAction()` | approved 상태에서만 집행 | 상태게이트(재활용) | PRESENT |
| `backend/src/Handlers/Alerting.php:642` | 정족수·self 재승인 차단 | 2인 정족수 | maker-checker(재활용) | PRESENT |
| `backend/src/Db.php:592` | `action_request` 테이블 | policy_id/status/approvals_json (grant/expiry 없음) | (대상=마케팅) | KEEP_SEPARATE |

### E. 만료 회수 루틴 (Auto-expiry 참고 substrate — PARTIAL, 권한축 미적용)

| 파일:라인 | 심볼 | 설명 | JIT 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/UserAuth.php:304` | 만료 세션 배제 | `WHERE expires_at > ?` 런타임 게이트 | TTL Enforcement(세션축) | PARTIAL |
| `backend/src/Handlers/UserAuth.php:989` | lazy purge | 로그인 시 `DELETE ... WHERE expires_at < now` | 만료 정리(lazy) | PARTIAL |
| `backend/src/Handlers/UserAdmin.php:344` | 즉시 회수 | 계정 비활성 시 `DELETE FROM user_session` | 즉시 revoke | PARTIAL |
| `backend/src/Handlers/Keys.php:135` | api_key revoke | is_active=0 | 자격증명 회수 | PARTIAL |

### F. RBAC 매트릭스 (Grant Ledger 앵커 후보 — TTL 축 부재)

| 파일:라인 | 심볼 | 설명 | JIT 매핑 | 상태 |
|---|---|---|---|---|
| `backend/src/Handlers/TeamPermissions.php:152` | `acl_permission` 스키마 | 8동작 권한 — **`expires_at`/`granted_by`/`reason` 컬럼 없음** | Grant Ledger 앵커(TTL 부재) | 공백 |
| `backend/src/Handlers/TeamPermissions.php:599` | `putTeamPermissions` | owner/manager 직접 배정(영구) | 영구 부여(JIT 아님) | PARTIAL |
| `backend/src/Handlers/UserAuth.php:1019` | 역할 세션 해석 | team_role/admin_level → 세션 페이로드 | 영속 role(세션 아님) | PARTIAL |
| `backend/src/Handlers/EnterpriseAuth.php:487` | SSO 그룹→역할 | 프로비저닝 시 `app_user.team_role` 영구 기록 | 영속 매핑 | PARTIAL |

## 3. 종합 판정

**JIT = ABSENT-governance / 재활용-substrate.** 요청·승인·시간박스 grant·능동 revocation의 거버넌스 골격은 미구현. 재활용 부품: (B) impersonation 시한부 세션(시간제한+감사+원principal, 유일 완전 프리미티브)·(D) maker-checker 정족수(Alerting)·(A/E) 다축 만료(세션/키/구독)·(C) break-glass 감사이벤트. 핵심 공백 = `acl_permission` TTL 컬럼 부재(§F). 실 엔진은 이 substrate를 **대체가 아닌 재활용·확장(Extend)** 한다.

---

## 4. 2-Explore 교차검증 보강 (canonical SPEC v1.0 정합 · 라인 재실측 · 2026-07-20)

canonical 원문 확정 후 2 Explore 스레드로 **현재 코드 라인 재실측**(선행 커밋 `routes.php` 삽입으로 일부 라인 드리프트 교정) + Part 3-8 신규 substrate 편입. 아래는 상위 표의 라인을 정밀 확정한 것으로, **하위 DSAR은 본 §4의 라인을 우선 인용**한다.

### 4-A. break-glass 정밀 라인 (UserAuth.php)
| 심볼 | 라인 | 근거 |
|---|---|---|
| `$isMasterAuth` 선언 | `UserAuth.php:796` | 플래그 선언(설정 `:801`·소비 `:842,:882,:945,:997`) |
| env 게이트 | `UserAuth.php:797-800` | `getenv('GENIE_BREAKGLASS_PW')`+선택 `GENIE_BREAKGLASS_EMAIL`·`hash_equals` 상수시간 |
| MFA 우회 | `UserAuth.php:945-946` | `$enforced/$enrolled = !$isMasterAuth && …` — 강제·등록검사 양쪽 skip |
| `auth.breakglass` 감사 | `UserAuth.php:997-999` | `if($isMasterAuth)`→ SecurityAudit `'auth.breakglass'`(`mfa_bypassed=true`) 전용이벤트 |

### 4-B. maker-checker 정밀 라인 + 제2 승인 테이블
| 심볼 | 라인 | 근거 |
|---|---|---|
| 정족수 2 강제 | `Alerting.php:642-650` | 상이 승인자 2명 `count($distinct)>=2` → approved. self 재승인 dedup `:634-640` |
| 승인자 신원 서버도출 | `Alerting.php:600-606` | fail-closed(위조 차단) |
| 집행 게이트(approved-only) | `Alerting.php:684-686` | `status!=='approved'` execute 차단 |
| `action_request` 스키마 | `Db.php:592-600` | ★`required_approvals` **컬럼 없음** — 정족수 2는 코드강제(`:650`)·응답상수(`:588`)일 뿐 |
| **제2 maker-checker** `mapping_change_request` | `Db.php:623-636` | ★`required_approvals INT DEFAULT 2` **컬럼 실존**·소비 `Mapping.php:209,:287,:527`(`count>=required_approvals`). action_request와 별개 정족수 승인 |

### 4-C. impersonation·act-as 정밀 라인 (UserAdmin.php / UserAuth.php)
| 심볼 | 라인 | 근거 |
|---|---|---|
| `impersonate()` | `UserAdmin.php:451` | 발급 핸들러 |
| 상승 차단 가드 | `UserAdmin.php:466-469` | admin 계정 대행 금지·비활성 회원 금지(=하향 대행 전용) |
| 2h 토큰+`impersonated_by` | `UserAdmin.php:472-482`(TTL `:474`·컬럼 `:478`) | 2시간 시한부+원 principal 보존 |
| `X-Act-As-Tenant` | `UserAuth.php:418-420` | admin+`platform_growth` 값만·시간제한 없음(헤더단위) |

### 4-D. 세션·자격증명 TTL 정밀 라인
| 심볼 | 라인 |
|---|---|
| `user_session` 스키마 | `Db.php:1111-1119`(token 해시·expires_at·created_at+인덱스) |
| userByToken 만료 게이트 | `UserAuth.php:249-284`(`expires_at > ?`) |
| 세션 발급 30일 | `UserAuth.php:986,:990` |
| api_key expires 생성 | `UserAuth.php:4354-4357`·런타임 401 `index.php:518` |
| mfa_otp_expires | 컬럼 `UserAuth.php:3526`·검증 `:4097-4104` |
| impersonated 세션 lazy purge/즉시회수 | `UserAuth.php:989`·`UserAdmin.php:344` |

### 4-E. ★Part 3-8 AccessReview 신규 substrate (직전 세션 배포 — Part 3-9 직접 선례)
Part 3-8 실 구현 슬라이스(`backend/src/Handlers/AccessReview.php`)가 Part 3-9가 계승할 **동형 선례**로 실존한다(운영+데모 배포 완료).
| 심볼 | 라인 | JIT 매핑 |
|---|---|---|
| "Extend, 대체 아님" Golden Rule 명문화 | `AccessReview.php:24-29` | 설계 원칙 선례 |
| 휴면/만료 분류(파생·임의값 금지) | `AccessReview.php:87-122` | Risk/Eligibility 파생 패턴 |
| revoke=기존 `is_active=0` 재사용 | `AccessReview.php:210-214` | Revocation semantics(신규 파괴경로 없음) |
| 결정→SecurityAudit 증거기록 | `AccessReview.php:224-233` | Evidence(해시체인 참조) |
| `access_review_item` append-only 이력 | `AccessReview.php:62-80,:219-222` | Immutable 이력·justification 필수 |

### 4-F. 감사/증거 substrate 정밀 라인
| 심볼 | 라인 |
|---|---|
| SecurityAudit 해시체인 | `SecurityAudit.php:12-53`(append-only·prev_hash→hash_chain) |
| SecurityAudit `verify` | `SecurityAudit.php:56-68`(변조 시 broken_at) |
| 유일 tamper-evident 증거 저장소 | 위 — `menu_audit_log`(장식·KEEP_SEPARATE)와 구분 |
