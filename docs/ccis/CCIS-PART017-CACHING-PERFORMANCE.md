# GeniegoROI Claude Code Implementation Specification

# CCIS Part017 — Caching, Redis & Performance Optimization Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

캐시·성능 최적화 표준을 수립한다.

> ★**성격(Part001~016 과 동일)**: 사용자가 Part017 명세(Redis Cache/Cluster·Distributed Lock(SETNX)·
> Redis Rate Limiter·Session Cache·Bloom Filter·CDN·JIT)를 제공했으나 **그대로 따르지 않았다.** 실측
> 결과 **Redis 는 부재**(composer predis 0·코드 0)하나, 캐시 계층 자체는 **APCu + 정적 in-memory
> 메모이제이션 + DB rollup 집계테이블 + TTL 컬럼** 형태로 실재한다. 분산락=**DB `FOR UPDATE`**, rate
> limit=**비Redis throttle**. Part001 §4 에 따라 **실측 → Redis 부재 증명 → 실 캐시/성능 스택 성문화**했다.
> ★핵심 원칙 "Measure First"(추측 최적화 금지)는 이 저장소의 정직 미산출 문화와 정합. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 캐시/성능 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Cache 저장소 | Redis(Cluster) | **부재**(predis 0·코드 0) |
| 앱 캐시 | Redis Cache Aside | **APCu(12) + 정적 프로퍼티 메모이제이션(16·per-request)** |
| 집계 캐시(Materialized) | Materialized View/Refresh Ahead | ★**DB rollup 집계테이블(440)** — `performance_metrics`·`channel_orders` 등 사전집계(cron/ingest 갱신) |
| TTL/만료 | Redis TTL | **DB `expires_at`/`_ttl` 컬럼(252)** — OTP/세션/캐시행 만료 |
| Session Cache | Redis | **토큰기반**(localStorage·`user_session` DB·Part011). Redis 세션 아님 |
| Distributed Lock | `SET NX PX`(Redis) | ★**DB `SELECT … FOR UPDATE`(6)** + 트랜잭션(쿠폰 TOCTOU·재고·288차) |
| Rate Limiter | Redis Sliding Window | **비Redis throttle(60)** — OTP throttle·brute-force 가드(Approvals/DataSchema·SecurityGuard) |
| Opcache | 운영 활성 | ★**운영 php-fpm opcache 활성**(배포 시 `reload`=리셋·Part016). JIT 미설정 |
| CDN | 정적 CDN | **부분**(CDN refs 9 — 일부 크리에이티브/미디어). 정적 dist=nginx 직접 |
| Compression | Gzip/Brotli | nginx 레벨(repo config 밖). vite=번들 최적화(chunk) |
| Query 최적화 | Index/Explain/N+1 | ★**복합 인덱스**(`(tenant_id,…)`·Part009)·**N+1 방지**(285차 502=루프 내 외부 API N+1 근본원인) |
| Monitoring | Prometheus/Grafana | `SystemMetrics` 프로브(정직 미산출 null)·`Compliance` SIEM |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Measure First/SSOT/추측 최적화 금지) | **★준수(문화 정합)** | 정직 미산출(null+사유)·SSOT 단일소스·285차 근본원인 분석. 추측 최적화 지양 |
| §4~§5 Cache Architecture/Strategy | **부분(대응물)** | Redis 계층 없음. APCu+정적+rollup 이 대응 |
| §6 Cache Aside | **부분 준수** | 정적 프로퍼티/APCu: 조회→miss→DB→저장 패턴 |
| §7~§10 Read/Write Through/Back/Refresh Ahead | **부분** | rollup 집계=Refresh Ahead 유사(사전집계·주기 갱신). Write Back 없음(일관성 우선) |
| §11 Cache Key Naming | **부분** | APCu/tenantStorage 키에 tenant 포함(`tenant:{id}:…` 유사) |
| §12~§13 TTL/Invalidation | **부분 준수** | `expires_at`(252)·이벤트 무효화(`genie:data-refresh`·BroadcastChannel 크로스탭) |
| §14 Distributed Cache(Cluster) | **미적용** | Redis 부재 |
| §15 Session Cache(Redis) | **상이** | 토큰기반·DB 세션 |
| §16 Distributed Lock | **★대응물** | DB `FOR UPDATE`+트랜잭션(Redis SETNX 아님). Timeout=트랜잭션 |
| §17 Rate Limiter | **부분(비Redis)** | throttle 60·OTP/brute-force |
| §18~§20 Stampede/Penetration/Avalanche | **부분** | rollup 사전집계로 동시 miss 완화. Null 반환(정직 미산출)·Bloom Filter 없음 |
| §21~§22 Query 최적화/Index | **★부분 준수** | 복합 인덱스·N+1 방지·바인딩(Part009/010) |
| §23 Opcache | **★준수** | 운영 opcache·배포 reload |
| §24 JIT | **미적용** | 미설정. Measure First 로 효과 측정 후 결정(§3 정합) |
| §25 Compression | **부분** | nginx gzip(config 밖). vite chunk 최적화 |
| §26 CDN | **부분** | 일부 미디어. 정적 dist=nginx 직접 |
| §27~§29 Profiling/Benchmark/Monitoring | **부분** | 285차 502 등 실측 대응. Blackfire/Prometheus 아님. SystemMetrics 프로브 |
| §30 PHP(Redis ext/Predis/Opcache) | **부분** | Opcache 준수. Redis ext/Predis 부재 |
| §31 Redis Fallback | **대상 없음** | Redis 부재 |
| §32~§33 검증(redis-cli/EXPLAIN) | **부분** | EXPLAIN 활용. redis-cli 대상 없음 |

