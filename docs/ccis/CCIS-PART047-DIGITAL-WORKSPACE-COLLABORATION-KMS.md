# GeniegoROI Claude Code Implementation Specification

# CCIS Part047 — Enterprise Digital Workspace, Collaboration, Knowledge Management & Productivity Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Enterprise Digital Workspace·Collaboration·KMS·Productivity 표준을 수립한다.

> ★**성격(축 분리 — "프로젝트/업무 관리+지식 SSOT" 실재 vs "실시간 협업 스위트" 사업범위 밖)**: 이 저장소는
> **마케팅/커머스 ROI 분석 SaaS**이지 **Notion/Confluence 형 협업 스위트가 아니다**. 명세가 다루는 **Enterprise
> Wiki(nested/version)·Whiteboard(drawing/mind map)·Real-Time Collaboration(live editing/CRDT/cursor
> presence)·Presence(online/away)·실시간 공동편집**은 이 제품의 **사업 범위 밖(out of scope)**이라 **부재**한다
> (grep 0). ★결함이 아니라 정직한 비적용(MEA 064 "out of scope"·Part035~046 어휘 재적용). ★**실재 축(업무/지식
> 협업)**: **`PM\*`**(N-152-F·**13 핸들러 프로젝트 관리**·Projects/Tasks/Milestones/Dependencies/Assignees/
> Comments/Attachments/Gantt/Kpi/Events·**8 테이블**·테넌트 격리·**append-only audit_log**)·**`TeamPermissions`**
> (팀 RBAC/ABAC·231차)·**`GeniegoKnowledge`/`GeniegoGlossary`**(지식 SSOT·KMS 유사·Part034)·**Notification
> Hub**(`Omnichannel`/`Alerting` Slack·Part033)·**`WorkspaceState`**(UI 상태 영속)·**`action_request`**(승인
> 협업)·**챗봇 Retriever**(지식 검색·Part029) 는 실재한다. ★★**오흡수 차단**: **`WorkspaceState`=UI 레이아웃
> 상태이지 실시간 협업 workspace 아님** · **`PM\*` Comments/Attachments=업무 협업이지 실시간 co-editing/CRDT
> 아님**. Part001 §4 에 따라 실측 → Wiki/Whiteboard/실시간 협업 부재증명 → PM+지식 SSOT+TeamPermissions
> 성문화했다. ★정본=**Part029(검색/지식)·Part033(알림)·Part034(지식 거버넌스)·Part030(RBAC)** 승계. (문서 차수
> — 코드 무변경.)

---

