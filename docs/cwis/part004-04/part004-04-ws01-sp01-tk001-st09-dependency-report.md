# CWIS-P004-U04-WS01-SP01-TK001-ST09 — Dependency & Reuse Mapping 보고서

| 항목 | 값 |
|---|---|
| Specification ID | `CWIS-P004-U04-WS01-SP01-TK001-ST09` |
| Task | Dependency & Reuse Mapping |
| Git Branch | `feat/n236-admin-growth-automation` |
| 기준 Revision | `89368dcc323` (ST08 완료) |
| 실행 스크립트 | `tools/cwis/navigation/scripts/map-favorites-dependencies.php` |
| **상태** | **READY** |
| 레코드 | 1,541 / 1,541 · 의존 엣지 1,728 |
| **순환 의존** | **0** · **끊어진 의존 0** |
| 운영 코드 변경 | **0건** · 명세 금지 경로 변경 **0건** · 상류 산출물 수정 **0건** |

> 보고서 경로는 명세의 `docs/` 하위이면서 ST07·ST08과 동일한 `docs/cwis/part004-04/`에 두었다.

---

## 1. 요약

```
Layer     Package 653 · Frontend 410 · Database 193 · Test 158 · Application 73
          Infrastructure 21 · Shared 10 · Domain 8 · API 4 · Unknown 11

Reuse     NONE 1,306 · LOCAL 196 · MODULE 30 · GLOBAL 7 · USER 2
          WORKSPACE 0 · PROJECT 0  ← 축 자체가 부재(아래 §5)

Impact    LOW 1,310 · MEDIUM 51 · VERY_HIGH 45 · HIGH 17 · NONE 103 · UNKNOWN 15

Dep Type  DEPENDS_ON 984 · IMPORTS 608 · UNKNOWN 100 · WRITES 21 · AUTHORIZES 12 · ROUTES_TO 3
Dep Level BUILDTIME 1,451 · TEST 147 · OPTIONAL 100 · DIRECT 15 · RUNTIME 15

재사용 후보 28 · 수동 검토 82
```

---

## 2. ★핵심 결론 — 즐겨찾기는 서버에 대한 의존이 **하나도 없다**

`useFavorites`(FAV-NRM-001391)에서 나가는 **실제 의존은 단 하나**다:

```
useFavorites --DEPENDS_ON(BUILDTIME)--> file:frontend/src/layout/sidebar.jsx
```

API·Application·Domain·Database 계층으로 나가는 실의존은 **0건**이다. 즉 즐겨찾기는 브라우저 안에서 완결되며, **서버는 사용자의 즐겨찾기 존재 자체를 모른다**. ST08이 "서버 계층 증거축 0"으로 판정한 것이 의존성 그래프에서도 그대로 재확인됐다.

### 착시 경고 — 계층을 넘는 21개 엣지는 의존이 아니다

`useFavorites`에는 `backend/src/Handlers/OnsiteCro.php`, `Reports.php`, `saved_report` 테이블로 향하는 엣지가 20개 더 있다. 그래프만 보면 **프런트엔드 훅이 백엔드 핸들러에 의존하는 것처럼 보인다.**

전부 ST07의 `SEMANTICALLY_RELATED`(이름 유사성 — `bookmark`/`saved`) 관계다. 본 Step은 이들을 **`dependency_type=UNKNOWN` + `dependency_level=OPTIONAL_DEPENDENCY`**로 격리했고, 검증기가 **100건 전부가 그렇게 표시됐는지** 기계로 확인한다.

**후속 Step은 `OPTIONAL_DEPENDENCY`를 반드시 필터링해야 한다.** 걸러내지 않으면 "즐겨찾기가 백엔드와 얽혀 있다"는 정반대 결론이 나온다.

---

## 3. ★재사용 판정을 팬인 실측으로 교정 (MODULE 507 → 30)

첫 실행에서 `MODULE` 재사용이 **507건**으로 나왔다. 원인은 `DEFINED_IN`(파일이 자기 내용물을 담는 포함 관계)을 팬인으로 센 것이다 — 즉 **"파일이 자기 자신의 내용물에 의해 재사용된다"**는 무의미한 계산이었다.

→ 재사용 판정용 팬인을 **소비 엣지**(`IMPORTS`·`CALLS`·`USES`·`AUTHORIZES`·`ROUTES_TO`·`IMPLEMENTS`·`WRITES` 등)로만 한정했다.

| | 교정 전 | 교정 후 |
|---|---|---|
| GLOBAL | 19 | **7** |
| MODULE | 507 | **30** |

교정 후 값은 실물과 일치한다 — `react` 222 · `path` 203 · `react-router-dom` 73 · `ssh2` 58. 검증기가 **소비 엣지 기준 팬인을 전건 독립 재계산**해 대조한다.

