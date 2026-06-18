# ENTERPRISE_UPGRADE_PLAN.md

GeniegoROI → 중복 없는 단일 통합 초엔터프라이즈 AI Profit Intelligence SaaS 전환 계획

- 작성일: 2026-06-18
- 근거: `DUPLICATE_AUDIT_REPORT.md`
- 작업 기준: `E:\project\GeniegoROI` (230차, HEAD `e9a3b544eb6`)

---

## 0. 대전제 (절대 원칙)

1. **신규 중복 금지**: 메뉴·페이지·대시보드·API·핸들러·서비스·DB 테이블·기능을 새로 만들지 않는다. 감사 결과 20개 핵심 기능 중 16개가 이미 프로덕션 수준이므로 **전부 "기존 초고도화"**로 처리한다.
2. **확장 우선**: 부족분은 기존 핸들러/테이블/페이지의 리팩토링·확장·보안강화·성능개선·UX정리로 해결한다.
3. **선이관·후삭제**: 라우트가 연결된 코드(예: `PerformanceController`)는 기능 이관·검증 완료 후에만 제거한다.
4. **삭제 전 증명**: 모든 삭제는 정적 grep + 동적 참조 추적 + 라우트/메뉴 도달성 검증 5단계 통과 후.
5. **운영-데모 동등 + 격리**: 모든 변경은 운영/데모 동반 적용, 테넌트 데이터 격리 유지(메모리 U-177-D).
6. **승인 게이트**: 아래 Phase 중 ★표시(스키마 변경·삭제·배포)는 **사용자 승인 후** 진행. 코드 작성·검증은 디폴트 진행.

---

## 1. 최종 통합 아키텍처 (목표 형상)

ROI 흐름을 기존 기능 중심으로 단일 데이터 파이프라인으로 정렬:

```
[Connector Hub]        [Channel Sync]      [OrderHub]        [WMS / Logistics]     [Returns]
 ApiKeys/ChannelRegistry → 주문·재고 수집 → 다채널 주문 통합 → 창고·배송 → 반품/RMA
        │                      │                  │                 │                │
        └──────────────┬───────┴──────────────────┴─────────────────┴────────────────┘
                        ▼
              [Rollup / PnLDashboard]  ← 광고비(AdPerformance) + COGS + 배송비 + 반품비
                        ▼
        True Profit ROI (단일 순이익 워터폴, 이미 90% 완성)
                        ▼
   [AI Agent: AutoRecommend / Mmm / CustomerAI / DemandForecast / AnomalyDetection]
                        ▼
        [Notification Hub: NotifyEngine 단일 디스패처] → Email/SMS/Kakao/LINE/WhatsApp/IG
```

- **단일 ROI 진실원천**: `Rollup.php` + `PnLDashboard.jsx` (신규 대시보드 추가 금지).
- **단일 커넥터 SSOT**: `ChannelRegistry` (채널 메타데이터) + `ChannelCreds`(암호화 자격증명).
- **단일 알림 디스패처**: `NotifyEngine` (채널 핸들러는 어댑터로 유지).
- **단일 RBAC/플랜 SSOT**: `PlanPolicy.php` ↔ `planMenuPolicy.js` / `teamRolePolicy.js`.

---

## 2. 단계별 실행 계획

### Phase 1 — 무위험 정리 (코드 위생) · 승인 불요(코드)/★배포 승인
목표: 중복 정의·고아·불일치 제거로 "단일 구조" 기반 확보.

| # | 작업 | 파일 | 방식 | 검증 |
|---|------|------|------|------|
| 1-1 | `app_setting` 6중 정의 → 중앙화 | `Db.php`에 정의 추가, OAuth/Connectors/UserAuth/WhatsApp/GdprConsent/PgSettlement는 의존만 | 정의 이동(신규 테이블 아님) | 부팅 시 테이블 1회 생성 확인 |
| 1-2 | 쿠폰 테이블 3중 정의 단일화 | `free_coupons`/`coupon_redemptions`/`coupon_rules` → `migrations` 단일 | 런타임 CREATE 제거 | 발급→사용 e2e |
| 1-3 | `channel_credential`/`ai_settings`/`wms_supply_orders`/`channel_orders` 단일 소유 | 자가생성 핸들러에서 제거, Db.php 의존 | grep로 잔존 0 확인 | |
| 1-4 | 응답 포맷 표준화 | 수동 json_encode 핸들러(AutoCampaign/Mmm/OrderHub 등) → `TemplateResponder` | 점진 마이그레이션 | 응답 봉투 일치 |
| 1-5 | 고아 페이지 처리 | `AIMarketingHub.jsx`·`AdChannelConnect.jsx` 참조 확인 후 정리 | 삭제 전 GlobalDataContext/ApiKeys 참조 제거 확인 | 빌드 깨진 import 0 |
| 1-6 | 미노출 라우트 7종 결정 | 메뉴 노출 or deeplink 주석화 | 사용자 판단 1회 | |

