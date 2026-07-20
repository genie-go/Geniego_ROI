# DSAR — PDP/PEP Governance: 결정 스냅샷 (APPROVAL_POLICY_SNAPSHOT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_12_PDP_PEP_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_PDP_PEP_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_POLICY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_POLICY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_POLICY_SNAPSHOT(SPEC §14·§22)은 **하나의 접근 결정 시점의 결정 원본을 불변(immutable)으로 저장**하는 엔티티다. SPEC §22가 명시한 저장 필드는 다음 5종이다.

| 필드 | SPEC 근거 | 의미 |
|---|---|---|
| Request | §22·§3 | Subject/Resource/Action/Environment 요청 원본 |
| Decision | §22·§9 | Permit/Deny/Challenge/… 산출 결정 |
| Context | §22·§13 | Runtime Context(Device/Geo/MFA/Risk/Session) |
| Policy Version | §22·§3 | 결정에 적용된 정책 버전 식별자 |
| Timestamp | §22 | 결정 발생 시각 |

Snapshot은 §30 Database Constraint의 **Immutable Decision Snapshot**·**Tenant Isolation** 제약을 받으며 §31 Index(Snapshot) 대상이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| Snapshot 구성요소 | 판정 | 근거(파일:라인) |
|---|---|---|
| 불변 저장 substrate(해시체인) | **PARTIAL** | SecurityAudit 해시체인 append-only(`SecurityAudit.php:12-53`·verify `:56-68`) — tamper-evident digest이나 결정 스냅샷 전용 아님 (GT① §G) |
| 감사 기록(문자열 detail) | **PARTIAL** | `auth_audit_log`·`logAudit`(`UserAuth.php:4174-4197`·`:4203`) — 문자열 detail만·rule/scope trace 없음 (GT① §G, GT② §2) |
| Request 원본 저장 | **ABSENT** | Subject/Resource/Action/Environment 요청 원본을 결정단위로 스냅샷하는 구조 부재 (GT② §2 Decision Snapshot PARTIAL) |
| Decision 산출값 | **PARTIAL** | MFA/Challenge(`UserAuth.php:929-964`)·Read-only(`:1128`) 실집행이나 통합 결정유형 미저장 (GT① §F) |
| Context 스냅샷 | **PARTIAL** | `clientIp`·`recordSessionMeta`(`UserAuth.php:3446-3454`·`:4243-4250`) ip/ua 수집·PDP 결정단위 미배선 (GT① §D) |
| Policy Version | **ABSENT** | Policy Registry/Version grep 0 — 버전 식별자 부재 (GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **불변성**: Snapshot 레코드는 §30 Immutable Decision Snapshot — 최초 기록 후 수정 불가. SecurityAudit 해시체인(`SecurityAudit.php:12-53`)의 append-only + verify(`:56-68`) 무결성 위에 신설(ADR D-5·§30).
- **완결 필드**: {Request, Decision, Context, Policy Version, Timestamp} 5필드 전부 채워야 유효(SPEC §22). Policy Version은 §11·§12 Registry/Bundle 신설 전제(BLOCKED_PREREQUISITE).
- **Digest 무결성**: Snapshot은 §24 Digest의 입력이며(APPROVAL_POLICY_DIGEST 참조), Digest 해시가 Snapshot 변조를 검출한다.
- **테넌트 격리**: §30 Tenant Isolation — Snapshot은 `X-Tenant-Id`(`index.php:619`) 격리 경계 내 저장. 교차 테넌트 스냅샷 조회 금지.
- **인덱스**: §31 Index(Snapshot·Subject·Resource·Action·Decision).

## 4. KEEP_SEPARATE (마케팅 policy 흡수금지)

- 마케팅/커머스 결정 스냅샷·캐시는 authz Snapshot과 코드·데이터 공유 없음(GT② §5). `attribution_model_cache`(마케팅 캐시)·`ModelMonitor.php:220-335`(ML 드리프트) 등은 authz Snapshot 아님(GT② §C-3·C-4).
- `action_request.policy_id`(`Db.php:576`·`:592-594`)는 Alerting 알림 액션정책 참조이지 authz 결정 스냅샷 아님(GT② §C-2). 개명·흡수 금지.

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정 = PARTIAL(재활용 기반)**. 불변 저장 substrate는 **SecurityAudit 해시체인 확장**(신설 아닌 확장·ADR D-5)이나, Request 원본·Policy Version·통합 Decision·Context 결정단위 스냅샷은 **ABSENT**(순신규).
- **재활용**: `SecurityAudit.php:12-68`(append-only+verify)·`auth_audit_log`(`UserAuth.php:4174`)·Context 수집(`UserAuth.php:3446-3454`).
- **선행 의존**: Policy Version은 Policy Registry/Version(§11 신설)·중앙 PDP(effectiveForUser `TeamPermissions.php:393-421` 승격) 배선 후에만 성립 — **BLOCKED_PREREQUISITE**. 코드 변경 0·NOT_CERTIFIED.
