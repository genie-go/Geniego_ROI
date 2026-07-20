# DSAR — Authorization Fabric Simulation & Impact Analysis (Part 3-16 §23)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §23)

APPROVAL_FABRIC_SIMULATION은 fabric에 대한 **변경을 실제 적용하기 전에** 그 영향을 예측하는 계약이다. 시뮬 대상 시나리오 4종:

- **Region 시뮬** — 지역 substrate 추가/제거 시 인가 가용성·지연 변화.
- **Cache 시뮬** — 인가 결정 캐시 계층 도입/무효화 시 정합·지연 trade-off.
- **Policy Rollout 시뮬** — 정책 버전 점진 배포(canary/staged) 시 substrate별 도달률·불일치 창.
- **Multi-Cloud Failure 시뮬** — 특정 substrate/region 장애 시 인가 fabric의 degradation.

각 시나리오는 4개 영향 차원을 산출한다: **Availability**(인가 가능률)·**Latency**(결정 지연)·**Compliance**(정책 준수 상태)·**Throughput**(초당 인가 결정 수). 계약의 완료 정의는 (a) 변경 전 fabric 상태를 모델로 캡처, (b) 가정한 변경을 상태 모델에 주입, (c) 4차원 예측 산출, (d) 승인 게이트에 시뮬 결과 첨부.

## 2. Substrate 매핑 (현행 라이브 실측)

| SPEC 시뮬 시나리오 | 현행 라이브 대응 | 시뮬 가능 여부 | 근거 |
|---|---|---|---|
| Region 시뮬 | 단일 리전·단일 프로세스 인가 | **불가** — region substrate 개념 부재 | `backend/public/index.php:69-622`, `backend/src/Db.php:116-166` |
| Cache 시뮬 | 인가 결정 per-request 재계산, 결정 캐시 없음 | **불가** — 캐시 계층 부재 | `backend/public/index.php:423-461`, `:600-606` |
| Policy Rollout 시뮬 | 정책 = 코드 리터럴, 배포 = dist swap/fpm reload | **불가** — 정책 버전 롤아웃 모델 없음 | `backend/public/index.php:99-122`, `deploy.ps1`, `deploy.sh` |
| Multi-Cloud Failure 시뮬 | MySQL 실패 시 SQLite 폴백(가용성 폴백일 뿐 fabric 시뮬 아님) | **불가** | `backend/src/Db.php:116-166`, `:127`, `:120` |
| 영향 4차원 산출 | health/metrics 관측치만 존재(예측 모델 아님) | 관측만, 시뮬 무 | `backend/src/Handlers/Health.php:13-26`, `backend/src/Handlers/SystemMetrics.php:32`, `:60-100`, `:67-76` |

라이브 authz는 변경 전 상태를 캡처하는 모델도, 가정 변경을 주입할 시뮬 엔진도 보유하지 않는다. `Health.php`·`SystemMetrics.php`는 **현재 관측치**를 노출할 뿐 미래 영향 예측이 아니다.

## 3. 설계 계약 (신설 대상 — 순신설)

1. **Fabric State Model** — 인가 fabric의 현재 topology(substrate·정책 버전·게이트 구성)를 실행 가능한 상태 모델로 캡처. 현행 in-process 인가(`index.php:69-622`)는 단일 노드 모델로 seed.
2. **Scenario Injector** — Region/Cache/Rollout/Failure 가정을 상태 모델에 주입하는 파라미터화 계층. 신설.
3. **Impact Estimator** — 주입된 시나리오에 대해 Availability/Latency/Compliance/Throughput 4차원 예측. 관측 baseline은 `Health.php:13-26`·`SystemMetrics.php:60-100` 지표를 입력 신호로 참조(읽기 전용).
4. **Simulation Gate Binding** — 시뮬 결과를 변경 승인 게이트에 첨부. 승인 없는 fabric 변경 차단.

전 구성요소가 현행에 부재하며 순수 신설이다.

## 4. KEEP_SEPARATE

- 마케팅 ML의 시뮬레이션/what-if(예: 예산·ROAS 시뮬)는 별개 도메인이다. `ChannelSync.php:12-25`·`AttributionEngine.php:1754-1791`은 채널/귀속 계산이며 인가 fabric 시뮬이 아니다(KEEP_SEPARATE).
- `Db.php:116-166`의 MySQL→SQLite 폴백은 **런타임 가용성 폴백**이지 fabric failure 시뮬이 아니다. 폴백 로직을 시뮬 엔진으로 오해·재사용 금지.

## 5. 판정

**ABSENT (fabric 시뮬 전무).** 변경 전 fabric 상태 모델·시나리오 주입·4차원 영향 예측 중 어느 것도 라이브에 존재하지 않는다. `Health.php`/`SystemMetrics.php`는 관측치 노출일 뿐 예측 시뮬이 아니다. 본 계약은 코드 변경 0의 순신설 설계 명세이며 BLOCKED_PREREQUISITE(선행 fabric substrate 분리 전제). NOT_CERTIFIED.
