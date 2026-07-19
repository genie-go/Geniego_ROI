# REPEAT PROBLEM HISTORY — 반복 문제·재발 방지 이력

> 목적: **동일 실수의 2회 이상 재발을 영구 차단**. 각 항목은 ①증상 ②실측 원인 ③재발 방지 규칙 ④검증 방법을 반드시 포함한다.
> 관련 정본: [`docs/CHANGE_GATE.md`](../CHANGE_GATE.md)(5중 게이트·§5 Repeat-Modification Escalation) · [`PM_CHANGE_HISTORY.md`](PM_CHANGE_HISTORY.md) · 메모리 `reference_audit_false_positives`.
> 등재 기준: **1차=기록 / 2차=PM 승인 필요 / 3차=RCA 의무 / 4차+=근본원인 제거 전 착수 금지**(CHANGE_GATE §5).

---

## RP-001 — 후속 파트 착수 전 정본 로드맵 미확인 (문서 거버넌스)

- **차수**: 289차 (2026-07-17) · **발생 1회** · 심각도: MED(문서 정합·코드 영향 0)
- **증상**: EPIC 06-A Rebate 정본 9분할의 Part 1-5 이후 파트명을 **임의 추정**해 5개 파트(Rule/Tier·Eligibility·Accrual/Ledger·Claim/Settlement/Payout·Recovery/Dispute)를 `Part 3-3-3-3-3-3-3-3-4-5-3-1-5~9`로 명명·커밋했고, PM 이력에 **"Rebate 9분할 완결"로 오보고**했다. 실제 사용자 정본 로드맵의 1-5는 **Permission·Approval·Operational Governance**였다.
- **실측 원인**: **착수 전 선행 파트 문서에 이미 기록된 로드맵을 확인하지 않음**. 정본 로드맵은 전 세션 산출물 [`docs/segmentation/CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md:7`](../segmentation/CANONICAL_DSAR_REBATE_PROGRAM_MASTER_REGISTRY.md)에 명시돼 있었다 — **"후속 4-5-3-1-2~9 Type/Funding/Lifecycle/Permission/Coverage/Lint/Golden/Legacy"**(동 파일 :34 `후속 블록(4-5-3-1-2~9)`도 동일). 즉 **자료는 있었고 읽지 않았다**(추정으로 대체).
- **영향**: 코드변경 0(설계 문서 전용)·실측 근거/내용 자체는 유효. 라벨·이력 정합만 손상 → 289차에 **선행설계 R1~R5로 재표기 + PM 이력 오보고 정정**으로 해소. 정본 진척 정정: **1-1~1-4 완료(4/9)**.
- **재발 방지 규칙(영구)**:
  1. **다분할(N분할) EPIC의 후속 파트 착수 전, 해당 EPIC의 Part 1 문서 `§범위`·`§1 후속 블록`을 필독**하고 로드맵을 인용해 착수 보고에 명시한다.
  2. **파트 번호·파트명을 추정으로 부여 금지.** 사용자 스펙이 없으면 번호를 붙이지 말고 중립 라벨(예: `선행설계 R{n}`)로 산출한 뒤, 정본 스펙 수령 시 편입한다.
  3. **"완결/완료" 보고는 정본 슬롯 대비로만 한다.** 자체 생성 산출물 수를 정본 진척으로 환산 금지(임의 숫자 금지 원칙 정합).
- **검증 방법**: 후속 파트 착수 시 `grep -n "후속\|범위" docs/segmentation/CANONICAL_DSAR_<EPIC>_*_REGISTRY.md | head` 로 로드맵 실측 → 착수 보고에 인용. 완료 보고 전 `grep -rn "완결\|N/N" docs/pm/PM_CHANGE_HISTORY.md` 로 과대 주장 자가검사.
- **상태**: 정정 완료(289차) · **2차 재발 시 PM 승인 필요**(CHANGE_GATE §5).


---

## RP-002 — 스펙 미수령 상태의 자율 설계가 스펙 수령 후 전면 재작업을 유발

