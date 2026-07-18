# DSAR — Ledger API Contract (06-A-03-02-03-01)

> EPIC 06-A-03-02-03-01 Decision Integrity/Immutable Ledger · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§63 `LEDGER_API_CONTRACT` — 엔드포인트군(원문 전사):

- **Integrity Registry / Policy / Definition / Profile 조회** — 무결성 등록소·정책·정의·프로파일 조회(§7~§11).
- **Ledger / Partition / Head / Entry / Stream / Sequence Range 조회** — 원장·파티션·헤드·항목·스트림·시퀀스 범위 조회(§15~§20).
- **Decision · Case · Resource 별 조회** — 결정/케이스/리소스 기준 Entry 조회.
- **Append(제한)** — `Decision` · `Correction` · `Amendment` · `Supersession` · `Reversal` · `Void` · `Redaction` · `Retention` · `Legal Hold` Append 전용(§24 허용 메서드만).
- **Integrity Validation** — `Sequence` · `Head` · `Mandatory Reference` · `Completeness` · `Consistency` · `Gap` · `Duplicate` · `Conflict` 검증(§48~§50).
- **Reconstruction / Replay** — 상태 재구성·재생(§51/§52, Side Effect 비활성).
- **Checkpoint / Simulation** — 체크포인트·건식 시뮬(§21/§53).
- **Reconciliation** — 정합 대조(§54).

### 공통 관심사 (Cross-cutting — 전 엔드포인트 필수, 원문 전사)

1. **Tenant Context** — X-Tenant 스코프 격리.
2. **Auth** — 인증·RBAC.
3. **Integrity Version Validation** — 무결성 정의/버전 유효성(§10).
4. **Idempotency** — 재시도 안전 key(§40).
5. **Expected Head Version / Sequence** — 낙관적 동시성(§20/§44).
6. **Optimistic Lock** — 버전 불일치 차단(§44).
7. **Ledger Lock** — Append 직렬화(§41).
8. **Fencing** — 낮은 토큰 Commit 차단(§43).
9. **Mandatory Reference Validation** — Entry Type별 필수 Reference(§18).
10. **Append-only Guard** — Update/Delete/Upsert 차단(§24/§27).
11. **Legal Hold / Retention Validation** — Hold 중 삭제·물리삭제 차단(§36/§37).
12. **Snapshot · Audit · Evidence** — 시점 스냅샷·감사·증거(§21/§52/§53).
13. **Rate Limit**.
14. **Pagination**.
15. **Error Contract(§59/§60)**.

**★금지: Ledger Entry Update/Delete API 생성 금지** — 어떤 엔드포인트도 원장 항목을 수정·삭제해서는 안 됨. 수정 의도는 반드시 Correction/Amendment/Supersession/Reversal/Void/Redaction **Append**로만 표현(§24/§29~§35).

## 2. 기존 구현 대조

- **범용 Ledger API 계약 부재 → ABSENT.** 원장/무결성 조회·Append·Validation·Reconstruction·Reconciliation을 규격화한 엔드포인트군 없음.
- 승인/감사 관련 라우트는 도메인별 임시로 산발:
  - `AdminGrowth::approvalDecide`·`Mapping::approve/apply`(`Mapping.php:238-331`)·`Catalog` 승인큐·`Alerting::decideAction`·`AgencyPortal::approveAgency` + stub(`routes.php:752,1868`).
  - `SecurityAudit`(security_audit_log `:48-52`)는 배선(`UserAuth.php:4046`·`Compliance.php:162`)되나 조회/verify는 내부 호출이지 표준 Ledger API 아님.
- 오탐 주의: `routes.php:1943-1998`의 `/recon/reports/.../approve|lock`은 **재무 정산 대사** 라우트이지 §63 원장 Reconciliation API가 아님(명명 충돌·도메인 무관).
- 공통 관심사 실재/부재:
  - Tenant Context / Auth: **부분 PRESENT** — `index.php:404-420` 미들웨어(X-Tenant 주입·Bearer/RBAC). 단 원장별 일관 계약 아님.
  - Rate Limit / Pagination: 전역 인프라 일부 실재하나 원장 API 계약으로 규격화 안 됨.
  - Integrity Version/Idempotency/Expected Head Version/Lock/Fencing/Mandatory Reference/Append-only/Legal Hold Validation: **ABSENT**(대응 엔티티 부재).
  - Error Contract: **ABSENT**(§59/§60 미구현).
- ★현행 위반: 승인 라우트가 **Update(in-place status)** 로 상태를 변경(`Mapping.php:288`) — §63의 "Update/Delete API 금지" 정신과 상충(현재는 Update가 유일 경로).

## 3. 판정

- Verdict: **ABSENT** (통일 Ledger API 계약 부재 · 도메인별 산발 라우트만)
- 선행 의존: 공통 관심사 3·4·5·6·7·8·9·11이 전부 부재 엔티티 참조 → **BLOCKED_PREREQUISITE**.
- cover: Auth/Tenant 미들웨어(`index.php:404-420`)·Rate Limit/Pagination 인프라 외 **0**.

## 4. 확장/구현 방향 (설계)

- 순신규 통일 Ledger API — 조회는 `GET /api/v{N}/ledgers/{...}/{entries|head|stream|sequence-range}`, Append는 `POST /api/v{N}/ledgers/{id}/append/{decision|correction|amendment|supersession|reversal|void|redaction|retention|legal-hold}`, Validation/Reconstruction/Replay/Checkpoint/Simulation/Reconciliation은 전용 하위경로. **★Update/Delete 메서드 미노출**(§24/§27) — 정정은 Append로만.
- 재무 recon(`routes.php:1943-1998`)과 명명 충돌 회피 필수(별도 네임스페이스) — 288차 "segment" 3도메인 명명분리 원칙과 동일.
- Golden Rule(Extend): 기존 도메인 승인 핸들러(AdminGrowth·Mapping·Alerting·Catalog·AgencyPortal)를 통일 Append 계약 뒤로 흡수(Adapter)·`SecurityAudit` append+verify를 조회/검증 API 정본으로 재사용.
- 필수: 전 Append 엔드포인트에 15개 공통 관심사 미들웨어 강제 — 특히 **Idempotency + Expected Head Version + Ledger Lock + Fencing + Mandatory Reference + Append-only Guard**를 진입 조건으로(부분집행·중복커밋·Head 덮어쓰기 차단).
- 실배선 주의: `/api` 접두 필수(레지스트리: nginx SPA HTML 폴백 착시 회피)·공개 bypass 목록(`index.php`) 갱신 필요.
- 무후퇴: 기존 라우트는 하위호환 유지(구버전 stub 보존, CLAUDE.md 버저닝 관례). ★단 in-place status Update 경로는 canonical Append로 이행(불변성 개선·무후퇴 예외 §68).

관련: [[DSAR_APPROVAL_DECISION_LEDGER_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_DECISION_LEDGER_INDEX_PERFORMANCE]] · [[ADR_DSAR_DECISION_INTEGRITY_CORE_IMMUTABLE_LEDGER]].