## 2. 실측 — 현행 협업 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Workspace Architecture | Portal→Collab→Knowledge→Search→Analytics | **부분** — `PM\*`(업무)·지식 SSOT·챗봇 검색·rollup 분석. 형식 Workspace Portal 계층 아님 |
| Workspace Management | Workspace ID/Members/Visibility | **부분(대응물)** — 테넌트=워크스페이스(격리)·`TeamPermissions`(멤버/역할)·`WorkspaceState`(UI). 형식 다중 workspace 부분 |
| Team Collaboration | Team Space/Discussion/Mention/File | **부분** — `PM\*` Comments/Attachments·`TeamPermissions`. Discussion/Mention/실시간 file sharing 부분 |
| Knowledge Management(KMS) | KB/Category/Owner/Approval | ★**대응물** — `GeniegoKnowledge`/`GeniegoGlossary`(지식 SSOT·챗봇 주입)·`action_request`(승인). 형식 KB CRUD 부분 |
| Enterprise Wiki | Wiki/Nested/Version/Comment | **부재(out of scope)** — Wiki 없음. `LegalDoc`(약관 편집)은 문서이지 Wiki 아님 |
| Enterprise Search | Full-Text/Semantic/Workspace | **부분(어휘)** — 챗봇 Retriever(어휘·Part029)·MySQL LIKE. 시맨틱/workspace 검색 부분 |
| Task Management | Task/Checklist/Due/Assignee/Priority | ★**실재** — `PM\*`(pm_tasks·assignees·dependencies·milestones·Gantt·priority·due) |
| Whiteboard | Drawing/Sticky/Mind Map | **부재(out of scope)** — 화이트보드 없음 |
| Real-Time Collaboration | Live Editing/CRDT/Conflict | **부재(out of scope)** — 실시간 공동편집 없음(CRDT/OT 부재) |
| Presence | Online/Away/DND | **부재(out of scope)** — presence 없음 |
| Notification Hub | Email/Push/In-App/Slack/Teams | ★**대응물** — `Omnichannel`(11채널·Part033)·`Alerting`(Slack). Teams 부재 |
| Knowledge Lifecycle | Draft→Approved→Published→Archived | **부분** — `action_request`(승인)·`GeniegoKnowledge`(빌드 파이프라인·270차). 형식 lifecycle 상태머신 부분 |
| Productivity Analytics | Active User/Task Completion/Score | **부분** — `PM\Kpi`(업무 KPI)·rollup·`SystemMetrics`. Collaboration Score 부분 |
| Workspace Governance | Policy/Retention/Sharing/Access | **부분(대응물)** — `TeamPermissions`(access)·`Dsar`(retention)·RBAC. 형식 Workspace Policy 부분 |
| Collaboration API | Workspace/Task/Knowledge/Notification | ★**부분 준수** — `PM\*` API·`/api/journey`·지식·`Omnichannel`. 형식 통합 Collab API 부분 |
| Monitoring | Session/Search/Latency/Task | **부분** — `PM\Kpi`·`SystemMetrics`·`Alerting`. Collaboration Latency 대상 없음 |
| Logging | Workspace/User/Task/Trace | ★**부분 준수** — `pm_audit_log`(append-only)·`SecurityAudit`. Trace ID 부분 |
| Security(RBAC/Workspace Perm/File Access/격리) | 협업 접근 제한 | ★**준수** — `TeamPermissions`(RBAC/ABAC)·테넌트 격리·prepared statement·`Crypto` |
| Compliance(협업 데이터) | 보존/접근 | **부분** — `Dsar`·PII 미저장·`SecurityAudit` |
| Disaster Recovery | Workspace/Knowledge/Search 복구 | **부분** — DB 백업(pm_*)·git(지식/Glossary). Search Index 대상 없음 |
| Performance(Search/Presence/Notif Cache) | 대규모 협업 | **부분** — HTTP 캐시·`omni_outbox` 큐. Presence 캐시 대상 없음 |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Collaboration First/Knowledge Centric/Real-Time/Workspace Unified/Search Everywhere/Tenant Isolated) | **부분(업무/지식축)** | ★Knowledge Centric(지식 SSOT)·Tenant Isolated·Version Controlled(pm_audit). Real-Time/Whiteboard=out of scope |
| §4 Workspace Architecture | **부분** | `PM\*`·지식·챗봇 검색·rollup. Portal 계층 아님 |
| §5 Workspace Management | **부분(대응물)** | 테넌트=워크스페이스·`TeamPermissions`·`WorkspaceState`(UI) |
| §6 Team Collaboration | **부분** | `PM\*` Comments/Attachments·`TeamPermissions`. Discussion/Mention 부분 |
| §7 KMS | **★대응물** | `GeniegoKnowledge`/`GeniegoGlossary`·`action_request` |
| §8 Enterprise Wiki | **부재(out of scope)** | Wiki 없음(`LegalDoc`≠Wiki) |
| §9 Enterprise Search | **부분(어휘)** | 챗봇 Retriever·LIKE. 시맨틱 부분 |
| §10 Task Management | **★실재** | `PM\*`(tasks/assignees/dependencies/milestones/Gantt) |
| §11~§13 Whiteboard/Real-Time Collab/Presence | **부재(out of scope)** | 화이트보드/실시간 공동편집/presence 없음 |
| §14 Notification Hub | **★대응물** | `Omnichannel`(11채널)·`Alerting`(Slack). Teams 부재 |
| §15 Knowledge Lifecycle | **부분** | `action_request`·`GeniegoKnowledge`(빌드). 형식 상태머신 부분 |
| §16 Productivity Analytics | **부분** | `PM\Kpi`·rollup·`SystemMetrics` |
| §17 Workspace Governance | **부분(대응물)** | `TeamPermissions`·`Dsar`·RBAC |
| §18 Collaboration API | **부분 준수** | `PM\*` API·지식·`Omnichannel` |
| §19 Monitoring | **부분** | `PM\Kpi`·`SystemMetrics`·`Alerting` |
| §20 Logging | **부분 준수** | `pm_audit_log`(append-only)·`SecurityAudit` |
| §21 Security | **★준수** | `TeamPermissions`(RBAC/ABAC)·테넌트 격리·prepared·`Crypto` |
| §22 Compliance | **부분** | `Dsar`·PII 미저장·`SecurityAudit` |
| §23 Disaster Recovery | **부분** | DB 백업(pm_*)·git(지식) |
| §24 Performance | **부분** | HTTP 캐시·`omni_outbox`. Presence 캐시 없음 |
| §25~§26 PHP/Claude(Workspace/Collab/Knowledge Service/Search Adapter/Notification Hub) | **부분** | ★`PM\*`·`TeamPermissions`·지식 SSOT·`Omnichannel`. 실시간 통신/Wiki/Whiteboard 부재 |
| §27~§28 검증(workspace:health/knowledge:status/notification:hub) | **대상 없음** | artisan 없음. `PM\*` API·`GeniegoKnowledge`·`Omnichannel` 로 대체 |

