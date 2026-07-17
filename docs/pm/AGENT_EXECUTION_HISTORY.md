# AGENT EXECUTION HISTORY — 에이전트 실행 이력

> 목적: 에이전트(Claude Code)가 **무엇을 지시받아 / 무엇을 실제로 했고 / 무엇을 하지 않았는지**를 검증 가능한 근거와 함께 남긴다.
> 원칙: **자기 보고 금지 — 실측(파일·git·grep) 근거만**. 미이행·오류는 축소하지 않고 그대로 기록(헌법 정직 우선 · 메모리 `feedback_real_value_autoderive`).
> 관련: [`PM_CHANGE_HISTORY.md`](PM_CHANGE_HISTORY.md) · [`REPEAT_PROBLEM_HISTORY.md`](REPEAT_PROBLEM_HISTORY.md) · [`../CHANGE_GATE.md`](../CHANGE_GATE.md)

---

## AE-289-01 — EPIC 06-A Part 4-5-3-1-4 (Rebate Program Lifecycle·Versioning·Migration)

- **차수**: 289차 (2026-07-17) · 브랜치 `feat/n236-admin-growth-automation` · **master 미접촉 · 미푸시**
- **지시 원문**: 인계서 "다음 최우선 = Part 3-3-3-3-3-3-3-3-4-5-3-1-4" → 이후 사용자가 **상세 스펙 v1.0 전문**을 제공 → **비파괴 확장** 승인 → 자기감사 결과 **층위 1+2 보정** 승인.

### 실행 결과 (실측)
| 산출 | 실측 | 커밋 |
|---|---|---|
| Canonical 2종(v1.0 압축본) | 생성 | 17820304a24 |
| Canonical 2종 → **v2.0 스펙 확장**(State 18→36 · Transition 12→24 · Activation Gate 23 · Emergency Disable · Migration 7종 · Historical Binding · In-flight 등) | 확장 | 024eaf8e706 |
| **§53 산출 문서 49종**(`DSAR_REBATE_PROGRAM_*.md`) | **49/49 생성** | (본 커밋) |
| ADR | 생성 → v2.0 확장 | 17820304a24 → 024eaf8e706 |
| PM_CHANGE_HISTORY | 갱신 | 각 커밋 |
| REPEAT_PROBLEM_HISTORY(RP-001) | 신설 | d65e61296aa |
| AGENT_EXECUTION_HISTORY | **신설(본 문서)** | (본 커밋) |
| **코드 변경** | **0건** — `git diff backend/ frontend/ tools/` 결과 없음 | — |

### ★미이행·한계 (정직 표기)
1. **구현 수준**: 스펙 §1·§52 Step 19·§60 은 "Static Lint·Runtime Guard **구현**"·"...가 **구축**되었다"를 요구하나, 실제 산출은 **계약 명세(문서)까지**. **실 테이블 0 · Lint 규칙 0 · Runtime Guard 0**. 선행 Part 1-1~1-3 선례(전부 설계 명세·코드 0)와 비파괴 원칙을 따랐으나, **스펙 문언 기준으로는 미구현**이다. 실 구현 = 후속 승인 세션.
2. **§59 완료 보고 형식(50항목)**: 초판 미제출 → 본 세션 보정에서 제출.
3. **§3 전수조사**: 초판은 일부만 grep하고 일부를 **근거 없이 단정**(절차 위반) → 보정에서 전수 실측 완료.

### ★자기 오류 (실측으로 발견·정정)
| 오류 | 실측 근거 | 정정 |
|---|---|---|
| **Approval 을 "부재→신설"로 오분류** | `action_request` 에 decision/approvals_json/status + IDOR 차단 **실존**(Alerting.php:545-546/578-582) | v2.1 에서 **VALIDATED_LEGACY(재사용)** 로 정정 |
| **Backfill 을 "부재"로 오기** | `Attribution::backfillOwnedTouches` **실존**(Attribution.php:282) | v2.1 정정 |
| **Scheduled 실행 인접 누락** | EmailMarketing 예약 큐+attempts+드레인 워커 실존(:57/83/101-103) | v2.1 반영 |
| **Audit Registry 를 "2종"으로 과소 기술** | 도메인별 audit_log **12파일** | v2.1 정정 |
| 인용 파일명 오류 `Journey.php` | 실제 `JourneyBuilder.php`(라인 번호는 정확) | 검증 단계에서 정정 |
| 인용 라인 오류 `Paddle.php:704` | 실제 `:705`(`:704`는 `$subId`) | 검증 단계에서 정정 |

### 미확정 관찰 (수정 안 함)
**KrChannel.php:459** — 거래일 무관 최신 `kr_fee_rule` 1건으로 과거 정산라인 재검증(as-of 아님·:462/471). 본 파트 원칙의 실 사례로 **근거만 기록** · 요율 이력 1건 테넌트 무증상 · **FP 레지스트리 규약상 PM 코드 재증명 전 P0 단정 금지** · 비파괴 원칙상 미수정 → `MIGRATION_REQUIRED` 분류(별도 승인 세션).

---

## AE-289-03 — EPIC 06-A Part 4-5-3-1-5-1 (Authorization Foundation·정본 9분할 5/9의 1/8)

- **차수**: 289차 (2026-07-17) · **비파괴 · 코드변경 0** · 브랜치 feat/n236 · master 미접촉
- **지시**: 사용자가 1-5를 **8분할**로 진행 결정 → 5-1 상세 스펙 v1.0 제공.
- **RP-001 준수 확인**: 착수 전 정본 로드맵 확인 완료 — Part 1 `CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7`의 **1-5=Permission**과 본 스펙 정합. **파트 번호 추정 부여 없음**(스펙이 5-1~5-8 명시).

### ★이번 블록의 성격 — 앞선 파트와 결정적 차이
Rebate 엔진(1-1~1-4)은 **grep 0(부재)**이었으나 **Authorization 은 실 구현이 대량 존재**. 따라서 산출의 정직한 성격은 **신설이 아니라 통합(Canonical Foundation 승격)**.

