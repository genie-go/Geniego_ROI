# DSAR — Approval Service Identity Type (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Identity Type)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: 서비스 계정도 사람 이상으로 통제 · 외부 벤더 자격증명 ≠ 내부 identity · UNKNOWN은 Permit하지 않음(fail-closed) · Golden Rule · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT)

## 1. 목적

Service Identity Type은 비인간 주체(Non-Human Identity)가 시스템에 등록될 때 취하는 "종류"를 분류하는 열거형이다(스펙 §3·Canonical Entity `APPROVAL_SERVICE_IDENTITY`/`APPROVAL_SYSTEM_IDENTITY`/`APPROVAL_MACHINE_IDENTITY`/`APPROVAL_API_CLIENT`/`APPROVAL_INTEGRATION_IDENTITY`/`APPROVAL_AI_AGENT`, §2). "이 비인간 주체는 API Client인가, Batch Worker인가, AI Agent인가"를 선언하는 최상위 분류이며, Service Identity Registry(§1 구현목표) 각 row가 어떤 Type을 갖는지 결정한다.

## 2. Canonical 필드

스펙 §2(Canonical Entity)·§3(Identity Type 목록) 근거 설계 필드(코드 0·미확정):

- `identity_type_id`(PK) · `type_code`(§3 14유형 중 1) · `identity_ref`(→ Service Identity Registry row) · `capability_tags[]`(해당 Type이 통상 요구하는 Credential/Runtime Scope 힌트) · `owning_system`(발급/관리 주체 표기) · `tenant_id` · `version_ref`(Immutable, §35)

## 3. 열거형 / 타입

- `type_code`(스펙 §3, 14유형): Service Account · API Client · Integration User · Batch User · Scheduler · Worker · Queue Consumer · Queue Producer · ETL · AI Agent · Bot · Kubernetes SA · Serverless Function · Pipeline Identity.

## 4. 실 substrate 매핑 (ABSENT/PARTIAL·ground-truth만 인용)

- **Service Identity Type 열거형 자체 = ABSENT**: `service_account_id`/`machine_role`/`robot_account`/`system_actor`/`non_human` grep 0(전수조사 §2). 14유형 중 코드베이스에 명시적 타입 컬럼/열거형으로 존재하는 것은 전무.
- **`API Client` 유형만 근접 substrate 실재(PARTIAL)**: `api_key`(`Db.php:942-958`)가 role(기본값 `viewer`)+scope+expires_at+is_active를 갖춘 유일 실 비인간 identity(전수조사 §1). 단 이는 "identity row"이지 `identity_type_id`로 별도 타입 태깅되는 구조가 아니며, `role='connector'`(`Keys.php:95,193,208`)가 `Integration User` 유형에 가장 근접하나 이는 api_key 메타 role 값일 뿐 독립 Type 엔티티가 아니다(전수조사 §7).
- **`Batch User`/`Scheduler`/`Worker`/`Queue Consumer`/`Queue Producer`/`ETL` 유형 = ABSENT·시스템 공유 자격증명으로만 실행**: bin 35 cron 전수가 `Db::pdo()` 직접 사용(예 `writeback_cron.php:37`)·`Db::pdo()`는 단일 공유 root 자격증명(`Db.php:122-123`)이며 identity/type 태깅 없음(전수조사 §8). `omni_outbox` claim_id(`Omnichannel.php:95-97,390-446,392`)는 동시성 락 토큰일 뿐 identity type이 아니다.
- **`AI Agent` 유형 = ABSENT**: `agent_mode`(`UserAuth.php:196,1025,1741-1749`)는 app_user(인간) 소유 자동화 자율성 설정이며 별도 AI Agent identity/type이 아니다(전수조사 §6). `AiGenerate.php:29-51`도 인간 session/api_key를 재사용할 뿐 agent 고유 type 식별자가 없다.
- **`Kubernetes SA`/`Serverless Function`/`Pipeline Identity` = ABSENT**: 전수조사 전역에서 grep 0으로 확인(K8s ServiceAccount·서버리스 함수 identity·CI/CD pipeline identity 관련 코드 부재).
- **외부 벤더 자격증명은 어떤 Type으로도 오등록 금지**: Google GCP 서비스계정 JWT(`Connectors.php:3781-3815`)·Snowflake 키페어(`DataExport.php:550-584`)는 아웃바운드(우리→벤더) 자격증명이며 내부 Service Identity Type 어느 값으로도 흡수 금지(ADR D-3).

## 5. 설계 원칙

- **api_key = API Client Type의 substrate·발명 아님(Golden Rule)**: 신규 Identity Type 열거형을 신설하되, `API Client` 타입은 기존 `api_key` 테이블을 확장 대상으로 삼는다(ADR D-1 `API_CLIENT_IDENTITY_SUBSTRATE`). 병렬 신규 API Client 테이블 신설 금지.
- **cron/batch/AI Agent를 Type으로 등록하려면 선행 identity row가 먼저 필요**: 현재 이들은 identity 자체가 없으므로(§4) Type 태깅보다 Service Identity Registry 신설이 선행되어야 한다(스펙 순서상 §1 항목 1~7이 §1 항목 8 Service Role보다 선행).
- **외부 벤더 JWT는 Type이 아니라 Integration Adapter로 분리**: Google/Snowflake 자격증명은 Service Identity Type 값이 아니라 별도 Integration Adapter 참조로 취급한다(ADR §3 Adapter·D-3).

## 6. Gap / BLOCKED_PREREQUISITE

- Service Identity Registry(§1 목표 1~4) 자체가 순신규이므로, Identity Type은 그 Registry의 하위 속성으로만 의미를 가진다 — Registry 부재 시 Type 단독 신설은 무의미(설계 순서 종속).
- **BLOCKED_PREREQUISITE(RP-002)**: 14유형 중 8종(Batch/Scheduler/Worker/Queue Consumer/Queue Producer/ETL/K8s SA/Serverless/Pipeline)은 대응 실행 인프라(cron/워커/큐)가 시스템 공유 자격증명으로만 동작(§4)하여, Type 부여 이전에 개별 identity 발급 체계 자체가 선행 필요.
- AI Agent Type은 `agent_mode`(인간 설정)와의 경계를 명문화하는 설계가 선행되어야 하며(ADR §3 "AI Agent Identity(agent_mode≠identity) 신설"), 이번 차수는 그 경계 정의만 제공하고 실 Type 스키마는 미확정.
