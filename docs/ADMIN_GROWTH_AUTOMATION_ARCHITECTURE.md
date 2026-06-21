# ADMIN GROWTH AUTOMATION — ARCHITECTURE

**236차 신규.** GeniegoROI 운영사가 Admin 계정으로 GeniegoROI **플랫폼 자체**를 마케팅 자동화로 성장시키는 내부 Growth Command Center.

> 핵심 한 문장: GeniegoROI Admin Growth Automation은 운영사가 자사 서비스를 직접 마케팅 자동화로 성장시키고 그 성과를 실제 수치로 입증하는 내부 성장 운영 시스템이다.

## 설계 원칙 (최우선 = 중복 0)

기존 엔진은 **재사용**, 진짜 부재 엔티티만 신설. 데이터는 **예약 테넌트 `platform_growth`** 로 격리.

```
[Admin 브라우저]  /admin/growth (AdminGrowthCenter.jsx, admin-only)
        │  getJson/postJson/putJson/delJson (Authorization: Bearer <session token>)
        ▼
[index.php 미들웨어]  /v424/admin/* 세션 admin bypass (기존)
        ▼
[AdminGrowth.php]  requirePlan('admin') 게이트 (서버 검증)
        │   tenant_id = 'platform_growth' 로 모든 R/W 격리
        ├── ClaudeAI::complete()        → AI 콘텐츠 생성 (재사용)
        ├── channel_credential 테이블    → 자격증명 Vault (재사용)
        ├── audit_log 테이블 (growth.*)  → 감사 로그 (재사용)
        ├── AdAdapters / AutoCampaign    → 실제 광고 집행 (Live, 재사용 경로)
        └── admin_growth_* (신설 6테이블) → 세그먼트/리드/이벤트/캠페인/승인/설정
```

## 데이터 격리 모델

| 구분 | 고객용 (customer_marketing_automation) | Admin용 (admin_platform_marketing_automation) |
|------|----|----|
| 캠페인 | `auto_campaign` (tenant=고객사) | `admin_growth_campaign` (tenant 개념상 platform_growth) |
| 리드/CRM | `crm_*` (tenant=고객사) | `admin_growth_lead` (GeniegoROI 자체 리드) |
| 자격증명 | `channel_credential` (tenant=고객사) | `channel_credential` (tenant=`platform_growth`) |
| 접근 권한 | 구독 플랜 사용자 | **admin 전용** (FE 숨김 + BE requirePlan) |

일반 구독 사용자는 `system||growth` menuKey 가 admin-only(`ADMIN_ONLY_MENU_KEYS` + `MENU_MIN_PLAN.admin`)라 메뉴 노출·딥링크 모두 차단되고, 백엔드 `requirePlan('admin')` 가 2차 차단한다.

## Test / Live 모드

- **Test (기본)**: 실제 발송·광고 집행 0. `campaignLaunch` 가 세그먼트 추정치 기반 **시뮬레이션**만 수행.
- **Live**: ① 모드 전환 자체가 승인 필요 → ② 캠페인 실행 승인 필요 → ③ 채널 자격증명 게이트 → ④ 실행+감사. 기존 플랫폼 "PAUSED→활성" 안전 철학 계승.

## 퍼널

```
방문자 → 랜딩 → 다운로드 → 문의 → 데모 → 체험 → 온보딩 → 유료 → 활성 → 업셀
```
리드 이벤트(`admin_growth_event`)가 스코어링·퍼널·CAC/LTV/ROAS/Payback 산출을 동시 구동한다.

## 관련 문서
- FEATURE_MAP / DUPLICATE_AUDIT / IMPLEMENTED_UPGRADES
- API_CHANGELOG / DB_MIGRATION_NOTES / SECURITY_REVIEW / TEST_RESULTS / OPERATING_GUIDE
