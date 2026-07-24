# CWIS Part004-04 WS01-SP02-TK002-ST03 — Favorites Infrastructure & Persistence

| 항목 | 값 |
|---|---|
| 명세 | `CWIS-P004-U04-WS01-SP02-TK002-ST03` |
| **판정** | **BLOCKED** (SP02-TK002 계열 3연속) |
| 기준 리비전 | `b4c6b2758da3` |
| 생성 코드 | **0건** |
| 생성 산출물 | 본 보고서 + Summary JSON + **Schema Requirements JSON** |

---

## 0. 요약 — 이번엔 빈손이 아니다

ST01(Domain) 미구현 · ST02(Application) BLOCKED 에 이어 ST03 도 **BLOCKED** 다. 근본 원인은 앞 두 Step 과 동일하며 새로울 것이 없다.

**다만 이번 Step 은 결과물을 남겼다.** §1 이 지시한 **20개 Persistence 축 조사**는 ST02 가 다루지 않은 완전히 새로운 영역이었고, 그 실측이 세 가지 재사용 가능한 자산을 만들어냈다.

1. **`illuminate/database` 는 죽어 있다** — 선언·설치돼 있으나 사용 0건
2. **저장소에 `deleted_at` 도 낙관적 락도 없다** — 명세가 "재사용하라"고 한 대상이 존재하지 않음
3. **★MySQL 8.0 은 부분 유니크 인덱스를 지원하지 않는다** — 명세 §10 이 제시한 중복 방지 1순위 전략이 주 백엔드에서 사용 불가

3번은 Option B 가 채택되는 순간 반드시 필요해지는 정보라, 조건부 설계로 `favorites-persistence-schema-requirements.json` 에 완결시켜 두었다.

---

## 1. BLOCKED 근거 6건

§28 이 열거한 BLOCKED 예시 6개 중 **5개가 동시 성립**한다.

| § 28 BLOCKED 예시 | 성립 | 근거 |
|---|---|---|
| ST01 Repository Interface 없음 | ✅ | BLK-1 |
| ST02 Handler 계약 확인 불가 | ✅ | BLK-2 |
| ORM 또는 Database 방식 식별 불가 | ❌ | **식별했다** — raw PDO + MySQL/SQLite 이중 백엔드 |
| Tenant Scope 정책 확인 불가 | ❌ | **확인했다** — tenant_id + 쿼리 조건 강제 |
| Favorites Domain 구조와 Persistence 구조 충돌 | ✅ | BLK-5 |
| 필수 분석 산출물 없음 | ❌ | 8개 전부 정독 |
| (추가) §22 허용 코드 경로 부재 | ✅ | BLK-3 |
| (추가) Workspace Scope 구조적 불가 | ✅ | BLK-4 |

### BLK-1 · 구현할 Interface 가 없다

§3 은 "ST01 또는 ST02 에서 정의된 Interface 와 **정확히 호환**되어야 한다 · Interface 를 구현체에 맞춰 임의 변경하지 마라" 고 규정한다. `FavoriteRepositoryInterface`·`FavoriteReadRepositoryInterface` 가 존재하지 않으므로 호환시킬 대상이 없다. Repository 구현체를 먼저 만들면 그것이 곧 Interface 를 발명하는 행위가 되어 §3 을 정면으로 어긴다.

### BLK-2 · Read Repository 가 반환할 타입이 없다

§7 은 "반환은 ORM Model 이 아니라 **Application DTO 또는 Read Model** 이어야 한다" 고 규정한다. ST02 가 BLOCKED 이므로 `FavoriteItemDto`·`FavoriteListResult` 가 없다. 반환 타입을 여기서 만들면 Infrastructure 가 Application 계약을 정의하는 역전이 발생한다.

### BLK-3 · §22 허용 코드 경로 전부 부재

| 허용 경로 | 실재 |
|---|---|
| `app/Infrastructure/**` · `src/Infrastructure/**` · `Shared/Infrastructure/**` | 부재 |
| `app/Persistence/**` · `src/Persistence/**` | 부재 |
| `modules/*/Infrastructure/**` · `packages/*/Infrastructure/**` | 부재 |
| `config/**` | **존재** — 단 내용은 `config/quality/eslint-baseline.json` 단일(프론트엔드 ESLint 베이스라인). Persistence 설정 도메인이 아니다 |
| `docs/cwis/part004-04/**` · `tools/cwis/navigation/output/**` | **존재** |

```bash
find . -type d \( -name "Infrastructure" -o -name "Persistence" \) \
  -not -path "*/node_modules/*" -not -path "*/clean_src/*"     # → 0건
```

