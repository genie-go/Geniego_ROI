# OrderHub Aggregator API Spec v2 (165차, 데모 격리 강화)

> **작성일**: 2026-05-26
> **세션**: 165차 백엔드 트랙
> **버전**: v2 (v1 기반 + U-165-A 데모 격리 강화)
> **저장 위치**: `docs/spec/backend_orderhub_aggregator_165_v2.md`
> **v1 대비 변경**: §6 인증 정책 전면 재작성 + §11 신설 (격리 방어선)

---

## 0. U-165-A 사용자 원칙 (최상위)

> **데모 데이터 (가상/Mock 포함) 가 운영시스템에 유입되어 오염되는 것을 절대 금지.**
> 격리 메커니즘은 초고도 엔터프라이즈급으로 구현한다.

본 spec v2 의 모든 결정은 이 원칙에 종속.

---

## 1. 결정 사항 요약 (v1 대비 변경점 ★)

| 항목 | 결정 |
|---|---|
| API 버전 | `/v424/orderhub/*` + `/api/v424/orderhub/*` alias |
| Handler 패턴 | ChannelSync 변형 (★ `user_session` fallback 제거) |
| ORM | Raw PDO |
| **인증** ★ | **middleware `auth_tenant` 신뢰, handler fallback 제거** |
| **Tenant 종류** ★ | **demo / production 명시 식별 + 환경 cross-check** |
| **환경 분리** ★ | **`GENIE_ENV` env 변수 기반 강제 분기** |
| **auto-CREATE** ★ | **운영 환경 = 자동 스키마 생성 금지** |
| 응답 schema | frontend Mock shape 정확 매칭 (v1 동일) |
| 신규 DB 테이블 | `orderhub_claims`, `orderhub_settlements` |

---

## 2. 신규 endpoint 정의 (v1 동일)

§2.1 ~ §2.3 = v1 spec 그대로. 응답 schema 변경 없음.

---

## 3. DB 스키마 (v1 동일 + 환경 분기 ★)

§3.1 ~ §3.3 DDL = v1 그대로.

**★ 추가**: 운영 환경 (`GENIE_ENV=production`) 에서는 application 의 auto-CREATE 금지.
운영 DB 의 스키마 생성은 별도 migration script (본 spec 범위 외) 로 수행.

---

## 4. 환경 분리 (신규 §, U-165-A 핵심)

### 4.1 환경 식별 변수

```
GENIE_ENV         = 'demo' | 'production'    # 필수, 미설정 시 'production' default (안전 측)
GENIE_DB_NAME     = 'geniego_roi'            # 운영 DB
GENIE_DEMO_DB_NAME = 'geniego_roi_demo'      # demo DB (방어선 4 인프라 작업 후 활성)
```

### 4.2 Db.php 확장 (★ 변경)

```php
final class Db
{
    private static ?\PDO $pdoProd = null;
    private static ?\PDO $pdoDemo = null;

    public static function pdo(): \PDO
    {
        // 하위 호환 - 환경에 맞는 PDO 반환
        $env = self::env();
        return $env === 'demo' ? self::pdoDemo() : self::pdoProd();
    }

    public static function pdoFor(bool $isDemo): \PDO
    {
        return $isDemo ? self::pdoDemo() : self::pdoProd();
    }

    public static function env(): string
    {
        $env = getenv('GENIE_ENV');
        return $env === 'demo' ? 'demo' : 'production';
    }

    private static function pdoProd(): \PDO
    {
        if (self::$pdoProd !== null) return self::$pdoProd;
        $dbname = getenv('GENIE_DB_NAME') ?: 'geniego_roi';
        self::$pdoProd = self::buildPdo($dbname);
        return self::$pdoProd;
    }

    private static function pdoDemo(): \PDO
    {
        if (self::$pdoDemo !== null) return self::$pdoDemo;
        $dbname = getenv('GENIE_DEMO_DB_NAME') ?: 'geniego_roi_demo';
        // demo DB 가 인프라적으로 별도 구성되기 전에는 운영 DB 와 동일 이름 fallback 가능
        // 단 본 spec 적용 후에는 별도 DB 명시 권장
        self::$pdoDemo = self::buildPdo($dbname);
        return self::$pdoDemo;
    }

    private static function buildPdo(string $dbname): \PDO
    {
        // 기존 .env 로딩 + PDO 생성 로직 재사용
        // host/port/user/pass = 기존 GENIE_DB_* env, dbname 만 인자로 분기
        // ... (기존 Db.php 로직 그대로, dbname 만 파라미터화)
    }
}
```

### 4.3 환경 변수 설정 가이드