| 실측 | 결과 |
|---|---|
| **VALIDATED_LEGACY(승격·재사용)** | TeamPermissions(ACTIONS 8·DATA_SCOPES 9·acl_permission·team_role) · api_key RBAC(roleRank 4·scopes·key_hash SHA-256·expires_at·**192차 /api 별칭 권한상승 차단**) · PlanPolicy(RANK·기능키→최소플랜) · Tenant Isolation(auth_tenant 주입·authedTenant 64·RLS·IDOR 차단) · requireMasterAdmin2/requireSubAdminMenu · requirePro/requirePlan(351 호출부) · guard_headerless_getjson(275차) · AES-256-GCM credential · EnterpriseAuth · MFA · audit_log 12 |
| **부재 확정(grep 0·신설)** | 중앙 PDP · Decision 기록 · Policy Version · Obligation · Conflict · Reconciliation · ABAC Context · Field Access Profile · Break Glass · Access Review · Production/Sandbox 권한 분리 |
| **CONSOLIDATION_REQUIRED** | Role 3계통 · Field Masking 3+ · PEP 100+ |
| **MIGRATION_REQUIRED(미확정·미수정)** | team_role fail-open · PlanPolicy↔UI 수동 동기화 |
| **코드 변경** | **0건** |

### ★미이행·한계 (정직)
- **구현 수준**: 스펙 §1·§52 Step16·§60은 "구현/구축"을 요구하나 산출은 **계약 명세(문서)까지** — 실 코드·테이블·Lint·Guard **0건**. Part 1-1~1-4 선례+비파괴 원칙 준수. **"구축 완료"가 아니라 "명세 확정"**.
- **§53 산출 문서 52종**: **v1.1 보정에서 전량 생성 완료**(빈 파일 0 검증).
- **§59 완료 보고(49항목)**: **v1.1 보정에서 제출 완료**(PM_CHANGE_HISTORY 기재).

### 미확정 관찰 (수정 안 함)
①**인가 판정 100+ 지점 분산·중앙 PDP 부재**(275차 헤더리스 getJson 401 회귀 2차 재발이 실현 사례) → 5-6. ②**PlanPolicy↔planMenuPolicy.js 수동 동기화**(286차 rank 맵 붕괴 사고로 드리프트 실현) → Reconciliation. ③**team_role fail-open**(미설정=owner·AdminMenu.php:52-54) — Deny-by-default와 상충하나 레거시 호환 의도로 보임 · **PM 재증명 전 P0 단정 금지** → 5-2 판정.

---

## AE-289-04 — EPIC 06-A Part 4-5-3-1-5-2 (Role·Organization·Tenant·Workspace·Scope Governance)

- **차수**: 289차 (2026-07-17) · **비파괴 · 코드변경 0** · feat/n236 · master 미접촉
- **★★지시 성격 — 스펙 미수령·자율 판단(사용자 명시 승인)**: 사용자가 **상세 스펙 없이 진행**을 지시. 선행 스펙(5-1 §1)이 **파트 번호·파트명만** 명시했고 **§5~§60 요구·Entity 필드·분류 체계·§53 문서 목록·§59 보고 형식은 제공되지 않았다**.
  - **RP-001 정합 확인**: 파트 번호·이름은 **추정 아님**(스펙 명시). **세부 계약은 자율 설계임을 전 산출물(Canonical 2 + ADR)에 명시**했다 — 추정을 정본처럼 표기하지 않음.
  - **한계**: 스펙 §요구가 없으므로 **"완료 조건 판정 불가"** · **§53/§59 없음**(내가 정의한 산출 = Canonical 2 + ADR + 이력).
  - **정본 스펙 수령 시 재정합 필요**.

### ★실측 성과 — 1차 grep REAL 4건 중 3건이 오탐이었다
| 항목 | 1차 grep | 정밀 확인 | 근거 |
|---|---|---|---|
| Workspace Registry | REAL | **오탐 — 부재** | `WorkspaceState`=**tenant_kv UI 상태 KV**("테넌트 격리 전용 tenant_kv 신설(중복 아님)"·WorkspaceState.php:10/59-61) |
| Store Registry | REAL | **오탐 — 부재** | `influencer_store`=**인플루언서 스토어**(Influencer.php:38) |
| Country/Region Registry | REAL | **오탐 — 부재** | `country`=tenant_business_profile/pixel_events **컬럼**(DataPlatform.php:72·PixelTracking.php:99) |
| Organization Registry | REAL | **오탐 — 부재** | `organization_id` grep 0 |
| **Tenant Registry** | REAL | **확정 REAL** | **`tenant_business_profile`**(company_name·**biz_reg_no**·industry·country·brand_name·DataPlatform.php:53/72·272차) |
| **Team** | REAL | **확정 REAL** | **`team` 테이블**(TeamPermissions.php:145) · team_role 고정 3종 · `team_channel_mapping`(tenant_id+team·Db.php:712-717=**Team 은 Tenant 종속**) |

### 주요 실측·판단
- **Role Registry 자체가 부재** — Role 이 **3계통에 enum/상수/컬럼값으로 산재** · **Custom Role 부재**(`custom_role`/`role_code` grep 0·team_role 고정 3종) · Assignment 이력/승인/만료 전무.
- **Legal Entity 부재 확정**(1-1·1-3·5-1 과 일관) · **`biz_reg_no` 가 있어도 Legal Entity 아님**(테넌트 프로필 ≠ 법인 회계 주체).
- **자율 판단 2건**: ①**Scope 2계층 분리**(현행 DATA_SCOPES 9 는 조직축+데이터축 혼재 → Canonical 24 와 차원 상이 → 강제 병합 시 의미 손상) ②**team_role fail-open 판정**(의도적 가용성 보호로 보임 · 권장 해소=backfill 후 null=DENY · **미수정**).
- **통합 시 회귀 고위험 3지점(실측)**: `requirePro` **호출부 351**(286차 rank 맵 붕괴 실사례) · `authedTenant` **64** · `requireMasterAdmin2` **5**.
- **코드 변경 0**.

---

## AE-289-05 — EPIC 06-A Part 4-5-3-1-5-3 (Approval Workflow·Multi-Level·Risk-Based Decision)

- **차수**: 289차 (2026-07-17) · **비파괴 · 코드변경 0** · feat/n236 · master 미접촉
- **★★지시 성격 — 스펙 미수령·자율 판단(사용자 명시 승인)**: 상세 스펙 미제공(파트 번호·이름만 5-1 §1 명시). **세부 계약은 자율 설계임을 Canonical 2 + ADR 전부에 명시**. **§요구 부재 → 완료 조건 판정 불가 · §53/§59 없음**. 정본 스펙 수령 시 재정합.

### ★자기 오판 2건 (정밀 확인으로 정정)
| 오판 | 1차 근거 | 정밀 확인 | 정정 |
|---|---|---|---|
| **"Multi-level/quorum 부재"** | `quorum`/`approval_level` grep 0 | **`mapping_change_request.required_approvals INT NOT NULL DEFAULT 2`**(Db.php:634) + `count($approvals) >= required_approvals ? approved : pending`(Mapping.php:214) | **REAL(정족수 정본)** — 키워드 1차 grep 을 결론으로 삼은 오류 |
| **"Risk-based 승인 REAL"** | `risk_score` 히트(CustomerAI) | **CustomerAI 의 이탈 예측(churn_prob)** — 승인 위험과 무관 | **오탐 → 부재 확정** |

