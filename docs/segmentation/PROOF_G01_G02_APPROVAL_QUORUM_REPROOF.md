# PM 재증명 — G-01 / G-02 승인 정족수 결함 (Maker-Checker 무효 여부)

> **289차 · 코드변경 0 · 조사 전용**
> 대상: 1-6 Gap 원장 [`CANONICAL_DSAR_REBATE_GAP_REGISTRY_REMEDIATION.md`](CANONICAL_DSAR_REBATE_GAP_REGISTRY_REMEDIATION.md) **G-01 · G-02**
> 근거 규약: FP 레지스트리 — **PM 코드 재증명 전 P0 단정 금지** · 1-6 E-02 `GapProofStatus`
> 계기: 5-3(Approval Workflow) 착수 전 **재사용 대상 승인 엔진의 건전성 확인**

---

## §0. 결론 요약

| Gap | 이전 | **재증명 결과** | 등급 |
|---|---|---|---|
| **G-01** `Mapping.php:212` | `UNVERIFIED` | 🔴 **CONFIRMED — 단 성격이 다름** | **P1**(P0 아님) |
| **G-02** `Alerting.php:593` | `UNVERIFIED` | 🔴 **CONFIRMED(코드) · VACUOUS(위험)** | **잠재**(현재 실행 불가) |

**그리고 두 건 모두 내가 처음 기술한 원인이 틀렸다.** §1·§2에서 정정한다.

---

## §1. G-01 — 원인은 "중복 제거 없음"이 아니라 **행위자 신원 부재**

### 1-1. 내가 처음 한 기술 (부정확)

> *"`$approvals[] = [...]` 무조건 append + `count() >= required_approvals` → **1인이 2회 누르면 정족수 충족**"*

**현상은 맞다. 원인 지목이 틀렸다.**

### 1-2. 실측 — 행위자가 클라이언트 헤더다

```php
// backend/src/Handlers/Mapping.php:22-25
private static function actor(Request $request): string {
    $a = $request->getHeaderLine('X-User-Email');   // ← 클라이언트가 정하는 값
    return $a !== '' ? $a : 'unknown';
}
```

**미들웨어는 인증 신원을 이미 제공한다** — `auth_key` · `auth_role` · `auth_tenant`(`index.php:99-100`).
**핸들러는 그것을 쓰지 않고 헤더를 읽는다.**

**→ 중복 제거를 넣었어도 무의미했다.** 헤더값만 바꾸면 서로 다른 승인자가 되기 때문이다.
**"actor 별 dedup"은 actor 가 신뢰 가능할 때만 성립하는 통제다.**

### 1-3. 더 나쁜 사실 — 프론트는 그 헤더를 보내지 않는다

```
grep -rn "X-User-Email" frontend/src/   →  0
```

**실제 UI 경로에서 `$actor` 는 항상 `'unknown'` 이다.**

귀결:
1. 모든 승인이 `{"user":"unknown"}` 으로 기록된다.
2. **한 사람이 두 번 누르면 `count($approvals)=2 >= 2` → `approved`** — 스푸핑조차 필요 없다.
3. **`audit_log.actor = 'unknown'`**(`Mapping.php:27-30`) → **누가 승인했는지 감사로 알 수 없다.**

### 1-4. Maker-Checker 는 **의도된 설계**였다 (정족수 2 하드코딩)

```php
// Mapping.php:167-168 — propose 시 상수 2
INSERT INTO mapping_change_request(..., required_approvals, ...) VALUES(?,...,2,?)
```

**기본값이 아니라 상수다.** 즉 **모든 제안이 2인 승인을 요구하도록 설계**됐고,
**그 통제가 1인으로 충족된다.** 통제의 목적 자체가 무효다.

### 1-5. 공격 경로 — 인증은 필요하다

| 확인 | 결과 |
|---|---|
| `/v418/mappings/*` bypass 여부 | ❌ **bypass 아님** → **API 키 필요**(`index.php:60-89` 히트 0) |
| 쓰기 권한 | POST → **analyst+ 또는 `write:*`** 필요 |
| 생산자 | ✅ `POST /v418/mappings/proposals`(`routes.php:459`) · INSERT 1개소 |
| 승인 | ✅ `POST /v418/mappings/proposals/{req_id}/approve`(`routes.php:461`) |
| 집행 | ✅ `apply()` 는 **`status !== "approved"` 를 정확히 게이트**(`Mapping.php:236-237`) |

