# P0 — Paddle Billing 운영 적용 Playbook

> **작성일**: 2026-05-27 (173차)
> **대상**: PM / 운영자 (사용자 명시 Paddle 결제 lifecycle 운영 가능 수준)
> **선행조건**: Paddle 대시보드 계정 보유 (ceo@ociell.com)
> **소요시간**: Sandbox 적용 ~30분 / Live 전환 ~15분
> **상태**: 173차 코드/UI 모두 완비. 사용자 5개 값 + Webhook secret 입력만 남음.

---

## 0. 본 playbook 의 7원칙 (사용자 명시)

1. 운영 안정성 최우선
2. 결제 성공은 **webhook 기준** (프론트 redirect 아님)
3. webhook **idempotent** (중복 수신 차단)
4. webhook **occurred_at 기준** 최신만 반영 (out-of-order 차단)
5. **sandbox / live 환경 분리**
6. 민감정보 **.env 분리**
7. 에러 로그 + 감사 로그 + 원본 payload 저장

본 playbook 의 모든 단계는 위 7원칙을 자동으로 따른다 (코드 측 강제).

---

## 1. Paddle 대시보드 작업 — Sandbox 환경 (사용자 실행)

> ⚠️ cc 는 Paddle 대시보드 로그인 시도 **하지 않음** (자격증명 분리 원칙).
> 사용자가 직접 대시보드 작업 후 5개 값 + webhook secret 을 cc 에 전달.

### 1.1 Sandbox 모드 활성화

1. `https://sandbox-vendors.paddle.com/` 접속 (Sandbox 전용 URL)
2. 사용자 계정으로 로그인 (`ceo@ociell.com`)
3. 좌상단 환경 표시가 **"Sandbox"** 인지 확인 (live 와 별도 데이터)

### 1.2 Product / Price 생성 (cycle 1/3/6/12 매트릭스)

플랜 × cycle 조합으로 priceId 가 발급됨. **최소 8개** 필요 (Starter × 4 + Pro × 4). Enterprise 는 견적가이므로 priceId 불필요.

권장 생성 순서:

| Product | Price 이름 | 금액 (USD) | Billing cycle | 메모 |
|---|---|---|---|---|
| **Starter** | Starter Monthly | $89.00 | every 1 month | period_months=1 |
| Starter | Starter Quarterly | $84.55 × 3 = $253.65 | every 3 months | discount 5% |
| Starter | Starter Semi-Annual | $80.10 × 6 = $480.60 | every 6 months | discount 10% |
| Starter | Starter Annual | $71.20 × 12 = $854.40 | every 12 months | discount 20% |
| **Pro** | Pro Monthly | $149.00 | every 1 month | |
| Pro | Pro Quarterly | $141.55 × 3 | every 3 months | discount 5% |
| Pro | Pro Semi-Annual | $134.10 × 6 | every 6 months | discount 10% |
| Pro | Pro Annual | $119.20 × 12 | every 12 months | discount 20% |

각 Price 생성 후 발급되는 **price ID** (`pri_xxxxx...`) 를 기록. 총 8개.

### 1.3 Client Token 발급

1. 대시보드 > **Developer Tools** > **Authentication** > **Client-side tokens**
2. "New token" 클릭 → 이름 "Geniego ROI Sandbox Frontend"
3. 발급된 토큰 (`test_xxxxxxxxx...`) 기록 → **PADDLE_CLIENT_TOKEN**

### 1.4 Webhook Endpoint 등록

1. 대시보드 > **Developer Tools** > **Notifications**
2. "New destination" 클릭
3. 입력:
   - **Description**: "Geniego ROI — Sandbox webhook"
   - **URL**: `https://roi.genie-go.com/api/v423/paddle/webhook`
   - **Events**: (전체 체크 권장. 최소 8개)
     - `subscription.created`
     - `subscription.activated`
     - `subscription.updated`
     - `subscription.canceled`
     - `subscription.paused`
     - `transaction.completed`
     - `transaction.payment_failed`
     - `adjustment.created` / `adjustment.updated` (refund/chargeback 처리)
