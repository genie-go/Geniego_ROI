# DSAR — EAPGFMRA Canonical Entities Design & Judgment (Part 3-50 §2~§21)

> **거버넌스 상태**: per-entity 설계·판정(캡스톤) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> file:line 인용은 GT①②/ADR 등장분만(반날조). ★146 ADR·DATA_ARCHITECTURE·실 아키텍처 재사용·형식 엔진 greenfield.

## 20 Canonical Entity — substrate 매핑·판정
| # | Entity | 현행 substrate | 인용 | 판정 |
|---|---|---|---|---|
| 1 | APPROVAL_MASTER_ARCHITECTURE | 실 monorepo+ADR(형식 엔진 부재) | `docs/architecture/`·codebase | PARTIAL-informal |
| 2 | APPROVAL_ARCHITECTURE_DOMAIN | Identity/Authz/Security/AI/Ops 도메인 | codebase·헌법 | PARTIAL-informal |
| 3 | APPROVAL_CANONICAL_ARCHITECTURE | 146 ADR·canonical 사전 | `docs/architecture/`(146 ADR) | PARTIAL-strong |
| 4 | APPROVAL_ENTERPRISE_CAPABILITY | 구현 이력 | `docs/IMPLEMENTATION_STATUS.md` | PARTIAL-informal |
| 5 | APPROVAL_SERVICE_LANDSCAPE | 41 handler·116 page | codebase | PARTIAL-informal(형식 landscape 아님) |
| 6 | APPROVAL_DATA_ARCHITECTURE | 데이터 정본 | `docs/data/DATA_ARCHITECTURE.md`·`DataPlatform.php` | PARTIAL-strong |
| 7 | APPROVAL_INTEGRATION_ARCHITECTURE | REST·외부 통합 | `routes.php`·`AdAdapters.php`·`ChannelSync.php` | PARTIAL(REST만·Mesh 부재) |
| 8 | APPROVAL_SECURITY_ARCHITECTURE | Zero Trust/IAM/Crypto/SSRF/fed | `index.php`·`Crypto.php`·`Ssrf.php`·`EnterpriseAuth.php` | PARTIAL-strong |
| 9 | APPROVAL_AI_ARCHITECTURE | 마케팅 AI | `ClaudeAI.php`·`ModelMonitor.php` | PARTIAL(KEEP_SEPARATE) |
| 10 | APPROVAL_OPERATIONS_ARCHITECTURE | 배포·migrations(형식 SRE 부재) | `deploy.ps1`·`backend/migrations/` | PARTIAL-informal |
| 11 | APPROVAL_COMPLIANCE_ARCHITECTURE | GdprConsent/Dsar/감사 | `GdprConsent.php`·`Dsar.php`·`SecurityAudit.php` | PARTIAL |
| 12 | APPROVAL_ARCHITECTURE_ROADMAP | Part 3-48/3-27 참조 | (설계) | 상위 Part 참조 |
| 13 | APPROVAL_ARCHITECTURE_SNAPSHOT | 부재 | — | ABSENT |
| 14 | APPROVAL_ARCHITECTURE_EVIDENCE | append-only 정본 | `SecurityAudit.php` | PARTIAL(체인 재사용) |
| 15 | APPROVAL_ARCHITECTURE_DIGEST | 부재 | — | ABSENT |
| 16 | APPROVAL_ARCHITECTURE_ANALYTICS | 부재(형식 Index) | — | ABSENT |
| 17 | APPROVAL_ARCHITECTURE_BASELINE | env/config·git | `Db.php`·git | PARTIAL |
| 18 | APPROVAL_ARCHITECTURE_VERSION | git·API 버전 | git·`routes.php` | PARTIAL |
| 19 | APPROVAL_ARCHITECTURE_STATUS | NOT_CERTIFIED 라벨 | `DSAR_APPROVAL_*` | PARTIAL-informal |
| 20 | APPROVAL_ARCHITECTURE_CERTIFICATION | Part 3-36 참조 | (설계) | 상위 Part 참조 |

## 도메인 설계 계약(§3~§21 요지)
- **§3·§7 EA Governance/Repository**: 146 ADR·registry·CONSTITUTION 통합 인덱싱(중복 ADR 금지·Part 3-49 정합).
- **§10 Data / §12 Security**: DATA_ARCHITECTURE.md·Crypto/RBAC/Ssrf/EnterpriseAuth 승격(비교적 강함·중복 금지).
- **§11 Integration**: REST 실재·GraphQL/gRPC/Service Mesh=단일 호스트라 미래(조기구현 금지).
- **§13 AI**: 마케팅 AI(Part 3-46) KEEP_SEPARATE.
- **§7 Knowledge Graph / §8 Capability Map / §20 Analytics**: 형식 엔진 순신설.

## 판정
**PARTIAL-strong(§3·§6·§8=146 ADR·DATA_ARCHITECTURE·Security 강함) / PARTIAL-informal(§1·§2·§4·§5·§10=monorepo/구현이력/배포) / ABSENT(§13·§15·§16=Knowledge Graph/Digest/Analytics).** 코드 0. BLOCKED_PREREQUISITE. ★캡스톤 — 실 아키텍처 인덱싱(재정의 금지)·형식 엔진 신설·GraphQL/Mesh 미래·마케팅 AI 분리.
