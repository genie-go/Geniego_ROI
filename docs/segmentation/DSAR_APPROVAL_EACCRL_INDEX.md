# DSAR — EACCRL Index (Part 3-42)

> **거버넌스 상태**: 설계 명세 DSAR 인덱스 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).

Part 3-42 (Enterprise Authorization Enterprise Capability Catalog & Reference Library) 산출 문서 색인.

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/EPIC_06A_PART3_42_CAPABILITY_CATALOG_REFERENCE_LIBRARY_SPEC.md` | canonical SPEC v1.0(§0~§32) |
| `docs/architecture/ADR_DSAR_AUTHZ_CAPABILITY_CATALOG_REFERENCE_LIBRARY.md` | 설계 결정(D-1~D-5·중복/자기참조) |
| `DSAR_APPROVAL_EACCRL_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `DSAR_APPROVAL_EACCRL_DUPLICATE_IMPLEMENTATION_AUDIT.md` | GT② 상위 Part(3-33/3-37/3-27) 저장소 중복 경계 |
| `DSAR_APPROVAL_EACCRL_CANONICAL_ENTITIES.md` | §2 20 엔티티 + §3~22 카탈로그·저장소 설계·판정 |
| `DSAR_APPROVAL_EACCRL_GOVERNANCE_MECHANISMS.md` | §23~32 Guard/Lint/Error/API/DB/Test/Gate |
| `DSAR_APPROVAL_EACCRL_INDEX.md` | 본 색인 |

## 판정 요약
- **★상위 Part 중복(핵심):** §5~6 Architecture/Pattern·§10 ADR=Part 3-33 EASALM·§12 Best Practice=Part 3-37 EAGCoE·§3 Registry=Part 3-27 LTER. **저장소 재정의 금지·통합 카탈로그/검색 계층**.
- **PARTIAL substrate(문서/도구·비교적 큼): `docs/architecture/`(ADR 수십편)·`docs/registry/`+`ChannelRegistry`(Registry)·`routes.php`/OpenPlatform openapi(API)·`TeamPermissions`(Policy)·★공용 클래스 `Crypto`/`SecurityAudit`/`Mapping`/`Ssrf`(289차후속)/`MediaHost`(Reusable Component)·`gen_chatbot_knowledge.mjs`(Semantic Search seed)·git(Version) / ABSENT-formal(통합 Capability Registry·Semantic Search Engine·Knowledge Graph Integration·Metadata Management).**
- **★자기참조 정직:** 본 EPIC 06-A DSAR 세트+`docs/`가 EACCRL의 **수동/문서형 인스턴스**(Reuse Before Build 이미 적용중).
- **★KEEP_SEPARATE:** GraphScore(마케팅 그래프) ≠ Knowledge Graph Integration(IAM) · 챗봇 고객지식 ≠ 내부 기술 Knowledge Asset(파이프라인만 재사용) · Duplicate Canonical Asset 방지=중복금지 규율 형식화.
- **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**(선행 Part1~3-41 인증 종속).

## 다음 (SPEC §다음)
Part 3-43 Future Technology Adoption → … → 3-49 Infinite Governance Reference Model.
