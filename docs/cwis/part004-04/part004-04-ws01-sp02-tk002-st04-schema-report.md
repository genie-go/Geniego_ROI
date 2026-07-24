# CWIS Part004-04 WS01-SP02-TK002-ST04 — Favorites Database Migration & Schema

| 항목 | 값 |
|---|---|
| 명세 | `CWIS-P004-U04-WS01-SP02-TK002-ST04` |
| **판정** | **BLOCKED** (UNNECESSARY — 확정 결정 하에서 불필요) |
| 기준 리비전 | `1234a6f0957` |
| 마이그레이션 생성 | **0건** (dead schema 회피) |
| 생성 산출물 | 본 보고서 + `favorites-schema-summary.json` |

---

## 0. 요약

ST04 는 즐겨찾기 **서버 DB 스키마**를 만들라고 지시한다. 그러나 즐겨찾기의 서버 테이블은 **Option B(MEMBER_DATA)** 에서만 존재하며, 사용자는 **Option A(UI 프리퍼런스)** 를 이 세션에서 **세 번** 확정했다.

```
1차·2차: "권장 A로 전환" → "커밋하고 진행"  (커밋 1234a6f0957)
3차:     ST04 진입 시 재확정 — "현 결정 유지"
```

ST04 의 전제("ST01~ST03에서 구현한 Domain/Application/Infrastructure를 기반으로")도 성립하지 않는다 — ST01 은 NOT_IMPLEMENTED, ST02·ST03 은 BLOCKED 였다. ST02→ST03→ST04 로 이어지는 **같은 계열의 4번째 BLOCKED** 이며, 근본 원인은 하나다.

사용자 재확정에 따라 **마이그레이션 파일을 만들지 않고** 판정 산출물만 남긴다.

---

## 1. BLOCKED 근거 5건 (전부 실측)

### BLK-1 · 선행 계층 부재 + 상위 결정과 충돌

ST01 Domain = NOT_IMPLEMENTED(사용자확정) · ST02 Application = BLOCKED · ST03 Infrastructure = BLOCKED. `PHASE_1 = 'UI 프리퍼런스'` 확정이 서버 지속화 축 전체를 소멸시켰고, 로드맵은 이를 기계 판독 가능하게 남겨 두었다.

```json
"PHASE_2": { "conditional_on": "PHASE_1 정의 = MEMBER_DATA" }
```

DB 스키마(PHASE_2 의 본체)는 그 조건이 거짓인 한 요구사항이 아니다.

### BLK-2 · §Git-Diff 허용 코드경로 부재

| spec 허용 경로 | 실재 |
|---|---|
| `database/**` | **부재** |
| `migrations/**` (루트) | **부재** |
| `schema/**` | **부재** |
| `backend/migrations/` | 존재 — 단 §허용 목록에 **없음** |
| `docs/**` · `tools/cwis/**` | 존재 |

```bash
ls -d database migrations schema   # → 전부 ABSENT
```

마이그레이션을 쓸 수 있는 유일한 실재 경로(`backend/migrations/`)는 spec 이 허용한 경로가 아니다. 허용된 산출물 경로는 문서 2곳뿐이다.

### BLK-3 · 마이그레이션 파일 패턴은 폐기됐다

```
backend/migrations/ 최종 파일 = 20260527_172_002_coupon_tables.sql  (세션 172)
총 21개 · 이후 신규 0
```

세션 172 이후 저장소의 **모든** 스키마 변경은 핸들러별 `ensureTables()` 자가치유가 담당한다(실측 72개 파일). 신규 `.sql` 마이그레이션 = 100+ 세션 전 폐기된 패턴 부활 = 헌법 Golden Rule(Extend) 위반.

러너(`backend/bin/migrate.php`)는 살아 있으나(`-- @rollback` 블록 · `schema_migrations` 추적), **원격 서버에서만 실행**되고 ST04 는 그 실행을 금지한다.

### BLK-4 · ★만들면 완전한 죽은 스키마가 된다

ST04 는 Controller·API·Handler·Test 를 **전부 금지**한다. 그런데:

- 이 저장소의 **유일한 라이브 테이블 생성 경로**는 핸들러 내부 `ensureTables` 다 → **금지됨**
- 마이그레이션 실행도 금지(`Database 접속`·`Migration 실행` 금지) + 원격에서만 가능

따라서 테이블을 정의해도 **(a) 생성할 주체가 없고 (b) 읽고 쓸 주체가 없다.** 스키마 파일만 저장소에 남고 실제로는 어떤 경로로도 존재하지 못하는 완전한 죽은 산출물이다.

이것은 ST01·ST02·ST03 이 반복 지적했고 사용자가 Option A 로 회피한 결함(`67dee1fe46a` 도달불가 계열)의 재생산이다.

### BLK-5 · 필수 컬럼을 실재 데이터로 채울 수 없다

spec 필수 컬럼 중 `workspace_id`·`principal_type`·`principal_id` 의 실재 축이 부재하다. Workspace 엔티티·멤버십이 없고(ST07 `ABSENT_AXES`), 현행 즐겨찾기 값은 **메뉴 경로 문자열**(`localStorage['g_sidebar_favs']`)이다. 워크스페이스도, 다중 principal 도 개념 자체가 없다.

---

## 2. 기존 스키마 조사 (spec "반드시 먼저 수행")

