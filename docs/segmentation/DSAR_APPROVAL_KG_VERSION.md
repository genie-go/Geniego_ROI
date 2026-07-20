# DSAR — Authorization Knowledge Graph Versioning (Part 3-21 §17·§30 Immutable Graph Version)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_21_KNOWLEDGE_GRAPH_SEMANTIC_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_KNOWLEDGE_GRAPH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_KG_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_KG_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §17·§30)

APPROVAL_GRAPH_VERSION은 인가 지식그래프의 **각 형상을 불변(immutable) 버전으로 봉인하여 시점 재현·롤백·대사의 기준점을 제공**하는 계약이다. 계약 대상 요소:

- **Graph Version 라벨(§17)** — 그래프 형상 전체에 단조증가 버전 식별자 부여.
- **Immutable Graph Version(§30)** — 봉인된 버전은 사후 개작 불가(append-only, 해시 봉인).
- **Version 앵커 체인** — 각 버전은 직전 버전 해시를 참조하여 순서·무결성 보증.
- **재현성 계약** — §24 Reconciliation·§23 Revalidation·§21 Drift가 버전을 기준점으로 소비.

버전 봉인은 인가 판정 로직을 변경하지 않으며(형상 스냅샷 전용), 봉인된 버전의 위변조는 탐지 가능해야 한다(tamper-evident, SPEC §30 계약).

## 2. Substrate 매핑 표

| 버전 요소 | 현행 substrate | file:line | 버전 엔진 존재? |
|---|---|---|---|
| Immutable 봉인 원천 | SecurityAudit append-only 해시체인 | `SecurityAudit.php:25-31` | 확장 substrate(그래프 버전 아님) |
| 무결성 검증(tamper-evident) | 해시체인 검증 로직 | `SecurityAudit.php:63-64` | 확장 substrate |
| 버전 대상 형상(유효권한) | effectiveForUser SOURCE | `TeamPermissions.php:393-421` | 봉인 대상만(버전 없음) |
| 버전 저장 스키마 | 순수 MySQL | `Db.php:815-839` | 원천만 |
| Graph Version 라벨링 | (없음 — grep 0) | — | **ABSENT** |

## 3. 설계 계약

1. **Immutable=SecurityAudit 확장(중복 엔진 금지)**: 그래프 버전의 불변성·tamper-evidence는 신규 봉인 엔진을 만들지 않고 기존 append-only 해시체인(`SecurityAudit.php:25-31`)과 그 검증 경로(`SecurityAudit.php:63-64`)를 **확장**하여 달성한다. 별도 해시체인 신설을 금지한다.
2. **형상 봉인 대상**: 버전 봉인 대상 형상의 SOURCE는 유효권한 해석(`TeamPermissions.php:393-421`)이며, 버전 라벨·순서 체인 계층만 순신설이다(SOURCE 재사용).
3. **저장 무후퇴**: 버전 레코드는 순수 MySQL(`Db.php:815-839`)에 append-only로 적재하되 기존 테이블 형상을 파괴하지 않는다(비파괴 확장).
4. **재현성 기준점**: 봉인된 각 버전은 §24 Reconciliation의 Graph Version 비교축·§23 Revalidation·§21 Drift baseline의 기준점이 된다. 근거 없는 버전 발급을 금지한다(Explainable).

## 4. KEEP_SEPARATE

- **authz graph version ≠ 마케팅 그래프 스코어 버전**: 마케팅 그래프 스코어(`GraphScore.php:12-30`·`GraphScore.php:429-460`)는 귀속 그래프 스코어링 도메인의 산출물로 인가 그래프 버전과 무관 — 재사용·병합 금지.
- 마케팅 귀속 형상(`AttributionEngine.php:19-38`)·데이터 자산 버전(`DataPlatform.php:313-345`)은 각각 별도 도메인으로 authz 버전 계층과 통합하지 않는다.

## 5. 판정

**ABSENT (graph version grep 0)**. 인가 지식그래프 형상을 불변 버전으로 봉인·라벨링하는 엔진은 존재하지 않는다. Immutable·tamper-evident의 기반은 기존 SecurityAudit 해시체인(`SecurityAudit.php:25-31`·`:63-64`)이며 이를 **확장**해 버전 계층을 얹되(중복 해시체인 금지), 버전 라벨·순서·재현성 계층은 **순신설**이다. 봉인 대상 형상 SOURCE는 유효권한(`TeamPermissions.php:393-421`), 저장은 순수 MySQL(`Db.php:815-839`)이다. 마케팅 GraphScore(`GraphScore.php:12-30`·`:429-460`)·귀속(`AttributionEngine.php:19-38`)과 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 KG substrate 부재).
