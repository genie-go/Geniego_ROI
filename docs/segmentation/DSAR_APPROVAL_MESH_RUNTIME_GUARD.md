# DSAR — Authorization Universal Governance Mesh Runtime Guard (Part 3-24 §25)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Runtime Guard(§25)는 인가 거버넌스 메시(mesh)의 제어평면 요청 경로에 **요청 시점(inline)** 배치되어, 메시 위상(topology)·정책 분배·합의(consensus) 경로로 진입하는 모든 노드/에이전트/라우트 요청을 fail-closed로 검사하는 게이트다. 대상 위협 6종: Unauthorized Node Join(비인가 노드 합류), Rogue Governance Agent(악성 거버넌스 에이전트), Policy Injection(정책 주입), Synchronization Poisoning(동기화 오염), Consensus Manipulation(합의 조작), Cross-Tenant Route Hijacking(교차 테넌트 경로 탈취). 위협 탐지 시 요청을 거부하고 결정을 append-only 감사에 기록하며, 통과 시에만 하류 메시 연산으로 진행한다. 모든 정책·경로는 tenant scope 격리, Unknown=차단.

## 2. Substrate 매핑

| 가드 대상 위협 | 실재 substrate(baseline) | 인용 | 판정 |
|---|---|---|---|
| Consensus Manipulation | maker-checker self-approval 차단 | `Mapping.php:269` | baseline·mesh미인지 |
| Consensus Manipulation | 승인 큐 게이트(요청↔집행 분리) | `Mapping.php:287` | baseline·mesh미인지 |
| Cross-Tenant Route Hijacking | tenant 주입·격리 미들웨어 | `index.php:98` | 격리 baseline |
| Policy Injection | append-only 감사 verify 체인 | `SecurityAudit.php:63-64` | 변조탐지 baseline |
| Unauthorized Node Join | 공개경로 우회 목록(인증 게이트) | `index.php:69` | 인접·노드미인지 |
| Rogue Agent / Sync Poisoning | (해당 substrate 없음) | — | ABSENT-greenfield |

Mesh Runtime Guard 자체(비인가 노드 합류 차단, 정책 주입/동기화 오염 inline 검사)는 grep 0 — 코드 전무.

## 3. 설계 계약

- **진입점**: 메시 제어평면 요청 직전 단일 훅. 기존 인증 미들웨어(`index.php:69`)·tenant 격리(`index.php:98`)를 대체하지 않고 그 뒤에 메시 정책 판정을 삽입(비파괴 확장). 신규 실배선은 `/api` 접두·라우트 등록 파일 `$register` 배선.
- **판정 순서**: (1) 노드 신원·합류 권한(Unauthorized Node Join) → (2) 에이전트 서명·역할(Rogue Governance Agent) → (3) 정책 페이로드 무결성(Policy Injection, `SecurityAudit.php:63-64` verify 재사용) → (4) 동기화 소스 신뢰(Synchronization Poisoning) → (5) 합의 정족수·self-approval(Consensus Manipulation, `Mapping.php:269`·`:287` 재사용) → (6) 경로 tenant 일치(Cross-Tenant Route Hijacking, `index.php:98`). 하나라도 실패=거부.
- **fail-closed**: 정책 미해석·노드 미상·tenant 미상 = 차단. Unknown≠허용.
- **감사**: 모든 거부/통과 결정을 append-only 감사 계약(`SecurityAudit.php:27`)으로 기록, 정본 verify(`SecurityAudit.php:63-64`)만 사용. 장식적 hash_chain 재사용 금지.
- **격리**: 정책·경로·합의 결정 tenant scope. 교차 테넌트 mesh 상태 참조 금지.

## 4. KEEP_SEPARATE

마케팅 채널 동기화(`ChannelSync.php:12`)는 커머스 아웃바운드 sync 도메인으로, 거버넌스 메시의 동기화 개념과 명명만 겹칠 뿐 흡수 대상 아님. 어트리뷰션 엔진(`AttributionEngine.php:1560`)도 무관 — 별도 유지.

## 5. 판정

**ABSENT(mesh 런타임 가드 전무)** — 순신설. 6종 위협 중 Consensus Manipulation은 maker-checker self-approval 차단(`Mapping.php:269`·`:287`), Cross-Tenant Route Hijacking은 tenant 격리(`index.php:98`), Policy Injection은 감사 verify(`SecurityAudit.php:63-64`)가 각각 baseline substrate로 실재하나 **mesh 노드/에이전트/위상 인지·inline 가드는 어디에도 없다**. 죽은 terraform/infra-as-code substrate PRESENT 금지(greenfield). BLOCKED_PREREQUISITE(메시 제어평면 부재). 코드 변경 0.
