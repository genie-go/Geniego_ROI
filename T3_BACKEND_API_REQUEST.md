# T3 백엔드 API 의뢰서 — Admin 메뉴 토글 관리

> **작성**: 152차 검수자
> **대상**: 백엔드 팀
> **트랙**: T3 (153차 Phase A 진입 전 답변 필요)
> **상위 문서**: `T3_MENU_TOGGLE_DESIGN.md` (전체 설계)
> **보안 기준**: N-152-A 은행급 초엔터프라이즈

---

## 1. 의뢰 목적

`GeniegoROI` admin UI 에서 전체 메뉴 (root → category → item → sub-item) 의 visibility / 권한 / 순서 관리를 위한 백엔드 API 6종 구현 의뢰.

---

## 2. 데이터 모델

### 2.1 menu_tree

```sql
CREATE TABLE menu_tree (
  id              VARCHAR(255) PRIMARY KEY,         -- 'marketing.crm.subscribers'
  parent_id       VARCHAR(255) REFERENCES menu_tree(id) ON DELETE CASCADE,
  label_key       VARCHAR(255) NOT NULL,            -- 'gNav.crm.subscribers' (i18n key)
  icon            VARCHAR(64),                       -- lucide icon name
  route           VARCHAR(255),                      -- '/crm/subscribers'
  menu_key        VARCHAR(255),                      -- 'crm||subscribers' (legacy)
  display_order   INT NOT NULL DEFAULT 0,
  visibility      VARCHAR(16) NOT NULL DEFAULT 'visible' CHECK (visibility IN ('visible','hidden','disabled')),
  required_plan   VARCHAR(32),                       -- 'free','demo','starter','growth','pro','enterprise','admin'
  required_role   VARCHAR(32),                       -- 'super_admin','admin','moderator'
  is_admin_only   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_tree_parent ON menu_tree(parent_id);
CREATE INDEX idx_menu_tree_order ON menu_tree(parent_id, display_order);
```

### 2.2 menu_audit_log (append-only, N-152-A 감사 요구)

```sql
CREATE TABLE menu_audit_log (
  id              BIGSERIAL PRIMARY KEY,
  menu_id         VARCHAR(255) NOT NULL,
  action          VARCHAR(32) NOT NULL CHECK (action IN (
                    'visibility_change','plan_change','role_change',
                    'order_change','reset','create','delete'
                  )),
  old_value       JSONB,
  new_value       JSONB,
  changed_by      VARCHAR(255) NOT NULL,             -- user_id
  changed_by_role VARCHAR(32) NOT NULL,
  reason          TEXT,
  ip_address      INET,
  user_agent      TEXT,
  request_id      UUID,                              -- correlation
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash_chain      VARCHAR(64)                        -- tamper-evident (이전 row 의 hash 포함)
);

CREATE INDEX idx_audit_menu ON menu_audit_log(menu_id);
CREATE INDEX idx_audit_user ON menu_audit_log(changed_by);
CREATE INDEX idx_audit_time ON menu_audit_log(created_at DESC);

-- N-152-A: 삭제/수정 금지 (append-only)
REVOKE DELETE, UPDATE ON menu_audit_log FROM ALL;
```

### 2.3 menu_defaults (기본 백업)

```sql
CREATE TABLE menu_defaults (
  id              VARCHAR(255) PRIMARY KEY,
  snapshot_data   JSONB NOT NULL,                    -- 전체 트리 JSON
  version         VARCHAR(32) NOT NULL,              -- 코드 release version
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. RBAC

| 작업 | super_admin | admin | moderator | 일반 사용자 |
|---|---|---|---|---|
| 트리 조회 | ✅ 전체 | ✅ 전체 | ✅ 전체 | ✅ visible + 권한 통과만 |
| visibility 토글 | ✅ | ✅ | ❌ | ❌ |
| order 변경 | ✅ | ✅ | ❌ | ❌ |
| required_plan 변경 | ✅ | ✅ | ❌ | ❌ |
| **required_role 변경** | **✅** | **❌** | **❌** | **❌** |
| **default 복원** | **✅** | **❌** | **❌** | **❌** |
| audit log 조회 | ✅ | ✅ | ✅ | ❌ |
| audit log 삭제 | ❌ | ❌ | ❌ | ❌ |
| admin 역할 변경 | ✅ | ❌ | ❌ | ❌ |

---

## 4. API 6종

### 4.1 GET /api/admin/menu-tree (admin / moderator)

```
Authorization: Session cookie (HttpOnly, SameSite=Strict)
Required role: admin or moderator

Response 200:
{
  "tree": [MenuNode...],
  "total_count": 156,
  "defaults_available": true,
  "last_modified": "2026-05-23T19:00:00Z",
  "etag": "abc123"   // 캐싱
}

Response 401: 인증 실패
Response 403: role 불충분
```

### 4.2 GET /api/menu-tree (인증된 모든 사용자)

```
Required: 인증된 세션

