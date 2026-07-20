# DSAR — LTER Ground-Truth ① Existing Implementation (Part 3-27)

> **거버넌스 상태**: Ground-Truth 전수조사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_27_LONG_TERM_EVOLUTION_ROADMAP_SPEC.md` · ADR: `docs/architecture/ADR_DSAR_AUTHZ_LONG_TERM_EVOLUTION_GOVERNANCE.md`.
> 본 문서는 하위 per-entity DSAR file:line 인용의 **허용 근거지(GROUND_TRUTH)**다. 여기에 등장하지 않는 클래스 인용은 반날조 위반.

## 전수조사 방법
Evolution/Roadmap/Capability/Lifecycle/Deprecation/Technical-Debt/Vendor/Investment/Innovation/Drift 키워드로 `backend/src`·`frontend/src`·config·migrations 전수 grep + 능력기반 판독.

## 실존 substrate (형식 거버넌스 아님·비형식)
| LTER 개념 | 실존 substrate | 인용 | 성격 |
|---|---|---|---|
| Version Lifecycle | API 버전 병렬 라우팅(`/v377`…`/v429`·구버전 stub 보존) | `backend/src/routes.php` | 비형식 lifecycle(형식 상태머신 부재) |
| Deprecation | 구버전 라우트 stub 유지(backward compat) | `backend/src/routes.php` | 비형식(Announcement/Sunset/Removal 절차 부재) |
| Migration/Version 무결성 | `schema_migrations` 단조 버전 락 | `backend/src/Db.php` | 실재(스키마 한정·Roadmap 무관) |
| Dependency 목록 | 의존성 매니페스트 | `composer.json`·`package.json` | 목록만(Lifecycle/EOL 추적 부재) |
| Technical Debt 로그 | 세션 인계·문서 | `NEXT_SESSION.md`·`docs/` | 비형식·수동 |
| Immutable History 정본 | append-only 해시체인 | `backend/src/SecurityAudit.php`(verify) | 유일 실 tamper-evident([[reference_menu_audit_log_not_tamper_evident]]) |
| Tenant Isolation | 테넌트 격리 술어 | `backend/src/Db.php` | 실재(전 거버넌스 테이블 재사용 대상) |

## 부재(ABSENT) — 형식 거버넌스 엔티티 (grep 0)
Evolution Registry · Roadmap Manager · Capability Roadmap · Architecture/Security/Compliance/AI Evolution Planner · Technical Debt Manager(형식) · Dependency Lifecycle Manager · Version Lifecycle Manager(형식 상태) · Deprecation Manager(형식) · Innovation Pipeline · Future Standards Tracker · Vendor Strategy Manager · Investment Planning Engine · Roadmap Snapshot/Evidence/Digest/Analytics · Drift Detection · Revalidation · Reconciliation.

## 판정
**PARTIAL-informal / ABSENT-formal.** 진화 관련 비형식 substrate(버전 라우팅·schema_migrations·의존성 목록·기술부채 로그)는 실재하나, 형식 Evolution Governance 엔티티는 전무. Roadmap/Investment/Capability/Vendor/Innovation은 순신설. 실행은 선행 Part 인증 종속.
