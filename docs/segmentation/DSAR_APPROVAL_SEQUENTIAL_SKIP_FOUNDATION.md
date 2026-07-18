# DSAR — Skip Foundation (06-A-03-01)

> EPIC 06-A-03-01 Sequential Approval State Machine · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 설계 명세.

## 1. 원문 전사 (Canonical Contract)

§35 SKIP_FOUNDATION —

**SKIP_TYPE**: OPTIONAL_STEP / OPTIONAL_LEVEL / OPTIONAL_STAGE · NOT_APPLICABLE · POLICY_EXCLUDED · NO_ELIGIBLE_PARTICIPANT_REFERENCE · BELOW_THRESHOLD_REFERENCE · DUPLICATE_REQUIREMENT_REFERENCE · SYSTEM_VALIDATED · MANUAL_OVERRIDE_REFERENCE · CUSTOM.

**필드**: skip type · skip policy version · requested by · approved by reference · reason code / text · guard result · dependency result · authority reference · downstream impact · skipped_at · snapshot · evidence.

★불변식: **Mandatory Step/Level/Stage 는 Skip 금지**.

## 2. 기존 구현 대조

- **Skip Foundation(승인) 부재**(§GROUND_TRUTH): Stage/Level/Step 계층 자체가 없어 Optional Skip 대상·SKIP_TYPE 분류·skip snapshot 자산 전무.
- **Skip Policy 부재**(§8): skip/auto-skip 지원 Policy 레지스트리 없음.
- **★KEEP_SEPARATE — 저니 enroll race skip**: JourneyBuilder 의 enroll 경합/멱등 처리(중복 enroll 방지·이미 발송 시 releaseSendOnce `JourneyBuilder.php:463`)는 **마케팅 발송 중복 회피**로, 승인의 Optional Step Skip 과 성격이 전혀 다름. 승인 Skip Foundation 의 실존 근거로 오인 금지 — KEEP_SEPARATE.
- 상태전이 3종에는 명시적 Skip 개념 없음(단발/정족수만).

## 3. 판정

- Verdict: **ABSENT**
- 선행 의존: Stage/Level/Step Instance(Approval Chain §3.1)·Skip Policy·Participant Resolution(§3.2~§3.5) 부재. Optional/Mandatory 구분, NO_ELIGIBLE_PARTICIPANT/BELOW_THRESHOLD 등 SKIP_TYPE 판정 실체 전무.
- cover: 0
- KEEP_SEPARATE: JourneyBuilder enroll race skip(`JourneyBuilder.php:463`)은 마케팅 발송 중복 회피 — 승인 Skip 과 무관.

## 4. 확장/구현 방향 (설계)

- 순신규. Skip 은 반드시 명시적 Transition + Snapshot(STEP_SKIP §52) + Audit(§65 SKIPPED)로 기록 — 암묵 진행/스킵 금지(§30 원칙).
- **Mandatory Control**: Mandatory(특히 FINANCIAL/LEGAL/COMPLIANCE/SECURITY) Step/Level/Stage Skip 을 Static Lint(§60) + Runtime Guard(§61)에서 Fail-Closed 로 차단. skip 시 authority reference + reason code + downstream impact 를 필수 캡처.
- Skip 이후 Downstream 재평가(§36 원칙 공유) — 스킵된 Step 에 의존하던 Dependency(§23) 재계산.
- 확장 substrate: 없음(순신규). JourneyBuilder skip 은 참조하지 않음(도메인 상이).
- **BLOCKED_PREREQUISITE**: 선행 5군 + Stage/Level/Step 선행 필수.

관련: [[DSAR_APPROVAL_SEQUENTIAL_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_SEQUENTIAL_APPROVAL_STATE_MACHINE_FOUNDATION]].
