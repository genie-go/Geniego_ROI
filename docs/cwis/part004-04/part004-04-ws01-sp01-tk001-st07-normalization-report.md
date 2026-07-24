# CWIS-P004-U04-WS01-SP01-TK001-ST07 — Search Result Normalization 보고서

| 항목 | 값 |
|---|---|
| Specification ID | `CWIS-P004-U04-WS01-SP01-TK001-ST07` |
| 작업명 | Favorites Existing System Analysis — Search Result Normalization |
| Git Branch | `feat/n236-admin-growth-automation` |
| 기준 Git Revision | `74c4b7b3127` (ST06 완료 시점) |
| 실행 스크립트 | `tools/cwis/navigation/scripts/normalize-favorites-search-results.php` |
| **상태** | **READY_WITH_LIMITATIONS** |
| 운영 코드 변경 | **0건** |
| 상류(ST02~ST06) 산출물 변경 | **0건** |

---

## 1. 입력 상태 (§4·§59)

| 상태 | 건수 |
|---|---|
| AVAILABLE | 23 |
| EMPTY_VALID | 8 |
| MISSING_REQUIRED | **0** |
| MISSING_OPTIONAL | **0** |
| INVALID_JSON | **0** |
| SCHEMA_MISMATCH | **0** |

**31개 입력 전부 존재·유효**, 핵심 5개 도메인 Raw Result 전부 AVAILABLE. 원본 레코드 합계 **1,102건**.

`EMPTY_VALID` 8건은 손상이 아니라 **탐색 결과가 실제로 0인 인벤토리**다 — backend symbol, frontend api_call, ORM mapping, constraint, controller, request, response, openapi. 이는 Task001의 핵심 결론(즐겨찾기 백엔드 구현 부재)을 그대로 반영한다.

### Source Revision 정합성 (§58)

`PARTIAL_MATCH` — ST02~ST06이 순차 커밋되어 리비전이 5개다.

```
423e9e16db33 · 817c29681204 · 98ee8c4fe8a0 · b4bb7503a47a · eef2c555883c
```

**BLOCKED로 판정하지 않은 근거는 추정이 아니라 실측이다.** 최초~최종 리비전 간 `git diff --name-only` 결과가 `tools/`·`docs/` 두 트리로만 한정됨을 확인했다 — 운영 소스(backend/frontend/routes/composer/package)는 그 구간에서 한 줄도 변하지 않았다. 명세 §58의 *"파일 변경 범위가 검색 산출물에만 한정됨"* 조건을 충족하므로 `READY_WITH_LIMITATIONS`로 진행했다. 리비전은 자동 수정하지 않고 `favorites-normalization-input-status.json`에 사유와 함께 기록했다.

---

## 2. 정규화 결과

```
원본 1,102  →  정규화 1,541
              ├─ 원본 ID 보유    957
              └─ 파생(합성)      584
   병합 이벤트 633 · 관계 1,728 · 충돌 1 · 제외 0 · 고아 24 · 마스킹 0
```

**정규화 수(1,541)가 원본 수(1,102)보다 많은 이유를 추정치가 아닌 실측 카운터로 분해했다.** 초안에서는 `merged_duplicates_estimate = max(0, 입력 − 출력 − 제외)`라는 뺄셈 추정값을 썼는데, 파생 레코드 때문에 음수가 되어 0으로 잘려 **"병합 0건"이라는 거짓 정상값**을 만들었다. 저장소 원칙(임의 숫자 금지·산출 불가 시 명시)에 따라 `$put()` 내부 실측 카운터 `merge_events`와 `derived_records`로 교체했다.

파생 584건 = 경로에서 합성한 `FILE` 엔티티, 라우트가 가리키는 Controller Method, 마이그레이션이 참조하는 테이블. 원본 인벤토리에 행이 없을 뿐 근거는 전부 `evidence_refs`로 추적된다.

### Entity Type별 (§65)

| Entity | 수 | Entity | 수 |
|---|---|---|---|
| DEPENDENCY_USAGE | 608 | DATABASE_TABLE | 21 |
| FILE | 539 | MIGRATION | 21 |
| TEST_CASE | **143** | MIDDLEWARE | 10 |
| RAW_MATCH | 125 | DATABASE_COLUMN | 6 |
| PACKAGE | 45 | GAP_CANDIDATE | **6** |
| — | | API_ENDPOINT · SYMBOL · TEST_ASSET | 각 3 |
| — | | COMPONENT · STATE_UNIT · RISK_CANDIDATE | 각 2 |
| — | | CI_JOB · DATABASE_INDEX | 각 1 |

### Source Domain별 / Classification별