**→ analyst+ 키 1개로: propose → approve → approve → apply.**
**2인 승인 통제를 1인이 완주한다.** `apply()` 의 게이트는 올바르나, **게이트가 지키는 승인 자체가 무너져 있다.**

### 1-6. 🔴 그러나 P0 가 아니다 — 완화 요인

| 완화 | 근거 |
|---|---|
| **무인증 아님** | analyst+ 인증 키 필요 — 이미 쓰기 권한이 있는 주체 |
| **UI 소비처 0** | `grep "v418/mappings\|mappings/proposals" frontend/src`(i18n 제외) → **0** — **일상 경로에 없다** |
| **금전 이동 아님** | 대상 = `mapping_change_request`(platform·field·raw_value→canonical_value) = **데이터 정규화 매핑**. Payout/정산 아님 |

**→ 등급 P1.** 실재하는 통제 우회 + 감사 위조이나, **무인증도 아니고 금전도 아니며 UI 경로에도 없다.**

### 1-7. 검증하지 않은 것 (정직 표기)

- **운영 DB 에 `mapping_change_request` 행이 실제로 존재하는지 미조회**(라이브 미확인).
- **analyst+ 키가 실제로 몇 개 발급됐는지 미조회.**
- **`apply()` 가 적용하는 매핑의 하류 영향 범위**(어떤 분석·정산에 쓰이는지) 미추적.

---

## §2. G-02 — 코드는 결함, 위험은 **VACUOUS**

### 2-1. 실측 — 정족수를 아예 읽지 않는다

```php
// backend/src/Handlers/Alerting.php:591-593
$approvals[] = ["actor"=>$actor, "decision"=>$decision, "ts"=>gmdate('c')];
$status = $decision === "approve" ? "approved" : "rejected";   // ← count 도 required_approvals 도 없음
```

**G-01 과 다른 결함이다.** G-01 은 정족수를 세되 행위자가 없고,
**G-02 는 정족수를 세지 않는다. 1인 approve → 즉시 approved.**

**테이블에는 정족수가 있다**: `action_request.required_approvals INT NOT NULL DEFAULT 2`(`Db.php:634`).
**코드가 그 필드를 읽지 않는다** — `grep "required_approvals" Alerting.php` 의 **유일한 히트는 `:562` 응답 직렬화**:

```php
"required_approvals" => 2,     // Alerting.php:562 — 클라이언트에 '2인 필요'라고 알려주는 값
```

> 🔴 **API 는 "2인 승인 필요"라고 응답하면서 1인 승인으로 approved 처리한다.**
> **표시와 실제가 다르다** — 288차가 정리한 **가짜녹색** 유형이다.

### 2-2. 🔴 그러나 지금은 실행 불가 — 생산자가 없다

```
grep -rniE "insert[[:space:]]+into[[:space:]]+action_request" backend/src/   →  0
action_request 언급 파일: Alerting.php(소비) · Db.php(CREATE TABLE) · routes.php(라우트)
```

**`action_request` 를 생성하는 코드가 전무하다.** 승인할 대상이 **애초에 생기지 않는다.**

**287차 판정이 여전히 유효하다**: *"action_request 파이프라인 **생산자 전무한 죽은 스켈레톤**"*.
287차는 `executeAction` 의 **가짜집행**을 고쳤을 뿐 **생산자를 만들지 않았다.**

**→ 판정 `VACUOUS`**(1-8 E-03 `RegressionVerdict` 의 그 개념).
**결함은 실재하나 도달 불가능하다.** 다만 **생산자가 배선되는 순간 즉시 활성화**된다.

---

## §3. 🔴 5-1 §50 분류의 정정 — "Approval 정본 REAL" 은 과장이었다

5-1 §50 은 이렇게 분류했다:

> `action_request 승인 워크플로(decision/approvals_json/status)` → **`VALIDATED_LEGACY`(Approval 정본·재사용)**

**재증명 결과 이 분류는 유지될 수 없다:**