4. "Save" 후 발급된 **secret key** (`pdwsec_xxx...`) 기록 → **PADDLE_WEBHOOK_SECRET**

### 1.5 API Secret Key 발급 (server-side)

1. 대시보드 > **Developer Tools** > **Authentication** > **API keys**
2. "New API key" → 이름 "Geniego ROI Sandbox Backend"
3. 권한: Read + Write 전체
4. 발급된 키 (`pdl_seck_xxx...`) 기록 → **PADDLE_SECRET_KEY**

### 1.6 사용자 → cc 전달 값 (총 11개)

```
PADDLE_ENV               = sandbox
PADDLE_CLIENT_TOKEN      = test_xxx...
PADDLE_SECRET_KEY        = pdl_seck_xxx...
PADDLE_WEBHOOK_SECRET    = pdwsec_xxx...

(8개 priceId)
Starter 1m   = pri_xxx...
Starter 3m   = pri_xxx...
Starter 6m   = pri_xxx...
Starter 12m  = pri_xxx...
Pro 1m       = pri_xxx...
Pro 3m       = pri_xxx...
Pro 6m       = pri_xxx...
Pro 12m      = pri_xxx...
```

⚠️ chat 평문 전달 시 사용 후 회전 권고 ([[feedback_credentials_handling]] 정합).

---

## 2. 운영 서버 적용 (cc 실행, ops 접속 필요)

> 선행: 사용자 credentials 회전 알림 + 위 11개 값 수신.

### 2.1 운영 .env 추가

```bash
ssh vot@1.201.177.46
sudo nano /home/wwwroot/roi.geniego.com/backend/.env
```

추가:

```
PADDLE_ENV=sandbox
PADDLE_CLIENT_TOKEN=test_xxx...
PADDLE_SECRET_KEY=pdl_seck_xxx...
PADDLE_WEBHOOK_SECRET=pdwsec_xxx...
```

### 2.2 PHP-FPM reload

```bash
sudo systemctl reload php8.1-fpm
```

검증:

```bash
curl https://roi.genie-go.com/api/v423/paddle/config
# 기대: {"ok":true,"env":"sandbox","clientToken":"test_xxx..."}
```

### 2.3 admin DB 입력 (8개 priceId)

운영 frontend dist swap 후 admin 로그인:

1. `https://roi.genie-go.com/admin/plan-pricing` 진입
2. 💰 플랜 & 요금 탭
3. **Starter** 카드 > 1m/3m/6m/12m 4 row 의 `paddle_price_id` 입력 + 저장
4. **Pro** 카드 동일 4 row 입력 + 저장
5. (Enterprise 는 견적가, priceId 불필요)

저장 후 `plan_period_pricing` 테이블에 자동 기록 (admin UI 가 `PUT /v424/admin/plans/{id}/period-pricing` 호출).

검증:

```bash
curl https://roi.genie-go.com/auth/pricing/public-plans | jq '.plans[] | {id, periods}'
# 기대: starter/pro 각각 periods 배열 4 row + paddle_price_id 채워짐
```

### 2.4 nginx + frontend dist swap

`vot@1.201.177.46:/home/wwwroot/roi.geniego.com/frontend` 에 신규 `dist/` 압축 업로드 + 교체. (구체 절차는 별도 deploy.ps1 / deploy.sh 참조.)

### 2.5 운영 dist swap 후 cc playwright 검증 (U-172-A 정합)