- 운영 서버 (.env): `GENIE_ENV=production`
- demo 서버 (.env): `GENIE_ENV=demo`
- 로컬 개발 (.env): 개발자가 명시 선택 (기본 production = 안전)

---

## 5. Handler 클래스 사양 (★ 전면 재작성)

### 5.1 핵심 변경

- `user_session` 조회 제거 → middleware 가 검증한 `auth_tenant` 만 사용
- demo tenant 식별 명시 (`isDemoTenant`)
- 환경 ↔ tenant 종류 cross-check (운영 환경 + demo tenant 호출 차단)
- `Db::pdoFor($isDemo)` 사용 → demo DB / 운영 DB 강제 분기

### 5.2 클래스 스켈레톤 (v1 §4.2 대체)

```php
<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Message\ResponseInterface as Response;
use Genie\Db;

final class OrderHub
{
    /**
     * middleware 가 검증한 tenant 만 신뢰. fallback 없음.
     * 호출 전제: public/index.php 의 API-key middleware 가 auth_tenant 속성을 설정.
     */
    private static function tenantContext(Request $req): ?array
    {
        $tenant = (string)($req->getAttribute('auth_tenant') ?? '');
        if ($tenant === '') return null;  // 401 처리는 caller 가
        return [
            'tenant' => $tenant,
            'isDemo' => self::isDemoTenant($tenant),
        ];
    }

    /**
     * demo tenant 식별 규칙.
     * - 정확히 'demo' (기존 ChannelSync demo fallback 호환)
     * - prefix 'demo_' (다중 demo tenant 확장 가능)
     * 추후 api_key 테이블에 is_demo 컬럼 추가 후 DB 조회 방식으로 교체 권장.
     */
    private static function isDemoTenant(string $tenant): bool
    {
        return $tenant === 'demo' || str_starts_with($tenant, 'demo_');
    }

    /**
     * 환경 ↔ tenant 종류 cross-check.
     * - 운영 환경 + demo tenant = 누수 시도, 403 차단
     * - demo 환경 + 운영 tenant = 잘못된 라우팅, 403 차단
     */
    private static function guardEnv(bool $isDemo): ?array
    {
        $env = Db::env();
        if ($env === 'production' && $isDemo) {
            return ['ok' => false, 'error' => 'demo_blocked_in_production'];
        }
        if ($env === 'demo' && !$isDemo) {
            return ['ok' => false, 'error' => 'production_blocked_in_demo'];
        }
        return null;
    }

    /**
     * 환경 + tenant 종류에 맞는 PDO 반환.
     */
    private static function pdo(bool $isDemo): \PDO
    {
        return Db::pdoFor($isDemo);
    }

    private static function ensureSchema(\PDO $pdo, bool $isDemo): void
    {
        // 운영 환경 = auto-CREATE 금지, 명시적 migration 만 허용
        if (Db::env() === 'production' && !$isDemo
            && getenv('GENIE_ALLOW_AUTO_SCHEMA') !== '1') {
            return;
        }
        $driver = $pdo->getAttribute(\PDO::ATTR_DRIVER_NAME);
        if ($driver === 'mysql') {
            $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_claims (...MySQL DDL §3.2...)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_settlements (...MySQL DDL §3.3...)");
        } else {
            // SQLite fallback DDL (CHECK 제약 + 별도 CREATE INDEX)
            $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_claims (id TEXT PRIMARY KEY, tenant_id TEXT, ...)");
            $pdo->exec("CREATE TABLE IF NOT EXISTS orderhub_settlements (id TEXT PRIMARY KEY, tenant_id TEXT, ...)");
        }
    }

    private static function json(Response $resp, array $payload, int $status = 200): Response
    {
        $resp->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));
        return $resp->withStatus($status)
                    ->withHeader('Content-Type', 'application/json; charset=utf-8');
    }

    private static function clampLimit(Request $req): array
    {
        $q = $req->getQueryParams();
        $limit = max(1, min(1000, (int)($q['limit'] ?? 200)));
        $offset = max(0, (int)($q['offset'] ?? 0));
        return [$limit, $offset];
    }

    /**
     * 공통 진입 가드 - 모든 endpoint method 가 호출.
     */
    private static function gate(Request $req, Response $resp): array
    {
        $ctx = self::tenantContext($req);
        if ($ctx === null) {
            return ['error' => self::json($resp, ['ok'=>false,'error'=>'no_tenant'], 401)];
        }
        $envCheck = self::guardEnv($ctx['isDemo']);
        if ($envCheck !== null) {
            return ['error' => self::json($resp, $envCheck, 403)];
        }
        $pdo = self::pdo($ctx['isDemo']);
        return ['tenant' => $ctx['tenant'], 'isDemo' => $ctx['isDemo'], 'pdo' => $pdo];
    }

    public static function orders(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];
        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $status = isset($q['status']) ? (string)$q['status'] : null;
        $channel = isset($q['channel']) ? (string)$q['channel'] : null;

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
            return self::json($resp, ['ok'=>false,'error'=>'db_error','message'=>$e->getMessage()], 500);
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
            'ok' => true, 'items' => $items, 'total' => $total,
            'limit' => $limit, 'offset' => $offset,
            '_env' => Db::env(), '_isDemo' => $isDemo,  // 디버그 보조 (운영에서 제거 권장)
        ]);
    }

    public static function claims(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];
        self::ensureSchema($pdo, $isDemo);
        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $type = isset($q['type']) ? (string)$q['type'] : null;

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
            return self::json($resp, ['ok'=>false,'error'=>'db_error','message'=>$e->getMessage()], 500);
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
            'ok' => true, 'items' => $items, 'total' => $total,
            'limit' => $limit, 'offset' => $offset,
            '_env' => Db::env(), '_isDemo' => $isDemo,
        ]);
    }

    public static function settlements(Request $req, Response $resp): Response
    {
        $g = self::gate($req, $resp);
        if (isset($g['error'])) return $g['error'];
        [$tenant, $isDemo, $pdo] = [$g['tenant'], $g['isDemo'], $g['pdo']];
        self::ensureSchema($pdo, $isDemo);
        [$limit, $offset] = self::clampLimit($req);
        $q = $req->getQueryParams();
        $period = isset($q['period']) ? (string)$q['period'] : null;

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
            return self::json($resp, ['ok'=>false,'error'=>'db_error','message'=>$e->getMessage()], 500);
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
            'ok' => true, 'items' => $items, 'total' => $total,
            'limit' => $limit, 'offset' => $offset,
            '_env' => Db::env(), '_isDemo' => $isDemo,
        ]);
    }
}
```

