# DSAR — Zero Trust & Continuous Authorization: 신뢰 정합대사 (APPROVAL_TRUST_RECONCILIATION)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

APPROVAL_TRUST_RECONCILIATION은 **런타임 실측 상태와 저장된 스냅샷·신뢰값·결정 간의 불일치를 대사(對査)**하여 정합성을 검증하는 엔티티다(SPEC §26). 서로 다른 시점·경로에서 산출된 신뢰 표현이 일관되는지 확인해 tamper/누락/stale을 드러낸다.

| 비교 대상 (SPEC §26) | 의미 |
|---|---|
| Runtime | 현재 요청 시점 실측 컨텍스트(§18 Runtime Monitoring) |
| Snapshot | 저장된 Trust Snapshot(§20·identity/score/session/device/risk/decision) |
| Trust | 종합 Trust Score(§14) |
| Decision | Continuous Decision(§17) 결과 |

정합대사는 SPEC §33(Digest Validation·Trust Version)·§28(Runtime Guard)과 결합해 불일치 시 차단/재평가를 유발한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC 요소 | 판정 | Ground-Truth 근거 |
|---|---|---|
| Runtime↔Snapshot↔Trust↔Decision 대사 | **ABSENT** | Trust Snapshot·Trust Score·Continuous Decision 전부 grep 0(GT② §2) — 대사할 대상 4종 부재 |
| 무결성 검증 프리미티브 | **PARTIAL(재활용)** | SecurityAudit 해시체인 append-only·`verify`(`SecurityAudit.php:12-53`·`:56-68`)=tamper-evident 증거·대사 무결성 기반(ADR D-5) |
| 런타임 실측 원자료 | **PARTIAL** | `recordSessionMeta` ip/ua(`UserAuth.php:4232-4251`)·`listSessions`(`UserAuth.php:4253-4298`)=현재 세션 실측이나 신뢰값 대사 미연결(GT① §A) |
| 정적 결정 게이트 | **PARTIAL** | 요청별 api_key/team_role 게이트(`index.php:69-622`·`UserAuth.php:1134-1167`)는 정적·스냅샷 대비 대사 없음(GT② §2) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거·테넌트격리)

- **키/격리**: `tenant_id`(SPEC §33 Tenant Isolation)·`reconciliation_id`·`session_id`(→`user_session`)·`snapshot_id`(→APPROVAL_TRUST_SNAPSHOT·SPEC §20).
- **대사 필드**: `runtime_state`·`snapshot_state`·`trust_value`·`decision_value`·`mismatch`(bool)·`mismatch_axis`(runtime/snapshot/trust/decision·SPEC §26).
- **무결성**: `trust_version`(SPEC §33 Trust Version)·`digest`(SPEC §33 Digest Validation)로 스냅샷 변조 탐지. Immutable Snapshot(§33) 전제·SecurityAudit `verify`(`SecurityAudit.php:56-68`) 재활용.
- **상태**: `CONSISTENT` / `MISMATCH`. Mismatch 시 Runtime Guard(§28)·Revalidation(§25) 연계·fail-closed. 결과는 SecurityAudit append-only 기록(`SecurityAudit.php:12-68`·ADR D-5).

## 4. KEEP_SEPARATE (정산 recon 흡수금지)

★authz Trust Reconciliation은 **정산·재무 recon과 완전 분리**된다(GT② §4·명명 충돌 최대 주의).

| 흡수 위험 대상 | 근거 | 분리 사유 |
|---|---|---|
| 정산/재무 대사(settlement recon) | 커머스 정산 도메인(GT② §5 데이터소스 분리) | 매출·정산 금액 대사이지 신뢰상태 정합 아님. 데이터소스 `performance_metrics`/커머스 ≠ authz `user_session`/`auth_audit_log` |
| ML 드리프트/재학습 대사 | `ModelMonitor.php:11-18`(GT② §4 B-2) | 모델 성능 모니터링이지 Runtime↔Snapshot 신뢰 대사 아님 |
| 마케팅 신뢰도 지표 | `Mmm.php:749`·`AttributionEngine.php:246-261`·`DataPlatform.php:281`(GT② §4 B-1) | 어트리뷰션 confidence이지 authz Trust value 대사 아님 |

## 5. 판정

- **NOT_CERTIFIED · ABSENT-순신규**: Runtime/Snapshot/Trust/Decision 4자 authz 정합대사는 grep 0(GT②)·순신규.
- **선행 의존(BLOCKED_PREREQUISITE)**: 대사 대상인 Trust Snapshot(§20)·Trust Score(§14)·Continuous Decision(§17)이 선행 구축되어야 성립. Part 1~3-12 인증 후 실 구현(ADR §4).
- **재활용(Extend)**: SecurityAudit 해시체인·`verify`(`SecurityAudit.php:12-68`)를 대사 무결성 기반으로·recordSessionMeta/listSessions를 런타임 실측 입력으로 재활용(ADR D-5). 정산 recon·마케팅 지표 흡수 금지·무후퇴.
