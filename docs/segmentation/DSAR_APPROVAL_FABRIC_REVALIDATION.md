# DSAR — Authorization Fabric Revalidation (Part 3-16 §24)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §24)

APPROVAL_FABRIC_REVALIDATION은 fabric topology나 정책 표면이 변경될 때, **기존에 유효(valid)로 확정된 인가 결정/부여를 다시 검증**하여 여전히 유효한지 재확인하는 계약이다. 재검증 trigger 4종:

- **Region 추가** — 신규 지역 substrate 편입 시 기존 부여의 지역 적용 재검증.
- **Policy 변경** — 정책 내용/버전 변경 시 영향받는 기존 결정 재평가.
- **Cluster 변경** — 실행 클러스터 topology 변경 시 인가 경로 재검증.
- **Context 변경** — tenant/role/scope 해석 규칙 변경 시 기존 부여 재해석.

완료 정의는 (a) 변경 이벤트 포착, (b) 영향 부여 집합 식별, (c) 현행 정책으로 재평가, (d) 무효화된 부여 revoke/경보, (e) 재검증 결과 감사 기록.

## 2. Substrate 매핑 (현행 라이브 실측)

| SPEC trigger | 현행 라이브 대응 | 재검증 가능 여부 | 근거 |
|---|---|---|---|
| Region 추가 | 단일 리전 모놀리스 | **불가** — region substrate 없음 | `backend/public/index.php:69-622`, `backend/src/Db.php:116-166` |
| Policy 변경 | 인가 = 코드 리터럴, 정책 변경 = 재배포 | **불가** — 변경 이벤트·영향집합 추적 부재 | `backend/public/index.php:99-122`, `:423-461`, `:583-598` |
| Cluster 변경 | 단일 프로세스, 클러스터 개념 없음 | **불가** | `backend/public/index.php:69-622` |
| Context 변경 | 요청시점 tenant/role 해석은 매 요청 재계산(캐시 부여 없음) | 재검증 대상 "확정 부여" 부재 | `backend/public/index.php:600-606`, `:608-612`, `:614-619` |
| 변경 이벤트 proto | admin 플랜/게이트 sibling 미러 저장 호출부 | proto 참고만 — 재검증 엔진 아님 | `backend/src/Handlers/AdminPlans.php:157`, `:180`, `:209` |

현행 인가는 매 요청 in-process 재계산이라 "이전에 확정되어 캐시된 부여"라는 재검증 대상 자체가 존재하지 않는다. `AdminPlans.php:157`·`:180`·`:209`의 sibling 미러 저장(운영/데모 이중 기록)은 **변경 이벤트가 발생하는 지점의 proto 참고**일 뿐, 재검증 trigger 파이프라인·영향집합 식별·재평가 로직은 부재하다.

## 3. 설계 계약 (신설 대상 — 재검증 엔진 순신설)

1. **Change Event Bus** — Region/Policy/Cluster/Context 변경을 표준 이벤트로 포착. `AdminPlans.php:157`·`:180`·`:209` 미러 저장 지점은 "정책 변경 이벤트가 발생하는 대표 위치"로만 참고(엔진 아님, 재사용 아님).
2. **Impacted Grant Resolver** — 변경 이벤트에 영향받는 기존 부여/결정 집합 식별. 신설(현행 부여 캐시 부재 → substrate 분리 선행 전제).
3. **Revalidation Evaluator** — 영향집합을 현행 정책으로 재평가, PASS/REVOKE 판정. 인가 판정 규칙은 현행 미들웨어(`index.php:423-461`) 의미론을 canonical 참조.
4. **Revalidation Audit Sink** — 재검증 결과·revoke를 append-only 해시체인 감사(`SecurityAudit.php:4-33`, `:35-40`)에 기록. 기존 append 계약 재사용, 이벤트 타입 신규.

## 4. KEEP_SEPARATE

- `AdminPlans.php`의 플랜 미러 저장(`:157`·`:180`·`:209`)은 **운영-데모 parity 이중 기록** 목적이며, 재검증 엔진이 아니다. 이를 재검증 로직으로 오인·확장 금지 — proto 참고 한도.
- 마케팅 ML 재학습/재검증(모델 revalidation)은 별개 도메인(`ChannelSync.php:12-25`·`AttributionEngine.php:1754-1791`, KEEP_SEPARATE).

## 5. 판정

**ABSENT.** 라이브 인가는 매 요청 재계산이라 재검증 대상인 "확정·캐시된 부여"가 없고, 변경 trigger 포착·영향집합 식별·재평가 파이프라인이 전무하다. `AdminPlans.php:157/:180/:209`는 변경 이벤트 발생 지점의 proto 참고일 뿐 재검증 엔진이 아니다. 본 계약은 코드 변경 0의 순신설 설계 명세이며 BLOCKED_PREREQUISITE. NOT_CERTIFIED.
