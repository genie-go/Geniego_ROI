# ADR — Enterprise Authorization Strategic Architecture Lifecycle Management (Part 3-33)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_33_STRATEGIC_ARCHITECTURE_LIFECYCLE_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EASALM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EASALM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-33은 전 아키텍처를 기획~폐기 생명주기로 관리하는 EASALM을 규정한다. ★특이점: 아키텍처 거버넌스 substrate가 **문서형으로 이미 상당히 존재**(ADR 리포지토리·Constitution·CHANGE_GATE·본 DSAR 파이프라인). 본 ADR은 그 재사용 경계를 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (형식 런타임 Architecture Governance 순신설)**: ARB Engine·Lifecycle 상태머신·Pattern Catalog·Impact Analysis Engine·런타임 Dependency Graph는 신설(grep 0).
- **D-2 (문서형 substrate 재사용·중복 신설 금지)**:
  - ADR Manager → `docs/architecture/`(`ADR_DSAR_*` 수십편·불변 버전이력=git) 형식화. ★본 EPIC 06-A DSAR 파이프라인=수동 ADR/Review/Compliance 인스턴스.
  - Architecture Principle/Standards/Governance → `docs/CONSTITUTION.md`(Golden Rule)·`docs/CHANGE_GATE.md`·`docs/registry/`·CLAUDE.md 승격.
  - Dependency Graph → `PM/Dependencies.php`(DFS)·`AdminMenu` wouldCycle 알고리즘 참조.
  - Evidence → `SecurityAudit::verify`. Isolation → `Db.php`.
- **D-3 (Immutable ADR History)**: ADR 불변 이력=git + (형식화 시) SecurityAudit 체인. 현재 git 이력이 불변 substrate.
- **D-4 (Runtime Guard=CHANGE_GATE 승격)**: Unapproved Architecture Deployment·Missing ADR·Standard Violation 차단은 기존 변경게이트(`docs/CHANGE_GATE.md`)·pre-commit 게이트·`index.php` RBAC 위 배치(신규 게이트 신설 금지).
- **D-5 (Golden Rule 정합)**: 본 프레임워크의 "Reuse Before Build·Evolution Before Replacement" 원칙은 `docs/CONSTITUTION.md` Golden Rule("Replace가 아니라 Extend")과 동일 — EASALM은 그 원칙의 형식화이지 신 원칙 도입 아님.

## KEEP_SEPARATE (오흡수 금지)
- PM Dependencies DFS(태스크 의존) ≠ Architecture Dependency Graph(알고리즘만 참조).
- GraphScore(마케팅 그래프) ≠ Architecture Graph · 마케팅 A/B·AutoRecommend ≠ Architecture Review/Decision.

## 결과 (Consequences)
- 판정 = PARTIAL(ADR 리포지토리·Constitution/CHANGE_GATE/registry·Dependencies DFS·SecurityAudit 문서형 substrate 실재) / ABSENT-formal(런타임 ARB/Lifecycle/Impact/Compliance Engine·Pattern Catalog 순신설).
- 실행 순서: 선행 Part 인증 → Architecture Lifecycle Registry 신설 → ADR/Constitution/CHANGE_GATE/registry 형식화 배선 → ARB/Impact/Compliance Engine → Analytics. 코드 0.
