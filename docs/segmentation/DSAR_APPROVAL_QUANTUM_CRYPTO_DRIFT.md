# DSAR — Approval Crypto Drift Detection (Part 3-23 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC)

**Crypto Drift Detection**은 인가(Authorization) 경로가 의존하는 암호 자산의 "선언된(승인된) 상태"와 "실제 운영 상태" 사이의 이탈(drift)을 지속적으로 감지하는 거버넌스 계약이다. Part 3-23은 PQC(Post-Quantum Cryptography) 전환을 전제로, 인가 substrate에 잔존하는 고전 암호(Classic Crypto)가 승인된 baseline에서 벗어나는 순간(알고리즘 다운그레이드, 만료 인증서, 회전 누락 키, 정책 위반)을 인가 결정 이전에 포착함을 요구한다.

Drift 5분류:
- **Algorithm Drift** — 승인된 알고리즘 목록(baseline)에서 벗어난 알고리즘/파라미터(키 길이·모드) 사용.
- **Certificate Drift** — 승인된 인증서 체인/만료/발급자에서의 이탈.
- **Key Drift** — 회전 주기·KEK 버전·키 소재 위치의 baseline 이탈.
- **Inventory Drift** — 카탈로그(§2 Inventory)에 미등록된 신규 암호 사용처 출현.
- **Policy Drift** — PQC 전환 정책/승인 정책과 실제 사용의 불일치.

## 2. Substrate 매핑 (Drift가 감시할 SOURCE 자산)

| Drift 축 | 현행 SOURCE(감시 대상, 고전 crypto) | 인용 |
|---|---|---|
| Algorithm | AES-256-GCM envelope 암복호 | `Crypto.php:108-126` |
| Algorithm/Key | 비대칭 키(엔터프라이즈 인증) | `EnterpriseAuth.php:536` |
| Algorithm(hash) | SHA-256 감사 해시체인 | `SecurityAudit.php:27` |
| Key | KEK 회전 지점 | `Crypto.php:133-148` |
| Key(secret) | api_key SHA-256 lookup | `Keys.php:40` |
| 의존성 baseline | crypto 라이브러리 선언 | `composer.json:5-13` |

Drift 엔진은 위 SOURCE를 **직접 수정하지 않고** 관측(observe)한다. Baseline은 §2 Inventory(별도 DSAR)가 제공하며, Drift는 Inventory snapshot과 live state의 차이를 산출한다.

## 3. 설계 계약 (Design Contract)

- **읽기 전용 관측**: Drift 감지기는 인가 경로에 부작용을 주지 않는다. 결과는 신호(signal)이며 자동 차단이 아니다(집행은 Policy 계층 별도 승인).
- **Baseline 의존성**: Inventory(§2)·Reconciliation(§23)이 선행 부재이므로 Drift는 **BLOCKED_PREREQUISITE**. 비교 baseline이 없으면 drift 계산 불가.
- **감사 연동**: Drift 이벤트는 append-only 감사(`SecurityAudit.php:27`·`:56-68` 해시체인)로 기록되어야 하며 신규 로그 스토어를 만들지 않는다.
- **PQC 전환 대비**: Algorithm Drift는 향후 PQC 표준(예: ML-KEM/ML-DSA) 채택 시 "고전 알고리즘 잔존"을 drift로 표기하는 확장점을 가진다.

## 4. KEEP_SEPARATE

- **ML 모델 드리프트**: `ModelMonitor.php:18-19`·`:42-43` 은 예측 모델의 성능/분포 drift로 **암호 drift와 완전 별개**. 명명 충돌만 존재하며 통합 금지 — 인벤토리/알고리즘/키 개념이 없다.

## 5. 판정

**ABSENT (greenfield)** — Crypto Drift 감지 엔진은 grep 0. 현행 코드에는 SOURCE 암호 자산만 실재(`Crypto.php:108-126`·`EnterpriseAuth.php:536`·`SecurityAudit.php:27`·`Crypto.php:133-148`)하고, 이들의 승인 상태 대비 이탈을 감시하는 계층은 없다. §23 Reconciliation 기반 위에 순신설되어야 하며, Inventory/Baseline 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