**교훈(5-2 오탐 3건과 동일 클래스)**: **1차 키워드 grep 결과를 결론으로 삼지 말 것 — 반드시 실체 확인**.

### ★최대 발견 (미확정 관찰·미수정)
**`Mapping::approve()` 에 중복 승인·자기 승인 방지 부재**(전체 확인·Mapping.php:196-216):
1. `$approvals[] = ["user"=>$actor, "ts"=>gmdate('c')];`(:212) — **동일 actor dedup 없음** → 한 사람이 2회 호출 시 `required_approvals` DEFAULT 2 를 **혼자 충족 → approved**(:214).
2. `requested_by`(:167 기록)와 `$actor` **미비교** → **요청자 본인 승인 가능**.
- **FP 규약상 PM 코드 재증명 전 P0 단정 금지**. 실 영향 판정 필요 = approve 엔드포인트 호출 권한 · `mapping_change_request` 실 운영 사용 여부 · `self::actor()` 해석. **비파괴·미수정** → **MIGRATION_REQUIRED · 5-4 판정 대상**.

### 실측 요약
- **REAL**: `required_approvals` 정족수 · action_request/mapping_change_request 2계통 · **승인 후 실 집행+정직 상태**(287차 executed/failed/approved_manual) · IDOR 차단(208차) · PriceOpt human-in-loop **`pending_approval`**(239차·PriceOpt.php:1586) · **enforceBudgetCaps 97%**(Threshold 정본·284차) · AnomalyDetection · MFA(mfa_policy).
- **부재**: Approval Level(역할별 단계) · required_roles · distinct_approver · exclude_requester · 만료/SLA · 철회 · 위임 · Maker-Checker · SoD · Risk Model · Threshold Policy · Auto-Approval Policy · Risk↔required_approvals 연동.
- **자율 판단 2건**: ①**Quorum ≠ Level**(count 만으로 단계/역할 대체 불가) ②**자동 승인 ≠ 자동 집행**(287/288차 fake-looks-real 재발 방지).
- **코드 변경 0**.

---

## AE-289-06 — EPIC 06-A Part 4-5-3-1-5-4 (Maker-Checker·SoD·Delegation·Impersonation)

- **차수**: 289차 (2026-07-17) · **비파괴 · 코드변경 0** · feat/n236 · master 미접촉
- **★★스펙 미수령·자율 판단(사용자 명시 승인)** — 세부 자율임을 Canonical 2 + ADR 전부에 명시 · **§요구 부재 → 완료 조건 판정 불가 · §53/§59 없음**.

### ★5-3 기술 정정 (자기 정정)
**`action_request` 는 정족수가 없다** — `$status = $decision === "approve" ? "approved" : "rejected";`(Alerting.php:593) = **단일 승인 즉시 확정**. `approvals_json` 은 **이력 배열일 뿐** 정족수 판정에 미사용(:591). 5-3 이 두 승인 계통을 동급 REAL 로 기술한 것을 정정 — **정족수 REAL 은 `mapping_change_request` 하나뿐**.

### ★5-3 §7 위임 2건 판정 (자율·미확정·미수정)
| 판정 | 실측 | 자율 판정 | 조치 |
|---|---|---|---|
| **중복 승인** | `$approvals[] = ["user"=>$actor,...]`(Mapping.php:212) **dedup 없음** → 동일인 2회 → count=2 → **approved**(:214) | **결함 후보** — `DEFAULT 2` 의 의도("서로 다른 2명")를 **무력화** | **MIGRATION_REQUIRED** · PM 재증명 필요 |
| **자기 승인** | `requested_by`(:167) vs `$actor` **미비교** | **결함 후보** — 단 required_approvals=2 라 **판정 1 과 결합될 때만 단독 확정** | 동상 |
| **(신규) action_request 정족수 부재** | Alerting.php:593 | 의도 불명(경량 승인 설계 가능성) | PM 재증명 대상 |

**FP 규약 준수**: P0 단정 금지 · 실 영향 판정 필요 = approve 호출 권한 · 실 운영 사용 여부 · `actor()` 해석. **비파괴 미수정**.

### ★Impersonation 은 예상보다 잘 설계됨 (통제 6종 REAL)
requireAdmin 가드→403(UserAdmin.php:474-475) · **admin 대상 대행 차단**(:488=권한상승 차단) · **`imp_` 토큰 분리**(:493) · **2시간 만료**(:495) · 감사(:499) · **사용자 배너 고지**(`_impersonated`·:525). **Act-As 도 286차 후 "admin + platform_growth 만·기본 OFF"로 블래스트 반경 최소**(UserAuth.php:391-394).
**관찰(미확정)**: **대행 세션 Action 무제한** — `imp_` 토큰이 일반 세션과 동일 저장(:496)·제한 없음 → 대행 중 승인/집행 가능(SoD Matrix `IMPERSONATE × APPROVE/EXECUTE`=CRITICAL). 단 admin 대상은 차단이라 **반경은 일반 회원**. **미수정** → §4c 신설로 해소 권장.

### 자율 판단
①**SoD Conflict Matrix 9쌍** 설계(APPROVE_PAYOUT×EXECUTE_PAYOUT 등) — **현행 `approve`/`execute` Action 분리(TeamPermissions.php:39)가 SoD 를 Action 수준에서 표현 가능케 하는 기반** ②**대행 = 기본 읽기 전용**(엔드포인트명 "대행 **열람**"이 설계 의도와 정합) ③**Act-As Blast Radius 6원칙**(286차 "자동ON+고착" 사고 반영) ④**1인 테넌트 예외**(exclude_requester 교착 방지·명시 정책+감사로만).
- **코드 변경 0**.

---

## AE-289-07 — EPIC 06-A Part 4-5-3-1-5-5 (Emergency Access·Break Glass·JIT·Time-Bound Privilege)

- **차수**: 289차 (2026-07-17) · **비파괴 · 코드변경 0** · feat/n236 · master 미접촉
- **★★스펙 미수령·자율 판단(사용자 명시 승인)** — 세부 자율임을 Canonical 2 + ADR 전부 명시 · **§요구 부재 → 완료 조건 판정 불가 · §53/§59 없음**.

