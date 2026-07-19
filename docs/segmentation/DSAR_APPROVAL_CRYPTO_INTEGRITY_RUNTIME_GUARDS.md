# DSAR — Cryptographic Integrity: Runtime Guards (§63)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: Runtime Guard는 전량 신규(현행 런타임 무결성 가드 부재). fail-closed 원칙(§5.11).

## 1. 원문 전사 (Canonical Contract)

§63 Runtime Guard(차단) 원문 전사: Algorithm Not Allowed/Deprecated/Weak/Unknown · Canonicalization/Field Set Version Missing · Canonical Projection Failed · Unsupported Value Type · Invalid Unicode/Decimal/Monetary Scale/Timestamp · Default Charset · Previous Digest Missing · Genesis Marker Invalid · Entry Digest Mismatch · Chain Break · Head/Checkpoint Mismatch · Snapshot/Evidence/Audit/Outbox/Attachment Manifest/Correction/Supersession Digest Mismatch · Cross-Tenant Chain · Algorithm Downgrade · Verification Result Invalid · Tamper Incident Unhandled · Kill Switch Active.

의미: Runtime Guard는 실행 시점(Digest 생성·Append·Verify·Read)에 무결성 위반을 감지해 **차단(fail-closed)**한다. Static Lint(코드 정적)와 달리 데이터·상태·동시성 위반을 런타임에 방어한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §63 가드 | 현행 존재 여부 | 근거(GROUND_TRUTH) |
|---|---|---|
| Algorithm Not Allowed/Deprecated/Weak/Unknown | **부재** | Algorithm Registry/Policy 부재·`'sha256'` 하드코딩(`SecurityAudit.php:27`)이라 런타임 검사 없음 |
| Canonicalization/Field Set Version Missing | **부재** | Version 개념 자체 부재 |
| Canonical Projection Failed | **부재** | Canonical projection 파이프라인 부재(raw json_encode·`SecurityAudit.php:27`) |
| Unsupported Value Type | **부재** | 타입 결정성 검사 부재 |
| Invalid Unicode/Decimal/Monetary Scale/Timestamp | **부재** | NFC/Decimal/Monetary/Timestamp 정규화 가드 부재 |
| Default Charset | **부재** | charset 명시 가드 부재 |
| Previous Digest Missing | **부분(약함)** | 실 체인은 prev 조회하나 오류 시 `'GENESIS'` fail-open(`SecurityAudit.php:39-40`) — Missing을 차단 아닌 재시작으로 처리 |
| Genesis Marker Invalid | **부재** | Versioned Genesis 검증 부재(단순 상수만) |
| Entry Digest Mismatch | **부분(양호)** | verify가 재계산+`hash_equals`(`SecurityAudit.php:63-64`)로 mismatch 검출 — 단 on-demand(`AdminGrowth.php:1429`), commit-time/read-time 가드 아님 |
| Chain Break | **부분(양호)** | verify `prev_hash===$prev` + `broken_at`(`SecurityAudit.php:56-68`) — on-demand만 |
| Head/Checkpoint Mismatch | **부재** | Head Digest/Checkpoint 부재(`SecurityAudit.php:39` DESC 조회) |
| Snapshot/Evidence/Audit/Outbox/Attachment/Correction/Supersession Digest Mismatch | **부재** | 해당 Digest 계층 부재(대상 Ledger 부재) |
| Cross-Tenant Chain | **부재(리스크 창)** | verify에 tenant 술어 없음(전역 단일 체인) |
| Algorithm Downgrade | **부재** | Downgrade 차단 게이트 부재 |
| Verification Result Invalid | **부재** | Verification Result 저장·검증 부재 |
| Tamper Incident Unhandled | **부재(리스크)** | mismatch 검출 시 Incident 생성/차단 없이 `{ok:false}` 반환만·`catch` no-op(`SecurityAudit.php:32`) |
| Kill Switch Active | **부재** | Kill Switch 부재 |

## 3. 판정

- **Verdict: 전량 신규(무결성 Governance 부재 전제).** 실 verify(`SecurityAudit.php:56-68`)가 Entry Digest Mismatch·Chain Break를 **on-demand로만** 검출하는 것을 제외하면 런타임 가드 전무. on-demand verify는 commit-time·read-time·periodic 방어가 아니므로 §51/§52 미달.
- **★리스크 재확인**: ①fail-open(`SecurityAudit.php:32` catch no-op·`:40` GENESIS on error) → Previous Digest Missing/Chain Break를 차단 아닌 silent reset. ②Cross-Tenant Chain 가드 부재(tenant 술어 없음). ③Tamper Incident Unhandled(검출만·차단/Incident 없음). 이 셋은 §5.11(실패 무시 금지)·§5.13(Tenant Binding) 위배 창.
- cover: **부분** — Entry Digest Mismatch·Chain Break 검출 로직만 실재(확장), 나머지 16종 가드 신규.
- 선행: 대상 Ledger Entry/Snapshot/Evidence/Audit/Outbox 부재 → 대부분 가드는 결합 대상 없음(BLOCKED_PREREQUISITE). 이번 차수=가드 명세.

## 4. 확장·구현 방향 (설계)

- **fail-closed 전환(무후퇴 예외=개선)**: `SecurityAudit.php:32` catch no-op → 예외 전파 + Tamper Incident 생성. `:39-40` GENESIS-on-error → Previous Digest Missing 차단(§5.11). 신규 Genesis는 §27 Versioned Genesis Marker로만 허용.
- **가드 계층화**: (a)생성 시점 — Algorithm Allowed·Canonicalization/Field Set Version 존재·Canonical Projection 성공·Value Type/Unicode/Decimal/Monetary/Timestamp 유효·Charset 명시. (b)Append 시점 — Previous Digest·Genesis·Sequence/Tenant/Partition Binding·Entry Digest 재검증·Head 갱신(§51). (c)Verify 시점 — Chain Break·Head/Checkpoint Mismatch·Cross-Tenant Chain·Verification Result Invalid. (d)전역 — Algorithm Downgrade 차단·Tamper Incident 강제 처리·Kill Switch.
- **Cross-Tenant 차단**: verify·chain 조회에 `WHERE tenant_id=?` 강제(§5.13 Tenant Binding) — 실 verify(`SecurityAudit.php:56-68`) tenant 술어 추가.
- **constant-time 확대**: 모든 Digest 비교를 `hash_equals`(실 `SecurityAudit.php:63-64` 패턴)로 통일.
- **무후퇴 보장**: 실 verify 배선(`AdminGrowth.php:1429`)·`Crypto.php`·`MediaHost` 런타임 동작 불변.
- **실 구현은 선행 Ledger 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_STATIC_LINT]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
