# OrderHub Aggregator API Spec (165차)

> **작성일**: 2026-05-26
> **세션**: 165차 백엔드 트랙 (T1 PM Phase 2)
> **결정**: 경로 2 (Backend `/v424/*` aggregator 신규 구현)
> **저장 위치**: `docs/spec/backend_orderhub_aggregator_165.md`

---

## 1. 결정 사항 요약

| 항목 | 결정 |
|---|---|
| API 버전 | `/v424/orderhub/*` + `/api/v424/orderhub/*` alias |
| Handler 패턴 | ChannelSync 스타일 (PSR-7 static, `Db::pdo()`) |
| ORM | Raw PDO (Eloquent 미사용 일관성 유지) |
| 인증 | Bearer middleware + demo fallback (handler 내부) |
| Tenant 스코핑 | `user_session` JOIN → `tenant_id` |
| 응답 schema | frontend Mock shape 정확 매칭 |
| 신규 DB 테이블 | `orderhub_claims`, `orderhub_settlements` (auto-CREATE) |
| 재사용 테이블 | `channel_orders` (orders aggregator) |

---

## 2. 신규 endpoint 정의

### 2.1 GET `/v424/orderhub/orders`

**목적**: tenant 의 모든 channel 통합 orders 목록.
**Auth**: Bearer (demo fallback).
**Query**: `?limit=200&offset=0&status=<filter>&channel=<filter>` (선택, 모두 optional).

**응답** (frontend Mock shape 일치):

```json
{
  "ok": true,
  "items": [
    {
      "id": "ORD-20260520-001",
      "buyer": "홍길동",
      "channel": "shopify",
      "name": "샘플 상품 A",
      "qty": 2,
      "total": 45000,
      "status": "paid"
    }
  ],
  "total": 1234,
  "limit": 200,
  "offset": 0
}
```

**데이터 소스**: `channel_orders` 테이블 (`SELECT * FROM channel_orders WHERE tenant_id=? ...`).
**status 값 정규화**: 현 mixed KO/EN 상태를 그대로 통과 (frontend 가 처리). 추후 별도 normalization 작업 분리.

### 2.2 GET `/v424/orderhub/claims`

**목적**: tenant 의 클레임 (반품/취소/교환) 이력.
**Auth**: Bearer (demo fallback).
**Query**: `?limit=200&offset=0&type=<return|cancel|exchange>` (선택).

**응답**:

```json
{
  "ok": true,
  "items": [
    {
      "id": "CLM-20260520-001",
      "orderId": "ORD-20260518-042",
      "buyer": "김철수",
      "channel": "coupang",
      "type": "return",
      "reason": "단순변심",
      "status": "pending",
      "amount": 32000,
      "createdAt": "2026-05-20T10:23:00Z"
    }
  ],
  "total": 0,
  "limit": 200,
  "offset": 0
}
```

**데이터 소스**: 신규 `orderhub_claims` 테이블 (auto-CREATE).
**현재 데이터**: 0 행 (claimHistory Mock seed 없음, 신규 도메인).

### 2.3 GET `/v424/orderhub/settlements`

**목적**: tenant 의 정산 내역 (channel 별 집계 + 상세).
**Auth**: Bearer (demo fallback).
**Query**: `?limit=200&offset=0&period=<YYYY-MM>` (선택).

**응답** (frontend Mock shape 일치):

```json
{
  "ok": true,
  "items": [
    {
      "id": "STL-202605-shopify",
      "period": "2026-05",
      "channel": "shopify",
      "status": "settled",
      "grossSales": 12500000,
      "netPayout": 11200000,
      "platformFee": 750000,
      "adFee": 320000,
      "couponDiscount": 180000,
      "returnFee": 50000,
      "orders": 234,
      "returns": 8
    }
  ],
  "total": 1,
  "limit": 200,
  "offset": 0
}
```

**데이터 소스**: 신규 `orderhub_settlements` 테이블 (auto-CREATE).
**현재 데이터**: 0 행. `/v382/settlements/import` 와의 연계는 추후 별도 Phase.

---

## 3. DB 스키마 (auto-CREATE on first hit, ChannelSync 패턴)

### 3.1 `channel_orders` (기존, 변경 없음)

기존 ChannelSync 가 관리. 본 spec 에서는 read-only 재사용.

