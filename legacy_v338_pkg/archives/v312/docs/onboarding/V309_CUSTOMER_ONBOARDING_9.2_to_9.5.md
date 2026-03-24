# GENIE_ROI V309 고객사 온보딩 패키지 (9.2~9.5 달성용 실전 체크리스트)

작성일: 2026-02-26

이 문서는 **V309를 ‘진짜 상용 운영 검증’까지 빠르게 올려** 시장 평가를 9.2~9.5 수준으로 끌어올리기 위한
**고객사 온보딩 실행 문서**입니다. (실제 고객사/실측 결과는 포함하지 않으며, 본 문서를 따라 고객 환경에서 측정합니다.)

---

## 0. 온보딩 목표(Definition of Done)
다음 5개가 충족되면 **상용 운영 준비 완료**로 간주합니다.

1) **앱 승인/권한/웹훅 검증**: Meta/TikTok/Amazon Ads + (커머스 채널) 실키로 연동 성공, 웹훅 시그니처 검증 및 리플레이 방지 적용
2) **레이트리밋 튜닝**: 채널별 안정 호출(429 폭발 없음), 동시성 제한/백오프/버킷값 확정
3) **실측 벤치마크**: 고객 환경에서 부하테스트 수행 후 SLA 리포트 생성
4) **운영 대시보드/알람**: Grafana 대시보드 + Alertmanager 룰(핵심 SLO) 적용
5) **보안 점검**: PII/토큰/권한/RBAC/감사로그 리뷰 통과

---

## 1. 앱 승인/권한/웹훅 시크릿/리플레이 방지

### 1.1 Meta (Marketing API)
- [ ] 앱 생성 및 Marketing API 권한 요청
- [ ] 시스템 사용자(System User)/비즈니스 자산 연결
- [ ] 최소 권한 원칙: 필요한 scope만
- [ ] 웹훅:
  - [ ] 검증 토큰(verification token) 설정
  - [ ] 시그니처 검증(X-Hub-Signature-256) 적용
  - [ ] 리플레이 방지: `event_id + timestamp` 저장 후 TTL(예: 10분) 내 중복 drop

### 1.2 TikTok Ads
- [ ] Developer 계정/앱 승인
- [ ] OAuth2 리다이렉트/토큰 갱신 구현
- [ ] 웹훅/이벤트(가능 시):
  - [ ] 리플레이 방지: idempotency key 저장 + TTL

### 1.3 Amazon Ads
- [ ] LWA( Login with Amazon ) + Ads API 자격 획득
- [ ] Profile scope 선택(Region별 분리)
- [ ] 리포트 비동기 파이프라인: request→poll→download

### 1.4 Webhook 시크릿/리플레이 방지 표준(플랫폼 공통)
- [ ] 시크릿은 **Secrets Manager**에만 저장(코드/ENV에 평문 금지)
- [ ] 서명 검증 실패 시 401 반환 + 경보
- [ ] 리플레이 방지 DB 테이블(예시):
  - `webhook_dedup(event_id, provider, received_at, expires_at)`
- [ ] 멱등성: 동일 이벤트 재전송 시 side effect 0

---

## 2. 채널별 레이트리밋 튜닝 값(권장 시작값)

> 실제 최적값은 고객사의 채널 API 등급/트래픽/데이터량에 따라 달라질 수 있어, **시작값**을 제시합니다.

### 2.1 커머스(기본)
| 채널 | 시작 RPS | Burst | 동시성(워커) | 백오프 | 비고 |
|---|---:|---:|---:|---|---|
| 쿠팡 | 3 | 10 | 3 | 2^n + jitter (최대 60s) | 429 발생 시 즉시 낮춤 |
| 카페24 | 2 | 6 | 2 | 2^n + jitter (최대 60s) | 권한/몰별 상이 |
| 네이버 | 2 | 6 | 2 | 2^n + jitter (최대 60s) | 파트너 승인 필요 |

