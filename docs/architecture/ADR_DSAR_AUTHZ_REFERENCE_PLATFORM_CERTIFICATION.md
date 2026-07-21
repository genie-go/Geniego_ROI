# ADR — Enterprise Authorization Reference Platform Certification (Part 3-36)

> **거버넌스 상태**: 설계 결정 기록(ADR) · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-21).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_36_REFERENCE_PLATFORM_CERTIFICATION_SPEC.md`.
> Ground-Truth: `DSAR_APPROVAL_EAERPC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_EAERPC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②).

## 컨텍스트
Part 3-36은 플랫폼을 Reference Platform으로 공식 인증하는 전사 표준을 규정한다. ★특이점: Part 3-25/3-28/3-29와 인증 영역 중복 + 06-A 자체가 NOT_CERTIFIED라는 자기참조 역설. 본 ADR이 그 경계를 기록한다. **코드 0**.

## 결정 (Decision)
- **D-1 (★자기참조 정직)**: EAERPC를 EPIC 06-A에 적용 시 결과=**Not Certified**(Part1~3-35 전건 NOT_CERTIFIED·코드 0). 인증 프레임워크 설계는 가능하나 대상 플랫폼(06-A)은 현재 인증 불가. "Certified" 표기 절대 금지.
- **D-2 (상위 Part 재사용·엔진 재정의 금지)**: Functional/Security/Performance/Compliance Certification=Part 3-29(Validation Suite) Validator **실행·집계 계층**. Production Certification=Part 3-25 참조. Certification Readiness=Part 3-28 참조. 새 Validator/인증엔진 신설 금지.
- **D-3 (PARTIAL substrate 재사용)**: Certification Status=`NOT_CERTIFIED` 라벨 형식화·Compliance Cert=`Compliance.php` 승격·Functional/Security 검증=E2E smoke/CI 승격·Approval Workflow=pending_approval/handoff approval·Evidence=`SecurityAudit::verify`·Isolation=`Db.php`.
- **D-4 (Immutable Certification/Signature)**: 인증 이력·서명=`SecurityAudit::verify` 재사용(신규 체인 금지)·artifact signature=deploy 서명(★SBOM/signing 부재·Part3-25 정합·신설 대상).
- **D-5 (Runtime Guard=Uncertified Deployment 차단)**: 미인증 배포 차단은 기존 `deploy.yml` 게이트·`index.php` RBAC 위 배치. ★현재 06-A는 미인증이라 배포 차단이 정합(설계 문서만 배포).

## KEEP_SEPARATE (오흡수 금지)
- 채널/제품 인증(kc_cert·`PriceOpt`) ≠ Platform Reference Certification.
- Part3-28 Maturity Certification Readiness(성숙도 스코어) ≠ Platform Certification(합격/불합격 판정). ModelMonitor ≠ AI Governance Certification.

## 결과 (Consequences)
- 판정 = PARTIAL(NOT_CERTIFIED 라벨·Compliance·E2E/CI·pending_approval·SecurityAudit substrate) / ABSENT-formal(통합 Certification Lifecycle/Renewal/Dashboard·Reference Signature 순신설) + ★06-A=Not Certified.
- 실행 순서: 선행 Part 실 구현·인증 → Reference Platform Registry 신설 → 3-29 Validator 실행 계층 + Compliance/E2E 승격 → Renewal/Dashboard. 코드 0.
