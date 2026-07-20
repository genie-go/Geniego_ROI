# DSAR — Approval Crypto Analytics (Part 3-23 §20)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §20)

`APPROVAL_CRYPTO_ANALYTICS`는 crypto 상태를 정량 지표로 집계해 양자 대비 준비도를 측정·추세화하는 계약이다. Snapshot/Evidence를 시계열로 롤업해 다음 6개 지표를 산출한다.

| 지표 | 계약 정의 |
|------|-----------|
| PQC Coverage | PQC-ready 자산 / 전체 자산 비율 |
| Deprecated Algorithm Count | 폐기 예정 알고리즘 사용 자산 수 |
| Key Rotation Success | 회전 시도 대비 성공률 |
| Certificate Health | 유효·만료임박·만료 인증서 분포 |
| Migration Progress | classic→PQC 이관 누적 진척률 |
| Readiness Score | 상기 지표 가중 종합 양자 준비도 점수 |

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | 상태 |
|-----------|----------------|------|
| 지표 집계 파이프라인 | 없음 (crypto 지표 집계 부재) | ABSENT |
| Key Rotation baseline | KEK 회전 로직 (`Crypto.php:133-148`) | baseline만 |
| 회전 관찰 대상 | KEK 파생 (`Crypto.php:84-88`)·GCM 암호화 (`Crypto.php:108-126`·`:121`) | 관찰 대상 |
| PQC Coverage/Deprecated/Cert/Readiness | 없음 | ABSENT |

crypto analytics는 grep 0 — greenfield ABSENT. 유일한 baseline은 `Crypto.php:133-148` KEK 회전으로, Key Rotation Success 지표의 **관찰 대상 이벤트원**일 뿐 집계기가 아니다. `Crypto.php:84-88`(파생)·`:108-126`(암호화)·`:121`(tag)은 현행 알고리즘 인벤토리의 실제 사용처로, Deprecated Algorithm Count·PQC Coverage 산정 시 관찰되는 대상. PQC 자산·인증서·준비도 집계 로직은 전부 순신설.

## 3. 설계 계약

1. **집계는 read-only 롤업**: analytics는 Snapshot(§17)·Evidence(§18)를 읽어 지표를 산출할 뿐 `Crypto.php` 회전·파생을 변경하지 않는다(비파괴 관찰).
2. **Rotation Success는 관찰 파생**: `Crypto.php:133-148` 회전 결과를 이벤트로 관찰해 성공률을 파생 — 회전 로직 자체는 정본 유지.
3. **Readiness Score는 가중 종합**: 근거 없는 임의 점수 금지 — 5개 하위 지표에서 결정적으로 파생(SSOT 집계).
4. **순신설**: 지표 스키마·집계 파이프라인 전부 신규. 코드 0.

## 4. KEEP_SEPARATE (★)

- **ML drift/monitoring 지표는 분리** — `ModelMonitor.php:42-43`는 모델 성능 도메인 지표로 crypto analytics에 흡수 금지. crypto readiness와 model drift는 별개 축.
- **정산 지표는 분리** — `PgSettlement.php`(·`Wms.php:2160`) reconciliation 지표는 재무 도메인. crypto analytics와 혼입 금지.

## 5. 판정

**ABSENT** — crypto 지표 집계 부재(grep 0), 순신설. `Crypto.php:133-148` KEK 회전이 Key Rotation baseline이자 관찰 대상일 뿐 집계 substrate 아님. ML(`ModelMonitor.php:42-43`)·정산(`PgSettlement.php`)은 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 Snapshot §17·Evidence §18 부재).
