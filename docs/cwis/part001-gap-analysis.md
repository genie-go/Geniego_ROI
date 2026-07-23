# CWIS Part001 — Collaboration Platform Gap Analysis

> 작성: 2026-07-23 · 대상 저장소: GeniegoROI · 분석 방식: 비파괴 전수 grep + file:line 실측
> ★교차검증 원칙 적용: 명령서(Laravel/DDD 전제)를 실제 스택과 대조 후 작성. 명세를 맹목 이행하지 않음.

---

## 0. 스택 실측 — 명세 전제 vs 실제 (★근본 불일치)

CWIS Part001 명령서는 **Laravel/Symfony + Eloquent + artisan + Migration 프레임워크 + PHPStan L8 + PHPUnit/Pest + DDD 4계층**을 전제한다. 실제 GeniegoROI는 다르다.

| 명세 전제 | 실제 (증거) | 판정 |
|---|---|---|
| `php artisan …`(migrate/route:list/queue/config:cache) | artisan 없음 | **적용 불가** |
| Laravel `app/` + DDD 4계층 | `app/` 없음 · flat `backend/src/Handlers/` | 강제도입 금지(§8도 동일 명시) |
| Eloquent Model + Migration | 실 데이터접근=PDO `Db.php` · migrations `20260527_172` 서 정지 · 스키마=`ensureTables` 자가치유 | **적용 불가** |
| `routes/api.php` | `backend/src/routes.php` 문자열 매핑(bare+`/api` 이중등록) | 경로/방식 다름 |
| PHPStan L8 · PHPUnit/Pest | 테스트러너 없음(검증=수동/`php -l`/배포) · PHPStan은 290차 L5 baseline만 | **적용 불가** |
| `readonly class` DDD Context/Aggregate/Repository | Handler 패턴 | 어휘 재해석 필요 |

> composer의 `illuminate/database`는 라이브러리일 뿐 풀 Laravel이 아니며, 실 코드는 PDO를 쓴다. Slim `^4.12` 확정.

**결론**: 명세의 **의도(Capability Registry·테넌트별 기능제어·감사·gap analysis·협업기반)는 타당**하나 **구현 형식은 이 저장소에 그대로 적용 불가** → §8 원칙("기존 구조와 일치하는 위치 선택·별도구조 강제금지")대로 **Slim/PDO 네이티브로 적응**한다.

---

## 1. PM(프로젝트관리) 도메인 인벤토리 — EXISTS_COMPLETE (REUSE)

PM은 이미 **완결 배선 모듈**이다(백엔드 13핸들러 ~1,911 LOC · 프론트 13페이지 · 8테이블 · 단방향 SSE).

| Capability | Backend | Route | Table | Frontend | 상태 | 권장 |
|---|---|---|---|---|---|---|
| Projects CRUD | `PM/Projects.php` | `routes.php:1414-1419`,`3667` | `pm_projects`(`168_001`) | `PMOverview/PMProjectDetail.jsx` | EXISTS_COMPLETE | REUSE |
| Tasks CRUD(+칸반) | `PM/Tasks.php` | `1423-1426` | `pm_tasks`(`168_002`) | `PMTaskTable/Detail/Board.jsx` | EXISTS_COMPLETE | REUSE |
| Assignees | `PM/Assignees.php` | `1427-1428` | `pm_task_assignees`(`168_005`) | Task 상세 | EXISTS_COMPLETE | REUSE |
| **Comments(댓글)** | `PM/Comments.php` | `1429-1430` | `pm_task_comments`(`168_006`) | `PMTaskDetail.jsx` | EXISTS_COMPLETE(PM한정) | REUSE |
| Dependencies | `PM/Dependencies.php` | `1432-1433` | `pm_task_dependencies`(`168_004`) | Gantt/Board | EXISTS_COMPLETE | REUSE |
| Milestones | `PM/Milestones.php` | `1435-1438` | `pm_milestones`(`168_003`) | `PMMilestones.jsx` | EXISTS_COMPLETE | REUSE |
| Gantt / KPI | `PM/Gantt.php`,`PM/Kpi.php` | `1420-1421` | 파생 | `PMGanttView.jsx` | EXISTS_COMPLETE | REUSE |
| Attachments(presign) | `PM/Attachments.php` | `1440-1441` | `pm_attachments`(`168_007`) | Task 상세 | EXISTS_COMPLETE | REUSE |
| **Audit/Activity** | `PM/Audit.php` | `1444` | `pm_audit_log`(`168_008`) | `PMActivity.jsx` | EXISTS_COMPLETE | REUSE |
| **SSE 이벤트 스트림** | `PM/Events.php` | `1443 /pm/events/stream` | pm_audit_log 폴링 | `pmEventStream.js` | EXISTS_COMPLETE | **EXTEND** |
| Portfolio/EVM/RAID/Timesheet/Resource | `PM/Enterprise.php` | `1446-1462` | 자가치유 | `PMPortfolio/Evm/Raid/Resources.jsx` | EXISTS_COMPLETE | REUSE |
| 공통 gate/tenant/audit | `PM/Shared.php` | — | — | — | EXISTS_COMPLETE | REUSE |

