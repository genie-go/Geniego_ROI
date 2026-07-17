# DSAR — Evidence Contract (§69)

> EPIC 06-A Part 3-3-3-3-3-3-3-3-4-5-3-1-5-3-2 · 289차(2026-07-17) · **비파괴 설계 명세 — 코드변경 0**
> 전사 근거: [SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md](SPEC_06A_4_5_3_1_5_3_2_VERBATIM.md) §69 · ADR: [ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md](../architecture/ADR_DSAR_REBATE_APPROVAL_WORKFLOW_EXECUTION_ENGINE.md)

**엔티티: `APPROVAL_WORKFLOW_EVIDENCE`**

## 0. 현행 실측 (file:line)

| 항목 | 실측 | 판정 |
|---|---|---|
| `APPROVAL_WORKFLOW_EVIDENCE` | **grep 0** | `NOT_APPLICABLE` — 신설 |
| Evidence 테이블/개념 | 승인 도메인 Evidence 저장 **부재** | `NOT_APPLICABLE` |
| ★노드 감사 REAL | `journey_node_logs`(JourneyBuilder.php:**48**, :**69**) — **`tenant_id` 보유**(:69) · `enrollment_id`·`journey_id`·`node_id`·`node_type`·`action`·`result`·`executed_at` · 인덱스 `idx_journey_logs_eid`(:71) | `LEGACY_ADAPTER` — **마케팅 여정 도메인**(형태 유사) |
| 🔴 범용 감사 | `audit_log`(Db.php:**540-545**) = `id`·`actor`·`action`·`details_json`·`created_at` — **tenant 없음 · 해시체인 없음** (AdminGrowth.php:157-159 SQLite 판도 동일 컬럼) | 🔴 `LEGACY_ADAPTER`(부적격 — 아래 규칙) |
| `result hash` 선례 | 승인 도메인 결과 해시 **grep 0** · 인접 = API 키 SHA-256 해시 조회(index.php 인증 미들웨어) | `NOT_APPLICABLE` |
| `lineage` | Data Lineage 정본 = `docs/DATA_TRUST_QUALITY_CONSTITUTION.md` 부록(Lineage) · **승인 워크플로 lineage 배선 0** | `NOT_APPLICABLE` |
| 시크릿 저장 방어 | `tools/scan_secrets.sh`(규칙 SSOT) ← `.githooks/pre-commit:50` + `security-scan.yml` `repo-guards`(:57·:82) | `WIRED(pre-commit·로컬)` + `WIRED(CI·탐지)` — 🔴 **required check 미설정 → 예방 아님**(G-06b) |
| PII 정책 | **No PII storage** = 레포 설계 원칙(집계 전용 · v418.1 decisioning) | `VALIDATED_LEGACY` — 보존 강제 |

### ★축 주의 — `journey_node_logs` 를 §69 커버로 계산하지 마라

`journey_node_logs`(JourneyBuilder.php:48,:69)는 **노드 감사 REAL** 이며 **`tenant_id` 를 실제로 보유**한다(:69) — `audit_log` 보다 성숙하다. 그러나 **마케팅 여정 도메인**이고(`enrollment_id`/`journey_id` 가 축), 스키마가 `node_id`·`node_type`·`action`·`result`·`executed_at` **7필드**에 그친다. §69 가 요구하는 **38필드**(workflow definition/version/instance/token/edge/transition/task/assignment/claim/attempt/result, approval request/case/item/requirement/decision, tenant/workspace/legal entity/environment, actor, authorization decision, resource version, policy version, event/timer/retry/failure/migration/replay reference, effective at/recorded at, result hash, lineage, audit reference) 중 **대응하는 것은 tenant·node·action·result·recorded at 정도**다. 이를 커버로 계산하면 **역산**이다 → `LEGACY_ADAPTER`(스키마 선례로만 인용).

### ★두 번째 축 주의 — `audit_log` 는 Evidence 기반이 될 수 없다