- **발생**: 289차. 사용자가 "스펙 없이 자율 판단으로 5-2 진행해"를 지시 → 자율 설계본 산출(Canonical 2 + ADR) → **이후 실제 스펙(Version 1.0) 수령** → §58 요구 **57문서** · §5 Entity **29종** · §8 Standard Role **35종** 등 자율본에 없던 요구가 대량 확인되어 **전면 재작성**.
- **근본 원인**: 자율 설계는 **요구를 추정**한다. 추정 요구와 실제 요구가 다르면 산출물 전체가 흔들린다. **RP-001(로드맵 미확인) · 1-9 LEGACY-GAP-02(위임 미확인)와 동일 계열** — **"확인 가능한 것을 확인하지 않고 추정했다"**.
- **완화 — 이번에 실제로 작동한 것**: 자율본 각 문서 첫머리에 **"⚠️ 스펙 미수령 — 자율 판단 설계. 스펙 수령 시 본 문서가 양보한다"**를 명시해 두었다. **덕분에 스펙 수령 시 양보 판정이 논쟁 없이 즉시 성립**했고, 자율본은 **삭제하지 않고 참고 이력으로 보존**(무후퇴).
- **재발 방지**:
  1. **자율 설계 시 "스펙 수령 시 양보" 명시 필수** — 이번에 효과 입증. 계속 유지.
  2. 🔴 **스펙 수령 즉시 요구 목록을 저장소에 영속**한다(1-6 COV-GAP-01 해소). 5-2에서 `REQ_06A_4_5_3_1_5_2_ROLE_ORG_SCOPE.md` 로 최초 실행 → **06-A 최초로 커버리지 실계산(57/57 · 100%)**.
  3. **자율 산출물을 "완료"로 보고하지 않는다** — 자율본은 **잠정**이며 스펙 수령 전까지 진척률에 계상하지 않는다.
- **한계 정직 표기**: 사용자가 "스펙 없이 진행"을 명시 지시하면 자율 설계 자체는 불가피하다. **RP-002는 자율 설계를 금지하는 항목이 아니라, 자율 산출물을 어떻게 표기·보존·양보시킬 것인가의 규약**이다.

### ★2차 사례 (289차 · 5-3) — **재발이 아니라 규약대로 작동**

- **경과**: 289차에 **5-3 자율본**(`CANONICAL_DSAR_AUTHORIZATION_APPROVAL_WORKFLOW.md` · `RISK_BASED_DECISION`)이 있었으나, 사용자 결정으로 **"5-3 스펙 대기·자율 금지"** 확정 → 이후 **스펙 v1.0 수령**(Approval Engine **10블록 분할** · 본 건은 1번째 `5-3-1`).
- **결과**: 자율본은 **양보**(삭제 없이 참고 보존 · [`REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md`](../segmentation/REQ_06A_4_5_3_1_5_3_1_APPROVAL_FOUNDATION.md) §15). **전면 재작업 비용이 발생하지 않았다** — 자율본을 **더 진행하지 않고 멈춰 뒀기 때문**이다.
- ★**RP-002 완화책이 예측대로 작동한 2차 실증**: 1차(5-2)는 **"양보 명시" 덕에 양보가 논쟁 없이 성립**했고, 2차(5-3)는 **"대기" 결정 덕에 양보할 산출물 자체를 늘리지 않았다**. → **최선은 양보를 잘 하는 것이 아니라 양보할 것을 만들지 않는 것**이다.
- ★**규약 2번(스펙 수령 즉시 영속)의 2차 실증**: 5-3-1 은 **스펙 수령 즉시·설계 착수 전**에 분모를 영속했다. **5-2 는 "스펙이 도착해서" 계산 가능했고, 5-3-1 은 "도착 즉시 적어서" 계산 가능**해졌다 → [`COVERAGE_REQUIREMENT_REGISTRY_06A.md`](../segmentation/COVERAGE_REQUIREMENT_REGISTRY_06A.md) `source_persisted` **1 → 2**.
- **289차 ⑤ 가 이 규약에 추가한 것**: 요구를 **나중에** 적으면 그것은 **산출물에서의 역산**이고 **커버리지가 정의상 100%** 가 된다 → **분모 작성 시점이 정직성을 결정한다**(⑤ §1-1 역산 금지).

### ★3차 사례 (289차 13회차 · 06-A-02) — 규약대로 작동 (스펙 수령→즉시 선영속→설계만)

