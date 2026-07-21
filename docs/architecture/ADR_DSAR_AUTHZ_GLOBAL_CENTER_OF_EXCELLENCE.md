# ADR — Enterprise Authorization Global Center of Excellence Framework (Part 3-37)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_37_GLOBAL_CENTER_OF_EXCELLENCE_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAGCOE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAGCOE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-37은 아키텍처/보안/정책/AI/운영/품질/교육/혁신을 총괄하는 Global CoE 운영체계를 규정한다. ★특이점: **대부분 조직/인력/커뮤니티 체계**(코드/시스템 아님). 본 ADR이 그 성격과 문서형 substrate 재사용을 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (★조직 체계=비-코드 정직 선언)**: CoE Organization·Excellence Office 7종·Global Advisory Board·Community(Forum/Hackathon/Summit)·Training & Certification Office는 **조직/인력 신설 대상**이며 소프트웨어 산출물이 아니다. 코드 grep 무의미·설계(조직도/RACI) 문서까지만.
- **D-2 (문서형 substrate 재사용·중복 신설 금지)**:
  - Best Practice Repository → `docs/CONSTITUTION.md`·`.claude` 메모리(feedback/reference=베스트프랙티스·오탐레지스트리·트랩) 형식화.
  - Standards Management → `CLAUDE.md`·`docs/CHANGE_GATE.md`·`docs/registry/` 승격.
  - Innovation Incubation → Part 3-32(EACIF) 참조·중복 금지. Architecture Excellence → Part 3-33(EASALM) 참조. Training → Part 3-35(EAPCKT) 참조.
  - Knowledge Integrity → git·`SecurityAudit::verify`. Isolation → `Db.php`.
- **D-3 (Immutable Governance/Standards)**: CoE 표준/자문 이력=git + `SecurityAudit::verify` 재사용(신규 체인 금지).
- **D-4 (Runtime Guard=Standard Modification 차단)**: 무단 표준 수정·Best Practice 발행 차단은 기존 CHANGE_GATE·pre-commit·`index.php` RBAC 위 배치(신규 게이트 신설 금지).
- **D-5 (제품 커뮤니티 오흡수 금지)**: 제품 고객/테넌트 커뮤니티 ≠ CoE 내부 기술 커뮤니티(혼동 금지).

## KEEP_SEPARATE (오흡수 금지)
- 제품 고객(테넌트) ≠ CoE Community(내부 기술 인력).
- Part 3-32 Innovation Incubation·3-33 Architecture Excellence·3-35 Training = 상위 Part 참조(재정의 금지).

## 결과 (Consequences)
- 판정 = PARTIAL(Constitution·CLAUDE.md·메모리·CHANGE_GATE·registry·git·SecurityAudit 문서형 substrate) / ABSENT(조직/인력/커뮤니티/교육 체계=비-코드·신설).
- 실행 순서: 선행 Part 인증 + **조직 신설**(Executive Sponsor/Office/Advisory Board 인력) → Best Practice/Standards 형식화 → KPI/Analytics. 현재는 문서형 substrate 형식화 설계까지만.
