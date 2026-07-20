# DSAR — JIT Access Governance: 상승 조정대사 (APPROVAL_JIT_RECONCILIATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_RECONCILIATION`(SPEC §23)은 하나의 JIT 상승 수명에서 **선언·부여·사용·기록 4계층이 일치하는지 대사(reconcile)** 하는 엔티티다. SPEC §23이 비교하는 4축:

| 비교축 | 출처(SPEC) | 의미 |
|---|---|---|
| Requested Access | Elevation Request(§3) | 요청한 Role/Permission/Scope |
| Granted Access | Approval/Assignment(§7·§10) | 실제 부여된 권한 |
| Runtime Usage | Runtime Monitoring(§13) | 실제 사용된 권한/API/scope |
| Snapshot | Elevation Snapshot(§25) | 부여 시점 불변 기록 |

4축이 어긋나면(요청>부여, 부여>사용=과다부여, 사용>부여=escalation) 최소권한(JEA) 위반·Drift(§21)·Guard(§28) 신호로 연결된다. 즉 "요청한 것 = 준 것 = 쓴 것 = 기록된 것"의 등식을 감사한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT file:line) |
|---|---|---|
| elevation 대사 엔진(4축) | **ABSENT** | GT② §2 "Reconciliation" 계층 grep 0·"JIT Analytics/Risk = ABSENT" |
| Requested 원장(Request) | ABSENT | Request Registry ABSENT — `access_request`는 DSAR/AgencyPortal뿐(GT② §2) |
| Granted 원장(TTL grant) | 공백 | `acl_permission` TTL 컬럼 부재 `TeamPermissions.php:152`(GT② §2) |
| Runtime Usage 관측 | ABSENT | Session-entitlement projection 없음·ACL 매요청 DB조회(GT② §2) |
| Snapshot(불변 기준) | PARTIAL(선례) | AccessReview append-only 이력 `AccessReview.php:62-80,:219-222`(GT① §4-E) |
| 불변 증거 저장소 | PRESENT | SecurityAudit 해시체인 `SecurityAudit.php:12-53`·verify `:56-68`(GT① §4-F) |

→ **elevation 4축 대사는 순신규(ABSENT)**. 비교 4축(Requested/Granted/Runtime/Snapshot) 중 3축의 원장 자체가 미구현이라 대사 대상이 존재하지 않는다.

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **입력**: 동일 elevation ID의 Request(§3)·Grant(§10)·Runtime Usage(§13)·Snapshot(§25) 4레코드.
- **출력**: 대사 결과 `MATCHED / OVER_GRANTED / UNDER_USED / ESCALATED`. OVER_GRANTED(부여>사용)=JEA 위반 경고, ESCALATED(사용>부여)=Runtime Guard(§28) Scope/Permission Escalation 차단.
- **제약**: Snapshot은 Immutable(§33 Snapshot Integrity) 기준선 — 대사는 Snapshot을 정본으로 삼음. Tenant Isolation(§33). 파생·임의값 금지(AccessReview 파생분류 `AccessReview.php:87-122` 선례). 대사 불일치는 SecurityAudit 불변 체인(`SecurityAudit.php:12-53`)에 증거 기록.
- **선행 의존**: Request Registry·Grant Ledger·Runtime Monitoring·Snapshot 4자가 모두 실 구현되어야 대사 성립(4축 중 하나라도 부재 시 대사 불능).

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거(GT②) | 분리 사유 |
|---|---|---|
| **정산 recon** `PgSettlement.php` | GT② B-8 | 결제/정산 대사 — elevation reconciliation 아님 |
| `kr_recon_ticket` `Db.php:939` | GT② B-8 | 정산 티켓 대사 테이블 — 권한 grant 대사 아님 |
| menu 감사체인 `menu_audit_log` | GT② B-8·B-10 | 메뉴 감사(장식·verify 별도) — elevation snapshot/evidence 대사 아님 |

→ "reconciliation/recon" 어휘가 정산 도메인과 겹치나 **PG 정산 대사(금액)**와 별개. elevation reconciliation은 요청↔부여↔사용↔스냅샷 **권한 등식** 감사이지 금전 정산이 아니다(흡수·개명 금지).

## 5. 판정 (NOT_CERTIFIED · ABSENT-순신규 · 선행의존)

- **판정 = ABSENT(순신규)**. elevation 4축 대사 엔진은 grep 0(GT② §2). 재활용 substrate = Snapshot 앵커가 될 AccessReview append-only 이력(`AccessReview.php:62-80`)·SecurityAudit 불변 체인(`SecurityAudit.php:12-53`) — **확장(Extend)** 대상.
- **최대 공백**: 4축 중 Requested/Granted(TTL)/Runtime 3축 원장 부재(GT② §2·`TeamPermissions.php:152`) → 대사 자체 불성립.
- **선행 의존**: Request Registry·Grant Ledger·Runtime Monitoring·Snapshot 4자 실 구현 후(BLOCKED_PREREQUISITE, ADR §4).
- **NOT_CERTIFIED**: 코드 변경 0. 본 DSAR은 계약 확정용 설계 명세.