### ★핵심 실측
| 항목 | 결과 | 근거 |
|---|---|---|
| **Break Glass · Emergency Access · JIT** | ❌ **전부 부재(grep 0)** | `break_glass`/`emergency_access`/`jit_` |
| **Impersonation 2h** | ✅ **REAL — JIT 의 실 원형**(4요소 중 **3개 보유**: 시간제한·감사·고지 / **부족=사유·승인**) | UserAdmin.php:493-499/525 |
| **api_key expires_at** | ✅ REAL | Db.php:953 |
| **MFA OTP 해시+만료** | ✅ REAL — `mfa_otp_hash` + `mfa_otp_expires` · `strtotime` 검증 | UserAuth.php:3418/3895/3908 |
| **★SCIM 즉시 deprovision** | ✅ **REAL — 5-1 §43 Critical("Revoked Role 로 Session 지속")의 실 해소 사례** | **EnterpriseAuth.php:400/413** |
| 강제 세션 종료 | ✅ REAL | UserAdmin.php:365 |
| **Kill Switch(닫기)** | ✅ REAL | AutoCampaign.php:602-609(233차) |
| Incident Registry | ❌ 부재(1-4와 일관) | — |

### ★관찰 2건 (미확정·미수정)
1. **Revocation 경로 불일치** — **SCIM 만 즉시 세션 삭제**(:400/413) · **일반 Role 변경·plan 강등에는 세션 무효화 미발견** → 5-1 §43 이 SCIM 외 경로에서 열려 있을 수 있음. **FP 규약상 P0 단정 금지**(권한 판정이 요청마다 DB 재조회면 무증상·`authedTenant` 요청시점 해석 맥락) → **5-6 판정**.
2. **만료 세션 정리 Job 부재** — 만료는 조회 시점 검증 · `user_session` 만료 행 누적 가능. **기능 결함 아님·위생 이슈** → 5-7/운영 cron 후보.

### 자율 판단
①**JIT 신규 프레임워크 신설 금지 — Impersonation 패턴 일반화**(3/4 이미 보유·사유+승인만 추가) ②**★"이 저장소엔 권한을 여는 비상 경로가 없다 = 결함이 아니라 보수적 설계"** — 있는 건 **닫는 경로**(Kill Switch·Emergency Disable·SCIM deprovision·강제 종료)와 **인증 복구**(273차 접속키) ③**Break Glass 기본 OFF · 대안이 있으면 만들지 마라**(도입 3조건 제시) ④**방향 구별**(1-4 Emergency Disable=**닫기** / Break Glass=**열기** / 273차 접속키=**인증 복구·권한 상승 아님·동명이의 오탐 주의**) ⑤**Break Glass 중에도 Kill Switch 우선**(비상 권한이 비상 차단을 무력화 금지).
- **코드 변경 0**.

---

## AE-289-08 — EPIC 06-A Part 4-5-3-1-5-6 (Runtime Authorization·API/UI Enforcement·PDP Infrastructure)

- **차수**: 289차 (2026-07-17) · **비파괴 · 코드변경 0** · feat/n236 · master 미접촉
- **★★스펙 미수령·자율 판단(사용자 명시 승인)** — 세부 자율임을 Canonical 2 + ADR 전부 명시 · **§요구 부재 → 완료 조건 판정 불가 · §53/§59 없음**.

### ★분산 규모 수치 확정 (실측)
| 축 | 실측 |
|---|---|
| 라우트 총수 | **1,448**(routes.php) |
| PEP ① 미들웨어 | **1개소 · bypass 조건 143 / index.php 667 라인** |
| PEP ② `authedTenant` | **64 핸들러** |
| PEP ③ `requirePro`/`requirePlan` | **56 핸들러 · 호출부 465(정의부 제외 455)** |
| PEP ④ `requireMasterAdmin2` | **5 핸들러** |
| 중앙 PDP · Cache · PEP/Bypass Registry · Coverage · Drift 탐지 | **전부 부재** |

### ★자기 인용 정정 (중요)
**`requirePro` 호출부는 351 이 아니라 455 다** — 5-1~5-5 에서 인용한 "호출부 351" 은 **코드 주석 값**(UserAuth.php:329·**286차 시점**)이었고 **현재 실측은 465(정의부 제외 455)**. **주석 작성 후 100+ 증가** → **★"PEP 분산이 계속 심화 중"** 이라는 신호(5-1 §51 이 경고한 "PEP 를 101번째로 추가"가 실제 진행 중). **주석 인용을 실측으로 오인한 오류** — 앞선 파트 표기를 본 블록에서 정정.

### ★5-5 위임 판정 (자율·위험도 하향)
5-5 가 "Revocation 경로 불일치(SCIM 만 즉시 세션 삭제)"를 Critical 후보로 넘겼으나 — **본 블록 실측: Authorization Cache 부재 + 판정이 요청마다 DB 재조회**(authedTenant·requirePlan) → **Role/plan 변경은 다음 요청부터 즉시 반영** → **"Revoked 권한 접근 지속" 위험은 설계상 낮음**. **★단 캐시를 도입하는 순간 실재화** · 계정 비활성화 시엔 SCIM 처럼 세션 삭제 필요. **PM 재증명 전 확정 금지**.

### 자율 판단 4건
①**PDP 3단계 점진 통합** — **Adapter 위임**(기존 게이트 내부에서 PDP 호출·동작 동일=회귀 0) → PEP Registry 전수 매핑 → 신규만 직결 · **기존 455 호출부 불변**(286차 rank 붕괴가 의미 변경 위험을 증명) ②**Bypass 핵심 필드 = `self_auth_mechanism`**(bypass 143 은 "무인증"이 아니라 "다른 수단 위임" · 이 값이 비면 진짜 무인증=Critical) ③**UI/API 드리프트 두 방향의 위험이 다르다**(UI차단·API허용=**CRITICAL 잠복** / UI허용·API거부=HIGH 즉시발견 · **286차 rank 붕괴는 전자**) ④**UI Projection 3방식**(런타임 투영 권장이나 planMenuPolicy.js 가 "fallback 정본" 역할을 겸해(:6) 선해소 필요 → **CI 대조 가드가 현실적 1단계**·275차 선례).

### ★권한 소스 2개가 이미 2번 사고
백엔드 `PlanPolicy` ↔ 프론트 `frontend/src/auth/planMenuPolicy.js`(`MENU_MIN_PLAN` :25·`PLAN_TIER_RANK` :91)가 **수동 동기화**(주석 :14). 사고 = **286차 rank 맵 붕괴** · **275차 헤더리스 getJson 401 회귀 2차 재발**(→ CI 가드로 클래스 제거). → **★신설 권장 `guard_plan_policy_drift.mjs`**(275차 가드와 동일 클래스 확장) · **"양쪽 동시 갱신"을 사람에게 의존 금지**.
- **코드 변경 0**.

---