### Phase 2 — 보안 하드닝 (P0) · ★스키마 변경 승인 필요
| # | 작업 | 방식 |
|---|------|------|
| 2-1 ★ | `app_user`/`user_session`/`password_reset` 테넌트 격리 | `tenant_id` 컬럼 추가 마이그레이션 + 레거시 행 `default` 백필 + UserAuth/UserAdmin 쿼리에 `tenant_id` WHERE 강제 |
| 2-2 | 전역 Audit 미들웨어 | `index.php` 미들웨어 체인에 mutation 자동 기록(actor/tenant/ip/before-after) → 기존 `audit_log` 재사용. `Payment`/`UserAdmin`/`ChannelSync` 수동 호출 보강 |
| 2-3 | `DbAdmin.php` 위험도 감사 | admin 게이트 + audit 강제 |

### Phase 3 — 인프라 통합 (파사드, 비파괴) · 코드 진행/★배포 승인
| # | 작업 | 방식 — **핸들러 삭제 없음** |
|---|------|------|
| 3-1 | 알림 단일 디스패처 | `NotifyEngine::dispatch(channel, payload)` 파사드. Email/SMS/Kakao/LINE/WhatsApp/IG 핸들러는 **어댑터로 유지**. Alerting 액션을 디스패처 경유 |
| 3-2 | 채널 SSOT 정렬 | `ChannelRegistry`를 메타데이터 SSOT로 확정, `ChannelSync`/`Connectors`가 이를 참조. `Connectors` 미사용 메서드만 정리(검증 후) |
| 3-3 | 마케팅 옵티마이저 우선순위 | `Mmm > AutoRecommend` 선택 로직 + 계약 문서화. `AutoCampaign.allocations`는 캐시로 명시 |
| 3-4 | `PerformanceController` 라우트 이관 | 4개 라우트를 `AdPerformance`로 이관·검증 → **이관 완료 후** 컨트롤러 제거 |

### Phase 4 — ROI 흐름 완결 (기존 확장) · ★스키마 일부
| # | 작업 | 방식 |
|---|------|------|
| 4-1 ★ | Commerce ROI: SKU 순이익 | `commerce_sku_day`에 COGS 컬럼, `OrderHub`/`Rollup` 집계 반영 → `PnLDashboard` 재사용(신규 페이지 0) |
| 4-2 | Logistics ROI: 배송비 실연동 | `Wms`/`Logistics` 배송비 → `Rollup` 워터폴에 합산(현재 주석 수준) |
| 4-3 | Audit Log 완결 | Phase 2-2 미들웨어 + `Audit.jsx` 필터 강화 |
| 4-4 | Enterprise Dashboard | `Admin.jsx`에 enterprise 전용 탭 분리(신규 페이지 0) |

### Phase 5 — 검증 인프라
- 검증 스크립트 추가(레포에 정식 테스트 부재): 핸들러 reflection 체크, 라우트-핸들러 정합, i18n 15개국 키 동기화, 테넌트 격리 e2e.

---

## 3. 신규 생성 vs 확장 판정표 (절대 금지 가드)

| 요구 | 신규? | 결론 |
|------|-------|------|
| Marketing/Commerce/Logistics/Live ROI | ❌ | 기존 존재 → 초고도화 |
| AI Agent / Attribution / Auto Campaign / Demand Forecast / Anomaly | ❌ | 기존 존재 → 초고도화 |
| Channel Sync / Connector Hub / Coupon / Billing / Notification | ❌ | 기존 존재 → 통합·파사드 |
| RBAC / Multi Tenant / Plan Policy / Admin / Audit Log | ❌ | 기존 존재 → 격리·미들웨어 보강 |
| 전역 Audit 미들웨어 | ⭕(최소) | 기존에 없는 단일 진입점 → `index.php` 미들웨어 1개(테이블/핸들러 신규 없음) |

→ **신규 메뉴/페이지/대시보드/별도 ROI/별도 AI/별도 Connector 생성: 전부 금지.**

---

## 4. 리스크 & 롤백

- 모든 ★배포는 `.bak_<차수>` 백업 후 진행, 헤드리스 검증(운영/데모 동반).
- 스키마 변경은 idempotent 마이그레이션 + 레거시 백필.
- 삭제는 선이관·후삭제, grep 잔존 0 확인.

---

## 5. 승인 요청 (다음 액션)

아래 중 어디부터 진행할지 승인 바랍니다. 기본 추천은 **Phase 1(무위험 정리) → Phase 2(P0 보안)** 순차입니다.
- Phase 1: 코드 위생(중복 정의 중앙화·고아 정리·응답 표준화) — 위험 낮음, 배포만 승인.
- Phase 2 ★: 테넌트 격리 스키마 변경 — 보안 P0, 스키마 승인 필요.
- 부록 A 루트 임시파일 147개 정리는 별도 승인.
