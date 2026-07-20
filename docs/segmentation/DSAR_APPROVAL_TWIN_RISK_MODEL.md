# DSAR — Authorization Digital Twin Risk Model (Part 3-22 §12)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_22_DIGITAL_TWIN_PREDICTIVE_GOVERNANCE_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_DIGITAL_TWIN_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_TWIN_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_TWIN_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §12 — Risk Prediction)

Authorization Digital Twin의 **위험 모델(Risk Model)**은 인가 상태공간(authorization state space)에서 발생 가능한 보안 위험을 트윈 위에서 사전 예측하여, 실 부여·집행 이전에 위험도를 점수화하는 예측 계층이다. §14 행동 baseline·§15 장애 신호를 입력으로 받아 **authz 고유 위험**을 판정한다. 본 §12는 6개 위험 유형을 계약한다:

- **Privilege Escalation** — 권한 상승 시도·비정상 role 획득 경로·부여 상한 우회 위험.
- **SoD 위반(Separation of Duties)** — 상충 권한 동시 보유·정족수 우회·자가승인 위험.
- **Insider Threat** — 정상 권한 범위 내 이상 접근 패턴·오프타임 대량 접근 위험.
- **Misconfiguration** — 정책 오설정·과대부여·고아 권한·와일드카드 남용 위험.
- **Federation Failure Risk** — 외부 IdP 신뢰 손상·클레임 위조·페더레이션 경계 위반 위험.
- **Compliance Risk** — 규제 통제 위반으로 이어질 인가 상태 위험(§13 상세 연계).

## 2. Substrate 매핑 (관측 소스 → Risk 예측 축)

| Risk 유형 | 실 관측 소스(현행) | file:line | 상태 |
|---|---|---|---|
| Privilege Escalation 이벤트원 | 인가 감사 이벤트 로그 | `UserAuth.php:4165`·`:4217-4220` | 이벤트 실재·위험점수 ABSENT |
| SoD / Insider 판정 지점 | 인가 판정 경로 | `UserAuth.php:1167` | 판정 실재·SoD 예측 ABSENT |
| Misconfiguration evidence | append-only 해시체인 | `SecurityAudit.php:27`·`:71` | evidence 실재·오설정 예측 ABSENT |
| Compliance Risk 연계 baseline | Compliance readiness | `Compliance.php:133-151` | readiness 실재·위험예측 ABSENT |
| 위험 스냅샷 무결성 검증 | 감사 evidence 검증 | `SecurityAudit.php:118-153` | 검증 실재·위험모델 ABSENT |

**authz risk prediction 자체는 grep 0 — 완전 부재(ABSENT-greenfield)**. 인가 위험 점수화·SoD 상충 탐지·escalation 경로 예측은 순신설이다.

## 3. 설계 계약 (Risk Model 신설 명세)

- **RM-1 authz 전용 위험**: 위험 모델은 인가 이벤트(`UserAuth.php:4165`)와 판정 지점(`UserAuth.php:1167`)만 소비. 마케팅/커머스 위험 신호 흡수 금지(§4 참조).
- **RM-2 점수 근거 표기**: 모든 위험 점수는 근거(관측 이벤트·정책 규칙·기여 요인)와 신뢰도를 명시(Explainable). 근거 없는 위험 결론 금지.
- **RM-3 fail-closed 부여게이트**: 예측 위험이 임계 초과 시 자동 권한 부여를 임의 집행하지 않고 승인 큐로 회부(승인정책 존중, 자동집행 금지).
- **RM-4 evidence 앵커**: 위험 스냅샷은 `SecurityAudit.php:27` 해시체인에 앵커링, 검증은 `SecurityAudit.php:118-153`을 정본으로.
- **RM-5 미검증 제외**: 신뢰도 미달 위험 예측은 자동 차단/자동 알림에서 제외(WARNING/BLOCKED). 테넌트 격리 절대.

## 4. KEEP_SEPARATE (★엄격 혼입 금지 경계)

본 authz Risk Model은 기존 **마케팅·상품 ML risk**와 **명백히 다른 도메인**이며 재사용·통합 절대 금지:

- **ML risk 예측 엔진**(`Risk.php:31`) — churn/fraud 등 고객·거래 리스크 점수화로 **마케팅·CRM 도메인**. authz 권한 위험과 무관.
- **Amazon 리스팅 정책 리스크**(`Risk.php:34-35`) — 상품 리스팅 규정 위반 리스크로 **커머스 도메인**. 인가 위험 아님.
- **risk_prediction 테이블**(`Db.php:458`) — 위 ML risk의 저장소로 authz 위험 스토어 아님. Twin 위험 스냅샷은 별도 앵커(SecurityAudit) 사용.
- 기타 churn/fraud 예측(`Risk.php:27`·`:91`·`:124`·`:128`·`:197`) — 전부 마케팅·거래 도메인.

이들을 authz risk substrate로 흡수하면 도메인 오염 + 중복 엔진 난립 — Risk Model은 인가 상태공간만 다룬다.

## 5. 판정

**ABSENT (greenfield · authz risk prediction grep 0)**. 인가 이벤트(`UserAuth.php:4165`·`:4217-4220`)·판정 지점(`UserAuth.php:1167`)·Compliance baseline(`Compliance.php:133-151`)·evidence(`SecurityAudit.php:27`·`:118-153`)는 실재하나 authz 위험 점수화기는 순신설. 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE. ★KEEP_SEPARATE: 마케팅 ML risk(`Risk.php:31`·`:34-35`·`Db.php:458`)는 authz 위험이 아님 — 참조 경계로 엄격 고정.