```
1. 시크릿 브라우저 → https://roi.genie-go.com/pricing
2. 4-cycle 토글 확인 (Monthly / Quarterly / Semi-Annual / Annual)
3. cycle 변경 시 가격 + total charge 실시간 변경 확인
4. "Get Started" 클릭 → Paddle Checkout overlay 표시 확인
5. Paddle Sandbox 카드 4242 4242 4242 4242 / 12/30 / 100 입력 후 결제
6. 결제 완료 → "Payment received" 배너 확인
7. backend SQL: SELECT * FROM paddle_events ORDER BY id DESC LIMIT 5;
   → subscription.created + subscription.activated + transaction.completed 3 row 정합
8. SQL: SELECT plan, subscription_expires_at FROM app_user WHERE email='<test_email>';
   → plan='starter' 또는 'pro', expires_at 정상
```

추가 검증 — 가입 후 자동 checkout 흐름:

```
1. /auth/register 진입 → Plan 선택 → 3-step 가입 + cycle 선택 (3개월)
2. 가입 완료 → /pricing 자동 진입
3. 250ms 후 Paddle Checkout overlay 자동 노출 (cycle 3개월 priceId 사용)
4. 검증: window.Paddle 가 customData 에 {plan_id, cycle_months: 3} 포함
```

---

## 3. Webhook 동작 검증

### 3.1 Paddle 대시보드 > Notifications > 발송 로그

각 webhook 이벤트가 `200 OK` 로 처리되었는지 확인. 비정상 (4xx/5xx) 발생 시:

- `400 Invalid signature` → PADDLE_WEBHOOK_SECRET 불일치 (대시보드 secret 과 .env 정합 재확인)
- `400 Missing notification_id` → Paddle 측 payload 이상 (Paddle 지원 문의)
- `500 DB error` → 운영 MySQL 점검

### 3.2 backend 측 검증

```sql
-- 최근 webhook 이벤트
SELECT notification_id, event_type, occurred_at, processed, error
FROM paddle_events ORDER BY id DESC LIMIT 10;

-- 감사 로그
SELECT ref_id, action, detail, created_at
FROM paddle_audit_log ORDER BY id DESC LIMIT 20;

-- 활성 구독
SELECT user_email, paddle_subscription_id, plan_name, status, current_period_end
FROM paddle_subscriptions WHERE status='active';
```

### 3.3 occurred_at out-of-order 동작 (수동 테스트)

Sandbox 에서 빠르게 plan 변경 (subscription.updated 2회) 시 두 번째 (이전 occurred_at) 이벤트는 `paddle_audit_log.action='skipped_stale'` 로 기록되어야 함.

### 3.4 환불 시뮬레이션 (Sandbox)

1. Paddle 대시보드 > 결제 완료된 transaction 선택 > "Refund" 클릭 > full refund
2. webhook 수신:
   - `adjustment.created` (action: full)
3. 검증:
   ```sql
   SELECT status FROM paddle_subscriptions WHERE paddle_subscription_id='sub_xxx';
   -- 기대: status='refunded'
   SELECT plan FROM app_user WHERE email='<test_email>';
   -- 기대: plan='demo'
   ```

---

## 4. Sandbox → Live 전환

### 4.1 Live 환경 product/price 재생성

⚠️ Sandbox 와 Live 는 **완전히 별도 DB**. priceId 도 다름. Live 에서 새로 product / price 8개 생성 필요.

### 4.2 Live secret 발급 + .env 교체

```
PADDLE_ENV=live
PADDLE_CLIENT_TOKEN=<live_client_token>
PADDLE_SECRET_KEY=<live_secret>
PADDLE_WEBHOOK_SECRET=<live_webhook_secret>
```

### 4.3 admin DB 8개 priceId 재입력 (live 용)

### 4.4 webhook endpoint 별도 등록

Live 대시보드에서 신규 webhook destination 등록 (sandbox 와 별도 secret).

### 4.5 검증

작은 금액 (예: Starter 1m $89) 으로 실 카드 결제 후 환불 진행. webhook + 다운그레이드 정합 확인 후 정식 오픈.

---

## 5. 운영 중 모니터링

