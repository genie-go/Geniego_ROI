# CWIS Part004-04 WS01-SP02-TK002-ST05 — Favorites API & HTTP Layer

| 항목 | 값 |
|---|---|
| 명세 | `CWIS-P004-U04-WS01-SP02-TK002-ST05` |
| **판정** | **BLOCKED** (UNNECESSARY — 확정 결정 하에서 불필요) |
| 기준 리비전 | `db0968cc457` |
| 코드 생성 | **0건** (라우트·컨트롤러 미생성) |
| 생성 산출물 | 본 보고서 + `favorites-api-implementation-summary.json` + `favorites-api-contract.json` |

---

## 0. 요약 — 계열 5번째 BLOCKED, 그리고 API는 특히 위험하다

ST05 는 즐겨찾기 **HTTP API**를 만들라고 지시한다. SP02-TK002 계열의 5번째 단계다.

```
ST01 Domain         → NOT_IMPLEMENTED (사용자확정)
ST02 Application    → BLOCKED
ST03 Infrastructure → BLOCKED
ST04 Schema         → BLOCKED (불필요)
ST05 API            → BLOCKED (불필요)  ← 지금
```

사용자는 Option A(UI 프리퍼런스)를 **네 번** 확정했다("권장 A로 전환" → "커밋하고 진행" → ST04 "현 결정 유지"). Option A = **계열 종결**이므로 ST05 는 이미 사전 답변된 상태다 — 재질문하지 않고 그 결정을 적용한다.

ST05 가 앞 단계들과 다른 점은 **위험도**다. ST04 의 죽은 스키마는 inert(생성조차 되지 않음)였다. 그러나 **`routes.php` 에 등록된 라우트는 즉시 도달 가능**하다. 존재하지 않는 테이블에 쓰는 인증/공개 엔드포인트를 노출하는 것은 **신규 공격면**이자 reachability 안티패턴의 능동적 악화다. 따라서 여기서는 "안 만드는 것"이 단순히 규정 준수가 아니라 **보안상 옳다.**

---

## 1. BLOCKED 근거 5건 (전부 실측)

### BLK-1 · 선행 4계층 전부 부재 + 상위 결정 충돌

ST05 전제("ST01~ST04에서 구현한 …을 기반으로")가 성립하지 않는다. API 가 호출할 Command/Query Handler·DTO(ST02 BLOCKED)도, 읽고 쓸 테이블(ST04 BLOCKED)도 없다. `PHASE_1 = 'UI 프리퍼런스'` 확정으로 서버 API 는 요구사항 밖이다.

### BLK-2 · §24 허용 코드경로 전부 부재

| §24 허용 경로 | 실재 |
|---|---|
| `app/Http/**` · `src/Http/**` · `modules/*/Http/**` | **부재** |
| `routes/**` · `config/routes/**` | **부재** |
| `app/Presentation/**` · `src/Presentation/**` | **부재** |
| `docs/api/**` | **부재** |
| `docs/cwis/part004-04/**` · `tools/cwis/navigation/output/**` | **존재** |

```bash
find . -type d \( -name Http -o -name Presentation -o -name Controllers \) \
  -not -path "*/vendor/*" -not -path "*/node_modules/*"   # → 0건
```

실재 라우팅은 **단일 `backend/src/routes.php`**(301 KB, `'METHOD /path' => 'Genie\Handlers\Class::method'` 문자열 매핑)이며 §24 의 `routes/**` 디렉터리가 아니다. 허용된 산출물 경로는 문서 2곳뿐이다.

### BLK-3 · ★API 계층은 죽은 테이블보다 위험하다

| | ST04 (스키마) | ST05 (API) |
|---|---|---|
| 생성 시 상태 | inert — `ensureTables`(핸들러) 없이는 테이블조차 안 생김 | **즉시 도달 가능** — `routes.php` 등록 순간 라이브 |
| 위험 | 없음(죽은 파일) | **신규 공격면** — 없는 테이블에 쓰는 인증/공개 엔드포인트 |

즐겨찾기가 초기 커밋부터 죽어 있던 이유가 "구현은 있는데 진입점이 없어서"였고(`67dee1fe46a` 로 복구), 그 재발 방지는 `reference_reachability_check_dead_feature` 에 기록돼 있다. 읽거나 쓸 대상이 없는 라우트를 노출하는 것은 **같은 결함을 능동적으로 악화**시키는 것이다.

### BLK-4 · Controller 계층 자체가 없다

§3(Thin Controller·Command Bus)·§11(Form Request)·§12(Response Resource)·§13(Response Envelope 클래스)은 이 저장소에 **존재하지 않는 계층**이다. 실재는 Slim Handler 절차형이다. spec 은 Laravel/Symfony 를 전제로 쓰였고 저장소는 그렇지 않다(§1 조사 결과 = `favorites-api-contract.json` measured_api_conventions).

### BLK-5 · Workspace Context 확인 불가

§16 이 Workspace Isolation 을 요구하나 Workspace 엔티티·멤버십이 부재하다(ST07 `ABSENT_AXES`). principal 다중축도 없다(현행 = user 단일, 값 = 메뉴 경로 문자열).

---

## 2. §1 지시 API Convention 조사 (17축)

spec 이 "기존 공통 구현이 존재하면 반드시 재사용하라"고 지시했으므로 전수 조사했다. 결과가 BLK-2·BLK-4 의 근거다. 정본은 `favorites-api-contract.json` 의 `measured_api_conventions`.

