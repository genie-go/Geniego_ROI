# DSAR — Environment Scope (per-entity 설계 · EPIC 06-A-03-02-03-04 Part 3-4)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **스펙 근거**: [`EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC`](../spec/EPIC_06A_PART3_4_SCOPED_ROLE_GOVERNANCE_SPEC.md) §20 Environment Scope(DEV · QA · STAGING · PROD, 기본 PROD 분리)
- **상위 ADR**: [`ADR_DSAR_SCOPED_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SCOPED_ROLE_GOVERNANCE.md)
- **선행 GROUND_TRUTH**: [`DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SCOPE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SCOPE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment(Part 3-1/3-2/3-3)·Decision Core 실구현 후 별도 승인세션.
- **불변**: Default Intersection(§9 Scope Policy 기본) · **envLabel≠Scope(★본 엔티티 핵심 경계 — 배포라벨을 데이터 scope로 오분류 금지)** · 반날조(부재 날조·실재 과신 양방향 금지) · 289차 P1~P4 재플래그 금지.

---

## 1. 목적

**배포 환경(DEV/QA/STAGING/PROD) 단위 접근범위**를 정형화한다. ★본 엔티티는 ADR D-1/D-4가 명시적으로 다루는 **오분류 경계 사례**다: 현행 `envLabel`(demo/production)은 Environment Scope §20의 **근접 substrate**이나, **"배포환경 라벨"이지 "데이터 접근범위(scope)"가 아니다**(ADR D-1 표 "envLabel | NOT_SCOPE(배제)"). 본 문서는 이 근접성과 오분류 경계를 동시에 정직하게 기록한다.

## 2. Canonical 필드

| 필드 | 설명 |
|---|---|
| `environment_scope_code` | Environment Scope 식별자 |
| `environment_value` | DEV / QA / STAGING / PROD(§3) |
| `prod_isolation` | PROD 분리 강제 여부(기본 true) |
| `cross_environment_access` | 환경 간 접근 허용 여부(기본 거부) |

## 3. 열거형 / 타입

- **environment_value**: `DEV` · `QA` · `STAGING` · `PROD`(스펙 §20 열거 그대로 — 4값). 기본 PROD 분리(§20 "기본 PROD 분리").
- **실 substrate 값 집합(비동형)**: `demo` · `production`(2값뿐 — `Db.php:56-61`).

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| Canonical | 실 substrate | 태그 | 근거(file:line) |
|---|---|---|---|
| 배포 환경 라벨 판정(근접) | `envLabel()` — DB명 `_demo` 접미=demo, 그외=production | **PARTIAL(근접·2/4값)** | `Db.php:56-61` |
| PROD 분리 유사 동작(근접) | `guardTeamWrite` 데모 전면우회 | **PARTIAL(근접·범위 상이)** | `UserAuth.php:1173`(`Db::envLabel()==='demo'`→null) |
| env()/envLabel() 이원화 | — | **주의(경고 존재)** | `MediaHost.php:58-60` |
| DEV/QA/STAGING 3값 | — | **ABSENT** | grep 0 — demo/production 2값 외 정의 없음 |
| Environment을 **접근범위(scope)**로 강제하는 게이팅(테넌트/역할별 환경 접근 제한) | — | **ABSENT** | envLabel은 배포 라벨 판독용이며, "이 사용자/역할이 이 환경에 접근 가능한가"를 판정하는 scope 게이트가 아님 |

★★**오분류 경계(반드시 준수)**: `envLabel`은 (a) 소비 위치가 배포 인프라 판별(데모 우회·DB 선택)이지 "주체별 환경 접근권한" 판정이 아니고, (b) 값 공간이 2값(demo/production)뿐이라 스펙의 4값(DEV/QA/STAGING/PROD)과 불일치하며, (c) ADR이 명시적으로 `NOT_SCOPE(배제)`로 분류했다(D-1 표) — 이유는 "배포환경 라벨이지 데이터 scope 아님"(D-4). 본 엔티티를 **PARTIAL로 판정하는 이유는 근접 substrate가 실재하기 때문이지, envLabel이 곧 Environment Scope라는 뜻이 아니다.** Canonical Environment Scope Type을 신설할 때 envLabel을 substrate로 흡수하되, "배포 라벨"과 "접근범위 scope"의 개념적 구분을 코드 주석·문서 양쪽에 유지해야 한다(오분류 시 향후 세션 재감사 리스크).

## 5. 설계 원칙

- Canonical Environment Scope는 envLabel(배포 판별)을 **substrate로 흡수하되 재명명하지 않는다** — envLabel은 계속 배포 인프라 목적으로 유지, Environment Scope는 그 위에 얹는 접근범위 게이트로 별도 구현.
- DEV/QA/STAGING 3값은 현재 배포 파이프라인에 대응 환경이 없으므로(운영=roi.geniego.com, 데모=roidemo.geniego.com 2계층만) 실 구현 전 제품 결정(추가 스테이징 환경 여부) 선행 필요 — 임의 신설 금지.
- PROD 분리는 guardTeamWrite 데모 우회 패턴을 참조하되, "데모 전면우회"와 "PROD 격리 게이트"는 방향이 반대(전자=완화, 후자=강화)이므로 그대로 재사용 불가 — 신규 게이트 설계 필요.
- envLabel·env()/envLabel() 이원화(`MediaHost.php:58-60`)는 이번 Part 범위 밖(별도 정리 대상으로만 기록, 수정 안 함).

## 6. Gap / BLOCKED_PREREQUISITE

- **NOT_CERTIFIED**: 2/4값만 실재(demo/production) · DEV/QA/STAGING ABSENT · "환경별 접근권한 게이트" 자체가 ABSENT(envLabel은 배포판별 전용).
- **BLOCKED_PREREQUISITE**: Canonical Scope Registry 통합 및 선행 Permission/Role 계열 실구현 후 — **RP-002**.
- 289차 P1~P4 재플래그 금지 · envLabel 오분류(=Environment Scope로 재정의)는 향후 세션에서도 금지.
