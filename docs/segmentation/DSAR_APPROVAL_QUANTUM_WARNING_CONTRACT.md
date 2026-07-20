# DSAR — Authorization Quantum-Ready Warning Contract (Part 3-23 §27)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Warning Contract(§27)는 Error Contract(§26)의 하드-실패와 대비되는 **비차단(non-blocking) 경고** 5종을 정의한다. 경고는 연산을 막지 않되 양자내성 저하 추세를 조기 통지하여 사전 조치를 유도한다: Certificate Near Expiration(인증서 만료 임박), Key Rotation Due(키 회전 도래), PQC Migration Delayed(PQC 마이그레이션 지연), Deprecated Algorithm Detected(폐기 알고리즘 관측), Quantum Readiness Score Declining(양자준비 점수 하락). 각 경고는 severity·권고 조치·측정 시점을 수반하며 §28 Analytics로 집계된다. Error(deny)와 달리 Warning은 진행을 허용하되 audit·대시보드에 누적된다.

## 2. Substrate 매핑

| 경고 | 관측 대상(설계상) | 근접 substrate | 인용 | 판정 |
|---|---|---|---|---|
| Deprecated Algorithm Detected | 약한해시 사용 관측 | SHA-1 고객식별 | `CRM.php:589` | 관측대상·경고부재 |
| Deprecated Algorithm Detected | 약한해시 사용 관측 | MD5 주문지문 | `OrderHub.php:992` | 관측대상·경고부재 |
| Key Rotation Due | KEK/키 회전 주기 | KEK 파생 | `Crypto.php:133-148` | 근접·주기메타 부재 |
| Certificate Near Expiration | SAML/인증서 만료 | SAML 서명검증 | `EnterpriseAuth.php:597` | 근접·만료추적 부재 |
| PQC Migration Delayed·Quantum Readiness Score Declining | 마이그레이션 진척 | (없음) | — | ABSENT-greenfield |

경고 5종·severity·집계 로직 모두 grep 0 — 코드 전무.

## 3. 설계 계약

- **비차단 원칙**: Warning은 연산을 통과시키되 신호만 발행. Error(§26)로 승격되는 임계선(예: 만료 D-0, 회전 초과, readiness 임계 이하)은 SPEC에 별도 정의.
- **severity 계층**: INFO<NOTICE<WARN. Quantum Readiness Score 하락 폭에 비례해 severity 상향.
- **근접 재사용**: Certificate Near Expiration은 기존 SAML 검증 경로(`EnterpriseAuth.php:597`)의 인증서 메타에서, Key Rotation Due는 KEK 파생(`Crypto.php:133-148`)의 회전 메타에서 파생(신규 메타 필드 요함·비파괴).
- **Deprecated Algorithm Detected**: §25 정적 표적(SHA-1/MD5 산재)의 런타임 관측분을 경고로 발행 — deny 아닌 통지.
- **감사/집계**: 경고를 `SecurityAudit.php:27` append(`:56-68` verify)로 기록하고 §28 Analytics로 롤업. 무후퇴 — 경고 누락 금지.
- **격리**: 경고 payload tenant scope. 교차 테넌트 crypto 상태 누출 금지.

## 4. KEEP_SEPARATE

해당 없음.

## 5. 판정

**ABSENT** — Deprecated Algorithm 관측 대상(SHA-1 `CRM.php:589`·MD5 `OrderHub.php:992`)과 Certificate/Key Rotation 근접 substrate(`EnterpriseAuth.php:597`·`Crypto.php:133-148`)는 실재하나 **경고 발행·severity·readiness 점수·집계는 어디에도 없다**. 순신설. BLOCKED_PREREQUISITE(readiness scoring·마이그레이션 추적 부재·PQC 라이브러리 부재 `composer.json:5-13`). 코드 변경 0.
