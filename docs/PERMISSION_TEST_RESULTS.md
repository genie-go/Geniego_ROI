# PERMISSION_TEST_RESULTS

231차 팀·권한 시스템 검증 결과. (작성 시점: 231차 세션)

## 자동 검증 (로컬, 완료)

| 항목 | 방법 | 결과 |
|---|---|---|
| 프론트 빌드(서비스+콘솔 포함) | `npm run build` | ✅ PASS (✓ built in ~45s, 깨진 import 0) |
| 프론트 빌드(애니 i18n 23키 적용 후) | `npm run build` | ✅ PASS |
| 로케일 15개국 파싱 | dynamic `import()` 15/15 | ✅ OK=15 BAD=0, 신규 키 resolve, 기존 objTitle 무손상 |
| TeamPermissions.php 구조 | 중괄호/괄호/대괄호 균형 | ✅ 0/0/0 (naive) |
| 라우트 등록 | `$custom` 맵 13 + `$register` 13 쌍 | ✅ 쌍 일치(트랩 회피) |
| 핸들러 자동로딩 | PSR-4 `Genie\Handlers\TeamPermissions` → `src/Handlers/TeamPermissions.php` | ✅ 경로 정합 |

## 기능 검증 (데모 시뮬레이션, 로컬 빌드 기준)
teamApi 데모 경로로 다음이 동작하도록 구현(빌드 통과·로직 검토):
- 팀 목록/생성/수정/보관/복구/하드삭제 (localStorage tenant 스코프)
- 팀 권한 매트릭스 저장/로드, 데이터 범위 저장
- 멤버 권한 매트릭스, 팀 배정(team_id) 동기화
- 감사 로그 탭 표시

## 배포 후 검증 (사용자 승인 필요 — 미실행)
다음은 운영/데모 서버 배포 후 수행해야 함(현재 미배포):
- [ ] `php -l TeamPermissions.php / UserAuth.php / routes.php` (서버, PHP 8.1.34) — 로컬 PHP 부재로 미실행
- [ ] 운영 e2e(헤드리스/Invoke-WebRequest):
  - [ ] owner 로그인 → 팀 생성 → 팀명 수정 → 팀 보관/복구
  - [ ] 팀관리자 지정 → 해당 계정 manager 승격 확인
  - [ ] 팀 권한 매트릭스 설정 → 멤버 권한 위임(상한 내) 성공
  - [ ] manager 토큰으로 assignable 초과 위임 시도 → **403 DELEGATION_EXCEEDED** 확인
  - [ ] API 직접 호출(Bearer) 시 권한 검증 작동(viewer/member 쓰기 차단)
  - [ ] 타 테넌트 team/{id} 접근 → 404(격리)
  - [ ] 감사로그에 team_create/team_permissions_set/member_permissions_set 적재 확인
  - [ ] 외부 파트너(team_type=partner_supplier/distribution) scope 격리

## 최종 검증 체크리스트 (스펙) 대응
| 스펙 항목 | 구현 | 비고 |
|---|---|---|
| 최고관리자 팀 추가/팀명 수정/삭제·비활성 | ✅ createTeam/updateTeam/deleteTeam(archive) | |
| 최고관리자→팀관리자 권한 부여 | ✅ putTeamPermissions + assignTeamManager(manager_user_id) | |
| 팀관리자 팀원 등록 | ✅ /auth/team/members(기존, manager 허용) | |
| 팀관리자 미보유 권한 위임 불가 | ✅ DELEGATION_EXCEEDED 서버 강제 | |
| 팀원 부여 메뉴만 접근 | ✅ effective-permissions + 매트릭스 | per-endpoint 집행은 후속(SECURITY_REVIEW §7) |
| API 직접 호출 권한 검증 | ✅ 관리 API 전건 서버 가드 | |
| 외부 대행사/공급/유통 파트너 데이터 격리 | ✅ team_type + data_scope | 런타임 집행 후속 |
| 모든 변경 Audit Log | ✅ logAudit → auth_audit_log | |
| 중복 메뉴/페이지/API 미생성 | ✅ DUPLICATE_PERMISSION_AUDIT | |
| React/Vite 빌드 성공 | ✅ | |
| PHP 문법 통과 | ⏳ 서버 lint(배포 시) | 로컬 PHP 부재 |
