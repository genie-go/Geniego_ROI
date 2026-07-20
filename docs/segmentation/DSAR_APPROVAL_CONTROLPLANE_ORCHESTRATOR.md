# DSAR — Authorization Global Orchestrator (Part 3-19 §3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의(SPEC) — APPROVAL_GLOBAL_ORCHESTRATOR

Global Orchestrator 는 **Control Plane 전역 조정자**로, Registry(§1) 정의를 소비해 다음 6개 조정 책무를 수행한다:

1. **Policy Distribution** — active 정책을 대상 Data Plane 노드에 전파(Publisher §5 위임 감독).
2. **Runtime Coordination** — 런타임 조정자(§7)의 PDP/PEP/PIP 상태를 오케스트레이션.
3. **AI Recommendation Distribution** — authz 관련 AI 권고(예: 접근 이상 탐지)를 검증데이터 게이트 통과분만 배포.
4. **Compliance Sync** — 규제/정책 준수 상태를 전역 동기화.
5. **Region·Cluster Coordination** — 다중 리전/클러스터 간 정책 정합·수렴.
6. **Global Recovery** — 장애 시 authz 결정 안전상태(fail-secure)로 복구 조정.

계약상 Orchestrator 는 **authz 도메인 전용**이며, 마케팅 캠페인/여정 오케스트레이션이나 ML 모델 배포와 **결코 융합하지 않는다**.

## 2. 실존 substrate 매핑

| 계약 요소 | 판정 | 근거(허용목록) |
|---|---|---|
| authz Global Orchestrator | **ABSENT** (grep 0) | authz 전역 조정자 클래스/서비스 부재 |
| "orchestrator" 문자열 실체 | 무관(deploy 빌드용) | `deploy.ps1`(빌드 오케스트레이션 스크립트·authz 아님) |
| Policy Distribution 배선 | ABSENT | 전파 계층 부재 — 현행은 단일 프로세스 inline `index.php:69-88` |
| Runtime Coordination 대상(PDP/PEP) | PARTIAL(피조정 실재) | PDP `TeamPermissions.php:695-701`·PEP `index.php:69-88` 존재하나 조정자 없음 |
| Compliance/Recovery 증거 앵커 | PRESENT(재사용) | `SecurityAudit.php:14-64`(불변 해시체인) |
| Region·Cluster 토폴로지 | ABSENT | 단일 모놀리스(`index.php:23`·`Db.php:18`)·다중 클러스터 authz 조정 개념 없음 |
| 헬스/가용성 신호 | PARTIAL | `Health.php:56-67`·`:102-103`(단일 노드 헬스만) |

**판정 근거**: authz 도메인의 전역 조정자는 존재하지 않는다(grep 0). 리포지토리에서 "orchestrat*" 는 오직 **배포 빌드 스크립트** `deploy.ps1`(및 `deploy.sh`) 문맥에서만 등장하며, 이는 프론트 빌드 파이프라인 오케스트레이션으로 authz Control Plane 과 무관하다. 라이브 authz 는 단일 리전 단일 프로세스 모놀리스이므로 Region·Cluster·Global Recovery 조정 계층은 전무하다. 판정 **ABSENT**.

## 3. 설계 계약(규칙)

- **R1 (도메인 봉인)**: Orchestrator 는 authz 아티팩트(정책/역할/권한/approval)만 조정한다. 마케팅/ML/deploy 조정 로직 흡수 금지(§4 참조).
- **R2 (검증 게이트)**: AI Recommendation Distribution 은 상위 데이터 헌법 V3 신뢰검증(READY) 통과분만 배포한다. 미검증 권고 자동 배포 금지.
- **R3 (Fail-secure Recovery)**: Global Recovery 는 authz 결정 불확정 시 항상 deny(fail-secure)로 수렴한다. `SecurityAudit.php:14-64` 해시체인에 복구 이벤트를 append-only 기록.
- **R4 (전파 위임)**: 실제 정책 배포는 Publisher(§5)에, 런타임 상태 조율은 Runtime Coordinator(§7)에 위임한다. Orchestrator 는 감독·수렴만 담당(책임 중복 금지).
- **R5 (헬스 소비)**: 노드 가용성 판단은 기존 `Health.php:56-67` 신호를 소비하며 별도 헬스 체계 재구현 금지.

## 4. KEEP_SEPARATE (흡수 절대 금지)

- **마케팅 orchestration** — `AutoCampaign.php:17`·`:45`·`:473`·`:602`, `JourneyBuilder.php:14`. 캠페인/여정 자동화 오케스트레이션은 별개 도메인. authz Orchestrator 로 통합 금지.
- **의사결정/규칙 엔진** — `Decisioning.php:12`·`:307`, `RuleEngine.php:12`·`:24`. 마케팅 의사결정 파이프라인. authz 조정과 혼용 금지.
- **ML deploy** — `ModelMonitor.php:17-19`·`:21`·`:42-44`. 모델 배포/모니터링. authz 정책 배포와 분리 유지.
- **code deploy** — `deploy.ps1`·`deploy.sh`·`.github/workflows/deploy.yml`. 빌드/배포 오케스트레이션. authz Global Orchestrator 와 명명 유사할 뿐 무관.

## 5. 판정

**NOT_CERTIFIED · BLOCKED_PREREQUISITE.** APPROVAL_GLOBAL_ORCHESTRATOR 는 authz 도메인에 부재(grep 0)하며, "orchestrator" 실체는 배포 빌드용 `deploy.ps1` 뿐이다. 순신설 설계이며 선행 foundation(Registry §1·Control/Data Plane 분리) 완료 후 별도 승인 세션에서 진행. 코드 변경 0.
