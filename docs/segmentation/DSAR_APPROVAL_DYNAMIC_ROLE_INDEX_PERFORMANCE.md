# DSAR — Dynamic Role Index & DB Constraint (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Index & DB Constraint)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · 마케팅 automation 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차 재플래그 금지

---

## 1. 목적

§33(Database Constraint)는 **Immutable Version · Rule Version Binding · Tenant Isolation · Digest Validation**(4종)을, §34(Index)는 **Rule · Context · Projection · Runtime · Version**(5종)을 정의한다. ★현행 이 저장소에 Dynamic Role/Rule 전용 테이블 자체가 없다(EXISTING_IMPLEMENTATION §1·§2 grep 0). 가장 근접한 실 스키마는 `user_session`(`Db.php:1111-1119`·`ip/ua/created_at/last_seen` `UserAuth.php:4237`)이며, 이는 role 결정에 미사용되는 기록·표시용 컬럼이다(EXISTING_IMPLEMENTATION §5). 본 문서는 9개 제약/인덱스 항목을 근접 substrate와 대조한다.

## 2. Canonical 필드

- **항목** — §33/§34 원문 9종 중 1
- **분류** — Constraint(§33)/Index(§34)
- **판정** — PRESENT/PARTIAL/ABSENT/OUT_OF_SCOPE
- **현재 substrate** — file:line(없으면 ABSENT)

## 3. 열거형 / 타입

**Constraint(§33) 4종(원문 그대로)**: `IMMUTABLE_VERSION` · `RULE_VERSION_BINDING` · `TENANT_ISOLATION` · `DIGEST_VALIDATION`.

**Index(§34) 5종(원문 그대로)**: `IDX_RULE` · `IDX_CONTEXT` · `IDX_PROJECTION` · `IDX_RUNTIME` · `IDX_VERSION`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | 항목 | 분류 | 판정 | 근거(file:line) |
|---|---|---|---|---|
| 1 | Immutable Version | Constraint | **ABSENT** | Rule Version 컬럼/테이블 자체 부재(ADR §거버넌스 계층 완전 부재 — Version/Snapshot/Digest/Evidence grep 0) |
| 2 | Rule Version Binding | Constraint | **ABSENT** | Rule Version 자체 부재 → 바인딩할 대상 없음(#1과 동일 근본 원인) |
| 3 | Tenant Isolation | Constraint | **OUT_OF_SCOPE(이 3문서 인용범위 밖)** | 상위 ADR·ground-truth 2문서(EXISTING_IMPLEMENTATION·DUPLICATE_AUDIT) 어디에도 tenant_id 격리 스키마 file:line 인용이 없음(반날조 원칙상 타 Part 문서 사안을 차용해 PRESENT로 단정 금지) — 실 판정은 별도 재조사 필요 |
| 4 | Digest Validation | Constraint | **ABSENT** | Digest/Evidence 계층 완전 부재(ADR §거버넌스 계층 완전 부재 명시 확정) |
| 5 | Rule 인덱스 | Index | **ABSENT** | Rule 테이블 자체 부재(#1과 동일) |
| 6 | Context 인덱스 | Index | **PARTIAL** | `user_session`(`Db.php:1111-1119`) 테이블은 실재하나 role 결정 입력으로 미사용(EXISTING_IMPLEMENTATION §5) — Dynamic Role Context 전용 인덱스가 아니라 세션 표시용 스키마의 부산물 |
| 7 | Projection 인덱스 | Index | **ABSENT** | Projection 스키마 자체 부재(ADR §3 Canonical Interface·순신규) |
| 8 | Runtime 인덱스 | Index | **ABSENT** | Runtime Role 테이블 자체 부재(EXISTING_IMPLEMENTATION §1) |
| 9 | Version 인덱스 | Index | **ABSENT** | Version 컬럼 부재(#1과 동일) |

## 5. 설계 원칙

1. **user_session을 Dynamic Role Context 스키마로 오표기 금지** — `Db.php:1111-1119`는 로그인 세션 기록·표시용(`listSessions` `UserAuth.php:4254-4281`)이지 Rule 평가용 Context Registry가 아니다. 신규 스키마는 이를 attribute source 중 하나로 재사용(중복 세션 테이블 신설 금지)하되 전용 Context 테이블은 별도 신설.
2. **Tenant Isolation(#3)은 이번 문서 인용 범위 밖으로 정직 유보** — 다른 Part(예: Scoped Role Part 3-4)의 tenant 격리 근거를 이 Part 3-5 ground-truth에 차용해 판정하지 않는다(반날조 원칙). Rule/Context/Projection 신규 스키마 설계 시 tenant_id 파티션 키 상속은 별도 재조사 후 확정.
3. **Immutable Version/Rule Version Binding/Digest Validation(#1·#2·#4)은 순신규이며 근접 substrate로 오분류 금지** — ADR이 명시한 "거버넌스 계층 완전 부재"를 그대로 정직 유지.
4. **Runtime 인덱스(#8)는 정적 team_role/api_key 인덱스를 대체 근거로 사용하지 않는다** — Dynamic/Runtime Role 테이블 자체가 없으므로 정적 role 컬럼의 인덱스 유무는 이 항목과 무관.
5. **마케팅 `RuleEngine.php` 등의 테이블/인덱스는 이 스키마의 근접 substrate가 아니다(KEEP_SEPARATE)** — channel_roas/sku_stock 대상 테이블은 별도 도메인으로 보존, 오흡수 금지.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 9종 전부 Canonical Rule/Context/Projection/Runtime Registry 테이블 실구현 이후에 제약/인덱스 적용 가능.
- **OUT_OF_SCOPE**: Tenant Isolation(#3) — 이 3문서 인용범위 밖, 별도 재조사 필요(판정 유보).
- **PARTIAL**: Context 인덱스(#6) — `user_session` 근접이나 role 미연동 스키마.
- **ABSENT(순신규)**: Immutable Version(#1)·Rule Version Binding(#2)·Digest Validation(#4)·Rule/Projection/Runtime/Version 인덱스(#5·#7·#8·#9).
- **판정**: NOT_CERTIFIED · 실 제약/인덱스 = Canonical Rule/Context/Projection/Runtime Registry 테이블 신설 + Tenant Isolation 재조사 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_DYNAMIC_ROLE_API_CONTRACT]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_TEST_STRATEGY]] · [[DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE]]
