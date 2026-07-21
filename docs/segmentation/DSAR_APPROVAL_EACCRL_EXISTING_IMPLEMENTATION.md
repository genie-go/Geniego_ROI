# DSAR — EACCRL Ground-Truth ① Existing Implementation (Part 3-42)

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 상위 SPEC/ADR: Part 3-42 계보. 본 문서는 하위 DSAR file:line 인용의 허용 근거지(GROUND_TRUTH).

## 전수조사 방법
capability/catalog/reference/pattern/registry/knowledge/semantic-search/reusable-component/metadata 키워드로 `backend/src`·`docs`·`tools` 전수 grep + 판독.

## 실존 substrate (형식 라이브러리 아님·문서/도구·비교적 큼)
| EACCRL 개념 | 실존 substrate | 인용 | 성격 |
|---|---|---|---|
| Reference Architecture/ADR | ADR·SPEC 리포지토리 | `docs/architecture/`·`docs/spec/` | PARTIAL(문서형) |
| Pattern/Best Practice | 헌법·표준·메모리 | `docs/CONSTITUTION.md`·`CLAUDE.md`·`.claude/.../memory/` | PARTIAL |
| Registry | 레지스트리·채널 레지스트리 | `docs/registry/`·`ChannelRegistry.php` | PARTIAL |
| API Reference | 라우트·OpenAPI | `backend/src/routes.php`·`OpenPlatform.php`(openapi) | PARTIAL |
| Policy Reference | RBAC/ABAC acl | `TeamPermissions.php` | PARTIAL |
| Reusable Component | 공용 클래스 | `Crypto`·`SecurityAudit`·`Mapping`·`Ssrf`·`MediaHost`(backend/src) | PARTIAL(실 재사용 컴포넌트) |
| Semantic Search/Knowledge | 챗봇 지식 자동화 파이프라인 | `gen_chatbot_knowledge.mjs` | PARTIAL(seed) |
| Version & Baseline | git | git | 실재(불변) |
| Evidence/Isolation | 해시체인·격리 | `SecurityAudit.php`·`Db.php` | 실재 |

## 부재(ABSENT) — 형식 EACCRL 엔티티 (grep 0)
Enterprise Capability Registry(형식) · Capability Governance(Taxonomy) · Capability Catalog Engine · Reference Library Manager · Template Library · Reusable Component Registry(형식) · Metadata Management Engine · Semantic Search Engine(형식·AI Search) · Knowledge Graph Integration · Reference Snapshot/Digest/Analytics.

## 판정
**PARTIAL / ABSENT-formal.** docs/architecture·registry·routes/openapi·shared components·git·chatbot-knowledge·SecurityAudit는 실재(문서/도구 substrate·비교적 큼)하나, 형식 통합 Capability Registry/Semantic Search Engine/Knowledge Graph Integration은 전무. ★본 DSAR 세트+docs/=수동 인스턴스. 실행은 선행 인증 종속.
