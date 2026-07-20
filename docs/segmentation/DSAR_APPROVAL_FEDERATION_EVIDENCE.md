# DSAR — Approval Federation Evidence (Part 3-18 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_18_FEDERATION_CROSS_DOMAIN_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FEDERATION_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FEDERATION_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FEDERATION_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §21)

**APPROVAL_FEDERATION_EVIDENCE**는 연합 인가 판정이 정당했음을 사후 감사·분쟁 시 증명하는 증거 묶음이다. 하나의 증거 레코드는 다음 5요소를 포함한다.

| 요소 | 의미 |
|------|------|
| Trust Validation | 판정 시점 도메인 신뢰 검증 결과·근거 |
| Decision Evidence | 인가 판정을 뒷받침한 규칙·입력·산출 경로 |
| Certificate Validation | 참여 도메인 인증서 유효성 검증 기록 |
| Policy Exchange History | 도메인간 교환된 정책 버전·시각 이력 |
| Contract Reference | 연합 계약(federation contract) 참조 |

Evidence는 재현 가능(reproducible)하고 tamper-evident해야 하며, 모든 요소는 검증 가능한 원장에 고정되어야 한다.

## 2. Substrate 매핑

| SPEC 요구 | 현존 substrate | file:line | 상태 |
|-----------|----------------|-----------|------|
| Tamper-evident 증거 원장 | SecurityAudit 해시체인 | `backend/src/SecurityAudit.php:14-67` | 확장 가능 |
| 증거 무결성 검증 | `verify()` | `backend/src/SecurityAudit.php:56` | 재사용 |
| 다이제스트 봉인 | 해시 연결 | `backend/src/SecurityAudit.php:43-52`·`:62-67` | 재사용 |
| 대행 감사 이벤트 기록 | AgencyPortal audit | `backend/src/Handlers/AgencyPortal.php:497-501` | 도메인간 증거 원형 |
| Certificate/Policy Exchange History | 없음(grep 0) | — | **ABSENT** |

현존 substrate가 실재한다. SecurityAudit 해시체인(`backend/src/SecurityAudit.php:14-67`)은 tamper-evident append-only 원장이고 `verify()`(`:56`)가 재현·연결을 검증한다. AgencyPortal의 감사 기록(`backend/src/Handlers/AgencyPortal.php:497-501`, 승인 재검증 `:416`)은 대행 주체가 테넌트 경계를 넘어 행위할 때 증거를 남기는 **도메인간 증거의 원형**이다.

## 3. 설계 계약 (substrate 확장)

1. Decision Evidence·Trust Validation은 SecurityAudit 해시체인(`:14-67`)에 판정 다이제스트를 append하여 재현 가능하게 고정한다. 검증은 기존 `verify()`(`:56`) 재사용.
2. AgencyPortal 감사 패턴(`:497-501`)을 참조 모델로 삼아, 도메인간 인가 이벤트마다 증거 레코드를 발행한다.
3. **Certificate Validation·Policy Exchange History·Contract Reference는 grep 0 = 순신설**. 도메인간 정책·인증서 교환 채널 자체가 부재하므로 신규 구축.
4. 증거 요소는 절대 갱신(update)되지 않으며 정정은 신규 증거 append로만.

## 4. KEEP_SEPARATE

- **DataTrust**(`backend/src/Handlers/DataPlatform.php:281`)의 신뢰 검증은 데이터 품질 증거이지 인가 증거가 아니다 — Trust Validation 요소에 혼입 금지.
- **GraphScore**(`backend/src/Handlers/GraphScore.php:31`)·attribution 근거는 마케팅 도메인 소유 — federation evidence로 흡수하지 않는다.

## 5. 판정

**PRESENT-substrate** — Tamper-evident 증거 기반(SecurityAudit 해시체인 `backend/src/SecurityAudit.php:14-67`·`verify()` `:56`)과 도메인간 증거 원형(AgencyPortal `backend/src/Handlers/AgencyPortal.php:497-501`)은 실재하며 federation evidence로 확장한다. 단, Certificate/Policy Exchange History·도메인간 교환은 grep 0 = 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
