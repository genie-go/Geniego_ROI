# GeniegoROI Claude Code Implementation Specification

# CCIS Part019 — Scheduler, Batch Processing & Workflow Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Scheduler·Batch·Workflow 표준을 수립한다.

> ★**성격(Part001~018 과 동일)**: 사용자가 Part019 명세(Laravel/Symfony Scheduler·k8s CronJob·
> Redis Lock 분산 스케줄러·Chunk/Checkpoint·Symfony Workflow·Graceful Shutdown)를 제공했으나 **그대로
> 따르지 않았다.** 실측 결과 **프레임워크 스케줄러(Laravel/Symfony/k8s CronJob)는 부재**하나, **시스템
> crontab + cron 워커 33개(`bin/*_cron.php`)** 가 정본이며, **status 기반 idempotency·checkpoint
> (synced_at/last_id)·상태 생명주기·Workflow(`JourneyBuilder`+`RuleEngine`)** 가 실재한다. Part001 §4 에
> 따라 **실측 → 프레임워크 스케줄러 부재 증명 → 실 cron 배치/워크플로 성문화**했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 Scheduler/Batch/Workflow 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Scheduler | Laravel/Symfony Scheduler·k8s CronJob | **부재**(0). ★**시스템 crontab + cron 워커 33개**(`bin/*_cron.php`) |
| 워커 목록 | — | email_queue·sms_queue·kakao_queue·omni_dispatch·webhook_dispatch·shipment_confirm·journey·rule_engine·writeback·pg_settlement·analytics_sync·oauth_refresh·**ad_dlq**·media_gc·stock_sync·repricer·review_collect 등 33 |
| 중복실행 방지 | Redis Lock 분산 | **주로 status 기반 idempotency**(COALESCE+상태전이·Part018)·명시적 락 3(최소·`GET_LOCK`/flock) |
| Chunk/Checkpoint | Chunk Size·last ID/Offset | **checkpoint via `synced_at`/`last_id`(200·증분)**. Chunk=핸들러 LIMIT(예약큐 `scheduled_at` 도래분) |
| Batch 상태 | Pending/Running/Completed/Failed | ★**전 생명주기 실재**(pending 231·running 24·completed 23·done 58·failed 138·cancelled 17) |
| Retry/DLQ | 백오프·DLQ | ★**retry/backoff 177·DLQ `ad_dlq_cron`**(Part018) |
| Workflow Engine | Symfony Workflow/State Machine | ★**`JourneyBuilder`(비주얼 여정 캔버스·state/transition/node_type) + `RuleEngine`**(규칙 자동화) |
| Long Running | 진행상태 저장 | **cron 단명 실행 + 상태/synced_at 저장**(데몬 아님) |
| Notification | 완료 통지 | **`Alerting`·`NotifyEngine`**(알림). Slack/Teams 부분 |
| Graceful Shutdown | SIGTERM | **부재**(0) — 단명 cron 이라 각 실행 완료 후 종료 |
| Monitoring | Prometheus | **부분** — DLQ 워커·상태 컬럼·`SystemMetrics` |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Idempotent/Restartable/Observable/Distributed Safe) | **부분 준수** | ★Idempotent(COALESCE+상태)·Restartable(synced_at checkpoint)·상태 관측. Distributed Safe 는 락 최소(idempotency 의존) |
| §4~§5 Scheduler Architecture/종류 | **상이(대응물)** | 프레임워크 스케줄러 없음. **crontab + cron 워커**. Scheduler 내부 무거운 작업=핸들러 위임 |
| §6~§7 Cron Naming/표현식 | **부분 준수** | 워커명=도메인(`sms_queue`·`omni_dispatch`). crontab 표현식=서버(★UTC/KST=서버 TZ 실측 필요) |
| §8~§9 Batch Architecture/Chunk | **부분** | Chunk=핸들러 LIMIT·예약분(`scheduled_at`). Batch Start/Complete 상태 |
| §10~§11 Checkpoint/Restart | **★부분 준수** | `synced_at`/`last_id` checkpoint·재실행 시 증분(중복=COALESCE 방지) |
| §12~§13 Distributed Scheduler/Lock | **미흡(관찰)** | 명시적 락 3(최소). ★대부분 **status idempotency 로 overlap 안전**하나, 비idempotent 워커는 §6 권고 |
| §14 Retry(Validation 재시도 금지) | **★준수** | retry 177·외부연동만 |
| §15 Batch Queue Integration | **대응물** | DB 작업큐+cron(Part018). 병렬=워커별 도메인 분리 |
| §16~§17 Workflow/Engine | **★실재(대응물)** | `JourneyBuilder`(state machine·여정)·`RuleEngine`. Symfony Workflow 아님 |
| §18 Long Running Process | **상이** | cron 단명 실행+상태 저장. 데몬 아님 |
| §19 Notification | **부분 준수** | Alerting·NotifyEngine. Slack/Teams 부분 |
| §20 Error Handling(부분 실패) | **준수** | 행 단위 status(failed)·부분 실패 허용·재처리 |
| §21 Logging | **부분** | 상태 컬럼·error_log(Part013). traceId/구조화 부분 |
| §22 Monitoring | **부분** | DLQ·상태·SystemMetrics. Prometheus 아님 |
| §23~§24 Timeout/Resource | **부분** | php max_execution·cron 단명. Worker 재시작=cron 특성상 매 실행 새 프로세스 |
| §25 Batch 상태 | **★준수** | pending/running/completed/failed/cancelled 전이 |
| §26 Recovery | **부분 준수** | checkpoint 재개·retry·DLQ |
| §27 Batch Naming | **준수** | 도메인 목적 명확 |
| §28 Scheduler Security | **부분** | cron=www 실행. ★DB app=root(Part009 §6 권고) |
| §29 성능(Chunk/Bulk/N+1) | **부분 준수** | ★N+1 방지(285차)·bulk. Chunk 부분 |
| §30 PHP(Scheduler/Redis Lock/Graceful) | **미적용** | 프레임워크/Redis 없음. SIGTERM 부재(단명 cron) |
| §31 Claude(중복실행/Checkpoint 없는 Batch 금지) | **부분 준수** | idempotency+checkpoint. 락은 최소 |
| §32~§33 검증(schedule:list/queue:work) | **대상 없음** | artisan/Redis 없음. cron 직접·DB 상태 조회 |

