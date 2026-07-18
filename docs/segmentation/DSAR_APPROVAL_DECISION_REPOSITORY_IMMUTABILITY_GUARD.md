# DSAR — Repository Immutability Guard (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**REPOSITORY_IMMUTABILITY_GUARD(§26)**:
- Immutable 전용 Insert Repository (append/read/verify 만)
- Generic CRUD 상속 금지
- Update/Delete Method 미노출
- Save 시 Existing ID 차단(기존 ID 로 저장 시도 거부)
- Dirty Checking 차단 / Read-only
- ORM Merge 금지
- Detached Reattach Update 금지
- Bulk JPQL/SQL Update 차단
- Native SQL Mutation 감사
- Migration Context 외 Direct Mutation 차단

## 2. 기존 구현 대조

- **Immutable 전용 Repository 계층 부재(ABSENT).** §GROUND_TRUTH: "Domain/Repo/DB Immutability Guard | ABSENT | 강제계층 없음(관례만)".
- 현행 데이터 접근은 PDO 직접(`Db.php` 싱글턴) — 전용 Immutable Insert Repository/CRUD 상속 차단 개념 없음. 승인 저장은 update 포함 in-place(`Mapping.php:285-289,327`).
- 근접 사례 `SecurityAudit.php`는 **관례상** INSERT/SELECT만 노출(`:8`·`:48-52` INSERT·`:56-68` SELECT/verify)이나, 이는 클래스가 스스로 update/delete 메서드를 안 만든 관례일 뿐 — Generic CRUD 상속 차단·Existing ID 차단·Bulk Update 차단 같은 **강제 가드가 아니다**. PHP/PDO 스택엔 JPA류 Dirty Checking/ORM Merge/Detached Reattach 개념 자체가 없어(ORM 미사용) 해당 항목은 N/A 이나, "Update/Delete 미노출·Existing ID 차단·Native SQL Mutation 감사"는 실질 미구현.
- `Migrate.php`(`:38,50,54-60`)가 마이그레이션 컨텍스트를 제공하나, "Migration Context 외 Direct Mutation 차단" 강제는 없음 — 운영 코드가 임의 UPDATE/DELETE 가능.

## 3. 판정
- Verdict: **ABSENT** (전용 Immutable Repository·강제 가드 부재 · 선행 부재 → **BLOCKED_PREREQUISITE**)
- 선행 의존: §3.1 Decision Core ABSENT → Repository 가 보관할 불변 Ledger Entry/Decision Record 부재 · APPEND_ONLY_CONTRACT(§24) 미강제
- cover: **0** (SecurityAudit 는 관례적 근접일 뿐 강제 가드 아님)

## 4. 확장/구현 방향 (설계)

- **순신규 Immutable Insert Repository**: append*(§24 허용 메서드)·read*·verify 만 노출. Generic CRUD 베이스 상속 금지 → update/delete/upsert/patch 메서드가 애초에 존재하지 않는 클래스 설계(APPEND_ONLY_CONTRACT §24 코드화).
- **재사용·CANONICAL**: SecurityAudit INSERT/SELECT-only 관례(`:8,48-52,56-68`)를 명시 Repository 계약으로 승격. Save 시 Existing ID(PK 존재) 감지 → 거부·Rejected Mutation Attempt 감사(SecurityAudit `:27` 해시 기록 재사용).
- **Native SQL Mutation 감사**: 원장 테이블 대상 UPDATE/DELETE SQL 은 정적 린트(§57 계열)로 차단·런타임 감사. Migration Context(`Migrate.php:38,50`) 화이트리스트 외 Direct Mutation 차단.
- **다계층**: Repository 가드(§26)는 도메인(§25) 위·DB(§27) 아래의 중간 강제 — 단독 불충분, DB Trigger/RLS/Permission(§27)로 최종 방어(애플리케이션 우회 대비).
- **선행 요건**: Decision Core + IMMUTABLE_LEDGER 신설 선행(보관 대상 부재 시 BLOCKED_PREREQUISITE).

관련: [[DSAR_APPROVAL_DECISION_APPEND_ONLY_CONTRACT]] · [[DSAR_APPROVAL_DECISION_DOMAIN_IMMUTABILITY_GUARD]] · [[DSAR_APPROVAL_DECISION_DATABASE_IMMUTABILITY_GUARD]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
