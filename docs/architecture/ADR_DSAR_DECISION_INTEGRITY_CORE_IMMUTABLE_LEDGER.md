# ADR — Decision Integrity Core & Immutable Ledger Foundation (EPIC 06-A-03-02-03-01)

- **상태**: Accepted (설계 정본 · 코드 변경 0 · 구현은 선행 Decision Core 신설 후 별도 승인세션)
- **차수**: 289차 13회차 (2026-07-18)
- **스펙**: [`SPEC_06A_03_02_03_01_DECISION_INTEGRITY_LEDGER_VERBATIM`](../segmentation/SPEC_06A_03_02_03_01_DECISION_INTEGRITY_LEDGER_VERBATIM.md)
- **전수조사(ⓑ)**: [`DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION`](../segmentation/DSAR_APPROVAL_DECISION_LEDGER_EXISTING_IMPLEMENTATION.md)
- **선행**: [`ADR_DSAR_DECISION_ACTIONS_GOVERNANCE`](ADR_DSAR_DECISION_ACTIONS_GOVERNANCE.md)(06-A-03-02-02) · [`ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE`](ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE.md)(06-A-03-02-01)
- **관련 메모리**: [[reference_menu_audit_log_not_tamper_evident]]

---

## 1. 맥락 (Context)

EPIC 06-A-03-02-03-01은 Commit된 Approval Decision이 이후 수정·삭제·교체·재배열·은폐되지 않도록 Canonical Integrity Contract + Immutable Decision Ledger를 요구한다(Decision Integrity & Security 전체 10 세부 EPIC 중 1번째·Crypto/Signature/SoD/Fraud 상세는 후속). §3은 4개 선행군(Decision Core·Actions·Approval Runtime·Platform Foundation)을 전제한다.

능력 기반 전수조사(ⓑ·2 에이전트·코드 정독): **범용 Immutable Ledger 부재.** 승인 결정=in-place UPDATE(과거 소실). 단 ★**Platform primitive(트랜잭션·SHA-256·SKIP LOCKED·Outbox·서버UTC·MediaHost CAS)는 실재 재사용 substrate**이고, **`SecurityAudit::verify`는 유일 실 append-only 해시체인 프로토타입**이다.

## 2. 결정 (Decision)

### D-1. Canonical Immutable Ledger를 **신설**하되 실존 primitive/패턴을 확장(Golden Rule) — "발명이 아니라 조립"

| 실존 | §61 태그 | 확장 결정 |
|---|---|---|
| **`SecurityAudit` append-only+verify** | **CANONICAL(패턴·KEEP_SEPARATE)** | 유일 실 무결성 트레일(`SecurityAudit.php:27,39,56-68`). Ledger append/체인/verify의 참조 구현·재사용. 단 ★감사 트레일≠decision ledger(관심사 분리)·Head-CAS/tx경계/논리 sequence 미달을 신설 시 보강. |
| SHA-256 3개소·트랜잭션·SKIP LOCKED·Outbox·Inbox dedup·서버UTC·MediaHost CAS | **재사용 substrate** | Ledger entry 해시(SHA-256)·원자적 append(트랜잭션)·단일 라이터 직렬화(SKIP LOCKED `Omnichannel.php:405`)·외부 투영(omni_outbox)·중복적재 방지(paddle UNIQUE)·타임스탬프 신뢰원(UTC)·Evidence Store(MediaHost 내용주소). 발명 없이 조립. |
| `audit_log`·`pm_audit_log` | **CONSOLIDATION_REQUIRED** | 해시체인/verify 없는 감사 3종을 SecurityAudit 패턴으로 무결성 통합. |

### D-2. **장식 오인 금지** (원장/무결성 자산으로 승격 금지)

- `menu_audit_log.hash_chain`(`AdminMenu.php:123-143`) = **verify() 0·tamper-evident 아님**(289차 정정·[[reference_menu_audit_log_not_tamper_evident]]).
- `schema_migrations.checksum`(`Migrate.php:50,63-64`) = 저장만·비교 미실행.
- `journey_decision_log`(`JourneyBuilder.php:1192`) = in-place UPDATE·append-only 아님.