| 주장 | 실측 |
|---|---|
| "Approval **정본**" | **생산자 0** — 아무것도 승인 대상이 되지 않는다 |
| "**VALIDATED**" | **정족수 미집행** · **행위자 = 클라이언트 헤더** — 누구도 검증하지 않았다 |
| "재사용" | 재사용하면 **결함까지 재사용**된다 |

> 🔴 **1-9 LEGACY-GAP-01 과 같은 패턴의 두 번째 사례다.**
> 그때는 `guard_headerless_getjson.mjs` 가 **`VALIDATED_LEGACY`(재사용 강제)인데 호출처 0**이었다.
> 이번엔 `action_request` 가 **"Approval 정본"인데 생산자 0**이다.
> **둘 다 "VALIDATED"가 검증이 아니라 존재 확인에 그쳤다.**

**→ 1-9가 요구한 `is_effective` 필드가 정확히 이것을 잡는다.**
**본 재증명은 그 요구의 두 번째 실증이다.**

---

## §4. 5-3 에 대한 함의 (설계 입력)

### 4-1. 재사용 판정은 유지하되 전제가 바뀐다

5-1 §51 결론 **"중복 승인엔진 신설 금지"**는 **여전히 옳다**. 승인 엔진을 또 만들면 3벌이 된다.

**그러나 "이미 검증된 엔진을 재사용한다"는 전제는 거짓이었다.**
정확한 표현은 이것이다:

> **승인 엔진은 2벌 존재하며(`mapping_change_request` · `action_request`), 둘 다 정족수 통제가 무효다.**
> **하나는 행위자가 없고(G-01), 하나는 정족수를 세지 않으며 생산자도 없다(G-02).**
> **5-3 은 "재사용"이 아니라 "복구 후 통합"이다.**

### 4-2. 5-3 이 반드시 다뤄야 할 것

| # | 항목 |
|---|---|
| 1 | 🔴 **행위자 신원을 인증 컨텍스트에서 취한다** — `X-User-Email` 헤더 폐기 · `auth_key`/세션 사용자 사용 |
| 2 | **actor dedup** — 단, 1번 선행 없이는 무의미 |
| 3 | **자기 승인 차단** — `approver != requested_by`(현행 `requested_by` 도 같은 헤더라 함께 고쳐야 함) |
| 4 | **정족수 집행** — `Alerting` 이 `required_approvals` 를 **읽게** 한다 |
| 5 | **재승인 차단** — 이미 `approved` 인 건에 대한 재승인 방지 |
| 6 | **표시 = 실제** — `:562` 가 2를 알린다면 2를 집행해야 한다 |
| 7 | **감사 신뢰성** — `audit_log.actor='unknown'` 해소 |

**전부 코드변경이며 본 세션 범위 밖이다** → **승인 세션 인계.**

---

## §5. Gap 원장 상태 전이 (1-6 E-10 `GapClassTransition`)

| Gap | 이전 | 이후 | 근거 |
|---|---|---|---|
| **G-01** | `UNVERIFIED` | **`PROVEN`** · class **`DEFECT`** · 등급 **P1** | §1 — 코드 실측 + 라우트 + 인증 + UI 소비처 |
| **G-02** | `UNVERIFIED` | **`PROVEN`(코드)** · class **`DEFECT`** · verdict **`VACUOUS`** · 등급 **잠재** | §2 — 생산자 0 |

**1-6 우선순위 원칙 재적용 — "위험 = 운영영향 × 오신뢰":**
- **G-01**: 운영영향 낮음(UI 경로 없음) × **오신뢰 높음**(정족수 2가 지켜진다고 믿게 함) → **P1**
- **G-02**: 운영영향 **0**(도달 불가) × 오신뢰 높음(API 가 "2인 필요"라고 응답) → **잠재 · 생산자 배선 시 즉시 P1**

---

## §6. 비파괴 확인

**코드 변경 0** · **문서 수정 0**(`Mapping.php`·`Alerting.php`·5-1 §50 **전부 무수정**) · 조사 전용.
5-1 §50 의 분류 정정(§3)은 **본 문서에 기록**하며 **5-1 문서를 직접 고치지 않는다**(1-8 D-10 — 남의 블록 산출물 무단 수정 금지) → **인계**.