- 인증: `/api/v425/pm/*`는 세션토큰 self-auth(`Shared.php:64-70`), api_key 미들웨어 미경유.
- 테이블 자가치유: `Shared.php:37-53 ensurePmTables`.

---

## 2. 협업 Capability 상태 + 성숙도 점수 (0=미구현 … 5=초엔터+AI)

| Capability | 판정 | 성숙도 | 증거 | 권장 |
|---|---|:-:|---|---|
| comment(댓글) | EXISTS_COMPLETE(PM스코프) | 3 | `PM/Comments.php`·`168_006` | REUSE/EXTEND(범용화 시) |
| activity(활동로그) | EXISTS_COMPLETE | 3 | `PM/Audit.php`·실시간 `PMActivity.jsx:54` | REUSE |
| notification(알림) | EXISTS_COMPLETE(백엔드) | 3 | `UserAuth.php:4437-4527`·`user_notification` | REUSE |
| team(팀) | EXISTS_COMPLETE | 3 | routes `1592-1604`·`teamApi.js` | REUSE |
| member(멤버) | EXISTS_COMPLETE | 3 | `TeamMembers.jsx:147,173` | REUSE |
| workspace(워크스페이스) | **EXISTS_PARTIAL** | 1 | `WorkspaceState`(범용 KV) 실 / `TeamWorkspace.jsx:42` members/activity=`IS_DEMO?…:[]`·tasks=localStorage(가짜 shell) | REFACTOR |
| approval(승인) | **EXISTS_DUPLICATED** | 2 | Alerting `/v423/approvals` + Catalog writeback + FeedTemplate draft — 3계열 산재 | REFACTOR(통합) |
| mention(멘션) | EXISTS_PARTIAL(스텁) | 1 | `Comments.php:28,32 mentions_csv`(저장만·해석/알림 없음) | EXTEND |
| message/channel/thread(협업채팅) | **MISSING** | 0 | grep 무(채널=마케팅 판매채널) | NEW |
| document/wiki | **MISSING** | 0 | 히트=docs/*.md 스펙만 | NEW |
| meeting(회의) | **MISSING** | 0 | grep 무 | NEW |
| whiteboard | **MISSING** | 0 | grep 무 | NEW |
| presence(접속상태) | **MISSING** | 0 | `TeamWorkspace.jsx:15 online:true` 하드코딩·백엔드 무 | NEW |

**협업 성숙도 총평**: "협업"은 **PM 내부 댓글/활동/첨부/멤버/알림에 국한**. 팀 메시징·문서·회의·화이트보드·프레즌스·양방향 실시간은 **인프라부터 부재**.

---

## 3. 재사용 가능한 기존 인프라 (신규 엔진 금지·헌법 V4)

| 인프라 | 실체 | 재사용 |
|---|---|---|
| 테넌트 격리 | `tenant_id`/`auth_tenant` 3,294회/108파일 · PM `Shared.php:59-99` gate | **REUSE**(협업 신규테이블 동일 패턴) |
| RBAC | `TeamPermissions` menu×action×scope 매트릭스(정본) + PM 역할게이트 | **REUSE** |
| 감사(불변) | `SecurityAudit.php:12-33` SHA256 해시체인 append-only | **REUSE** |
| 알림 | `user_notification`+`UserAuth::notify()`·`WebPush`(VAPID 실푸시)·`Alerting`·`NotifyEngine` | **REUSE/EXTEND** |
| 실시간(단방향) | SSE `PM/Events.php`+`pmEventStream.js`(EventSource·재연결·300s cap·DB 2s 폴링) | **EXTEND**(알림/refetch 트리거까지만) |
| 이벤트버스/큐 | **없음** | MISSING(필요 시 NEW) |

---

## 4. 실시간 인프라 결론 (협업 기반의 핵심)

- **WebSocket / Pusher / Reverb / Ably / Ratchet / centrifugo = 전무**(백엔드 grep 0건, composer 의존성 0).
- 유일 메커니즘 = **단방향 SSE long-poll**(`PM/Events.php` FPM worker가 300s 동안 `pm_audit_log` 2s 폴링 → SSE emit). PM 스코프 전용·워커점유형·큐/pub-sub 없음.
- 프론트 `LiveCommerce.jsx`가 WebSocket 참조하나 **대응 백엔드 WS 서버 부재**(라이브커머스 시청용, PM협업 무관).
- **함의**: presence/typing/co-editing/whiteboard 등 **양방향 실시간 협업 인프라 없음** → 기존 SSE는 "이벤트 알림·목록 refetch" 수준까지 EXTEND, 실시간 공동작업은 WebSocket/CRDT 신규 도입(NEW) 전제.

---

## 5. 중복 위험 (착수 전 통합 검토 필수 — 헌법 중복금지)

1. **승인 3계열**: Alerting 액션승인 · Catalog writeback 승인 · FeedTemplate draft 승인. 범용 협업 승인워크플로 신설 시 통합/충돌 검토.
2. **감사로그 4~5종**: `security_audit_log`(해시체인) / `pm_audit_log` / `auth_audit_log` / `menu_audit_log` / growth `audit_log`. 협업 activity feed 정본 결정 필요.
3. **워크스페이스 이원화**: `WorkspaceState`(실 KV) vs `TeamWorkspace.jsx`(데모 shell). 후자는 가짜 협업화면 → 실구현 시 재작성.

---

## 6. Readiness Score (초기)

- 10개 협업 영역 성숙도 합 ÷ 최대(50) 기준 대략 **READINESS ≈ 20~25/100**(조직·업무협업 축은 PM 재사용으로 높고, 커뮤니케이션·문서·회의·시각·양방향실시간 축은 0).
- 정본 산출은 적응 구현의 `readiness` 엔드포인트가 capability registry 상태로 계산.

---

## 7. 적응(adapted) 아키텍처 권고 — Slim/PDO 네이티브

명세의 DDD/artisan/migration/DDD-4계층 대신 **저장소 관례로 재해석**:

| 명세 요구 | 적응 구현(이 저장소) |
|---|---|
| Capability Registry(Eloquent+artisan seeder) | `Collaboration.php` 핸들러 + `collaboration_capabilities`·`tenant_collaboration_capabilities` 테이블(**ensureTables 자가치유**·`ChannelRegistry` 시드 패턴) |
| CollaborationContext(readonly DDD) | 기존 요청속성 재사용(`auth_tenant`/`auth_role`·**세션/토큰 기준 tenant**=§9/§22 이미 충족) — 신규 Context 클래스 불필요 |
| Capability Status Enum | PHP `enum`(PLANNED/ANALYZING/PARTIAL/ENABLED/DISABLED/DEPRECATED/BLOCKED) |
| Feature Flag/요금제 | 기존 `featurePlan`/`requirePlan` + tenant capability 테이블 |
| Audit Hook | **`SecurityAudit::log` 재사용**(§28 명령과 정합) |
| API(`/api/v1/pm/collaboration/…`) | `routes.php` bare+`/api` 이중등록(버전 프리픽스), 기존 응답형태 |
| Migration 프레임워크 | ensureTables(migration은 172서 동결) |
| PHPUnit/Pest/PHPStan L8 | 수동/`php -l`/배포 검증(+기존 PHPStan L5 baseline) |
| Realtime Publisher | 인터페이스 + **Null Adapter**(§20 허용·WS 인프라 부재) |
| Frontend Collaboration Home | 기존 `/pm` 그룹에 협업 진입점 EXTEND(신규 최상위 메뉴 자제) + capability 상태/readiness 화면 |

**착수 전 결정 필요(사용자 확인)**: ① 협업을 별도 도메인으로 신설 vs PM 확장 위주 ② 승인/감사 중복 통합 정책 ③ 양방향 실시간(WS/CRDT) 도입 시점(Part001은 Null Adapter까지만).

---

## 8. 완료 판정 · 다음 단계

- **본 Part001 = COMPLETED_WITH_LIMITATIONS(분석 산출물 기준)**: gap analysis·인벤토리·재사용/중복/MISSING 분류·적응 아키텍처 완료. **구현(foundation 코드)은 스택 불일치로 명세 형식 그대로 착수 불가 → 적응안 사용자 확인 후 진행**.
- **CWIS Part002 진행 가능 여부**: 조건부. Part002(Organization/Workspace/Team/Member)는 **기존 team/member/TeamPermissions가 이미 EXISTS_COMPLETE**라 신설보다 EXTEND가 정답 — 명세대로 신규 조직구조 도입 시 기존과 중복. 적응 재설계 필요.