---

## 6. routes.php 등록 (v1 동일)

```php
'GET /v424/orderhub/orders'          => 'Genie\\Handlers\\OrderHub::orders',
'GET /v424/orderhub/claims'          => 'Genie\\Handlers\\OrderHub::claims',
'GET /v424/orderhub/settlements'     => 'Genie\\Handlers\\OrderHub::settlements',
'GET /api/v424/orderhub/orders'      => 'Genie\\Handlers\\OrderHub::orders',
'GET /api/v424/orderhub/claims'      => 'Genie\\Handlers\\OrderHub::claims',
'GET /api/v424/orderhub/settlements' => 'Genie\\Handlers\\OrderHub::settlements',
```

이미 v1 적용 완료. 변경 불필요.

---

## 7. 인증 / Bypass 정책 (★ 전면 재작성)

### 7.1 정책 요약

- `/v424/orderhub/*` = **Bearer middleware 적용** (bypass 금지)
- middleware 통과 후 `auth_tenant` 속성 = handler 의 유일한 tenant 식별 source
- **handler 의 `user_session` fallback 제거** (v1 의 ChannelSync 패턴 차용 부분)
- demo 호출은 middleware 가 검증한 demo api_key 로만 진입 가능
- demo api_key 의 `tenant_id` = 'demo' 또는 'demo_*' prefix 로 사전 설정 (인프라 작업)

### 7.2 요청 흐름

```
Client → Authorization: Bearer <api_key>
  ↓
middleware (public/index.php)
  ├─ bypass 검사 → 통과 못 함
  ├─ api_key SHA-256 hash 검증 → 실패 시 401
  ├─ RBAC 검증 (GET = viewer 통과)
  ├─ auth_tenant 속성 설정 (api_key.tenant_id)
  ↓
handler (OrderHub::orders|claims|settlements)
  ├─ gate() → auth_tenant 없으면 401
  ├─ isDemoTenant 판정
  ├─ guardEnv → 환경 ↔ tenant 종류 cross-check, 불일치 시 403
  ├─ Db::pdoFor(isDemo) → 환경 분리 DB 연결
  ├─ tenant_id = ? 쿼리 (application filter, 2차 격리)
  └─ 응답
```

### 7.3 demo 호출 차단 보장

| 시나리오 | 결과 |
|---|---|
| 운영 환경 + 운영 api_key | ✅ 정상 (운영 DB 조회) |
| 운영 환경 + demo api_key (`tenant_id='demo'`) | 🚫 403 `demo_blocked_in_production` |
| demo 환경 + demo api_key | ✅ 정상 (demo DB 조회) |
| demo 환경 + 운영 api_key | 🚫 403 `production_blocked_in_demo` |
| api_key 없음 / 무효 | 🚫 401 (middleware 차단) |
| api_key 유효 + auth_tenant 미설정 | 🚫 401 (handler 차단) |

