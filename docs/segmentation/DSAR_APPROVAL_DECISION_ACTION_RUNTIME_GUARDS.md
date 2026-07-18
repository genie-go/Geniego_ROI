# DSAR — Action Runtime Guards (06-A-03-02-02)

> EPIC 06-A-03-02-02 Decision Actions · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§60 `ACTION_RUNTIME_GUARDS` — 실행 시점 차단(원문 §58 Critical Gap을 요청 처리 중 강제). 필수 가드:

1. **Tenant Context Guard** — 액션 대상이 요청 테넌트 소유인지(IDOR 차단).
2. **Action Capability Guard(§11)** — 액션이 현 Slot/Actor/Source State에서 ALLOWED인지.
3. **Idempotency Guard(§51)** — 동일 key+hash 재실행=결과 반환·다른 hash=Conflict.
4. **Expected Version / Optimistic Lock** — 낙관적 버전 불일치 차단.
5. **Decision Lock / Fencing** — 동시 액션 직렬화.
6. **Reason/Comment/Attachment Requirement Guard** — 정책상 필수요건 미충족 차단.
7. **Attachment Security Guard(§44)** — Tenant 소유·매직바이트 MIME·Malware/DLP·Executable/Macro 차단.
8. **Return Target Guard(§20)** — 유효·동일 Case 계보·이전 위치·Loop/Max.
9. **Compatibility/Conflict Guard(§49/§50)** — 상호배타·다중 종결 차단.
10. **Irreversible Effect Guard** — 확정 Settlement/Payment/Contract 이후 Cancel/Withdraw 차단.
11. **Snapshot/Audit Guard(§52/§54)** — 커밋 전 스냅샷·감사이벤트 강제.

## 2. 기존 구현 대조 (미구현 · 일부 부분 실재)

- **범용 런타임 가드 계층 부재 → 미구현(ABSENT).** 단 개별 가드 원형이 산발적으로 부분 실재:

| 가드 | 상태 | 근거(허용목록) |
|---|---|---|
| Tenant Context Guard | **부분 PRESENT** | `index.php:404-420` X-Tenant 주입·`Alerting.php:580-582` IDOR 술어. **액션 전용 일관 적용은 아님** |
| Action Capability Guard | **ABSENT** | Capability(§11) 자체 부재 |
| Idempotency Guard | **ABSENT** | 액션 idempotency key 0 |
| Expected Version / Lock | **ABSENT** | 낙관적 버전·Fencing 부재 |
| Reason/Comment/Attachment Requirement | **부분** | Mapping approvals_json 정족수(`:238-331`)는 있으나 Reason 필수요건 없음 |
| **Attachment Security Guard** | **부분(MediaHost MIME만)** | `MediaHost.php:81-91` data URI 파싱→ALLOWED(`:33-38`)→매직바이트 재검증(`:88-91`)·8MB(`:46,86`)·nosniff(`:231`). ★Malware/DLP·Executable/Macro 검사 **ABSENT**·이미지 4종 전용·무인증 read(`:25`) |
| Return Target / Compatibility / Conflict / Irreversible | **ABSENT** | 대응 액션·상태 선행 부재 |
| Snapshot/Audit Guard | **부분** | `SecurityAudit::verify():56,64` 해시체인 실재하나 액션 커밋과 미결합 |

- **핵심 결함**: `CreativeStore::brandAssetUpload:265-275`는 어떤 런타임 파일 가드도 통과하지 않음(5MB 캡만 `:271`) → Attachment Security Guard 부재의 실증.

## 3. 판정

- Verdict: **ABSENT** (범용 런타임 가드 미구현)
  - 부분 실재: **Tenant 격리 부분**(`index.php:404-420`·`Alerting.php:580-582`)·**MediaHost MIME 부분**(`:88-91`, 이미지 전용·malware 없음).
- 선행 의존: §3.1 Decision Core(Lock/Idempotency/Snapshot)·§3.2 Sequential(Return Target)·§3.5 Content/Document(Malware/DLP) 부재 → 대부분 가드 BLOCKED_PREREQUISITE.
- cover: Tenant Guard·MediaHost MIME 외 **0**.

## 4. 확장/구현 방향 (설계)

- Golden Rule(Extend): 실재 부분 가드를 액션 전용으로 승격·일반화.
  - **Tenant Context Guard**: `index.php:404-420`·`Alerting.php:580-582` 패턴을 전 액션 대상 조회에 강제 적용.
  - **Attachment Security Guard**: `MediaHost.php:88-91` 매직바이트 검증을 정본(CANONICAL)으로 삼아 문서/실행파일까지 확장 + **Malware/DLP 스캔 신설**(현재 전면 부재) + `CreativeStore` 업로드를 이 경로로 통합(BLOCKED_GAP 해소).
  - **Snapshot/Audit Guard**: `SecurityAudit::verify` 해시체인을 액션 커밋 스냅샷(§52)과 결합.
- 순신규: Capability/Idempotency/Expected Version/Lock/Return Target/Compatibility/Conflict/Irreversible 가드는 선행 6군 신설 후 구현(BLOCKED_PREREQUISITE).
- 무후퇴: 기존 Tenant Guard·MediaHost 검증·SecurityAudit는 후퇴 없이 흡수(§68).

관련: [[DSAR_APPROVAL_DECISION_ACTION_STATIC_LINT]] · [[ADR_DSAR_DECISION_ACTIONS_GOVERNANCE]].
