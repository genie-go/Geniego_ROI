# DSAR — EACCRL Ground-Truth ② Duplicate Implementation Audit (Part 3-42)

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> ★목적 = 본 Part는 상위 Part 3-33/3-37/3-27과 저장소 중복 위험. 저장소 재정의 금지·통합 경계 확정.

## ★상위 Part 중복 — 저장소 재정의 금지
| EACCRL 개념 | 상위 Part | 판정 |
|---|---|---|
| Reference Architecture/Pattern/ADR Repository | Part 3-33 EASALM(ADR·Pattern Catalog) | 통합 참조·재정의 금지 |
| Best Practice/Standards Library | Part 3-37 EAGCoE(Best Practice/Standards) | 통합 참조·재정의 금지 |
| Capability Registry | Part 3-27 LTER(Capability Roadmap) | 참조 |
| Knowledge Graph Integration | Part 3-29/Digital Twin(설계) | 참조 |

## 동음이의(코드베이스) — 오흡수 vs 재사용
| EACCRL 개념 | 자산 | 인용 | 판정 |
|---|---|---|---|
| ADR/Architecture | docs/architecture | `docs/architecture/` | 재사용(중복 저장소 금지) |
| Registry | docs/registry·ChannelRegistry | `docs/registry/`·`ChannelRegistry.php` | 재사용 |
| API Reference | routes·openapi | `routes.php`·`OpenPlatform.php` | 재사용 |
| Reusable Component | Crypto/SecurityAudit/Mapping/Ssrf/MediaHost | (backend/src) | 재사용(실 컴포넌트 등록) |
| Semantic Search | 챗봇 지식 파이프라인 | `gen_chatbot_knowledge.mjs` | 재사용(확장)·KEEP_SEPARATE(고객 FAQ≠기술 지식) |
| Knowledge Graph | GraphScore(마케팅) | `GraphScore.php` | KEEP_SEPARATE(마케팅 그래프 ≠ IAM KG) |
| Evidence/Snapshot | 메뉴/저니 snapshot | `AdminMenu`·journey_decision_log | KEEP_SEPARATE(★정본 `SecurityAudit::verify`) |

## 확장 대상(중복 신설 금지·기존 승격)
- ADR/Pattern=`docs/architecture/` 통합(중복 저장소 금지). Registry=`docs/registry/` 승격. API=routes/openapi. Component=공용 클래스 등록. Semantic Search=`gen_chatbot_knowledge.mjs` 확장(고객≠기술). Evidence=`SecurityAudit::verify`. Isolation=`Db.php`.

## 판정
**중복 위험 높음(상위 Part 3-33/3-37/3-27 저장소 + docs/tools 자산 다수).** 본 Part 고유 순신설=통합 Capability Registry·Semantic Search Engine·Metadata Management·Knowledge Graph Integration 뿐. 저장소는 상위 Part/docs 참조(재정의 금지). GraphScore·챗봇 고객지식·메뉴snapshot 오흡수 금지. ★Duplicate Canonical Asset 방지=중복금지 규율(착수 전 grep) 형식화. 새 저장소 복제 금지.