### 5.1 일일 점검 (자동화 권장)

```sql
-- 1) webhook 미처리 이벤트
SELECT COUNT(*) FROM paddle_events WHERE processed=0 AND created_at < NOW() - INTERVAL 5 MINUTE;
-- 기대: 0

-- 2) webhook 에러 발생
SELECT notification_id, event_type, error FROM paddle_events
WHERE error IS NOT NULL AND created_at > NOW() - INTERVAL 1 DAY;
-- 기대: 비어있음

-- 3) past_due 상태 구독
SELECT user_email, current_period_end FROM paddle_subscriptions
WHERE status='past_due';
-- 기대: 0건 또는 retry 진행 중인 건만

-- 4) 환불된 구독의 user plan 정합
SELECT s.user_email, s.status, u.plan
FROM paddle_subscriptions s LEFT JOIN app_user u ON u.email=s.user_email
WHERE s.status='refunded' AND u.plan NOT IN ('demo','free');
-- 기대: 0건 (refund 시 자동 다운그레이드 → 데이터 불일치 0)
```

### 5.2 Slack 알림 권장 (별도 라운드)

`payment_failed` / `subscription_canceled` / `refunded_chargeback` 발생 시 #billing-alerts 채널 알림.
(현재 미구현. P2 작업 후보.)

---

## 6. 트러블슈팅

| 증상 | 원인 후보 | 해결 |
|---|---|---|
| `/api/v423/paddle/config` 에서 clientToken 빈 문자열 | .env PADDLE_CLIENT_TOKEN 미설정 | §2.1 .env 추가 + reload |
| Paddle.Checkout.open 시 "Payment system not configured" alert | 동일 | §2.1 |
| Paddle Checkout overlay 가 한글 / Sandbox 환경 표시 | VITE_PADDLE_ENV build-time 변수 미설정 | dist 빌드 시 `VITE_PADDLE_ENV=sandbox npm run build` |
| webhook `400 Invalid signature` | secret 불일치 또는 timestamp 차이 5분 초과 | §2.1 secret 정합 재확인 + 서버 NTP sync |
| 결제 성공인데 user plan 안 바뀜 | webhook 처리 실패 | `paddle_events.error` 컬럼 확인 + `paddle_audit_log` 추적 |
| cycle 6m 선택했는데 monthly priceId 사용됨 | admin DB `plan_period_pricing.paddle_price_id` 의 6m row 미입력 | §2.3 8개 priceId 입력 |
| 환불했는데 plan 유지됨 | 173차 보강 전 webhook 처리 | Paddle.php onRefunded 보강 확인 (173차 적용) |

---

## 7. 자격증명 처리 원칙

- chat 평문 전달된 Paddle 계정 / API key 는 **사용 후 1회 회전 권고**
- cc 는 코드 / commit / memory 에 **저장 안 함** ([[feedback_credentials_handling]])
- .env 파일은 `.gitignore` 등록 확인
- secret 변경 시 Paddle 대시보드 + 운영 .env 동시 교체

---

## 8. 코드 측 정합 검증 체크리스트 (173차 완료분)

- [x] `PricingPublic.jsx` cycle 토글 (1/3/6/12) + autoCheckout 수신
- [x] `Paddle.php::processEvent` subscription/transaction/adjustment 의 occurred_at stale skip
- [x] `Paddle.php::onRefunded` full/chargeback 시 user plan 'demo' downgrade
- [x] `Paddle.php::resolveAppPlan` plan_period_pricing → plan_config → .env 5-tier lookup
- [x] `Terms.jsx` §3 billing cycle 4 종 + Card only + 결제 실패 retry 정책
- [x] `Privacy.jsx` §5.1 data retention 5종 명시
- [x] `Refund.jsx` §3 card-only + §3.1 chargeback 정책
- [x] `PricingPublic.jsx` FAQ — card only + 4 cycle + retry + refund 정합

---

**문서 끝**