- **경과**: 06-A-02 Approval Assignment Engine 스펙 v1.0 수령 → **즉시 ⓐ 선영속**(설계 착수 전 원문+측정 선행조건 고정) → ⓑ전수조사→ⓒ64편→ⓓADR. 전량 코드 0.
- **RP-002 준수**: 스펙 있으므로 자율 아님. 단 **실 구현은 선행 4축 부재로 BLOCKED_PREREQUISITE** → 설계 명세만 산출하고 실 엔진은 "별도 승인세션"으로 양보(만들지 않음).
- **가짜 녹색 회피(287/288차 교훈)**: 64편 중 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0으로 **정직 판정**. 실존 인접자산만 VALIDATED_LEGACY/CANONICAL(≠cover). "인접 자산 존재 ≠ 구현 존재" 명시. 억지 "구현됨" 0건.
- **★"결론의 근거도 재실증"(10회차 교훈) 적용**: 12회차 4축 ABSENT 감사를 코드 직접 정독으로 재검증 → 축4만 PARTIAL로 미세 상향(SecurityAudit::verify·break-glass·tenant격리 실재). 선행 결론을 무비판 복제하지 않음.

### ★4차 사례 (289차 13회차 · 06-A-03-01) — 규약대로 작동 (스펙 수령→즉시 선영속→설계만)

- **경과**: 06-A-03-01 Sequential State Machine 스펙 수령 → 즉시 ⓐ 선영속 → ⓑ전수조사→ⓒ67편→ⓓADR. 코드 0.
- **RP-002 준수**: 스펙 있음(자율 아님). 실 구현은 선행 5군(특히 Assignment·06-A-02에서 ABSENT 확정) 부재로 BLOCKED_PREREQUISITE → 설계 명세만·실 엔진 양보(만들지 않음).
- **가짜 녹색 회피**: 67편 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0. "status 컬럼 존재 ≠ State Machine" 규율로 하드코딩 status 3종을 enum 실존 근거로 승격하지 않음. 실존 인접자산만 CANONICAL/VALIDATED_LEGACY/KEEP_SEPARATE.
- **★"결론의 근거도 재실증"**: 12·13회차 선행 4군 ABSENT를 코드 재정독으로 재확인(반증 없이 유지). JourneyBuilder를 "상태머신 존재"로 오판하지 않고 마케팅 도메인 KEEP_SEPARATE로 정확 분리.

### ★5차 사례 (289차 13회차 · 06-A-03-02-01) — 규약대로 작동 + 감사 중 실결함 발견

- **경과**: Decision Processing Core 스펙 수령 → 즉시 ⓐ 선영속 → ⓑ전수조사→ⓒ62편→ⓓADR. 코드 0.
- **RP-002 준수**: 스펙 있음. 실 구현은 선행 6군(5군 ABSENT) 부재로 BLOCKED_PREREQUISITE → 설계 명세만.
- **★능력기반 감사가 실결함 발견**: `Alerting::actor()`(`:33-35`)가 `X-User-Email` 헤더/`?actor=` 쿼리로 승인자 위조 가능(BLOCKED_SECURITY). 설계 전수조사가 라이브 보안결함을 부수 발견 — 별도 수정세션 후보로 등재.
- **가짜 녹색 회피**: "status=approved UPDATE ≠ Decision Record" 규율로 in-place UPDATE 4핸들러를 Decision Record 실존 근거로 승격하지 않음. 대부분 ABSENT/cover 0.
- **★치유된 이슈 재플래그 금지**: parent_user_id 붕괴는 286차 치유 확인(`UserAuth.php:403-406`)·과거 감사노트 관성으로 재플래그하지 않음.

### ★6차 사례 (289차 13회차 · 06-A-03-02-02) — 규약대로 작동 + 감사 중 실결함 발견

