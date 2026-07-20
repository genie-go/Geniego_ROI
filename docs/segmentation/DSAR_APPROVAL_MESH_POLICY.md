# DSAR — Approval Mesh Policy Distribution (Part 3-24 §2·§6)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §6 Policy Distribution)
`APPROVAL_MESH_POLICY`는 mesh control-plane이 **다수 노드에 정책을 배포·버전관리·delta 동기화**하는 계층이다. 배포 대상 6종:
- **Policy** — authz 정책(허용/거부 규칙).
- **Role** — 역할 정의·위계.
- **Permission** — 스코프·능력.
- **Trust Rule** — 데이터/신뢰도 게이트 규칙.
- **Compliance Rule** — 규제·잔류·DSAR 규칙.
- **AI Governance Rule** — AI 추천·자동집행 안전규칙.

각 배포는 서명·버전·delta·롤백 단위를 갖고, 로컬 에이전트(§8·`APPROVAL_MESH_AGENT`)가 이를 캐시·집행한다.

## 2. Substrate 매핑
| Mesh Policy 대상 | 현행 substrate | file:line | 관계 |
|---|---|---|---|
| Policy/Permission 원본 | 플랜↔기능 매핑 미러 | `AdminPlans.php:53-72` | **동일서버 in-proc proto** — remote/delta 배포 없음 |
| Plan 게이트 조회 | 플랜 해석 지점 | `AdminPlans.php:157`,`:180`,`:209` | 단일노드 읽기(배포 파이프라인 아님) |
| Role/Permission 평가 | 로컬 권한 평가 | `TeamPermissions.php:695-700` | 배포 소비지점(수신자) |
| 정책 저장 | PDO 싱글턴 스키마 | `Db.php:63-87` | 로컬 저장(멀티노드 복제 없음) |
| 배포 감사 | 해시체인 원장 | `SecurityAudit.php:63-64` | 배포 이벤트 기록 sink |

## 3. 설계 계약
1. **서명·버전** — 모든 정책 배포는 서명+단조증가 버전. 미서명/구버전 롤백 배포 거부.
2. **Delta 동기화** — 전량 재배포가 아닌 변경분 delta; 노드는 버전 gap 시 full-resync fail-secure.
3. **6종 정책 통합 스키마** — Policy/Role/Permission/Trust/Compliance/AI Gov를 단일 canonical 배포 포맷으로(중복 배포엔진 금지).
4. **롤백 원자성** — 배포 실패 시 노드는 직전 서명버전 유지(부분적용 금지).
5. **테넌트 격리** — 배포 정책은 테넌트 스코프 태깅, cross-tenant 유출 금지(`Db.php:519-527` 테넌트 경계 존중).

## 4. KEEP_SEPARATE
- **AdminPlans 미러(`AdminPlans.php:53-72`)** = 동일서버 in-process 플랜 미러 proto이지 remote 정책배포 mesh 아님. delta·서명·다노드 복제 부재. mesh policy는 이를 원본 소스로 **확장**하되 배포 파이프라인은 순신설.

## 5. 판정
**ABSENT — 분산(distribution) 부재.** AdminPlans 미러(`AdminPlans.php:53-72`)는 동일서버 proto일 뿐 remote/delta 배포 없음. 다노드 정책배포·서명·버전·delta·롤백 계층은 **순신설**. NOT_CERTIFIED. 코드 변경 0.
