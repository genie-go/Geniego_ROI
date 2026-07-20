# DSAR — Approval Ops-Ready Integration Evidence (Part 3-25 §19·§29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §19·§29 Immutable Certification History)

`APPROVAL_INTEGRATION_EVIDENCE`는 통합 스냅샷(§18)에 첨부되어 **운영 개시 승인의 근거를 검증 가능한 형태로 봉인**하는 증거 묶음이다. §29 Immutable Certification History의 개별 증거 레코드로서 각 항목은 maker-checker 이중 확인과 해시체인 무결성을 요구한다. 필수 구성:

- **Integration Test Result** — 최종 통합 테스트 통과/실패 결과와 커버리지 요약.
- **Operational Sign-off** — 운영 책임자의 명시적 개시 승인(actor·timestamp).
- **Security·Compliance Approval** — 보안/컴플라이언스 게이트 통과 증적.
- **Production Certificate** — 운영 인증서(최종 배포 인가 토큰).

## 2. Substrate 매핑

| SPEC 요구 | 현존 substrate | 상태 |
|---|---|---|
| 증거 불변 봉인·검증 | `SecurityAudit.php:25-31`(append)·`:60-64`(체인 verify) | PARTIAL-substrate |
| Operational Sign-off 이중확인 | `Mapping.php:238-291`(maker-checker 승인 흐름) | PARTIAL-substrate |
| Integration Test Result | 없음 (integration 전용 증거 부재) | ABSENT |
| Production Certificate | 없음 (grep 0) | ABSENT — 순신설 |

## 3. 설계 계약

1. **증거 무결성**: 각 Evidence 항목은 `SecurityAudit.php:25-31`로 append, `:60-64` 해시체인으로 verify. Snapshot(§18) ID를 부모로 귀속하여 통합 증거 계보를 형성한다.
2. **이중 확인 재사용**: Operational Sign-off는 `Mapping.php:238-291`의 maker-checker 승인 패턴을 **integration sign-off로 확장**한다(신규 승인 엔진 신설 금지 — 기존 확장).
3. **Production Certificate 신설**: 운영 인증서는 substrate 부재. 스냅샷 봉인 + 전 증거 verify 통과를 전제로만 발급(순신설·fail-closed).
4. **무후퇴**: Security·Compliance Approval은 기존 컴플라이언스 게이트 결과를 증거로 인용하되 우회 경로를 만들지 않는다.

## 4. KEEP_SEPARATE

- 보안 감사 해시체인(`SecurityAudit.php`)은 무결성 substrate로 **확장**하되, 그 자체를 통합 증거 저장소로 치환하지 않는다(감사 로그 의미론 보존).
- maker-checker(`Mapping.php:238-291`)는 매핑 승인 도메인 원용도를 유지한다.

## 5. 판정

**PARTIAL-substrate**. SecurityAudit 해시체인(`SecurityAudit.php:25-31`·`:60-64`)의 verify와 maker-checker(`Mapping.php:238-291`)를 integration evidence로 확장 가능하나, Integration Test Result·Production Certificate는 순신설이다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE.
