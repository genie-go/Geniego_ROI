# DSAR — Crypto Compliance Manager + Threat Intelligence (Part 3-23 §12·§15)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

**Crypto Compliance Manager(§12)** 는 암호 사용이 표준·정책을 만족하는지 지속 판정한다: NIST(SP 800-131A 등)·FIPS 140-3·Key Rotation Policy·Certificate Policy. **Cryptographic Threat Intelligence(§15)** 는 외부 위협·표준 변화를 수집·상관한다: Cryptographic Vulnerability · PQC Standard Update · Algorithm Deprecation · Quantum Threat Report · Vendor Advisory. 두 서브시스템은 §16 CBOM을 입력으로, 위반/노후/위협 신호를 §7·§8 Lifecycle의 회전·폐기 트리거로 연결한다. 본 Part는 **판정·수집·상관의 거버넌스 평면**을 정의한다.

## 2. Substrate 매핑

| 기능 | 현행 substrate | 인용 | 판정 |
|---|---|---|---|
| Compliance 판정(NIST/FIPS) | (부재) | — | ABSENT |
| Key Rotation Policy 판정 | KEK/api_key 회전 존재하나 정책판정 없음 | `Crypto.php:133-148` | PARTIAL(회전만) |
| Certificate Policy 판정 | (부재) | — | ABSENT |
| 감사 evidence 저장소 | append-only 해시체인 evidence | `SecurityAudit.php:56-68` | 재사용 substrate |
| 감사 무결성 검증 | verify() 진입 | `SecurityAudit.php:27` | 재사용 substrate |
| Threat Intel 수집/상관 | (부재) | — | ABSENT |

## 3. 설계 계약(신설 대상)

- **Compliance Rules**: NIST/FIPS/Rotation/Certificate 정책을 CBOM(§16) 레코드에 대해 평가 → {compliant, deprecated, violation} 판정. 회전 존재(`Crypto.php:133-148`)는 있으나 "정책이 요구하는 주기·알고리즘 충족" 판정은 부재 → 신설.
- **Threat Intel Feed**: Vulnerability·PQC Standard Update·Algorithm Deprecation·Quantum Threat Report·Vendor Advisory 5소스 수집 → CBOM 자산과 상관 → 영향 키/인증서 식별. 전면 신설.
- **Evidence 재사용**: 모든 compliance 판정·threat 상관 결과는 신규 저장소 신설 금지, 기존 append-only evidence(`SecurityAudit.php:56-68`)에 기록하고 `verify()`(`SecurityAudit.php:27`)로 무결성 보증(중복 감사엔진 금지).
- **Lifecycle 연동**: violation/deprecation/threat-match 신호는 §7 Revocation·§8 Rotation의 트리거로 전달(자동집행은 승인정책 존중).

## 4. KEEP_SEPARATE

- `ModelMonitor.php:18-19` — ML 모델 드리프트/모니터링. 이름이 "monitor"로 유사하나 crypto compliance/threat 도메인과 무관 → 흡수·중복 금지, 별개 유지.

## 5. 판정

**ABSENT**. crypto compliance 판정(NIST/FIPS/Rotation/Certificate Policy)·threat intelligence(5소스) grep 0. 회전 substrate(`Crypto.php:133-148`)는 존재하나 정책 충족 판정 아님. 판정·수집·상관 평면 전면 순신설이되, 결과 저장은 기존 append-only evidence(`SecurityAudit.php:56-68`)·`verify()`(`SecurityAudit.php:27`) 재사용. 코드 변경 0 · BLOCKED_PREREQUISITE.
