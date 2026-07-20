# DSAR — Service Static Lint (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Service Static Lint)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry(Part 3-1)·Role Hierarchy(Part 3-2)·Role Assignment(Part 3-3)·Scoped Role(Part 3-4)·Dynamic Role(Part 3-5)·Decision Core 실 구현 부재
- **불변**: UNKNOWN Permit 금지(fail-closed) · 무후퇴 · 외부 벤더 자격증명 내부 identity 오흡수 금지(KEEP_SEPARATE) · 반날조(file:line은 상위 ADR·ground-truth 2문서만 인용·없으면 ABSENT) · 289차·279차 재플래그 금지

---

## 1. 목적

§31(Static Lint)은 서비스/시스템 identity 관련 코드·저장을 **저장·커밋 시점**에 검사하는 목록이다: **Hardcoded Secret · Hardcoded API Key · Static Credential · Missing Rotation · Missing Audit**(5종, 원문 그대로). ★이 저장소에는 §31 전용 lint(RBAC/identity 특화 CI 규칙)는 없으나, **일반 시크릿 스캔 CI 게이트는 실재**한다 — `.github/workflows/security-scan.yml:57-87` 차단 게이트+`tools/scan_secrets.sh`가 현재 워킹트리 하드코딩 secret 0을 유지 중(DUPLICATE_AUDIT D-5, gitleaks 등 전용 SaaS 통합은 부재). 이는 CLAUDE.md가 확정한 "no lint/test 스크립트"와 별개로 **보안 전용 CI 게이트 1건은 실재**함을 정직 반영한다. 본 문서는 5개 lint 규칙 각각을 이 CI 게이트·DUPLICATE_AUDIT 산재 발견과 대조한다.

## 2. Canonical 필드

- **Lint Rule** — §31 5종 중 1
- **판정** — `REAL`(정형화 대상 실 위반/실 게이트 후보) / `PARTIAL`(근접) / `ABSENT`(정직 부재)
- **실 substrate** — file:line(없으면 ABSENT)
- **정형화 방향** — 신설 시 lint가 겨눌 구체 대상

## 3. 열거형 / 타입

§31 Static Lint 5종(원문 그대로): `HARDCODED_SECRET` · `HARDCODED_API_KEY` · `STATIC_CREDENTIAL` · `MISSING_ROTATION` · `MISSING_AUDIT`.

## 4. 실 substrate 매핑 (PARTIAL/ABSENT)

| # | §31 lint 규칙 | 판정 | 근거(file:line) |
|---|---|---|---|
| 1 | Hardcoded Secret | **REAL(CI 게이트 근접·실재)** | `.github/workflows/security-scan.yml:57-87` 차단 게이트+`tools/scan_secrets.sh`가 소스코드 하드코딩 시크릿을 커밋 시점 차단 중(DUPLICATE_AUDIT D-5). ★historical 사례: 279차 `db_restore.php` 하드코딩 root 비번(`wms@Genie!61`)+고정 토큰은 이미 제거(commit a04252b4e2d, git 히스토리 잔존)·현재 워킹트리 0건([[project_n279_full_audit]] 기존 등재분, 재플래그 아님) |
| 2 | Hardcoded API Key | **PARTIAL(동일 게이트·세부 규칙 미확인)** | #1과 동일 `security-scan.yml:57-87`/`scan_secrets.sh` 게이트가 근접 substrate이나, GROUND_TRUTH 인용 범위 내에 "API Key 전용 하위 규칙"의 세부 패턴이 별도 확인되지 않음(반날조 원칙상 세부 규칙 존재를 단정하지 않고 일반 시크릿 스캔과 동일 게이트로만 판정) |
| 3 | Static Credential | **PARTIAL(다른 층위·at-rest gap 인용)** | §31 원문 취지(코드 내 정적 하드코딩)와 별개로, **at-rest 평문 저장** 형태의 정적 자격증명 gap이 DUPLICATE_AUDIT D-2·D-5에 실재 확인됨: `agency_session.token`(`AgencyPortal.php:81,203-205`)·`partner_session.token`(`PartnerPortal.php:60-66,177`)·`channel_webhook_token.token`(`ChannelSync.php:5771-5795,5863-5866`)·`journeys.webhook_token`(`JourneyBuilder.php:88,131,159`)·`webhook_endpoint.secret`(`OpenPlatform.php:84,117-121`) 전부 평문 저장(Crypto 미경유). **★이 gap은 소스코드 하드코딩이 아니라 DB at-rest 저장방식이므로 §31 Static Lint(코드 스캔)의 직접 대상이 아니라 §12 Secret Governance의 대상** — 오분류 주의. D-5 원문대로 **설계 코드 0·수정 아님**을 이 문서에서도 재확정 |
| 4 | Missing Rotation | **ABSENT(순신규·판정 대상 부재)** | rotate 함수 자체는 실재(api_key `Keys.php:150-187`·KEK `Crypto.php:133-148`·SCIM `EnterpriseAuth.php:917`)하나 전부 **수동 admin**이고 회전 주기/최종회전일시/만료상한 등 "언제 회전이 누락됐는지" 판정할 스케줄 데이터 자체가 없음(bin cron grep 0, DUPLICATE_AUDIT D-4). 검사 기준값이 없어 lint가 "누락"을 판정할 수 없음 |
| 5 | Missing Audit | **REAL(정형화 대상·실 불일치 확인)** | ★DUPLICATE_AUDIT D-1이 확정한 **api_key 2경로 감사 비대칭**: `/v421/keys`(Keys.php create/revoke/rotate `:81-133/135-148/150-187`)=감사 **0건**(SecurityAudit/audit grep 0) vs `/auth/api-keys`(UserAuth.php create/revoke/rotate `:4339-4362/4364-4377/4379`)=감사 **REAL**(`UserAuth.php:4360,4375`). 동일 테이블·동일 기능인데 경로에 따라 감사 유무가 다른 실 불일치 — lint가 즉시 겨눌 수 있는 구체 대상 |

