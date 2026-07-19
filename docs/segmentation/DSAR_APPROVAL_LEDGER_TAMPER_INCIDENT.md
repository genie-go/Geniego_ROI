# DSAR — Ledger Tamper Incident (06-A-03-02-03-02)

> EPIC 06-A-03-02-03-02 Cryptographic Hash Chain & Tamper Detection · 289차 후속 회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.
> 인용 규율: file:line은 [`DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION.md)(GROUND_TRUTH) 등재분만.

## 1. 원문 전사 (Canonical Contract)

§45 **Tamper Incident** (원문 전사, 정본 엔티티 `APPROVAL_LEDGER_TAMPER_INCIDENT`) — 분류된 Tamper를 **불변 사건 레코드**로 영속화한다. 필수 필드:

- `incident id` · `tenant` · `ledger` · `partition`
- `affected entry ids` · `affected sequences` · `affected decision ids`
- `tamper type`(§44) · `tamper category`(§45) · `severity`(§45)
- `first detected_at` · `last detected_at`
- `detection source`(Commit-time / Read-time / Periodic / On-demand / Reconciliation …)
- `expected digest` · `actual digest`
- `expected version` · `actual version`(algorithm/canonicalization/field set version)
- `write block applied` · `read block applied` · `workflow block applied`
- `incident ref`(외부 Security Incident 연동 식별자)
- `status` · `evidence`

의미: Incident는 "탐지·분류된 변조가 실제로 발생했다"는 사실을 **누가·언제·무엇을·기대 vs 실제 Digest·적용된 차단(write/read/workflow)**과 함께 봉인하는 원장이다. §5.12(Tamper Detection 결과도 Immutable 기록)의 직접 구현체이며, §46 Response Action이 적용한 차단 사실(`*_block applied`)을 되짚을 수 있는 감사 근거다. Incident 자체도 무결성 대상(스스로 변조 방지)이어야 한다.

## 2. 기존 구현 대조

- **Tamper Incident 레코드 부재** — 변조 사건을 affected entry/sequence/decision·expected/actual digest·적용 차단과 함께 영속화하는 구조체 전무.
- **현행 유일 유사물** = `SecurityAudit::verify`(`SecurityAudit.php:56-68`)는 `{ok, checked, broken_at}`를 **호출 시점에 반환만** 하고 어디에도 저장하지 않는다. `AdminGrowth.php:1429`는 이를 응답으로 노출할 뿐 사건 레코드를 남기지 않는다 → **탐지는 휘발성**, Incident로 봉인되지 않음. `first/last detected_at`·`detection source`·`write/read/workflow block applied` 개념 전무.
- **선행 Ledger 부재로 필수필드 다수 무대상** — `affected entry ids`/`affected sequences`/`affected decision ids`는 §3.1 Ledger·§3.2 Decision Foundation ABSENT(GROUND_TRUTH 1절)로 결합 대상 없음. `expected/actual version`(algorithm/canonicalization/field set version)도 버전 레지스트리(§10) 부재로 산출 불가.
- **실 위험 = 사건 무기록 + fail-open** — `SecurityAudit.php:32` catch no-op은 검증 실패를 삼켜 Incident 생성 트리거조차 못 만든다. 사건이 발생해도 흔적이 남지 않는 구조.
- **장식 오인 금지** — `menu_audit_log`(`AdminMenu.php:169-212`, verify 0)·`journey_decision_log`(`JourneyBuilder.php:1192`, in-place UPDATE·append-only 아님)는 Incident SoT로 계상 금지. `media_gc_cron.php`의 감사로그 90일 물리 삭제는 오히려 Incident 근거를 소멸시킬 위험.

## 3. 판정

- Verdict: **ABSENT / BLOCKED_PREREQUISITE**
- cover: **0** — Tamper 사건을 봉인하는 Immutable Incident 레코드 전무. `SecurityAudit::verify`는 휘발성 반환값일 뿐 사건 레코드가 아니다.
- 선행 의존: §44 Detection·§45 Classification(상위 입력)·§3.1 Ledger·§3.2 Decision·§10 Version(필수필드 대상) 모두 종속. 순신규.

## 4. 확장/구현 방향 (설계)

- **순신규 `approval_ledger_tamper_incident` 원장** — §45 Classification 결과 + affected 범위 + expected/actual digest·version + 적용 차단 플래그를 봉인. **Incident 자체를 append-only 무결성 대상**으로 삼아 SecurityAudit 패턴(prev_hash 체인+verify, `SecurityAudit.php:48-68`)을 재사용(자기참조 tamper-evident).
- **Extend**: `SecurityAudit::verify`의 `broken_at`→`affected sequences`의 시작점, `checked`→검사 범위 근거. `detection source`는 §48 Verification Job Type(COMMIT_TIME/READ_TIME/PERIODIC/…)에서 주입.
- **`incident ref` 연동**: §3.3 Platform의 Security Event Framework(`SecurityAudit` 재사용·GROUND_TRUTH 4절)로 외부 Security Incident와 상관. §46의 `ESCALATE_SECURITY_INCIDENT` Action이 이 필드를 채운다.
- **실위험 차단(무후퇴 예외=개선)**: `SecurityAudit.php:32` fail-open을 fail-closed로 전환하여 검증 실패가 반드시 Incident 생성으로 귀결되게 하고, Incident 원장은 `media_gc_cron` 물리삭제 대상에서 §36 Legal Hold/`delete prevention`으로 제외.
- **§5.12 직접 구현**: 누가(actor)·언제(detected_at)·무엇을(affected)·불일치(expected/actual)를 Snapshot/Evidence(§47)와 함께 기록. `write/read/workflow block applied`는 §46 Response의 실집행 결과를 사후 대조 가능하게 남긴다.

관련: [[DSAR_APPROVAL_CRYPTO_INTEGRITY_EXISTING_IMPLEMENTATION]] · [[DSAR_APPROVAL_LEDGER_TAMPER_CLASSIFICATION]] · [[DSAR_APPROVAL_LEDGER_TAMPER_EVIDENCE]] · [[DSAR_APPROVAL_LEDGER_TAMPER_RESPONSE_POLICY]] · [[ADR_DSAR_CRYPTOGRAPHIC_HASH_CHAIN_TAMPER_DETECTION]].
