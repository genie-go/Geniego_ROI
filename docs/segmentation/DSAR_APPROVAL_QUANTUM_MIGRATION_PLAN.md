# DSAR — Authorization Quantum Migration Planner (Part 3-23 §10)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — Approval Quantum Migration Planner

**APPROVAL_MIGRATION_PLAN**은 인가 도메인의 고전 암호 자산을 양자 내성(PQC 또는 hybrid) 알고리즘으로 **무중단 전환하기 위한 계획을 산출·추적**하는 계약이다. Registry(§1)의 자산과 Risk(§9)의 등급을 입력으로, 전환 순서·호환성·롤백·다운타임을 결정론적으로 도출한다.

계획 요소(개념 계약):
- **Asset Prioritization** — Risk 등급 × Criticality로 자산 전환 우선순위 산출(임의 순서 금지).
- **Migration Sequence** — 신뢰근(서명 root) 선행 → 파생 자산 후행. 의존 그래프 위상정렬.
- **Compatibility** — 구/신 알고리즘 dual-read 병존 창(hybrid) 정의. 검증자·소비자 하위호환.
- **Rollback** — 전환 단계별 역전 가능 지점·조건.
- **Risk(전환 리스크)** — 각 단계 실패 시 노출·영향 반경.
- **Downtime** — 무중단 목표 대비 예상 중단 창.

## 2. 실존 substrate 매핑

| 계약 요소 | 상태 | 근거(허용목록) |
|---|---|---|
| 무중단 교체 prototype — 봉투 버전 필드 | PRESENT(SOURCE·재사용) | `backend/src/Crypto.php:84-88` |
| 전환 대상 — AES 봉투암호 원문 | PRESENT(SOURCE) | `backend/src/Crypto.php:108-126` |
| 전환 대상 — RSA 서명 발급/검증 | PRESENT(SOURCE) | `backend/src/Handlers/EnterpriseAuth.php:536`·`:600` |
| 감사 체인 SHA-256(전환 시 무결성 기준) | PRESENT(SOURCE) | `backend/src/SecurityAudit.php:27` |
| **Migration Planner 엔진** | **ABSENT** | grep 0 — 순신설(greenfield) |
| Prioritization/Sequence/Compatibility/Rollback/Downtime 산출 | ABSENT | 계획 스키마·로직 부재 |
| PQC 목표 알고리즘 라이브러리 | ABSENT | `backend/composer.json:5-13` PQC 의존성 없음 |

봉투 버전 필드(`Crypto.php:84-88`)는 봉투 포맷을 판별하는 실재 메커니즘으로, dual-read 무중단 알고리즘 교체의 **proto**로 재사용 가능하나, 이를 계획적으로 구동하는 **Planner 계층은 전무**하다.

## 3. 설계 계약(규칙)

1. **재사용 우선**: 무중단 교체는 봉투 버전 필드(`Crypto.php:84-88`) dual-read 패턴을 확장 — 신규 병행 경로 난립 금지.
2. **자동 우선순위**: Sequence는 Risk(§9) 등급과 의존 그래프에서 파생 — 하드코딩 순서 금지.
3. **Fail-secure**: 전환 창 동안 구/신 검증 실패는 접근 거부(open-fail 금지).
4. **롤백 필수**: 각 전환 단계는 역전 지점을 정의하지 못하면 계획 무효.
5. **NOT_CERTIFIED 게이트**: Planner는 계획 산출·시뮬레이션만 — 실제 알고리즘 교체 집행은 별도 승인세션.

## 4. KEEP_SEPARATE

- PgSettlement 정산 마이그레이션·마케팅 알고리즘 전환은 crypto migration이 아니다 — 제외.
- ML 모델 재학습/롤아웃 계획(`backend/src/ModelMonitor.php:18-19`)은 crypto 전환과 무관 — 제외.

## 5. 판정

**NOT_CERTIFIED · ABSENT(순신설)**. 무중단 교체 proto(봉투 버전 `Crypto.php:84-88`)와 전환 대상 자산(AES `Crypto.php:108-126`·RSA `EnterpriseAuth.php:536`)은 SOURCE로 실재하나, Migration Planner는 grep 0(greenfield). PQC 목표 라이브러리 부재(`composer.json:5-13`)로 **BLOCKED_PREREQUISITE**. 본 DSAR은 설계 계약만 규정하며 코드 변경 0.
