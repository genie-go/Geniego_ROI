# DSAR — Authorization Fabric Consistency (Part 3-16 §17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §17)

`APPROVAL_FABRIC_CONSISTENCY`는 노드/리전 간 정책·역할·할당 상태의 일관성 모델을 규정하는 계약이다. 일관성 모드 3종 + 버전 잠금:

- **Strong Consistency** — 정책 변경이 전 노드에서 즉시 관측(선형화). 결정은 항상 최신 정책 반영.
- **Eventual Consistency** — 복제 지연 허용, 유한 시간 내 수렴. staleness 상한 명시.
- **Configurable Consistency** — 정책 도메인별 강/약 일관성 선택(예: 권한 부여=Strong, 감사 뷰=Eventual).
- **Version Lock** — 결정 시점 정책 버전을 고정해 read-modify-write race·split-brain 오결정 방지.

split-brain(분단 시 상반된 결정) 방지가 핵심 불변식이다.

## 2. 라이브 substrate 매핑

| SPEC 일관성 요소 | 라이브 실재 | 근거 | 판정 |
|---|---|---|---|
| 단일 권위 DB(단일 정합원) | 존재 | `backend/src/Db.php:63-87`·`:120` | 단일노드 정합 |
| Strong Consistency(노드간 선형화) | 없음(무의미) | 노드가 하나 — 분산 일관성 대상 없음 | ABSENT |
| Eventual Consistency(복제 수렴) | 없음 | 노드간 복제 없음 | ABSENT |
| Configurable Consistency(도메인별) | 없음 | 일관성 모드 선택 계층 부재 | ABSENT |
| Version Lock(정책 버전 고정) | 없음 | 결정시점 정책버전 스냅샷·잠금 부재 | ABSENT |
| split-brain 방지 | 없음(무대상) | 분단 가능한 다노드 없음 | ABSENT |

라이브 인가는 **단일 MySQL(연결 실패 시 SQLite 폴백) 권위원**(`Db.php:63-87`·`:120`)에서 직접 읽는다. 노드가 하나이므로 분산 일관성 문제 자체가 성립하지 않으며 — 일관성 "모델"이라 부를 계층이 없다(암묵적으로 단일 DB 트랜잭션 일관성에만 의존).

## 3. 설계 계약

1. **순신설 일관성 계층**: 3개 모드 + Version Lock은 라이브 대응물 없음 → 전면 순신설. 단일 권위 DB(`Db.php:63-87`·`:120`)는 향후 다노드 도입 시 **1차 정합원(source of truth)** 역할로 재사용(비파괴).
2. **Version Lock 불변식**: 결정은 관측한 정책 버전을 고정해 산출하고, 근거에 정책 버전을 명기한다(감사 재현성·XAI 준용). 단일노드에서도 read-modify-write race를 막는 방어선으로 선도입 가능.
3. **Safe-default 모드**: 미지정 정책 도메인의 기본 일관성은 **Strong**(권한 결정은 stale 관측 금지). Eventual은 명시적 opt-in 도메인에 한정.
4. **선행 의존**: Eventual/Configurable/split-brain 방지는 다노드 복제(§14 Sync)·토폴로지 실재 후에만 의미 → BLOCKED_PREREQUISITE.

## 4. 판정

**ABSENT.** 라이브는 단일 권위 DB(`Db.php:63-87`·`:120`)에 의존하는 단일노드로, 노드간 일관성 개념(Strong/Eventual/Configurable)·Version Lock·split-brain 방지가 전무하다. 전 요소 순신설이며 다노드 복제라는 선행조건이 부재하다 → NOT_CERTIFIED · BLOCKED_PREREQUISITE. 코드 변경 0.