### 3.2 `orderhub_claims` (신규)

```sql
CREATE TABLE IF NOT EXISTS orderhub_claims (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  order_id VARCHAR(64) NOT NULL,
  buyer VARCHAR(128) DEFAULT NULL,
  channel VARCHAR(32) DEFAULT NULL,
  type ENUM('return','cancel','exchange') NOT NULL DEFAULT 'return',
  reason VARCHAR(255) DEFAULT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  amount DECIMAL(14,2) DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id),
  KEY idx_tenant_status (tenant_id, status),
  KEY idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.3 `orderhub_settlements` (신규)

```sql
CREATE TABLE IF NOT EXISTS orderhub_settlements (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  period VARCHAR(7) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  gross_sales DECIMAL(14,2) DEFAULT 0,
  net_payout DECIMAL(14,2) DEFAULT 0,
  platform_fee DECIMAL(14,2) DEFAULT 0,
  ad_fee DECIMAL(14,2) DEFAULT 0,
  coupon_discount DECIMAL(14,2) DEFAULT 0,
  return_fee DECIMAL(14,2) DEFAULT 0,
  orders_count INT DEFAULT 0,
  returns_count INT DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant (tenant_id),
  KEY idx_tenant_period (tenant_id, period),
  UNIQUE KEY uniq_tenant_period_channel (tenant_id, period, channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

SQLite fallback 동작: Db.php 의 PDOException 분기에서 자동 처리, `ENUM` / `ON UPDATE CURRENT_TIMESTAMP` 등은 SQLite 호환 SQL로 분기 작성 필요 (Handler 내부에서 driver 감지).

---

## 4. Handler 클래스 사양

### 4.1 파일 구조

- `backend/src/Handlers/OrderHub.php` — 단일 Handler 에 3 method (orders / claims / settlements) 통합

### 4.2 클래스 스켈레톤 (ChannelSync 패턴 그대로)

```php
<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

final class OrderHub
{
    private static function tenant(Request $req): string
    {
        $auth = $req->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
            try {
                $stmt = Db::pdo()->prepare(
                    "SELECT u.id FROM user_session s JOIN app_user u ON u.id=s.user_id WHERE s.token=? LIMIT 1"
                );
                $stmt->execute([$m[1]]);
                $row = $stmt->fetch(\PDO::FETCH_ASSOC);
                if ($row) return (string)$row['id'];
            } catch (\Throwable $e) {}
        }
        return 'demo';
    }

    private static function ensureSchema(): void
    {
        $pdo = Db::pdo();
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_claims (...MySQL DDL...)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_settlements (...MySQL DDL...)");
        } else {
            // SQLite fallback DDL
            $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_claims (id TEXT PRIMARY KEY, tenant_id TEXT, ...)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_settlements (id TEXT PRIMARY KEY, tenant_id TEXT, ...)");
        }
    }

    private static function json(Response $resp, array $payload, int $status = 200): Response
    {
        $resp->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $resp->withStatus($status)->withHeader('Content-Type', 'application/json; charset=utf-8');
    }

    private static function clampLimit(Request $req): array
    {
        $q = $req->getQueryParams();
        $limit = max(1, min(1000, (int)($q['limit'] ?? 200)));
        $offset = max(0, (int)($q['offset'] ?? 0));
        return [$limit, $offset];
    }

    public static function orders(Request $req, Response $resp): Response
    {
        $tenant = self::tenant($req);
        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $status = isset($q['status']) ? (string)$q['status'] : null;
        $channel = isset($q['channel']) ? (string)$q['channel'] : null;

        $pdo = Db::pdo();
        $where = ['tenant_id = ?'];
        $args = [$tenant];
        if ($status !== null) { $where[] = 'status = ?'; $args[] = $status; }
        if ($channel !== null) { $where[] = 'channel = ?'; $args[] = $channel; }
        $whereSql = implode(' AND ', $where);

        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM channel_orders WHERE $whereSql");
            $stmtCount->execute($args);
            $total = (int)$stmtCount->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM channel_orders WHERE $whereSql ORDER BY id DESC LIMIT ? OFFSET ?");
            $merged = array_merge($args, [$limit, $offset]);
            foreach ($merged as $i => $v) {
                $stmt->bindValue($i + 1, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        $items = array_map(fn($r) => [
            'id' => (string)($r['id'] ?? $r['order_id'] ?? ''),
            'buyer' => (string)($r['buyer'] ?? ''),
            'channel' => (string)($r['channel'] ?? ''),
            'name' => (string)($r['name'] ?? $r['product_name'] ?? ''),
            'qty' => (int)($r['qty'] ?? $r['quantity'] ?? 0),
            'total' => (float)($r['total'] ?? $r['total_price'] ?? 0),
            'status' => (string)($r['status'] ?? ''),
        ], $rows);

        return self::json($resp, [
            'ok' => true,
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }

    public static function claims(Request $req, Response $resp): Response
    {
        self::ensureSchema();
        $tenant = self::tenant($req);
        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $type = isset($q['type']) ? (string)$q['type'] : null;

        $pdo = Db::pdo();
        $where = ['tenant_id = ?'];
        $args = [$tenant];
        if ($type !== null) { $where[] = 'type = ?'; $args[] = $type; }
        $whereSql = implode(' AND ', $where);

        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM orderhub_claims WHERE $whereSql");
            $stmtCount->execute($args);
            $total = (int)$stmtCount->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM orderhub_claims WHERE $whereSql ORDER BY created_at DESC LIMIT ? OFFSET ?");
            $merged = array_merge($args, [$limit, $offset]);
            foreach ($merged as $i => $v) {
                $stmt->bindValue($i + 1, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        $items = array_map(fn($r) => [
            'id' => (string)$r['id'],
            'orderId' => (string)($r['order_id'] ?? ''),
            'buyer' => (string)($r['buyer'] ?? ''),
            'channel' => (string)($r['channel'] ?? ''),
            'type' => (string)($r['type'] ?? 'return'),
            'reason' => (string)($r['reason'] ?? ''),
            'status' => (string)($r['status'] ?? 'pending'),
            'amount' => (float)($r['amount'] ?? 0),
            'createdAt' => (string)($r['created_at'] ?? ''),
        ], $rows);

        return self::json($resp, [
            'ok' => true,
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }

    public static function settlements(Request $req, Response $resp): Response
    {
        self::ensureSchema();
        $tenant = self::tenant($req);
        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $period = isset($q['period']) ? (string)$q['period'] : null;

        $pdo = Db::pdo();
        $where = ['tenant_id = ?'];
        $args = [$tenant];
        if ($period !== null) { $where[] = 'period = ?'; $args[] = $period; }
        $whereSql = implode(' AND ', $where);

        try {
            $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM orderhub_settlements WHERE $whereSql");
            $stmtCount->execute($args);
            $total = (int)$stmtCount->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM orderhub_settlements WHERE $whereSql ORDER BY period DESC, channel ASC LIMIT ? OFFSET ?");
            $merged = array_merge($args, [$limit, $offset]);
            foreach ($merged as $i => $v) {
                $stmt->bindValue($i + 1, $v, is_int($v) ? \PDO::PARAM_INT : \PDO::PARAM_STR);
            }
            $stmt->execute();
            $rows = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable $e) {
            return self::json($resp, ['ok' => false, 'error' => 'db_error', 'message' => $e->getMessage()], 500);
        }

        $items = array_map(fn($r) => [
            'id' => (string)$r['id'],
            'period' => (string)($r['period'] ?? ''),
            'channel' => (string)($r['channel'] ?? ''),
            'status' => (string)($r['status'] ?? 'pending'),
            'grossSales' => (float)($r['gross_sales'] ?? 0),
            'netPayout' => (float)($r['net_payout'] ?? 0),
            'platformFee' => (float)($r['platform_fee'] ?? 0),
            'adFee' => (float)($r['ad_fee'] ?? 0),
            'couponDiscount' => (float)($r['coupon_discount'] ?? 0),
            'returnFee' => (float)($r['return_fee'] ?? 0),
            'orders' => (int)($r['orders_count'] ?? 0),
            'returns' => (int)($r['returns_count'] ?? 0),
        ], $rows);

        return self::json($resp, [
            'ok' => true,
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ]);
    }
}
```

---

## 5. routes.php 등록 (실 Handler 매핑, `$register` stub 우회)

routes.php 의 메인 `'METHOD /path' => 'FQN::method'` 맵에 다음 3 항목 추가:

```php
'GET /v424/orderhub/orders'      => 'Genie\\Handlers\\OrderHub::orders',
'GET /v424/orderhub/claims'      => 'Genie\\Handlers\\OrderHub::claims',
'GET /v424/orderhub/settlements' => 'Genie\\Handlers\\OrderHub::settlements',
'GET /api/v424/orderhub/orders'      => 'Genie\\Handlers\\OrderHub::orders',
'GET /api/v424/orderhub/claims'      => 'Genie\\Handlers\\OrderHub::claims',
'GET /api/v424/orderhub/settlements' => 'Genie\\Handlers\\OrderHub::settlements',
```

`$register` stub 미사용 (실 구현이므로).

---

## 6. 인증 / Bypass 정책

- `/v424/orderhub/*` = **Bearer middleware 적용** (bypass 리스트 추가 금지)
- Handler 내부에서 Bearer 검증 실패 시 `tenant = 'demo'` fallback (ChannelSync 패턴 동일)
- demo fallback = `tenant_id = 'demo'` 행만 조회 → 보안 누수 없음
- 프로덕션 사용 시 frontend 는 `getJsonAuth` 호출, demo 모드는 `getJsonAuth` 호출하되 demo_genie_token 자동 전송

`public/index.php` 의 bypass 리스트 변경 **불필요**.

---

## 7. Frontend 연동 변경점 (Phase 2-B, 별도 작업)

본 spec 은 backend 만 정의. Frontend 변경은 본 세션 후속 또는 신규 세션에서:

```jsx
// frontend/src/context/GlobalDataContext.jsx
// 변경 전:
const [orders, setOrders] = useState(loadDemoState('orders', DEMO_ORDERS));

// 변경 후:
const [orders, setOrders] = useState(
  _isDemo ? loadDemoState('orders', DEMO_ORDERS) : []
);

useEffect(() => {
  if (_isDemo) return;
  let cancelled = false;
  getJsonAuth('/api/v424/orderhub/orders?limit=200')
    .then(res => { if (!cancelled && res?.ok) setOrders(res.items); })
    .catch(() => {});
  return () => { cancelled = true; };
}, []);
```

동일 패턴으로 `claimHistory`, `settlement` 도 wire-up.

---

## 8. 검증 절차 (구현 후)

1. **PHP syntax**: `php -l backend/src/Handlers/OrderHub.php`
2. **Composer autoload**: `cd backend && composer dump-autoload` (PSR-4 갱신)
3. **Routes 등록 검증**:
   ```bash
   grep -nE "v424/orderhub" backend/src/routes.php
   ```
4. **smoke test (demo tenant)**:
   ```bash
   curl -s 'http://localhost:8000/v424/orderhub/orders?limit=5' | jq .
   curl -s 'http://localhost:8000/v424/orderhub/claims?limit=5' | jq .
   curl -s 'http://localhost:8000/v424/orderhub/settlements?limit=5' | jq .
   ```
   기대값: `{"ok":true,"items":[],"total":0,...}` (demo tenant, 빈 결과)

5. **Bearer test (옵션)**: 실 token 으로 동일 URL → tenant_id 의 행 반환.

---

## 9. 본 spec 적용 범위 = 백엔드 limited scope

- ✅ 신규 `OrderHub.php` Handler 작성
- ✅ routes.php 6 entry 추가
- ✅ 2 신규 테이블 auto-CREATE (lazy)
- ❌ Frontend 변경 (별도 작업)
- ❌ 데이터 ingestion (claims/settlements 의 데이터 입력 경로는 별도 Phase)
- ❌ `/v382/settlements/import` 연계 (별도 Phase)
- ❌ status 정규화 (별도 작업)

---

## 10. 알려진 한계 / 추후 확장

1. **claimHistory 실 데이터 source**: 채널별 (Shopify return webhook 등) 수집 경로 미정 → 별도 Phase
2. **settlement ingestion**: `/v382/settlements/import` 와의 통합 미정 → 별도 Phase
3. **status normalization**: orders.status 의 mixed KO/EN 정리 미적용 → frontend 가 현재처럼 처리
4. **rate limit / pagination cursor**: limit/offset 만 제공, cursor 미구현 → 후속 작업

---

**문서 종결.**