| 조사 항목 | 실측 |
|---|---|
| Favorites 테이블 존재 | **없음** — `CREATE TABLE ...favorit` / `ensure*Favorit` grep 0건 |
| 마이그레이션 dir | `backend/migrations/` 21개 · 세션 172 정지 |
| 테이블 명명 | 단수 snake_case 도메인 접두(`app_user`·`saved_report`), 복수 혼재 |
| PK 정책 | `INT AUTO_INCREMENT` + 별도 `public_id VARCHAR(64)` — **UUID/ULID PK 관용 없음** |
| Index 명명 | `idx_<약어>_<컬럼들>` / `uq_<약어>_<컬럼>` |
| FK 명명 | **미사용** — 논리 참조(`scope_type`+`scope_id`) 관용 |
| Timestamp | `VARCHAR(32)`/`TEXT` 문자열 (네이티브 DATETIME 아님) |
| Soft Delete | `deleted_at` 관용 **0건** — `status` + 사건 타임스탬프, `is_active`(44파일) |
| Version | 낙관적 락 컬럼 **0건** |
| Enum | `VARCHAR` + `in_array` 화이트리스트 (네이티브 ENUM 미사용) |

spec 의 "동일 Table/Column/Index/Constraint 존재 시 재사용" 지시에 대한 답: **재사용할 기존 즐겨찾기 스키마가 없다**(0건). 동시에 spec 이 요구하는 `deleted_at`·`version`·UUID·FK·네이티브 ENUM 은 **저장소 관용에 존재하지 않는다** — 도입하면 전부 신규 관용 신설이 된다.

---

## 3. 스키마 설계는 이미 준비돼 있다 (중복 작성 안 함)

ST04 에서 스키마를 **재작성하지 않는다**. ST03 이 이미 이식 가능한 완결 설계를 남겼기 때문이다(중복 금지).

**정본: `tools/cwis/navigation/output/favorites-persistence-schema-requirements.json`**

핵심만 옮기면:

- 테이블 `favorite` (단수) · `id INT AUTO_INCREMENT` + `public_id`
- ★**MySQL 8.0 은 부분 유니크 인덱스를 지원하지 않는다** → 이식 대안 = `NULL` 허용 `active_key` + `UNIQUE`(양 엔진 동일 동작). 자연키 복합 UNIQUE 는 Restore 경로와 충돌하여 탈락.
- Soft delete = `status`('ACTIVE'|'REMOVED') + `removed_at` — `deleted_at` 아님(관용 계승)
- `workspace_id` 의도적 제외(엔티티 부재) · `version` 미채택(조건부 UPDATE affected-rows 로 대체)
- **생성 경로 = 마이그레이션 파일이 아니라 `ensureFavoriteTable(PDO, $isDemo)`** — 저장소 정본
- 인덱스: `uq_fav_active` / `idx_fav_owner` / `idx_fav_res` / `idx_fav_tenant`

즉 Option B 가 채택되면 이 설계를 그대로 쓸 수 있고, 구현 형태는 **마이그레이션이 아니라 핸들러 내 `ensureTables`** 다.

---

## 4. 검증 (§Validation · §Git-Diff)

```bash
git status --short   # tracked 변경: 산출물 2건뿐
git diff --check     # 빈 결과
```

| 검사 | 결과 |
|---|---|
| Migration Syntax | N/A — 마이그레이션 미생성 |
| Rollback 가능 | N/A |
| Duplicate 없음 | **PASS** — `favorite` 테이블 0건, 중복 신설 없음 |
| Naming Convention 일치 | N/A (생성물 없음) |
| Database 접속 | **NOT_EXECUTED** (spec 금지 · 준수) |
| Migration 실행 | **NOT_EXECUTED** (spec 금지 · 준수) |
| §Git-Diff 허용 경로 외 변경 | **없음** — 산출물 2건 전부 `tools/cwis/**`·`docs/**`. `database/`·`migrations/`·`schema/` 무변경(부재) |

---

## 5. 판정과 다음 단계

**BLOCKED (UNNECESSARY).** 사용자 재확정(2026-07-24 "현 결정 유지")에 따라 마이그레이션을 만들지 않았다.

- `FAILED` 아님: Syntax 오류·허용경로 외 수정·기존 변경 손상 **없음**. 규정을 어겨서가 아니라 지켜서 멈췄다.
- `READY` 아님: READY 는 마이그레이션·스키마 완료를 요구하나, 그 산출물은 확정된 결정 하에서 죽은 코드가 된다.

### 권장 · 즐겨찾기 CWIS 계열 종결

UI 프리퍼런스 축(PHASE_3) 잔여는 커밋 `1234a6f0957` 로 해소·운영/데모 배포 완료:

- CAP-04 aria-pressed (이미 해소돼 있었음)
- BACKLOG-1 6개↑ 열람 (스크롤)
- BACKLOG-2 모바일 44×44 터치 타깃
- 부수 선재결함 — 데스크톱 패널 소멸(`flexShrink:0`)

남은 항목은 **BACKLOG-3(드래그 순서)** 뿐이며 요구 미확인으로 의도적 미구현. **신규 Part 로 이동을 권장한다.**

### Option B 피벗 경로 (참고)

즐겨찾기를 기기 간 동기화 회원데이터로 재정의하려면:

```
favorites-persistence-schema-requirements.json  (설계 자산·준비됨)
  → ensureFavoriteTable(PDO, $isDemo)            (마이그레이션 아님)
  → Handlers/Favorites.php                        (spec no-handler 제약 해제 필요)
  → routes.php  (/api 접두 필수)
  → PM\Shared::gate 재사용
```

principal=user 단일축, 기존 localStorage 는 무후퇴 유지 + 클라이언트 최초 로그인 1회 병합(서버 백필 불가).
