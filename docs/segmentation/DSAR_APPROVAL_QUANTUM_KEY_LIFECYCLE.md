# DSAR — Key Lifecycle Manager (Part 3-23 §7)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Key Lifecycle Manager는 암호 키의 전(全) 생애 8단계 — Generation → Registration → Activation → Rotation → Suspension → Revocation → Archival → Destruction — 을 상태기계로 관장하는 거버넌스 서브시스템이다. PQC 전환의 전제로, 모든 키는 (algorithm, classical|pqc|hybrid, KEK-wrapped state, state, custody) 5속성을 갖는 단일 registry에 등재되고, 상태전이는 감사불변 이벤트로 기록되어야 한다. 본 Part는 **키의 존재를 발견/등재/폐기/보관하는 관리평면**을 정의한다(암·복호 실행평면 아님).

## 2. Substrate 매핑

| 생애단계 | 현행 substrate | 인용 | 판정 |
|---|---|---|---|
| Generation | KEK 생성(무작위 32B) | `Crypto.php:45-74` | PARTIAL |
| Rotation(KEK) | KEK 회전·dual-read | `Crypto.php:133-148` | PARTIAL |
| Rotation(api_key) | api_key 재발급 | `UserAuth.php:4391` | PARTIAL |
| Rotation 트리거 | kek-rotate 관리 핸들러 | `Keys.php:119` | PARTIAL |
| Rotation 라우트 | kek-rotate 배선 | `routes.php:931` | PARTIAL |
| Registration | (부재 — registry 스키마 없음) | — | ABSENT |
| Activation | (부재 — 명시 상태전이 없음) | — | ABSENT |
| Suspension | (부재) | — | ABSENT |
| Revocation | (부재 — 즉시 무효화·CRL 없음) | — | ABSENT |
| Archival | (부재 — retired 키 보존정책 없음) | — | ABSENT |
| Destruction | (부재 — 파기 증빙 없음) | — | ABSENT |

## 3. 설계 계약(신설 대상)

- **Key Registry**: 키를 상태기계 레코드로 등재. 상태={generated,registered,active,rotating,suspended,revoked,archived,destroyed}. crypto_type={classical,pqc,hybrid}. 기존 Generation/Rotation substrate를 registry 이벤트 소스로 흡수(재구현 금지, 확장).
- **Registration**: Generation 산출 키를 registry에 원자 등재. 미등재 키 사용 금지(fail-closed).
- **Suspension/Revocation**: active→suspended(가역)·→revoked(불가역). revoked 키 참조 시 즉시 거부. 폐기 사유·행위자·시각을 감사 이벤트로.
- **Archival/Destruction**: retired 키는 즉시 삭제 아닌 archival 격리 후 정책기간 경과 시 destruction, 파기 증빙 기록.
- 모든 상태전이는 append-only 감사(별도 §12 evidence 재사용)로 기록.

## 4. KEEP_SEPARATE

- `AdminGrowth.php:21` — HSM/KMS/Vault를 은유적으로 언급하는 주석. 실 키 저장소가 아니며 본 매니저의 custody backend로 오인 금지(별개 유지).

## 5. 판정

**PARTIAL**. Generation(`Crypto.php:45-74`)·Rotation(`Crypto.php:133-148`·`UserAuth.php:4391`·`Keys.php:119`·`routes.php:931`)만 실재하고 회전 이외의 6단계(Registration/Activation/Suspension/Revocation/Archival/Destruction)와 상태기계 registry는 **순신설**. revocation·archival·destruction 부재로 폐기·보관 증빙이 없어 PQC 전환 전제 미충족. 코드 변경 0 · BLOCKED_PREREQUISITE.
