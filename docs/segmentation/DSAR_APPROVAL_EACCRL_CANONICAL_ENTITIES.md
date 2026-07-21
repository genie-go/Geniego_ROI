# DSAR — EACCRL Canonical Entities Design & Judgment (Part 3-42 §2~§22)

> **거버넌스 상태**: per-entity 설계·판정 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★상위 Part 3-33/3-37/3-27 통합·저장소 재정의 금지.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_CAPABILITY | 부재(핸들러=암묵 능력) | `backend/src/Handlers/` | ABSENT-formal(카탈로그화) |
| 2 | APPROVAL_CAPABILITY_DOMAIN | 도메인(CRM/KPI/Ops/P&L) | `CLAUDE.md`·핸들러 | PARTIAL-informal |
| 3 | APPROVAL_REFERENCE_LIBRARY | docs 트리 | `docs/` | PARTIAL |
| 4 | APPROVAL_REFERENCE_PATTERN | Part 3-33 Pattern·docs | `docs/architecture/` | 상위 Part 참조 |
| 5 | APPROVAL_REFERENCE_TEMPLATE | 부재(템플릿 없음) | — | ABSENT |
| 6 | APPROVAL_REFERENCE_COMPONENT | 공용 클래스(Crypto/SecurityAudit/Ssrf/Mapping/MediaHost) | (backend/src) | PARTIAL(실 재사용) |
| 7 | APPROVAL_REFERENCE_API | 라우트·OpenAPI | `routes.php`·`OpenPlatform.php` | PARTIAL |
| 8 | APPROVAL_REFERENCE_POLICY | RBAC/ABAC acl | `TeamPermissions.php` | PARTIAL |
| 9 | APPROVAL_REFERENCE_DATA_MODEL | ensureTables DDL(산재)·Db 스키마 | `Db.php`·핸들러 | PARTIAL(Canonical Model 부재) |
| 10 | APPROVAL_REFERENCE_KNOWLEDGE | ADR·메모리·NEXT_SESSION | `docs/architecture/`·`.claude/.../memory/` | PARTIAL |
| 11 | APPROVAL_REFERENCE_ARTIFACT | 운영 문서(비형식 runbook) | `docs/`·`NEXT_SESSION.md` | PARTIAL-informal |
| 12 | APPROVAL_REFERENCE_METADATA | frontmatter(메모리)·git | `.claude/.../memory/`·git | PARTIAL |
| 13 | APPROVAL_REFERENCE_BASELINE | git baseline·sacred SHA | git·`.githooks/baseline.json` | PARTIAL |
| 14 | APPROVAL_REFERENCE_VERSION | git·API 버전(/vNNN) | git·`routes.php` | PARTIAL |
| 15 | APPROVAL_REFERENCE_SNAPSHOT | 부재 | — | ABSENT |
| 16 | APPROVAL_REFERENCE_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 17 | APPROVAL_REFERENCE_DIGEST | 부재 | — | ABSENT |
| 18 | APPROVAL_REFERENCE_ANALYTICS | 부재 | — | ABSENT |
| 19 | APPROVAL_REFERENCE_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 20 | APPROVAL_REFERENCE_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |

## 도메인 설계 계약(§3~§22 요지)
- **§5~6 Architecture/Pattern·§10 ADR**: Part 3-33 통합(재정의 금지). `docs/architecture/` ADR 수십편 실재.
- **§7 API Reference·§8 Policy Reference**: `routes.php`(버전 라우팅)·OpenAPI·`TeamPermissions` acl 통합 카탈로그화.
- **§14 Reusable Component Registry**: ★공용 클래스(`Crypto`·`SecurityAudit`·`Mapping`·`Ssrf`[289차후속]·`MediaHost`)=실 재사용 컴포넌트. Terraform Module/Helm Chart는 인프라 부재(ABSENT).
- **§16 Semantic Search**: `gen_chatbot_knowledge.mjs`(챗봇 지식 자동화) 확장(★고객 FAQ≠기술 지식). AI Search/NL Query 신설.
- **§17 Knowledge Graph Integration**: GraphScore(마케팅)≠IAM KG(순신설).

## 판정
**PARTIAL(§2~4·§6~14·§16·§19=docs/architecture/registry/routes/openapi/공용컴포넌트/git/chatbot-knowledge/SecurityAudit substrate·비교적 큼) / ABSENT-formal(§1·§5·§15·§17~18 통합 Registry/Template/Semantic Engine/KG/Analytics).** 코드 0. BLOCKED_PREREQUISITE. 실행 시 상위 Part/docs/공용컴포넌트 통합(저장소 재정의·중복 자산 금지).