### 7.4 demo api_key 노출 위험 (별도 작업 권고)

현 middleware (`public/index.php:188-191`) 가 demo api_key 를 public health 응답에 노출.
운영 환경에서 demo api_key 호출 시 본 spec 의 `guardEnv` 가 403 차단 → **본 spec 적용으로 위험 차단됨**.

단 demo 환경에서 demo api_key 가 admin role 보유 = demo DB 의 데이터 입력/수정 가능. demo DB 가 운영 DB 와 물리 분리되어야 (방어선 4) 본 위험이 완전 차단됨.

---

## 8. Frontend 연동 변경점 (v1 §7 동일, 본 spec 범위 외)

별도 작업. `getJsonAuth` 사용 의무 + `_isDemo` 분기 패턴 유지.

---

## 9. 검증 절차 (★ 환경 cross-check 시나리오 추가)

### 9.1 PHP syntax + autoload

- `php -l backend/src/Handlers/OrderHub.php`
- `php -l backend/src/Db.php`
- `cd backend && php composer.phar dump-autoload`

### 9.2 routes 등록 검증

```bash
grep -nE "v424/orderhub" backend/src/routes.php
```

### 9.3 smoke test - 환경별 시나리오

**전제**: 로컬 서버 기동 + `.env` 에 `GENIE_ENV=production` (default).

```bash
KEY_PROD='<production api_key>'
KEY_DEMO='genie_live_demo_key_00000000'

# (1) 운영 환경 + 운영 키 → 200
curl -s "http://localhost:8000/v424/orderhub/orders?limit=5" \
  -H "Authorization: Bearer $KEY_PROD" | jq .

# (2) 운영 환경 + demo 키 → 403 demo_blocked_in_production
curl -s "http://localhost:8000/v424/orderhub/orders?limit=5" \
  -H "Authorization: Bearer $KEY_DEMO" | jq .

# (3) 키 없음 → 401 middleware 차단
curl -s "http://localhost:8000/v424/orderhub/orders?limit=5" | jq .
```

GENIE_ENV=demo 환경으로 전환 후 재테스트:

```bash
# (4) demo 환경 + demo 키 → 200
# (5) demo 환경 + 운영 키 → 403 production_blocked_in_demo
```

### 9.4 격리 회귀 테스트 (CI 권장)

- (1)/(2)/(3)/(4)/(5) 자동화 → master 진입 전 의무 통과
- 본 spec 범위 외 (별도 CI 작업)

---

## 10. 본 spec v2 적용 범위

- ✅ `OrderHub.php` 재작성 (gate/guardEnv/isDemoTenant + ensureSchema 환경 분기)
- ✅ `Db.php` 확장 (`pdoFor`, `env`, demo/prod 분리)
- ✅ `.env.example` 갱신 (`GENIE_ENV`, `GENIE_DEMO_DB_NAME`)
- ❌ Frontend 변경 (별도 작업)
- ❌ demo DB 물리 분리 (인프라, 별도 작업)
- ❌ demo api_key 권한 강등 (별도 작업)
- ❌ CI 격리 회귀 자동화 (별도 작업)
- ❌ migration script 작성 (운영 스키마, 별도 작업)

---

## 11. 격리 방어선 매핑 (U-165-A 6층 모델)

| 방어선 | 본 spec v2 적용 | 별도 작업 |
|---|:---:|:---:|
| 1. 환경 분리 (env 변수) | ✅ | |
| 2. middleware auth_tenant 신뢰 | ✅ | |
| 3. 환경 ↔ tenant cross-check | ✅ | |
| 4. DB 물리 분리 | (코드 준비됨) | ✅ 인프라 |
| 5. auto-CREATE 조건부 | ✅ | |
| 6. demo 키 권한 강등 | | ✅ 별도 작업 |

본 spec v2 = 방어선 1/2/3/5 즉시 적용. 4/6 = 후속 작업으로 분리.

---

## 12. 알려진 한계

1. **방어선 4 (DB 물리 분리) 미적용 시**: `Db::pdoDemo()` 는 같은 DB 에 연결될 수 있음 → application filter (`tenant_id`) 만으로 격리. SQL injection 등 코드 버그 시 노출 가능. 후속 인프라 작업 의무.
2. **`isDemoTenant` 규칙**: prefix 기반 식별. demo tenant 가 'demo_' prefix 없이 생성되면 운영으로 오인 가능. api_key 테이블에 `is_demo` 컬럼 추가 권장 (별도 작업).
3. **_env / _isDemo 디버그 필드 노출**: 응답에 환경 정보 포함. 운영 배포 시 제거 권장.

---

**문서 종결.**