- **경과**: Decision Actions 스펙 수령 → 즉시 ⓐ 선영속 → ⓑ전수조사→ⓒ65편→ⓓADR. 코드 0.
- **RP-002 준수**: 실 구현은 선행 6군(5군 ABSENT)+Content Foundation 부재로 BLOCKED_PREREQUISITE → 설계 명세만.
- **★능력기반 감사가 실결함 발견 2차**: `CreativeStore::brandAssetUpload`(`:265-275`) 파일 무검증(BLOCKED_GAP)·Malware/DLP 부재. 06-A-03-02-01 Alerting actor 위조에 이어 연속 발견.
- **가짜 녹색 회피**: APPROVE 5도메인을 "Action 프레임워크 존재"로 승격하지 않음. RETURN 등 7액션 정직 ABSENT(오탐 코드기반 기각).

### ★7차 사례 (289차 13회차 · 06-A-03-02-03-01) — 규약대로 작동 + 감사 중 실결함 발견 3차

- **경과**: Decision Integrity/Immutable Ledger 스펙 수령 → 즉시 ⓐ 선영속 → ⓑ전수조사→ⓒ60편→ⓓADR. 코드 0.
- **RP-002 준수**: 실 구현은 선행 §3.1~3.3 부재로 BLOCKED_PREREQUISITE → 설계 명세만.
- **★능력기반 감사가 실결함 발견 3차**: `media_gc_cron.php:35,43`이 append-only 감사로그를 90일 물리 DELETE(불변성 상충). 06-A-03-02-01 Alerting actor 위조·03-02-02 CreativeStore 무검증에 이어 연속 발견 — 별도 수정세션 후보 등재.
- **★"결론의 근거도 재실증" 정본화**: "해시체인 존재 ≠ tamper-evident" 규율로 menu_audit_log·schema_migrations.checksum·journey_decision_log를 무결성 자산으로 오인하지 않고 장식으로 배제. SecurityAudit::verify만 실 자산으로 계상. [[reference_menu_audit_log_not_tamper_evident]] 재확인.
- **가짜 녹색 회피 + Platform substrate 정직 인정**: 대부분 ABSENT이나 Platform primitive(트랜잭션/SHA-256/SKIP LOCKED/Outbox)는 "재사용 substrate"로 정직 인정("발명 아닌 조립"). 부재만 과장하지 않음.

### ★8차 사례 (289차 후속 · 06-A-03-02-03-02) — 규약대로 작동 + "공포의 부재"를 정직 판정

- **경과**: Cryptographic Hash Chain & Tamper Detection 스펙 수령 → 즉시 ⓐ 선영속 → ⓑ전수조사(GROUND_TRUTH)→ⓒ72편→ⓓADR. 코드 0.
- **RP-002 준수**: 실 구현은 선행 §3.1 Immutable Ledger·§3.2 Decision Foundation 부재로 BLOCKED_PREREQUISITE → 설계 명세만.
- **★"결론의 근거도 재실증" 심화 — 실 체인조차 결함 노출**: `SecurityAudit`를 "유일 실 해시체인"으로 정직 인정하되, 그 체인이 **Canonicalization 부재(raw concat+UNESCAPED_UNICODE json=§5.3/§5.4 위반)·Head-CAS 없음·tenant 술어 없음·fail-open**임을 코드 정독으로 드러냄. "실 자산=완성 자산" 착시 회피.
- **★오탐 예방 신규 축 — "공포의 부재"를 정직 판정**: 스펙이 최우선 공포로 지목한 "MD5/SHA-1/CRC를 Integrity Proof로 사용"이 **레포에 전무**임을 확인. 산재 md5/sha1/crc를 무결성 결함으로 과대 플래그하지 않고 비보안(ID/캐시/PII)·벤더강제(OAuth1.0a/TOTP/CRAM-MD5)로 정확 분류. **부재를 결함으로 날조하지 않음.**
- **장식 오인 금지 일관**: menu_audit_log·schema_migrations.checksum·journey_decision_log를 4차 연속(03-02-03-01 이어) 무결성 자산 계상 배제. [[reference_menu_audit_log_not_tamper_evident]] 재확인.
- **가짜 녹색 회피**: 72편 대부분 ABSENT/BLOCKED_PREREQUISITE·cover 0. CANONICAL(SecurityAudit verify 패턴)·VALIDATED(Crypto)·VALIDATED_FILE_HASH(MediaHost)만 실존 대응.

### ★9차 사례 (289차 후속 · 06-A-03-02-03-03) — 실 substrate 대량 블록·"부재 과장"과 "실재 과신" 양방향 회피

