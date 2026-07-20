# DSAR — Approval Configuration Registry (Part 3-19 §17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## (1) 계약 (SPEC §17 — Approval Configuration Registry)

Authorization Control Plane이 배포·집행하는 **모든 승인/권한 설정 오브젝트**는 단일 governed registry에 등재되어야 한다. registry 엔트리 하나는 다음 5속성을 불변 계약으로 보유한다.

- **Configuration Version** — semantic 식별자(§18 Version Coordinator가 발급).
- **Owner** — 설정을 소유·책임지는 principal(role/identity). 무소유 엔트리 금지(fail-closed).
- **Approval** — 활성화 전 통과해야 할 승인 게이트 참조(승인 없는 config는 draft 상태로만 존재).
- **Activation** — 유효 개시 시점·조건. 승인+activation 이전 config는 집행 경로에서 배제.
- **Expiration** — 만료 시점. 만료된 config는 자동으로 집행 대상에서 제외(무한수명 금지).

계약: registry는 authz 설정의 **Source of Truth**이며, 배포 엔진(§6)·버전 코디네이터(§18)·플래그 매니저(§21)는 registry를 참조만 하고 우회 저장소를 두지 않는다.

## (2) Substrate 매핑

| 계약 요소 | 현행 substrate | 상태 | 근거(①②/ADR) |
|---|---|---|---|
| 설정 저장 | `app_setting` flat KV | 존재하나 governance 無 | `Db.php:308-321` |
| 워크스페이스 상태 KV | `skey`/`svalue` 컬럼 | 존재하나 KV 평면 | `WorkspaceState.php:9` |
| 설정 키 조회 헬퍼 | KV get/set | 존재 | `Db.php:315`,`Db.php:317` |
| Version 발급 | 스키마 버전만 | authz 부재 | `Db.php:157-162` |
| Owner/Approval/Activation/Expiration | — | **부재** | (전무·grep 0) |

현행 `app_setting`은 tenant-scoped 단일 계층 key→value 저장으로, 값의 **버전·소유자·승인·활성/만료 메타데이터가 없다**. `WorkspaceState.php:9`의 skey/svalue도 동일한 평면 KV로, 어느 것도 governed configuration 오브젝트가 아니다.

## (3) 설계 계약 (순신설 — 현행 확장)

1. **registry 오브젝트 스키마 신설** — 기존 `app_setting`(`Db.php:308-321`) KV를 폐기하지 않고, 그 위에 `authz_config_registry`(가칭) 계층을 얹어 하나의 논리 엔트리에 {config_key, version, owner_principal, approval_ref, activation_at, expiration_at, payload_ref}를 보유한다. 원시 payload는 기존 KV에 저장(dual-read·무회귀).
2. **Owner 강제** — owner_principal 없는 엔트리는 draft로만 생성 가능, 활성화 불가(fail-closed).
3. **Approval 게이트 참조** — approval_ref는 기존 승인 원장(SecurityAudit append-only `SecurityAudit.php:14-64`)에 기록되는 승인 이벤트를 가리킨다. 신규 승인 엔진을 만들지 않고 기존 감사 원장에 연결.
4. **Activation/Expiration 윈도우** — 배포 엔진(§6)은 `activation_at ≤ now < expiration_at`인 엔트리만 배포 대상으로 선정. 윈도우 밖 엔트리는 조용히 제외.
5. **Version 발급 위임** — version 필드는 §18 Version Coordinator가 유일 발급자. registry는 발급하지 않고 참조.

## (4) KEEP_SEPARATE

- **스키마 마이그레이션 버전**(`Db.php:157-162`·`migrate.php:9-15`)은 DB DDL 버전이지 authz config 버전이 아니다 — registry 버전과 혼용 금지.
- **도메인 설정**(sso_config `EnterpriseAuth.php:43`)은 개별 기능 config로, governed authz config registry의 관리 대상이 아니다(별도 소유).
- **관리자 플랜 설정**(`AdminPlans.php:53-72`)은 product config로 별개.

## (5) 판정

**PARTIAL.** 저장 substrate(`app_setting` `Db.php:308-321`·`WorkspaceState.php:9`)는 실재하나 flat KV로 version/owner/approval/activation/expiration이 전무하다. Approval Configuration Registry는 이 KV를 폐기하지 않고 그 위에 governed 메타데이터 계층을 **순신설**하여 확장한다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§18 Version Coordinator·§6 배포 엔진 선행).
