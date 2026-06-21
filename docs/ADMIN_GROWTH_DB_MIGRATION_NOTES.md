# ADMIN GROWTH — DB MIGRATION NOTES

## 원칙 준수
- **DROP TABLE 금지 / 컬럼 삭제 금지 / 기존 데이터 파괴 금지** — 준수.
- 전부 `CREATE TABLE IF NOT EXISTS` (backward-compatible).
- 기존 테이블(`auto_campaign`, `crm_*`, `channel_credential`, `audit_log` …) **무변경**.

## 마이그레이션 방식
`Db::migrate()` 락 파일을 건드리지 않고, **핸들러 런타임 `ensureTables()`** 로 최초 호출 시 생성 (SiteIntro 패턴). MySQL/SQLite 듀얼:
- PK: MySQL `INT AUTO_INCREMENT PRIMARY KEY` / SQLite `INTEGER PRIMARY KEY AUTOINCREMENT` (드라이버 분기).
- 타임스탬프: `gmdate('c')` 문자열 저장 (NOW() 미사용 → SQLite 폴백 안전).
- upsert: MySQL `ON DUPLICATE KEY` / SQLite `ON CONFLICT` 분기(`setSetting`).

## 신규 테이블 (6 + audit_log 보강 생성)

| 테이블 | 용도 | 핵심 컬럼 |
|---|---|---|
| `admin_growth_segment` | 타겟 세그먼트 | seg_key, name, industry, pain_point, key_message, channels_json, est_conv_rate, est_cac, est_ltv, monthly_value |
| `admin_growth_lead` | 자체 리드 | email, company, segment_key, source, stage, score, grade, mrr, last_activity_at |
| `admin_growth_event` | 퍼널/터치 이벤트 | lead_id, email, event_type, channel, campaign_key, value, occurred_at, meta_json |
| `admin_growth_campaign` | 홍보 캠페인 | camp_key, name, objective, segment_key, channels_json, budget, mode, status, content_json, est_json, spend, revenue |
| `admin_growth_approval` | 승인 큐 | ref_type, ref_id, ref_key, summary, payload_json, status, requested_by, decided_by, decided_at |
| `admin_growth_setting` | 설정(key/value) | skey(PK), svalue, updated_at |
| `audit_log` | 감사(재사용) | `CREATE IF NOT EXISTS` 만 — 기존 존재 시 무영향 |

## 격리
모든 Growth 도메인 데이터는 논리상 예약 테넌트 `platform_growth`. `channel_credential` 재사용 시 `tenant_id='platform_growth'` 행으로 고객 데이터와 분리.

## 검증 (TEST_RESULTS 참조)
SQLite 인메모리에서 `ensureTables` → 7테이블 생성 확인, 스코어링/퍼널 동작 검증 완료. MySQL DDL 은 동일 SQL 을 드라이버 분기로 생성(운영 8.0.37, php 8.1.34).

## 롤백
신규 테이블 한정이라 기능 비활성화로 충분(데이터 보존). 물리 제거가 필요하면 `DROP TABLE admin_growth_*` 수동(운영 데이터 영향 無, 고객 테이블 무관).
