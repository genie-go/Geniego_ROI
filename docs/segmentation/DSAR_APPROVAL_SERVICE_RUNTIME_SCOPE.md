# DSAR — Approval Service Runtime Scope (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Runtime Scope)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: api_key `scopes_json`=API Client 스코프이지 인프라 Runtime Scope(Cluster/Queue/Bucket 등) 아님(과대 대입 금지) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Runtime Scope는 스펙 §10이 정의하는 비인간 주체의 접근 대상 경계(Namespace·Cluster·Service·Queue·Topic·Bucket·Database·Schema·Table·API)이다. ADR §1·ground-truth §1은 현행 유일한 실 스코프 substrate가 **api_key의 `scopes_json`(API 화이트리스트)**과 **인증 게이트의 RBAC scope 검사**임을 확정한다. 이는 10개 차원 중 "API" 1개에만 근접하며, Namespace·Cluster·Queue·Topic·Bucket·Database·Schema·Table 9개 차원은 별도의 인프라/데이터 경계 개념으로 ground-truth에 인용되지 않는다. 본 엔티티는 "API 엔드포인트 화이트리스트가 있다"는 것과 "10개 차원 전체를 아우르는 Runtime Scope 모델이 있다"는 것을 정직 구분한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `service_runtime_scope_id` | Runtime Scope 레코드 식별자(PK) |
| `scope_dimension` | §10 열거(Namespace/Cluster/Service/Queue/Topic/Bucket/Database/Schema/Table/API) |
| `scope_value` | 스코프 값(현행 API 차원만 `scopes_json` 화이트리스트로 존재) |
| `enforced_at` | 강제 지점(현행 `index.php` 인증 게이트 재사용) |

## 3. 열거형 / 타입

- **`scope_dimension`**(스펙 §10 verbatim, 10종): `Namespace` · `Cluster` · `Service` · `Queue` · `Topic` · `Bucket` · `Database` · `Schema` · `Table` · `API`.

## 4. 실 substrate 매핑 (PARTIAL(API 1종만)/ABSENT(9종)·ground-truth만 인용)

| 차원(스펙 §10) | 판정 | 실 substrate (file:line) |
|---|---|---|
| API(엔드포인트 화이트리스트) | **PARTIAL/PRESENT** | api_key `scopes_json`(`Db.php:942-958`)·스코프 화이트리스트 생성(`Keys.php:99-114,201-210`)·인증 게이트 RBAC rank+scope 검사(`index.php:572-598`) |
| Namespace · Cluster · Service · Queue · Topic · Bucket · Database · Schema · Table (9종) | **ABSENT** | ground-truth 2편에 이들 9개 차원 관련 file:line 인용 없음 |

★ground-truth §1 원문: "role(4단계 rank)+scope(화이트리스트)+expires_at+is_active+rotate를 갖춘 유일 실 비인간 identity." 인용된 scope는 API 엔드포인트/기능 단위 화이트리스트(예: `write:ingest`, `admin:keys` 등 CLAUDE.md 기재 scope 문자열류)이지, 메시지 큐 Topic·오브젝트 스토리지 Bucket·DB Schema/Table 단위의 데이터 경계 통제가 아니다.

## 5. 설계 원칙

1. **api_key `scopes_json`을 Runtime Scope의 `API` 차원 substrate로 재사용(확장)** — 신규 API 스코프 화이트리스트 재구현 금지.
2. **`API` 차원과 나머지 9개 차원을 동일 성숙도로 오판정 금지** — 1/10 차원만 실재함을 명시. "scope가 있으니 Runtime Scope 전체가 갖춰졌다"는 과신을 방지.
3. **Database/Schema/Table 차원은 향후 DB 레벨 접근통제(예: MySQL GRANT, 행 단위 tenant_id 격리)와의 관계를 별도 재조사 대상으로 등재** — 이번 ground-truth 2편은 이 연결을 확인하지 않았으므로 임의 매핑 금지.
4. **Queue/Topic 차원은 `omni_outbox` claim/lease(락 토큰)와 혼동 금지** — ground-truth §8(재사용 근거는 Assignment 문서이지 본 Scope 문서 인용 대상 아님)이 "identity 아님(동시성 락)"으로 명시한 개념이며, Runtime Scope(접근 경계)와는 다른 차원.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Runtime Scope가 Service Role/Effective Service Permission 결정 로직의 입력으로 배선되는 지점은 선행 실 구현 이후. 본 차수 코드 0.
- **Gap-1(9/10 차원 미인용)**: Namespace/Cluster/Service/Queue/Topic/Bucket/Database/Schema/Table — ground-truth 2편에 file:line 인용 없음. 순신규.
- **Gap-2(API 차원의 성격 재확인 필요)**: 현행 `scopes_json`은 기능 단위(write:*, admin:keys 등) 화이트리스트로 추정되며, 자원 단위(특정 리소스 ID) 스코프는 아님 — Effective Service Permission 설계 시 재검증 필요.
- **정직 부재**: api_key scope 실재를 "Runtime Scope 10개 차원이 대체로 갖춰졌다"로 확대 해석 금지 — 1개 차원(API)만 근접. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실 구현 + 별도 승인세션(RP-002).
