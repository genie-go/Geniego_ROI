# DSAR — Ledger Link (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**LEDGER_LINK(§23)** LINK_TYPE:
- PREVIOUS_ENTRY · NEXT_ENTRY_REFERENCE
- COMMAND_TO_VALIDATION · VALIDATION_TO_COMMIT · COMMIT_TO_RECORD · RECORD_TO_HISTORY
- SNAPSHOT · EVIDENCE · AUDIT · OUTBOX · SEQUENTIAL_REFERENCE
- CORRECTS · AMENDS · SUPERSEDES · REVERSES_REFERENCE · VOIDS_REFERENCE · REDACTS_REFERENCE
- MIGRATED_FROM · RECONCILES · RECOVERS · CUSTOM

필드: link id·tenant id·source entry id·target entry id·link type·link direction·link policy version·created_at·immutable flag·status·evidence.

원칙: **★Cross-Tenant Link 차단**(source/target 동일 tenant 강제).

## 2. 기존 구현 대조

- **부분 실재(PARTIAL).** 유일 실 Link = `SecurityAudit.php`의 **prev_hash 체인(`:27,39,64`)** — hash=sha256(**prev**|tenant|actor|action|details|created_at)(`:27`)로 직전 Entry 를 해시에 편입, GENESIS(`:39`)로 기원 고정, verify(`:56-68`, 인용 근거 `:64`)가 prev_hash 이중검증. 이는 **PREVIOUS_ENTRY Link 1종**의 실 구현.
- **한계**: 그 외 LINK_TYPE(COMMAND_TO_VALIDATION·SNAPSHOT·CORRECTS·SUPERSEDES·RECONCILES 등)은 전부 부재 — 선행 §3.1 Decision Core ABSENT(`approval_decision` 0)로 연결할 Decision Record/Command/Snapshot Entry 가 없다. `journey_decision_log`(`JourneyBuilder.php:60,74,1192`)는 in-place UPDATE 라 불변 Link 대상 아님.
- **Cross-Tenant 차단**: SecurityAudit hash 는 tenant 를 해시에 편입(`:27`)하나, 명시적 source/target 동일-tenant Link 제약(별도 link 테이블·FK)은 부재 → §23 요구 "Cross-Tenant Link 차단"은 미강제.
- **Immutable flag/direction**: SecurityAudit prev_hash 는 단방향 암묵 링크일 뿐, 명시적 link direction·immutable flag·link policy version 필드 없음.

## 3. 판정
- Verdict: **PARTIAL** (PREVIOUS_ENTRY = PRESENT via SecurityAudit `:27,39,64` · 그 외 LINK_TYPE = ABSENT · Cross-Tenant 차단 미강제)
- 선행 의존: 대부분 LINK_TYPE 은 §3.1 Decision Core/§3.2 Actions/Runtime ABSENT 에 의존 → 해당분 **BLOCKED_PREREQUISITE**
- cover: **PREVIOUS_ENTRY만** — `SecurityAudit.php:27,39,64`

## 4. 확장/구현 방향 (설계)

- **재사용·확장(재구현 금지)**: SecurityAudit prev_hash 체인(`:27,39,64`)을 CANONICAL PREVIOUS_ENTRY Link 패턴으로 채택·확장. GENESIS(`:39`)·verify(`:56-68`) 이중검증을 링크 무결성 정본으로 유지.
- **순신규 link 테이블**: link id·tenant id·source/target entry id·link type(위 열거)·direction·link policy version·created_at·immutable flag·status·evidence. 명시적 로우로 다종 관계(SNAPSHOT/CORRECTS/SUPERSEDES/RECONCILES)를 표현 — 해시 체인 단일 축으론 부족.
- **★Cross-Tenant Link 차단 강제**: link INSERT 시 source.tenant = target.tenant = link.tenant 애플리케이션 검증 + DB FK/제약. SecurityAudit 의 tenant-in-hash(`:27`)만으론 링크 무결성 불충분.
- **무후퇴**: Link 는 Entry 를 수정하지 않는 추가 관계 로우(immutable flag=true·UPDATE/DELETE 금지) — SecurityAudit INSERT/SELECT-only 규율(`:8`) 계승.
- **선행 요건**: PREVIOUS_ENTRY 외 LINK_TYPE 은 Decision Core(불변 Record/Command/Snapshot Entry) 신설 후 배선 가능(BLOCKED_PREREQUISITE).

관련: [[DSAR_APPROVAL_DECISION_APPEND_ONLY_CONTRACT]] · [[DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
