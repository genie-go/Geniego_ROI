# DSAR — Deployment Readiness Validator (Part 3-25 §9)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_25_FINAL_INTEGRATION_OPERATIONAL_READINESS_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_OPERATIONAL_READINESS_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_OPSREADY_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_OPSREADY_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §9)
Deployment Readiness Validator는 릴리스 후보 아티팩트가 운영 배포에 적격한지 **배포 직전(pre-deploy gate)** 판정하는 설계 계약이다. 6개 검증 축을 정의한다: **Build Integrity**(빌드 재현성·산출물 무결성), **Artifact Signature**(서명·출처증명 provenance), **Container Image**(이미지 스캔·베이스 이미지 신뢰), **SBOM**(Software Bill of Materials 생성·보관), **Vulnerability Scan**(CVE 게이팅), **License Compliance**(라이선스 정책 위반 차단). 각 축은 PASS/WARN/FAIL 판정과 게이팅 정책(FAIL=배포 차단, WARN=승인 필요)을 산출하며, 결과는 Release Governance(§10)의 릴리스 후보 승격 입력이 된다.

## 2. Substrate 매핑
| SPEC 요소 | 현행 substrate | 상태 | 근거 |
|---|---|---|---|
| Build 산출 | 프론트 빌드 오케스트레이션(i18n autofill×4→vite build) | PARTIAL | `deploy.ps1:14-34` |
| Build 후 아티팩트 확인 | 빌드 완료 후 후처리 | PARTIAL | `deploy.ps1:38` |
| CI 빌드/배포 | CI가 npm install→build→원격 배포 수행 | PARTIAL | `deploy.yml:77-159` |
| Vulnerability Scan | CI 취약점 스캔 스텝 | PARTIAL(report-only) | `security-scan.yml:90-123` |
| Scan 게이팅 정책 | 스캔 결과 처리 스텝 | PARTIAL(비차단) | `security-scan.yml:126-144` |
| Scan 산출/업로드 | 스캔 리포트 산출 | PARTIAL | `security-scan.yml:147-177` |
| Build Integrity 검증기 | — | ABSENT(grep 0) | 순신설 |
| Artifact Signature/Provenance | — | ABSENT(grep 0) | 순신설 |
| SBOM 생성·보관 | — | ABSENT(grep 0) | 순신설 |
| License Compliance 게이트 | — | ABSENT(grep 0) | 순신설 |

## 3. 설계 계약
- **Build Integrity**: 현행 빌드 파이프라인(`deploy.ps1:14-34`, `deploy.yml:77-159`)은 산출물을 생성하되 **재현성 해시·무결성 서명을 남기지 않는다**. 검증기는 빌드 산출 아티팩트의 결정적 해시를 계산·기록하고, 동일 커밋 재빌드 시 해시 일치를 요구하는 게이트를 순신설한다(코드 0).
- **Vulnerability Scan 게이팅**: CI 스캔(`security-scan.yml:90-123`)은 **report-only**이며 결과 처리 스텝(`security-scan.yml:126-144`)·산출(`:147-177`)이 배포를 **차단하지 않는다**. Deployment Readiness는 Critical/High CVE에 대한 FAIL=차단 게이트를 계약으로 정의하되, 실제 차단 배선은 순신설 대상이다.
- **Artifact Signature/SBOM/License**: 현행 substrate에 서명·SBOM·라이선스 게이트가 **전무(grep 0)**하다. 세 축 모두 순신설 설계 명세로만 존재하며 코드 변경 0.

## 4. KEEP_SEPARATE
- CI 스캔의 report-only 산출(`security-scan.yml:90-123`·`:126-144`·`:147-177`)은 **관측(observability)** 계층이지 배포 게이트가 아니다. Deployment Readiness의 차단 게이트와 동일시 금지.
- 프론트 빌드 오케스트레이션(`deploy.ps1:14-34`·`:38`)은 **빌드 실행**이지 Build Integrity 검증이 아니다.

## 5. 판정
**PARTIAL**. 빌드 실행(`deploy.ps1:14-34`·`:38`·`deploy.yml:77-159`)과 report-only CI 취약점 스캔(`security-scan.yml:90-123`·`:126-144`·`:147-177`)은 substrate로 존재하나, Build Integrity·Artifact Signature·SBOM·License Compliance 및 스캔 결과 배포 게이팅은 **순신설(grep 0)**이다. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(§9 검증기 신설 선행).
