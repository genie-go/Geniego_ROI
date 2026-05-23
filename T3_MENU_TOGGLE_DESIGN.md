# T3 — Admin 메뉴 토글 관리 설계 문서

> **작성**: 152차 검수자
> **트랙**: T3 (Admin 메뉴 visibility 관리)
> **상태**: 설계 (구현은 153차+)
> **승인 필요**: 사용자 검토 후 진행

---

## 1. 목적

GeniegoROI 전체 메뉴 (최하위 / 서브아이템 포함) 의 **숨기기 / 펼치기 / 권한별 노출** 을 admin UI 에서 관리.

### 1.1 요구 사항 (사용자 요청)

- 전체 메뉴 트리 visibility 관리 (root → category → item → sub-item)
- super_admin / admin / moderator 3단계 RBAC
- 변경사항 실시간 반영 (페이지 reload 없이)
- 변경 이력 audit log
- 기본 (default) 메뉴 구성 복원 가능
- 다국어 (15개국) 메뉴 라벨 동시 노출 / 검색

### 1.2 비-요구 (Out of Scope, 152차)

- 메뉴 항목 자체의 추가/삭제 (코드 수정 필요, admin UI 범위 외)
- 라우팅 권한 변경 (별도 RBAC 시스템과 분리)
- 사용자별 개인화된 메뉴 (organization 단위 관리만)

---

## 2. 현재 코드 분석 결과 (152차 raw)

### 2.1 메뉴 정의 위치
- `frontend/src/layout/Sidebar.jsx` (705 lines, ~10 groups, ~50 items)
- 각 item 구조:
  ```js
  { to, icon, labelKey: "gNav.*", menuKey: "<category>" | "<category>||<subitem>" }
  ```
- `||` (double-pipe) 는 fine-grained gating 규약

### 2.2 권한 체계 (현재)
- `frontend/src/auth/AuthContext.jsx` → `planMenuAccess[userPlan]` 으로 ACL 매핑
- `canAccess(menuKey)` 함수가 ACL 체크
- Plan 단계: free / demo / starter / growth / pro / enterprise / admin

### 2.3 라우팅
- `frontend/src/App.jsx` 인라인 `<Routes>` (~116 lazy pages)
- 별도 router config 없음

### 2.4 RBAC 보강 필요
- 현재 admin role 1단계만 존재
- **152차 결정**: super_admin / admin / moderator 3단계 확장 필요

---

## 3. 데이터 모델

### 3.1 메뉴 트리 구조 (DB / 백엔드)

```typescript
interface MenuNode {
  id: string;                          // 'marketing.crm.subscribers'
  parent_id: string | null;            // null = root
  label_key: string;                   // 'gNav.crm.subscribers' (i18n key)
  icon: string | null;                 // lucide icon name
  route: string | null;                // '/crm/subscribers'
  menu_key: string | null;             // 'crm||subscribers' (legacy ACL)
  order: number;                       // 정렬 순서
  visibility: VisibilityState;         // 아래 enum
  required_plan: PlanTier | null;      // 'pro' | 'enterprise' | null
  required_role: AdminRole | null;     // 'super_admin' | 'admin' | 'moderator' | null
  is_admin_only: boolean;              // true = admin 영역 (구독자 미노출)
  created_at: timestamp;
  updated_at: timestamp;
}

enum VisibilityState {
  visible = 'visible',     // 노출
  hidden = 'hidden',       // 숨김 (admin 외 사용자에게)
  disabled = 'disabled',   // 비활성화 (회색, 클릭 안 됨)
}

enum PlanTier {
  free, demo, starter, growth, pro, enterprise, admin,
}

enum AdminRole {
  super_admin,  // 모든 권한
  admin,        // 메뉴 visibility 변경 가능, RBAC 변경 불가
  moderator,    // 메뉴 보기만 가능, 변경 불가
}
```

### 3.2 메뉴 변경 이력 (audit log)

