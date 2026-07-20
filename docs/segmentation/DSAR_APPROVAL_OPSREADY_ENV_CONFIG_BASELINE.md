# DSAR — Environment Validation + Config Baseline (Part 3-25 §7·§8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

Part 3-25 §7·§8은 배포 파이프라인 전 단계의 **환경 검증(Environment Validation)과 구성 기준선(Config Baseline)**을 규정한다.

- **§7 Environment Validation**: Dev / QA / Staging / Pre-Prod / Prod / DR 각 환경에 대해 Version / Config / Secret / Certificate / Network / Dependency 6항목이 기대 사양과 일치하는지 검증. 환경 간 물리·논리 격리가 보장되어야 하며, 잘못된 환경으로의 교차 유입은 fail-closed 차단.
- **§8 Config Baseline**: Golden Baseline(승인된 기준 구성)·Immutable Baseline(변경 불가 봉인)·Drift Detection(기준선 이탈 감지). 실행 구성이 golden에서 벗어나면 승격을 차단.

핵심 불변식: **환경 오배치는 운영 사고다** — 데모 트래픽이 운영 DB를 오염시키는 종류의 1줄 누락을 코드/기준선 레벨에서 원천 차단해야 한다.

## 2. Substrate 매핑

| SPEC 항목 | 현존 substrate | file:line | 상태 |
|---|---|---|---|
| 환경 식별(게이트용) | Db::env() — 미설정 시 production fail-safe | `Db.php:43-48` | PARTIAL |
| 환경 라벨(관측성) | Db::envLabel() — 게이트/표시 분리 | `Db.php:56-61` | PARTIAL |
| 환경 오염차단 코드가드 | pdoDemo — 데모 DB명 `_demo` 강제 폴백 | `Db.php:71-87`·`:81-84` | PARTIAL |
| Config 로딩(secret/env) | loadEnvFile — .env 직접 파싱·멱등 | `Db.php:93-110` | PARTIAL |
| Config 미러(양환경 정합) | AdminPlans sibling 미러 | `AdminPlans.php:53-71`·`:157`·`:180`·`:209` | PARTIAL |
| Golden / Immutable Baseline | — | (grep 0) | ABSENT |
| Drift Detection | — | (grep 0) | ABSENT |
| Version/Cert/Network/Dependency 검증 | — | (grep 0) | ABSENT |

`Db.php:43-48`(env 게이트, 미설정=production 안전기본)과 `:56-61`(표시 전용 envLabel — 게이트와 분리)은 환경 식별의 이중 substrate다. `:71-87`·`:81-84`는 데모 DB명이 운영명으로 폴백할 때 `_demo`를 코드로 강제해 **교차 오염을 물리 차단**하는 fail-closed 가드로, §7 환경 격리 계약의 핵심 사례다. `:93-110`(loadEnvFile)은 .env를 직접·멱등 파싱해 Config/Secret을 로드한다. `AdminPlans.php:53-71`(sibling 스키마 풀-테이블 미러)·`:157`·`:180`·`:209`는 양 환경 구성 정합을 유지하는 실 substrate다. 그러나 **Golden/Immutable Baseline·Drift Detection·Version/Certificate/Network/Dependency 검증은 부재**(grep 0).

## 3. 설계 계약

- **Environment Validation**: 6환경 × 6항목 매트릭스. 환경 식별은 `Db.php:43-48` 게이트를 권위로, 표시/증적은 `:56-61`을 사용(계약상 두 경로를 절대 교차 사용 금지 — 데모 관리자 403 오차단 회피). 오염 방지 불변식은 `:71-87`·`:81-84` 가드를 정본 참조모델로 채택.
- **Config Baseline(Golden)**: 승인된 기준 구성을 스냅샷·서명. 실행 구성은 `Db.php:93-110`이 로드한 env·`AdminPlans.php:53-71`이 미러한 plan 테이블을 실측 소스로 삼아 golden과 대조.
- **Immutable Baseline**: golden 승인본을 봉인(변경 시 재승인 필요). 무결성 서명은 append-only 증적 패턴 재사용.
- **Drift Detection**: 실행 구성 vs golden 차분을 주기 스캔, 이탈 시 승격 BLOCKED(fail-closed). 기존 어느 핸들러도 baseline/drift를 겸하지 않으므로 순신설이 중복 아님.

## 4. KEEP_SEPARATE

- 커머스/데이터 도메인의 환경·구성 로직(외부 채널 자격증명·데이터 커넥터 설정)은 본 운영 기준선과 별개다 — Config Baseline은 **플랫폼 인프라 구성**을 다루며, 도메인별 자격/설정 저장은 각 도메인 소유. 명칭 중복만으로 흡수 금지.

## 5. 판정

**PARTIAL** — Environment Validation·Config Baseline의 substrate는 실재한다: 환경 식별/라벨 분리(`Db.php:43-48`·`:56-61`), 오염차단 코드가드(`:71-87`·`:81-84`), Config 로딩(`:93-110`), 양환경 미러(`AdminPlans.php:53-71`·`:157`·`:180`·`:209`). 그러나 Golden/Immutable Baseline·Drift Detection·환경 validation 매트릭스는 부재 → **순신설**. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 foundation 미확정).
