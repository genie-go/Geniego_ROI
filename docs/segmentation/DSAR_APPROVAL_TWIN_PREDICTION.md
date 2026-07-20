# DSAR — Authorization Digital Twin: Policy Impact Predictor (Part 3-22 §11)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §11 — Policy Impact Predictor)

Policy Impact Predictor는 제안된 authz 정책 변경(신규/수정/폐기)에 대해 **적용 이전(pre-flight)** 파급을 예측한다. 예측 5축:

- **승인 성공률(Approval Success Rate)** — 변경 후 승인 결정 비율 예상 변화
- **거부율(Denial Rate)** — 차단되는 요청 비율 및 신규 차단 대상 식별
- **사용자 영향(User Impact)** — 접근 상실/획득 주체 수·역할 분포
- **서비스 영향(Service Impact)** — 비인간 identity(서비스 계정)·자동화 파이프라인 파급
- **규정준수 영향(Compliance Impact)** — 규제 요건 위반/충족 상태 전이

각 예측은 신뢰구간과 함께 산출되며, 정책 롤아웃 전 governance 승인 게이트의 근거 자료가 된다.

## 2. Substrate 매핑

| Predictor 요소 | 현행 substrate | 인용 | 상태 |
|---|---|---|---|
| policy impact prediction | 없음 (greenfield) | — | ABSENT |
| authz 결정 이력(예측 학습 소스) | SecurityAudit 해시체인 | `SecurityAudit.php:27` | 인접(read-only 소스) |
| 역할·권한 baseline | UserAuth 역할 해석 | `UserAuth.php:1167` | 인접(현행값 소스) |
| 예측 결과 저장 | Db PDO | `Db.php:458` | 인접(신설 테이블 대상) |

★ policy impact prediction은 grep 0 — 순신설.

## 3. 설계 계약

1. **Pre-flight 전용**: 예측은 정책 적용 이전에만 실행. 운영 authz 결정 경로에 개입 0.
2. **근거 기반(Evidence-based)**: 예측 입력은 append-only 감사 이력(`SecurityAudit.php:27`)의 과거 결정 분포. 임의 숫자·목데이터 금지.
3. **신뢰도 표기(Explainable)**: 모든 예측 축은 신뢰구간·근거 결정 표본 수를 동반. 근거 없는 단정 금지.
4. **비파괴(No-mutation)**: 예측 실행이 정책·역할·권한 상태를 변경하지 않음을 사후 assert.

## 4. KEEP_SEPARATE

- **ML Risk 예측** `Risk.php:31` (`risk_prediction`) — churn/fraud 및 `Risk.php:34-35` Amazon 리스팅 정책 리스크. 커머스·마케팅 ML 도메인. **authz policy impact 아님**.
- **Decisioning 엔진** `Decisioning.php:307` — 마케팅 의사결정 자동화. authz 예측 아님.

Risk의 "정책"은 Amazon 리스팅 컴플라이언스이지 authz policy가 아니므로 명명 충돌만 존재 — 흡수·재사용 금지.

## 5. 판정

**ABSENT — greenfield 순신설.** authz policy impact prediction grep 0. Risk.php/Decisioning.php는 커머스/마케팅 ML로 KEEP_SEPARATE. 감사 이력·역할 해석은 read-only 학습 소스로만 인접 참조. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE(선행 결정이력 정규화·트윈 상태 계약 부재).
