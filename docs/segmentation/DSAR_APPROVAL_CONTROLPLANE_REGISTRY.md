# DSAR — Authorization Control Plane Registry (Part 3-19 §1·§2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_CONTROL_PLANE_REGISTRY

Authorization Control Plane Registry 는 **정책·역할·권한·자원·approval workflow 정의를 관장하는 중앙 시스템 오브 레코드(SoR)** 이다. Data Plane(런타임 PDP/PEP)이 소비하는 모든 authz 아티팩트의 **선언적 원본**을 보관하고, 각 아티팩트에 버전·상태(draft/active/deprecated)·소유자·감사 참조를 부여한다. 계약상 Registry 는:

- **Control/Data Plane 분리**: Registry 는 정의(what)만 보유하며 집행(how/where)은 Data Plane 에 위임한다. 정의 변경은 Publisher(§5)를 통해서만 Data Plane 으로 전파된다.
- **버저닝·불변 이력**: 모든 등록 아티팩트는 monotonic version 과 append-only 변경 이력을 가진다.
- **테넌트 격리**: 아티팩트는 tenant 스코프로 격리되며 플랫폼 전역(shared) 정의와 명확히 구분된다.

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| 라이브 authz 런타임 | 단일 PHP/MySQL Slim 모놀리스 | `backend/public/index.php:23`·`backend/src/Db.php:18`·`backend/composer.json:2-12` |
| Control/Data Plane 분리 | **ABSENT** | inline RBAC 미들웨어 `index.php:69-88`(정의·집행 동일 프로세스 혼재) |
| 중앙 정책 Registry(SoR) | **ABSENT** (grep 0) | 별도 registry 테이블/서비스 부재. 현행은 flat KV 뿐 |
| 현행 설정 저장소(EXTEND 대상) | **PARTIAL** | flat KV `app_setting(skey,svalue,updated_at)` `Db.php:308-321`(`:315` MySQL DDL·`:317` SQLite DDL) |
| 스키마 부트스트랩(멱등 ensure) | PRESENT | `Db.php:308-321`(PDO별 멱등 메모 `:310-312`) |
| 마이그레이션 배선 | PRESENT | `backend/bin/migrate.php:9-15`(`:10`)·`:48` |
| RBAC 역할 정의(런타임 상수) | PARTIAL | 역할서열 inline `index.php:69-88`·팀권한 `TeamPermissions.php:695-701` |
| 변경 증거(불변 해시체인) | PRESENT(재사용) | `SecurityAudit.php:14-31`·`:35-38`·`:43-51`(append-only log/verify) |

**판정 근거**: 중앙 Authorization Control Plane Registry 는 코드·스키마 어디에도 존재하지 않는다(grep 0). 유일한 근사 저장소는 `app_setting` flat KV(`Db.php:308-321`)이며, 이는 스칼라 설정 보관용으로 버전·상태·소유자·아티팩트 타입 개념이 없다. 따라서 Registry 는 **ABSENT**, `app_setting` 은 **EXTEND 대상 substrate**(대체·재구현 금지)로 판정한다.

## 3. 설계 계약(규칙)

- **R1 (EXTEND-only)**: Registry 영속은 신규 저장소를 난립시키지 않고 `app_setting`(`Db.php:315`,`:317`) 위에 네임스페이스(`authz.registry.*`)로 확장하거나, 그 DDL 패턴(멱등 ensure `Db.php:308-321`)을 계승한 전용 테이블을 추가한다. 기존 스칼라 설정 스키마 파괴 금지.
- **R2 (버저닝)**: 모든 등록 아티팩트는 monotonic version·상태 enum(draft/active/deprecated)을 필수로 가진다. active 아티팩트만 Publisher(§5)가 Data Plane 으로 전파할 수 있다.
- **R3 (증거 불변성)**: 등록/변경/폐기는 각각 `SecurityAudit.php:14-31`(`log`)·`:43-51`(`verify`) 해시체인에 append-only 기록한다. Registry 는 감사를 **참조**하되 자체 감사 로직을 재구현하지 않는다.
- **R4 (테넌트 격리)**: 아티팩트는 tenant 스코프 키로 격리한다. 플랫폼 전역 정의는 `__shared__` 스코프로만 표기하고 실테넌트로 읽지 않는다.
- **R5 (읽기 SoR 단일화)**: Data Plane PDP(`TeamPermissions.php:695-701`)·PEP(`index.php:69-88`)가 참조하는 역할·권한 정의는 Registry 를 단일 원본으로 삼는다. 중복 정의 소스 금지.

## 4. KEEP_SEPARATE

해당 없음. 본 §1·§2 Registry 는 순신설이며 흡수·확장 대상 마케팅/ML/deploy 컴포넌트 없음.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_CONTROL_PLANE_REGISTRY 는 라이브 코드에 부재(grep 0)하며, 본 문서는 설계 계약만 정의한다. 실 구현은 선행 foundation(Control/Data Plane 분리 결정·`app_setting` EXTEND 승인) 완료 후 별도 승인 세션에서 진행한다. 코드 변경 0.
