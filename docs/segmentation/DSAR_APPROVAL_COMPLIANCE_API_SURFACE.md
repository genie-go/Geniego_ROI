# DSAR — Authorization Compliance API Surface (Part 3-17 §31)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)
Compliance API Surface는 §27~§30 계약을 외부에 노출하는 8종 엔드포인트다. SPEC §31:

| API | 책무 | 사상 |
|-----|------|------|
| Assess Compliance | compliance posture 평가 | §27/전반 |
| Query Control Mapping | 규제↔통제 매핑 조회 | §28 |
| Generate Compliance Report | compliance 보고서 생성 | 감사 산출 |
| Submit Exception | compliance 예외 제출 | §27 예외 |
| Run Gap Analysis | 통제 갭 분석 | §28 |
| Query Analytics | compliance 분석/추세 조회 | §30 |
| Run Simulation | 규제 변경 시뮬레이션 | 선제 평가 |
| Verify Evidence Chain | 증거 체인 무결성 검증 | §27 Tampering |

## 2. Substrate 매핑
| API | 현행 substrate | 상태 |
|-----|----------------|------|
| Assess Compliance | `Compliance.php:53-130` posture | **EXTEND(기존 확장)** |
| Generate Compliance Report | `Compliance.php:269-300` auditExport | **EXTEND** |
| Verify Evidence Chain | `SecurityAudit.php:56-68` verify() | **EXTEND(재사용)** |
| Query Control Mapping | 통제 매핑 조회 | ABSENT |
| Submit Exception | 예외 제출 워크플로 | ABSENT |
| Run Gap Analysis | 갭 분석 | ABSENT |
| Query Analytics | 추세 분석 | ABSENT(스냅샷만) |
| Run Simulation | 규제 시뮬레이션 | ABSENT |
| 라우팅 스코프 | `/v424/compliance/*` `routes.php:1108-1118` | 실재·재사용 |

## 3. 설계 계약
- **EXTEND 우선**: 3종(Assess→`Compliance.php:53-130` posture, Report→`:269-300` auditExport, Verify Evidence Chain→`SecurityAudit.php:56-68` verify)은 신설 없이 기존 메서드 위에 API를 얹는다. 신규 핸들러 클래스 난립 금지 — `Compliance.php`에 액션 추가.
- **라우트 배선**: 신규 5종은 `/v424/compliance/*`(`routes.php:1108-1118`) 스코프를 재사용하고 라우트 등록 파일에 `$register` 배선. `/api` 접두 규약 준수(프론트→백엔드 실배선).
- **인증·RBAC**: 모든 API는 RBAC PEP(`index.php:600-619`) 통과 후 compliance 판정. 예외 제출·보고서 생성 등 쓰기 성격은 `analyst+` 상당 권한 요구(기존 RBAC 계약 존중).
- **응답 계약**: 위반 시 §29 Error Contract, 저하 시 §30 Warning Contract 스키마로 통일. Verify Evidence Chain은 verify() 결과(OK/BROKEN)를 그대로 반영(변조 판정 단일 소스).

## 4. KEEP_SEPARATE
- 마케팅 규칙 엔진 `RuleEngine.php:10-12`, 데이터 플랫폼 `DataPlatform.php:282-287`은 compliance API와 도메인·목적이 상이 → 흡수·통합 금지, 분리 유지.

## 5. 판정
**PARTIAL-EXTEND** — 8종 중 3종(Assess·Report·Verify Evidence Chain)은 기존 substrate(`Compliance.php:53-130`·`:269-300`·`SecurityAudit.php:56-68`) 확장으로 성립하고, 나머지 5종(Query Control Mapping·Submit Exception·Run Gap Analysis·Query Analytics·Run Simulation)은 **순신설**이다. 전 API는 `/v424/compliance/*`(`routes.php:1108-1118`) 재사용 + `$register` 배선. `Compliance.php` EXTEND 원칙(신설 핸들러 난립 금지) 준수. BLOCKED_PREREQUISITE(Control Mapping 카탈로그·Exception/Evidence Store 선행).