## 5. 설계 원칙

1. **"lint/test 스크립트 없음"과 "보안 CI 게이트 없음"은 다르다** — CLAUDE.md가 확정한 일반 lint/test 부재와 별개로, `security-scan.yml`+`scan_secrets.sh` 시크릿 스캔 게이트 1건은 실재 동작 중이다(REAL). 이 게이트를 Hardcoded Secret/API Key(#1·#2) lint의 확장 기반으로 삼는다(재구현 금지).
2. **Static Credential(#3)은 §31 원문 취지(코드 스캔)와 D-2/D-5 at-rest 평문 gap을 동일시하지 않는다** — 코드 하드코딩 검사와 DB 저장방식은 다른 층위. 후자는 §12 Secret Governance(D-5, 별도 fix 세션)로 명확히 분리해 오분류를 방지한다.
3. **Missing Rotation(#4)은 rotate 함수 삭제·재구현 대상이 아니라 스케줄 계층을 그 위에 신설하는 대상** — `Keys.php:150-187`/`Crypto.php:133-148`은 무후퇴 유지, Rotation Policy(스케줄/만료상한)가 이를 감시하는 신규 레이어.
4. **Missing Audit(#5) lint는 D-1의 실 불일치를 정면 근거로 설계** — 두 경로 중 하나로 통합·감사 일원화하는 것이 이 lint의 목적(수정 대상 아님, 설계·코드 0).
5. **279차 db_restore.php 사례는 재플래그가 아니라 CI 게이트가 실효성 있음을 보이는 근거로만 인용** — 이미 제거된 결함을 다시 결함으로 등재하지 않는다.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: 5종 전부 Canonical Service Identity Registry+Rotation Policy 실구현 이후에 identity 특화 lint 발동 가능.
- **REAL(정형화 대상)**: Hardcoded Secret(#1, CI 게이트 근접 실재)·Missing Audit(#5, D-1 api_key 2경로 감사 비대칭 실 불일치).
- **PARTIAL**: Hardcoded API Key(#2)·Static Credential(#3, at-rest gap·다른 층위).
- **ABSENT(판정 대상 부재)**: Missing Rotation(#4) — 스케줄 데이터 자체 없음.
- **판정**: NOT_CERTIFIED · 실 lint 활성 = Canonical Service Identity Registry 신설 + api_key 2경로 통합 + 별도 승인세션(RP-002).

관련: [[DSAR_APPROVAL_SERVICE_RUNTIME_GUARD]] · [[DSAR_APPROVAL_SERVICE_ERROR_WARNING_CONTRACT]] · [[DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT]] · [[ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE]]