## AE-289-09 — EPIC 06-A Part 4-5-3-1-5-7 (Authorization Audit·Evidence·Compliance·Access Review)

- **차수**: 289차 (2026-07-17) · **비파괴 · 코드변경 0** · feat/n236 · master 미접촉
- **★★스펙 미수령·자율 판단(사용자 명시 승인)** — 세부 자율임을 Canonical 2 + ADR 전부 명시 · **§요구 부재 → 완료 조건 판정 불가 · §53/§59 없음**.

### ★최대 발견 — tamper-evident 감사가 이미 REAL
**`menu_audit_log`**(N-152-A): **`hash_chain CHAR(64)`** + old_value/new_value JSON + changed_by + **changed_by_role** + reason + ip_address + user_agent + request_id(AdminMenu.php:123-131) · 주석 "모든 mutation 에 audit_log 기록 + **hash_chain (tamper-evident)**"(:18) · **직전 해시 조회로 실 체인 계산**(:216). **SIEM 도 REAL** — LEEF 2.0 + RFC 5424 Syslog(Compliance.php:225/238·282차).

### ★기술 정밀화·정정 2건 (자기 정정)
| 항목 | 기존 기술 | 정정 |
|---|---|---|
| **선행설계 R3 §49 "hash-chain Ledger 부재→신설"** | 부재 | **hash-chain 패턴은 REAL**(menu_audit_log) · **금전 원장에만 부재** → **"신설"이 아니라 "menu_audit_log 패턴을 금전 원장으로 확장"** |
| **5-1~5-6 "Access Review 차단"** | Critical Gap 대응으로 전 블록이 인용 | **★Access Review 는 부재(grep 0)** — **존재하지 않는 기능에 의존한 설계 순환** → **"Runtime Guard 차단(1차) + Access Review 등재(2차)"로 정정** |

### 관찰 2건 (미확정·미수정)
①**`audit_log` 에 tenant_id 부재**(AdminGrowth.php:158) — 멀티테넌트 감사 조회 시 테넌트 격리 불가 · 플랫폼 전용이면 의도일 수 있음 · **PM 재증명 전 P0 단정 금지**. ②**감사 스키마 편차**(audit_log 5필드 vs menu_audit_log 12필드+체인) — 원인이 "도메인 요구"가 아니라 **"구현 시점·투자 차이"로 보임** → **KEEP_SEPARATE 유지 + menu_audit_log 를 표준으로 승격**(하향 평준화 금지).

### 5-5 위임 판정 (자율)
**만료 세션 정리 Job 부재 = 위생 이슈 · 기능 결함 아님**(만료는 조회 시점 검증 → 보안 영향 없음). 부작용 = 테이블 비대·Review 노이즈. **권장=기존 cron 인프라 재사용**(예약 드레인 워커·shelf_rank_cron·media_gc_cron 선례).

### 자율 판단
①**Decision 감사 볼륨 정책** — 1,448 라우트 × 전 요청은 폭증 → **ALLOW 샘플링 / ★DENY 전량(샘플링 금지·공격 탐지 불가) / 고위험 전량 / CONDITIONAL·STEP_UP·MASKING 전량** ②**hash chain 한계 정직** — append-only 무결성만 주고 **전량 삭제는 못 막음** → **SIEM 외부 반출과 병행해야 실효** ③**Dormant 는 api_key `last_used_at`/`use_count` 재사용**(새 필드 불필요·단 인간 Subject 엔 부재) ④**Review REVOKE 는 실 회수까지 확인**(Review 가 REVOKE 했는데 권한 잔존 = Review 무의미).
- **코드 변경 0**.

---

## AE-289-02 — Rebate 실행계층 선행설계 R1~R5 (정본 9분할 슬롯 아님)

- **경위**: 정본 로드맵 미확인 상태에서 Part 5~9 를 **추정 명명**하여 5개 문서쌍 생성 → 사용자 지시("Part N/9 진행해")도 이 잘못된 라벨에 기반 → **"9분할 완결" 오보고**.
- **실측 정정**: 정본 로드맵은 전 세션 산출물 `CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7` 에 이미 존재 — **1-2 Type / 1-3 Funding / 1-4 Lifecycle / 1-5 Permission / 1-6 Coverage / 1-7 Lint / 1-8 Golden / 1-9 Legacy**. 실제 진척 = **1-1~1-4(4/9)**.
- **조치**: 5개 문서쌍을 **선행설계 R1~R5** 로 재표기(내용·실측 근거는 유효) · PM 이력 오보고 정정 · **RP-001** 등재(재발방지: 후속 파트 착수 전 Part 1 §범위 필독 · 파트 번호 추정 부여 금지). 커밋 d65e61296aa.
- **산출**: R1(Rule/Tier/Calculation) · R2(Eligibility/Enrollment) · R3(Accrual/Ledger/Balance) · R4(Claim/Settlement/Payout) · R5(Recovery/Clawback/Dispute) — 각 Canonical 2종 + ADR. **전부 비파괴·코드변경 0**.

---

## AE-289-10 — EPIC 06-A Part 4-5-3-1-5-8 (Permission 8/8 · 1-5 종결)

