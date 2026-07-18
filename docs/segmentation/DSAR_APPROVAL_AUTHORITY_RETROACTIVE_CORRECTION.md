# DSAR — Retroactive Authority Correction (§59)

> EPIC 06-A Part 4-5-3-1-5-3-3-4 · 289차 11회차(2026-07-18) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md) §59(2380-2403) · ⓑ전수조사: [DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md](DSAR_APPROVAL_AUTHORITY_EXISTING_IMPLEMENTATION.md) §5 · ADR: [ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md](../architecture/ADR_DSAR_REBATE_APPROVAL_AUTHORITY_MATRIX_FOUNDATION.md)
> **분모 측정기**: `node tools/measure_spec_denominator.mjs docs/segmentation/SPEC_06A_4_5_3_1_5_3_3_4_VERBATIM.md --sec=59` = **15**(불릿 15 · 번호 0). 육안 계수 금지.

## 0. 현행 실측 (file:line)

🔴 **§59 는 최고위험 섹션이다.** 소급 정정을 **강제·기록·불변화**할 집행수단이 부재할 뿐 아니라, **유일하게 존재하는 in-place 수정 선례가 정확히 §59 가 금지하는 안티패턴**(완료 이력 원본 덮어쓰기)이다.

| 계층 | 현행 실측 (ⓑ §5) | 판정 |
|---|---|---|
| **정정 집행수단** | 🔴 `backend/migrations/` 21파일 · **172차 정지**(최신 `20260527_172_002`) · `ensureTables`=CREATE만 · **백필 0** → 과거 행을 소급 정정할 배치/집행기 자체가 없다 | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| **정면 반례(안티패턴)** | 🔴 `AgencyPortal.php:304` `UPDATE ... revoked_at=NULL`(revoke 를 pending 재초대로 소거) · `:381` `UPDATE ... revoked_at=NULL`(approve 시 소거) — **정정을 정정으로 기록하지 않고 원본을 in-place 덮어씀** → as-of 재구성 불가 · **복제 금지** | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| **완료 이력 불변성** | 정본 = `SecurityAudit`(append-only `:8` UPDATE/DELETE 코드경로 없음 · prev_hash 해시체인 `:29` · `verify():56-68` `:64` `hash_equals`+prev 교차) — **완료 Decision Evidence 를 덮어쓰지 않는 유일한 건전 선례** | `LEGACY_ADAPTER`(참조) |
| **Actor Auth Snapshot** | 🔴 승인시점 권한/역할/플랜 미보존(`Mapping:285`·`Alerting:591`·admin_growth 2컬럼 · ⓑ §5) → 정정의 원본 상태(Original Matrix Entry)를 복원할 스냅샷 없음 | `ABSENT` |
| **Matrix/Version/as-of 조회** | 🔴 Authority Matrix·Version 엔티티 부재 · as-of(`AS OF`/시점질의) 술어 grep 0(§57 참조) | `ABSENT` |

## 1. 원문 전사 + 판정 — **원문 15종**(강제)

원문(`:2382`): *"과거 Authority 오류를 수정할 때 다음을 강제하라."*

| # | 원문 항목명 | 현행 대조 (ⓑ §5) | 판정 |
|---|---|---|---|
| 1 | Correction Reason | 🔴 정정 사유 필드 0 · 집행수단 부재 + 유일 선례가 무기록 in-place 소거(`AgencyPortal.php:304`) | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| 2 | Authorized Requester | 🔴 소급 정정 요청자 승인 개념 0 | `ABSENT` |
| 3 | Approval Reference | 🔴 정정을 승인한 참조 링크 개념 0 | `ABSENT` |
| 4 | Original Authority Version | 🔴 불변 prev-링크 버전체인 0(version 6컬럼 전부 하드코딩 태그 · ⓑ §5) → 원본 버전 보존 수단 없음 | `ABSENT` |
| 5 | Correction Authority Version | 🔴 정정본 버전을 새 불변 행으로 적재할 계층 0 | `ABSENT` |
| 6 | Original Matrix Entry | 🔴 Authority Matrix 엔티티 부재 · 원본 엔트리를 보존하며 정정할 수단 = in-place UPDATE 뿐(`AgencyPortal` 반례) | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| 7 | Corrected Matrix Entry | 🔴 정정본을 원본과 병존시킬(불변) 계층 0 → 덮어쓰기밖에 없음 | `BLOCKED_HISTORICAL_INTEGRITY_RISK` |
| 8 | Affected Period | 🔴 정정이 영향을 준 유효기간 계산 0 · `valid_from`/`valid_to` grep 0(§57) | `ABSENT` |
| 9 | Affected Approval Cases | 🔴 영향받은 승인 케이스 집합 산출기 0 | `ABSENT` |
| 10 | Affected Decisions | 🔴 영향받은 결정 집합 산출기 0 · `approval_chain` grep 0(ⓑ §6) | `ABSENT` |
| 11 | Financial Exposure | 🔴 금액축 부재(`HIGH_VALUE_KRW` boolean만 · ⓑ §4) → 재무 노출 재계산 불가 | `ABSENT` |
| 12 | Snapshot Preservation | 🔴 **Actor Authorization Snapshot ABSENT**(ⓑ §5) → 보존할 스냅샷 자체가 없다 | `ABSENT` |
| 13 | Reconciliation | 🔴 Authority 정의 vs 실제 부여 대사 0(ⓑ §7 §63 = ABSENT) · Tenant 마스터 부재로 대사 기준 자체 없음 | `ABSENT` |
| 14 | Manual Review | 🔴 소급 정정 수동 검토 워크플로 0 | `ABSENT` |
| 15 | Audit Reconstruction | 🔴 **as-of 조회 수단 부재**(시점질의 술어 grep 0 · Actor Auth Snapshot ABSENT) → 과거 시점 감사 재구성 불가 | `ABSENT` |

