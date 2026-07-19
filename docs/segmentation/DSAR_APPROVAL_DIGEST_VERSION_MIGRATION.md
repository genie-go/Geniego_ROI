# DSAR — Digest Version Migration Foundation (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§59 Digest Version Migration Foundation (원문 전사):
- `source digest version` · `target digest version`
- `source digest` · `target digest`
- `source canonical payload version` · `target canonical payload version`
- `semantic equivalence result`
- `migration batch`
- `migrated_at` · `migration actor`
- `reconciliation result`
- `status` · `evidence`
- **Canonicalization 변경 시 단순 Rehash 아닌 Semantic Equivalence 검증.**

의미: Digest Version Migration은 Digest 버전(알고리즘·Canonicalization·Field Set 조합의 버전)이 바뀔 때 과거 Entry를 새 버전으로 이관하는 계층이다. 핵심은 **Canonicalization이 바뀐 경우 단순 Rehash(같은 원문을 새 알고리즘에 다시 넣는 것)로는 부족**하다는 점 — source/target canonical payload version이 다르면, target Digest가 진짜로 "같은 의미의 데이터를 정규화한 결과"임을 **Semantic Equivalence로 검증**해야 한다. migration batch·actor·migrated_at을 기록하고 reconciliation result(§56)로 대사한다. 이는 정규화 규칙 변경이 조용히 데이터 의미를 바꾸는 Migration Silent Mutation을 차단한다(§60 Legacy Import와 구분: 여기는 자기 Canonical 버전 간 이관).

## 2. 기존 구현 대조

- **Digest Version Migration은 부재** — source/target digest version·canonical payload version·semantic equivalence 검증 구조 전무.
- 개념별 능력 판정(GROUND_TRUTH):
  - `source/target digest version`·`canonical payload version` → **ABSENT**: Digest Version·Canonical Payload Version 개념 자체 부재. Digest는 버전 태깅 없는 단일 SHA-256(`SecurityAudit.php:27`).
  - `semantic equivalence result` → **ABSENT**: 두 정규화 버전이 같은 의미인지 검증하는 로직 0.
  - `migration batch`·`migrated_at`·`migration actor` → **ABSENT**: 무결성 Digest 이관 배치 개념 부재. (`schema_migrations`(`Migrate.php:38`)는 스키마 마이그레이션 등록소이지 Digest 버전 이관 아님.)
  - `reconciliation result` → **ABSENT**: 대사 계층 부재(§56).
  - **단순 Rehash 아님(Semantic Equivalence)** → **위험 표면**: 현행은 Canonicalization 자체가 부재(`json_encode(UNESCAPED_UNICODE)` 비정규화, `SecurityAudit.php:27`)라, 만약 향후 Canonicalization을 도입하며 과거 Entry를 재해시하면 **원문 순서·Unicode·Decimal 차이로 semantic equivalence가 깨질 수 있는** 정확히 그 위험 지대에 있음.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE** (Digest 버전·Canonical Payload 버전·Semantic Equivalence 전무).
- 선행 의존: §10 Version·§13~§15 Canonicalization/Field Set/Projection·§56 Reconciliation·§57 Rotation ABSENT에 종속 → 이관할 source/target 버전·정규화 payload가 없어 **BLOCKED_PREREQUISITE**.
- cover: **0** (버전 이관·의미 동등성 검증 전무).

## 4. 확장/구현 방향 (설계)

- 순신규 Digest Version Migration Foundation — source/target digest version·source/target canonical payload version·semantic equivalence result·migration batch·actor·migrated_at·reconciliation result를 기록. Canonicalization 변경 이관은 반드시 Semantic Equivalence 검증(단순 Rehash 금지).
- **★단순 Rehash 금지의 핵심**: source canonical payload와 target canonical payload가 **같은 비즈니스 의미**임을 검증한 뒤에만 target Digest 채택 — 필드순서·Unicode NFC·Decimal scale·Timestamp precision 정규화 차이가 의미를 바꾸지 않았음을 확인(§17~§21). 현행 비정규화 preimage(`SecurityAudit.php:27`)를 Canonical로 이관하는 첫 마이그레이션이 바로 이 검증을 요구.
- **★과거 Digest 보존**: target으로 이관해도 source digest·version은 삭제·덮어쓰기 금지(§5.8) — Dual-Digest(§58)와 동일 원리로 병행 보존.
- 재사용 substrate: `schema_migrations`(`Migrate.php:38,54-60`)의 배치·트랜잭션 패턴을 migration batch 실행 골격으로 참조(단 checksum(`Migrate.php:50,63-64`)은 비교 미실행 장식이므로 Digest 근거 아님). 서버UTC(`SecurityAudit.php:24`)로 migrated_at.
- **★reconciliation 연계**: 이관 후 §56 Reconciliation으로 Stored(target) vs Recomputed(target) 및 Canonical vs 과거 source 대사.
- 장식 오인 금지 — `journey_decision_log`(`JourneyBuilder.php:1192`) in-place UPDATE·`menu_audit_log.hash_chain`(`AdminMenu.php:169-212`) verify() 0은 버전 이관 근거 아님.

관련: [[DSAR_APPROVAL_DIGEST_ALGORITHM_ROTATION]] · [[DSAR_APPROVAL_DIGEST_DUAL_TRANSITION]] · [[DSAR_APPROVAL_LEGACY_HASH_IMPORT]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