### BLK-4 · Workspace 컬럼은 만드는 순간 §13 위반이 된다

§13 은 **"Null 과 전체 Workspace 를 동일 의미로 처리하지 마라"** 고 규정한다. 그런데 Workspace 엔티티가 부재하므로(ST07 `ABSENT_AXES`) `workspace_id` 컬럼을 만들면 **전 행이 NULL** 이 된다. 즉 컬럼을 만드는 선택 자체가 명세가 금지한 상태를 구조적으로 강제한다. 만들지 않는 것이 유일하게 §13 을 지키는 방법이라, 설계에서 의도적으로 제외했다.

### BLK-5 · 분리할 두 축이 모두 없다

§2 핵심 원칙은 "ORM Model 을 Domain Entity 로 사용하지 않는다"·"Domain 은 Infrastructure 를 참조하지 않는다" 이다. Domain 이 없고 ORM 도 실사용되지 않으므로 **분리 대상이 양쪽 다 부재**하다. Clean Architecture 경계는 지킬 것이 없어서 자동으로 지켜진다.

---

## 2. §1 지시 Persistence 조사 — 20축 실측

명세가 "기존 공통 구현이 있으면 반드시 재사용하라" 고 지시했으므로 전수 조사했다. **이 표가 이번 Step 의 실제 산출물이다.**

| 조사 축 | 실측 결과 |
|---|---|
| ORM 종류 | **NONE** — raw PDO 126개 파일 |
| Laravel Eloquent 사용 | **NO** ← 아래 별도 서술 |
| Doctrine ORM 사용 | NO (미선언) |
| DBAL / Query Builder | NO |
| Repository Naming Convention | **부재** — Repository 클래스 0건 |
| Persistence Model Convention | **부재** — 핸들러가 PDO 로 직접 SQL |
| Domain Mapper Convention | **부재** |
| UUID / ULID 정책 | **부재** — `INT AUTO_INCREMENT` PK + 별도 `public_id VARCHAR(64)` |
| Timestamp 정책 | ★**VARCHAR(32)/TEXT 문자열** — 네이티브 DATETIME 미사용 |
| Soft Delete 정책 | ★**부재** — `deleted_at` 0건. 실재 관용은 `status` + 사건 타임스탬프, `is_active`(44 파일) |
| Optimistic Lock 정책 | ★**부재** — `version` 컬럼 0건 |
| Transaction Manager | **부재** — raw PDO `beginTransaction` 12 파일 산재 |
| Tenant Scope 처리 | `tenant_id VARCHAR(100) NOT NULL` + 전 쿼리 `WHERE tenant_id=?`. RLS 없음 |
| Workspace Scope 처리 | **부재** (유사 개념 `scope_type`/`scope_id`) |
| Read Model 구조 | **부재** — 연관배열 직반환 |
| Pagination 구조 | **부재** — 핸들러별 LIMIT/OFFSET ad-hoc |
| Cursor Pagination | **부재** |
| Database Naming | snake_case, 도메인 접두 (`collaboration_*`·`omni_*`·`pm_*`) |
| Index Naming | `uq_<약어>_<컬럼>` / `idx_<약어>_<컬럼들>` |
| JSON Column 정책 | `MEDIUMTEXT`/`TEXT` 에 JSON 문자열 (네이티브 JSON 타입 미사용 — SQLite 호환) |
| Enum 저장 정책 | `VARCHAR` + 애플리케이션 `in_array` 화이트리스트 (네이티브 ENUM 미사용) |

### 발견 1 · `illuminate/database` 는 선언돼 있고 죽어 있다

```
backend/composer.json  require:  "illuminate/database": "^10.0"
backend/vendor/illuminate                                       설치됨
backend/src 사용처                                              0건
  (Illuminate\ · Eloquent · Capsule · "extends Model" 전부 0)
```

§1 은 "Laravel Eloquent 사용 여부" 를 묻는다. `composer.json` 만 읽으면 **"예"** 라고 답하게 된다. 실측 답은 **"아니오"** 다.

ST06 이 이미 `usage_status=DECLARED_NOT_FOUND`·`fan_in=0` 으로 판정하고 제거 후보 `FAV-NRM-001219` 로 등록해 두었다(`monolog`·`php-di`·`phpdotenv` 도 같은 상태). **선언 ≠ 사용** — 저장소의 기존 판정과 이번 실측이 독립적으로 일치했다.

### 발견 2 · 명세가 "재사용하라"고 한 것들이 존재하지 않는다

