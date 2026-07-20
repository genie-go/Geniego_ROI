# DSAR — Authorization Universal Governance Mesh Static Lint (Part 3-24 §26)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Static Lint(§26)는 배포 이전(빌드/CI 시점)에 메시 위상 선언을 **정적 분석**하여 런타임 이전에 구성 결함을 차단하는 게이트다. 대상 결함 6종: Missing Mesh Node(선언된 라우트가 참조하는 노드 부재), Invalid Route(도달 불가·순환 경로), Missing Sync Rule(리전 간 동기화 규칙 누락), Orphan Region(어떤 노드에도 연결되지 않은 고립 리전), Hardcoded Mesh Endpoint(코드 하드코딩 엔드포인트), Trust Configuration Error(신뢰 앵커·체인 설정 오류). 결함 발견 시 빌드 실패(fail-closed), 무결함 시에만 배포 진행. Lint 규칙은 선언형 위상 매니페스트를 입력으로 한다.

## 2. Substrate 매핑

| 린트 대상 결함 | 실재 substrate(baseline) | 인용 | 판정 |
|---|---|---|---|
| Hardcoded Mesh Endpoint | 단일호스트 접속 구성(하드코딩 대상) | `Db.php:63-87` | 검사대상·린트부재 |
| Invalid Route | 라우트 등록 매핑(도달성 검사 대상) | `routes.php:759-764` | 검사대상·린트부재 |
| Trust Configuration Error | 감사 verify 신뢰체인 구성 | `SecurityAudit.php:63-64` | 인접·mesh미인지 |
| Missing Node / Missing Sync / Orphan Region | (해당 substrate 없음) | — | ABSENT-greenfield |

Mesh Static Lint 자체(위상 매니페스트 파싱·노드 참조 무결성·리전 연결성 정적검사)는 grep 0 — 코드 전무.

## 3. 설계 계약

- **진입점**: CI 빌드 단계의 정적 검사 훅(런타임 무접촉). 선언형 위상 매니페스트를 입력으로 파싱해 그래프 무결성을 검증. 신규 실배선 아님(빌드 게이트) — 단 위상 조회 API 연동 시 `/api` 접두·`$register` 배선.
- **규칙 순서**: (1) 노드 참조 무결성(Missing Mesh Node) → (2) 라우트 도달성·비순환(Invalid Route, `routes.php:759-764` 등록 패턴 참조) → (3) 리전 간 sync 규칙 완전성(Missing Sync Rule) → (4) 리전 연결성(Orphan Region) → (5) 엔드포인트 하드코딩 금지(Hardcoded Mesh Endpoint, 현 단일호스트 `Db.php:63-87` 구성을 매니페스트로 외부화) → (6) 신뢰 앵커·체인 설정 검증(Trust Configuration Error, `SecurityAudit.php:63-64` verify 정합).
- **fail-closed**: 규칙 하나라도 위반 시 빌드 실패. 미해석 매니페스트=실패.
- **격리**: 린트는 tenant별 위상 스코프 교차 참조 금지(정적 단계에서도 리전 스코프 경계 검증).

## 4. KEEP_SEPARATE

마케팅 채널 동기화(`ChannelSync.php:12`)의 sync는 커머스 아웃바운드로 Missing Sync Rule 대상 아님. 어트리뷰션(`AttributionEngine.php:1560`) 무관. 별도 유지.

## 5. 판정

**ABSENT(mesh 정적 린트 전무)** — 순신설. 6종 결함 중 Hardcoded Mesh Endpoint는 현 단일호스트 구성(`Db.php:63-87`)이, Invalid Route는 라우트 등록 매핑(`routes.php:759-764`)이 검사 대상 substrate로 실재하고 Trust Configuration은 감사 verify(`SecurityAudit.php:63-64`)가 인접하나 **위상 매니페스트·노드 참조·리전 연결성 정적검사는 어디에도 없다**. 죽은 terraform substrate PRESENT 금지(greenfield). BLOCKED_PREREQUISITE(선언형 위상 매니페스트 부재). 코드 변경 0.
