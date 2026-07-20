# DSAR — Service Index & DB Constraint (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Index & DB Constraint)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role(Part 3-5)·Decision Core 실 구현 부재
- **불변**: 무후퇴 · 외부 벤더 자격증명 내부 identity 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차·279차 재플래그 금지

---

## 1. 목적

§35(Database Constraint)는 **Unique Identity · Immutable Version · Secret Version · Certificate Version**(4종)을, §36(Index)은 **Identity · Runtime · Secret · Certificate · Role**(5종)을 정의한다. ★현행 이 저장소에 Service/System/Machine Identity 전용 테이블 자체가 없다(EXISTING §2 grep 0). 가장 근접한 실 스키마는 `api_key`(`Db.php:942-958`)·`channel_credential`(`:976-990`)·`connector_token`(`:961-973`)이며, api_key만 role+scope+expires_at+is_active를 갖춘 identity 성격 스키마다(EXISTING §1). 본 문서는 9개 제약/인덱스 항목을 근접 substrate와 대조한다.

## 2. Canonical 필드

- **항목** — §35/§36 원문 9종 중 1
- **분류** — Constraint(§35)/Index(§36)
- **판정** — PRESENT/PARTIAL/ABSENT/OUT_OF_SCOPE
- **현재 substrate** — file:line(없으면 ABSENT)

## 3. 열거형 / 타입

**Constraint(§35) 4종(원문 그대로)**: `UNIQUE_IDENTITY` · `IMMUTABLE_VERSION` · `SECRET_VERSION` · `CERTIFICATE_VERSION`.

**Index(§36) 5종(원문 그대로)**: `IDX_IDENTITY` · `IDX_RUNTIME` · `IDX_SECRET` · `IDX_CERTIFICATE` · `IDX_ROLE`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | 항목 | 분류 | 판정 | 근거(file:line) |
|---|---|---|---|---|
| 1 | Unique Identity | Constraint | **PARTIAL** | `api_key`(`Db.php:942-958` — id/tenant_id/key_prefix/key_hash/name/role/scopes_json/is_active/expires_at 컬럼 실재)가 근접 스키마 — GROUND_TRUTH 인용 범위에 `key_hash` UNIQUE 제약의 명시적 키워드는 확인되지 않아 스키마 존재만 PARTIAL로 정직 판정(제약 세부는 과신 금지). Service/System/Machine 전용 identity 테이블 자체는 ABSENT |
| 2 | Immutable Version | Constraint | **PARTIAL(근접 동작 패턴)** | api_key rotate는 기존 row를 파괴하지 않고 `is_active=0` 처리 후 신규 row 생성(`Keys.php:150-187`) — DELETE/UPDATE 파괴 없이 이력 보존되는 동작 패턴이 근접. 단 전용 "Version" 컬럼/번호 자체는 없음(EXISTING §4 "api_key는 회전=신규 row"). Immutable Version 전용 제약은 ABSENT |
| 3 | Secret Version | Constraint | **PARTIAL** | Crypto KEK 버전(`Crypto.php:23-24` — `cred_kek_vN` 패턴, `:45-74` 조회/생성) 실재 — 단 이는 KEK(암호화 키) 단위 버전이지 channel_credential/connector_token 등 개별 Secret record 단위 버전 컬럼이 아님(ADR §근접 substrate 표 SECRET_AT_REST_SUBSTRATE) |
| 4 | Certificate Version | Constraint | **ABSENT** | Certificate Governance 완전 부재(cert_expires grep 0·EXISTING §5) — 버전 개념 자체 없음 |
| 5 | Identity 인덱스 | Index | **PARTIAL** | api_key 게이트가 매 요청 sha256 조회+`is_active`+테넌트 바인딩을 즉시 수행(`index.php:502-508,609-619`) — 조회가 실 동작하나 GROUND_TRUTH 인용 범위에 명시적 인덱스 정의(CREATE INDEX 등)는 확인되지 않아 "조회 로직 실재·인덱스 세부 미인용"으로 정직 판정 |
| 6 | Runtime 인덱스 | Index | **ABSENT** | Runtime Identity/Context 테이블 자체 부재(EXISTING §9 grep 0) |
| 7 | Secret 인덱스 | Index | **PARTIAL** | `channel_credential`(`Db.php:976-990`)·`connector_token`(`:961-973`) 스키마 실재·조회 동작(`ChannelCreds.php:191,518,721` 복호)하나 인덱스 세부 미인용(#5와 동일 판정 근거) |
| 8 | Certificate 인덱스 | Index | **ABSENT** | Certificate 테이블 자체 부재(#4와 동일 근본 원인) |
| 9 | Role 인덱스 | Index | **PARTIAL** | api_key `role` 컬럼(`Db.php:942-958`, DEFAULT 'viewer')이 매 요청 RBAC rank 비교에 사용(`index.php:572-598`) — 조회·비교 동작 실재, 인덱스 세부 미인용 |

## 5. 설계 원칙

1. **api_key/channel_credential/connector_token 스키마를 재구현하지 않고 Service Identity Registry의 기반 컬럼으로 재사용** — 신규 Identity/Secret/Certificate 테이블은 이들과 병렬 신설이 아니라 참조·확장(ADR D-1 Golden Rule).
2. **"조회 로직 실재"와 "인덱스 정의 명시"를 혼동 금지** — #1·#5·#7·#9는 스키마·조회 동작이 GROUND_TRUTH에 확인되나, CREATE INDEX/UNIQUE 제약의 명시적 키워드 인용은 이 3문서 범위에서 확인되지 않아 PARTIAL로 정직 유보(과신 금지, 세부 DDL 재조사 필요).
3. **Immutable Version(#2)은 api_key rotate의 비파괴 동작 패턴을 그대로 승격** — `is_active=0`+신규 row 패턴(`Keys.php:150-187`)을 Version 컬럼 신설의 참조 모델로, 삭제·재구현 금지.
4. **Certificate Version/인덱스(#4·#8)는 순신규이며 근접 substrate로 오분류 금지** — Certificate Governance 완전 부재를 그대로 정직 유지.
5. **Secret Version(#3)은 KEK 버전과 개별 Secret record 버전을 동일시하지 않는다** — KEK는 암호화 키 자체의 버전(`Crypto.php:23-24`), 신규 Secret Version은 credential record(channel_credential 등) 단위로 별도 설계.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 9종 전부 Canonical Service Identity/Secret/Certificate Registry 테이블 실구현 이후에 제약/인덱스 적용 가능.
- **PARTIAL**: Unique Identity(#1)·Immutable Version(#2)·Secret Version(#3)·Identity 인덱스(#5)·Secret 인덱스(#7)·Role 인덱스(#9) — 근접 스키마·조회 동작 실재, 전용 제약/인덱스 세부 미확인.
- **ABSENT(순신규)**: Certificate Version(#4)·Runtime 인덱스(#6)·Certificate 인덱스(#8).
- **판정**: NOT_CERTIFIED · 실 제약/인덱스 = Canonical Service Identity/Secret/Certificate Registry 테이블 신설 + DDL 세부 재조사 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SERVICE_API_CONTRACT]] · [[DSAR_APPROVAL_SERVICE_TEST_STRATEGY]] · [[DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE]]