```typescript
interface MenuAuditLog {
  id: uuid;
  menu_id: string;
  action: 'visibility_change' | 'plan_change' | 'role_change' | 'order_change' | 'reset';
  old_value: any;
  new_value: any;
  changed_by: string;        // user_id
  changed_by_role: AdminRole;
  reason: string | null;     // 변경 사유 (선택)
  created_at: timestamp;
}
```

### 3.3 default 백업

- 시스템 기본 메뉴 구성을 `menu_defaults` 테이블 또는 코드 상수로 보관
- "기본 복원" 액션 시 현재 menu_tree 를 이 default 로 reset
- reset 액션은 super_admin 만 가능

---

## 4. RBAC Matrix

| 작업 | super_admin | admin | moderator | 구독자 |
|---|---|---|---|---|
| 메뉴 트리 조회 | ✅ | ✅ | ✅ | ❌ (구독자는 자기 메뉴만) |
| visibility 토글 | ✅ | ✅ | ❌ | ❌ |
| 메뉴 순서 변경 | ✅ | ✅ | ❌ | ❌ |
| required_plan 변경 | ✅ | ✅ | ❌ | ❌ |
| required_role 변경 | ✅ | ❌ | ❌ | ❌ |
| default 복원 | ✅ | ❌ | ❌ | ❌ |
| audit log 조회 | ✅ | ✅ | ✅ | ❌ |
| audit log 삭제 | ❌ | ❌ | ❌ | ❌ (불가능, 시스템 유지) |
| admin 역할 할당 / 박탈 | ✅ | ❌ | ❌ | ❌ |

---

## 5. API 컨트랙트

### 5.1 메뉴 조회

```
GET /api/admin/menu-tree
Response 200:
{
  "tree": MenuNode[],
  "defaults_available": boolean,
  "last_modified": timestamp
}
```

### 5.2 메뉴 단일 항목 수정

```
PATCH /api/admin/menu-tree/:menu_id
Body:
{
  "visibility"?: VisibilityState,
  "order"?: number,
  "required_plan"?: PlanTier | null,
  "required_role"?: AdminRole | null,  // super_admin only
  "reason"?: string
}
Response 200:
{
  "node": MenuNode,
  "audit_log_id": uuid
}
Response 403:
{ "error": "insufficient_role", "required": "super_admin" }
```

### 5.3 일괄 변경 (drag-drop reorder)

```
POST /api/admin/menu-tree/reorder
Body:
{
  "changes": [
    { "menu_id": string, "new_order": number, "new_parent_id"?: string }
  ],
  "reason"?: string
}
Response 200:
{
  "updated": MenuNode[],
  "audit_log_ids": uuid[]
}
```

### 5.4 default 복원

```
POST /api/admin/menu-tree/reset
Body: { "confirm": "RESET_MENU_TREE", "reason": string }
Response 200:
{
  "restored_count": number,
  "audit_log_id": uuid
}
Response 403: super_admin 외
```

### 5.5 audit log 조회

```
GET /api/admin/menu-tree/audit-log?from=...&to=...&menu_id=...&page=...
Response 200:
{
  "logs": MenuAuditLog[],
  "total": number,
  "page": number
}
```

### 5.6 구독자 메뉴 조회 (기존 ACL 보강)

```
GET /api/menu-tree         (인증 사용자)
Response 200:
{
  "tree": MenuNode[]       // visibility=visible + plan/role 통과 항목만
}
```

---

## 6. Frontend 구현

### 6.1 신규 파일

```
frontend/src/auth/plans.js                  ← 152차 W1 완료
frontend/src/auth/adminRoles.js              ← 신규: AdminRole enum + helpers
frontend/src/context/MenuVisibilityContext.jsx  ← 신규: 메뉴 tree provider
frontend/src/pages/admin/MenuManager.jsx     ← 신규: T3 main UI page
frontend/src/components/admin/MenuTree.jsx   ← 신규: tree component (drag-drop)
frontend/src/components/admin/MenuAuditLog.jsx  ← 신규: audit log viewer
frontend/src/components/admin/MenuFilters.jsx   ← 신규: 검색/필터
frontend/src/api/menuTree.js                 ← 신규: API client
```

