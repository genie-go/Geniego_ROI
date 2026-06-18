# PERMISSION_SECURITY_REVIEW

231차 팀·권한 시스템 보안 검토.

## 1. 인증/식별
- 모든 `/auth/team/*` 는 세션 토큰(`UserAuth::authedUser`)으로 호출자 식별. 미인증 → 401.
- `tenant_id` = `authedUser().tenant_id`(없으면 `acct_<id>`). **위조 `X-Tenant-Id` 헤더 무신뢰** — 토큰에서 자체 해석.

## 2. 권한 검증 (백엔드 강제 — 프론트 숨김에 의존 안 함)
| 작업 | 서버 가드 |
|---|---|
| 팀 CRUD / 팀 권한 설정 | `isOwnerAdmin`(owner 또는 plan=admin) 아니면 403 |
| 하드 삭제 | `isAdmin` 아니면 403 (+ `?hard=1` 필요) |
| 멤버 권한 위임 | `isManagerAdmin`(owner/manager/admin) 아니면 403 |
| **위임 상한 초과** | manager 요청을 `assignableMap`(팀 권한)과 교집합 검증 → 초과 메뉴/동작 발견 시 **403 `DELEGATION_EXCEEDED`**(위반 목록 반환). 부분 허용분만 클램프 저장 안 함(전건 거부) |

→ "팀관리자 권한 초과 부여 방지" 불변식을 **API 직접 호출 우회 시에도** 서버에서 강제.

## 3. 테넌트/파트너 격리
- 모든 INSERT/SELECT/UPDATE/DELETE 에 `WHERE tenant_id=?`. 타 테넌트 team/멤버/권한 조회·변경 불가.
- 팀관리자 지정·멤버 조회는 `memberInTenant`/`teamById` 로 동일 테넌트 검증.
- 데이터 범위(`data_scope`)로 브랜드/캠페인/창고/파트너 단위 격리 메타 저장 — 외부 파트너(agency/live/supplier/distribution)는 `team_type` + `scope_type=partner/own` 으로 분리.

## 4. 데이터 무결성
- 팀 권한 축소 → 소속 멤버 권한 자동 재클램프(`reclampTeamMembers`) → 권한 상승 잔존 차단.
- 멤버 유효권한 조회 시에도 팀 상한과 한번 더 교집합(`effectiveForUser` clamp) — 저장 후 팀 권한이 줄어도 즉시 반영.
- 트랜잭션: 권한/범위 교체는 `beginTransaction`→`commit`/`rollBack`.
- owner 계정은 강등/권한변경 차단(`roleOf===owner` 가드).

## 5. 감사 (변경 추적)
- 팀 생성/수정/보관/복구/하드삭제, 팀·멤버 권한 설정 전건 `auth_audit_log` 기록(actor/tenant/action/detail/ip/risk).
- 권한 설정·하드삭제 = risk `high`. best-effort(기록 실패가 작업을 깨지 않음).
- **접근 거부 로그**: 위임 초과(`DELEGATION_EXCEEDED`)는 403 응답으로 거부 — 추가로 거부 이벤트 감사 적재는 후속 권장(현재 변경 이벤트 위주).

## 6. 민감정보
- 권한 매트릭스는 메뉴 키·동작 플래그만 저장(PII 없음). 데이터 범위 values 는 대상 식별자(brand_id 등)로 PII 아님.
- 비밀번호/토큰 미취급(멤버 비번은 기존 `UserAuth` 정책: 8자+3종+사전차단).

## 7. 잔여/후속 권장
1. **접근 거부 감사**: 권한 없는 메뉴/동작 접근 시도(런타임)를 별도 `access_denied` 이벤트로 적재.
2. **per-endpoint ABAC 집행**: 현재 fine-grained ACL 은 (a) 팀·권한 관리 API 자체 (b) 프론트 게이트에서 집행. 전 v4xx 비즈니스 엔드포인트로의 데이터범위 자동 집행은 대규모 리트로핏 — 단계적 적용 권장(현재는 plan + team_role + tenant 3중 격리가 1차 방어).
3. **하드삭제 2단계 확인/쿨다운** 및 SIEM 웹훅 연동.