| Domain | 수 | | Classification | 수 |
|---|---|---|---|---|
| PACKAGE | 1,105 | | UNKNOWN | 602 |
| TEST | 154 | | PACKAGE_ONLY | 653 |
| FRONTEND | 85 | | TEST_ONLY | 148 |
| DATABASE | 74 | | **FALSE_POSITIVE_CANDIDATE** | **87** |
| BACKEND | 66 | | **DIRECT_IMPLEMENTATION_CANDIDATE** | **22** |
| CROSS_DOMAIN | 27 | | RELATED_INFRASTRUCTURE_CANDIDATE | 21 |
| API | 24 | | GAP_CANDIDATE | 6 |
| CI | 2 | | RISK_CANDIDATE | 2 |

`CROSS_DOMAIN` 27건은 백엔드와 프런트엔드가 같은 파일/키를 공유하는 지점이며, 원본 도메인은 `attributes.original_source_domains`에 보존했다.

### 관계 유형별 (§47)

| 유형 | 수 | 유형 | 수 |
|---|---|---|---|
| DEFINED_IN | 921 | PROTECTED_BY | 12 |
| IMPORTS | 608 | CONTAINS | 7 |
| SEMANTICALLY_RELATED | 100 | REFERENCES | 5 |
| DECLARED_BY | 48 | HANDLES | 3 |
| CREATES | 20 | ALTERS | 1 |

`SEMANTICALLY_RELATED` 100건은 전부 `confidence=LOW`다 — **이름 유사성만으로 만든 관계는 확정 관계가 아니라는 §45·§82 규칙을 기계로 강제**했고, 검증기가 이를 확인한다.

---

## 3. ★수집 누락 2건 발견·정정

작성 중 **집계는 되는데 수집은 안 되는** 조용한 소실을 두 건 발견했다. 명세 §78("입력 Record가 조용히 소실되어서는 안 된다")이 정확히 겨냥한 실패 양상이다.

| 누락 | 실체 | 왜 치명적인가 |
|---|---|---|
| `favorites-middleware-inventory.json` → **`authorization` 2건** | `PM\Shared::gate($req,$resp,$minRole)` · `plan_menu_access + planMenuPolicy` | **ST08 판정에 가장 결정적인 레코드**. 즐겨찾기 API가 실제로 놓일 인증 게이트이며, CWIS Part003이 guest/partner를 PM 리소스 전면 Default Deny로 봉쇄한 사실이 여기에만 기록돼 있다 |
| `favorites-package-test-inventory.json` → **`test_files` 3건** | ST04 시점 셀프테스트 목록 | 배열 키를 `packages`로만 선언해 집계·수집 모두 누락 |

두 건 모두 수집 경로를 추가했고, 검증기가 **`authorization` 게이트 2건의 실재와 각 mechanism 포함 여부를 이름으로 직접 확인**하도록 못박아 재발을 차단했다.

---

## 4. ★병합에 의한 근거 소실 2건 정정

`canonical_key`가 같으면 병합한다는 §44 규칙을 그대로 적용했더니, **키 설계가 부실한 곳에서 서로 다른 판정이 하나로 뭉개졌다.**

### 4-1. 미사용 의존성 4건 → 1건 (근거 3건 소실)

ST06이 찾아낸 미사용 Composer 프로덕션 의존성 4건은 gap_type도 `PACKAGE_DECLARED_WITHOUT_USAGE`로 같고 source_file도 전부 `backend/composer.json`이다. 키를 `gap_type + source_files` 해시로 잡았더니 **4건이 1건으로 병합되고 `php-di`·`phpdotenv`·`illuminate/database`·`monolog` 중 3건의 근거가 사라졌다.**

→ 키 판별자에 `evidence`를 포함하도록 수정. 6/6 복원.

### 4-2. 동적 생성 테스트명 충돌 (1건 소실)

`tools/e2e/scenarios.mjs`의 두 단언이 `정리 실패: DELETE http ${del.s}`라는 **동일한 템플릿 리터럴 이름**을 갖는다(104행·다른 행). 이름 기준 키가 충돌해 143 → 142로 줄었다.

→ 명세 §32가 이미 답을 갖고 있었다: *"Test Name이 동적으로 생성되면 `dynamic:{line-number}`"*. `${`·`%s`·`{{` 보간 패턴을 탐지해 라인 기준 키로 전환. 143/143 복원.

검증기에 **"분석 결과물(Gap/Risk/TestCase)은 원본과 1:1이어야 한다"** 규칙을 추가해 이 부류의 병합을 구조적으로 금지했다.

---

## 5. ★상류(ST04) 파서 결함 1건 — 충돌로 승격

정규화 중 `table:unknown:unknown:if`라는 테이블이 나타났다. 추적한 결과:

```
FAV-DB-MIG-000019
backend/migrations/20260527_171_003_plan_period_pricing.sql
affected_tables = ["plan_period_pricing", "IF"]
```

ST04의 마이그레이션 파서가 **`CREATE TABLE IF NOT EXISTS`의 `IF`를 테이블명으로 추출**했다. 실재하지 않는 테이블이다.

명세 §119가 ST02~ST06 산출물 수정을 금지하므로 **고치지 않고 되돌려 보고**했다:

- 해당 레코드를 `FALSE_POSITIVE_CANDIDATE` + `sql_keyword_false_positive=true`로 표시
- 충돌 `FAV-CFL-000001` / `UPSTREAM_SQL_KEYWORD_AS_TABLE_NAME` 생성, `requires_manual_review=true`
- 관계 confidence를 LOW로 낮추고 "ST08에서 제거 대상" 주석

`IF`/`NOT`/`EXISTS`/`TABLE`/`INDEX` 전체를 상시 탐지하도록 일반화했다.

---

## 6. ★민감정보 오탐 1건 — 자충수 정정

첫 실행에서 마스킹 2건이 발생했다. 추적하니 **내가 만든 합성 ID가 내 보안 패턴에 걸린 것**이었다:

```
source_record_id = "authorization:PM\Shared::gate($req,$resp,$minRole)"
                    ↑ 실제 HTTP 헤더 탐지 패턴 /Authorization\s*:\s*\S{8,}/i 에 매치
```

보안 패턴을 느슨하게 만드는 것은 잘못된 방향이므로 **합성 ID 접두사를 `authz_gate:`로 교체**했다(근본 수정). 최종 마스킹 **0건**, 출력에 민감정보 원문 없음을 검증기가 7패턴으로 독립 확인한다.

이 오탐은 역설적으로 **민감정보 스캐너가 실제로 동작함을 실증**했다.

---

## 7. Alias (§46·§64)

| alias | canonical | 유형 | auto_replace |
|---|---|---|---|
| favourite | favorite | SPELLING_VARIANT | **true** |
| favourites | favorites | SPELLING_VARIANT | **true** |
| bookmark | favorite | SEMANTIC_NEIGHBOR | **false** |
| saved item | favorite | SEMANTIC_NEIGHBOR | **false** |
| pinned item | favorite | SEMANTIC_NEIGHBOR | **false** |

자동 치환 2 · 수동 검토 3. **`auto_replace=false` 항목에는 사유를 필수로 기록**했고 검증기가 강제한다 — 예: *"한국어 '고정'은 대부분 fixed 의미(ST02·ST03 오탐 61건)"*, *"saved_report는 BI 리포트 정의 저장이라 즐겨찾기와 의미가 다르다"*.

`favorite`/`bookmark`가 실제로 병합되지 않았음을 검증기가 ID 교집합으로 확인한다(§45).

---

## 8. 충돌·고아·제외

| 구분 | 수 | 내용 |
|---|---|---|
| 충돌 | **1** | `UPSTREAM_SQL_KEYWORD_AS_TABLE_NAME` (§5 참조) |
| 고아 | **24** | 마이그레이션만 참조하는 무관 테이블 20 · 미사용 Composer 의존성 4 |
| 제외 | **0** | 무효 경로·손상 레코드 없음 |

**오탐 후보 87건은 제외하지 않고 결과에 보존**했다(§87). 검증기가 `exclusion_reason`에 `FALSE_POSITIVE`가 없음과 오탐 레코드 실재를 함께 확인한다.

고아 24건은 삭제하지 않고 `status=ORPHANED`로 유지하며 **전건 사유를 기록**했다 — 미사용 의존성 4건에는 *"Manifest에 선언되었으나 전 소스에서 사용처를 찾지 못함(ST06 실측). 제거 판단은 본 Step 범위 밖"*을 명시했다.

---

## 9. 검증 결과 — 91/91 통과

검증기는 산출물을 신뢰하지 않고 **원본 입력에서 독립 재계산**한다.