`audit_log`(Db.php:540-545)는 `actor`·`action`·`details_json`·`created_at` **4컬럼**이며 **tenant_id 도 해시체인도 없다**. 즉:
- **테넌트 격리 불가** → §69 의 `tenant` 필수 필드를 `details_json` 안에 문자열로 묻는 것은 **격리가 아니라 위장**이다(테넌트 헌법 위배).
- **훼손 탐지 불가** → §64 #26(Workflow Definition 직접 수정으로 실행 이력 훼손)이 **설계상 미방어**로 확정된다.
- → 🔴 **승인 Evidence 를 `audit_log` 에 얹지 마라.** Evidence 는 **별도 테이블 신설**이 정답이며, 이는 "중복 신설"이 아니라 **`audit_log` 가 요구를 충족하지 못한다는 실측 근거**에 따른 것이다.

## 1. 원문 전사 + 판정 — **원문 필수 필드 38종**

| # | 원문 필드명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | evidence_id | Evidence 엔티티 부재 | `NOT_APPLICABLE` |
| 2 | workflow definition | Definition 테이블 grep 0 | `NOT_APPLICABLE` |
| 3 | workflow version | Version 개념 부재 · `version` grep 0 | `NOT_APPLICABLE` |
| 4 | workflow instance | Instance 개념 부재 · 인접 = `journey_enrollments`(**마케팅 여정**) | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 5 | workflow execution | Execution 개념 부재 | `NOT_APPLICABLE` |
| 6 | workflow token | Token(BPMN 토큰) 개념 grep 0 | `NOT_APPLICABLE` |
| 7 | workflow node | 인접 = `journey_node_logs.node_id`(JourneyBuilder.php:69) — 마케팅 여정 | `NOT_APPLICABLE` · `LEGACY_ADAPTER`(스키마 선례) |
| 8 | workflow edge | Edge 개념 부재 | `NOT_APPLICABLE` |
| 9 | workflow transition | Transition 개념 부재 · **전이 규칙 선언 0** | `NOT_APPLICABLE` |
| 10 | workflow task | Task 개념 부재 | `NOT_APPLICABLE` |
| 11 | task assignment | Assignment 개념 부재 | `NOT_APPLICABLE` |
| 12 | task claim | Claim 부재(승인) · 인접 = `Omnichannel::claimBatch` claim_id(:394-423 · **잡 큐**) | `NOT_APPLICABLE` · `KEEP_SEPARATE_WITH_REASON` |
| 13 | task attempt | attempt 개념 부재(승인) · 인접 = `attempts` 컬럼(Omnichannel:365 · AdAdapters:1187-1228) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 14 | task result | 인접 = `journey_node_logs.result`(:69 · JSON) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 15 | approval request | 인접 4종: `mapping_change_request`(**REAL**) · `action_request`(**VACUOUS** — `INSERT INTO action_request` grep 0) · `admin_growth_approval`(**tenant 없음**) · `catalog_writeback_approval`(**고아** — 읽는 코드 0) | `LEGACY_ADAPTER` — **흡수 대상**(4번째 Foundation 신설 금지·AL-19) |
| 16 | approval case | Case 개념 부재 | `NOT_APPLICABLE` |
| 17 | approval item | Item 개념 부재 | `NOT_APPLICABLE` |
| 18 | approval requirement | 🔴 Requirement 부재 · `action_request` 정족수 **컬럼 없음** · `Alerting:562` 리터럴 `2` = 장식 | `NOT_APPLICABLE` |
| 19 | approval decision | 인접 REAL: `Mapping::approve`(:238-294) · `AdminGrowth::approvalDecide`(`decision` ∈ {approved,rejected} :1320-1322 · `decided_by`/`decided_at` 기록 :1330-1331) | `LEGACY_ADAPTER` |
| 20 | tenant | 🔴 `audit_log` **tenant 없음**(Db.php:540-545) · `admin_growth_approval` **tenant_id 없음** · `paddle_events` **tenant_id 없음**(:99) · ★`journey_node_logs` 는 **보유**(:69) | `NOT_APPLICABLE`(승인 감사) · 🔴 **인접 갭 실재** |
| 21 | workspace | Workspace 개념 grep 0 | `NOT_APPLICABLE` |
| 22 | legal entity | Legal Entity 개념 grep 0 | `NOT_APPLICABLE` |
| 23 | environment | 인접 = `Db::envLabel()`(운영/데모 구분 · **승인 도메인 아님**) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 24 | actor or worker | ★인접 REAL: `Mapping::actorId`(Mapping.php:36 — **위조불가** `apikey:{id}`/`user:{email}` · 미확인 null→403) · `audit_log.actor`(Db.php:542) · `AdminGrowth::actor`(:1330 `decided_by`) | `VALIDATED_LEGACY` — **`actorId` 공용 추출 대상** · 🟠 **`actor_type` 부재**(아래 규칙) |
| 25 | authorization decision reference | 인가 결정 **참조 저장** 부재(인가 자체는 index.php RBAC 미들웨어 존재하나 **결정 기록 없음**) | `NOT_APPLICABLE` |
| 26 | resource version | Resource Version 개념 부재 | `NOT_APPLICABLE` |
| 27 | policy version | Policy Version 개념 부재 | `NOT_APPLICABLE` |
| 28 | event reference | 🔴 **범용 이벤트 버스 grep 0** · 인접 = `raw_vendor_event`(Db.php:1017-1034 · `uq_rve_dedup` UNIQUE) · `paddle_events`(**tenant 없음** :99) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 29 | timer reference | 타이머 서비스·지연큐 부재 · 인접 = `journey_enrollments.resume_at`/`wait_until`(:80-82 · **206차 delay + 255차 이벤트 절대기한 분리 설계**) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 30 | retry reference | 인접 = `ad_delivery_dlq`(AdAdapters.php:1127 · **레포 유일 DLQ 테이블**) · `retryDeliveryDlq`(:1187-1228) | `NOT_APPLICABLE` · `LEGACY_ADAPTER` |
| 31 | failure reference | 실패 참조 엔티티 부재 — 현행은 원 테이블 `status='failed'` 잔류(DLQ 는 `ad_delivery_dlq` 1개뿐) | `NOT_APPLICABLE` |
| 32 | migration reference | Migration 개념 부재 | `NOT_APPLICABLE` |
| 33 | replay reference | Replay 개념 부재 | `NOT_APPLICABLE` |
| 34 | effective at | **effective/recorded 이원 시각 부재** — 현행은 단일 시각만(`audit_log.created_at` Db.php:544 · `journey_node_logs.executed_at` :69 · `admin_growth_approval.decided_at` :1331) | `NOT_APPLICABLE` |
| 35 | recorded at | 인접 = `audit_log.created_at`(Db.php:544) · `journey_node_logs.executed_at`(:69) — **단일 시각을 recorded 로 볼 수 있으나 #34 와 미분화** | `LEGACY_ADAPTER` |
| 36 | result hash | 결과 해시 **grep 0** · **해시체인 없음**(`audit_log` Db.php:540-545) | `NOT_APPLICABLE` |
| 37 | lineage | 승인 워크플로 lineage 배선 **0**(정본 개념은 `docs/DATA_TRUST_QUALITY_CONSTITUTION.md` 부록 Lineage) | `NOT_APPLICABLE` |
| 38 | **audit reference** | 🔴 참조 대상 `audit_log`(Db.php:540-545)가 **tenant·해시체인 부재** → 참조해도 **훼손 탐지 불가** · `journey_node_logs`(:48,:69)는 REAL 이나 **마케팅 여정 도메인** | `NOT_APPLICABLE` · 🔴 §70 과 짝(아래 규칙) |