### 2.2 광고(기본)
| 채널 | 시작 RPS | Burst | 동시성 | 백오프 | 비고 |
|---|---:|---:|---:|---|---|
| Meta | 5 | 15 | 3 | 2^n + jitter | 앱별 제한 상이 |
| TikTok | 3 | 10 | 2 | 2^n + jitter | 보고서 API는 비동기 |
| Amazon Ads | 2 | 6 | 2 | 2^n + jitter | 보고서 생성/폴링은 분리 |

**튜닝 절차(필수)**
1) 429 비율이 1% 넘으면 동시성과 RPS를 20~30% 낮춤
2) 큐 백로그가 증가하면 워커를 늘리되, RPS는 유지
3) provider별 95p latency가 2배 이상 뛰면 동시성을 낮춤

---

## 3. 실측 벤치마크 수행 절차 + 결과 리포트 템플릿

### 3.1 수행 준비
- [ ] 테스트 데이터 스케일 정의(주문/상품/캠페인 수)
- [ ] 테스트 환경 정의(Prod-like 권장)
- [ ] DRY_RUN 모드로 먼저 실행(쓰기 차단)
- [ ] 관측(메트릭/로그/트레이싱) 활성화

### 3.2 실행(예시)
- k6: `benchmarks/k6/commerce_orders_sync.js`
- 목표:
  - Orders ingest: 10,000/min(합성)
  - Inventory sync p95 < 60s
  - Webhook ingest p95 < 2s
  - Ads decision loop < 3min

### 3.3 결과 리포트(템플릿)
- [ ] 환경 요약(노드/DB/워커수/버전)
- [ ] 부하 시나리오(요청수/동시성/기간)
- [ ] 핵심 KPI:
  - API availability (%)
  - Job success rate (%)
  - p95 latency (API/Job/Webhook)
  - 429/5xx 비율
  - Inventory inconsistency (%)
- [ ] 결론:
  - 병목(예: DB, 큐, provider)
  - 튜닝(워커/RPS/인덱스)
  - 재측정 결과

---

## 4. 운영 대시보드/알람 룰 세트(Grafana/Alertmanager)

### 4.1 필수 대시보드(요약)
1) Platform Overview: 5xx/4xx, latency p95, QPS, queue depth
2) Provider Health: 429/5xx, retry rate, backoff time
3) Commerce Jobs: success, failure, backlog, item error top
4) Ads Control: command success, approval pending, rollback count
5) Webhooks: ingest rate, signature failures, dedup drops
6) Inventory Consistency: inconsistencies, reservation drift

### 4.2 필수 알람(요약)
- [ ] API 5xx > 1% (5분)
- [ ] Job success rate < 99% (15분)
- [ ] Provider 429 > 2% (10분)
- [ ] Token refresh failures 증가(즉시)
- [ ] Webhook signature failures 발생(즉시)
- [ ] Inventory inconsistency > 0.1%(10분)

---

## 5. 보안 점검표(PII/토큰/권한 리뷰)

### 5.1 PII
- [ ] 주문/고객정보 마스킹 정책(로그/대시보드)
- [ ] 데이터 보관기간/삭제 정책
- [ ] 접근기록(누가/언제/무엇) 감사로그

### 5.2 토큰/시크릿
- [ ] Secrets Manager 사용
- [ ] 암호화 at-rest, in-transit
- [ ] 주기적 로테이션
- [ ] 최소 권한 scope

### 5.3 권한/RBAC
- [ ] 역할 템플릿 적용(마케팅/광고/재무/국내/글로벌/총괄)
- [ ] 권한 상승(Privilege escalation) 테스트
- [ ] 승인 워크플로 강제(예산/가격/재고 쓰기)

### 5.4 감사로그
- [ ] 광고/가격/재고/정산 변경은 모두 audit
- [ ] Immutable storage 옵션(Enterprise+)

---

## 6. 9.2~9.5 빠른 달성 플랜(2~4주)
- Week 1: Ads/Commerce 실키 연동 + Webhook 검증 + 기본 대시보드
- Week 2: 레이트리밋 튜닝 + 실패 재처리(재시도/DLQ) + 보안 점검
- Week 3: 실측 벤치마크 1차 + 병목 튜닝
- Week 4: 벤치마크 재측정 + 고객 리포트 발행(공개 가능한 범위)
