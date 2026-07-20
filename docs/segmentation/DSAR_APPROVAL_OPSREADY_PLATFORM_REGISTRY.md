# DSAR — Platform Integration Registry (Part 3-25 §1·§2)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

---

## 1. 계약 정의 (SPEC §1·§2 — APPROVAL_PLATFORM_REGISTRY)

**Platform Integration Registry**는 플랫폼을 구성하는 모든 통합 대상(엔진·핸들러·라우트·외부 커넥터·스케줄러·인프라 컴포넌트)을 **단일 중앙 원장**으로 등재·식별·상태추적하는 거버넌스 엔티티다. 각 Registry Entry는 (a) 고유 식별자·소유 도메인·테넌트 스코프, (b) 통합 유형(internal engine / external connector / infra), (c) 의존성 그래프(선행/후행 통합), (d) 현재 통합 상태(REGISTERED→INTEGRATED→VERIFIED→CERTIFIED), (e) 근거(evidence) 참조를 필수 필드로 보유한다. Registry는 Part 3-25 통합·활성화·인증의 **권위 있는 인벤토리 원천(SoT)**이며, 미등재 컴포넌트는 통합 단계(§3-25-3)·운영 준비(§5)의 대상이 될 수 없다(Fail-closed: 미등재=INELIGIBLE).

## 2. 실존 substrate 매핑

| SPEC 요구 | 판정 | 근거(허용목록) |
|---|---|---|
| Platform Integration Registry(중앙 원장·엔티티/상태/의존성) | **ABSENT(grep 0)** | 0 handler·0 route·0 table. 통합 인벤토리 원장 부재 |
| Registry Entry 상태 추적(REGISTERED→CERTIFIED) | **ABSENT** | 통합 상태 머신 없음 |
| 등재 근거(evidence) 앵커 | **PARTIAL(재사용 primitive)** | append-only 해시체인(`SecurityAudit.php:25-31`)=generic evidence·integration registry entry 없음 |
| 컴포넌트 존재/헬스 신호(등재 소재) | **PARTIAL(재사용 primitive)** | health probe(`Health.php:27-45`·`SystemMetrics.php:60-83`)=런타임 신호·인벤토리 아님 |
| 환경/config 스코프(등재 속성 소재) | **PARTIAL(재사용 primitive)** | env 해석(`Db.php:43-48`·`:56-61`)·config 미러(`AdminPlans.php:53-71`)=속성 원천·registry 아님 |

## 3. 설계 계약 (규칙)

- R1. Registry Entry는 **불변 식별자 + 버전드 상태**로 구성. 상태 전이는 오직 정의된 머신(REGISTERED→INTEGRATED→VERIFIED→CERTIFIED, 및 역방향 DEREGISTERED)으로만 허용.
- R2. 모든 등재/상태전이는 tenant 스코프를 필수로 보유(테넌트 격리 절대). 크로스테넌트 등재 조회 금지.
- R3. 등재/상태전이 이벤트는 append-only 근거체인에 앵커(재사용 `SecurityAudit.php:25-31`)—registry는 자체 조작내역을 tamper-evident로 남긴다.
- R4. 헬스/환경 신호(`Health.php:27-45`·`Db.php:43-48`)는 Registry Entry의 **읽기 속성**으로 참조될 뿐, Registry가 그 신호의 원천을 대체하지 않는다(SSOT 존중·중복엔진 금지).
- R5. 미등재 컴포넌트는 §3(단계)·§5(운영준비)에서 Fail-closed로 배제. 등재 없이는 인증 대상 아님.

## 4. KEEP_SEPARATE

- **커머스 채널 커넥터 레지스트리**(`ChannelSync.php:11-14`·`Connectors.php:13-15`)=커머스 데이터 연동 인벤토리이지 authz 플랫폼 통합 레지스트리 아님.
- **죽은 terraform blue-green/autoscaling**(`infra/aws/terraform/codedeploy_bluegreen.tf`)=라이브 무연결 IaC 스캐폴딩. Registry PRESENT 근거 인용 금지.
- **마케팅/컴플라이언스 readiness**(`Compliance.php:3`·`DataPlatform.php:218-309`·`:281`)·Part3-8 role certification(`AccessReview.php:16-17`)·LiveCommerce go-live(`LiveCommerce.php:248-249`)=동음이의. 흡수·오판 금지.

## 5. 판정 (NOT_CERTIFIED)

**Platform Integration Registry = ABSENT-greenfield(순신설·grep 0·0 handler/route/table).** 재사용 primitive는 근거체인(`SecurityAudit.php:25-31`)·health probe(`Health.php:27-45`·`SystemMetrics.php:60-83`)·env/config(`Db.php:43-48`·`AdminPlans.php:53-71`)뿐이며, 이들은 등재 엔티티의 **속성/근거 원천**이지 중앙 통합 원장 자체가 아니다. 통합 상태 머신·의존성 그래프·인벤토리 SoT는 순신규. 선행(Part 3-8~3-24 foundation) 부재로 **BLOCKED_PREREQUISITE**. 본 DSAR은 설계 명세이며 코드 변경 0 · **NOT_CERTIFIED**.