Response 200:
{
  "tree": [MenuNode...]    // visibility=visible + plan/role 통과만
}
```

### 4.3 PATCH /api/admin/menu-tree/:menu_id (admin 이상)

```
Body:
{
  "visibility"?: "visible" | "hidden" | "disabled",
  "display_order"?: number,
  "required_plan"?: "free" | "demo" | "starter" | "growth" | "pro" | "enterprise" | "admin" | null,
  "required_role"?: "super_admin" | "admin" | "moderator" | null,  // super_admin only
  "reason"?: string  // 변경 사유 (audit log)
}

Response 200:
{
  "node": MenuNode,
  "audit_log_id": "ulid_..."
}

Response 403:
{ "error": "insufficient_role", "required": "super_admin" }
  // required_role 변경 시 admin 도 403

Response 422:
{ "error": "validation_failed", "details": {...} }
```

### 4.4 POST /api/admin/menu-tree/reorder (admin 이상)

```
Body:
{
  "changes": [
    { "menu_id": "marketing.crm", "new_order": 2, "new_parent_id"?: null }
  ],
  "reason"?: string
}

Response 200:
{
  "updated": [MenuNode...],
  "audit_log_ids": ["ulid_...", ...]
}

Validation:
- N+1 회 호출 방지 — 트랜잭션 내 일괄 처리
- cycle 검출 (parent_id 순환 금지)
```

### 4.5 POST /api/admin/menu-tree/reset (super_admin only)

```
Body:
{
  "confirm": "RESET_MENU_TREE",   // 정확 문자열 매칭, 오타 방지
  "reason": string                // 필수
}

Response 200:
{
  "restored_count": 156,
  "audit_log_id": "ulid_...",
  "snapshot_version": "v1.0.0"
}

Response 403: super_admin 외
Response 422: confirm 불일치
```

### 4.6 GET /api/admin/menu-tree/audit-log (moderator 이상)

```
Query:
?from=2026-01-01&to=2026-05-23
&menu_id=marketing.crm
&action=visibility_change
&changed_by=user_xxx
&page=1&page_size=50

Response 200:
{
  "logs": [MenuAuditLog...],
  "total": 1234,
  "page": 1,
  "page_size": 50,
  "has_more": true
}
```

---

## 5. 보안 요구 사항 (N-152-A 은행급)

### 5.1 인증
- Session cookie (HttpOnly + Secure + SameSite=Strict)
- 세션 timeout: inactivity 30분 + absolute 8시간
- super_admin 의 모든 mutation 작업: 2FA / MFA 필수
- admin / moderator: MFA 권장 (가능하면 강제)

### 5.2 권한 검증
- **모든 endpoint 에서 서버 측 권한 검증** (클라이언트 신뢰 금지)
- 토큰 / 세션 매 요청 검증
- role 변경은 즉시 모든 세션 무효화

### 5.3 입력 검증
- SQL injection 방어 (prepared statement)
- visibility / role / plan 등 enum 값 화이트리스트
- menu_id 길이 / 형식 제한
- reason 최대 1000자

### 5.4 Rate Limit
- 일반 사용자: 60 req/min
- admin / moderator: 300 req/min
- mutation (PATCH / POST): IP 당 30 req/min

### 5.5 감사 로그
- 모든 mutation 100% 기록
- hash_chain: 이전 row 의 hash 포함 (tamper-evident)
- PII 직접 기록 금지 (user_id 만)
- 최소 1년 보존 (KISA), 규제 도메인 7년 (GDPR)

### 5.6 응답 정책
- 4xx 에러 메시지에 내부 구조 노출 금지
- 5xx 는 일반화된 메시지 + request_id 만
- 상세는 서버 로그에만

---

## 6. 백엔드 결정 필요 사항

| 항목 | 의견 / 옵션 |
|---|---|
| **DB 선택** | PostgreSQL (recommended for JSONB + RLS) / MySQL 8+ |
| **menu_id 형식** | dot-notation (`marketing.crm.subscribers`) — 길이 255자 충분? |
| **request_id 발급** | API gateway 단에서 자동? 또는 client 가 X-Request-Id 헤더 제공? |
| **2FA / MFA 도입 상태** | 이미 구현? 신규 구현? |
| **session 인증 인프라** | 기존 cookie 사용? Redis 세션? JWT 추가? |
| **rate limit 구현** | API gateway? Application 레벨? |
| **hash_chain 알고리즘** | SHA-256 + 이전 row hash + payload (구체 사양 백엔드 제안) |

---

## 7. 응답 양식

다음 답변 부탁드립니다 (153차 진입 가능 조건):

- [ ] 데이터 모델 (2장) 승인 / 수정안
- [ ] API 6종 (4장) 사양 승인 / 수정안
- [ ] RBAC (3장) 승인 / 추가 요구
- [ ] 보안 요구 (5장) 구현 가능 / 변경 필요
- [ ] 백엔드 결정 사항 (6장) 답변
- [ ] 예상 구현 기간 / 일정

답변 받으면 153차 Phase A 진입 (DB 마이그레이션 + API scaffold + 단위 테스트).

---

**문서 종결.** 답변까지 frontend 작업은 인프라 준비 (MenuVisibilityContext / adminRoles.js scaffold) 만 선행 가능.
