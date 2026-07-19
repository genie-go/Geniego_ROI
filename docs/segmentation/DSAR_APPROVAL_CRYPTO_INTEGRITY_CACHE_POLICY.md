# DSAR — Cryptographic Integrity: Cache Policy (§70)

> EPIC **06-A-03-02-03-02** · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> GROUND_TRUTH=[[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]]. 인용은 GROUND_TRUTH 등재 file:line만.
> 규율: Immutable Digest만 캐시 · Sensitive Payload Cache 금지 · Tamper/Verification 실패 시 우회.

## 1. 원문 전사 (Canonical Contract)

§70 Cache Key(원문 전사): tenant · integrity version · algorithm id/version · canonicalization version · field set version · aggregate type/id/version · ledger sequence · entry digest · head version · checkpoint id. Tenant-isolated · Version-aware · Immutable Digest Cache · Sensitive Payload Cache 금지 · Entry/Head 변경·Deprecation·Version 변경·Tamper·Verification 실패 시 Invalidation · Legacy Hash Canonical Cache 저장 금지.

의미: 캐시 키는 tenant·모든 version 축(integrity/algorithm/canonicalization/field set)·aggregate 좌표·sequence·digest·head version·checkpoint를 포함해 **버전 인지·테넌트 격리**를 보장한다. 불변 digest만 캐시하고 민감 원문·Legacy Hash canonical은 캐시하지 않으며, 무결성 상태 변경 시 즉시 무효화한다.

## 2. 기존 구현 대조 (GROUND_TRUTH)

| §70 항목 | 현행 대응 | 근거(GROUND_TRUTH) |
|---|---|---|
| Cache Key(tenant·version·algorithm·canonicalization·field set·aggregate·sequence·entry digest·head version·checkpoint) | **부재** | 무결성 digest 캐시 계층 자체 부재. verify는 매번 DB 순회(`SecurityAudit.php:56-68`) |
| Tenant-isolated | **부재(리스크)** | verify에 tenant 술어 없음(전역 체인) → 캐시 시 Cross-Tenant 혼입 위험 |
| Version-aware | **부재** | integrity/algorithm/canonicalization/field set version 개념 부재 |
| Immutable Digest Cache | **부분(유사)** | 파일 CAS는 내용주소 불변 digest(`MediaHost.php:93`)·원자쓰기(`:100-102`) — 불변 캐시 유사 substrate |
| Sensitive Payload Cache 금지 | **미명문** | Canonical Payload 캐시 금지 정책 부재(§15 "Production Log에 Canonical Payload 전체 기록 금지"만 인접) |
| Legacy Hash Canonical Cache 금지 | **해당없음(현행 안전)** | Legacy Hash를 Canonical로 캐시하는 경로 없음(Legacy→Canonical 복사 부재) |
| Invalidation(Entry/Head/Deprecation/Version/Tamper/Verification 실패) | **부재** | 무효화 트리거 체계 부재 |
| dedup 캐시성 해시(무결성 아님) | **분리** | `Db.php:272` dedup_key(SHA-256 truncate)·`Db.php:998,1006` 데모 apikey 해시 — 무결성 캐시 아님(KEEP_SEPARATE) |

## 3. 판정

- **Verdict: 무결성 Digest 캐시 계층 전량 신규.** 실 verify(`SecurityAudit.php:56-68`)는 캐시 없이 매 호출 전체 순회 — 캐시 부재는 정확성엔 안전하나 대량 원장에서 비효율. 파일 CAS(`MediaHost.php:88-102`)의 내용주소 불변성만 Immutable Digest Cache의 조립 재료.
- **★리스크 재확인**: (a)tenant 격리 없는 캐시는 Cross-Tenant 혼입 창(§5.13) — 캐시 키에 tenant 필수. (b)Sensitive Payload Cache 금지 정책 미명문 → 신규 명문화. (c)Legacy Hash Canonical Cache 금지는 현행 위반 없음(정직 기술) — 예방 규칙.
- cover: **부분** — 파일 내용주소 불변 캐시 substrate. 무결성 Digest 전용 버전인지 캐시·무효화 체계는 0.
- 선행: 캐시 대상 Entry/Head/Checkpoint Digest·Verification Result 부재 → BLOCKED_PREREQUISITE.

## 4. 확장·구현 방향 (설계)

- **Cache Key 설계(신규)**: `{tenant · integrity_version · algorithm_id/version · canonicalization_version · field_set_version · aggregate_type/id/version · ledger_sequence · entry_digest · head_version · checkpoint_id}` 복합. Tenant-first로 격리 강제(§5.13) — 실 verify의 전역 체인 문제를 캐시 계층에서 반복하지 않도록 tenant 술어 필수.
- **Immutable Digest Cache**: Entry/Chain/Head/Checkpoint Digest는 계산 후 불변이므로 장기 캐시 허용(파일 CAS `MediaHost.php:93` 불변 패턴 준용). Canonical Projection 결과 캐시로 중복 Projection 방지(§71 연계).
- **금지 명문화(신규)**: ①Sensitive Canonical Payload/원문 캐시 금지(digest·메타만). ②Legacy Hash를 Canonical Digest Cache에 저장 금지(§60 — 현행 안전 속성 보존). ③권한 없는 사용자 대상 내부 Digest 캐시 응답 금지(§52).
- **Invalidation 트리거**: Entry/Head 변경·Algorithm/Version Deprecation·Integrity/Canonicalization/Field Set Version 변경·Tamper Incident 발생·Verification 실패 시 즉시 무효화. **Tamper 감지 시 캐시 우회**(stale digest로 tamper 은폐 방지) — 무결성 상태를 캐시가 가리지 못하도록.
- **무후퇴 보장**: 캐시는 부가 계층 — 실 verify(`AdminGrowth.php:1429`)·`Crypto.php`·`MediaHost` 동작 불변. 캐시 미스는 항상 재계산으로 안전 폴백.
- **실 구현은 선행 Ledger 신설 후 별도 승인세션.**

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_INDEX_PERFORMANCE]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_API_CONTRACT]] · [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
