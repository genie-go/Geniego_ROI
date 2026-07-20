# DSAR — Approval API Client Identity (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: API Client Identity)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정 사람 이상 통제 · 외부 벤더 자격증명 ≠ 내부 identity(오흡수 금지) · UNKNOWN Permit 금지 · Golden Rule(산재 통합) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

API Client Identity는 API 호출 주체로서의 비인간 identity를 식별하는 엔티티다(스펙 §1 구현목표 항목4 "API Client Identity"·§2 Canonical Entity `APPROVAL_API_CLIENT`). Part 3-6 전체에서 **유일하게 실 substrate가 PARTIAL로 확인된 대상**이며(api_key), 목적은 이 기존 실재 substrate를 Canonical API Client Identity로 승격시키고, 2경로 이원화·강제 max TTL 부재·자동회전 부재를 Runtime Guard/Rotation Policy 설계로 정형화하는 것이다(코드 0, 설계만).

## 2. Canonical 필드

스펙 §2(Canonical Entity)·§4(Credential Type)·§35(Database Constraint) 및 실 스키마(`Db.php:942-958`) 근거의 설계 명세 필드:

- `api_client_id`(PK, 실 substrate 상 `api_key.id`에 대응) · `tenant_id` · `key_prefix` · `role_ref`(4단계 rank) · `scopes_ref`(화이트리스트) · `expires_at` · `is_active` · `last_used_at` · `use_count` · `rotation_ref`(→ Secret Rotation, 스펙 §13) · `created_at`

## 3. 열거형 / 타입

- `role`(실 substrate 4단계 rank, `Keys.php:95` 화이트리스트): `viewer` < `connector` < `analyst` < `admin`
- `scope`(실 substrate 화이트리스트, `Keys.php:99-114,201-210`): `write:*` | `write:ingest` | `admin:keys` 등
- `runtime_authentication`(스펙 §19, 설계상 목표 열거형 — 현재는 `is_active`(bool)+`expires_at`(string) 2필드뿐, 통합 열거형 부재): `Valid` | `Expired` | `Revoked` | `Unknown`(UNKNOWN Permit 금지)

## 4. 실 substrate 매핑 (★PARTIAL·ground-truth만 인용)

- **스키마**: `api_key(id,tenant_id,key_prefix,key_hash(sha256),name,role DEFAULT 'viewer',scopes_json,is_active,last_used_at,use_count,expires_at,created_at)`(`Db.php:942-958`).
- **CRUD**: create(`Keys.php:81-133`·role 화이트리스트 `:95`·scope 화이트리스트 `:99-114,201-210`·원문 1회 응답·DB엔 sha256만 `:40,116,128`)·rotate(`:150-187`·기존 is_active=0+신규 생성·role/scope/expires 승계·**수동 HTTP만**)·revoke(`:135-148` is_active=0).
- **인증 게이트**(`index.php:477-622`): 추출(`:478-486`)·sha256 조회+is_active(`:502-508`)·만료(`:518-520`)·사용량(`:522-525`)·레이트리밋(`:527-570`)·RBAC rank+scope(`:572-598`)·테넌트 바인딩(`:609-619`).
- ★role(4단계 rank)+scope(화이트리스트)+expires_at+is_active+rotate를 갖춘 **Part 3-6 유일 실 비인간 identity**(EXISTING_IMPLEMENTATION §1). 단 자동/정책 회전·강제 max TTL 부재.
- **★2경로 이원화(DUPLICATE_AUDIT D-1, 감사 비대칭)**: `Keys.php`(`routes.php:867-871,2344-2348`, 감사 0건) vs `UserAuth.php`(`routes.php:1557-1560,2537-2540`, create/revoke/rotate `UserAuth.php:4339-4362/4364-4377/4379`, 감사 REAL `UserAuth.php:4360,4375`). 동일 `api_key` 테이블·동일 기능이나 감사 유무가 상이하다.
- **rotate 함수 실재·정책 부재**: `Keys.php:150-187`(수동 HTTP만), 자동/주기 스케줄 부재(bin 35 cron grep 0, EXISTING_IMPLEMENTATION §4). expires_at은 생성 시 클라 지정값이며 강제 max TTL 없음.

## 5. 설계 원칙

- **Golden Rule — 확장 우선**: api_key를 API Client Identity substrate로 그대로 승격(재발명 금지). 2경로(Keys.php/UserAuth.php)를 단일 등록 지점·단일 감사경로로 통합(DUPLICATE_AUDIT D-1 채택안).
- **Runtime Guard 승격**: 기존 `is_active`+`expires_at` 게이트(`index.php:518-520`)를 Runtime Guard substrate로 삼되, UNKNOWN Permit 금지 원칙에 따라 `Valid/Expired/Revoked/Unknown` 4상태 통합 열거형(스펙 §19)을 신규 설계.
- **Rotation Policy 승격**: 수동 rotate 함수(`Keys.php:150-187`)를 스케줄·만료상한을 갖춘 정책으로 승격(스펙 §13).
- **Trust Level 결합은 후속**: api_key 게이트는 Runtime Guard 근접 substrate이나 Trust Level(Unknown~Critical, 스펙 §6) 자체는 grep 0 — 이번 문서는 API Client Identity 필드에 `trust_level_ref` 자리만 마련하고 값 계산은 설계하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- 통합 API Client Identity 엔티티(단일 PK·단일 감사경로)는 없음 — 현재는 `api_key` 테이블에 2경로가 직접 접근하는 상태. Registry로 감싸는 작업 자체가 신규.
- 강제 max TTL·자동회전 워커·`Valid/Expired/Revoked/Unknown` 통합 열거형 = grep 0(EXISTING_IMPLEMENTATION §9 "통합 열거형 grep 0").
- **BLOCKED_PREREQUISITE(RP-002)**: role rank(4단계)가 이미 존재하지만, 이를 Permission Engine·Role Registry(Part 2·3-1)의 Effective Permission과 결합하는 것은 두 선행 Part 모두 설계 명세(코드 0) 단계라 진행 불가.
