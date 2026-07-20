# DSAR — Release Package & Deployment Readiness Governance (Part 3-25 §2·§9)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §2·§9 Deployment Readiness)
Release Package Governance는 운영에 승격되는 배포 산출물의 **무결성·추적성·공급망 안전**을 릴리스 단위로 보증한다. 구성요소: **Build Integrity**(빌드 재현·해시 고정), **Artifact Signature**(산출물 서명·출처 증명), **Container/Image**(이미지 무결성), **SBOM**(소프트웨어 구성명세), **Vulnerability Scan**(취약점 스캔 통과), **License**(라이선스 컴플라이언스). 서명·SBOM·스캔 결과가 결합된 "Release Package"만 배포 자격을 갖는다.

## 2. Substrate 매핑
| SPEC 요구 | 현행 substrate | 상태 |
|---|---|---|
| Build Integrity(빌드 오케스트레이션) | `deploy.ps1:14-34`(빌드 파이프라인)·`.github/workflows/deploy.yml:77-159`(CI 빌드) | PARTIAL |
| Vulnerability Scan | CI 취약점 스캔 `.github/workflows/security-scan.yml:126-144` | PARTIAL (스캔 존재) |
| 스캔 게이트/정책 표면 | `security-scan.yml:90-123`·`security-scan.yml:147-177` | PARTIAL (게이트 표면) |
| Artifact Signature / SBOM / License gate | grep 0 | **ABSENT — 순신설** |

## 3. 설계 계약
- **Build Integrity**: 기존 빌드 경로(`deploy.ps1:14-34`·`deploy.yml:77-159`)의 산출물에 대해 결정적 해시를 고정·기록한다. 별도 빌드 파이프라인 신설 금지 — 기존 빌드 산출을 **관측·봉인**만.
- **Vulnerability Scan 게이트**: 기존 CI 스캔(`security-scan.yml:126-144`, 게이트 표면 `security-scan.yml:90-123`·`security-scan.yml:147-177`)을 릴리스 자격의 필수 gate로 **승격 재사용**. 스캔 실패 = 릴리스 패키지 발급 거부(fail-closed). 중복 스캐너 신설 금지.
- **Artifact Signature / SBOM / License**: 현재 부재(grep 0). 산출물 서명·구성명세·라이선스 통과를 릴리스 패키지 필수 필드로 **순신설**하고, 서명·SBOM·스캔 결과·라이선스 판정을 한 레코드로 봉인하여 append-only 감사에 앵커링.
- **패키지 봉인 원자성**: 6개 요소(Integrity·Signature·Image·SBOM·Vuln·License) 중 하나라도 미충족이면 "부분 패키지" 발급 금지.

## 4. KEEP_SEPARATE
- **deploy.ps1 / deploy.yml 빌드 로직**(`deploy.ps1:14-34`·`deploy.yml:77-159`) — 빌드·업로드 실행 메커니즘. Release Package 거버넌스는 이를 **관측·게이트**할 뿐, 빌드 스크립트를 재작성·흡수 금지(운영 크리티컬 스크립트 보존 매트릭스 준수).
- **security-scan CI 잡**(`security-scan.yml:*`) — 기존 스캔 실행부. 릴리스 게이트의 evidence 소스로 참조하되 스캔 로직 중복 구현 금지.

## 5. 판정
**PARTIAL.** Build Integrity·Vulnerability Scan 표면은 존재(`deploy.ps1:14-34`·`deploy.yml:77-159`·`security-scan.yml:90-123`·`security-scan.yml:126-144`·`security-scan.yml:147-177`)하나 이는 흩어진 빌드/스캔 실행부일 뿐, **Artifact Signature·SBOM·License 게이트와 이들을 봉인하는 Release Package 엔티티는 grep 0 — 순신설**. 신설 거버넌스는 기존 빌드·스캔을 재사용·게이트하고 서명/SBOM/라이선스를 순신설 결합. 코드 변경 0 · NOT_CERTIFIED.
