# DSAR — APPROVAL_DATA_PLANE (Part 3-16 §4)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

APPROVAL_DATA_PLANE = 리전별로 독립 배포되어 **런타임 인가 결정과 집행**을 수행하는 하위 평면(SPEC §4). Control Plane(§3)이 게시한 정책 스냅샷을 로컬에 보유하고, 요청 경로에서 저지연으로 결정한다. 계약 구성요소:

- **Runtime Authz**: 요청별 인가 결정 진입점.
- **PDP Execution**: 정책 결정점 — 주체·자원·컨텍스트를 정책에 대입해 permit/deny 산출.
- **PEP Enforcement**: 정책 집행점 — 결정을 실제 요청 흐름에서 강제(차단/통과).
- **Context Resolution**: 테넌트·역할·스코프·속성 컨텍스트 해석.
- **Decision Cache**: 동일 결정의 로컬 캐시(정책 버전 키 기반 무효화).
- **Local Enforcement**: Control Plane 단절 시에도 최근 스냅샷으로 계속 집행.

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| Data Plane 요소 | 상태 | 허용목록 근거 |
|---|---|---|
| PEP Enforcement (요청 진입 집행) | **PRESENT(단일노드)** | `backend/public/index.php:69-622`, 공개경로 바이패스 `:583-598` |
| PDP Execution (권한 판정) | **PRESENT(단일노드)** | `backend/src/Handlers/TeamPermissions.php:695-701` |
| Context Resolution (테넌트/역할 주입) | **PRESENT(단일노드)** | `backend/public/index.php:614-619`, RBAC 판정 `:423-461` |
| Runtime Authz 진입 | **PARTIAL(단일노드)** | `backend/public/index.php:99-122` (인증/키 미들웨어) |
| 단일 DB 노드 substrate | **PRESENT(단일노드)** | `backend/src/Db.php:63-87`, 호스트 기본 `:120` |
| Decision Cache (버전키 무효화) | **ABSENT (grep 0)** | — |
| Region별 독립 Data Plane / 복제 | **ABSENT (grep 0)** | — |
| Local Enforcement(스냅샷 단절운영) | **ABSENT (grep 0)** | — (현 결정은 라이브 DB 직결 `Db.php:63-87`) |

★ 현 집행·판정은 단일 PHP/MySQL 노드에서 in-process로 수행 — Data Plane의 **첫(0번) 노드**로 편입 가능하나 region 독립·복제·로컬 캐시는 순신설.

## 3. 설계 계약 (규칙)

1. **첫 노드 편입(무후퇴)**: 현 단일노드 집행(`index.php:69-622`·바이패스 `:583-598`)과 PDP(`TeamPermissions.php:695-701`)를 Data Plane 노드-0로 편입한다. 편입 시 현 결정 결과를 비트 등가로 보존(회귀 0).
2. **Context Resolution 승격**: 테넌트/역할 주입(`index.php:614-619`)·RBAC 판정(`index.php:423-461`)을 Data Plane의 표준 Context Resolution으로 승격. 신규 컨텍스트 엔진 신설 금지.
3. **Region 독립 순신설**: region별 독립 Data Plane·정책 스냅샷 복제·Decision Cache·Local Enforcement는 전부 ABSENT → 순신설. 단일 DB 노드(`Db.php:63-87`, `:120`)를 리전 복제로 확장하는 것은 별도 데이터 계층 과제(본 DSAR는 결정 평면 계약만).
4. **정책 버전 키 캐시**: Decision Cache 무효화 키는 Control Plane(§3) 정책 버전에 종속. 버전 부재 시 캐시 도입 금지(stale 결정 위험).
5. **격리 불변식**: 모든 노드는 테넌트 경계(`index.php:614-619`)를 넘는 결정을 산출하지 않는다.

## 4. KEEP_SEPARATE

- 헬스/메트릭 표면(`backend/src/Handlers/Health.php:13-26`, `backend/src/Handlers/SystemMetrics.php:60-100`)은 관측 도메인 — Data Plane 결정 경로와 분리.
- 데이터 반출(`backend/src/Handlers/DataExport.php:131-133`, `:154-156`)은 인가 집행이 아님 — KEEP_SEPARATE.
- 죽은 terraform(`infra/aws/terraform/*`)의 blue-green/autoscaling은 라이브 Data Plane과 무연결 — region-독립 PRESENT 근거로 인용 금지.

## 5. 판정

- **NOT_CERTIFIED · PARTIAL substrate**: 현 단일노드 집행(`index.php:69-622`·`:583-598`)+PDP(`TeamPermissions.php:695-701`)+Context(`index.php:614-619`)는 Data Plane **노드-0 재활용 substrate**로 편입.
- **ABSENT 순신설**: region별 독립 Data Plane·Decision Cache·Local Enforcement·스냅샷 복제 = **전부 ABSENT(grep 0)**. 단일 DB 노드(`Db.php:63-87`·`:120`)의 리전 복제도 순신설.
- **선행 의존**: Control Plane(§3) 정책 버전·배포 파이프라인 선행 필수(Decision Cache 무효화 키 종속). 본 평면은 결정 등가 무후퇴 편입 계약만 수립하며 코드 배선 0.
