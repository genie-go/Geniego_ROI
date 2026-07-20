# DSAR — Deployment Configuration Baseline Governance (Part 3-25 §2·§8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §2·§8 Config Baseline)
Deployment Configuration Baseline은 **"운영에 승인된 설정의 정본(定本)"**을 단일 권위로 고정하고 배포 시점의 실제 설정이 그 정본과 일치하는지 검증한다. 구성요소: **Golden Baseline**(승인된 기준 설정 집합), **Approved Baseline**(maker-checker 승인 이력 부착), **Immutable Baseline**(승인 후 위변조 불가·재승인 없이는 변경 불가), **Environment Override**(환경별 허용된 차이 명세), **Drift Baseline**(런타임 실제값 vs 정본 편차 감지 기준). 목표는 "미승인 설정으로의 조용한 운영 승격" 차단.

## 2. Substrate 매핑
| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| 환경 설정 로딩(정본 원천 후보) | `.env` 직접 파싱·환경 해석 `Db.php:43-48` | PARTIAL (설정 원천 존재, 정본화 안 됨) |
| DB 접속/폴백 환경 분기 | `Db.php:71-87` | PARTIAL (환경별 override의 사실상 위치) |
| 플랜/설정 미러(승인 대상 설정) | 플랜 config 미러 `AdminPlans.php:53-71` | PARTIAL (설정 표면, baseline 아님) |
| Golden/Immutable/Drift Baseline | grep 0 | **ABSENT — 순신설** |

## 3. 설계 계약
- **Golden Baseline**: 운영 승인 설정의 캡처 스냅샷. 원천은 기존 `Db.php:43-48`(`.env` 파싱)·`Db.php:71-87`(환경 분기)·`AdminPlans.php:53-71`(플랜 config 미러)에서 **읽어 정본화**하되, baseline 스냅샷 저장소는 신설(중복 설정 소스 신설 금지 — 기존 값을 참조·고정만).
- **Approved / Immutable Baseline**: 스냅샷은 maker-checker 승인 후에만 Golden으로 승격되고, 승격 즉시 불변화된다. 변경은 반드시 재승인을 경유하며, 변경·승격 이벤트는 append-only 감사에 앵커링한다.
- **Environment Override 화이트리스트**: 운영/데모 등 환경별 허용 차이는 명시 목록으로만 인정. 목록 밖 차이는 전부 Drift로 분류.
- **Drift Baseline**: 런타임 실제 설정을 Golden과 비교, 미승인 편차를 위반으로 표면화(fail-closed 경보). 자동 정정은 하지 않음(감지·차단만, 289차 무후퇴 원칙).

## 4. KEEP_SEPARATE
- **런타임 DB 폴백 로직**(`Db.php:71-87`) — MySQL→SQLite 투명 폴백은 가용성 메커니즘이지 baseline 정본이 아님. Drift 감지의 관찰 대상일 뿐, baseline 엔진에 흡수 금지.
- **AdminPlans 플랜 config 미러**(`AdminPlans.php:53-71`) — 요금제 표면 설정. Golden Baseline의 입력 소스로 참조하되 baseline 저장소로 재정의 금지.

## 5. 판정
**PARTIAL.** 설정 원천은 존재(`Db.php:43-48`·`Db.php:71-87`·`AdminPlans.php:53-71`)하나 이는 흩어진 런타임 설정 표면일 뿐, **Golden/Approved/Immutable/Drift Baseline 정본화 계층은 grep 0 — 순신설**. 신설 baseline은 기존 설정 소스를 **읽어 고정·비교**만 하고 새 설정 소스를 만들지 않으며, 승인은 maker-checker·이벤트는 append-only 체인에 앵커링. 코드 변경 0 · NOT_CERTIFIED.