| 명세 조항 | 재사용 대상 |
|---|---|
| §9 "기존 Soft Delete 정책을 재사용하라" | **없음** (`deleted_at` 0건) |
| §11 "기존 Optimistic Locking 이 있으면 반드시 재사용하라" | **없음** (`version` 0건) |
| §12 "Laravel DB Transaction Adapter 를 재사용하라" | **없음** (Eloquent 미사용) |
| §16 "기존 Pagination Convention 을 재사용하라" | **없음** (Pagination 클래스 0건) |

명세는 성숙한 DDD/Laravel 저장소를 전제로 쓰였고, 실제 저장소는 Slim 4 + raw PDO 절차형이다.

### 발견 3 · 동시성 관용은 **있고**, 그 이유가 코드에 적혀 있다

```php
// Catalog.php:1726
//   (FOR UPDATE/SKIP LOCKED 불필요 — SQLite 폴백 환경에서도 동일하게 동작한다).

// ChannelSync.php:6194
//   조건부 UPDATE 의 affected rows 로 소유권을 판정한다(FOR UPDATE 불필요·SQLite/MySQL 동일 동작).

// Omnichannel.php:405  ← MySQL 분기 내에서만
$pdo->prepare("SELECT id FROM omni_outbox WHERE ... FOR UPDATE SKIP LOCKED");
```

저장소 정본은 **조건부 UPDATE + affected-rows 판정**이며, 채택 이유가 **SQLite 폴백 호환**이라고 명시돼 있다. 비관적 락은 MySQL 분기 안에서만 제한적으로 쓴다. 이것이 §11 이 요구한 "기존 정책" 의 실재 답이다.

---

## 3. ★MySQL 8.0 은 부분 유니크 인덱스를 지원하지 않는다

§10 은 중복 방지 전략 후보를 7개 제시하며 **Partial Unique Index** 를 첫 줄에 둔다. 즐겨찾기의 중복 방지 요구는 정확히 이 형태다.

> "활성(`status='ACTIVE'`)인 행에 대해서만 (tenant, principal, resource, type) 유일"

그런데 **MySQL 8.0 에는 필터 인덱스 문법이 없다.** `CREATE UNIQUE INDEX ... WHERE ...` 는 파싱되지 않는다. SQLite 는 지원한다. 이 저장소는 MySQL 주 + SQLite 폴백 **이중 백엔드**이므로, 한쪽에만 되는 전략은 채택할 수 없다.

### 채택: Generated Active Key

```
active_key = status='ACTIVE'  → md5(tenant_id|principal_type|principal_id|resource_type|resource_id|favorite_type)
             status='REMOVED' → NULL

UNIQUE (active_key)
```

NULL 은 MySQL·SQLite **양쪽 모두** UNIQUE 중복 검사에서 제외된다. 따라서 삭제된 행은 무제한 누적되면서 활성 행은 1건으로 강제된다 — 부분 유니크 인덱스와 동일한 효과를 표준 문법만으로 얻는다.

### 탈락한 대안과 이유

| 대안 | 탈락 사유 |
|---|---|
| 자연키 전체 복합 UNIQUE | 삭제 행이 남는 한 동일 리소스 재등록 불가 → **Restore 경로와 정면 충돌** |
| MySQL 생성 컬럼(Generated Column) | SQLite 와 DDL·표현식 결정성 제약이 갈려 이식성 상실 |
| 애플리케이션 사전 조회만 | §10 이 명시적으로 금지 — 동시 요청 방어 불가 |

이 제약이 §10 의 요구("Application 사전 조회만으로 중복을 방지했다고 판단하지 마라")를 DB 계층에서 충족한다. 상세는 `favorites-persistence-schema-requirements.json` 의 `unique_constraint_strategy`.

---

## 4. 조건부 스키마 설계 (Option B 전용)

§18·§24 가 "Migration 이 별도 Step 이면 파일을 만들지 말고 **설계만 기록**하라" 고 규정하므로, 설계를 `favorites-persistence-schema-requirements.json` 에 완결시켰다. 핵심만 옮긴다.

- **테이블 생성 경로는 Migration 파일이 아니다.** `backend/migrations/` 는 세션 172 에서 정지했고, 이후 전 스키마 변경은 핸들러별 `ensure*()` 자가치유가 담당한다(실측 72개 파일). Option B 산출물은 `ensureFavoriteTable(PDO, $isDemo)` 정적 메서드가 된다.
- **소프트 삭제는 `deleted_at` 이 아니라 `status` + `removed_at`** — 저장소 관용 계승(신규 관용 신설 회피).
- **`workspace_id` 미생성** — BLK-4.
- **`version` 미채택** — 관용 부재 + 단일 소유자 리소스. 잔여 위험(Reorder last-write-wins · Toggle 비멱등)은 정직하게 기록.
- **`resource_id VARCHAR(255)`** — 현행 즐겨찾기 값이 메뉴 경로 문자열이라 100자 초과 여지.
- **정렬 안정성 전제**: `created_at` 이 VARCHAR 문자열이므로 **ISO-8601 고정폭이어야** 사전순=시간순이 성립한다. 형식이 혼입되면 정렬이 조용히 깨진다.

