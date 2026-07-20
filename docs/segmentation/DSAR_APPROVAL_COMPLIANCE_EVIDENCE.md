# DSAR — Authorization Compliance Evidence Chain (Part 3-17 §20 · §32)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §20 Evidence Chain · §32 Immutable)

Compliance **Evidence Chain**은 인가(authorization) 결정·정책·검토·승인이 규제/통제(regulation/control) 관점에서 **위조 불가(tamper-evident)·재구성 가능(reconstructable)** 하게 보존됨을 증명하는 감사 아티팩트다. SPEC §20은 evidence를 6요소로 규정한다: Policy(무엇이 적용되었나)·Decision(무엇이 결정되었나)·Review(누가 검토했나)·Approval(누가 승인했나)·Snapshot(그 시점 상태)·Audit Trail(불변 연결). §32는 이 체인이 **append-only immutable hash chain**으로 봉인되어 사후 변조가 탐지 가능해야 함을 요구한다. 규제 대응의 핵심은 "evidence가 존재한다"가 아니라 "evidence가 **그 시점 이후 변경되지 않았음을 수학적으로 증명**한다"이다.

## 2. Substrate 매핑

| SPEC 요소 (§20/§32) | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| Immutable Hash Chain(append-only) | SecurityAudit 해시체인 append | `SecurityAudit.php:14-33` | PRESENT |
| Chain 무결성 검증(verify) | SecurityAudit::verify() | `SecurityAudit.php:56-68` | PRESENT(유일 tamper-evident) |
| Review/Approval 증거 기록 | AccessReview 증거 append | `AccessReview.php:224-233` | PARTIAL(api_key 축) |
| 2차(보조) 감사 체인 | AdminMenu audit 체인 | `AdminMenu.php:182-218` | PRESENT-보조 |
| Policy/Decision 스냅샷 posture | Compliance posture 산출 | `Compliance.php:53-130` | PARTIAL |
| Audit Export(외부 제출) | Compliance auditExport | `Compliance.php:269-300` | PARTIAL |

핵심 substrate는 `SecurityAudit.php:14-33`의 append 로직으로, 각 레코드가 직전 해시를 preimage에 포함(`SecurityAudit.php:25`,`:27`,`:32`)해 연결하고, `:56-68`의 verify()가 체인 재계산으로 변조 지점을 탐지한다. 이 verify()가 **repo 전체에서 유일하게 실재하는 tamper-evident 체인 검증**이다.

## 3. 설계 계약 (무후퇴 확장)

1. **Regulation/Control-scoped tagging**: `SecurityAudit.php:14-33` append 시 기존 payload를 훼손하지 않고 `control_id`·`regulation`·`evidence_class` 태그를 **부가(additive)** 한다. 기존 verify(`:56-68`) preimage 계산식은 불변 — 태그는 payload 내부 필드로만 편입되어 기존 레코드와 하위호환.
2. **6요소 조립(§20)**: Policy/Decision은 `Compliance.php:53-130` posture 스냅샷, Review/Approval은 `AccessReview.php:224-233` 증거 레코드, Audit Trail은 `SecurityAudit.php:56-68` verify 결과를 **참조(reference)** 로 묶는다. 별도 저장소 신설 없음 — 기존 3 substrate를 evidence view로 조합.
3. **Export 봉인(§32)**: `Compliance.php:269-300` auditExport는 산출 시점에 verify(`:56-68`)를 호출해 "verified_at + chain_head_hash"를 첨부한다. Export 자체는 immutable snapshot이며, 재제출 시 재검증으로 위조 여부를 증명.
4. **Fail-closed**: verify(`:56-68`)가 불일치를 반환하면 해당 evidence는 `TAMPERED` 상태로 export에서 제외(BLOCKED)한다. 검증 불가 evidence를 규제 제출물에 포함 금지.

## 4. KEEP_SEPARATE (혼입 금지)

- **Attribution "evidence"**(`Db.php:809`) — 마케팅 기여도 산출의 근거 데이터로, compliance evidence chain과 **의미·수명주기·테넌트 축이 다르다**. 명명이 유사할 뿐 authz 감사 증거가 아니므로 절대 병합 금지.
- **Ops audit_log**(`Compliance.php:177-187`) — tenant_id 축이 없는 운영 로그로, tamper-evident 체인이 아니다. Evidence chain의 preimage로 사용 금지(변조 탐지 불가한 장식적 로그).
- 마케팅/기여 도메인의 evidence 명명 아티팩트는 본 §20 체인과 **명명 분리** 유지.

## 5. 판정

**PRESENT-substrate**. Immutable hash chain(`SecurityAudit.php:14-33`)·verify(`:56-68`)·증거 append(`AccessReview.php:224-233`)·2차 체인(`AdminMenu.php:182-218`)가 실재하며, 이를 **regulation/control-scoped tagging**으로 compliance evidence chain으로 확장한다(코드 0·설계). Attestation 엔진·control coverage는 후속 §16/§17에 선행 의존. **NOT_CERTIFIED · BLOCKED_PREREQUISITE**.
