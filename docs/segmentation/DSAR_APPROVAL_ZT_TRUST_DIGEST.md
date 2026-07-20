# DSAR — Zero Trust & Continuous Authorization: 신뢰 다이제스트 (APPROVAL_TRUST_DIGEST)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_TRUST_DIGEST`는 다수의 신뢰 산출물을 하나의 무결성 검증 가능한 롤업으로 압축(fold)하는 레코드다. SPEC §22(Digest)는 입력으로 **Trust · Runtime · Decision · Snapshot** 4종을 규정한다. Digest는 개별 Snapshot(§20)/Evidence(§21)를 재현·비교하지 않고도 특정 구간의 신뢰 상태 무결성을 O(1) 검증하게 하며, SPEC §33 **Digest Validation** 제약의 대상이자 Reconciliation(§26)·Drift(§24)의 압축 기준선이다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §22 입력 | 판정 | 근거(GT 인용) |
|---|---|---|
| Snapshot (스냅샷 입력) | **ABSENT** | Trust 전용 Snapshot 저장 전무(GT② §2 Trust Snapshot ABSENT·본 Part APPROVAL_TRUST_SNAPSHOT 참조) |
| Trust (신뢰 점수 입력) | **ABSENT** | authz Trust Score 산출 없음(GT② §2·`trust` 히트는 전부 마케팅) |
| Runtime (런타임 상태 입력) | **PARTIAL** | 요청별 게이트 재계산(`index.php:69-622`)이나 신뢰신호 미결합·런타임 신뢰 롤업 없음 |
| Decision (결정 입력) | **ABSENT** | Adaptive/Continuous Decision 산출 전무(GT② §2 Adaptive Authorization ABSENT) |
| 롤업/무결성 substrate | **재활용(PARTIAL)** | SecurityAudit 해시체인(`SecurityAudit.php:12-53`·`:56-68`)이 append-only fold 프리미티브로 근접 |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **필드 계약**(§22): `digest_id`, `tenant_id`, `period`, `input_refs(trust|runtime|decision|snapshot)`, `digest_hash`, `trust_version`, `computed_at`.
- **Digest Validation**(§33): Digest는 입력 Snapshot/Evidence 집합의 해시 롤업을 봉인하고 검증한다. 무결성 프리미티브는 **SecurityAudit 해시체인 확장**(`SecurityAudit.php:12-68`, ADR D-5) — Trust 전용 Digest 산출·저장은 신설(ABSENT)이나 fold 무결성은 신설 아닌 **확장**.
- **Trust Version**(§33): Digest마다 신뢰 정책 버전 스탬프. 정책 재평가(§19) 구간 경계.
- **Tenant Isolation**(§33): `tenant_id` 필수. authz `user_session`/`auth_audit_log` 파생 ≠ 마케팅 데이터소스(GT② §5).
- **입력 의존**: Digest는 Snapshot(§20)·Evidence(§21)·Trust Score(§14)의 하류(downstream) 산출물 — 선행 엔티티 부재 시 산출 불가.

## 4. KEEP_SEPARATE (마케팅 trust/analytics 흡수금지)

- 마케팅 신뢰 롤업 — `Mmm.php:749`·`:939`(MMM 신뢰도)·`AttributionEngine.php:246-261`(`blended_trust`)·`DataPlatform.php:281`(데이터 신뢰 대시보드)는 마케팅 도메인 집계이며 authz Trust Digest 입력 아님(GT② §4 B-1).
- ML 드리프트/이상 오인 금지 — `AnomalyDetection.php`·`ModelMonitor.php:11-18`·`Risk.php:31-55`·`GraphScore.php:12-18`는 마케팅/커머스 ML 산출물. Digest Trust/Decision 입력에 흡수 금지(GT② §4 B-2).
- authz Digest는 `user_session`/`auth_audit_log` 파생만을 fold — 마케팅 `performance_metrics`/`attribution_*`/`crm_*`와 데이터소스 완전 분리(GT② §5).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Trust 전용 Digest 산출·Trust/Decision/Snapshot 입력 fold = **ABSENT(순신규)**. Runtime 원자재는 PARTIAL(신뢰신호 미결합 재계산). **fold 무결성 프리미티브는 SecurityAudit 확장(재활용)**.
- **재활용 vs 신설**: `SecurityAudit.php:12-68`(해시체인 append-only fold) 재활용. Trust Score 입력·Snapshot/Decision fold·Digest Validation·Trust Version 신설.
- **선행의존**: BLOCKED_PREREQUISITE — Digest는 Snapshot/Evidence/Trust Score의 하류이므로 이중 선행(Part 1~3-12 인증 + 본 Part Snapshot/Evidence/Trust Score 구현) 요구. 코드 변경 0.

### 본 문서 file:line 인용 목록
`index.php:69-622` · `SecurityAudit.php:12-53` · `SecurityAudit.php:56-68` · `SecurityAudit.php:12-68` · `Mmm.php:749` · `Mmm.php:939` · `AttributionEngine.php:246-261` · `DataPlatform.php:281` · `AnomalyDetection.php` · `ModelMonitor.php:11-18` · `Risk.php:31-55` · `GraphScore.php:12-18`
