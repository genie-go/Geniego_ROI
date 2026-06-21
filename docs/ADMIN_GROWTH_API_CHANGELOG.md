# ADMIN GROWTH — API CHANGELOG

236차 신규 엔드포인트. 전부 `/v424/admin/growth/*` (+ `/api` 변형), **admin 전용** (`UserAuth::requirePlan('admin')`). 응답 봉투 `{success,data,message,error,meta:{request_id,timestamp,version}}`.

| Method | Path | Handler | 설명 |
|---|---|---|---|
| GET | `/v424/admin/growth/dashboard` | `AdminGrowth::dashboard` | KPI 카드 + 퍼널 + 리드등급 + 모드 |
| GET | `/v424/admin/growth/funnel` | `funnel` | 퍼널 단계·전환율·CAC/LTV/ROAS/Payback |
| GET | `/v424/admin/growth/segments` | `segments` | 타겟 세그먼트 목록 |
| POST | `/v424/admin/growth/segments` | `segmentSave` | 세그먼트 생성/수정(id 유무) |
| POST | `/v424/admin/growth/segments/seed` | `segmentSeed` | 기본 17종 시드(비어있을 때만, idempotent) |
| DELETE | `/v424/admin/growth/segments/{id}` | `segmentDelete` | 세그먼트 삭제 |
| GET | `/v424/admin/growth/leads` | `leads` | 리드 목록(grade/stage/segment 필터) |
| POST | `/v424/admin/growth/leads` | `leadSave` | 리드 생성/수정(email 필수) |
| POST | `/v424/admin/growth/leads/{id}/event` | `leadEvent` | 이벤트 기록 → 점수/등급/단계 재계산 |
| GET | `/v424/admin/growth/campaigns` | `campaigns` | 캠페인 목록 + 모드 |
| POST | `/v424/admin/growth/campaigns` | `campaignSave` | 캠페인 생성/수정(draft) |
| POST | `/v424/admin/growth/campaigns/{id}/generate` | `campaignGenerate` | AI 콘텐츠 생성 → pending_approval + 승인큐 |
| POST | `/v424/admin/growth/campaigns/{id}/launch` | `campaignLaunch` | test=시뮬레이션 / live=승인+자격증명 게이트 후 실행 |
| GET | `/v424/admin/growth/approvals` | `approvals` | 승인 큐(status 필터) |
| POST | `/v424/admin/growth/approvals/{id}/decide` | `approvalDecide` | approved/rejected 처리 + 후속 반영 |
| GET | `/v424/admin/growth/settings` | `settings` | 모드/설정 조회 |
| PUT | `/v424/admin/growth/settings` | `settingsSave` | 모드 변경(live 전환은 승인 필요) |
| GET | `/v424/admin/growth/audit` | `audit_log` | growth.* 감사 로그(최근 300) |

## 응답 예시 (성공)
```json
{ "success": true, "data": { "...": "..." }, "message": "대시보드",
  "error": null, "meta": { "request_id": "ab12…", "timestamp": "2026-06-21T…Z", "version": "v424.growth" } }
```
## 응답 예시 (실패)
```json
{ "success": false, "data": null, "message": "이메일은 필수입니다.",
  "error": { "code": "VALIDATION", "detail": "이메일은 필수입니다." }, "meta": { … } }
```

## 상태 코드
- 401 인증 필요 / 세션 만료 (requirePlan)
- 403 admin 플랜 아님 (PLAN_REQUIRED)
- 422 검증 실패 (VALIDATION)
- 404 대상 없음 / 409 충돌(이미 처리·자격증명 필요) / 202 승인 대기

## 등록 위치
- `backend/src/routes.php`: `$custom` 맵(36줄) + `$register` 루프(`['', '/api']`)
- `backend/public/index.php`: **무수정** (`/v424/admin/*` 세션 admin bypass 기존)
