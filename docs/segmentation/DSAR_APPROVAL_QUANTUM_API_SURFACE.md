# DSAR — Authorization Quantum-Ready API Surface (Part 3-23 §28)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_23_QUANTUM_READY_ARCHITECTURE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_QUANTUM_READY_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_QUANTUM_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_QUANTUM_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

API Surface(§28)는 양자내성 아키텍처의 관리·운영 진입점 8종을 정의한다: Discover Crypto Assets(암호 자산 발견), Query Crypto Inventory(인벤토리 조회), Assess Quantum Risk(양자위험 평가), Generate Migration Plan(마이그레이션 계획 생성), Rotate Key(키 회전), Validate Certificate(인증서 검증), Query Analytics(분석 조회), Export Crypto Snapshot(스냅샷 반출). 이 표면은 Runtime Guard(§24)·Static Lint(§25)가 축적한 상태를 조회·조치로 노출하며, 모든 엔드포인트는 `analyst+`/`admin` RBAC·tenant scope·audit를 강제한다. 쓰기 계열(Rotate Key/Generate Plan)은 fail-closed·승인정책 존중.

## 2. Substrate 매핑

| API | 동작 | 근접 substrate | 인용 | 판정 |
|---|---|---|---|---|
| Rotate Key | KEK/키 회전 | KEK 파생 | `Crypto.php:133-148` | 확장 baseline |
| Validate Certificate | 인증서/체인 검증 | SAML 서명검증 | `EnterpriseAuth.php:597` | 확장 baseline |
| Discover / Query Inventory | crypto 사용처 집계 | 산재 crypto | `Crypto.php:108-126` | 원천·인벤토리 부재 |
| Assess Risk / Generate Plan / Analytics / Export | 신규 도메인 | (없음) | — | ABSENT-greenfield |

8종 라우트·핸들러 모두 grep 0 — 코드 전무.

## 3. 설계 계약

- **배선**: 신규 8종 엔드포인트는 `/api` 접두로 라우트 등록 파일에 `$register` 배선(nginx SPA HTML 폴백 착시 회피). 최신 버전 프리픽스 하위. 미배선 핸들러=실백엔드 아님.
- **RBAC**: 조회(Discover/Query/Assess/Analytics)=`analyst+`. 쓰기(Rotate Key/Generate Plan)=`admin`+승인정책. Export=`admin`+감사 강제. API key 발급 경로(`Keys.php:40`·`:88-96`) 기존 RBAC 재사용.
- **Rotate Key**: 기존 KEK 파생(`Crypto.php:133-148`)을 대체하지 않고 그 위에 회전 오케스트레이션 계층 추가(비파괴 확장·dual-read 무중단). 실패=`KEY_ROTATION_FAILED`(§26).
- **Validate Certificate**: SAML assertion 검증(`EnterpriseAuth.php:597`)을 재사용·PQC 인지로 확장. 실패=`CERTIFICATE_CHAIN_INVALID`(§26).
- **Discover/Inventory**: §25 정적 스캔 결과를 SoT 인벤토리로 노출. 산재 crypto(`Crypto.php:108-126`) 사용처 집계가 원천.
- **감사·격리**: 모든 호출을 `SecurityAudit.php:27` append(`:56-68` verify)로 기록. tenant scope 절대. Export 스냅샷은 자격증명 평문노출 회피.

## 4. KEEP_SEPARATE

마케팅 도메인 `AutoRecommend.php:22`(추천 엔진)는 crypto 자산 API와 무관 — 흡수/재사용 금지, 분리 유지.

## 5. 판정

**ABSENT(8종 순신규)** — Rotate Key는 Crypto KEK(`Crypto.php:133-148`)·Validate Certificate는 SAML verify(`EnterpriseAuth.php:597`)를 확장 baseline으로 재사용 가능하나, 나머지 6종(Discover/Query Inventory/Assess Risk/Generate Plan/Query Analytics/Export Snapshot)은 원천 substrate조차 없다. `/api` 접두·`$register` 배선 필수. 순신설. BLOCKED_PREREQUISITE(가드/린트/PQC 라이브러리 부재 `composer.json:5-13`). 코드 변경 0.
