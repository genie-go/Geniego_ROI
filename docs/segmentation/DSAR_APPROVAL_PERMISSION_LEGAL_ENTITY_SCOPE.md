# DSAR — Permission Legal Entity Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 2)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)

---

## 1. 목적

Permission이 **법적 실체(Legal Entity) 경계를 넘지 못하도록** 강제하는 축. 한 테넌트가 복수 법인(예: 국가별 법인·자회사·정산 주체)을 보유할 때, Actor·Resource·Grant·Context 각각의 Legal Entity를 대조해 **동일 법인 내에서만** 권한이 유효하도록 한다. 금융·계약·정산·지불 도메인에서 법인 격리는 규제 요구이며 tenant 격리와 **직교**한다(같은 테넌트라도 다른 법인 리소스 접근 금지). ★**순신규** — 현재 플랫폼에 legal entity 축은 부재하며, 본 문서는 정직하게 ABSENT를 선언하고 신설 설계만 제공한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `legal_entity_id` | 법인 식별자(tenant 하위) |
| `actor_legal_entity` | Grant 대상 Actor의 소속 법인 |
| `resource_legal_entity` | 대상 Resource의 귀속 법인 |
| `context_legal_entity` | 실행 시점 Context(요청)의 법인 |
| `cross_entity_prohibited` | Boolean(항상 true·비활성 불가·Mandatory Control) |
| `entity_match_policy` | 대조 정책(§3·EXACT 기본) |
| `parent_entity_ref` | 상위 법인(그룹 구조·정보용·권한 상속 아님) |
| `digest` | Legal Entity Scope 정규화 스냅샷 해시 |

## 3. 열거형 / 타입

**entity_match_policy**: `EXACT`(기본·actor=resource=context 법인 일치) · `EXPLICIT_CROSS_ENTITY_GRANT`(명시 발급된 교차법인 권한만) · `PROHIBITED`(교차 명시 차단).
**legal entity kind**: `PRIMARY` · `SUBSIDIARY` · `BRANCH` · `SETTLEMENT_ENTITY` · `CUSTOM`.

## 4. 실 substrate 매핑 (§92)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| Legal Entity 축 전체 | — | **ABSENT(순신규·정직)** | 플랫폼에 legal entity 컬럼/테이블/게이트 부재 |
| 최근접 상위 경계 | tenant 축(법인이 아니라 테넌트 단위) | 인접(대체 아님) | `index.php:619`·`TeamPermissions.php:152-159` |

★정직 선언: 현재 격리 단위는 **테넌트**이며 그 하위 **법인 경계는 존재하지 않는다**. tenant 축을 legal entity로 오인 매핑하지 않는다(반날조). 본 축은 Part 5 Approval Authority(금액/법인 한도)·정산/지불 도메인이 실제 다법인 요구를 갖게 될 때 신설한다.

## 5. 설계 원칙 / 결정

- **tenant ⊇ legal entity, 직교 아님**: 법인 경계는 tenant 하위 세분이며 tenant 격리를 대체하지 않고 추가 좁힌다(Intersection).
- **EXACT default**: actor·resource·context 세 법인이 모두 일치해야 유효. 교차 법인 접근은 명시 grant 없이는 Default Deny.
- **parent_entity는 상속 아님**: 그룹 상위 법인이 있어도 하위 법인 권한을 자동 상속하지 않는다(조직 Subtree와 혼동 금지).
- **Authority와 결합만**: 법인 한도(금액/통화)는 Part 5 Approval Authority가 소유 — 본 Scope는 경계 검증만 제공(연결 Contract).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED · 전부 ABSENT**: `legal_entity_id`/actor·resource·context 법인/`entity_match_policy`/`digest` = 순신규.
- **BLOCKED_PREREQUISITE**: 법인 모델은 tenant sub-entity 스키마·정산/지불 도메인 요구 확정 후 별도 승인세션 **RP-002**.
- Part 1 D-2 위험 4건은 289차 P1~P4로 해소됨 — 재플래그 금지.
