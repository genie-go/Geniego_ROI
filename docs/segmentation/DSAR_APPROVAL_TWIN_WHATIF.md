# DSAR — Authorization Digital Twin: What-if Scenario Engine & Scenario Comparison (Part 3-22 §9·§17)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §9 What-if · §17 Scenario Comparison)

What-if Scenario Engine은 authz 변경을 **실 적용 없이** Digital Twin 위에서 가상 실행하여 영향을 평가한다. What-if 시나리오 유형:

- **Policy 추가/삭제** — 신규·제거 정책이 승인·거부 그래프에 미치는 파급
- **Role 통합** — 역할 병합 시 권한 상속·충돌·과권한 변화
- **Permission 제거** — 권한 회수 시 업무 차단·최소권한 개선 효과
- **Trust/Region/Tenant/Compliance 변경** — 신뢰도·지역·테넌트·규제 컨텍스트 변동의 접근 결정 영향

Scenario Comparison(§17): **Scenario A vs B** · **Current vs Proposed**를 5개 축으로 평가 — Cost / Risk / Compliance / Performance / Availability.

## 2. Substrate 매핑

| What-if 요소 | 현행 substrate | 인용 | 상태 |
|---|---|---|---|
| authz what-if 엔진 | 없음 (greenfield) | — | ABSENT (grep 0) |
| 정책 평가 근거 이력 | SecurityAudit 해시체인 | `SecurityAudit.php:56-67` | 인접(read-only 시드) |
| compliance 평가 축 | Compliance readiness | `Compliance.php:267` | 인접(정적 판정·what-if 아님) |
| 시나리오 결과 저장 | Db PDO | `Db.php:458-467` | 인접(신설 테이블 대상) |

★ authz what-if는 grep 0 — 순신설. 현행에 정책 변경을 가상 실행하는 시뮬레이터·A/B 비교기는 부재.

## 3. 설계 계약

1. **Shadow 실행(비파괴)**: 시나리오는 Twin 사본 위에서만 평가 — 실 정책/역할/권한 mutate 0.
2. **결정론적 재현**: 동일 시나리오 입력은 동일 결과. 스냅샷 기준 시점 고정(Current 기준선 명시).
3. **5축 정량 평가**: Cost/Risk/Compliance/Performance/Availability 각각 근거·산식 명시. 임의 점수 금지(SSOT 파생).
4. **Comparison 정합**: A vs B·Current vs Proposed는 동일 기준선·동일 평가 축으로만 비교. 축 혼용 금지.
5. **근거 정합(Trust First)**: 입력 이력은 append-only 감사(`SecurityAudit.php:56-67`). 목데이터 배제.

## 4. KEEP_SEPARATE

- **가격 시뮬레이션** `PriceOpt.php:926-949`·`:927` — 가격 탄력·이익 시뮬. 커머스/가격 도메인.
- **캠페인/성장 시뮬** `AdminGrowth.php:1147-1151` — 성장 자동화 캠페인 시뮬. 마케팅 도메인.
- **MMM frontier** `Mmm.php:118-129` — 미디어믹스 지출 최적화. 마케팅 도메인.
- **의사결정 엔진** `Decisioning.php:307` — 비즈니스 decisioning. 마케팅/의사결정 도메인.

이들은 가격·캠페인·미디어믹스·비즈니스 결정을 시뮬레이션하며 **정책(policy) what-if가 아니다** — 흡수·재사용 금지. authz What-if는 정책/역할/권한/Trust/규제 컨텍스트 변경만 대상으로 한다.

## 5. 판정

**ABSENT — greenfield 순신설.** authz what-if·scenario comparison grep 0. Compliance(`Compliance.php:267`)는 정적 readiness 판정으로 가상 시나리오 실행 아님. PriceOpt/AdminGrowth/Mmm/Decisioning은 가격·마케팅·의사결정 시뮬로 policy what-if와 무관 — KEEP_SEPARATE. Shadow 실행·5축 정량 평가·동일 기준선 비교를 계약으로 명시. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 Digital Twin substrate·정책 스냅샷·평가 축 정규화 부재).
