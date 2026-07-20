# DSAR — Approval Configuration Version Coordinator (Part 3-19 §18)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## (1) 계약 (SPEC §18 — Configuration Version Coordinator)

registry(§17) 엔트리의 `Configuration Version` 필드를 발급·조정하는 유일 권위. 4계약을 보유한다.

- **Semantic Version** — MAJOR.MINOR.PATCH 규칙. MAJOR=비호환 정책 변경, MINOR=하위호환 추가, PATCH=무영향 수정. 승인 config 변경마다 단조 증가.
- **Compatibility Matrix** — 특정 authz config 버전이 어떤 집행 엔진(배포 엔진 §6·플래그 매니저 §21) 버전과 호환되는지의 명시 표. 매트릭스 밖 조합은 배포 거부(fail-closed).
- **Rollback Version** — 각 활성 버전은 직전 known-good 버전 참조를 보유. 집행 실패/이상 시 Rollback Version으로 원자적 복귀.
- **Upgrade Path** — N→N+1 이행 시 수행할 마이그레이션·검증 단계의 순서 정의. 경로 없는 점프 금지.

계약: Version Coordinator는 registry에만 버전을 발급하고, 스키마 DDL 버전과 **네임스페이스를 분리**한다.

## (2) Substrate 매핑

| 계약 요소 | 현행 substrate | 상태 | 근거(①②/ADR) |
|---|---|---|---|
| 버전 관리 존재 | 스키마 마이그레이션 버전 | authz 아님 | `Db.php:157-162` |
| 마이그레이션 러너 | 순차 실행 | schema 전용 | `migrate.php:9-15`,`migrate.php:10` |
| 마이그레이션 적용 지점 | 실행 루프 | schema 전용 | `migrate.php:48` |
| Semantic Version(authz) | — | **부재** | (grep 0) |
| Compatibility Matrix | — | **부재** | (전무) |
| Rollback / Upgrade Path | — | **부재** | (전무) |

현행 유일 버전 개념은 **DB 스키마 버전**(`Db.php:157-162`)과 이를 순차 적용하는 마이그레이션 러너(`migrate.php:9-15`·`migrate.php:48`)뿐이다. 이는 테이블 DDL의 형상 버전이며 **authz 정책 config의 semantic 버전이 아니다**.

## (3) 설계 계약 (순신설)

1. **네임스페이스 분리** — authz config 버전은 스키마 버전(`Db.php:157-162`)과 별도 계열. 마이그레이션 러너(`migrate.php:9-15`)를 재사용하지 않는다(관심사 분리).
2. **Semantic Version 발급** — registry(§17) 엔트리 승인 시점에 MAJOR.MINOR.PATCH를 단조 발급. 발급 이력은 append-only 감사 원장(`SecurityAudit.php:14-64`)에 기록.
3. **Compatibility Matrix** — {config_version × engine_version} 호환 표를 registry 메타로 보관. 배포 엔진(§6)은 배포 전 매트릭스 조회, 불일치 시 거부.
4. **Rollback Version** — 각 활성 버전이 직전 known-good 포인터 보유. 복귀는 신규 버전 발급이 아니라 포인터 전환(무회귀).
5. **Upgrade Path** — N→N+1 단계 서술을 버전 오브젝트에 첨부. 검증 단계 미통과 시 활성화 보류.

## (4) KEEP_SEPARATE

- **스키마 DDL 버전·마이그레이션 러너**(`Db.php:157-162`·`migrate.php:9-15`·`migrate.php:48`)는 테이블 형상 관리 도구로, authz config Version Coordinator가 흡수·대체하지 않는다.
- **플랜 버전/설정**(`AdminPlans.php:157`,`AdminPlans.php:180`)은 product 계층으로 별개.

## (5) 판정

**PARTIAL.** 버전 관리 substrate가 스키마 계층(`Db.php:157-162`·`migrate.php:9-15`)에는 실재하나 authz 정책 버전이 아니다. Configuration Version Coordinator는 이를 흡수하지 않고 semantic version·compatibility matrix·rollback version·upgrade path를 **순신설**하여, 스키마 버전과 네임스페이스를 분리해 확장한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§17 registry 선행).