### 6.2 Sidebar.jsx 변경 (최소)

- 기존 인라인 메뉴 정의 → `useMenuVisibility()` hook 으로 동적 로드
- fallback: API 실패 시 기존 하드코딩 메뉴 (degraded mode)

### 6.3 라우팅 추가 (App.jsx)

```jsx
const MenuManager = lazy(() => import('./pages/admin/MenuManager.jsx'));
// ...
<Route
  path="/admin/menu-manager"
  element={<AdminGuard minRole="admin"><MenuManager /></AdminGuard>}
/>
```

### 6.4 i18n 라벨 (15개국 동시)

T3 신규 라벨 namespace: `admin.menuManager.*`
- 152차 이후 정책: 신규 추가 라벨은 15개국 동시 추가
- 마스터 ko.js 에 정의 → 153차 동기화 도구로 14개 locale 일괄 생성
- 의도된 영어 라벨 (예: "Admin", "Manager") 은 모든 locale 영문 동일

---

## 7. 구현 단계 (153차+)

### Phase A (153차): 인프라 + 데이터 모델
- [ ] DB 마이그레이션 (menu_tree, menu_audit_log 테이블)
- [ ] 백엔드 API 6종 구현
- [ ] `plans.js` / `adminRoles.js` / `MenuVisibilityContext` scaffold
- [ ] 기존 Sidebar 메뉴 → DB seed 데이터로 마이그레이션
- [ ] 단위 테스트 (RBAC matrix 전체)

### Phase B (154차): UI 구현
- [ ] MenuManager page 기본 layout
- [ ] MenuTree 컴포넌트 (read-only)
- [ ] visibility 토글 (basic)
- [ ] audit log viewer
- [ ] 통합 테스트 (admin 로그인 → 메뉴 변경 → 즉시 반영 검증)

### Phase C (155차): 고급 기능
- [ ] drag-drop 순서 변경
- [ ] default 복원
- [ ] 검색 / 필터
- [ ] 일괄 변경 (체크박스 multi-select)
- [ ] 15개국 라벨 동시 노출

### Phase D (156차): RBAC 강화
- [ ] super_admin / admin / moderator 분리
- [ ] AdminGuard 컴포넌트
- [ ] role 할당 UI (super_admin 만)
- [ ] role 변경 이력

---

## 8. 위험 / 의사 결정 필요

| 항목 | 위험 | 152차 결정 사항 |
|---|---|---|
| **백엔드 API 6종 부재** | 신규 endpoint 6개 필요 | 백엔드 팀 의뢰 (T3 Phase A 진입 전) |
| **DB 스키마 변경** | 마이그레이션 필요, 기존 데이터 영향 | 단계적 마이그레이션 (seed 후 cutover) |
| **default 복원의 정확성** | 코드 변경 시 default 도 함께 갱신 필요 | code review 절차 마련 (155차) |
| **degraded mode** | API 실패 시 메뉴 표시 보장 | Sidebar 하드코딩 fallback 유지 |
| **moderator 권한 정의 모호** | "보기만" 이 너무 제한적 | 향후 확장 가능 — 일단 read-only 로 출발 |
| **메뉴 캐싱 정책** | 빈번한 API 호출 부담 | localStorage + ETag 캐싱 (153차 구현) |
| **audit log 영구 보관** | 데이터 증가 | 1년 이상 데이터는 cold storage 이전 정책 (별도) |

---

## 9. 다음 단계

- [ ] **사용자 검토**: 본 설계 문서 승인 / 수정 요청
- [ ] **백엔드 팀 의뢰**: API 컨트랙트 6종 (5장 기반)
- [ ] **DB 팀 의뢰**: 스키마 마이그레이션 (3장 기반)
- [ ] 양쪽 답변 받으면 153차 Phase A 진입