### 백필은 원리적으로 불가능하다

현행 즐겨찾기는 각 사용자 브라우저의 `localStorage['g_sidebar_favs']` 에만 존재한다. **서버는 이 값을 알 수 없으므로 일괄 백필 스크립트를 쓸 수 없다.** 유일한 경로는 클라이언트 최초 로그인 시 1회 업로드 병합이며, 병합 규칙을 정하지 않으면 다기기 사용자에게서 중복·소실이 발생한다. Option B 채택 시 반드시 선결해야 할 항목이다.

---

## 5. 검증 결과 (§26 · §27)

```bash
git status --short   # tracked 변경 0건
git diff --name-only # 빈 결과
git diff --check     # 빈 결과
```

- `php -l` · PHPStan = **N/A** (변경 PHP 0건)
- 새 Package 설치 = **0건** (§26 준수)
- DB 접속 검증 = **NOT_EXECUTED** (§24·§26 준수)
- Lock File · `.env` · CI/CD · Migration 실행 결과 파일 변경 = **없음**
- 허용 경로 외 변경 = **없음** (산출물 3건 전부 §22 허용 경로)

§26 체크리스트 17항 중 실행 가능한 항목은 전부 PASS 이며, 의미 있는 것은 하나다.

> **중복 공통 구현 없음 — PASS.** 신규 Repository Base · Mapper · Transaction Adapter · Pagination 0건.

★한 가지 명시: 본 문서의 "테이블 0건" 은 **코드 실측**(`ensureTables`·`migrations` 전수) 근거이며 **라이브 DB 조회 결과가 아니다.** 운영 DB 실측은 `UNKNOWN` 으로 기록했다(§25 "확인 불가 항목은 UNKNOWN과 근거를 기록하라").

---

## 6. 판정과 다음 단계

**BLOCKED** — §28 BLOCKED 예시 6개 중 3개 + 추가 2개 성립.

`FAILED` 가 아닌 이유: Syntax 오류 · 계약 불일치 · Tenant 격리 누락 · 허용 경로 외 수정 · 사용자 변경 손상이 **하나도 없다**.
`READY_WITH_LIMITATIONS` 가 아닌 이유: 그 등급은 구현을 마친 뒤 남은 제약을 뜻한다. Repository 구현체가 0건이므로 부분 구현조차 성립하지 않는다.

### SP02-TK002 계열 3연속 BLOCKED — 원인은 하나다

```
ST01 Domain        → NOT_IMPLEMENTED (사용자 확정)
ST02 Application   → BLOCKED
ST03 Infrastructure→ BLOCKED
```

세 Step 이 각각 다른 이유로 막힌 것이 아니다. **PHASE_1 정의 결정이 서버 지속화 축 전체를 소멸시켰고, 저장소에 DDD/CQRS/ORM 스트라텀이 존재하지 않는다.** ST04 이후를 같은 전제로 진행하면 같은 판정이 반복된다.

### 권장 · Option A — 계열 종결 후 PHASE_3 로 이동

| 항목 | 내용 |
|---|---|
| CAP-04 | `aria-pressed` 0건 — 토글 상태가 스크린리더에 노출되지 않음 |
| BACKLOG-2 | 별표 모바일 터치 타깃 약 23×17px. 해소 시 행 높이 44px 유지 필수(아코디언 `maxHeight` 클리핑 방지) |
| BACKLOG-1 | 즐겨찾기 6개 이상 열람 경로 부재(`slice(0,5)`·더보기 0건) |

전부 `Sidebar.jsx` 확장이며 죽은 코드 0.

### Option B — MEMBER_DATA 재결정

DDD/CQRS 가 아니라 저장소 관용으로 구현해야 헌법 Golden Rule(Extend)에 부합한다.

```
ensureFavoriteTable()  →  Handlers/Favorites.php  →  routes.php (/api 접두 필수)
                       →  PM\Shared::gate() 재사용
```

**이 경로에서 `favorites-persistence-schema-requirements.json` 은 그대로 사용 가능한 설계 자산이다.** 특히 MySQL 부분 유니크 인덱스 미지원 사실과 그 이식 가능 대안은 구현 시점에 반드시 필요해진다 — 모르고 착수하면 MySQL 에서 문법 오류를 만나고 나서야 전략을 다시 짜게 된다.
