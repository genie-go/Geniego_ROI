# DSAR — Manager Conflict (§45)

> EPIC 06-A Part 4-5-3-1-5-3-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_2_VERBATIM.md) §45 · ADR: [ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md](../architecture/ADR_DSAR_REBATE_REPORTING_LINE_MANAGER_RELATIONSHIP.md)

**본 문서 = §45 `MANAGER_CONFLICT` 의 필수 필드 축(15).** Conflict Type 축(19)은 [DSAR_MANAGER_CONFLICT_TYPE.md](DSAR_MANAGER_CONFLICT_TYPE.md) · 우선순위는 [DSAR_MANAGER_CONFLICT_RESOLUTION.md](DSAR_MANAGER_CONFLICT_RESOLUTION.md).

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `manager_conflict` 테이블 | **grep 0** | `ABSENT` |
| **충돌 개념 자체** | Manager 관계 축이 레포에 **존재한 적이 없다**(`manager_id`·`reports_to`·`supervisor_id` **0** · **git 삭제 이력도 0**) | `ABSENT` |
| 충돌 해소 결과 기록 | `resolved_by`·`resolved_at` **grep 0** | `ABSENT` |
| 인접 — 승인 감사 선례 | `pm_audit_log` = `tenant_id NOT NULL`+`entity`+`diff_json`+3인덱스+append-only(migration `20260526_168_008:2-19`) | `LEGACY_ADAPTER`(evidence 저장 패턴) |
| 인접 — 해시체인 선례 | `menu_audit_log.hash_chain` SHA-256 prev-chain(`AdminMenu.php:128`·생성 `:182-197`·`lastHash():214-219`) — 🔴 쓰기 체인만 실재·`verify()` 0·preimage ts(`:195`) 소실 → tamper-evident 아님; 검증형 정본 = `SecurityAudit::verify():56-68` | `LEGACY_ADAPTER`(**알고리즘만**) |

### ★축 주의 — **15필드 전부 `ABSENT`**(규율 규칙 10)

🔴 **충돌할 복수 관계 자체가 없다.** `MANAGER_CONFLICT` 는 "두 개 이상의 후보 Manager"를 전제하는데, 현행은 **`team.manager_user_id` 단일 컬럼**이라 **두 번째 후보를 담을 자리가 없다**. 따라서 15필드는 **"미구현"이 아니라 무대상**이다 — **§45 는 §5(Manager Relationship) Canonical 선언에 선행될 수 없다.**

## 1. 원문 전사 + 판정 — **원문 15종**

