# DSAR — Approval Dynamic Role Version (EPIC 06-A-03-02-03-04 Part 3-5 · per-entity: Dynamic Role Version)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_DYNAMIC_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_DYNAMIC_ROLE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT`](DSAR_APPROVAL_DYNAMIC_ROLE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped(Part 3-1~3-4)·Decision Core 실 구현 부재
- **불변**: UNKNOWN은 Permit하지 않음(fail-closed) · Dynamic ≠ 정적 role · 마케팅 Rule Engine 오흡수 금지(KEEP_SEPARATE) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Dynamic Role Version은 Dynamic Role Definition의 **불변(Immutable) 이력 스냅샷**이다(스펙 §1-3·§8 Rule Version·§33 "Immutable Version · Rule Version Binding"). 정의가 변경될 때마다 새 버전을 생성해 과거 결정이 어느 버전 기준으로 내려졌는지 재현 가능하게 하는 것이 목적이며, 정의 자체를 덮어쓰는(mutable update) 현행 관행과 대비된다.

## 2. Canonical 필드

스펙 §8(Rule Version: Initial/Update/Security Patch/Optimization/Migration)·§33(Database Constraint) 근거 설계 필드(코드 0·미확정):

- `version_id`(PK) · `role_definition_ref`(→ Dynamic Role Definition) · `version_no`(단조 증가) · `change_type`(Initial/Update/Security Patch/Optimization/Migration) · `rule_snapshot`(해당 버전 시점 Rule 표현식 스냅샷) · `digest`(Digest Validation) · `is_immutable`(true 고정) · `superseded_by_ref` · `created_at`/`created_by` · `tenant_id`

## 3. 열거형 / 타입

- `change_type`: `Initial` | `Update` | `Security Patch` | `Optimization` | `Migration` (스펙 §8, 그대로 인용)

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **Dynamic Role Version = ABSENT(완전 부재)**: 전수조사·중복 감사 어느 문서에도 role 정의에 결부된 version 컬럼/테이블 언급이 없다 — `dynamic/runtime/session/conditional/context role` grep 0(전수조사 §1)에 의해 그 상위 개념인 Version 역시 존재 근거가 없다.
- **정적 role의 "버저닝 없음" 대조**: `team_role`(`UserAuth.php:1019`)·`admin_level`(`UserAuth.php:191,1022`)·`api_key.role`(`Db.php:942-955`)은 모두 **값이 직접 갱신되는 단일 컬럼**이며 변경 이력을 별도 버전 엔티티로 관리하지 않는다(전수조사 §1 — team_role 변경은 `TeamPermissions.php:774`의 관리작업으로 원본 컬럼을 직접 덮어씀, 버전 스냅샷 생성 없음).
- **거버넌스 계층 전체 부재(ADR §16 원용)**: ADR 본문이 명시한 "Version/Snapshot/Digest/Evidence·Drift/Revalidation/Reconciliation/Simulation = grep 0" 판정에 Version이 포함된다.

## 5. 설계 원칙

- **Immutable 강제**: 생성 후 어떤 필드도 수정 불가(append-only) — 이는 ADR D-2 UNKNOWN Permit 금지 규율과 함께 "결정의 재현성" 보장 축.
- **Rule Version Binding**: Dynamic Role Definition의 `rule_ref`는 항상 특정 `version_id`를 가리켜야 하며, Definition만 참조하고 Version을 생략하는 설계는 금지(스펙 §33 명시 제약).
- **정적 role 변경 이력과의 결합 지점 명시**: `TeamPermissions.php:774`(team_role 변경 관리작업)는 향후 Dynamic Role Version이 참조할 "변경 트리거 소스" 후보로 기록하되, 현재는 버전 스냅샷을 만들지 않으므로 Adapter 설계만 남긴다(직접 개조 금지).

## 6. Gap / BLOCKED_PREREQUISITE

- Version이 귀속될 Dynamic Role Definition 자체가 순신규(자매편 `DSAR_APPROVAL_DYNAMIC_ROLE_DEFINITION.md` §6 참조) — Definition 확정 전에는 Version 스키마도 확정 불가(순차 종속).
- **BLOCKED_PREREQUISITE(RP-002)**: Role Registry(Part 3-1)의 Version 개념(선행 블록)이 실 구현되지 않아 Dynamic Role Version과의 정합 설계가 보류.
- Digest Validation 알고리즘(해시 방식 등) 미정 — 별도 세션에서 Evidence/Digest 엔티티와 함께 확정 필요.
