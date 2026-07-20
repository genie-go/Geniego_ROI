# DSAR — LTER Ground-Truth ② Duplicate Implementation Audit (Part 3-27)

> **거버넌스 상태**: 중복구현 감사 · 코드 변경 0 · NOT_CERTIFIED · 289차 후속(2026-07-21).
> 상위 SPEC/ADR/GT①: Part 3-27 계보. 목적 = LTER 신설이 기존 자산과 중복(엔진 난립)하지 않도록 KEEP_SEPARATE 경계를 확정.

## 동음이의(같은 이름·다른 도메인) — 오흡수 금지
| LTER 개념 | 코드베이스의 동명 자산 | 인용 | 판정 |
|---|---|---|---|
| Roadmap / Pipeline | 마케팅 자동화 파이프라인 | `AutoCampaign`·`JourneyBuilder`·`Decisioning` | KEEP_SEPARATE(비즈니스 실행 ≠ 플랫폼 진화) |
| Drift | 모델 드리프트 모니터 | `ModelMonitor` | KEEP_SEPARATE(ML ≠ Architecture/Roadmap Drift) |
| Reconciliation | 정산/커넥터 대사 | `PgSettlement`·`Connectors` | KEEP_SEPARATE(금전대사 ≠ Roadmap Reconciliation) |
| Risk | 고객 이탈/신용 리스크 | `CustomerAI`·`Risk` | KEEP_SEPARATE(비즈니스 ≠ Evolution Risk) |
| Version 무결성 | 스키마 마이그레이션 checksum | `Db.php` schema_migrations | 실재하나 범위 밖(스키마 한정·Roadmap 무관·checksum은 장식 아님·단조 락) |
| Snapshot/Digest | 메뉴/저니 스냅샷 | `AdminMenu`·`journey_decision_log` | KEEP_SEPARATE(★tamper-evident 아님·정본=`SecurityAudit::verify`·[[reference_menu_audit_log_not_tamper_evident]]) |

## 확장 대상(중복 신설 금지·기존 승격)
- Version Lifecycle/Deprecation 형식화 = 기존 API 버전 라우팅(`routes.php`) 정책의 **승격**(신규 엔진 아님).
- Immutable Roadmap History = `SecurityAudit::verify` 해시체인 패턴 재사용(신규 체인 신설 금지).
- Tenant Isolation = `Db.php` 격리 술어 재사용.
- Dependency Lifecycle = `composer.json`/`package.json` 목록을 소스로 삼되 EOL/lifecycle 계층만 신설.

## 판정
**중복 위험 낮음(순신설 도메인).** LTER 형식 엔티티는 grep 0으로 기존 구현과 겹치지 않는다. 단 동음이의 6종(마케팅 pipeline·ModelMonitor drift·정산 reconciliation·비즈니스 risk·schema checksum·메뉴 snapshot)은 **오흡수 금지**. 실행 시 기존 버전 라우팅·SecurityAudit·Db 격리를 확장하고, 새 해시체인/새 격리 엔진을 신설하지 않는다.
