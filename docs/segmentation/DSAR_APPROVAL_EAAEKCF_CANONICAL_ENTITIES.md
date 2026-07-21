# DSAR — EAAEKCF Canonical Entities Design & Judgment (Part 3-55 §2~§20)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★조직 기억/registry/DSAR canonical/DataTrust 재사용·형식 KG/reasoning greenfield.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_KNOWLEDGE_DOMAIN | 헌법 도메인·ADR | `CONSTITUTION`·`docs/architecture/` | PARTIAL-informal |
| 2 | APPROVAL_KNOWLEDGE_GRAPH | 부재(RDF/SPARQL·Part 3-49 참조) | — | ABSENT-formal |
| 3 | APPROVAL_KNOWLEDGE_NODE | 부재(형식 노드) | — | ABSENT |
| 4 | APPROVAL_KNOWLEDGE_RELATION | 문서 상호참조 링크 | `[[...]]` 링크 | PARTIAL-seed |
| 5 | APPROVAL_KNOWLEDGE_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 6 | APPROVAL_KNOWLEDGE_VERSION | git·문서 버전 | git | PARTIAL |
| 7 | APPROVAL_KNOWLEDGE_LINEAGE | DataTrust lineage·git | `DataPlatform.php`·git | PARTIAL |
| 8 | APPROVAL_KNOWLEDGE_QUALITY | DataTrust Quality/Trust | `DataPlatform.php`(V3) | PARTIAL |
| 9 | APPROVAL_KNOWLEDGE_ANALYTICS | 부재(형식) | — | ABSENT |
| 10 | APPROVAL_KNOWLEDGE_SNAPSHOT | 부재 | — | ABSENT |
| 11 | APPROVAL_KNOWLEDGE_DIGEST | 부재 | — | ABSENT |
| 12 | APPROVAL_KNOWLEDGE_BASELINE | 헌법·git | `CONSTITUTION`·git | PARTIAL |
| 13 | APPROVAL_KNOWLEDGE_POLICY | RBAC/헌법 정책 | `CONSTITUTION`·`index.php` | PARTIAL-informal |
| 14 | APPROVAL_KNOWLEDGE_REASONING | 부재(Semantic Reasoning) | — | ABSENT |
| 15 | APPROVAL_KNOWLEDGE_RECOMMENDATION | 부재 | — | ABSENT |
| 16 | APPROVAL_KNOWLEDGE_MEMORY | 세션 로그·AI Memory 설계 ADR | `NEXT_SESSION.md`·`docs/architecture/ADR_AI_MEMORY_*` | PARTIAL(★설계 ADR·handler 부재) |
| 17 | APPROVAL_KNOWLEDGE_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 18 | APPROVAL_KNOWLEDGE_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |
| 19 | APPROVAL_KNOWLEDGE_EXCEPTION | 부재 | — | ABSENT |
| 20 | APPROVAL_KNOWLEDGE_CIVILIZATION | 부재(형식 문명) | — | ABSENT-aspirational |

## 도메인 설계 계약(§3~§20 요지)
- **§5·§3 Repository/Governance**: registry/CONSTITUTION/28 DSAR canonical/146 ADR 인덱싱(중복 저장소 금지·Part 3-49).
- **§10·§11 Organizational Memory/Lineage**: NEXT_SESSION+ADR+git 승격·AI Memory ADR(설계 seed·handler 부재). DataTrust lineage.
- **§12 Quality**: DataTrust(품질/신뢰·데이터≠지식 패턴 재사용).
- **§4·§7 chatbot/Reasoning**: ClaudeAI 챗봇 지식(마케팅 AI KEEP_SEPARATE)·형식 Semantic Reasoning 신설.
- **§2·§6·§8·§15·§20 KG/Federation/Recommendation/Learning**: 형식 순신설(KG=Part 3-49/3-50 참조).

## 판정
**PARTIAL-strong/PARTIAL-informal(§1·§5~8·§12·§13·§16=Repository/Memory/DataTrust/lineage) / ABSENT-formal(§2·§3·§9~11·§14·§15·§20=Knowledge Graph/Reasoning/Recommendation/Learning/Civilization).** 코드 0. BLOCKED_PREREQUISITE. ★조직 기억/registry/DataTrust 재사용(중복 금지)·KG/reasoning 신설·AI Memory 설계 ADR 정합(구현 후속)·마케팅 AI 분리.