| # | 원문 항목명 | 현행 대조 | 판정 |
|---|---|---|---|
| 1 | manager_conflict_id | 부재 · ID 생성 선례 = `self::genId('dep')`(`Handlers/PM/Dependencies.php:35`) | `ABSENT` |
| 2 | subordinate reference | 부재 · 직원 아이덴티티 = **`app_user` 뿐**(병합/정규화 계층 0) | `ABSENT` |
| 3 | candidate managers | 🔴 **후보 계산 코드가 레포에 없다** — `resolveApprover`/`approval_chain`/`routeApproval` **0**(`approver` 2건은 **에러 메시지 문자열** `Mapping.php:248`,`:280`) | `ABSENT` |
| 4 | conflict type | 19종 전부 부재 → [DSAR_MANAGER_CONFLICT_TYPE.md](DSAR_MANAGER_CONFLICT_TYPE.md) | `ABSENT` |
| 5 | source systems | 🔴 **manager 보유 소스 = 0개**(HRIS/ERP/Directory 42항목 전부 부재 · SCIM `manager` 확정 부재) | `ABSENT` |
| 6 | effective period | **`valid_from`/`valid_to`/`effective_to` grep 0** · **§38 Business/System 이중 시간축 전례 0** | `ABSENT` |
| 7 | affected reporting line | Reporting Line 축 0(스펙 표제 도메인 `rebate` 전역 0) | `ABSENT` |
| 8 | affected approval cases | 🔴 승인 4종이 **Manager 를 참조하지 않는다** — 4경로 전량 "호출자가 곧 승인자" | `ABSENT` |
| 9 | severity | 부재 · 인접 = `Alerting` 심각도(마케팅 알림 도메인) | `ABSENT` |
| 10 | resolution policy | 부재 → §46 10단계 | `ABSENT` |
| 11 | resolved manager reference | 부재(#3 과 동근) | `ABSENT` |
| 12 | resolved_by | 🔴 **actor 표준 부재** — `Mapping::actorId:36-53` 만 REAL(3분기·fail-closed) · `Alerting::actor:33-36` 은 **`X-User-Email` 헤더 위조가능** | `ABSENT`(**아래 규칙 ★**) |
| 13 | resolved_at | 부재 · 🔴 `AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 **이력을 물리 소멸**시키는 반례 존재 | `ABSENT` |
| 14 | status | 부재 · ⚠️ **`is_active` 를 재사용하지 마라**(계정 상태 · `NOT NULL DEFAULT 1` → **미지가 자동 "가용" = fail-open**) | `ABSENT` |
| 15 | evidence | 부재 · 저장 선례 = `pm_audit_log.diff_json`(migration `…168_008:13`) | `ABSENT`(선례는 `LEGACY_ADAPTER`) |

**실측 개수: 15 / 15 전사.** 커버리지 = `ABSENT` 15 · 커버 0.

## 2. 규칙

- 🔴 **§45 는 §5 Canonical Manager Relationship 선언 이후에만 의미를 갖는다.** 후보가 1개도 없는 상태에서 Conflict 테이블만 만들면 **영원히 0행 = `VACUOUS`** 이며, 이는 288차 `ok=>true` 위장·5-3-3-1 D-14 와 **동형인 가짜 녹색**이다.
- 🔴 **#3/#11 후보 계산은 "미구현"이 아니라 부재다.** `Mapping::approve` 를 후보 계산기로 오독 금지 — **정족수(숫자)만 세고 적격 술어가 0**이다(`Mapping.php:287`). 🔴 **유일 생산자 `:210` 이 `required_approvals` 를 리터럴 `2` 로 하드코딩** → 요청자·금액·위험도 무엇에도 반응하지 않는다. **"컬럼이 있다 → 요건 모델이 있다"는 규칙 7 위반**(= `menu_defaults.version = 리터럴 'baseline'` 과 동형).
- ★ **#12 `resolved_by` 는 `Mapping::actorId:36-53` 을 표준으로 삼아라**(3분기 `apikey:{id}`/`user:{email}`/`user:#{id}` 폴백 · **미확인 → null → 403 fail-closed** `:187-190`·`:246-250`).
  🔴 **`Alerting::actor:33-36` 을 참조 구현으로 삼지 마라** — `X-User-Email` 헤더 / `?actor=` 쿼리 / `'unknown'` 폴백 = **289차 G-01 이 `Mapping` 에서 고친 바로 그 위조가능 패턴**. `action_request` 생산자 0 이라 **현재 도달 불가(VACUOUS) = 잠복 결함**이며, **생산자를 하나 붙이는 순간 위조가능 승인이 활성화된다.**
  ⚠️ **등급 미부여 관찰**: 동일인이 API키/세션 경로로 접근하면 **actor 문자열이 달라져** `Mapping.php:279` dedup·`:268` 자기승인 차단이 **경로 전환으로 우회 가능**. **실 경합 경로 미검증.**
- ★ **#15 evidence 저장은 `pm_audit_log` 패턴을 확장하라**(`tenant_id NOT NULL`+`diff_json`+append-only). 🔴 **`menu_audit_log` 스키마는 복제 금지 — `tenant_id` 가 없다**(`lastHash():214-219` 에도 tenant 술어 없음). **해시체인 알고리즘만 이식하고 `WHERE tenant_id=?` 를 반드시 추가하라.** 🔴 **단 `menu_audit_log` 는 쓰기 체인만 실재하고 검증기(`verify()`)가 0**이며 preimage `ts`(`:195`)가 INSERT 컬럼에 없어 `created_at` DB DEFAULT 가 덮어 재계산 불가 → tamper-evident 아님. 검증형 정본 = `SecurityAudit::verify():56-68`.
- ★ **#13 `resolved_at` 불변성**: `AgencyPortal.php:304`·`:381` 이 `revoked_at=NULL` 로 이전 해지 시각을 소거하는 것은 **§55 "과거 Snapshot 대체 금지"의 정면 반례**다. **이 패턴을 답습하지 마라.**
- ⚠️ **Migration 경로 없음** — `backend/migrations/` 는 **172차 정지**(21파일) → 신규 스키마는 `ensureTables` 멱등 `CREATE TABLE IF NOT EXISTS`+`try{ALTER}catch{}` 경유. 🔴 **`ensureTables` 는 테이블 생성만 하고 데이터 변환·백필을 하지 않는다** → §40 Retroactive Correction 집행 수단 없음. **MySQL/SQLite 두 방언 수기 중복 작성 의무.**
</content>
