# DSAR — JIT Access Governance: JIT 접근 등록부 (APPROVAL_JIT_ACCESS_REGISTRY)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_9_JIT_ACCESS_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_JIT_ACCESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_JIT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_JIT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_JIT_ACCESS_REGISTRY`(SPEC §1-1·§2)는 모든 JIT 접근 상승의 **중앙 등록부(Grant Ledger)** 다. 발급된 시한부 grant를 요청·승인·런타임·회수 수명주기와 함께 조회 가능한 형태로 보관하고(SPEC §2), 색인축(SPEC §34: Request ID·Requester·Target Role·Status·Risk Level·Session·Approval·End Time)으로 열람·감사한다. 핵심 성질은 **영속(standing) 권한이 아니라 시간박스 grant를 얹는 일시 레이어**이며(ADR §D-1), 무기한 grant는 거부한다(TTL 필수, ADR §D-1).

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| substrate | 판정 | 근거(GT 등장 file:line) | 재활용 방식 |
|---|---|---|---|
| Grant Ledger / TTL 전용 원장 | **ABSENT** | GT② §2 "Time-bound Grant Ledger / TTL — ABSENT" | 순신규 |
| `acl_permission` RBAC 매트릭스(앵커 후보) | **공백(TTL 부재)** | `TeamPermissions.php:152` — `expires_at`/`granted_at`/`valid_until` 컬럼 없음(부여 영구) | 파괴 없이 별도 grant 원장 신설·런타임 합산 투영(ADR §D-1) |
| append-only 이력 패턴(선례) | PRESENT | `AccessReview.php:62-80`(access_review_item append-only·justification 필수) | 등록부 이력 스키마 동형 계승(ADR §2.1) |
| 세션 등록부 스키마(시한부 레코드 형태) | PARTIAL | `Db.php:1111-1119`(`user_session` token 해시·expires_at·created_at+인덱스) | 시한부 레코드 색인/만료 컬럼 패턴 참고 |
| 불변 증거 저장 | PRESENT | `SecurityAudit.php:12-53`(append-only·prev_hash→hash_chain)·`verify` `:56-68` | 등록부 상태전이 증거 체인 확장 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **레코드 필드**(SPEC §2·§25): Granted Role/Permission/Scope·Runtime Context·Approval Chain·Risk Evaluation·Timestamp를 grant별로 보관.
- **색인축**(SPEC §34): Request ID·Requester·Target Role·Status·Risk Level·Session·Approval·End Time — 8축 인덱스.
- **불변성**(SPEC §33): Immutable Request Version·Immutable Approval·Snapshot Integrity·Digest Validation — 확정 grant는 버전 불변, 변경은 새 버전 append.
- **테넌트 격리**(SPEC §33 Tenant Isolation): 등록부 레코드는 테넌트 스코프 필수(ADR 무후퇴 — 기존 테넌트 격리 유지).
- **TTL 필수**(ADR §D-1): `expires_at NOT NULL` — 무기한 grant 거부. 영속 `acl_permission`은 유지하고 그 위에 얹는다(Extend, 대체 아님).
- **다국어**: 등록부는 식별자·타임스탬프 중심 데이터로 사용자 노출 라벨(Status/Risk Level 표시)만 i18n 대상.

## 4. KEEP_SEPARATE (동음이의 흡수금지)

| 근접물 | 근거(GT 등장 file:line) | 분리 사유 |
|---|---|---|
| `action_request` 테이블 | `Db.php:592-600`(★`required_approvals` 컬럼 없음·grant/expiry 없음) | 마케팅 결재 큐 — grant 원장 아님(GT② B-1) |
| `mapping_change_request` 테이블 | `Db.php:623-636`(`required_approvals INT DEFAULT 2` 실존) | 매핑 거버넌스 정족수 — elevation grant 아님(GT② B-1) |
| `kr_recon_ticket` | `Db.php:939` | 정산 reconciliation 티켓 — elevation 등록부 아님(GT② B-8) |
| `menu_audit_log` | `AdminMenu.php:98`·migration `20260526_168_102_create_menu_audit_log.sql:6-24` | 메뉴 감사(장식·verify 별도) — SecurityAudit·grant snapshot과 별개(GT② B-8) |

## 5. 판정 (NOT_CERTIFIED · 재활용-substrate/ABSENT-governance · 선행의존)

- **판정 = ABSENT-governance / 재활용-substrate.** 전용 Grant Ledger는 grep 0(GT② §2)이며 순신규.
- **최대 공백 = `acl_permission` TTL 컬럼 부재**(`TeamPermissions.php:152`, ADR §2.3) — 이 테이블 확장이 grant ledger 자연 앵커(ADR §D-1).
- **재활용**: append-only 이력(`AccessReview.php:62-80`)·시한부 세션 스키마(`Db.php:1111-1119`)·불변 증거(`SecurityAudit.php:12-53`)를 대체 아닌 **확장(Extend)**.
- **선행 의존**: Part 1~3-8 인증 후 실 구현(BLOCKED_PREREQUISITE). 코드 변경 0 · NOT_CERTIFIED.
