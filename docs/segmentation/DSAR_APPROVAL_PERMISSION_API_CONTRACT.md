# DSAR — Permission Engine API Contract (EPIC 06-A-03-02-03-04 Part 2 · §94)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-19)
- **상위 ADR**: [`ADR_DSAR_PERMISSION_ENGINE_FOUNDATION`](../architecture/ADR_DSAR_PERMISSION_ENGINE_FOUNDATION.md)
- **전수조사 GROUND_TRUTH**: [`DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_PERMISSION_EXISTING_IMPLEMENTATION.md)
- **규율**: 코드/DB 0 · BLOCKED_PREREQUISITE(RP-002) · 반날조(file:line은 상위 2문서만) · Permission≠Role≠Authority · Golden Rule · Part1 D-2 재플래그 금지

---

## ① 목적

§94는 **Permission Engine이 노출하는 API 표면과 모든 엔드포인트가 지켜야 할 공통 계약**이다. 관리 API(Registry/Definition/Grant/Resolution/Simulation/Reconciliation)를 정의하되, **Immutable 산출물(Snapshot/Evidence/Audit/Historical Grant Version)에는 수정 API를 두지 않는다**. 기존 프로젝트 컨벤션(`/api/...`·`/v{NNN}/...`·`routes.php` 등록·`index.php` 미들웨어)을 그대로 계승한다.

## ② 핵심 항목/열거

### 관리 API 그룹 (§94)

| 그룹 | 표면 | 특성 |
|---|---|---|
| Registry API | Permission Registry 조회/목록 | 읽기 위주·Version 필터 |
| Definition API | Permission Definition CRUD(신규 버전=신규 레코드) | In-place Update 금지·신 버전 발행 |
| Hierarchy API | Permission Hierarchy 조회/편집 | Self/Circular Edge 차단 |
| Group API | Permission Group 관리 | Circular Group 차단 |
| Bundle API | Permission Bundle 관리 | 구성 권한 참조 무결성 |
| Grant API | Grant 발행/철회/만료 | Version화·Source Chain 필수·In-place Update 금지 |
| Resolution API | Effective Allow/Deny Set 조회 | Deny-overrides·읽기 |
| Simulation API | "이 actor가 이 resource에 이 action 가능?" dry-run | 부작용 없음·집행 금지 |
| Reconciliation API | 드리프트 탐지/재조정 트리거 | Snapshot 대조·수정은 신 레코드 |

### 공통 계약 (전 엔드포인트 필수)

- **Tenant Context**: 모든 요청에 tenant 귀속·크로스테넌트 조회 차단.
- **Authentication**: Bearer/api_key(기존 index.php 미들웨어).
- **Authorization**: Permission API 자체도 Permission으로 보호(메타-권한·admin:keys 급).
- **Expected Version**: 낙관적 정합(요청 버전≠현재 → 409).
- **Idempotency**: 쓰기(Grant 발행 등) Idempotency-Key 지원.
- **Correlation/Causation ID**: 요청 추적·Evidence 연결.
- **Sensitive Redaction**: 응답에서 타테넌트/민감 grant 세부 마스킹.
- **Audit**: 모든 변경 append-only 감사(auth_audit_log 계승·per-request 결정까지 확장).
- **Evidence**: 결정/Grant에 Evidence 참조.
- **Pagination**: 목록 표준 페이지네이션.
- **Rate Limit**: 남용 방지.
- **Error Contract**: §90/§91 코드로만 응답(자유 문자열 금지).
- **Server-side Enforcement**: 모든 판정 서버측(UI hint 금지).

### 금지 (Immutable — 수정 API 부재)

- Immutable **Snapshot** 수정 API 금지.
- **Evidence** 수정 API 금지.
- **Audit** 수정/삭제 API 금지.
- **Historical Grant Version** 수정 API 금지(신 버전 발행만).

## ③ substrate 매핑 (§92 + file:line · 없으면 ABSENT)

- **API 미들웨어/인증·인가·tenant 계승처** — `index.php:553-619`(중앙 RBAC·roleRank `:573`·write 게이트 `:590-596`·tenant 강제주입 `:619`·`/v421/keys` admin:keys `:583-586`). Permission 관리 API는 이 미들웨어를 그대로 통과하도록 배선.
- **라우팅 컨벤션** — 기존 `/api/...`·`/v{NNN}/...` 2 URL shape + `routes.php` 등록(핸들러 매핑 문자열). 신규 Permission API도 최신 버전 프리픽스 아래 `routes.php`에 등록해야 인지됨.
- **Grant substrate(발행/철회 대상)** — `TeamPermissions.php:152-171`(acl_permission)·`replacePerms :325`·`putMemberPermissions :628-647`(위임상한 403). Grant API의 확장 대상이나 **Version/Source Chain은 ABSENT**.
- **Resolution substrate** — `effectiveForUser :366`·`effectiveScope :236-265`(Effective-Set 온디맨드·미영속). Resolution/Simulation API의 계산 substrate.
- **Audit substrate** — `auth_audit_log`(UserAuth::logAudit) = 변경만 기록·per-request 결정 미감사(PARTIAL).
- **Registry/Definition/Hierarchy/Group/Bundle/Reconciliation API · Snapshot/Evidence 저장체** — **ABSENT(순신규)**.

## ④ 설계 원칙

- **Golden Rule**: Grant API는 acl_permission을 확장하고 중복 Grant Registry 신설 금지. Resolution은 `effectiveForUser` 확장.
- **컨벤션 계승**: `/api` 프리픽스 필수(nginx SPA HTML 폴백 착시 주의)·`routes.php` 등록·기존 미들웨어 재사용. 별도 인증 스택 신설 금지.
- **Immutable 표면**: Snapshot/Evidence/Audit/Historical Grant Version은 조회 전용 — 정정도 신 레코드/신 버전으로만.
- **Simulation은 부작용 0**: dry-run은 grant/집행/감사 상태를 바꾸지 않음(테스트·UI 프리뷰용).
- **메타-권한**: Permission을 바꾸는 API는 최고 등급 권한(admin:keys 급)으로 보호·감사.
- **Error Contract 단일**: §90/§91 코드로만 실패 표현.

## ⑤ Gap

- Registry/Definition/Hierarchy/Group/Bundle/Simulation/Reconciliation API·Snapshot/Evidence 저장체 = **전부 순신규**.
- BLOCKED_PREREQUISITE(RP-002): Grant Version·Snapshot·Evidence·Decision Core(Part 1·코드 0) 선행 없이는 Immutable 표면·Resolution Binding 미완.
- 현행 실 API = 없음(Permission 전용 엔드포인트 부재). acl_permission 편집은 team 권한 API에 내장(menu_key 지향). ★신설·`routes.php` 배선은 별도 승인세션.
