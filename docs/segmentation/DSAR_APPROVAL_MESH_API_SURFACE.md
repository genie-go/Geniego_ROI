# DSAR — Authorization Universal Governance Mesh API Surface (Part 3-24 §29)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

API Surface(§29)는 거버넌스 메시 제어평면의 외부 계약 8종을 정의한다: Register Mesh Node(노드 등록), Query Mesh Topology(위상 조회), Publish Policy(정책 게시·분배), Synchronize Region(리전 동기화), Query Mesh Health(메시 헬스 조회), Execute Consensus(합의 집행), Export Mesh Snapshot(위상 스냅샷 반출), Query Analytics(메시 분석 조회). 모든 엔드포인트는 `/api` 접두·라우트 등록 파일 `$register` 배선을 따르고, 인증·RBAC·tenant 격리 미들웨어 뒤에 위치하며(fail-closed), 쓰기(Register/Publish/Synchronize/Execute)는 analyst+ 및 maker-checker 게이트를 통과해야 한다.

## 2. Substrate 매핑

| API | 실재 substrate(baseline) | 인용 | 판정 |
|---|---|---|---|
| Query Mesh Health | 시스템 메트릭 조회 | `SystemMetrics.php:32` | Health baseline 재사용 |
| Query Mesh Health | 헬스 엔드포인트 | `Health.php:27` | baseline 재사용 |
| Publish Policy | 관리자 플랜 게시 미러 | `AdminPlans.php:53-72` | 게시패턴 참조 |
| Execute Consensus | maker-checker 승인 큐 게이트 | `Mapping.php:287` | 확장 대상 |
| Register/Topology/Sync/Snapshot/Analytics | (해당 substrate 없음) | — | ABSENT-greenfield |

8종 API 중 6종은 발생원 자체가 부재 — grep 0. 인증 게이트(`index.php:69`)·tenant 주입(`index.php:98`)은 모든 신규 엔드포인트의 공통 전제.

## 3. 설계 계약

- **표면 규약**: 8종 모두 `/api` 접두·라우트 등록 파일 `$register` 배선. 공개경로 우회 목록(`index.php:69`)에 **추가하지 않음**(전부 인증 필수). tenant 주입·격리(`index.php:98`) 통과.
- **읽기/쓰기 분리**: 읽기(Query Topology/Health/Analytics, Export Snapshot)는 viewer+·tenant 스코프. Query Mesh Health는 헬스 substrate(`SystemMetrics.php:32`·`Health.php:27`)를 메시 차원으로 재사용(중복 엔진 금지). 쓰기(Register Node/Publish Policy/Synchronize Region/Execute Consensus)는 analyst+ 및 게이트 필수.
- **Publish Policy**: 관리자 플랜 게시 패턴(`AdminPlans.php:53-72`)을 미러해 정책 게시→분배 흐름 설계(재구현 아닌 패턴 계승).
- **Execute Consensus**: maker-checker 승인 큐(`Mapping.php:287`)를 확장 — self-approval 차단·정족수 계승, 무회귀.
- **감사**: 모든 쓰기 API를 append-only 감사(`SecurityAudit.php:27`)에 기록, 정본 verify(`SecurityAudit.php:63-64`).
- **격리**: 모든 조회/집행 결과 tenant scope. 교차 테넌트 위상/스냅샷/분석 노출 금지.

## 4. KEEP_SEPARATE

마케팅 채널 동기화(`ChannelSync.php:12`)의 sync API는 커머스 아웃바운드로 Synchronize Region과 무관. 어트리뷰션(`AttributionEngine.php:1560`) 무관. 별도 유지.

## 5. 판정

**ABSENT(8종 순신규 API)** — 순신설. Query Mesh Health는 헬스 substrate(`SystemMetrics.php:32`·`Health.php:27`) 재사용, Publish Policy는 관리자 플랜 게시 미러(`AdminPlans.php:53-72`), Execute Consensus는 maker-checker 확장(`Mapping.php:287`)으로 각각 baseline을 계승하나 **Register Node·Topology·Region Sync·Snapshot·Analytics는 발생원 부재로 전부 신규**다. 전부 `/api` 접두·`$register` 배선·인증 필수(우회 목록 미추가). 죽은 terraform substrate PRESENT 금지(greenfield). BLOCKED_PREREQUISITE(메시 제어평면 부재). 코드 변경 0.
