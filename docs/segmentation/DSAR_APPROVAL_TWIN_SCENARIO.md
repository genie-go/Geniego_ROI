# DSAR — Authorization Digital Twin: What-if Scenario Engine (Part 3-22 §9)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §9 — What-if Scenario)

Authorization Digital Twin의 What-if Scenario Engine은 **운영 authz 상태를 변경하지 않고** 가상 변경(hypothetical mutation)을 격리 트윈 상태 위에서 평가한다. 지원 시나리오 8종:

- **Policy 추가/삭제** — 신규 정책 도입 또는 폐기 시 결정 분포 변화
- **Role 통합(merge)** — 두 역할 합병 시 권한 상속·중복 해소 영향
- **Permission 제거** — 특정 권한 회수 시 차단되는 주체·서비스 집합
- **Trust 임계값 변경** — Trust Score 게이트 상향/하향 시 승인·거부 재분류
- **Region 장애(failover)** — 리전 다운 시 authz 가용성·라우팅 파급
- **Tenant 증가** — 테넌트 확장 시 격리·용량·정책 복제 영향
- **Compliance 규정 변경** — 규제 룰 갱신 시 필수 승인·차단 재계산

출력 계약: **영향도(Impact) / 위험도(Risk) / 비용(Cost) / 예상결과(Projected Outcome)** 4축 리포트. 모든 시나리오는 read-only 트윈에서 실행되어 운영 정책·감사로그에 부작용 0.

## 2. Substrate 매핑

| Twin 요소 | 현행 substrate | 인용 | 상태 |
|---|---|---|---|
| authz what-if 시나리오 엔진 | 없음 (greenfield) | — | ABSENT |
| 정책 변경 감사 append-only | SecurityAudit 해시체인 | `SecurityAudit.php:56-67` | 인접(read 소스만) |
| authz 결정 baseline | UserAuth 토큰·역할 해석 | `UserAuth.php:1167` | 인접(현행값 스냅샷 소스) |
| 트윈 상태 저장소 | Db PDO 싱글턴 | `Db.php:63-87` | 인접(격리 테이블 신설 대상) |

★ authz 도메인 What-if는 grep 0 — 순신설.

## 3. 설계 계약

1. **격리(Isolation)**: 시나리오는 운영 authz 테이블에 쓰지 않고 트윈 스냅샷(복제본) 위에서만 mutate. 커밋 경로 없음.
2. **결정성(Determinism)**: 동일 baseline + 동일 가상변경 → 동일 4축 출력. 재현 가능.
3. **감사(Auditability)**: 시나리오 실행 자체는 append-only 로그(`SecurityAudit.php:56-67` 패턴 재사용)에 who/what/when 기록. verify()로 검증 가능.
4. **NO_MUTATION 불변식**: 시나리오 종료 후 운영 authz 상태 diff = ∅ 를 사후 assert.

## 4. KEEP_SEPARATE

- **가격 시뮬레이션** `PriceOpt.php:926-949` — 판매가/마진 what-if. 마케팅·커머스 도메인. authz policy what-if 아님.
- **캠페인/성장 시뮬** `AdminGrowth.php:1147-1151` — 성장 자동화 시나리오. 마케팅 도메인. policy 시나리오 아님.

두 엔진은 authz Digital Twin에 흡수 금지 — 도메인 경계 유지. 트윈 시나리오는 정책·역할·권한·Trust·리전·테넌트·컴플라이언스 대상만.

## 5. 판정

**ABSENT — greenfield 순신설.** authz what-if scenario 구현 grep 0. 운영 substrate(SecurityAudit·UserAuth·Db)는 read/기록 소스로만 인접 참조하며 신규 시나리오 엔진은 완전 신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 트윈 상태저장소·정책 스냅샷 계약 부재).
