# DSAR — ERVS Index (Part 3-29)

> **거버넌스 상태**: 설계 명세 DSAR 인덱스 · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).

Part 3-29 (Enterprise Authorization Enterprise Reference Validation Suite) 산출 문서 색인.

## 문서 구성
| 문서 | 역할 |
|---|---|
| `docs/spec/EPIC_06A_PART3_29_REFERENCE_VALIDATION_SUITE_SPEC.md` | canonical SPEC v1.0(§0~§36) |
| `docs/architecture/ADR_DSAR_AUTHZ_REFERENCE_VALIDATION_SUITE.md` | 설계 결정(D-1~D-5·KEEP_SEPARATE) |
| `DSAR_APPROVAL_ERVS_EXISTING_IMPLEMENTATION.md` | GT① 실존 substrate 전수조사 |
| `DSAR_APPROVAL_ERVS_DUPLICATE_IMPLEMENTATION_AUDIT.md` | GT② 중복/동음이의 KEEP_SEPARATE |
| `DSAR_APPROVAL_ERVS_CANONICAL_ENTITIES.md` | §2 20 엔티티 + §3~25 Validators 설계·판정 |
| `DSAR_APPROVAL_ERVS_GOVERNANCE_MECHANISMS.md` | §26~35 Guard/Lint/Error/API/DB/Test/Gate |
| `DSAR_APPROVAL_ERVS_INDEX.md` | 본 색인 |

## 판정 요약
- **PARTIAL(E2E smoke `render.mjs`·CI `deploy.yml`/`security-scan.yml`·pre-commit 게이트·Health/SystemMetrics·Compliance readiness·SecurityAudit evidence — 검증 자산 비교적 큼) / ABSENT-formal(통합 Orchestrator·Reference Assertion·PDP/PEP/Zero Trust/Digital Twin/KG/Mesh Validator·Validation Certificate).**
- **코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE**(선행 Part1~3-28 인증 종속).
- 실행 시 기존 검증 자산 확장(E2E/CI/pre-commit 승격·`SecurityAudit::verify`·`Db.php`·`Compliance.php`·`Health.php`) — 러너/스캐너/해시체인 난립 금지.
- ★Authorization Validator 대상(RBAC/effectiveForUser/writeGuard)은 실 강제가 강함 → Validator는 재구현이 아니라 **검증**.

## 다음 (SPEC §36)
Part 3-30 Production Excellence → … → 3-36 Reference Platform Certification.
