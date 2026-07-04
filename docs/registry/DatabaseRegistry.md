# DatabaseRegistry — DB 스키마 레지스트리 (포인터)

> **정본(SSOT)**: **라이브 `SHOW COLUMNS`**(운영 geniego_roi / 데모 geniego_roi_demo) = 스키마 판정 유일정본. CREATE=`backend/src/Db.php`+핸들러 런타임 ensure/ALTER. 마이그: `docs/DB_MIGRATIONS.md`.
> ★덤프파일(_live_schema*.txt)·메모리·주석 **맹신 금지**(263/265 Paddle·UserAdmin 교훈).

## 스키마 정본 주의(265차 라이브 실측)
- `channel_orders`: channel_order_id/total_price(KRW정규화)/qty/ordered_at/buyer_email/raw_json — **order_id/currency/quantity/created_at 없음**.
- `app_user`: id(idx 없음)·extra_data(business_type 등은 JSON)·company/phone/representative/updated_at.
- `paddle_events`=notification_id/error · `paddle_subscriptions`=current_period_end/last_event_at · `paddle_audit_log`=ref_id.
- `normalized_activity_event`=creative_id/creator_handle(creator_id 없음) · `schema_migrations`=filename/applied_at/checksum(version 없음).
- 운영 234테이블·데모 220(테이블차 대부분 런타임 lazy-CREATE·양성).

## 갱신 규칙
스키마 변경(컬럼추가/ALTER) 시 ①라이브 SHOW COLUMNS 실증 ②Db.php/ensure 정합 ③운영+데모 동반 ④여기 정본주의 갱신. 컬럼참조 드리프트 전수감사(Handlers+cron)는 라이브 대조.
