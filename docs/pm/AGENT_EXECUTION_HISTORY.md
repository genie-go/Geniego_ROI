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
- **§53 산출 문서 53종**: 본 커밋은 **Canonical 2 + ADR + PM/Agent 이력**까지. **나머지 개별 DSAR 문서는 미생성**(1-4 v2.1 보정과 동일 패턴으로 후속 보정 필요).
- **§59 완료 보고(49항목)**: 미제출(후속).

### 미확정 관찰 (수정 안 함)
①**인가 판정 100+ 지점 분산·중앙 PDP 부재**(275차 헤더리스 getJson 401 회귀 2차 재발이 실현 사례) → 5-6. ②**PlanPolicy↔planMenuPolicy.js 수동 동기화**(286차 rank 맵 붕괴 사고로 드리프트 실현) → Reconciliation. ③**team_role fail-open**(미설정=owner·AdminMenu.php:52-54) — Deny-by-default와 상충하나 레거시 호환 의도로 보임 · **PM 재증명 전 P0 단정 금지** → 5-2 판정.

---

## AE-289-02 — Rebate 실행계층 선행설계 R1~R5 (정본 9분할 슬롯 아님)

- **경위**: 정본 로드맵 미확인 상태에서 Part 5~9 를 **추정 명명**하여 5개 문서쌍 생성 → 사용자 지시("Part N/9 진행해")도 이 잘못된 라벨에 기반 → **"9분할 완결" 오보고**.
- **실측 정정**: 정본 로드맵은 전 세션 산출물 `CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7` 에 이미 존재 — **1-2 Type / 1-3 Funding / 1-4 Lifecycle / 1-5 Permission / 1-6 Coverage / 1-7 Lint / 1-8 Golden / 1-9 Legacy**. 실제 진척 = **1-1~1-4(4/9)**.
- **조치**: 5개 문서쌍을 **선행설계 R1~R5** 로 재표기(내용·실측 근거는 유효) · PM 이력 오보고 정정 · **RP-001** 등재(재발방지: 후속 파트 착수 전 Part 1 §범위 필독 · 파트 번호 추정 부여 금지). 커밋 d65e61296aa.
- **산출**: R1(Rule/Tier/Calculation) · R2(Eligibility/Enrollment) · R3(Accrual/Ledger/Balance) · R4(Claim/Settlement/Payout) · R5(Recovery/Clawback/Dispute) — 각 Canonical 2종 + ADR. **전부 비파괴·코드변경 0**.