---

## 4. 확립된 표준 (신규 스케줄러/배치가 따를 정본)

- **Scheduler = 시스템 crontab + cron 워커**(`bin/{도메인}_cron.php`). 무거운 작업은 워커가 핸들러 위임. 프레임워크 스케줄러/k8s CronJob 신설 금지.
- **Idempotency(★락 대체 정본)**: cron 은 **재실행 안전**하게 — `COALESCE`·상태전이(`'queued'→'processing'→'done'/'failed'`)·유니크로 중복 처리 방지(Part018). 명시적 락은 비idempotent 임계부에만(`GET_LOCK` 등).
- **Checkpoint/증분**: `synced_at`/`last_id` 저장 → 재실행 시 그 지점부터. 전체 재처리 금지.
- **Batch 상태**: pending→running→completed/failed/cancelled 명시 전이. 부분 실패 허용(행 단위 `failed`)·재처리.
- **Retry/DLQ**: 외부연동만·백오프. 초과=DLQ(`ad_dlq` 패턴).
- **Workflow**: 상태 기반 여정=`JourneyBuilder`(node_type·transition) 확장. 규칙 자동화=`RuleEngine`. **중복 엔진 신설 금지**(헌법 V4 §16).
- **성능**: ★**루프 내 외부 API N+1 금지**(285차 502)·bulk insert/update·`tenant_id` 격리.

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **Laravel/Symfony Scheduler·k8s CronJob·Redis Lock 분산 스케줄러** — 안 함. crontab+cron 워커·status idempotency 가 정본. 프레임워크/Redis=인프라 추가(Part006/016).
2. **Symfony Workflow 엔진** — 안 함. `JourneyBuilder`+`RuleEngine` 이 정본(중복 엔진 금지).
3. **SIGTERM Graceful Shutdown 데몬** — 안 함. 단명 cron(매 실행 새 프로세스·완료 후 종료)이라 데몬 shutdown 불요.
4. **Chunk/Checkpoint 정교화(대용량 스트리밍)** — 부분. synced_at 증분·LIMIT 로 대응. 필요 시 심화.
5. **명시적 분산 락 전면 도입** — 안 함(§6 관찰). idempotency 로 overlap 안전이 정본. 비idempotent 임계부만 락.