### D-3. **BLOCKED (실 위험)** — retention 크론이 append-only 감사를 물리 삭제

`media_gc_cron.php:35,43`이 append-only 감사 로그를 90일 후 **물리 DELETE**(Legal Hold 예외 없음) → 불변성/무결성 상충. Ledger는 Retention≠Integrity(§5.8) 원칙으로 Sequence/Metadata/Digest 유지하며 Payload만 제거해야 한다. 이 크론은 Ledger 대상 테이블에 적용 금지·별도 수정세션 후보(라이브 재증명).

### D-4. **구현 BLOCKED_PREREQUISITE** — 선행 Decision Core 신설 후 별도 승인세션(RP-002)

| 선행군 | 상태 |
|---|---|
| §3.1 Decision Core · §3.2 Actions · §3.3 Approval Runtime | **ABSENT** |
| §3.4 Platform Foundation | **PRESENT(재사용 substrate·Retention/Legal Hold/named lock 제외)** |

→ Ledger가 기록할 **불변 Decision Record 대상이 없어 공회전**(현행 승인=approvals_json in-place UPDATE). **§68 per-entity 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0**이 정직판정. ★단 Platform primitive 실재로 실 엔진은 "Decision Core 신설 → 기존 primitive 위 Ledger 적재"로 조립 가능(발명 최소). 이번 차수=설계 명세(코드 0).

### D-5. Ledger ≠ Decision Record ≠ Audit Log (§5.1-5.3·구현 시 강제)

Decision Record(업무결과)·Ledger Entry(불변 순서·계보 보장)·Audit Log(누가 무엇)·Event Store 역할 구분. Audit만으로 Ledger 대체 금지. Append-only(Update/Delete/Upsert 금지)·Sequence=Server 생성·Head=CAS·Correction=새 Entry(원본 보존)·다계층 불변강제(Domain/Repository/DB Permission·Trigger 단독 금지).

### D-6. Mandatory 무결성 제어 고객설정 비활성 불가(§5.14)

Append-only·Update/Delete Prevention·Sequence Uniqueness·Head Validation·Tenant Isolation·Idempotency·Fencing·Immutable History·Correction by New Entry·Reconciliation·Gap/Duplicate Detection.

## 3. ★실 위험 (별도 수정세션 후보)

1. **media_gc_cron 감사로그 물리삭제**(BLOCKED·D-3).
2. **승인 결정 in-place UPDATE**(과거 소실).
3. **DB 레벨 불변강제 전무**(Application Role UPDATE/DELETE 가능).
4. **menu_audit_log·schema_migrations.checksum 장식**(무결성 착시).
5. **SecurityAudit Head-CAS/트랜잭션경계 부재**(동시 INSERT 체인분기).

## 4. 대안 (Considered)

- **A. 지금 Ledger 구현** — 기각. 기록할 Decision Record 부재(D-4)·빈 파이프 위 장식. RP-002 위반.
- **B. SecurityAudit를 Decision Ledger로 전용** — 부분 채택(패턴 참조·D-1). 단 감사 트레일≠decision ledger·Head-CAS/tx경계 미달로 직접 전용 금지·보강 필요.
- **C. 설계 명세만(코드 0)+실존 primitive 조립계획+선행 전제 명문화** — **채택**. 06-A 계열 일관.

## 5. 귀결 (Consequences)

- (+) SecurityAudit 패턴·SHA-256·트랜잭션·SKIP LOCKED·Outbox·MediaHost CAS의 정본 지위·조립 경로 확정("발명 아닌 조립").
- (+) 선행 4군 상태·실 위험 5건(특히 media_gc_cron·in-place UPDATE·장식) 문서화·장식 오인 방지.
- (−) 이번 차수 런타임 기능 증가 0.
- (→) 다음: 선행 Decision Core 신설 → Immutable Ledger 실 엔진 → EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection(+03~10).

## 6. 규율 준수

Golden Rule(Extend not Replace) · 중복 Ledger 금지 · 무후퇴 · "결론의 근거도 재실증"(해시체인 존재≠tamper-evident·코드 정독) · Mandatory Control 무력화 금지 · 코드 변경 0(설계) · RP-002 · 장식 오인 금지.
