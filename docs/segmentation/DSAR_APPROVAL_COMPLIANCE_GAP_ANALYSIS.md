# DSAR — Approval Compliance Gap Analysis (컴플라이언스 갭 분석) (Part 3-17 §11)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_17_COMPLIANCE_REGULATORY_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_COMPLIANCE_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_COMPLIANCE_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_COMPLIANCE_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC §11)

`APPROVAL_COMPLIANCE_GAP_ANALYSIS`는 요구 통제 대비 실재 통제 사이의 **결손(gap)을 유형별로 열거·정량화**한다. Gap 유형은 5종이다.

- **Missing Control** — 규제가 요구하나 배선되지 않은 인가 통제.
- **Missing Policy** — 통제는 있으나 정책(요건·임계·범위)이 정의되지 않음.
- **Missing Evidence** — 정책은 있으나 이행 증거(로그·스냅샷)가 없음.
- **Missing Review** — 증거는 있으나 주기적 접근검토(Access Review)가 부재.
- **Missing Attestation** — 검토는 있으나 책임자 서명·증언(attestation)이 부재.

각 gap은 (심각도, 영향 스코프, 근거 부재 지점)을 명시하고 §10 점수축과 연동되어야 한다.

## 2. Substrate 매핑

| SPEC 요구 | 현행 substrate | file:line | 상태 |
|---|---|---|---|
| 통제 충족/미충족 카운트 | 3버킷 카운트만 | `Compliance.php:115-120` | 카운트 존재(갭분해 없음) |
| posture 계산 본체 | posture 집계 로직 | `Compliance.php:60-87`·`:93` | 실재 |
| Access Review 근거 | 접근검토 조회/집계 | `AccessReview.php:87-122`·`:177-242` | Review 축 재사용 가능 |
| 통제↔규제 매핑 | control→regulation 매핑 | `Mapping.php:238-291`·`:267-269` | 매핑 substrate 존재 |
| Missing Control/Policy/Evidence 분해 | (없음) | — | ABSENT(grep 0) |
| Attestation 서명 | (없음) | — | ABSENT |

## 3. 설계 계약

- **확장(Extend)**: 현행 3버킷 카운트(`Compliance.php:115-120`)를 폐기하지 않고, "미충족" 버킷을 5개 gap 유형으로 **분해(decompose)**한다 — 신규 집계엔진 신설 금지, posture 쿼리(`:60-87`) 확장.
- **Review/Attestation 축**: `AccessReview.php:177-242`·`:191-194`·`:224-233`의 검토 레코드를 Missing Review 판정 근거로 재사용. Attestation은 검토 레코드에 서명 필드를 확장하는 방향(순신설 최소화).
- **통제↔규제 매핑**: `Mapping.php:238-291`을 gap의 규제 귀속(어느 규제 요건이 미충족인지) 근거로 활용.
- **부재증명 의무**: 각 Missing 항목은 "무엇이 없는지"를 grep/read 부재증명과 함께 기록 — 근거 없는 gap 주장 금지(competitive_gap_verify 원칙).
- **감사**: gap 스냅샷은 `SecurityAudit.php:14-68` 해시체인에 append.

## 4. KEEP_SEPARATE

- `AnomalyDetection.php:4-6`(SPC 관리도 이탈)은 데이터 이상치이며 통제 **gap** 아님.
- `Risk.php:31`·`:81`·`:91`(ML risk 스코어)은 예측 리스크로, 통제 결손 열거와 무관.
- `DataPlatform.php:305`(Trust Score)는 데이터 품질 gap이지 authz 통제 gap 아님.

## 5. 판정

**ABSENT**. gap analysis 분해 로직은 grep 0이며, 현행은 3버킷 카운트(`Compliance.php:115-120`)만 존재한다. 본 §11은 그 카운트를 5개 gap 유형(Control/Policy/Evidence/Review/Attestation)으로 분해·정량화하는 순신설 설계이고, Review/Attestation은 `AccessReview.php` 재사용으로 신설 표면을 최소화한다. 실구현은 후속 승인세션. 코드 변경 0 · NOT_CERTIFIED.