- **스펙**: ⚠️ **미수령 — 자율 판단 설계**. 스펙 수령 시 산출물이 양보.
- **산출**: `CANONICAL_DSAR_AUTHORIZATION_STATIC_LINT_RUNTIME_GUARD.md`(E-01~E-12) · `CANONICAL_DSAR_AUTHORIZATION_GOLDEN_DATASET_CERTIFICATION.md`(E-01~E-12) · `ADR_DSAR_REBATE_AUTHORIZATION_LINT_GUARD_CERTIFICATION.md`. **코드 변경 0**.
- **실측 REAL**: CI **GATE 1~5**(`deploy.yml:45` 팬텀자산 / `:48` 라우트+php -l / `:53` rules-of-hooks+no-undef / `:59` 빌드 / `:64` **E2E 스모크(데모 대상)**) · `security-scan.yml:51/56` npm audit+CodeQL · pre-commit **B1~B4**(`:23` .bak / _quarantine / NEXT_SESSION 크기 / **secret-shaped**) · `guard_channel_writeback` 배선 **REAL**(`pre-commit:175`) · `baseline.json`(**sacred_sha**·267차) · e2e 3계층(`package.json:4-6` smoke/render/scenarios·266차).
- **★결함 3건(코드 증명)**: ①🔴 **GUARD-GAP-01 `tools/guard_headerless_getjson.mjs` 호출처 0** — 파일 실재(275차)하나 `.github/`·`.githooks/`·`package.json` 전수 grep **히트 0** = **단 한 번도 자동 실행 안 됨**. 대조군 `guard_channel_writeback`은 `pre-commit:175` 배선 REAL → **배선 가능했는데 이것만 누락**. **인계서의 "REAL" 기록은 파일 실재만 본 서술 → 5-8이 정정**. ②🟠 **GUARD-GAP-02 pre-commit 강제 아님** — CI 미실행(grep 0) + `core.hooksPath`는 **클론별 로컬 config**(새 클론/CI runner는 B1~B4 전부 미실행) + `--no-verify` 우회 명시 → **B4(자격증명 유출 차단)가 opt-in**. ③🟠 **GUARD-GAP-03 권한 Lint/Guard 전무** — bypass list(143조건) 한 줄 추가 = 무인증 공개인데 검사 없음(**279차 무인증 db_restore 경로**).
- **자율 판단**: ①**신설 금지·GATE 확장**(게이트 2벌=정본 소실=288차 가짜녹색 재발) ②**`GuardWiringRule` 메타가드** — 교훈은 "가드 추가"가 아니라 **"가드 배선을 아무도 검사 안 함"** → `tools/guard_*.mjs` 호출처 0 = BLOCK ③**Ratchet**(R0측정→R1 baseline 동결→**R2 신규위반만 BLOCK**→R3 감축) — 즉시 BLOCK 하면 레거시로 마비→**개발자가 Lint를 끔** ④🔴**DENY 우선** — ALLOW는 기능테스트가 커버, **권한의 존재이유는 DENY이고 정상사용 중 실행 안 되므로 명시검증 없이는 영원히 미검증** → **DENY ≥ ALLOW** · `expected_reason` 필수(엉뚱한 이유 DENY=초록인데 고장). 5-7 "ALLOW샘플링·DENY전량"과 동일 원리 ⑤**라우트 자동도출**(281차 `render.mjs` 119라우트 패턴) — 손으로 나열=**신규 라우트 영원히 누락** ⑥**C-1~C-4=100% 완화불가**(99% 막고 1% 뚫리면 그 1%로 전부 뚫림) **단 C-7 Lint Coverage 임계 미설정** — 임계 세우면 **측정가능 규칙만 쓰는 왜곡** ⑦**인증은 커밋 SHA 결속**("작년에 인증"은 증거 아님) ⑧**배선 1줄도 본 세션 수정 안 함**(코드변경 0).
- **정직 표기(인증 못 하는 것)**: 규칙 자체 타당성(설계가 틀리면 **틀린 대로 100% 통과**) · 미설계 영역 · **GATE 5는 데모 대상**(ABAC 실데이터 의존 시 운영과 상이 가능) · RP-001류 절차결함(**절차는 절차로 막음**).
- **인용 검증**: 5건 중 **1건 오차 자기정정**(pre-commit B1 `:21`→**`:23`**).
- **1-5 종결**: 5-1~5-8 **총 코드변경 0**. 관통 판정 = Authorization은 **부재 아닌 존재·분산** → 결론 일관되게 **신설 아닌 통합**. **자기정정 6건**(RP-001 · requirePro 주석351→실측455 · R3 hash-chain "부재"→**REAL**(menu_audit_log) · 설계 순환참조 · 5-2 grep FP 3건 · guard 배선 0).
- **인계 MIGRATION_REQUIRED 누적 12건** — 전부 승인 세션 대상. **본 세션 수정 0**(FP 레지스트리: PM 코드 재증명 전 P0 단정 금지).

---

## AE-289-11 — EPIC 06-A Part 4-5-3-1-6 (Coverage + Gap)

- **스펙**: ⚠️ **미수령 — 자율 판단 설계**.
- **RP-001 준수**: 착수 전 로드맵 확인 — `CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7`("후속 4-5-3-1-2~9 …/**Coverage**/Lint/Golden/Legacy") + 동 §1(후속 블록 엔티티 **`COVERAGE·GAP`** 명시) → **1-6 = Coverage + Gap 확정. 추정 아님**.
- **산출**: `CANONICAL_DSAR_REBATE_COVERAGE_MEASUREMENT.md`(E-01~E-12) · `CANONICAL_DSAR_REBATE_GAP_REGISTRY_REMEDIATION.md`(E-01~E-12 + **Gap 원장 14건**) · `ADR_DSAR_REBATE_COVERAGE_GAP_REGISTRY.md`. **코드 변경 0**.
- **재측정(선행문서 미인용)**: Rebate 부재 **직접 재증명** — `rebate`·`scan-back`·`scanback`·`bill-back`·`billback`·`ship-and-debit`·`MDF`·`co-op`·`coop` **9/9 `backend/src/` 히트 0** → **1-1 판정 유효**. 설계 산출 실측: CANONICAL_DSAR_* **90** · §53 **101**(REBATE 54 + AUTHORIZATION 47) · ADR_DSAR_* **39**.
- **★발견 2건**: ①🔴 **COV-GAP-01 분모 부재** — `grep "§53"` on 5-1 Canonical 2종 = **0**. **요구 목록이 저장소에 없음**(스펙은 채팅에만 존재·컨텍스트 소멸) → **커버리지 원리적 계산 불가**. ②🔴 **COV-GAP-02 자기보고 불일치** — `PM_CHANGE_HISTORY.md:294` "§53 산출 문서 52종 신설" ↔ 실측 `ls DSAR_AUTHORIZATION_*.md` **47**(`git ls-files` 동일 47 = **유실 아님**). 대조군 **REBATE 측은 보고 49 ↔ 실측 49 일치** → 집계는 가능했고 AUTHORIZATION 만 어긋남. **(a)5건 누락 / (b)과대집계 판별 불가**(COV-GAP-01 의존) → **`UNVERIFIED`**.
- **자율 판단**: ①🔴**4축 분리·종합 % 금지**(Design/Implementation/Data/Verification) — 06-A는 **설계 두껍고 구현 0%**, 합치면 "설계 100%"가 "완료 100%"로 읽힘 = **288차 가짜녹색 문서판** ②**측정 블록은 측정 대상 자기보고를 인용하지 않음**(1-1 "부재" 직접 재grep) ③🔴**`source_persisted=false` 요구는 분모 제외** — **세션 컨텍스트는 저장소가 아님**(06-A 소급 시 현 분모 대부분 무효) ④🔴**우선순위 = 운영영향 × 오신뢰(Gap 크기 아님)** — **ABSENT(Rebate 전체)가 최대 Gap이자 최하위**(없는 기능은 오작동 안 함) · **`Mapping.php:212`가 원장 최상위**(운영 중 + **Maker-Checker 가 있다고 믿는 상태로 없음**) · **오신뢰가 결정 인자 — 믿음이 있는 곳에서만 사고가 남** ⑤**`UNVERIFIED` 등재하되 등급 부여 금지**("모르면 P0"도 "모르면 무시"도 틀림) ⑥**`GapAging`** — 등재가 면죄부 되지 않게(방치 = 진짜 실패) ⑦**측정 인프라 신설 금지** — `baseline.json`(기준선 동결) · **`render.mjs` 119라우트 자동도출**(**분모 자동산출 선례 — 06-A가 정확히 이걸 안 해서 D-3/D-4 발생**) 확장.
- **Gap 원장 14건**: DEFECT 4(**G-01 `Mapping.php:212` 승인 중복 미제거→1인 2회로 정족수 충족** · G-02 `Alerting.php:593` 정족수 없음 · G-03 `AdminMenu.php:52-54` fail-open(**주석이 의도 명시 — 결함 아닐 가능성 상당**) · G-04 무게이트 발송) · WIRING 2(G-05 guard 호출처 0 · G-06 pre-commit 미강제) · PARTIAL 4 · UNVERIFIED 4(G-13 분모부재 · G-14 52vs47) · ABSENT 1(G-15 Rebate 전체). **전부 `UNVERIFIED`/미수정 — PM 재증명 대상**.
- **인용 검증**: `Mapping.php:212/214` · `Alerting.php:593` · `AdminMenu.php:52-54` · `PM_CHANGE_HISTORY.md:294` **4/4 일치**.
- **자기 지적**: **COV-GAP-01 이 1-6 자신에게도 적용** — 1-6 스펙도 미수령 → **1-6 커버리지도 계산 불가**. **Gap 14건은 발견된 것이지 전부가 아니며 미발견 수를 0으로 보고하지 않음**.

