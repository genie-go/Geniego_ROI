# DSAR — Production Readiness Assessment (Part 3-25 §6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

Part 3-25 §6은 운영 승격(Go-Live) 직전 **7개 축의 준비도 검증(Validation)과 종합 스코어링**을 규정한다: Architecture / Security / Performance / Compliance / Capacity / DR(Disaster Recovery) / HA(High Availability). 각 축은 실측 introspection 기반 증적을 요구하며(선언·주장 금지), validation gate는 임계 미달 축이 하나라도 있으면 승격을 차단(fail-closed)한다.

핵심 불변식: **준비도는 자기신고가 아니라 실측이다** — health probe·메트릭·컴플라이언스 스코어카드가 라이브 데이터를 읽어야 하며, 미달 축은 0점 처리하되 사유를 명시(관측 가능성 우선).

## 2. Substrate 매핑

| SPEC 축 | 현존 substrate | file:line | 상태 |
|---|---|---|---|
| Architecture/HA — 라이브니스 | Health probe(DB ping + 503 게이트) | `Health.php:27-45` | PARTIAL |
| Performance — 인프라 실측 메트릭 | SystemMetrics 모듈 프로브(admin 전용) | `SystemMetrics.php:60-83` | PARTIAL |
| Architecture — 마이그레이션/스키마 상태 | SystemMetrics probeMigrations | `SystemMetrics.php:127-351`·`:323-351` | PARTIAL |
| Compliance — 준비도 스코어카드 | Compliance posture(SOC2/ISO 실측) | `Compliance.php:50-128`·`:120-124` | PARTIAL |
| Capacity / DR / Validation Gate | — | (grep 0) | ABSENT |
| 종합 Readiness 스코어(7축) | — | (grep 0) | ABSENT |

`Health.php:27-45`는 DB round-trip을 실측해 `db.ok` 미달 시 HTTP 503으로 강등하는 라이브니스 게이트로, Architecture/HA 축의 부분 substrate다. `SystemMetrics.php:60-83`(모듈 배열 프로브)·`:127-351`·`:323-351`(schema_migrations count/last 실측)은 Performance/Architecture 축의 인프라 실측을 제공한다. `Compliance.php:50-128`은 SOC2 TSC·ISO 27001 컨트롤을 introspection해 `readiness_pct`(`:120-124`, implemented=1.0·available=0.5·manual=0 가중)를 산출 — **Compliance 축은 이미 스코어링 형태를 갖췄다**. 그러나 7축을 하나로 묶는 **통합 validation gate·종합 스코어링·Capacity/DR 검증은 부재**(grep 0).

## 3. 설계 계약

- **Validation Gate**: 7축 각각을 substrate 실측으로 채점, 임계 미달 축 발견 시 승격 BLOCKED(fail-closed). Compliance 축은 `Compliance.php:120-124`의 가중 스코어 방식을 상위호환 재사용 — 신규 스코어 엔진 신설 금지.
- **Architecture/HA**: `Health.php:27-45`의 503 게이트를 준비도 신호로 승격(라이브니스=HA 최소조건). `SystemMetrics.php:323-351` 마이그레이션 상태를 스키마 드리프트 축 증적으로 편입.
- **Performance/Capacity**: `SystemMetrics.php:60-83` 모듈 프로브(latency/rpm/error_rate 집계)를 Capacity 임계 판정 입력으로 사용. DR 축(백업·복구 RTO/RPO 검증)은 substrate 부재 → 순신설.
- **종합 스코어링**: 축별 점수를 가중합해 Go/No-Go 단일 판정 산출. 기존 어느 핸들러도 7축 종합을 겸하지 않으므로 순신설이 중복 아님.

## 4. KEEP_SEPARATE

- **DataTrust 준비도**는 별개 도메인이다 — `DataPlatform.php:218-309`(데이터 품질·신뢰도 레코드 스캔)·`:281`은 **데이터 인텔리전스의 Intelligence Readiness**(READY/WARNING/BLOCKED)로, 운영 인프라 승격 준비도와 목적이 다르다("readiness" 명칭 충돌만 있을 뿐). 흡수 금지 — 별도 유지.

## 5. 판정

**PARTIAL** — Production Readiness Assessment의 substrate는 4개 축에 걸쳐 실재한다: 라이브니스(`Health.php:27-45`), 인프라 메트릭(`SystemMetrics.php:60-83`·`:127-351`·`:323-351`), 컴플라이언스 스코어카드(`Compliance.php:50-128`·`:120-124`). 그러나 7축을 묶는 통합 validation gate·종합 스코어링·Capacity/DR 검증은 부재 → **validation gate와 스코어링 계층은 순신설**. DataTrust readiness(`DataPlatform.php:218-309`·`:281`)는 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