레코드에는 두 값을 모두 보존했다: `fan_in`(실제 소비자) / `fan_in_all_references`(포함 관계 포함 총 참조).

---

## 4. ★FILE 레코드에 붙던 틀린 사유 교정

전파 분류(ST08) 때문에 500여 개 FILE 레코드가 `PACKAGE_ONLY`로 분류돼 있었고, 그대로 패키지 규칙을 타면서 **`frontend/src/pages/*.jsx` 같은 소스 파일에 "외부 패키지 — 사용처 0건 실측"**이라는 사유가 붙었다. 값은 우연히 그럴듯했지만 근거 문장이 거짓이었다.

FILE 전용 규칙을 앞에 두어 정정했다:

- **Reuse** = `NONE` / *"파일은 재사용 단위가 아니다 — 재사용 여부는 이 파일이 담은 N개 레코드에서 개별 판정한다"*
- **Impact** = 클러스터 소속이면 `MEDIUM`(직접 수정 대상), 아니면 `LOW` / *"즐겨찾기 스코프에서 이 파일이 기여하는 것은 … 레코드뿐 — **파일 자체의 중요도 평가가 아님**"*

영향도는 "파일이 얼마나 중요한가"가 아니라 **"즐겨찾기를 바꿀 때 영향을 받는가"**이며, 그 구분을 사유에 명시했다.

---

## 5. WORKSPACE / PROJECT 재사용 0건 — 분석 누락이 아니라 축의 부재

명세는 재사용 등급에 `WORKSPACE`·`PROJECT`를 요구하지만 결과는 **둘 다 0**이다.

이는 ST07이 `NavigationContext::ABSENT_AXES`로 확정한 사실 때문이다 — 이 저장소에는 **Workspace·Project 엔티티와 멤버십 행이 존재하지 않는다**(`WorkspaceState`는 `tenant_kv` 키-값 저장소일 뿐이다). 존재하지 않는 축에 레코드를 배정하는 것은 날조이므로 배정하지 않았고, `absent_reuse_levels`와 그 사유를 통계에 명시했다. 검증기가 **0건 + 사유 기록**을 함께 강제한다.

---

## 6. 재사용 후보 28건 — 신규 즐겨찾기가 실제로 올라탈 수 있는 것

### 6-1. Shared 계층 10건 — 서버 API를 만든다면 그대로 재사용

```
PM\Shared::gate($req,$resp,$minRole)          ★외부 협업자 Default Deny 포함
plan_menu_access + planMenuPolicy(MENU_MIN_PLAN)
body_parsing → cors → api_key_auth → rbac → rate_limit → tenant_injection → error_middleware
api_key_auth_or_session_bypass
```

**즐겨찾기 API를 새로 만들 때 인증·권한·테넌트 주입은 한 줄도 새로 짤 필요가 없다.** 다만 `PM\Shared::gate`를 쓰면 CWIS Part003이 걸어둔 guest/partner Default Deny가 자동 적용되므로, 외부 협업자에게 즐겨찾기를 허용할지 **의도 확인이 선행**되어야 한다(해당 레코드 `manual_review=true`).

### 6-2. Package 계층 7건 (전부 GLOBAL)

`react` · `react-dom` · `react-router-dom` · `recharts` · `path` · `acorn` · `ssh2`
→ **신규 의존성 추가 없이** UI를 구성할 수 있다.

### 6-3. Frontend 4건 — Replace가 아니라 Extend 대상

| 레코드 | Reuse | 의미 |
|---|---|---|
| `useFavorites` | **USER** | 기존 즐겨찾기 훅 — 확장 대상 |
| `useRecentVisits` | **USER** | 동일 패턴(경로만 저장 후 재해석)의 참조 구현 |
| `QuickAccessPanel` | LOCAL | 즐겨찾기 UI |
| `toggleBookmark` | LOCAL | 형제 구현(CaseStudy) |

`USER` 등급 2건은 `device_local_only=true` + `storage_key`를 실측 근거로 부여했고, 검증기가 사유에 그 근거가 들어 있는지 확인한다.

### 6-4. Database·Test 7건

감사 테이블 `menu_audit_log`·`pm_audit_log`와 그 마이그레이션 2건(즐겨찾기 변경 감사에 재사용 가능), 그리고 **인메모리 SQLite 픽스처 3종**(`navigation_context_selftest.php`·`navigation_registry_selftest.php`) — 표준 테스트 러너가 없는 이 저장소에서 즐겨찾기 테이블 검증에 그대로 전용할 수 있다.

---

## 7. Impact — 명세 고정표를 그대로 적용