★**준수하는 실 원칙**: Idempotent 재실행·synced_at checkpoint·상태 생명주기·Retry+DLQ·N+1 방지·부분 실패 허용·JourneyBuilder/RuleEngine 재사용.

---

## 6. ★관찰 및 권고 (§12 — cron 중복실행 락)

- 33개 cron 중 **명시적 락(GET_LOCK/flock)은 3개뿐**이고, 나머지는 **status 기반 idempotency**(`'queued'→'processing'`·COALESCE)로 overlap 을 안전화한다. 대부분의 워커는 이로써 **중복 실행이 무해**하다(재처리해도 결과 동일).
- ★**잠재 위험**: **비idempotent 한 워커가 long-run 되어 다음 cron 주기와 겹치면** 이중 처리 가능. 현재 명백한 사례는 미확인(프로파일 없이 단정 금지·287~289차 정합).
- **권고(향후)**: cron 워커별로 idempotency 보장 여부를 감사 → 비idempotent 임계부(정산·발주 등)에 `GET_LOCK`/락 테이블 추가. crontab 주기 vs 평균 실행시간 대조(주기 < 실행시간이면 overlap 상시).

---

## 7. Claude Code 구현 규칙

1. 정기작업=`bin/{도메인}_cron.php` + crontab. 프레임워크 스케줄러/k8s CronJob 신설 금지.
2. ★**cron 은 idempotent**(COALESCE·상태전이·유니크)로 재실행 안전. 비idempotent 임계부만 명시적 락.
3. **checkpoint(synced_at/last_id)**·증분 처리·전체 재처리 금지. Batch 상태 전이 명시.
4. Retry=외부연동만·백오프·초과 DLQ. 부분 실패 허용(행 `failed`).
5. ★**루프 내 외부 API 금지**(N+1·285차)·bulk·`tenant_id` 격리.
6. Workflow=`JourneyBuilder`/`RuleEngine` 확장(중복 엔진 금지). 알림=`Alerting`/`NotifyEngine`.
7. Laravel/Symfony Scheduler·Redis Lock·Symfony Workflow 를 "명세에 있다"는 이유로 이식하지 않는다.

---

## 8. Completion Criteria

- [x] Scheduler/Batch/Workflow **실측**(프레임워크 스케줄러 0·cron 33·checkpoint synced_at 200·상태 생명주기·JourneyBuilder/RuleEngine)
- [x] 명세 §3~§33 **섹션별 매핑·판정**(Laravel/Symfony Scheduler·k8s CronJob·Redis Lock·Symfony Workflow 부재 증명)
- [x] 실 cron 배치(idempotency·checkpoint·상태·DLQ)·Workflow(JourneyBuilder/RuleEngine) 성문화(§4)
- [x] Idempotent·Checkpoint·상태 전이·Retry+DLQ·N+1 방지 준수 명시
- [x] ★§12 cron 중복실행 락 관찰·권고(idempotency 의존·향후 감사)(§6)
- [x] Claude Code 규칙(§7) · `phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 crontab+cron 워커+JourneyBuilder/RuleEngine 스케줄러/워크플로의 성문화이지 Laravel Scheduler/Symfony Workflow 이식이 아니다.

---

## 다음 Part

**CCIS Part020 — File Storage, Object Storage & Document Management** — ★사전 경고: S3/Azure Blob/GCS/MinIO **부재**(Part009·"S3" 문자열=코드명 오탐). 실 스토리지=**로컬 `MediaHost`**(278차·쓰기디렉터리 www-data·`ChannelImage`)·SQLite. Presigned URL/Lifecycle 부분. Part020 도 실측→객체스토리지 부재증명→로컬 MediaHost 성문화(S3 이식 금지).
