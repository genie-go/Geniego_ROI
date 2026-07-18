# DSAR — Decision Static Lint (06-A-03-02-01)

> EPIC 06-A-03-02-01 Decision Processing Core · 289차 13회차 · 능력 기반 판정 · 코드 변경 0 · 정책 명세.

## 1. 원문 전사 (Canonical Contract)

**STATIC_LINT (§61)** — 원문 차단 목록(정적 분석 단계에서 금지·차단해야 할 안티패턴):
- Decision Version 참조 없는 Commit 경로
- Command 와 Record 를 동일 테이블/동일 UPDATE 로 혼합
- Validation 단계를 건너뛴 직접 status Update
- Actor 를 Display Name / Email / Channel User ID 만으로 판정
- Assignment / Authority / Delegation / Sequential Step 미검증 Commit
- Idempotency Key / Request Hash 없는 결정 제출
- Lock / Fencing Token 없는 Commit
- Expected Version 검증 없는 상태 전이
- Record Update / Delete (불변 위반)
- Snapshot / Audit / Outbox / Sequential Reference 누락 Commit
- Client Timestamp 로 Commit 시각 확정
- Email / Slack / Teams 액션의 직접 Commit(별도 인증/서명/만료 없이)
- Mandatory Guard(§24) 우회/제거
- 중복 Decision/Approval 테이블·Approve/Reject 별도 중복 구현

## 2. 기존 구현 대조

- **정적 린트 = 미구현.** 결정 도메인 안티패턴을 차단하는 정적 분석 규칙(ESLint/PHPStan/커스텀 AST 룰/CI 게이트)은 존재하지 않는다.
- **현행 CI 실측**: `.github/workflows/deploy.yml` 은 EN 로케일 존재 확인 + `npm run build` + SCP + smoke test 뿐이다(CLAUDE.md CI/CD). 결정 경로 in-place UPDATE·actor 헤더 신뢰·불변 위반을 잡는 린트 단계는 없다.
- 참고로 **차단되어야 할 실코드가 실존**한다(§61 이 겨냥하는 대상): `Alerting::actor()` 헤더 신뢰(`Alerting.php:33-35`)·단일 UPDATE status flip(Mapping:288·AdminGrowth:1330·Alerting:594·Catalog:2397)·Command/Record 혼합. 즉 린트 대상은 있으나 린트가 없다.

## 3. 판정

- Verdict: **ABSENT** (정책 자체 미구현)
- 선행 의존: 정적 린트는 결정 코어 엔티티(Version/Command/Record/Validation/Lock/Snapshot/Outbox)의 **정본 형태가 확정된 뒤**라야 "무엇을 안티패턴으로 볼지"의 기준선이 생긴다. 선행 6군·코어 명세 확정에 의존.
- cover: **0**

## 4. 확장/구현 방향 (정책)

- **미구현 — 신설 대상.** 결정 코어 신설과 동반하여 §61 차단 목록을 정적 룰로 코드화(CI 게이트).
- **즉시 착수 가능한 부분집합**: 코어 신설 전이라도 (a) `actor` 를 헤더(X-User-Email/?actor=)로 해석하는 패턴 grep 차단, (b) 결정 테이블 직접 UPDATE 금지 룰은 선행 도입 가치가 있다 — MEMORY [Reference: no-undef 게이트]·라이브 스캔 CI 선례와 정합.
- **Golden Rule**: 신규 린트 인프라 난립 금지 — 기존 CI(deploy.yml) 게이트 확장으로 편입.
- **정직판정**: 문서상 "린트 정책 존재" 를 구현으로 오기 금지. 룰 파일·CI 실행·차단 실증까지가 완료(§CONSTITUTION 완료의 정의).
- 실 구현 = 별도 승인 세션. 코드변경 0.

관련: [[DSAR_APPROVAL_DECISION_EXISTING_IMPLEMENTATION]] · [[ADR_DSAR_DECISION_PROCESSING_CORE_GOVERNANCE]].