---

## 4. 확립된 표준 (신규 캐시/성능 코드가 따를 정본)

- **캐시 계층(정본)**: ① **정적 프로퍼티 메모이제이션**(per-request·`static $cache`) ② **APCu**(프로세스 공유·설정/코드테이블) ③ **DB rollup 집계테이블**(대시보드/KPI/통계=사전집계·`performance_metrics`·`channel_orders`, cron/ingest 갱신). Redis 신설하지 않는다.
- **TTL/무효화**: `expires_at` 컬럼·이벤트 무효화(`genie:data-refresh` dispatch·크로스탭 BroadcastChannel). TTL 없는 무한 캐시 금지.
- **분산락**: 임계 동시성(쿠폰·재고·정산)=**`SELECT … FOR UPDATE` + 트랜잭션**(288차 TOCTOU). Redis SETNX 아님.
- **Rate Limit**: 비Redis throttle(OTP/brute-force)·SecurityGuard.
- **성능**: ★**Measure First** — 추측 최적화 금지. **루프 내 외부 API N+1 금지**(285차 502 근본원인). 복합 인덱스 `(tenant_id, …)`·바인딩·limit clamp.
- **Opcache**: 운영 활성. **배포 시 `php-fpm reload`(opcache 리셋)**(Part015/016).
- **502 진단**: "등록 502=워커 고갈"은 **285차 오진 정정** — `upstream timed out` 엔드포인트부터 보라(php-fpm 풀 튜닝).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **Redis Cache/Cluster/Session/Rate Limiter/Distributed Lock(SETNX)** — 안 함. Redis 부재(인프라). APCu+정적+rollup+`FOR UPDATE`+throttle 가 정본. Redis 도입=인프라 추가 + Part006 정합.
2. **JIT** — 안 함(미설정). ★Measure First(§3) — CPU 집약 아닌 웹요청에 효과 미측정. 측정 후 결정.
3. **Bloom Filter/Multi-Level Cache/Refresh-Ahead 정교화** — 안 함. rollup 사전집계·Null 반환(정직 미산출)로 대응.
4. **Blackfire/Prometheus/Grafana Profiling** — 안 함. 285차식 근본원인 실측·SystemMetrics 프로브.
5. **CDN 전면·Redis Session** — 안 함. nginx 직접·토큰기반 세션.

★**준수하는 실 원칙(강함)**: **Measure First**(정직 미산출·근본원인 분석)·SSOT·N+1 방지·복합 인덱스·Opcache·TTL·FOR UPDATE 임계부.

---

## 6. Claude Code 구현 규칙

1. 캐시=정적 메모이제이션/APCu/**rollup 집계테이블** 재사용. **Redis 신설 금지**(부재).
2. **TTL 필수**(`expires_at`)·무한 캐시 금지. 변경 시 무효화(`genie:data-refresh`·크로스탭).
3. 임계 동시성=**`FOR UPDATE`+트랜잭션**(Redis 락 신설 금지). Rate limit=기존 throttle.
4. ★**Measure First** — 추측 최적화·성능 측정 없는 변경 금지. **루프 내 외부 API 금지**(N+1·285차).
5. 복합 인덱스 `(tenant_id, …)`·`SELECT` 컬럼 명시·바인딩. 중복 인덱스 금지.
6. Opcache 는 배포 reload 로 리셋. 502 진단은 `upstream timed out` 부터(285차·워커고갈 오진 주의).
7. Redis/Bloom Filter/JIT/CDN 을 "명세에 있다"는 이유로 이식하지 않는다(측정·인프라 결정 선행).

---

## 7. Completion Criteria

- [x] 캐시/성능 **실측**(Redis 0·APCu 12·정적 16·rollup 440·FOR UPDATE 6·throttle 60·expires_at 252·opcache)
- [x] 명세 §3~§33 **섹션별 매핑·판정**(Redis/Cluster/SETNX/JIT/Bloom Filter 부재 증명)
- [x] 실 캐시 계층(정적+APCu+rollup+TTL)·분산락(FOR UPDATE)·rate limit·opcache 성문화(§4)
- [x] ★Measure First(§3)·N+1 방지·복합 인덱스·Opcache 준수 명시
- [x] 의도적 미적용 + 사유(§5) — Redis/JIT/CDN/Bloom Filter
- [x] Claude Code 규칙(§6) · `phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 APCu+정적+rollup+FOR UPDATE 캐시/성능 스택의 성문화이지 Redis 이식이 아니다.

---

## 다음 Part

**CCIS Part018 — Queue, Event-Driven & Async** — ★사전 경고: Kafka/RabbitMQ/Redis Queue·Event Bus·Domain Event·DLQ·Saga/Outbox **전부 부재**(Part007/008). 비동기=**cron 워커 33개**(`bin/*_cron.php`)·크로스탭 BroadcastChannel·SSE. Idempotency=COALESCE dedup·웹훅 토큰. Part018 도 실측→부재증명→cron 배치 성문화(메시지큐 이식 금지).