**실측 개수: 38 / 38 전사.** 커버리지 = `NOT_APPLICABLE` 34 · `LEGACY_ADAPTER` 3(#15·#35 + 인접 인용 다수) · `VALIDATED_LEGACY` 1(#24 actor).

### ★목록 끝 필드 누락 자기검증 (5-3-1 교훈)

🔴 **5-3-1 에서 필드 축 19건이 정확히 1씩 부족했고 원인은 전부 동일하게 "목록 끝 `evidence` 누락"**이었다(스펙 전 엔티티가 `evidence` 로 끝나는데 "부록"으로 무의식 처리). **일관된 편향은 무작위 오차보다 위험하다.**

이 문서의 자기검증 결과를 **실측 그대로** 적는다:
- §69 의 필드 목록은 **`evidence_id` 로 시작해 `audit reference` 로 끝난다**(원문 2723~2760줄).
- §69 는 **`APPROVAL_WORKFLOW_EVIDENCE` 엔티티 자신의 정의**이므로 **말미에 `evidence` 필드가 없다** — 이는 누락이 아니라 **원문 그대로**다. 대신 **마지막 필드 `audit reference`(#38)** 가 5-3-1 에서 상습적으로 빠지던 자리에 해당한다.
- **#38 `audit reference` 를 표에 명시적으로 전사했음을 여기서 재확인한다.** 38/38.

## 2. 규칙

### 저장 금지 — **원문 9종 전사**

| # | 원문 항목명 | 현행 대조 (file:line) | 판정 |
|---|---|---|---|
| 1 | Password | 인접 방어: `tools/scan_secrets.sh`(규칙 SSOT) ← pre-commit:50 + `repo-guards`:82 · `.env`/`*.pem`/`*.key` = `.clineignore` | `WIRED(탐지)` — **예방 아님** |
| 2 | Access Token | 동상 · 프론트 토큰은 `genie_token`/`demo_genie_token`(localStorage) | `WIRED(탐지)` |
| 3 | Credential Secret | 동상 · 자격증명 정본 = 레포 `.env`(GENIE_DB_PASS 등) | `WIRED(탐지)` |
| 4 | Bank Account 원문 | 승인 Evidence 부재 → 저장 지점 없음 | `NOT_APPLICABLE` |
| 5 | 불필요한 PII | ★**No PII storage = 레포 설계 원칙**(집계 전용 · v418.1 decisioning 은 **집계 코호트**이지 구매자 레코드 아님) | `VALIDATED_LEGACY` — **보존 강제** |
| 6 | 외부 Callback Secret | 인접: Paddle HMAC 시크릿(Paddle.php:1073) · `webhook_endpoint` 시크릿(OpenPlatform.php:81-105) — **Evidence 에 유입 금지** | `NOT_APPLICABLE`(Evidence) |
| 7 | 민감 Payload 전체 | 🔴 **`audit_log.details_json`(Db.php:543)은 `MEDIUMTEXT` 자유 JSON = 전체 페이로드 투기의 자연 유인** | 🔴 **고위험 — 아래 규칙** |
| 8 | Script 실행 코드 원문 | **Script Task 미도입** → 저장 지점 없음(§64 #25·§65 #19 와 짝) | `NOT_APPLICABLE` — **미도입 유지가 방어** |
| 9 | 보안 정책 내부 전체 | 정책 내부 노출 지점 부재 | `NOT_APPLICABLE` |

**실측 개수: 9 / 9 전사.**

### 설계 규칙

- 🔴 **승인 Evidence 를 `audit_log`(Db.php:540-545)에 얹지 마라.** `actor`·`action`·`details_json`·`created_at` 4컬럼 · **tenant 없음 · 해시체인 없음**. §69 의 `tenant`(#20)를 `details_json` 문자열에 묻는 것은 **격리가 아니라 위장**이며 **테넌트 격리 절대 원칙 위배**다. → **Evidence 전용 테이블 신설**(중복 신설이 아니라 **`audit_log` 부적격 실측 근거에 따른 것**).
- 🔴 **#7(민감 Payload 전체) = 이 문서 최대 실행 리스크.** `details_json MEDIUMTEXT`(Db.php:543) 같은 자유 JSON 컬럼은 **"일단 다 넣자"의 자연 유인**이다. Evidence 신설 시 **필드를 명시적 컬럼으로 선언**하고 자유 JSON 은 **화이트리스트 키만** 허용하라. §64 #24(Secret 이 Workflow Variable 또는 Audit 에 저장)가 여기서 직결된다.
- **#24(actor) = 신설 금지 · 공용 추출.** `Mapping::actorId`(Mapping.php:36)의 **위조불가 신원 + 미확인 null→403 fail-closed** 를 그대로 쓴다. 🔴 **재작성 시 289차 G-01 이 닫은 우회로(익명 2회=정족수)를 다시 연다. 신규 작성이 아니라 위치 이동.**
  - 🟠 **`actor_type` 부재 = 선결 과제**: `apikey:{id}`/`user:{email}` 이 정족수에 **동등 계수** → **API 키 2개로 Maker-Checker 충족 가능**(스펙 §20 위배). Evidence 의 `actor or worker` 는 **`actor_type` 을 분리 컬럼으로** 가져야 한다("or worker" 가 원문에 있는 이유이기도 하다).
- **#15(approval request) = 흡수이지 5번째 신설이 아니다.** 승인 지형 = **"중복 4벌"이 아니라 "1 REAL + 3 미달"**:
  - `mapping_change_request` = **REAL**(정족수·위조불가 신원·자기승인 차단·dedup·상태 게이트 전부 · Mapping.php:238-294)
  - `action_request` = **VACUOUS**(생산자 전무) → **첫 생산자로 배선하거나 폐기 후 디스패치만 회수. 현 상태 방치 = 가짜 정족수 잔존.**
  - `admin_growth_approval` = tenant 없음 · 전역 조회(:1324)
  - `catalog_writeback_approval` = **고아**(읽는 코드 0)
  - → **`Mapping::approve`+`actorId` 공용 추출 후 흡수. 4번째 Foundation 신설 금지(AL-19). 🔴 `EquivalenceProof` 선행 없이 통합 금지**(286차 rank 맵 붕괴 재현).
- **#34/#35(effective at / recorded at) = 이원 시각 신설.** 현행은 **단일 시각만**(`created_at`/`executed_at`/`decided_at`) 이라 **소급 정정과 기록 시점을 구분할 수 없다**. 두 필드를 **하나로 합치지 마라** — 원문이 분리한 것은 의도다.
- **#36(result hash) + #38(audit reference) = §70 과 함께 결정하라.** `audit_log` 에 **해시체인이 없다**는 실측 때문에 #36/#38 은 **Evidence 단독으로 충족 불가**다. §70(Audit Event)에서 감사 저장소를 결정하기 전에는 #36/#38 을 **`CONTRACT_ONLY` 이상으로 올리지 마라**.
- **#29(timer reference)**: `journey_enrollments.resume_at`/`wait_until`(:80-82)의 **분리 설계**(206차 delay + 255차 이벤트 절대기한)를 **뭉개지 마라** — 두 컬럼이 분리된 것은 의도다. ⚠️ 인접 트랩: `SmsMarketing.php:367 runScheduledQueue` 는 **ISO8601 문자열 사전식 비교**로 시각을 판정한다(타임존 혼입 시 오동작).
- **#30/#31(retry / failure reference)**: **DLQ 테이블은 `ad_delivery_dlq` 1개뿐**(AdAdapters.php:1127) — 나머지는 원 테이블 `status='failed'` 잔류. Evidence 가 `failure reference` 를 요구한다고 **DLQ 를 남발 신설하지 마라**; 재시도 공식은 **AdAdapters:1221**(`600*2^n` · 86400s 캡) 채택.
  - ★**defer≠실패 규율 보존**(Omnichannel:349,362 attempts 미증가) · ★**honest pending 보존**(ChannelSync:6173 · Catalog:1712).
- **#5(불필요한 PII) = No PII storage 원칙 보존 강제.** Evidence 가 승인 맥락을 담는다는 이유로 구매자 레코드를 끌어들이면 **레포 최상위 설계 원칙 위배**다. 🔴 **JourneyBuilder 재사용 시 특히 위험**: `advanceEnrollment` 는 `crm_customers`/`journey_enrollments` 가 실행 컨텍스트이며 **`customer_id` 필수**(:554)다 → **enrollment 컨텍스트 일반화가 선결**(설계 결론 1). 일반화 없이 승인을 태우면 **비-고객 승인(예산·가격·배포)에 고객 PII 가 강제 결합**된다.
- **#1~#3(Password/Access Token/Credential Secret)**: 레포 스캔은 `WIRED(탐지)` 이지 **`ENFORCED(예방)` 이 아니다**(브랜치 보호 + required check 미설정 · G-06b 사용자 결정 대기). **런타임 Evidence 쓰기 경로에 자체 마스킹이 필요**하다 — 스캔은 커밋된 소스만 본다.
- 🔴 **38필드 + 금지 9종 "있다고 가정"하고 배선 금지.** 부재는 부재로 기록했다.
- **§63 규율 준수**: 필드 매핑은 **하드코딩 단일 Enum 변환이 아니라 Versioned Mapping Registry 또는 명시적 Contract** 로 관리한다.