**실측 개수: 15 / 15 전사.** 커버리지 = **`VALIDATED_LEGACY` 0** · `BLOCKED_HISTORICAL_INTEGRITY_RISK` 3(Correction Reason·Original Matrix Entry·Corrected Matrix Entry) · `ABSENT` 12.

> 🔴 **커버 0.** 소급 정정을 불변으로 집행할 계층이 부재하고, 유일한 in-place 수정 선례(`AgencyPortal.php:304`,`:381`)가 정확히 §59 가 금지하는 안티패턴이다. `SecurityAudit` append-only 는 §2 의 참조 선례일 뿐 커버가 아니다.

## 2. 규칙

- 🔴 **★원문 종결문(`:2400`) "완료된 Decision Evidence를 덮어쓰지 마라" = SecurityAudit 불변성 원칙이다.** 정본 `SecurityAudit`(append-only `:8` — **UPDATE/DELETE 코드경로 없음** · prev_hash 해시체인 · `verify():64` hash_equals+prev 교차)이 이 원칙의 유일한 건전 구현이다. **소급 정정은 원본을 UPDATE 하지 말고, 정정본을 새 불변 행으로 append 하고 원본을 system-time 으로 폐구간화하라**(bitemporal · §57 참조).
- 🔴 **★`AgencyPortal.php:304`,`:381` `revoked_at=NULL` in-place 소거 패턴을 복제 금지.** 이는 revoke(완료 이력)를 pending/approved 로 **원본 덮어쓰기**하는 것으로, 정정을 정정으로 기록하지 않아 **as-of 재구성을 파괴**한다 — §59 가 명시적으로 금지하는 안티패턴의 실재 사례다. Authority 정정을 이 형태로 구현하면 §59 를 정반대로 위반한다.
- 🔴 **`menu_audit_log.hash_chain` 을 불변성 근거로 인용 금지**([[reference_menu_audit_log_not_tamper_evident]]) — `verify()` 0 · preimage ts 소실 = 검증 불가능한 장식이다. 불변성 정본은 `SecurityAudit::verify():56-68` 하나뿐.
- 🔴 **`Snapshot Preservation` 은 Actor Authorization Snapshot(§55) 선결** — 승인시점 권한/역할/플랜을 보존하지 않으면(현재 ABSENT · ⓑ §5) 정정 시 `Original Matrix Entry` 를 복원할 근거가 없다. 스냅샷 없이 정정 계층만 세우면 **원본을 추정으로 재구성**하게 되어 §59 를 역행한다.
- 🔴 **`Audit Reconstruction` 은 as-of 질의 선결** — 시점질의 술어가 전역 grep 0(§57)이므로, 과거 시점 감사 재구성은 bitemporal 시간축(§57) + Actor Auth Snapshot(§55) 이 함께 서야 가능하다. **정정 필드만 배선하면 재구성 불가한 빈 껍데기**다.
- 🔴 **15종 "있다고 가정"하고 배선 금지** — 12종이 `ABSENT`, 3종이 `BLOCKED_HISTORICAL_INTEGRITY_RISK` 다. 집행수단은 **별도 승인 세션**(Golden Rule + verify + 배포 승인)에서만 신설하라.
