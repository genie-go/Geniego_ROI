# DSAR — Zero Trust & Continuous Authorization: 신뢰 스냅샷 (APPROVAL_TRUST_SNAPSHOT)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_13_ZERO_TRUST_CONTINUOUS_AUTHORIZATION_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_ZERO_TRUST_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_ZT_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_ZT_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 엔티티 정의 (SPEC 근거)

`APPROVAL_TRUST_SNAPSHOT`은 지속 인가 판정 시점의 신뢰 상태를 **불변(immutable)** 으로 봉인하는 point-in-time 레코드다. SPEC §20(Trust Snapshot)은 저장 필드로 **Identity · Trust Score · Session · Device · Risk · Decision** 6종을 규정한다. 스냅샷은 사후 재평가(Reconciliation §26)·감사·drift 대조(§24)의 기준선(baseline)이 된다. SPEC §33은 스냅샷에 **Immutable Trust Snapshot · Trust Version · Tenant Isolation · Digest Validation** 제약을 요구한다.

## 2. 실존 substrate 매핑 (PRESENT/PARTIAL/ABSENT + GT 인용)

| SPEC §20 필드 | 판정 | 근거(GT 인용) |
|---|---|---|
| Session (세션 상태 봉인) | **PARTIAL** | `recordSessionMeta`/`ensureSessionMeta`(`UserAuth.php:4232-4251`·ip/ua/last_seen 기록만·authz 미반영)·세션 TTL 발급/만료(`UserAuth.php:986`·`:606`·`:990`) |
| Device (디바이스 상태 봉인) | **ABSENT** | `recordSessionMeta`가 ua 1개만(`UserAuth.php:4247`)·지문/managed/EDR/TPM/health 전무(GT② §2) |
| Identity (신원 상태 봉인) | **PARTIAL** | `userByToken`(`UserAuth.php:249-286`) 요청별 재검증·신원 트러스트 profile 구조는 ABSENT(GT② §2 Zero Trust Registry) |
| Trust Score (점수 봉인) | **ABSENT** | identity/device/session/network 종합 authz Trust Score 산출 없음(GT② §2·`trust` 히트는 전부 마케팅) |
| Risk (위험 봉인) | **PARTIAL(정적)** | `auth_audit_log.risk`(`UserAuth.php:4165`)=정적 라벨·인가 미반영·SIEM 라우팅만(`:4193`) |
| Decision (결정 봉인) | **ABSENT** | Adaptive/Continuous Decision 저장 구조 전무(GT② §2 Adaptive Authorization ABSENT) |
| 불변성/무결성 substrate | **재활용(PARTIAL)** | SecurityAudit 해시체인 append-only·verify(`SecurityAudit.php:12-53`·`:56-68`) |

## 3. 설계 계약 (필드·상태·제약 — SPEC 근거)

- **필드 계약**(§20): `snapshot_id`, `tenant_id`, `identity_ref`, `trust_score(0~100·§14)`, `session_ref`, `device_ref`, `risk_level`, `decision`, `taken_at`, `trust_version`, `digest_ref`.
- **불변성**(§33): 스냅샷은 append-only·수정 불가. 무결성은 **SecurityAudit 해시체인 확장**(`SecurityAudit.php:12-68`, ADR D-5)으로 봉인 — Trust 전용 Snapshot 저장소는 신설(ABSENT)이나 무결성 프리미티브는 신설 아닌 **확장**.
- **Trust Version**(§33): 스냅샷마다 신뢰 정책 버전 스탬프. 정책 재평가(§19)와 대조.
- **Tenant Isolation**(§33): `tenant_id` 필수. authz 데이터소스 `user_session`/`auth_audit_log`는 마케팅 `performance_metrics`/`attribution_*`와 분리(GT② §5).
- **Digest Validation**(§33): 스냅샷 집합은 Digest(§22·APPROVAL_TRUST_DIGEST)로 롤업 검증.
- **입력 승격**(ADR D-1): `recordSessionMeta`(ip/ua)를 Device/Network Trust 신호로 승격해 Session/Device 필드를 채운다(대체 아님·Extend).

## 4. KEEP_SEPARATE (마케팅 trust/analytics 흡수금지)

- 마케팅 신뢰도 — `Mmm.php:749`·`:939`(MMM 베이지안 신뢰도)·`AttributionEngine.php:246-261`(`blended_trust`)·`DataPlatform.php:281`(데이터 신뢰 대시보드)는 **authz Trust Score 아님**. 스냅샷 Trust Score 필드에 흡수 금지(GT② §4 B-1).
- device-sig — `Attribution.php:144-150`(`attribution_device_sig` ip+ua 해시)=광고 cross-device 식별. Snapshot Device 필드로 **오인 금지**(GT② §4 B-3).
- risk/anomaly — `AnomalyDetection.php`·`ModelMonitor.php:11-18`·`Risk.php:31-55`·`CustomerAI.php:10-18`는 마케팅/커머스 ML. Snapshot Risk 필드에 흡수 금지(GT② §4 B-2).

## 5. 판정 (NOT_CERTIFIED · 재활용/ABSENT · 선행의존)

- **판정**: Trust 전용 Snapshot 저장·Trust Score/Device/Decision 봉인 = **ABSENT(순신규)**. Session/Identity/Risk 원자재는 PARTIAL(기록만·정적). 무결성 프리미티브는 **SecurityAudit 확장(재활용)**.
- **재활용 vs 신설**: `recordSessionMeta`(`:4232-4251`)·세션 TTL(`:986`)·SecurityAudit(`:12-68`)·정적 risk(`:4165`) 재활용. Trust Score·Device Trust·Decision 봉인·Trust Version·Digest Validation 신설.
- **선행의존**: BLOCKED_PREREQUISITE — Part 1~3-12 인증 후 실 구현(ADR §4). Trust Score(D-4)·Device/Network Trust(D-1)가 스냅샷 필드의 선행. 코드 변경 0.

### 본 문서 file:line 인용 목록
`UserAuth.php:4232-4251` · `UserAuth.php:4247` · `UserAuth.php:986` · `UserAuth.php:606` · `UserAuth.php:990` · `UserAuth.php:249-286` · `UserAuth.php:4165` · `UserAuth.php:4193` · `UserAuth.php:144-150`(Attribution) · `SecurityAudit.php:12-53` · `SecurityAudit.php:56-68` · `SecurityAudit.php:12-68` · `Mmm.php:749` · `Mmm.php:939` · `AttributionEngine.php:246-261` · `DataPlatform.php:281` · `Attribution.php:144-150` · `AnomalyDetection.php` · `ModelMonitor.php:11-18` · `Risk.php:31-55` · `CustomerAI.php:10-18`