| 등급 | 수 | 구성 |
|---|---|---|
| **VERY_HIGH** | 45 | ENTITY 21 · MIGRATION 21 · CONTROLLER 3 |
| **HIGH** | 17 | 공유 인프라 + ROUTE·POLICY 증거축 |
| MEDIUM | 51 | 프런트엔드 계층 + 즐겨찾기 구현 파일 |
| LOW | 1,310 | 테스트 · 패키지 사용처 · 스코프 밖 파일 |
| NONE | 103 | 즐겨찾기 무관 |
| UNKNOWN | 15 | 판정 근거 부족 — 추측하지 않음 |

팬인은 **근거로만** 첨부했고 등급을 임의 승격하지 않았다. 검증기가 *"VERY_HIGH는 핵심 증거축만"*과 그 **역방향**(*"핵심 증거축은 전부 VERY_HIGH"*)을 모두 확인해 규칙 적용의 일관성을 강제한다. `VERY_HIGH` 45건은 전부 `manual_review=true`다.

---

## 8. 순환 의존 0 · 끊어진 의존 0

- **순환**: `OPTIONAL_DEPENDENCY`를 제외한 그래프에서 DFS 수행 → **0건**. 검증기가 독립 DFS로 재탐지해 대조한다.
- **끊어진 의존**: 존재하지 않는 레코드를 가리키는 엣지 **0건**. 추가로 *"라우트가 실존하지 않는 컨트롤러 파일을 가리키는 경우"*를 의미적 broken으로 별도 탐지했으나 이 역시 **0건**이다.

즐겨찾기 그래프는 **비순환이며 참조 무결성이 완전하다**. 신규 구현이 기존 그래프를 깨뜨릴 구조적 위험은 없다.

---

## 9. 검증 결과 — 58/58 통과

| 영역 | 검증 |
|---|---|
| 커버리지 | 3개 맵 전부 1,541건 · ST08 전건 커버 · ID 집합 동일 |
| **필수 필드** | **Layer·Reuse·Impact 공백 0건** · 3종 Enum 준수 · `dependency_level` Enum · 사유 15자 이상 |
| **참조 무결성** | **`dependency_targets`/`sources` 전부 실존** · 엣지 endpoint 실존 · 자기참조 0 · ID 고유·패턴 |
| 재계산 대조 | targets/sources를 **엣지에서 독립 재계산**해 전건 일치 |
| **팬인 실측** | **소비 엣지 기준 팬인 전건 독립 재계산 일치** |
| Reuse 규칙 | GLOBAL은 소비 모듈 2종 이상 실증 · USER는 device-local 근거 실증 · FILE은 재사용 단위 아님 |
| 부재 처리 | WORKSPACE/PROJECT 0건 + 부재 사유 기록 강제 |
| Impact 규칙 | VERY_HIGH ↔ 핵심 증거축 **양방향** 일치 · VERY_HIGH는 수동검토 |
| 순환·끊김 | 독립 DFS 재탐지 · 플래그 정합 |
| 착시 차단 | `SEMANTICALLY_RELATED` 100건 전부 OPTIONAL+UNKNOWN 표시 확인 |
| 통계 | layer·impact·reuse 통계 독립 재계산 일치 · 후보/GLOBAL/MODULE 수 일치 |
| 무결성 | 허용 경로 외 변경 0 · **명세 금지 경로 무변경** · 상류 산출물 수정 0 |
| JSON | 4개 산출물 VALID |

---

## 10. 생성 산출물

```
tools/cwis/navigation/output/favorites-dependency-map.json
tools/cwis/navigation/output/favorites-reuse-map.json
tools/cwis/navigation/output/favorites-impact-map.json
tools/cwis/navigation/output/favorites-dependency-summary.json
tools/cwis/navigation/scripts/map-favorites-dependencies.php
docs/cwis/part004-04/part004-04-ws01-sp01-tk001-st09-dependency-report.md
```

---

## 11. ST10으로 넘기는 확정 사실

1. **즐겨찾기의 서버 실의존 0** — 그래프상 브라우저에서 완결. `useFavorites`의 유일한 실의존은 자기 소스 파일
2. **재사용 후보 28건** — 인증·미들웨어 10, 전역 패키지 7, 프런트엔드 4, 감사·테스트 7
3. **인증·권한은 새로 짤 필요 없음** — 단 `PM\Shared::gate` 사용 시 외부 협업자 Default Deny가 자동 적용됨(의도 확인 필요)
4. **순환·끊김 0** — 구조적 위험 없음. 신규 구현은 그래프를 확장하기만 하면 됨
5. **WORKSPACE·PROJECT 재사용 축은 존재하지 않음** — 협업 범위 즐겨찾기를 설계하려면 **엔티티 신설이 선행 조건**
6. **`OPTIONAL_DEPENDENCY` 100건은 반드시 필터링** — 이름 유사성일 뿐 의존이 아님
7. **VERY_HIGH 45건이 변경 위험 지점** — ENTITY 21·MIGRATION 21·CONTROLLER 3

**상태: READY** — ST10 Gap Analysis 입력으로 사용 가능.
