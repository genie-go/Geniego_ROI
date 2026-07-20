# DSAR — 릴리스 버전 무결성 (APPROVAL_RELEASE_VERSION) (Part 3-25 §2·§29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §2·§29 Release Version Integrity)
**릴리스 버전 무결성(Release Version Integrity)**은 운영 중인 플랫폼이 승인된 버전 식별자와 스키마 상태로 실제 배포되었음을 검증 가능하게 보증한다. 계약:
- **버전 식별자 노출**: 실행 중 아티팩트의 배포 마커(빌드 시각/지문)를 관측 가능해야 한다.
- **스키마 버전 정합**: 코드 버전과 DB 마이그레이션 버전이 일치하며, 동시 마이그레이션은 락으로 직렬화된다.
- **롤백 안전성**: 스키마 롤백 경로가 정의되어 있고, 실패 시 부분 적용을 남기지 않는다.
- **불변식**: 미승인 버전/미적용 마이그레이션 상태의 운영 노출 금지(fail-closed).

## 2. Substrate 매핑
| 계약 요소 | 현행 substrate | 상태 |
|---|---|---|
| 배포 마커(버전 지문) | `Health.php:56-70`(composer.lock mtime 기반 deployMarker) | PARTIAL |
| 마이그레이션 직렬화 락 | `Db.php:157-163`(v426 락) | PARTIAL |
| 스키마 롤백 경로 | `migrate.php:94-133` | PARTIAL |
| DB 연결/폴백 상태 | `Db.php:43-48` | 참고 |
| 통합 릴리스 버전 레지스트리 | (전용 레지스트리 grep 0) | ABSENT |

## 3. 설계 계약
1. **버전 마커 승격**: `Health.php:56-70`의 deployMarker(composer.lock mtime)를 릴리스 버전 식별자의 SSOT 입력으로 채택 — 관측된 마커와 승인된 릴리스 태그를 대조.
2. **스키마 정합 게이트**: `Db.php:157-163` 마이그레이션 락(v426)으로 동시 적용 직렬화, `migrate.php:94-133` 롤백 경로를 무결성 검증의 되돌림 계약으로 연동.
3. **불일치 차단**: 코드 버전 ↔ 스키마 버전 불일치 또는 미완료 마이그레이션 관측 시 `BLOCKED` — 운영 노출 거부(fail-closed).
4. **확장 원칙**: 기존 deployMarker/락/롤백을 재구현하지 않고 버전 무결성 계층으로 통합.

## 4. 판정
**PARTIAL** — 배포 마커(`Health.php:56-70`), 마이그레이션 락(`Db.php:157-163`), 스키마 롤백(`migrate.php:94-133`)이 실재하여 버전/스키마 무결성의 원소를 제공한다. 그러나 이들을 승인된 릴리스 버전과 대조하는 통합 무결성 레지스트리·게이트는 부재 — 확장 대상. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
