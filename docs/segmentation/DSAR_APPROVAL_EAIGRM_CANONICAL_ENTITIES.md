# DSAR — EAIGRM Canonical Entities Design & Judgment (Part 3-49 §2~§20)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★docs/registry·CONSTITUTION·22 DSAR canonical 사전 재사용·Ontology/Semantic greenfield.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_GOVERNANCE_REFERENCE | 다수 거버넌스 레지스트리 | `docs/registry/*` | PARTIAL-informal |
| 2 | APPROVAL_GOVERNANCE_DOMAIN | 헌법 도메인·데이터 볼륨 | `docs/CONSTITUTION.md`·헌법 6볼륨 | PARTIAL-informal |
| 3 | APPROVAL_META_MODEL | 최상위 원칙·위계 | `docs/CONSTITUTION.md` | PARTIAL-informal(형식 엔진 아님) |
| 4 | APPROVAL_REFERENCE_STANDARD | API/Architecture/Component 레지스트리 | `docs/registry/*` | PARTIAL-informal |
| 5 | APPROVAL_CANONICAL_DICTIONARY | APPROVAL_* 사전 | 22 `DSAR_APPROVAL_*_CANONICAL_ENTITIES.md` | PARTIAL-informal |
| 6 | APPROVAL_GOVERNANCE_ONTOLOGY | 부재(형식 Ontology) | — | ABSENT-formal |
| 7 | APPROVAL_POLICY_META | 정책 스키마 seed·헌법 | `docs/CONSTITUTION.md` | PARTIAL-informal |
| 8 | APPROVAL_DEPENDENCY_GRAPH | 부재(형식 그래프) | — | ABSENT |
| 9 | APPROVAL_SEMANTIC_MAPPING | 문서 상호참조 링크 | `[[...]]` 링크 | PARTIAL-seed |
| 10 | APPROVAL_GOVERNANCE_KPI | 부재(형식 KPI) | — | ABSENT |
| 11 | APPROVAL_REFERENCE_SNAPSHOT | 부재 | — | ABSENT |
| 12 | APPROVAL_REFERENCE_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 13 | APPROVAL_REFERENCE_DIGEST | 부재 | — | ABSENT |
| 14 | APPROVAL_REFERENCE_ANALYTICS | 부재 | — | ABSENT |
| 15 | APPROVAL_REFERENCE_BASELINE | env/config·git | `Db.php`·git | PARTIAL |
| 16 | APPROVAL_REFERENCE_VERSION | git·문서 버전 | git | PARTIAL |
| 17 | APPROVAL_REFERENCE_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 18 | APPROVAL_REFERENCE_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |
| 19 | APPROVAL_GOVERNANCE_EXCEPTION | 부재 | — | ABSENT |
| 20 | APPROVAL_REFERENCE_EVOLUTION | Part 3-27/3-48 참조 | (설계) | 상위 Part 참조 |

## 도메인 설계 계약(§3~§20 요지)
- **§1·§8 Registry/Standard**: `docs/registry/*`(Analytics/API/Architecture/Audit/Component/Database/Decision…) 통합 인덱싱(중복 레지스트리 신설 금지). ISO 11179 정합.
- **§3·§4 Meta Governance/Meta Model**: `CONSTITUTION`+헌법 6볼륨(Policy/Identity/Authz/Security/Compliance/AI 레이어) 승격. 중복 원칙 문서 금지.
- **§5 Canonical Dictionary**: 22 DSAR CANONICAL_ENTITIES 인덱싱(재정의 금지·중복탐지 계층 신설).
- **§6·§7·§10·§11 Mapping/Dependency/Ontology/Semantic**: 형식 엔진 순신설. 문서 링크=비형식 seed.
- **§12 Lifecycle**: `CHANGE_GATE`+ChangeHistory/DecisionLog 형식화.
- **§20 AI Advisor**: 마케팅 AI(ClaudeAI) KEEP_SEPARATE.

## 판정
**PARTIAL-informal(§1~5·§7·§9·§12·§16=레지스트리/헌법/canonical 사전/게이트/링크 재사용) / ABSENT-formal(§6·§8·§10·§11·§13·§14=Ontology/Dependency Graph/Semantic Engine/Analytics greenfield).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 registry/CONSTITUTION/22 canonical 사전 통합 인덱싱(재정의 금지)·시맨틱 엔진 신설·ChannelRegistry(채널)≠온톨로지 유의.
