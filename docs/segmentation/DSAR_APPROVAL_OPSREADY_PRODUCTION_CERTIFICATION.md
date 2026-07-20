# DSAR — Production Certification Governance (Part 3-25 §2·§15)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §2·§15 Certification Engine)
Production Certification Engine은 운영 배포 직전 **"이 릴리스가 운영 승격 자격을 갖췄는가"**를 단일 권위로 판정·발급한다. 산출물은 **Production Certificate**로, 다음 5개 발급조건(gate)을 모두 통과해야 발급된다: (a) 테스트 승인, (b) 보안 승인, (c) 운영 준비 승인, (d) 규정/컴플라이언스 승인, (e) 성능 승인. Certificate는 불변 필드를 갖는다 — **Certificate ID·발급 Date·Scope(대상 릴리스/환경)·Expiration(유효기간)·발급자(maker)·승인자(checker)·근거 evidence 참조**. 만료 또는 Scope 밖 배포는 재인증을 강제한다.

## 2. Substrate 매핑
| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| Certificate 발급·불변 원장 | append-only 감사 해시체인 `SecurityAudit.php:25-31` | 재사용 substrate (Certificate 전용 레코드 없음) |
| 발급 evidence 검증 | 체인 verify `SecurityAudit.php:60-64` | 재사용 (인증 증거 앵커) |
| maker-checker 발급 승인 | 승인 큐/이중승인 골격 `Mapping.php:238-291` | 재사용 substrate |
| Production Certificate 엔티티 | grep 0 | **ABSENT — 순신설** |
| 발급조건 5-gate 집계기 | grep 0 | ABSENT — 순신설 |

## 3. 설계 계약
- **CertificateRecord**: `{cert_id, release_scope, environment, issued_at, expires_at, maker, checker, gate_results[5], evidence_refs[]}` — 발급·만료·폐기 이벤트는 전부 `SecurityAudit.php:25-31` append-only 체인에 기록하고 `SecurityAudit.php:60-64` verify로 위변조 불가를 보장한다. Certificate 자체 저장소는 신설이되 **증거 앵커는 기존 체인 재사용**(중복 원장 금지).
- **5-Gate 발급조건**: 테스트/보안/운영/규정/성능 각 게이트는 독립 evidence 참조를 요구하며, 하나라도 미충족이면 발급 자체가 거부(fail-closed). 부분 통과 상태의 "임시 인증서" 개념은 금지.
- **maker-checker 강제**: 발급자와 승인자는 동일인 불가 — 기존 `Mapping.php:238-291` 이중승인 골격을 발급 워크플로에 재사용한다(별도 승인엔진 신설 금지).
- **만료·Scope 강제**: Expiration 경과 또는 Scope 불일치 배포는 자동 차단, 재인증 요구.

## 4. KEEP_SEPARATE
- **Part3-8 Role Certification**(`AccessReview.php:16-17`) — 사람/역할 접근권 재인증. 릴리스 운영 인증과 도메인·주체·주기가 상이 → 통합 금지.
- **kc_cert / 지식·설정 인증**(`PriceOpt.php:63`·`PriceOpt.php:345`) — 가격최적화 도메인 로컬 인증 표식. Production Certificate와 무관 → 흡수 금지.

## 5. 판정
**ABSENT — greenfield (Production Certification grep 0).** Production Certificate/발급조건 5-gate/만료·Scope 엔진 일체 부재. 인증 evidence 앵커는 `SecurityAudit.php:25-31`·`SecurityAudit.php:60-64`(append-only 체인·verify)로, 발급 승인은 `Mapping.php:238-291`(maker-checker)로 **재사용**하여 신설하되, Certificate 엔티티·5-gate 집계기는 **순신설**. Role cert·kc_cert는 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED.
