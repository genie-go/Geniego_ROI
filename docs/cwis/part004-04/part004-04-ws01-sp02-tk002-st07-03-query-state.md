# CWIS Part004-04 ST07-03 — Favorites Query & State Management

| 항목 | 값 |
|---|---|
| 명세 | `CWIS-P004-U04-WS01-SP02-TK002-ST07-03` |
| **판정** | **BLOCKED** (쿼리 라이브러리 부재 + 서버 API 부재) |
| 기준 리비전 | `c827b6f2afa` |
| 코드 생성 | **0건** |
| 생성 산출물 | 본 보고서 + `favorites-query-state-summary.json` + `favorites-query-key-map.json` |

---

## 0. 요약

ST07-03 은 `useFavorites`·`useToggleFavorite` 같은 **쿼리/뮤테이션 훅**과 캐시·Optimistic Update·Workspace 캐시 분리를 요구한다. 이는 ST07-02 API Client 위에 얹히는 계층인데, 그 클라이언트가 BLOCKED 이고 **쿼리 라이브러리 자체가 저장소에 없다**.

ST07-02 보고서에서 이미 예고한 결과다:

> ST07-03(Query/State)도 동일하게 API 부재로 BLOCKED. device-local 은 useState+localStorage 로 이미 충족(쿼리 라이브러리도 없음)

한 가지 정직한 뉘앙스: **device-local 상태 관리는 이미 존재**한다 — `useFavorites` 훅이 `{ favs, toggle, move }` 를 제공하며 ST07-06 에서 reorder 까지 확장했다. 다만 이것은 spec 이 요구하는 **서버 쿼리 캐시 계층과 다른 것**이다.

---

## 1. BLOCKED 근거 4건 (전부 실측)

| # | 근거 |
|---|---|
| **BLK-1** | 쿼리 라이브러리 부재 — TanStack/React Query/SWR/Apollo/RTK Query **0건**. §패키지 설치 금지라 도입 불가. 재사용할 Query Client·Key Factory·Cache Helper 자체가 없음 |
| **BLK-2** | 쿼리가 호출할 서버 API 부재 — ST07-02 BLOCKED(엔드포인트 0). 훅을 만들어도 실행 시 404 = 죽은 코드 |
| **BLK-3** | device-local 은 쿼리/캐시 개념 불성립 — localStorage **동기** 상태라 `isLoading/isFetching/error/refetch/hasNextPage` 가 존재할 수 없음. Optimistic(취소→snapshot→요청→롤백)도 네트워크 요청이 없어 무의미 |
| **BLK-4** | Workspace Cache 분리 대상 부재 — Workspace 엔티티·컨텍스트 없음(§핵심 요구 N/A) |

---

## 2. 이미 존재하는 device-local 상태 관리

spec 이 요구하는 것과 계층은 다르지만, **Option A 범위에서 필요한 favorites 상태 관리는 이미 있다**:

```js
// frontend/src/layout/Sidebar.jsx
useFavorites() → { favs: Set<path>, toggle(path), move(path, dir) }
                 // localStorage 'g_sidebar_favs' · 동기
```

- 소비자: `NavSection`(FavStar 토글) · `QuickAccessPanel`(리스트·재정렬)
- ST07-06 에서 `move`(reorder) 확장 + 브라우저 실측 통과 + `fav:test` 26항

즉 device-local 에서 필요한 "상태 노출"(data=favs, 변경=toggle/move)은 충족돼 있고, spec 이 추가로 요구하는 async 상태·캐시·낙관적 업데이트는 **서버가 없어서 존재할 수 없는** 것이다.

---

## 3. 조건부 설계 자산 (Option B)

ST03(스키마)·ST05(API contract)처럼, ST07-03 도 **Option B 재결정 시 사용할 Query Key 설계**를 남긴다 — 정본 `favorites-query-key-map.json`:

- **4 Query**: `useFavorites`(list) · `useFavorite`(detail) · `useFavoriteExists`(exists) · `useFavoritesByResourceType`
- **5 Mutation**: create(비낙관적·서버 ID) · remove(낙관적·롤백) · restore(conflict 재조회) · toggle(낙관적·action 확정) · reorder(낙관적·INVALID_ORDER 재조회)
- Tenant 는 인증 Context(X-Tenant-ID)에서 분리 → Key 에 미노출. Workspace 는 엔티티 부재라 N/A.

이 설계는 쿼리 라이브러리 도입 + 백엔드 구축이 전제다(현재 둘 다 부재).

---

## 4. 검증

```bash
git diff --name-only   # ST07-03 코드 변경 0 (산출물 json/md 만)
git diff --check       # 빈 결과
```

- lint/typecheck = **N/A** (코드 무변경 · TS 미사용)
- 패키지 설치 = **0** (§준수)
- 허용경로 외 변경 = **없음** — 산출물 3건 전부 `tools/cwis/**`·`docs/cwis/**`
- ★참고: 같은 세션 **ST07-06(device-local reorder)** 변경분(Sidebar.jsx·15 locales·guard)이 워킹트리에 미커밋 공존 — ST07-03 과 무관(별개 파일)

---

## 5. 판정과 다음 단계

**BLOCKED.** 쿼리 라이브러리도 서버 API 도 없어 쿼리/뮤테이션/캐시 계층을 만들 수 없다(만들면 죽은 코드 + 금지된 패키지 설치). device-local 상태는 이미 `useFavorites` 로 존재한다.

- `READY` 아님: Query/Mutation 구현을 요구하나 대상 인프라 부재
- `FAILED` 아님: 허용경로 외 수정·기존 변경 손상 없음

### 다음 ST07 하위

- **ST07-04(Toggle UI)** — 대상 `FavStar` 이미 존재·배포됨(REUSE). 서버 연동은 BLOCKED
- **ST07-05(Sidebar/List)** — `QuickAccessPanel` 이미 존재(REUSE)
- **ST07-07(권한/오류/접근성)** — device-local a11y 는 이미 적용(aria-pressed·44×44·키보드), 서버 권한/오류는 API 부재로 N/A
- **ST07-08(테스트)** — `fav:test` 26항으로 상당 부분 충족

**실 진행 경로**: Option A 범위의 net-new 는 ST07-06(완료)뿐. 나머지는 이미 구현(REUSE) 또는 서버 API 부재(BLOCKED). Option B 재결정(백엔드 선행) 없이는 서버형 스텝을 진행할 수 없다.