- **경과**: Actor Identity Assurance 스펙 수령 → 즉시 ⓐ 선영속 → ⓑ전수조사(신원+인증 2에이전트)→ⓒ67편→ⓓADR. 코드 0.
- **RP-002 준수**: 승인 결합부는 선행 Decision Foundation 부재로 BLOCKED_PREREQUISITE → 설계 명세만.
- **★"실재 과신" 회피(부재 과장의 반대 오류)**: 이 블록은 앞 두 블록과 달리 인증/신원 코드가 대량 실재(session·api_key·MFA·SSO·SCIM·Mapping::actorId). 이를 "완성"으로 오인하지 않고 **PARTIAL/VALIDATED로 정직 판정**하되 승인 결합·불변 snapshot·device·commit 재검증 부재를 명확히 분리. 반대로 device/mTLS/cert는 "있을 법하다"고 날조하지 않고 코드 부재로 ABSENT 확정.
- **★능력기반 감사가 라이브 실결함 다수 발견**: Alerting actor 위조(X-User-Email/?actor=)·executeAction 미승인 집행·user_session.token 평문·mfa_secret 평문·break-glass MFA 우회·impersonation Original Principal 미보존. 06-A-03-02-01/02/03-01의 연속 발견(Alerting actor·CreativeStore·media_gc)에 이어 **BLOCKED_SECURITY 6건** 등재 — 별도 배포승인 수정세션 후보.
- **★canonical actor 정본 정직 인정**: `Mapping::actorId`(위조불가·승인 fail-closed)를 확장 기준점으로 인정하되, 같은 리포의 `Alerting::actor()`가 미하드닝(위조 가능)임을 대조 — "한 곳이 안전하니 전체 안전" 착시 회피.
- **장식 오인 금지**: `Decisioning.php`(ad-insights ingest)를 decision 도메인으로 오인하지 않음·승인 감사 비체인 audit_log를 SecurityAudit 해시체인으로 오인하지 않음.

### ★10차 사례 (289차 후속 · 06-A-03-02-03-04 Part1) — 실 substrate 대량 블록·DORMANT 오계상 회피·기수정 재플래그 회피

- **경과**: Authorization Registry Foundation 스펙 수령 → 즉시 ⓐ 선영속 → ⓑ전수조사(서버측+역할/UI 2에이전트)→ⓒ56편→ⓓADR. 코드 0.
- **RP-002 준수**: 정책 데이터 선언체·판정 불변저장은 순신규·선행 Decision/Resource Version 부재로 대부분 BLOCKED_PREREQUISITE → 설계 명세만.
- **★"실재 과신" 회피**: index.php 중앙 RBAC·TeamPermissions RBAC/ABAC·Maker-Checker가 실재하나 "authorization 완성"으로 오인하지 않고 PARTIAL/substrate로 정직 판정. 선언적 Policy 버전화·Combining·Decision 불변저장·SoD/COI/Dual-Control 부재를 명확히 분리.
- **★DORMANT 오계상 회피(신규 축)**: `admin_roles/user_roles`가 CRUD·permissions 저장은 하나 런타임 접근판정에서 미소비(죽은 RBAC)임을 코드로 확인 — "RBAC 구현 존재"로 계상하지 않음. 저장≠집행.
- **★기수정 재플래그 회피**: §53 "Actor ID Body 신뢰" Critical Gap이 직전 03-03 세션의 `Alerting::actor()` canonical actor 수정으로 이미 닫혔음을 인지 — 과거 감사노트 관성으로 재플래그하지 않음(치유 이슈 재플래그 금지 규율 적용).
- **★"부재" 정직 판정**: 하드코딩 user-id/email authz가 레포에 전무(전부 DB 컬럼 기반)임을 확인·"Hardcoded User ID Allow"를 결함으로 날조하지 않음. 레거시 아카이브(legacy_v338_pkg gateway)를 라이브로 오인하지 않음.
- **★실 위험 발견**: writeGuard UI-only(서버 전역 미배선)·requireFeaturePlan fail-open·중복 유틸 3~4중 미러(정책 드리프트) — 후속 enforcement Part 등재(자립 quick-fix 아님·대규모 배선).