---

## AE-289-12 — EPIC 06-A Part 4-5-3-1-7 (Lint Certification)

- **스펙**: ⚠️ **미수령 — 자율 판단 설계**.
- **RP-001 준수 + 5-8 중복 우려 해소**: ①`MASTER_REGISTRY:7`("…/**Lint**/Golden/Legacy") ②**선행 블록의 명시 위임** — `DSAR_REBATE_PROGRAM_LIFECYCLE_STATIC_LINT.md:7`("최소 Static Lint (20) — **전체 Certification 은 Part 4-5-3-1-7**") · `:14`("전체 Certification = **Part 4-5-3-1-7**"). → **5-8=Permission(1-5) 한정 · 1-7=06-A 전 블록 통합·인증. 중복 아님. 추정 아님**.
- **산출**: `CANONICAL_DSAR_REBATE_LINT_RULE_REGISTRY.md`(E-01~E-12) · `CANONICAL_DSAR_REBATE_LINT_CERTIFICATION.md`(E-01~E-12·기준 L-1~L-7) · `ADR_DSAR_REBATE_LINT_RULE_REGISTRY_CERTIFICATION.md`. **코드 변경 0**.
- **실측 통합 레지스트리**: 1-4 Lifecycle **Static 20 + Guard 21** · 5-1 Authorization **Static 17 + Guard 23** → **총 81(Static 37 + Guard 44) · 구현 0 · 배선 0 · 전부 `CONTRACT_ONLY`**.
- **★최대 발견 LINT-GAP-01 — 9블록 중 2개만 Lint 영속**: `ls DSAR_*.md | grep -iE "static_lint|runtime_guard"` → **4**(LIFECYCLE 2 + AUTHORIZATION_FOUNDATION 2). **1-1 Master/Scope · 1-2 Type · 1-3 Funding · R1~R5 · 5-2~5-7 · 1-6 = Lint 0**. **81을 '많다'고 읽으면 안 됨 — 81은 2개 블록의 것이고 7개 블록은 0. 금전 계약 근간 3블록(Master/Scope·Type·Funding)에 Lint 규칙이 하나도 없음**.
- **★판정 = 🔴 `NOT_READY` · 인증서 발급 0**: **인증이란 "규칙이 실제로 위반을 막는가"의 확인 — 구현 0이면 확인 대상이 없음**. 0개를 인증하면 **"인증 통과" 문자열만 남고 그게 가장 위험**(5-8 고아 가드가 정확히 그 형태). **구현 0은 실패가 아니라 설계 의도**(전방호환 계약·코드변경 0) — **"인증됨"으로 포장하지 않는 것이 1-7의 임무**.
- **자율 판단**: ①**`impl_status` 3단계**(`CONTRACT_ONLY`/`IMPLEMENTED`/**`WIRED`**) — 합치면 고아 가드 재현. **"구현됨"은 "동작함"이 아님** ②🔴**L-2(고아 규칙) 임계 0 · 최시급** — **고아 규칙은 "규칙 없음"보다 나쁨**(규칙 없으면 아무도 안 믿지만 고아는 "있다"고 믿게 함). **현재 L-2=1** → **이 1건이 규칙 81건 계약보다 시급**. 1-6 결론과 동일 — **위험은 크기가 아니라 오신뢰** ③**`CertificationReadiness` 게이트 — 조건부/임시 인증 금지**(반드시 "인증됨"으로 인용됨). 데이터 헌법 V3 `READY/WARNING/BLOCKED`와 동일 철학 ④**`uncertifiable_blocks` 명시 필드** — 안 적으면 "1-7 통과"가 06-A 전체를 덮는 것으로 읽힘(**실제 2/9**) ⑤**규칙 재작성 0·참조만** — 5-8 규칙은 형식만 다르고 유효 → **정규화 편입**. `OrphanRuleDetector`=5-8 `GuardWiringRule` **동일 정본** · `LintRuleRatchet`=5-8 R0~R3 **동일 정본**. 재정의 금지 ⑥**미달은 1-6 Gap 원장 연결 — 별도 원장 금지**(원장 2벌=정본 소실) ⑦**중복 대조 `UNVERIFIED`** — 81 문면 대조 미수행 → **"중복 없음" 보고 안 함**.
- **★D-10 — 1-6 D-3의 실증**: 1-6은 §53 요구목록 부재로 **커버리지 계산 불가**였으나 **Lint 는 분모(81)가 저장소에서 도출됨**(1-4·5-1이 §53로 영속). **같은 EPIC 안에서 규칙을 문서로 남긴 블록은 인증 가능, 남기지 않은 블록은 인증 불가 — 차이는 능력이 아니라 영속 여부**. LINT-GAP-01 이 그 대가.
- **인용 검증**: 위임 문구 2개소(`:7`·`:14`) · 규칙 수 헤더 4/4(20/21/17/23) · 합계 81 검산 — **전부 일치**.
- **1-7이 인증 못 하는 것**: 규칙 타당성(**틀린 규칙도 100% 배선 가능**) · 7개 블록(범위 밖) · **미작성 규칙(Lint 가 스스로 못 잡음 — 1-1/1-2/1-3 의 Lint 0 을 Lint 로 발견 불가 · 사람이 세야 했고 1-7이 세었다)** · **1-7 자신**(스펙 미수령 → 요구목록 저장소 부재 · COV-GAP-01 소급).

---

## AE-289-13 — EPIC 06-A Part 4-5-3-1-8 (Golden Dataset)

- **스펙**: ⚠️ **미수령 — 자율 판단 설계**.
- **RP-001 준수 + ★위임 부재 정직 기록**: `MASTER_REGISTRY:7`("…/Lint/**Golden**/Legacy") = 로드맵 슬롯 확인. **그러나 1-7과 다름** — `grep "4-5-3-1-8"` 전수 **0건**. 1-7은 선행 블록이 명시 위임했으나(*"전체 Certification 은 Part 4-5-3-1-7"*) **1-8을 지목한 블록은 없음**(회귀게이트들은 **1-9·5-8**로 위임). → **1-8의 근거는 로드맵 슬롯뿐 — 숨기지 않고 기록**.
- **산출**: `CANONICAL_DSAR_REBATE_GOLDEN_DATASET_REGISTRY.md`(E-01~E-12) · `CANONICAL_DSAR_REBATE_REGRESSION_BASELINE_CERTIFICATION.md`(E-01~E-12·기준 GD-1~GD-6) · `ADR_DSAR_REBATE_GOLDEN_DATASET_REGRESSION_BASELINE.md`. **코드 변경 0**.
- **★분리 판정(1-7처럼 한 마디로 안 덮음)**: **Rebate Golden = 🔴`NOT_APPLICABLE`**(구현 0·테스트 대상 없음) · **Preservation Golden = 🟠`PARTIAL`**(**e2e 3계층 REAL**·GATE 5 배선 — "없음"으로 보고하면 **266차·281차 자산 부정 = 무후퇴 위반**) · **보존 목록 무결성 = 🔴`FAILED`**. **Golden 은 두 종류 — Rebate 는 불가능하나 Preservation 은 지금 가능**(기존 시스템은 운영에서 돌고 있음).
- **분모(§53 영속·1-7과 동일 구조)**: 1-4 회귀게이트 보존대상 ~14(menu_defaults·kr_fee_rule·free_coupons·catalog_writeback_job·auto_campaign·action_request·ensureTables 73핸들러·audit_log 12·baseline.json·GENIE_ENV 등) · 5-1 ~18(TeamPermissions·api_key RBAC·PlanPolicy·requirePro/requirePlan·index.php bypass·authedTenant 64·RLS·IDOR·EnterpriseAuth·MFA·AES-256-GCM·**guard_headerless_getjson**·Impersonation 등).
- **★결함 3건(보존 목록 자체를 검증)**: ①🔴**GOLDEN-GAP-01 팬텀 보존대상** — 5-1 회귀게이트 "보존 대상(회귀 0 검증 대상)"에 **`tools/guard_headerless_getjson.mjs`(275차) 포함**인데 **호출처 0**. **실행되지 않는 것은 회귀할 수 없음 → 회귀 0 검증이 공허하게 참 · 골든 붙여도 항상 통과 = 초록인데 아무것도 안 지킴**. **5-8 고아가드의 2차 피해 — 회귀게이트가 그것을 보호막으로 계산에 넣고 있었음**. **제거 아닌 배선(MR-1-7-05) 선행**(지우면 275차 의도 소실=무후퇴 위반) ②🔴**GOLDEN-GAP-02 "실측" 351이 실측 아님** — 출처 추적 = **`UserAuth.php:329` 286차 코드 주석**("기존 351개 호출부"). 289차 실측 **A=498 · B=467 · C=458**(5-6 측정 455·방법 미기록) → **어느 방법으로도 351보다 100+ 많음 · 회귀범위 351로 잡으면 ≈30% 누락**. **5-6이 이미 잡은 오류의 재발 — 정정이 5-1 §53 에 전파 안 됨** ③🔴**GOLDEN-GAP-03 방법 없는 수치는 골든 아님** — **정직한 grep 3개가 498/467/458 — 셋 다 옳음**(세는 대상이 다를 뿐). **method 없으면 455와 498이 모순으로 보이나 둘 다 옳을 수 있음**. **골든의 정의는 재현 가능 — 재현 불가 기준선은 골든이 아니라 스냅샷**. 다음 세션이 같은 숫자 못 내면 **"회귀"인지 "다르게 셈"인지 구분 불가 → 골든이 경보 아닌 소음 → 소음은 결국 꺼짐**. **351이 3개 차수를 살아남은 방식이 정확히 이것**(명령이 없어 재현·반증 불가). **1-6 E-03 method 필수 규정의 실증**.
- **자율 판단**: ①**`VACUOUS` verdict 신설** — 팬텀 대상 골든은 PASS 아님. **"통과"로 기록하면 팬텀이 영원히 안 보이고 커버리지 %가 거짓** ②**`CorrectionPropagation`** — **수치를 문서에 복사하지 않고 `MeasurementMethod` 참조**(틀린 값 복사본이 살아있으면 한 곳 고쳐도 정본 불명) ③**순서 = 목록 먼저**(팬텀제거→stale정정→method도입→골든작성→Rebate골든). **1·2 건너뛰고 4로 가면 골든이 팬텀·stale 을 정본으로 굳힘 — 틀린 목록으로 만든 골든은 틀린 것을 고정** ④**러너 신설 금지** — e2e/scenarios 확장 · `PhantomTargetDetector`=**5-8 `GuardWiringRule` 동일 정본** · `GoldenCertificationRun`=**5-8 동일 정본**. 재정의 금지 ⑤🔴**351을 고치지 않음** — **코드변경 0을 문서 정정에도 적용**. §53은 1-4/5-1 블록 산출물이고 **측정 블록이 남의 산출물을 말없이 고치면 측정과 수정의 경계가 무너짐** → 보고 후 승인 세션 인계.
- **인용 검증 5/5 일치**: `UserAuth.php:329`(351 출처) · 5-1 "호출부 351개" · 1-9 위임 2건 · 1-8 위임 부재(0).
- **1-8이 인증 못 하는 것**: 기대값 타당성(**설계 틀리면 틀린 대로 PASS**) · **보존 목록의 완전성**(1-4/5-1 열거가 전부라는 보장 없음 · **누락 검사 미수행**) · **데모/운영 차이**(GATE 5는 데모 대상 — 운영에서만 나는 회귀 못 잡음) · **1-8 자신**(위임도 스펙도 없음).
