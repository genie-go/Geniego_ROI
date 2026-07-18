# DSAR — Evidence (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§64 EVIDENCE — 순차 승인 상태머신의 모든 판정/전이/조회에 대한 불변 근거 레코드.

필드: evidence_id · tenant_id · (request / case / item / requirement · workflow / chain / sequential definition / version / instance · stage / level / step instance · state · event · transition def / instance · guard / precondition / dependency result · assignment / authority / delegation reference · cursor · lock · lease · fencing token · idempotency record · snapshot · simulation · reconciliation) · effective/recorded_at · immutable_hash · lineage · audit reference.

★**저장 금지(Evidence 에 절대 담지 않음)**:
- Password / Token / Credential
- PII / Email
- Calendar Body
- Security Secret
- HR 상세(HR detail)

즉 Evidence 는 **참조·해시·상태 스냅샷**만 담고, 원문 민감데이터(자격증명·개인식별·본문·비밀)는 담지 않는다.

## 2. 기존 구현 대조

- **Evidence 레코드 실존하지 않음**: §64 가 참조하는 거의 모든 대상(Sequential Definition/Version/Instance·Stage/Level/Step·Transition·Cursor·Lock/Lease·Fencing·Idempotency·Snapshot·Simulation·Reconciliation)이 §GROUND_TRUTH 상 ABSENT — 근거로 묶을 실체 자체가 없다.
- **실존 감사 흔적은 파편적**: 하드코딩 전이 3종은 status 컬럼 최종값만 남기고(`Catalog.php:80`·`AdminGrowth.php:146`·`Mapping.php:287`), mapping_change_request 의 approvals_json(`Mapping.php:285`)이 부분 근거를 담으나 이는 정족수 승인자 배열이지 §64 의 전 계층 불변 Evidence 가 아니다.
- **불변 해시/lineage 부재**: immutable_hash·lineage 를 갖춘 근거 저장소는 승인 도메인에 없다. 감사 무결 substrate 로는 `SecurityAudit.php:56-68` verify() 가 실존하나 이는 감사 체인 검증이지 Evidence 저장 스키마가 아니다(§65 문서 참조).
- **저장금지 준수 여부 미검증**: Evidence 스키마가 없으므로 "Credential/PII 배제" 규율을 강제할 코드 게이트도 없다 — 신설 시 처음부터 배제 설계 필요.

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: §64 는 전 계층(Definition/Version/Instance/Stage/Level/Step/Transition/Cursor/Lock/Snapshot 등)의 실존을 참조로 전제 — 선행 5군 + 상태머신 전체 부재로 묶을 근거 없음
- cover: **0**

## 4. 확장/구현 방향 (설계)

- **순신규 · 불변 Append-only**: Evidence 는 직접수정/삭제 금지, immutable_hash + 이전 hash lineage 로 체인화. 과거 재작성 금지(§54 REPLAY 원칙).
- ★**저장금지 강제(설계 최우선)**: Password/Token/Credential·PII/Email·Calendar Body·Security Secret·HR 상세는 **스키마 레벨에서 컬럼 자체를 두지 않고**, 참조 ID·payload_hash·상태 스냅샷만 저장. 민감데이터는 원본 저장소에 두고 Evidence 는 포인터만.
  - 이는 프로젝트 데이터 헌법(No PII storage·자격증명 평문노출 회피)과 일치 — Evidence 도 aggregation/reference-only.
- **감사 substrate 재사용**: 불변성 검증은 `SecurityAudit::verify`(`SecurityAudit.php:56-68`)의 체인 검증 패턴을 **참조 정본**으로 확장(Extend), 별도 검증기 난립 금지.
- **lineage 필수**: 모든 Transition/Guard/Snapshot/Reconciliation 결과가 Evidence 로 역추적 가능해야 하며 audit reference 로 §65 Audit Event 와 상호 연결.
- **BLOCKED_PREREQUISITE**: 선행 5군 + 상태머신·Snapshot·Transition 신설 후.

관련: [[DSAR_APPROVAL_SEQUENTIAL_AUDIT_EVENT]] · [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