---

## 4. 확립된 표준 (신규 협업 코드가 따를 정본)

- ★**업무/프로젝트 관리 정본 = `PM\*`**(N-152-F·8 테이블 pm_*·Shared 베이스 상속). 신규 업무/태스크 기능은 이 모듈 확장(중복 신설 금지). ★**보안 baseline(N-152-A)**: 모든 쿼리 `tenant_id` 필수·**`pm_audit_log` append-only(모든 mutation 기록)**·prepared statement.
- ★**지식 정본 = `GeniegoKnowledge`/`GeniegoGlossary`**(지식 SSOT·챗봇 주입·임의변경 금지·Part034). 신규 지식은 이 SSOT 확장·`gen_chatbot_knowledge.mjs` 파이프라인(라우트 추가로 자동 인지·270차). 승인=`action_request`.
- ★**협업 검색 = 챗봇 Retriever(어휘·Part029)**(min-score 게이트·근거 없으면 빈 결과). 형식 Enterprise Search(시맨틱/벡터) 신설 금지(Retriever 확장).
- ★**알림 = Notification Hub `Omnichannel`(11채널)+`Alerting`(Slack)**(Part033). 협업 이벤트 알림은 이 허브 재사용·`omni_outbox` 큐.
- ★**권한/거버넌스 = `TeamPermissions`(팀 RBAC/ABAC·231차)+테넌트 격리**. Workspace/파일 접근은 이 권한 게이트·retention=`Dsar`(Part034).
- ★★**오흡수 차단**: **`WorkspaceState`=UI 레이아웃 상태 영속이지 실시간 협업 workspace 아님** · **`PM\*` Comments/Attachments=업무 협업이지 실시간 co-editing/CRDT 아님** · **`LegalDoc`=약관 편집이지 Enterprise Wiki 아님**. 혼동 금지.
- ★**사업범위 원칙**: **실시간 협업 스위트(Wiki/Whiteboard/Live Editing/CRDT/Presence)는 이 제품 범위 밖**(ROI 분석 SaaS) — 제품결정·실시간 인프라(WebSocket/CRDT) 선행 없이 선이식 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 실시간 협업 스위트 out of scope)

1. **Enterprise Wiki(nested/version/comment)·Whiteboard(drawing/mind map)** — 안 함. **사업 범위 밖**(ROI 분석 SaaS·Notion/Confluence 형 협업 스위트 아님). `LegalDoc`(약관)≠Wiki.
2. **Real-Time Collaboration(Live Editing/CRDT/OT/Conflict Resolution)·Presence(online/away/DND)** — 안 함. **사업 범위 밖**. 실시간 공동편집 인프라(WebSocket/CRDT) 없음(SSE/폴링만·Part018).
3. **형식 Enterprise Search(문서/workspace 시맨틱 검색)** — 부분. 챗봇 Retriever(어휘·Part029)·LIKE. 벡터/시맨틱=289차후속 보류(표본 0).
4. **형식 다중 Workspace 관리·Knowledge Lifecycle 상태머신** — 부분. 테넌트=워크스페이스·`action_request` 승인·`GeniegoKnowledge` 빌드 파이프라인이 대응물.
5. **`WorkspaceState`/`PM\*`/`LegalDoc` 을 협업 스위트로 오흡수 금지** — UI 상태/업무 관리/약관 편집이지 실시간 협업/Wiki 아님.
6. **artisan `workspace:*`/`knowledge:status`/`notification:hub` 명령** — 없음(Slim·Portal 없음). `PM\*` API·`GeniegoKnowledge`·`Omnichannel` 로 대체.

