# DSAR — Database Constraint 계약 (Part 3-17 §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §32)

Compliance & Regulatory Governance 데이터 계층은 5개 불변식(Constraint)을 DB 레벨에서 강제해야 한다:

- **C-1 Immutable Evidence** — 컴플라이언스 증거(evidence) 레코드는 append-only. 수집 후 UPDATE/DELETE 경로 부재·위변조 탐지.
- **C-2 Immutable Snapshot** — 특정 시점 컴플라이언스 자세 스냅샷은 발행 후 변경 불가.
- **C-3 Regulation Version Integrity** — 규정(regulation) 버전 단조 증가·중복 불가·참조 무결성(FK).
- **C-4 Control Mapping Integrity** — 규정↔통제(control) 매핑의 완결성·고아 매핑 금지·양방향 참조 무결성.
- **C-5 Tenant Isolation** — 모든 compliance 레코드는 tenant 경계 밖 접근 불가.

## 2. 라이브 substrate 매핑

| SPEC 계약 | 실 substrate | file:line | 상태 |
|---|---|---|---|
| C-5 Tenant Isolation | 인증 키 tenant_id 로 `X-Tenant-Id` 무조건 덮어쓰기·strict fail-closed | `index.php:600-619` | **PRESENT(재사용)** |
| C-5 감사 스코프 강제 | auditScope 세션서버도출(admin→전역·enterprise→자기테넌트·그외 false) — 쿼리/헤더 지정 불가 | `Compliance.php:198-209`·`:200-206` | **PRESENT(재사용)** |
| C-1/C-2 Immutable | SecurityAudit append-only 해시체인(prev_hash→hash_chain·UPDATE/DELETE 경로 없음)·검증 `verify()` | `SecurityAudit.php:14-68` | **PRESENT(확장 기반)** |
| C-1 보조(관리 감사) | AdminMenu 변경 감사 hash_chain append | `AdminMenu.php:182-218` | PARTIAL(비-tamper-evident·아래 4장) |
| C-3 Regulation Version | (규정 버전 테이블) | — | **ABSENT** |
| C-4 Control Mapping | (규정↔통제 매핑 테이블) | — | **ABSENT** |

compliance/regulation/control_map/assessment/attestation/evidence 테이블은 grep 0. 현 DB 는 단일노드 PDO 싱글톤(`Db.php:20-21`)·self-healing `ensureTables` 패턴(`Db.php:308-321`·`:330-358`)으로만 스키마를 관리한다.

## 3. 설계 계약(신설 시)

1. **C-5** 는 신규 compliance 테이블에 `tenant_id NOT NULL` + 전 쿼리 tenant 술어를 강제하고, 라이브 tenant 주입 불변식(`index.php:600-619`)과 감사 스코프 서버도출(`Compliance.php:200-206`)을 데이터 계층까지 연장한다(신규 예외 경로·헤더 지정 금지).
2. **C-1/C-2** 는 `SecurityAudit.php:14-68` 의 append-only + 해시체인(genesis→prev_hash 연쇄, `verify()` `:56-68` 변조탐지)을 evidence/snapshot 테이블로 **확장**한다. 별도 tamper-evident 엔진 신설 금지(중복).
3. **C-3/C-4** 는 순신설 — version 컬럼 UNIQUE + 단조성 게이트, 매핑 FK + 고아 금지 제약. 현 self-healing 경로(`Db.php:308-321`·`:330-358`)와 동일 방식으로 진입해야 하며 별도 스키마 관리자 신설 금지.

## 4. KEEP_SEPARATE / 주의

- ML 위험/모니터링(`Risk.php:12`·`:149-152`·`ModelMonitor.php`)은 compliance evidence 봉인과 무관 — 병합 금지.
- `AdminMenu.php:182-218` 은 hash_chain 을 쓰지만 preimage 에 매 write 갱신 `ts`(`:195`)를 포함하고 재계산 verify 경로가 없어 **tamper-evident 아님**. Immutable Evidence 정본은 반드시 `SecurityAudit::verify()`(`SecurityAudit.php:56-68`) 계약을 상속해야 하며, menu_audit_log 를 증거 무결성 기반으로 오인용 금지.

## 5. 판정

**PARTIAL.** Tenant Isolation(C-5)은 라이브 실재(`index.php:600-619`·`Compliance.php:198-209`), Immutable(C-1/C-2)은 SecurityAudit 해시체인(`SecurityAudit.php:14-68`)을 확장 기반으로 재사용 가능. Regulation Version Integrity(C-3)·Control Mapping Integrity(C-4)는 대상 테이블 자체가 없어 **순신설**. NOT_CERTIFIED · 코드 변경 0 · 실 제약 신설은 선행 Part1~3-16 인증 + RP-track 조건.
