# CWIS Part001 — Implementation Report

> 작성 2026-07-23 · 판정: **COMPLETED_WITH_LIMITATIONS**
> ★교차검증 원칙(feedback_cross_verify_all_commands) 적용: 명세를 맹목 이행하지 않고 실제 스택으로 적응.

## 1. 판정 근거 (왜 COMPLETED_WITH_LIMITATIONS)

- **완료**: 협업 기반(Capability Registry·테넌트별 기능제어·readiness·감사·gap analysis·`/pm` 진입점·협업 홈)을 **저장소 실제 스택(Slim4/PDO)으로 적응 구현**.
- **한계(설계상 의도)**: 명세의 Laravel/artisan/Eloquent-migration/DDD-4계층/Enum/Interface/PHPUnit-Pest/PHPStan-L8 형식은 실 스택 부재로 적용 불가 → 저장소 관례로 대체. MISSING 협업 코어(messaging/document/meeting/whiteboard/presence·양방향 실시간)는 인프라 부재로 **PLANNED 등록만** 하고 실기능은 후속 Part(정직 표기, 위장 없음).

## 2. 교차검증 요약 (명세 전제 vs 실제)

| 명세 | 실제 | 처리 |
|---|---|---|
| Laravel/artisan/Eloquent/Migration | Slim4·PDO·routes.php·ensureTables(172 동결) | 적응 |
| DDD 4계층·Enum·Repository interface | flat Handler·Enum 0개(CCIS P005) | static 클래스+const 배열 |
| PHPStan L8·PHPUnit/Pest | 테스트러너 없음 | php -l + 빌드 + 배포검증 |
| `/api/v1/pm/collaboration` | `/vNNN/...`+`/api` 이중등록 | `/v425/pm/collaboration/*` |

## 3. 신규/변경 파일

**신규**:
- `backend/src/Handlers/PM/Collaboration.php` — Capability Registry 핸들러(`PM\Shared` 확장). 2테이블 자가치유+시드, 5 엔드포인트.
- `frontend/src/pages/CollaborationHome.jsx` — 협업 홈(readiness+capability 상태·관리자 토글).
- `docs/cwis/part001-gap-analysis.md`, `part001-gap-analysis.json` — gap analysis.
- `docs/cwis/part001-implementation-report.md` — 본 보고서.

**변경**:
- `backend/src/routes.php` — 협업 5 라우트 bare+`/api` 등록.
- `frontend/src/App.jsx` — CollaborationHome lazy import + `/pm/collaboration` 라우트.
- `frontend/src/layout/sidebarManifest.js` — PM 그룹에 "협업" 진입점.
- `frontend/src/i18n/locales/{ko,en}.js` — `gNav.pmCollaborationLabel`.

**신규 테이블(ensureTables 자가치유)**: `collaboration_capabilities`(글로벌 카탈로그·capability_key UNIQUE), `tenant_collaboration_capabilities`(테넌트별 활성화·UNIQUE(tenant_id,capability_key)).

## 4. 재사용한 기존 인프라 (신규엔진 0)

- **인증/테넌트/역할**: `PM\Shared::gate`(세션 self-auth·tenant_id 격리·viewer<connector<analyst<admin) 승계.
- **감사**: `PM\Shared::auditLog`(pm_audit_log append-only) → **capability enable/disable 가 PM 활동피드/SSE 에 자동 연동**.
- **RBAC**: enable/disable 는 admin 게이트. (심화 RBAC 는 TeamPermissions 재사용 여지.)
- **인증 bypass**: `/v425/pm/*` 세션 bypass(index.php:261) 프리픽스 재사용 — index.php 무변경.
- **응답형태·ID생성·검증**: Shared::json/genId/validId 재사용.

## 5. 발견한 기존 협업 기능 (REUSE)

PM 도메인 EXISTS_COMPLETE(comment/activity/attachment/task/member) · team/member(/auth/team) · notification(user_notification/WebPush) · 단방향 SSE. 상세=`part001-gap-analysis.md`.

## 6. 누락(MISSING) — 후속 Part

messaging/channel/thread · document/wiki · meeting · whiteboard · presence · 양방향 실시간(WebSocket/CRDT). 전부 PLANNED 등록·정직 "준비 중" 표기.

## 7. 중복 위험 (착수 전 통합 검토)

approval 3계열 · 감사로그 4~5종 · 워크스페이스 이원화(WorkspaceState vs TeamWorkspace 데모 shell). → 각 후속 Part에서 정본 통합 결정.

## 8. 정직성 게이트 (구현 위장 방지)

- PLANNED capability 활성화 시도 → `409 capability_not_implemented`(미구현을 '사용가능'으로 위장 불가).
- 기반(foundation/security) 비활성화 → `409 protected_capability`.
- 의존성 미충족 활성화 → `409 dependency_not_enabled`.
- readiness = capability 실구현 상태 가중평균(ENABLED=1·PARTIAL=0.5). 초기 ≈22/100(PLANNED 코어 반영).

## 9. 검증 (테스트러너 부재 → 수동/빌드/배포)

- `php -l`: Collaboration.php · routes.php **통과**.
- 프론트 빌드: (배포 시 재검증) — CollaborationHome 컴파일 확인.
- 스모크(배포 후): `/api/v425/pm/collaboration/readiness`·`capabilities` 200(세션토큰), enable/disable 정직성 게이트.
- 회귀: 기존 PM 라우트·핸들러 무변경(협업은 신규 경로만 추가) → PM 기능 무영향.

## 10. 롤백

- 백엔드: `Collaboration.php` 삭제 + routes.php 협업 5라우트 제거 → 완전 무해(신규 경로만 추가, 기존 미변경). 테이블은 미사용 잔존(무해).
- 프론트: App.jsx 라우트·sidebarManifest 항목·CollaborationHome.jsx·i18n 키 제거.
- 배포 백업: `.bak` 패턴(백엔드)·`dist.bak`(프론트).

## 11. CWIS Part002 진행 가능 여부

**조건부 가능**. Part002(Organization/Workspace/Team/Member)는 **team/member/TeamPermissions 가 이미 EXISTS_COMPLETE** → 명세대로 신규 조직구조 신설 시 **중복**. Part002도 동일하게 **교차검증→적응(EXTEND 우선)** 필요. 워크스페이스는 WorkspaceState(실 KV) 확장 + TeamWorkspace 데모 shell 재작성이 정답.
