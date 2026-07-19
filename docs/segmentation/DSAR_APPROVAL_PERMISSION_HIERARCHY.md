# DSAR — Permission Hierarchy (EPIC 06-A-03-02-03-04 Part 2 · Permission Engine)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **GROUND_TRUTH 인용원(반날조 allowlist)**: [ADR](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md) · [DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md). `file:line`은 이 2문서에서만 인용.

---

## ① 목적 (Purpose)

Permission Hierarchy는 개별 Permission Definition들 사이의 **상하위 포함·함의 관계를 방향성 트리(계층)로 정형 선언**하는 최상위 골격이다. `{DOMAIN}:{RESOURCE}:{ACTION}` Canonical Code를 노드로 삼아, 상위 Permission이 하위 Permission을 자동 포함(`INCLUDES`)하거나 함의(`IMPLIES`)하는 구조를 데이터로 고정한다. 이는 Part 3 RBAC가 Role에 Permission을 묶기 전에, Permission 자체의 **의미론적 계층(예: `manage` ⊃ `update` ⊃ `view`)** 을 재현·감사 가능하게 만든다.

★**순신규**. 현재 플랫폼에 permission 계층 개념은 부재하다 — `acl_permission`은 `menu_key × actions`의 **flat(평면)** 구조이며 메뉴 간·action 간 상하위 트리가 없다(ADR §1·§D-4). 유일한 준-계층 신호는 `actions`의 `manage=superset`·`view 자동포함`(EXISTING §1.1 `TeamPermissions.php:39,182-192`)뿐으로, 이는 action 수준의 암묵 포함이지 Permission 계층 registry가 아니다.

## ② Canonical 필드

- `hierarchy id` · `tenant` · `code` · `name` · `description`
- `type`(아래 열거) · `registry`(소속 Permission Registry 참조) · `root permission`(계층 루트 Canonical Code)
- `combining behavior`(하위 결합 규칙: Deny-overrides / Most-specific / Union) · `inheritance direction`(상위→하위 vs 하위→상위)
- `max depth`(최대 계층 깊이 상한) · `circular prohibited`(순환 금지 플래그·항상 true) · `self reference prohibited`
- `active version`(현행 Hierarchy Version 참조) · `owner` · `status` · `valid_from` · `valid_to` · `evidence`

## ③ 열거형

- **TYPE**(7종): `RESOURCE_ACTION` / `DOMAIN` / `DATA_CLASSIFICATION` / `ADMINISTRATION` / `API` / `UI` / `CUSTOM`.
- **INHERITANCE_DIRECTION**: `TOP_DOWN`(상위 grant→하위 자동 포함) / `BOTTOM_UP`(하위 관측→상위 추론). 기본 `TOP_DOWN`.
- **COMBINING_BEHAVIOR**: `DENY_OVERRIDES` / `MOST_SPECIFIC` / `UNION`. 기본 `DENY_OVERRIDES`(ADR D-5 Default/Explicit Deny 우선).

## ④ substrate 매핑 (§92)

| Canonical 요소 | 실존 substrate | §92 태그 | 근거(allowlist) |
|---|---|---|---|
| Permission 노드(계층 대상) | `acl_permission`(menu×action·flat) | CANONICAL_PERMISSION_SCOPE_CANDIDATE(정형화) | ADR §D-1 · EXISTING `TeamPermissions.php:152-171` |
| action 수준 암묵 포함 | `manage=superset`·`view 자동포함` | PARTIAL(action-only·계층 아님) | EXISTING `TeamPermissions.php:39,182-192` |
| Hierarchy type/registry/root/edge/max depth/circular guard/active version | — | **ABSENT(순신규)** | ADR §D-4 "Hierarchy/Group/Bundle=순신규" |
| combining behavior(Deny-overrides) | index.php RBAC write 게이트(런타임 Default Deny 성향) | PARTIAL-substrate(PEP·계층 결합 아님) | EXISTING `index.php:590-596` |

- Permission 계층 트리·`root permission`·`inheritance direction`·`max depth`·순환금지·`active version`을 데이터로 선언하는 구조체 → **no hits(ABSENT)**.

## ⑤ 설계원칙

- **Golden Rule = Extend**: `TeamPermissions`의 `team`/`acl_permission`(menu×action)을 계층 노드의 substrate로 확장·정규화(menu_key→Canonical Code Legacy Mapping·ADR §3). 별도 Permission Registry/Resolver 신설 금지.
- **Permission ≠ Role ≠ Authority(ADR D-5)**: Hierarchy는 Permission 간 관계만 표현. Role 계층(Part 3 RBAC)·Authority 한도(Part 5)와 동일 Entity로 취급 금지. 계층 노드를 "역할"로 승격하지 않는다.
- **Default Deny·순환 금지**: `circular prohibited`·`self reference prohibited`는 Mandatory Control(ADR §6.16)로 고객설정 비활성 불가. `max depth` 초과·순환 감지 시 계층 커밋 거부.
- **불변 버전화**: Hierarchy 변경은 In-place Update 금지 → Hierarchy Version(별도 문서) 레코드로만 반영·`active version` 포인터 이동.

## ⑥ Gap

- **BLOCKED_PREREQUISITE(RP-002)**: 계층이 노드로 삼을 Canonical Permission Definition/Version(순신규)과, 결합 결과를 봉인할 Part 1 Authorization Decision Core가 모두 코드 0(ADR §D-4). 계층 단독 구현은 결합 대상 부재로 공회전.
- **cover 0**: Permission 계층 데이터 선언 전무. 단 노드가 될 `acl_permission`·action superset 관계는 실재하므로 실 엔진은 "발명 아닌 조립"(선행 Definition/Decision Core 신설 후).
- **NOT_CERTIFIED**: 본 문서는 설계 명세로 코드/DB 변경 0. Part 1 D-2 위험 4건은 289차 P1~P4에 해소됨(ADR §D-2) — 재플래그하지 않음.

관련: [[DSAR_APPROVAL_PERMISSION_HIERARCHY_VERSION]] · [[DSAR_APPROVAL_PERMISSION_HIERARCHY_EDGE]] · [[DSAR_APPROVAL_PERMISSION_GRAPH]] · [[ADR_DSAR_PERMISSION_ENGINE_FOUNDATION]].