| 영역 | 검증 |
|---|---|
| ID (§108) | 4종 고유성 · 패턴 · **순번 연속성** |
| Canonical Key (§109) | 1,541건 전부 고유 · 공백 없음 |
| 관계 (§110·§111·§77) | from/to 실재 · 자기참조 0 · 중복 0 · Enum 준수 · Evidence·Notes 필수 |
| **무손실 (§112)** | **ID 보유 입력 1,022건 전량이 정규화·병합·제외 중 하나로 추적됨 (미추적 0)** |
| 1:1 보존 | Gap 6/6 · Risk 2/2 · TestCase 143/143 · 의존성사용 발생횟수 합 = 670 |
| 통계 (§113) | 배열 수 일치 · Entity/Domain 합계 = 전체 · 파생+원본ID = 전체 · **고아 수 실측 대조** |
| 경로 (§114) | 절대경로·`..`·널바이트·역슬래시 0 · **전 경로 파일 실존 확인** |
| 민감정보 (§115) | 7패턴 독립 재스캔 · 마스킹 0 |
| Enum | 9개 필드 전부 스키마 enum 준수 · 필수 필드 누락 0 |
| 추적성 (§84·§42·§43) | 3필드 전부 빈 레코드 0 · **matched_text 원문 미저장** · Hash 형식 `sha256:[0-9a-f]{32}` |
| 핵심 데이터 실재 | authorization 게이트 2건 · `Shared::gate` · `planMenuPolicy` · e2e·selftest 자산 |
| **결정성 (§82)** | **7개 산출물 전부 2회 실행 해시 동일** |
| Git (§85) | 허용 경로 밖 변경 0 |
| JSON (§81) | 출력 7 + 스키마 3 = **10/10 VALID** |

`--strict` 모드 종료코드 **0**.

### Git Diff 주의사항

`git status`에 `backend/data/returns.sqlite3`가 잡히나 **ST07과 무관하다** — mtime이 `2026-07-22 12:43`로 본 Step(07-24) 이전이고, 본 스크립트는 DB에 연결하지 않는다. 검증기는 "허용 경로 밖 + 스크립트 mtime 이후 변경"만 실패로 처리하고 사전 존재 더티 파일은 참고로만 출력하도록 구분했다.

---

## 10. 제한 사항 (READY_WITH_LIMITATIONS 사유)

1. **Source Revision 5종 혼재** — 변경 범위가 검색 산출물로 한정됨을 실증했으나 `ALL_MATCH`는 아니다.
2. **Optional Inventory 8종이 EMPTY_VALID** — 손상이 아니라 실제 0건이지만, 그만큼 교차 검증 가능한 관계가 적다(Controller·Request·Response·OpenAPI 관계 0건).
3. **Frontend API 호출 0건이라 Endpoint 병합 미검증** — §20의 Frontend↔Backend Endpoint 병합 로직은 구현했으나 실행 표본이 없어 동작을 실증하지 못했다.
4. **ORM Mapping 0건** — 저장소가 raw PDO를 쓰므로 `MAPS_TO` 관계가 생성되지 않았다. 구조적 부재이지 결함이 아니다.
5. **Priority UNKNOWN 1,312건** — 상류 인벤토리 다수가 priority 필드를 갖지 않는다. 본 Step은 임의 승격을 금지(§39)하므로 UNKNOWN을 유지했다.
6. **상류 파서 결함 1건 미해결** — §119 준수를 위해 수정하지 않고 충돌로만 기록했다.

---

## 11. 생성 산출물

**Output 7종**
```
tools/cwis/navigation/output/favorites-normalization-input-status.json
tools/cwis/navigation/output/favorites-normalized-records.json
tools/cwis/navigation/output/favorites-normalized-relationships.json
tools/cwis/navigation/output/favorites-normalization-conflicts.json
tools/cwis/navigation/output/favorites-normalization-aliases.json
tools/cwis/navigation/output/favorites-normalization-statistics.json
tools/cwis/navigation/output/favorites-normalization-exclusions.json
```

**Schema 3종**
```
tools/cwis/navigation/schema/favorites-normalized-record.schema.json
tools/cwis/navigation/schema/favorites-normalized-relationship.schema.json
tools/cwis/navigation/schema/favorites-normalization-conflict.schema.json
```

**Script 1종 / 보고서 1종**
```
tools/cwis/navigation/scripts/normalize-favorites-search-results.php
docs/cwis/part004-04/part004-04-ws01-sp01-tk001-st07-normalization-report.md
```

신규 Composer/NPM 패키지 설치 0. JSON Schema 검증은 기존 Validator가 없어 **최소 PHP·Node 검증으로 구현**했다(§73·§97).

---

## 12. 다음 Step

```
CWIS-P004-U04-WS01-SP01-TK001-ST08
Existing Implementation Classification
```

ST08에 그대로 넘길 수 있는 상태다. 특히 다음 세 가지가 분류의 출발점이 된다:

- **`DIRECT_IMPLEMENTATION_CANDIDATE` 22건** — 즐겨찾기 직접 구현 후보
- **`middleware:authz:*` 2건** — 즐겨찾기 API가 놓일 실제 인증 게이트(PM Default Deny 포함)
- **`FAV-CFL-000001`** — ST08 분류에서 제거해야 할 상류 오탐

본 Step은 최종 분류·재사용 판정·Gap 확정·신규 설계를 일절 수행하지 않았다(§2).
