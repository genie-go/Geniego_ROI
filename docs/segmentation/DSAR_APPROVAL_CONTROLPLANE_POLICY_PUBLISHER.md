# DSAR — Authorization Policy Publisher (Part 3-19 §5)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_POLICY_PUBLISHER

Policy Publisher 는 Registry(§1)의 authz 아티팩트를 **안전한 릴리스 수명주기**로 Data Plane 에 전파하는 배포 파이프라인이다. 단계:

- **Draft** — 초안 작성(비활성).
- **Review** — 검토·증거 기반 승인 요청.
- **Approval** — 권한자 승인(fail-secure·증거 필수).
- **Publish** — active 전환·전파.
- **Canary** — 부분 트래픽 대상 점진 배포.
- **Blue-Green** — 무중단 전환.
- **Rollback** — 결함/이상 시 직전 active 로 복귀.

계약상 Publisher 는 **authz 정책 전용**이며, 승인·게시 시맨틱은 리포지토리 내 기존 publish/decision 선례를 계승하되 그 코드를 흡수하지 않는다.

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| authz Policy Publisher(전용) | **ABSENT** (grep 0) | authz 정책 draft→publish 파이프라인 부재 |
| publish 시맨틱 선례(비-authz) | PRESENT(참고만) | FeedTemplate publish `routes.php:757`·`:764`(product 도메인) |
| Approval+증거 결정 선례 | PRESENT(참고만) | `AccessReview.php:176-225`(decision)·`:188`(approve/revoke enum)·`:225`(evidence 해시체인 기록) |
| 증거 필수 fail-secure | PRESENT | `AccessReview.php:188`·justification 강제(request-driven decision) |
| 불변 게시 이력 앵커 | PRESENT(재사용) | `SecurityAudit.php:14-31`·`:35-38`·`:56-64` |
| Canary/Blue-Green/Rollback | ABSENT | authz 정책 점진배포·무중단전환·롤백 계층 전무 |
| active 상태 저장소 | PARTIAL(EXTEND 대상) | flat KV `Db.php:308-321`(상태·버전 개념 없음) |

**판정 근거**: authz 정책 전용 Publisher 는 부재하다(authz policy publish grep 0). 다만 리포지토리에는 두 종류의 **재사용 가능한 선례**가 존재한다: (a) **FeedTemplate publish**(`routes.php:757`·`:764`)는 product 도메인의 게시 전환 시맨틱을, (b) **AccessReview decision**(`AccessReview.php:176-225`)은 `:188` approve/revoke 승인 enum·`:225` evidence 해시체인·request-driven(요청 기반 승인) 패턴을 제공한다. 이 둘은 authz Publisher 의 **설계 참고 선례**일 뿐 직접 흡수 대상이 아니다(도메인 상이). Canary/Blue-Green/Rollback 은 전무. 판정 **ABSENT**.

## 3. 설계 계약(규칙)

- **R1 (증거 기반 승인)**: 모든 Publish 는 승인자·justification 을 필수로 요구한다. `AccessReview.php:188`(approve/revoke)·`:225`(evidence) 의 fail-secure·request-driven 패턴을 계승(증거 없는 게시 금지).
- **R2 (상태전이 단방향)**: Draft→Review→Approval→Publish 는 단방향이며 각 전이는 Registry(§1) 아티팩트 version 을 증가시킨다. Rollback 은 직전 active version 으로만 복귀(임의 버전 점프 금지).
- **R3 (전파 무중단·무후퇴)**: Blue-Green 전환은 기존 Data Plane PEP(`index.php:69-88`) 집행을 중단시키지 않는다. Canary 실패 시 자동 Rollback·fail-secure(deny 우선).
- **R4 (게시 증거 불변)**: Publish/Rollback 이벤트는 `SecurityAudit.php:14-31`(`log`)·`:35-38`·`:56-64`(체인 검증) 해시체인에 append-only 기록. 감사 재구현 금지.
- **R5 (선례 계승·비흡수)**: publish 상태전이는 `routes.php:757`·`:764` 시맨틱을, 승인결정은 `AccessReview.php:176-225` 시맨틱을 **참고**하되 별도 authz 전용 경로로 신설한다(product/access-review 코드 재사용·오염 금지).

## 4. KEEP_SEPARATE

- ML 모델 배포 `ModelMonitor.php:17-19`·`:21`·`:42-44` 및 code deploy `deploy.ps1`·`deploy.sh`·`.github/workflows/deploy.yml` 는 authz 정책 게시와 무관. Publisher 로 통합·혼용 금지.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_POLICY_PUBLISHER 는 authz 도메인에 부재(grep 0)하며, 게시/승인 시맨틱 선례(FeedTemplate publish·AccessReview decision)만 참고 가능하다. 순신설 설계이며 Registry(§1)·Orchestrator(§3) 선행 완료 후 별도 승인 세션에서 진행. 코드 변경 0.
