# DSAR — EASALM Ground-Truth ② Duplicate Implementation Audit (Part 3-33)

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 목적 = EASALM 신설이 기존 아키텍처 거버넌스 문서/자산과 중복(엔진 난립)하지 않도록 KEEP_SEPARATE·재사용 경계 확정.

## 동음이의/재사용 — 오흡수 vs 재사용 구분
| EASALM 개념 | 코드베이스/문서 자산 | 인용 | 판정 |
|---|---|---|---|
| ADR / Architecture Decision | ADR 리포지토리 | `docs/architecture/` | ★재사용(문서형 정본·형식화 대상·중복 신설 금지) |
| Architecture Principle/Governance | Constitution·CHANGE_GATE·registry | `docs/CONSTITUTION.md`·`docs/CHANGE_GATE.md`·`docs/registry/` | ★재사용(신 원칙 도입 금지·Golden Rule 정합) |
| Architecture Compliance/Review | 본 DSAR 파이프라인 | `docs/segmentation/DSAR_APPROVAL_*` | 재사용(수동→형식화) |
| Dependency Graph | PM Dependencies DFS·menu wouldCycle | `PM/Dependencies.php`·`AdminMenu.php` | KEEP_SEPARATE(태스크/메뉴 ≠ 아키텍처·알고리즘만 참조) |
| Architecture Graph | GraphScore(마케팅) | `GraphScore.php` | KEEP_SEPARATE |
| Review | 마케팅 A/B·AutoRecommend | `AbTesting.php`·`AutoRecommend.php` | KEEP_SEPARATE(마케팅 ≠ Architecture Review) |
| Pattern Catalog | (부재) | — | 순신설 |
| Immutable History | git·SecurityAudit·메뉴snapshot | git·`SecurityAudit.php`·`AdminMenu` | git=재사용·SecurityAudit=Evidence·메뉴snapshot=KEEP_SEPARATE(★tamper-evident 아님) |

## 확장 대상(중복 신설 금지·기존 승격)
- ADR Manager = `docs/architecture/` 형식화(중복 ADR 저장소 신설 금지). Governance/Standards = Constitution/CHANGE_GATE/registry 승격.
- Dependency 알고리즘 = `PM/Dependencies.php` DFS·`AdminMenu` wouldCycle 참조. Evidence = `SecurityAudit::verify`. Isolation = `Db.php`. Runtime Guard = CHANGE_GATE/pre-commit/RBAC 위 배치.

## 판정
**중복 위험 높음(아키텍처 거버넌스 문서 substrate 상당).** ★핵심=`docs/architecture/` ADR·Constitution·CHANGE_GATE·registry는 **재사용/형식화 대상**(중복 저장소/원칙 신설 절대 금지). PM Dependencies·GraphScore·마케팅은 오흡수 금지. 형식 순신설=런타임 ARB/Lifecycle/Impact/Compliance Engine·Pattern Catalog 뿐. 본 EPIC 06-A DSAR 파이프라인 자체가 이 프레임워크의 수동 인스턴스임을 명시(자기참조 정직).