★**준수하는 실 원칙(업무/지식 협업)**: **`PM\*`(프로젝트/태스크·8테이블·pm_audit append-only·tenant 필수)·지식 SSOT(GeniegoKnowledge/Glossary·라우트 추가 자동 인지)·챗봇 Retriever(어휘·min-score)·Notification Hub(Omnichannel/Alerting)·`TeamPermissions`(RBAC/ABAC)·테넌트 격리·PII 미저장·정직 미산출**. ★**오흡수 차단**: WorkspaceState/PM/LegalDoc≠실시간 협업 스위트. ★**out of scope 정직 선언**: Wiki/Whiteboard/실시간 협업/Presence 는 이 제품 범위 밖이며 부재는 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. 업무/프로젝트=`PM\*`(N-152-F·8테이블) 확장(중복 신설 금지). ★모든 쿼리 `tenant_id` 필수·`pm_audit_log` append-only·prepared statement.
2. 지식=`GeniegoKnowledge`/`GeniegoGlossary` SSOT 확장(임의변경 금지·라우트 추가로 자동 인지·270차). 승인=`action_request`.
3. 협업 검색=챗봇 Retriever(어휘·min-score·Part029). 알림=`Omnichannel`/`Alerting`(Part033·omni_outbox 큐).
4. 권한/거버넌스=`TeamPermissions`(RBAC/ABAC)·테넌트 격리·retention `Dsar`.
5. ★★**오흡수 금지**: `WorkspaceState`(UI 상태)/`PM\*`(업무)/`LegalDoc`(약관)을 실시간 협업 workspace/Wiki 로 표기하지 않는다.
6. ★**Wiki/Whiteboard/Real-Time Collab(CRDT)/Presence 를 선이식하지 않는다** — ROI SaaS 사업 범위 밖(제품결정·실시간 인프라 선행).

---

## 7. Completion Criteria

- [x] 협업 스택 **실측**(Wiki/Whiteboard/Real-Time Collab/CRDT/Presence 부재·`PM\*` 13핸들러 8테이블·`GeniegoKnowledge` 지식 SSOT·`TeamPermissions`·`Omnichannel` 알림 실재)
- [x] 명세 §3~§28 **섹션별 매핑·판정**(실시간 협업 스위트 **out of scope** 증명·업무/지식 협업 실재)
- [x] 실 협업(PM+지식 SSOT+TeamPermissions+Notification Hub+Retriever) 성문화(§4)
- [x] ★`PM\*`(pm_audit append-only·tenant 필수)·지식 SSOT(자동 인지)·RBAC/ABAC·★★오흡수 차단(WorkspaceState/PM/LegalDoc≠실시간 협업) 명시
- [x] 의도적 미적용 + 사유(§5) — Wiki/Whiteboard/Real-Time Collab/Presence/Enterprise Search(실시간 협업 out of scope)
- [x] Claude Code 규칙(§6) · `PM\*`·`GeniegoKnowledge`·`TeamPermissions`·`Omnichannel` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **업무/지식 협업**(`PM\*` 프로젝트 관리 13핸들러 + 지식
> SSOT + `TeamPermissions` RBAC/ABAC + Notification Hub)의 성문화이지 Wiki/Whiteboard/실시간 공동편집/Presence
> 이식이 아니다. ★★**오흡수 차단**: **`WorkspaceState`(UI 상태)·`PM\*` Comments(업무 협업)는 실시간 co-editing/
> CRDT 가 아니다**. ★**out of scope 정직 선언**: 실시간 협업 스위트는 이 ROI 분석 SaaS 범위 밖이며 부재는 결함이
> 아니다.

---

## 다음 Part

**CCIS Part048 — Enterprise Low-Code, No-Code, Workflow Studio & Citizen Development** — ★사전 실측 예고: 형식 Low-Code/No-Code 플랫폼(Drag&Drop UI Builder·Component Marketplace·Citizen Dev)은 **부재/부분**이나, 시각적 빌더 실체는 **`JourneyBuilder`(nodes/edges 워크플로 캔버스·Part032)·`RuleEngine`(규칙 디자이너·IF-THEN)·`WebPopupCampaign`(팝업 A/B 빌더)·`CreativeStudio`(크리에이티브 빌더)·폼/템플릿(`FeedTemplate`)**로 부분 실재. Part048 도 실측→Low-Code 플랫폼/Component Marketplace 부재증명→JourneyBuilder+RuleEngine 성문화. ★Part032(워크플로 060 D-2 스코프분리) 재확인·"워크플로 캔버스 실재 vs 범용 Low-Code 플랫폼 부재".
