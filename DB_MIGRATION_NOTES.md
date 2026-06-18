# DB_MIGRATION_NOTES.md

GeniegoROI DB 마이그레이션 노트 — 원칙: backward-compatible ALTER만, DROP/컬럼삭제 금지, 신규테이블은 기존으로 불가할 때만.

## 231차 적용 (운영/데모 라이브)
| 변경 | 유형 | 무후퇴 |
|------|------|--------|
| `app_setting` 정의 5곳 → `Db::ensureAppSetting()` SSOT | 정의 일원화(스키마 동일) | 동작 동일 |
| 쿠폰 `free_coupons`/`coupon_redemptions` → `Db::ensureCouponTables()` SSOT | 정의 일원화 | 동작 동일 |
| `ai_settings`/`wms_supply_orders`/`channel_orders` → SSOT 헬퍼 | 정의 일원화 | 동작 동일 |
| `kr_fee_rule.free_ship_threshold` | ALTER ADD COLUMN(멱등·운영/데모 적용) | 기본0=무후퇴 |
| `app_user.photo` / `partner_account.photo` | ALTER ADD COLUMN MEDIUMTEXT(멱등·양DB) | NULL=무후퇴 |
| `app_user.admin_menus` 의미 확장(배열→{경로:level} 맵) | 데이터 호환(decodeAdminMenus 양형, 레거시 배열→전부 edit) | 무후퇴 |

## 락게이트 트랩
- `Db.php` migrate는 `/tmp/genie_roi_v424_migrated_*.lock` 게이트 → 기존 DB 재실행 안 함. 컬럼 추가는 핸들러 멱등 ALTER 또는 배포 시 수동 ALTER로 보장.

## OS 디렉티브 예정(REMAINING_GAPS)
- `app_user.agent_mode`(ALTER, 기본 'approval') · `roi_formula_version`(신규 경량) · `metric_def`(신규/또는 app_setting) · `channel_benchmark` country/sample_n/confidence(ALTER) · `graph_edge` 순이익 가중(meta_json). 전부 backward-compatible.
- ★DROP TABLE 0 · 컬럼삭제 0 · 기존데이터 보존.
