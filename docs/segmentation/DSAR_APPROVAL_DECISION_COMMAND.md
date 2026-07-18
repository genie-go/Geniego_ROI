# DSAR — Approval Decision Command (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

**§14 COMMAND** — 필수 필드:
`command_id` · `tenant_id` · `instance_id` · slot id · command type · requested action type · actor subject id · actor session/authentication context reference · channel type · source application/device/network reference · work item id · assignment id · claim id · lease id · sequential step instance id · expected decision state · expected decision/assignment/sequential version · reason/comment/attachment/signature/MFA reference · client submitted_at · server received_at · idempotency key · request hash · correlation/causation id · command status · evidence.

**COMMAND_TYPE** enum: `SUBMIT_DECISION` / `VALIDATE_DECISION` / `COMMIT_DECISION` / `CANCEL_COMMAND` / `RETRY_COMMAND` / `RECOVER_COMMAND` / `SIMULATE_DECISION` / `CUSTOM`.

## 2. 기존 구현 대조

승인 결정 4핸들러는 요청 **body 의 `{decision}`(requested action type)** 만 받아 즉시 in-place UPDATE 를 수행한다. **Command 라는 영속 엔티티(command row)는 존재하지 않는다** — 명령이 곧 UPDATE 이며, 명령이 별도로 기록·검증·재실행되지 않는다.

| 계약 필드 | 현행 실존 | 근거(허용목록) |
|---|---|---|
| requested action type | 부분 존재 — enum 화이트리스트 | `AdminGrowth::approvalDecide` enum `:1321` · `Alerting::decideAction` 단일 UPDATE `:594` |
| actor subject id | 부분 존재(서버도출) | `Mapping::actorId :36-53`(fail-closed null) · `AdminGrowth` actor session `:197` |
| server received_at | 부분 존재(audit 시각) | `Mapping` audit `Mapping.php` / `AdminGrowth::approvalDecide` audit `:1342` · `Alerting` audit `:597` |
| `command_id` | **부재** | no hits |
| idempotency key · request hash | **부재** | no hits (Paddle `notification_id` 멱등 `Paddle.php:343-368` 은 웹훅 전용·결정 무관) |
| expected decision state/version | **부재** | no hits |
| command type(SUBMIT/VALIDATE/COMMIT…) | **부재** — 단일 UPDATE 로 붕괴 | `Mapping::approve :288` 단일 UPDATE · `Catalog::approveQueue :2397` bulk UPDATE |
| correlation/causation id · slot id · claim/lease id | **부재** | no hits |

즉, 계약이 요구하는 **Command = 검증·커밋과 분리된 1급 레코드**가 없다. `{decision}` body 는 Command 가 아니라 UPDATE 파라미터로 소비되고 사라진다(영속화 없음).

## 3. 판정

- **Verdict: PARTIAL** — requested action type(enum)·actor subject id·server timestamp 만 부분 존재. Command 엔티티·명령 타입 분리·멱등키·request hash·expected version·상관 id 는 전부 **ABSENT**. `status=decision` in-place UPDATE 는 Command Record 가 아니다.
- **선행 의존**: §3.1 Approval(chain/workflow ABSENT)·§3.5 Sequential(하드코딩 status flip)·§12 INSTANCE(ABSENT) — Command 는 Instance/Slot 에 종속하나 그 상위가 없다.
- **cover: 0** (1급 Command 레코드 기준). 부분 재료(actor·action enum·audit ts)만 인접.

## 4. 확장/구현 방향 (설계)

- Command 를 **UPDATE 파라미터에서 영속 레코드로 승격** — `{decision}` body 를 받는 즉시 command row(command_id·idempotency key·request hash·server received_at·expected version) 를 기록하고, 검증·커밋은 그 레코드를 소비하도록 분리(§48 트랜잭션 경계 선행).
- 멱등키/Request Hash 는 **Paddle 웹훅 UNIQUE(notification_id) 멱등**(`Paddle.php:343-368`, VALIDATED_LEGACY)을 일반화해 재사용 — 신규 멱등 엔진 신설 금지.
- actor subject id 는 **`Mapping::actorId`(`:36-53`, CANONICAL·서버도출·fail-closed)** 를 정본으로 통일. `Alerting::actor()`(`:33-35`) 의 헤더 위조 경로는 Command actor 로 채택 금지(BLOCKED_SECURITY).
- 실위험: `Mapping::approve` 는 read→append→단일 UPDATE 가 **트랜잭션 없이**(TOCTOU) 일어난다 — Command→Commit 분리 시 optimistic version(§44)·slot lock(§41)로 봉합.
- 실 구현 = 별도 승인 세션. 본 문서 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
