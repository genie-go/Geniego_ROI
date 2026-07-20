# DSAR — Approval Mesh Local Governance Agent (Part 3-24 §2·§8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §8 Local Governance Agent)
`APPROVAL_MESH_AGENT`는 각 실행 노드(VM/Container/K8s Pod/Serverless/Edge)에 상주하는 **로컬 거버넌스 에이전트**로, 중앙 mesh control-plane의 판단을 노드 로컬에서 대행한다. 5대 책무:
- **Runtime Collection** — 노드 자원·요청·identity 실행맥락 수집.
- **Policy Cache** — 중앙 배포 정책(§6·`APPROVAL_MESH_POLICY`)의 로컬 캐시·TTL·무효화.
- **Local Decision** — 캐시된 정책으로 노드-로컬 PDP 평가(중앙 왕복 없이 저지연 permit/deny).
- **Health Reporting** — 에이전트 생존·정책버전·drift를 control-plane에 보고.
- **Event Publishing** — 로컬 결정·수집 이벤트를 mesh 이벤트버스로 게시.

## 2. Substrate 매핑
| Mesh Agent 책무 | 현행 substrate | file:line | 관계 |
|---|---|---|---|
| Local Decision(PDP) | 로컬 권한 평가 함수 | `TeamPermissions.php:695-700` | **확장 대상** — 단일서버 in-proc 평가를 노드-로컬 에이전트로 승격 |
| PEP(집행지점) | 요청 진입 미들웨어 | `index.php:69` | **확장 대상** — 정적 PEP를 에이전트-매개 집행으로 |
| Runtime context 수집 | 요청단위 attribute 주입 | `index.php:116-121` | 수집 시드(요청범위 한정, 노드범위 아님) |
| Policy 소스 | 서버 로컬 플랜 미러 | `AdminPlans.php:53-72` | 캐시 대상 원본(remote 배포 없음) |
| Health/Event 원장 | append-only 해시체인 | `SecurityAudit.php:63-64` | 이벤트 게시 sink 후보 |

## 3. 설계 계약
1. **에이전트 identity** — 각 노드 에이전트는 mesh 내 비인간 principal. 현행 유일 비인간 identity 축=`api_key`(SPEC §8.3 참조); 에이전트는 별도 principal-class로 신설.
2. **정책 캐시 무효화** — 중앙 정책 버전 상승 시 로컬 캐시 fail-secure(캐시미스=deny-by-default, 무제한 stale 금지).
3. **Local Decision 위임 상한** — 노드-로컬 판단은 중앙이 위임한 policy scope 내에서만; 범위 밖 요청은 중앙 에스컬레이션(로컬 자체판단 금지).
4. **Health drift** — 정책버전 drift 임계 초과 노드는 mesh에서 자동 격리(집행 중단).
5. **감사** — 모든 로컬 결정은 `SecurityAudit.php:63-64` 해시체인에 append-only 기록, verify() 대상.

## 4. KEEP_SEPARATE
- **User-Agent(브라우저 UA 문자열)** — HTTP 요청 헤더 개념. governance agent와 무관.
- **AI Agent(코파일럿/자율에이전트)** — 마케팅·의사결정 자율체. 별개 도메인. mesh agent는 authz 집행 대행자이지 AI 추론체 아님.

## 5. 판정
**ABSENT — greenfield.** governance agent grep 0. 로컬 PDP(`TeamPermissions.php:695-700`)·PEP(`index.php:69`)는 에이전트화 **확장 대상**이나, 노드-로컬 상주 에이전트·정책캐시·health/event 게시 계층은 **순신설**. NOT_CERTIFIED. 코드 변경 0.
