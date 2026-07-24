# CWIS Part004-04 ST07-02 — Favorites Frontend API Client & Types

| 항목 | 값 |
|---|---|
| 명세 | `CWIS-P004-U04-WS01-SP02-TK002-ST07-02` |
| **판정** | **BLOCKED** (호출할 서버 엔드포인트 부재) |
| 기준 리비전 | `c827b6f2afa` |
| 코드 생성 | **0건** (죽은 코드 회피) |
| 생성 산출물 | 본 보고서 + `favorites-api-client-summary.json` |

---

## 0. 요약

ST07-02 는 `createFavorite()`·`toggleFavorite()`·`listFavorites()` 등 **HTTP API 클라이언트**를 만들고 "**API Contract와 100% 일치**"시키라고 한다. 그런데 그 Contract 의 대상 엔드포인트가 **서버에 존재하지 않는다**(실측):

```
routes.php favorites 라우트 : 0
backend/src/Handlers/Favorites.php : 없음
favorite 테이블 : 0
favorites-api-contract.json status : NOT_IMPLEMENTED (Option B 조건부 설계)
현행 Sidebar.jsx API 호출 : 0 (device-local)
```

즉 클라이언트를 만들면 **존재하지 않는 `/api/v427/favorites` 로 요청 → 실행 시 404**. 이는 지난 턴에 제가 ⓑ 경로로 명시한 결과 그대로다:

> ⓑ ST07-02 그대로 진행 — 단 서버 API 부재로 대부분 BLOCKED/NOT_REQUIRED 판정 산출물이 됩니다(**정직히 그렇게 기록**)

당신이 ST07-02 를 보내 ⓑ 를 선택했으므로, 약속대로 **죽은 클라이언트가 아니라 정직한 BLOCKED 판정**을 산출한다.

---

## 1. BLOCKED 근거 4건 (전부 실측)

| # | 근거 |
|---|---|
| **BLK-1** | 호출할 9개 엔드포인트가 서버에 실재하지 않음 (routes.php favorites 0·핸들러 없음·테이블 0) |
| **BLK-2** | `favorites-api-contract.json` 자체가 `NOT_IMPLEMENTED` — 라이브 명세가 아니라 Option B 미래 설계. "100% 일치" 대상이 존재하지 않는 것 |
| **BLK-3** | ★생성 시 도달 가능한 죽은 코드 — 실행하면 404. ST07-01 이 'Favorite API 호출' 축을 BLOCKED 로 판정한 사유와 동일 |
| **BLK-4** | 소비자 부재 — 타입·DTO 매퍼도 죽은 코드. ResourceType(WORKSPACE/PROJECT/DOCUMENT…)·PrincipalType 은 실재 데이터 없는 모델을 인코딩 |

---

## 2. 기존 재사용 대상 조사 (spec 지시 완료)

spec "기존 API Client 재사용" 지시대로 조사했다. 재사용 **준비는 됐으나 호출 대상이 없어 사용 불가**:

| 축 | 실재 | 상태 |
|---|---|---|
| HTTP Client | `services/apiClient.js` (getJson/postJson/patchJson/delJson) | REUSE 준비됨 |
| Auth Interceptor | apiClient 내 Bearer/genie_token 인라인 | REUSE 준비됨 |
| Tenant Context | `X-Tenant-ID` 자동 주입 | 직접 생성 안 함(정책 준수) |
| Workspace Context | 부재 | N/A |
| Type Convention | JavaScript(TS 미사용) → JSDoc typedef | 소비자 부재로 미생성 |

즉 spec 의 "새 axios instance 금지·fetch 직접사용 금지·Token 직접저장 금지·Tenant Header 직접생성 금지"는 **위반할 코드를 아예 안 만들었으므로 전부 자동 준수**된다.

---

## 3. 검증 (§Git Diff · lint)

```bash
git diff --name-only   # 빈 결과(tracked 변경 없음)
git diff --check       # 빈 결과
```

- `npm run lint` = **N/A** (변경 JS 파일 0)
- frontend/·backend/ 무변경 — 산출물 2건 전부 허용경로(`tools/cwis/**`·`docs/cwis/**`)
- API Contract 일치 = N/A (일치시킬 라이브 엔드포인트 없음)

---

## 4. 실 코드를 원한다면 — 두 경로

BLOCKED 은 "아무것도 못 한다"가 아니라 "**이 형태(HTTP 클라이언트)로는 못 한다**"는 뜻이다. 실동작 코드를 원하면:

### ⓐ device-local shim (Option A 범위·실동작)

현행 device-local 로직(`Sidebar.jsx` `useFavorites`)을 재사용 가능한 `favoritesClient` 모듈로 추출 — **localStorage 백엔드**. 소비자(Sidebar) 존재·실동작.

- ★단 spec 은 HTTP 클라이언트를 명세하므로 **이건 다른 것**이다.
- 또한 현행 `useFavorites` 는 이미 잘 동작한다 → 추출은 **선택적**이며 단일 소비자 추상화는 조기 추상화 위험(필요성 게이트). **사용자 명시 요청 시에만.**

### ⓑ Option B (백엔드 선행)

즐겨찾기를 서버 회원데이터로 재결정 → `ensureFavoriteTable` + `Handlers\Favorites` + `routes.php` 구축 → 그다음 이 API Client 가 **실 엔드포인트를 호출**(진짜 코드). contract-first 로 클라이언트를 먼저 짜는 것도 가능하나 **백엔드 구축 확약이 전제**(안 그러면 영구 죽은 코드).

---

## 5. 판정과 다음 단계

**BLOCKED.** 죽은 코드를 만들지 않았다. ⓑ 경로의 예고된 정직한 결과다.

- `READY` 아님: API Client·타입 구현을 요구하나 호출 대상이 없어 죽은 코드가 됨
- `FAILED` 아님: Syntax 오류·허용경로 외 수정·기존 변경 손상 없음

### 다음 단계 예고

ST07-03(Query/State)·04(Toggle)·05(Sidebar)·07(권한/오류)도 대부분 **이미 구현됨(REUSE)** 또는 **API 부재로 BLOCKED/NOT_REQUIRED** 로 수렴한다(ST07-01 재사용판정 참조). 8분할 중 **실질 net-new 는 ST07-06(device-local Reorder) 하나**뿐이며 그마저 BACKLOG-3(요구 미확인) 보류 상태다.

**권장:** 프론트 API 계층은 서버 API 없이는 만들 수 없다. (a) device-local Reorder(ST07-06)만 진행하거나 (b) Option B 재결정으로 백엔드부터 — 둘 중 하나가 실 진행 경로다.
