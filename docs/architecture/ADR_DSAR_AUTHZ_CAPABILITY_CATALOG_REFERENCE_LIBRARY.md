# ADR — Enterprise Authorization Capability Catalog & Reference Library (Part 3-42)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_42_CAPABILITY_CATALOG_REFERENCE_LIBRARY_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EACCRL_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EACCRL_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-42는 전 자산을 재사용 가능한 표준 라이브러리로 통합한다. ★특이점: docs/·registry·shared components substrate 실재 + Part 3-33/3-37/3-27 대거 중복 + 본 DSAR 세트 자체가 인스턴스. 본 ADR이 그 경계를 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (상위 Part 자산 통합·저장소 재정의 금지)**: Architecture/Pattern/ADR=Part 3-33·Best Practice=Part 3-37·Registry=Part 3-27. 새 저장소를 만들지 않고 **통합 카탈로그/검색 계층**으로 참조.
- **D-2 (문서/도구 substrate 재사용·발명 금지)**:
  - Reference Architecture/ADR=`docs/architecture/`·`docs/spec/`. Pattern/Best Practice=`docs/CONSTITUTION.md`·`CLAUDE.md`·메모리. Registry=`docs/registry/`·`ChannelRegistry.php`.
  - API Reference=`routes.php`·OpenPlatform openapi. Policy Reference=`TeamPermissions.php`(acl). Reusable Component=`Crypto`·`SecurityAudit`·`Mapping`·`Ssrf`·MediaHost.
  - Version=git. Semantic Search/Knowledge=`gen_chatbot_knowledge.mjs`([[reference_chatbot_knowledge_pipeline]]). Evidence=`SecurityAudit::verify`. Isolation=`Db.php`.
- **D-3 (Immutable Reference·Duplicate 방지)**: 참조 이력=git+`SecurityAudit::verify`. ★Duplicate Canonical Asset 차단=중복금지 규율([[feedback_no_duplicate_features]]·착수 전 grep) 형식화.
- **D-4 (Runtime Guard=Asset Publication 차단)**: 무단 자산 발행 차단=admin 게이트·CHANGE_GATE·`index.php` RBAC 위 배치.
- **D-5 (자기참조 정직)**: 본 EPIC 06-A DSAR 세트+`docs/`가 EACCRL의 수동/문서형 인스턴스. Reuse Before Build 원칙 이미 적용중=본 프레임워크는 형식화이지 신규 원칙 아님.

## KEEP_SEPARATE (오흡수 금지)
- GraphScore(마케팅 그래프) ≠ Knowledge Graph Integration(IAM).
- 챗봇 지식(고객 FAQ) ≠ 내부 기술 Knowledge Asset(단 `gen_chatbot_knowledge.mjs` 파이프라인 재사용) · 제품 UI 컴포넌트 ≠ 재사용 authz 컴포넌트.

## 결과 (Consequences)
- 판정 = PARTIAL(docs/architecture·registry·routes/openapi·shared components·git·chatbot-knowledge substrate·비교적 큼) / ABSENT-formal(통합 Capability Registry·Semantic Search Engine·Knowledge Graph Integration·Metadata Management 순신설).
- 실행 순서: 선행 Part 인증 → Capability Registry 신설 → docs/registry/shared components/routes 통합 카탈로그 배선 → Semantic Search(chatbot 파이프라인 확장)/Metadata. 코드 0.