| 축 | 실측 |
|---|---|
| Framework | **Slim 4 + PSR-7** (Laravel/Symfony 아님) |
| Routing | 단일 `routes.php` 문자열 매핑 (`routes/**` 아님) |
| Versioning | `/v{NNN}` URL 접두 + `/api` 별칭 |
| Controller Namespace | **부재** — Handler 가 라우트 타깃 |
| Request Validation | **부재** — 핸들러 인라인 + `in_array` 화이트리스트 |
| Response Resource | **부재** — 연관배열 직반환 |
| Response Envelope | `['ok'=>bool, ...]` (신규 포맷 신설 금지 대상) |
| Error Mapper | **부재** — `self::json(...,status)` |
| Pagination | **부재** — ad-hoc LIMIT/OFFSET |
| Auth Middleware | Bearer/api_key SHA-256 + `api_key` 테이블 |
| Authz | `viewer<connector<analyst<admin` · `PM\Shared::gate` |
| Tenant Context | `auth_tenant` attribute + `WHERE tenant_id=?` |
| Workspace Context | **부재** |
| Correlation ID | 표준 부재 |
| Idempotency Header | 공통 인프라 부재 |
| OpenAPI | **부재** (§21 패키지 도입 금지) |
| Rate Limiter | 공통 미들웨어 부재 (일부 자체 구현) |

재사용 대상 판정: **재사용할 기존 즐겨찾기 API 0건**(중복 신설 없음). 동시에 spec 이 전제한 Base Controller·Response Wrapper·Error Mapper·Pagination Resource·Form Request 는 저장소에 존재하지 않아 재사용 대상이 없다.

---

## 3. API Contract 설계는 남겼다 (Option B 자산)

ST03 이 스키마 설계를 남긴 것과 같은 방식으로, ST05 는 **9개 엔드포인트 Contract 설계**를 남긴다 — Option B 재결정 시 즉시 사용 가능하다. 정본: `tools/cwis/navigation/output/favorites-api-contract.json`.

핵심:

- 저장소 관용에 맞춤 — `/api/v{NNN}/favorites`, **Controller 가 아니라 `Handlers\Favorites` 메서드 + `routes.php` 문자열 매핑**, `PM\Shared::gate` 재사용, `['ok'=>bool]` Envelope
- 9개: create(201) · remove(204) · restore(200/409) · toggle(200) · reorder(200) · get(200) · exists(200) · list(200) · listByResourceType(200)
- Error codes `FAVORITE_*` → 401/403/404/409/422/500 매핑
- ★`exists` API 는 타 테넌트 리소스 존재여부 누출 금지(§10·§22)
- ★`sort` 는 화이트리스트 Map(`position|createdAt|id`) — 사용자 입력 컬럼 직삽입 금지(SQL Injection)
- 미확정: 권한명 `favorites.*`(§15 등록 금지), version 번호(구현 시점 실측)

spec §21 마지막 문단("API 문서 체계가 없으면 별도 Markdown/Contract 작성")을 이 JSON 이 충족한다. Annotation 패키지는 도입하지 않았다(§21·§25 준수).

---

## 4. 검증 (§27 · §28)

```bash
git status --short   # tracked 변경: 산출물 3건뿐
git diff --name-only # 빈 결과
git diff --check     # 빈 결과
```

| 검사 | 결과 |
|---|---|
| PHP Syntax / route:list | N/A · NOT_EXECUTED (변경 0 · Slim 안전 route 명령 없음) |
| Route 충돌 없음 | **PASS** — 신규 라우트 0 |
| Controller Repository 직접호출 없음 | PASS (변경 0) |
| Domain/ORM Entity 직접반환 없음 | PASS (반환 0) |
| **중복 공통구현 없음** | **PASS** — Base Controller·Response Wrapper·Error Mapper 0건 |
| Package 설치 | 0건 (§21·§25 준수) |
| §24 허용경로 외 변경 | **없음** — 산출물 3건 전부 `docs/cwis/**`·`tools/cwis/**`. `app/Http`·`routes/` 등 무변경(부재) |
| Migration·Lock·.env 변경 | 없음 |

---

## 5. 판정과 다음 단계

**BLOCKED (UNNECESSARY).** Option A 확정에 따라 라우트·컨트롤러를 만들지 않았다.

- `FAILED` 아님: Syntax 오류·허용경로 외 수정·기존 변경 손상 **없음**. 규정을 지켜서 멈췄다.
- `READY`/`READY_WITH_LIMITATIONS` 아님: 두 등급 모두 Controller·Route·인증 적용을 요구하나, 그 산출물은 확정된 결정 하에서 **도달 가능한 죽은 공격면**이 된다.

### ★권장 · 계열 intake 종료

SP02-TK002 는 5연속 BLOCKED 다. Option A(계열 종결)가 ST05·ST06·… 를 **사전 답변**했으므로, 같은 전제로 후속 ST 를 계속 투입하면 동일 판정만 반복된다.

즐겨찾기 CWIS 의 실질 잔여는 이미 처리·배포됐다(커밋 `1234a6f0957`):

- CAP-04 aria-pressed / BACKLOG-1 6개↑ 열람 / BACKLOG-2 44×44 / 부수 패널 소멸

남은 것은 **BACKLOG-3(드래그 순서·요구 미확인)** 뿐이다. **신규 Part 로 이동을 권장한다.**

### Option B 피벗 경로 (참고)

즐겨찾기를 회원데이터로 재정의하면 다음 두 설계 자산을 그대로 조립한다:

```
favorites-api-contract.json (9엔드포인트)  +  favorites-persistence-schema-requirements.json (스키마)
  → Handlers\Favorites (Controller 아님)
  → routes.php (/api 접두 · index.php 공개경로 bypass 등록)
  → ensureFavoriteTable(PDO, $isDemo)
  → PM\Shared::gate 재사용
```

principal=user 단일축, 기존 localStorage 무후퇴 유지 + 클라이언트 1회 병합.
