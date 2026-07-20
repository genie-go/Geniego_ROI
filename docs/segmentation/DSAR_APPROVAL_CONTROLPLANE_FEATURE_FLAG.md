# DSAR — Approval Feature Flag Manager (Part 3-19 §21)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_19_AUTONOMOUS_CONTROL_PLANE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_CONTROL_PLANE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_CONTROLPLANE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_CONTROLPLANE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## (1) 계약 (SPEC §21 — Feature Flag Manager)

authz 기능/정책의 활성 여부를 **계층적 스코프**로 제어하는 거버넌스 플랫폼. 4스코프 + 비상 차단을 계약한다.

- **Global Flag** — 전 테넌트 공통 최상위 토글. 하위 스코프의 상한.
- **Region Flag** — 지역 단위 토글(Global 하위).
- **Tenant Flag** — 테넌트 단위 토글(Region 하위).
- **User Group Flag** — 테넌트 내 사용자 그룹/역할 단위 토글(최하위).
- **Emergency Kill Switch** — 승인·활성 상태와 무관하게 특정 authz 기능을 즉시 무력화하는 비상 경로. 상위 스코프에서 하위 전체를 차단.

계약: 스코프는 **상위 override 하위**(Global OFF ⇒ 하위 전부 OFF). 평가 결과·전환은 append-only 감사에 기록. 플래그는 registry(§17) config 오브젝트로 등재되어 버전·승인 대상이다.

## (2) Substrate 매핑

| 계약 요소 | 현행 substrate | 상태 | 근거(①②/ADR) |
|---|---|---|---|
| 플래그 플랫폼 | — | **부재(ABSENT)** | (grep 0) |
| per-entity 토글 | 개별 라우트 on/off | 플랫폼 아님 | (라우트만·산재) |
| 광고 kill(도메인) | 캠페인 pause | authz 아님 | `AutoCampaign.php:473` |
| 설정 저장 후보 | app_setting KV | 미연결 | `Db.php:308-321` |
| Global/Region/Tenant/UserGroup 계층 | — | **부재** | (전무) |

현행에는 authz **feature flag 플랫폼이 존재하지 않는다**(grep 0). 개별 기능의 on/off는 라우트별로 산재된 per-entity 토글일 뿐, 계층적 스코프·비상 차단·거버넌스가 없다.

## (3) 설계 계약 (순신설)

1. **계층 평가 엔진** — Global→Region→Tenant→UserGroup 순으로 평가, 상위 OFF가 하위를 단락(short-circuit). 어느 스코프에도 명시 없으면 기본 OFF(fail-closed).
2. **registry 등재** — 각 플래그는 §17 registry config 오브젝트로 등재되어 owner/approval/version(§18)을 보유. 무승인 플래그 활성 금지.
3. **Emergency Kill Switch** — 승인 게이트를 우회하되 그 발동 자체를 append-only 감사(`SecurityAudit.php:14-64`)에 즉시 기록. kill은 활성화보다 항상 우선.
4. **평가 감사** — 플래그 평가 결과를 감사 가능하게 기록(누가/언제/어느 스코프에서 무엇을 차단).
5. **배포 연동** — 플래그 상태 변경은 배포 엔진(§6)을 통해 전파, 로컬 캐시 우회 금지.

## (4) KEEP_SEPARATE

- **광고 캠페인 kill/pause**(`AutoCampaign.php:473`·`AutoCampaign.php:602`·`ClaudeAI.php:953`)는 마케팅 도메인의 광고 집행 중지 스위치로, authz Emergency Kill Switch와 **다른 대상**이다. 명명 유사만으로 통합 금지 — 별개 유지.
- per-entity 라우트 토글은 각 기능의 로컬 스위치로, 계층 플래그 매니저가 흡수하지 않는다(별도).

## (5) 판정

**ABSENT.** authz feature flag 플랫폼은 grep 0으로 부재하며, 현행은 per-entity 라우트 토글의 산재뿐이다. Feature Flag Manager는 Global/Region/Tenant/UserGroup 4계층 + Emergency Kill Switch를 **순신설**한다. 광고 killswitch(`AutoCampaign.php:473`·`AutoCampaign.php:602`·`ClaudeAI.php:953`)는 KEEP_SEPARATE. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§17 registry·§18 version 선행).
