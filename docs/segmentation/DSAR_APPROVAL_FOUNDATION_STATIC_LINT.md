# DSAR — 최소 Static Lint (§46)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-1 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 요구 분모: [REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md](REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) · ADR: [ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_FOUNDATION.md)
> 전체 Lint 인증은 **`4-5-3-1-5-3-10`** 에서 완성(스펙 §46 명시). 본 블록은 **계약만**.

## §0. 🔴 최우선 규칙 — 규칙을 만들되 "있다"고 말하지 말 것

**289차 ① 실측 교훈**(`guard_headerless_getjson`): 275차에 가드 **파일을 만들고 배선하지 않아** 이래로
**한 번도 실행되지 않았고**, 그 상태로 **4개 문서가 "CI 가드로 보호됨"을 전제**했다.
**하나의 미배선 파일이 4층에서 "보호가 있다"는 신뢰를 만들었다** = **오신뢰의 복리**.

> 🔴 **본 문서의 규칙은 전부 `CONTRACT_ONLY`(계약) 이며 `impl_status = 0`, `wired = 0` 이다.**
> **`IMPLEMENTED` 와 `WIRED` 를 합치지 말 것**(1-7 규칙) — **파일 존재는 배선 증거가 아니다.**
> **배선 없는 규칙은 실효 0** — 이 문서를 근거로 "승인 Lint 가 있다"고 서술하면 그 순간 가짜녹색이다.

**배선 선례(재사용 대상)**: `.githooks/pre-commit` **G12**(`tools/guard_channel_writeback.mjs`:175) ·
**G15**(`tools/guard_headerless_getjson.mjs` · 289차 배선) · CI `repo-guards`(`.github/workflows/security-scan.yml` · 289차).
**신규 러너 신설 금지** — 위 배선 지점을 확장한다(Golden Rule).

## §1. 규칙 카탈로그 (스펙 §46 · **19 규칙** · 전부 `CONTRACT_ONLY`)

| ID | 규칙 | 차단 대상 | 현행 위반(실측) |
|---|---|---|---|
| **AL-01** | Approval Request 없이 Approval Case 생성 | Case 고아 | **판정 불가**(Case 개념 부재) |
| **AL-02** | Resource Type 없는 Approval Request | 대상 불명 승인 | 🔴 `action_request` — `action_json` **blob**(Db.php:592-600) |
| **AL-03** | Requested Action 없는 Approval Request | 행위 불명 승인 | 🔴 동상 |
| **AL-04** | Tenant 없는 Approval Request | 테넌트 격리 붕괴 | 🔴 **`admin_growth_approval`**(AdminGrowth.php:142-149 · `tenant_id` 컬럼 없음) |
| **AL-05** | Environment 없는 Production Approval Request | prod/demo 혼입 | 🔴 전 도메인(승인 행에 env 없음 · `Db::env()` Db.php:46,57 는 전역 분기) |
| **AL-06** | Legal Entity 없는 Financial Approval Request | 법인 귀속 불명 | **판정 불가**(Legal Entity 레지스트리 부재) |
| **AL-07** | Currency 없는 Financial Amount | 통화 없는 금액 | 🔴 `action_json` blob 내 금액에 통화 강제 없음 |
| **AL-08** | Request Version 없는 변경 승인 | 변경 추적 불가 | 🔴 **Version 개념 부재**(grep 0) |
| **AL-09** | Resource Snapshot 없는 Decision | 승인 대상 재현 불가 | 🔴 **Snapshot 부재**(유사물=`mapping_change_request` 값 복사 1건) |
| **AL-10** | Actor Authorization Snapshot 없는 Decision | 결정 시점 권한 재현 불가 | 🔴 **전면 부재**(§4.6 미충족) |
| **AL-11** | Policy Version 없는 Approval Requirement | 승인 근거 재현 불가 | 🔴 **Policy Version 부재** · `PlanPolicy` = PHP const |
| **AL-12** | Decision Reason 없는 Rejection | 거절 사유 불명 | 🔴 Reason 저장 구조 부재 |
| **AL-13** | Immutable Hash 없는 Final Decision | 사후 변조 탐지 불가 | 🔴 승인 도메인 해시 부재(**검증형 선례**=`SecurityAudit::verify():56-68`; `menu_audit_log.hash_chain`(AdminMenu.php:123-131)은 쓰기만·`verify()` 0 → tamper-evident 아님) |
| **AL-14** | **Approval Status 직접 덮어쓰기** | 상태 이력 소실 | 🔴 **전 도메인** — `UPDATE ... SET status=?`(Alerting.php:653 · AdminGrowth.php:1313-1343 · Catalog.php:2341-2364) |
| **AL-15** | **Decision Update·Delete 사용** | Append-only 위배(§4.9) | 🔴 동상 |
| **AL-16** | Idempotency 없는 Financial Approval Request | 중복 지급 승인 | 🔴 승인측 부재(**선례**=`dedup_key` UNIQUE Db.php:257-281 · `Paddle.php:343`) |
| **AL-17** | **Execution Binding 없는 승인 후 실행** | 승인↔실행 미연결 | 🔴 **`Alerting::executeAction`**(Alerting.php:601-660) — 게이트 자체가 없음 |
| **AL-18** | Approval Consumption 기록 없는 Single-use 실행 | 재사용 탐지 불가 | 🔴 Consumption 부재 |
| **AL-19** | **기존 Approval Foundation 중복 생성** | 5번째 승인 엔진 | 🔴 **현재 4벌 존재**([중복 감사](DSAR_APPROVAL_DUPLICATE_IMPLEMENTATION_AUDIT.md)) |

## §2. ★AL-19 는 지금 당장 유효한 유일한 규칙

다른 18 규칙은 **Canonical 구현 이후**에나 검사 대상이 생긴다(현행엔 검사할 엔티티가 없다).
**AL-19 만은 지금 켤 수 있다** — 그리고 **본 블록 자신이 첫 검사 대상**이다.

> **본 블록이 `APPROVAL_*` 테이블을 신설했다면 AL-19 를 스스로 위반했을 것이다.**
> 본 블록이 **코드변경 0** 인 이유가 여기에 있다 — 5번째 승인 엔진을 만들지 않았다.
> 통합 방향은 **`Mapping::approve`+`actorId` 를 공용 추출**(중복 감사 §3).

## §3. 켜는 순서 (Ratchet · 배선 시)

**한 번에 19 규칙을 켜면 기존 위반 대량 검출로 전 커밋이 막힌다** — 283차 의존성 스캔이
`continue-on-error`(리포트 전용)인 것과 같은 이유다(**기존 백로그가 있으면 즉시 차단이 옳지 않다**).

1. **AL-19**(신규 중복 신설 차단) — 위반 0 → **즉시 차단 게이트 가능**
2. Canonical 구현 후 **신규 코드에만** AL-02·03·04·05·07 적용(Ratchet R2 = 신규 위반 유입 0)
3. 기존 위반은 **마이그레이션 진척에 따라 단계 해제**
4. 최종 인증 = **`5-3-10`**

> 🔴 **각 단계에서 "리포트 전용으로 두는 것"과 "차단하는 것"을 명시 구분하라.**
> 리포트 전용 규칙을 "가드가 있다"로 서술하면 **275차 사고의 재현**이다(289차 ④ 실측 교훈).

## §4. 규칙

**본 블록 Lint 구현·배선 0.** 위 19 규칙은 **전부 계약**이며 **`5-3-10` 에서 인증**한다.
**규칙 등록 시 `source_doc`(영속 문서 경로) 필수**(1-7 `source_persisted` 원칙) — 본 문서가 그 경로다.
