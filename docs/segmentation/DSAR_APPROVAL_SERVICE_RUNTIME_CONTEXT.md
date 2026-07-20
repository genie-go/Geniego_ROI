# DSAR — Approval Service Runtime Context (EPIC 06-A-03-02-03-04 Part 3-6 · per-entity: Runtime Context)

- **상태**: 설계 명세 · 코드 0 · NOT_CERTIFIED · 289차 후속 (2026-07-20)
- **상위 ADR**: [`ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE`](../architecture/ADR_DSAR_SERVICE_SYSTEM_ROLE_GOVERNANCE.md)
- **전수조사(ⓑ · GROUND_TRUTH)**: [`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`](DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION.md) · [`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`](DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT.md)
- **BLOCKED_PREREQUISITE**: RP-002 — 선행 Permission Engine(Part 2)·Role Registry/Hierarchy/Assignment/Scoped/Dynamic(Part 3-1~3-5)·Decision Core 실 구현 부재
- **불변**: K8s/컨테이너 오케스트레이션 개념을 임의 대입 금지(부재를 근사치로 은폐 금지) · Golden Rule(근접 substrate 조립·중복 엔진 신설 금지) · 반날조(substrate file:line은 상위 ADR·ground-truth 2문서만·없으면 ABSENT — 근접 substrate가 ground-truth에 인용되지 않으면 조사 자체를 하지 않고 그대로 ABSENT로 등재)

## 1. 목적

Runtime Context는 스펙 §9가 정의하는, 비인간 주체가 실행되는 물리/논리적 배치 환경(Environment·Namespace·Cluster·Node·Container·Pod·Pipeline·Application)이다. 상위 ADR·ground-truth 2편(`DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`·`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT`)은 이 8개 차원 중 어느 것도 grep으로 인용하지 않았다 — GeniegoROI 백엔드는 컨테이너 오케스트레이션(Kubernetes/Docker) 위에서 동작한다는 전제 자체가 ground-truth 조사 범위에서 확인되지 않았다. 본 엔티티는 "Part 3-5 Runtime Context(사용자 세션 컨텍스트)"와 "Part 3-6 Runtime Context(비인간 실행 환경 컨텍스트)"가 스펙상 동명이의(§5 vs §9)이며 서로 다른 차원 집합임을 정직 구분한다.

## 2. Canonical 필드

| 필드 | 의미 |
|---|---|
| `service_runtime_context_id` | Runtime Context 스냅샷 식별자(PK, 순신규) |
| `runtime_dimension` | §9 열거(Environment/Namespace/Cluster/Node/Container/Pod/Pipeline/Application) |
| `captured_value` | 캡처된 값(현행 캡처 메커니즘 자체 ground-truth 미인용) |
| `captured_at` | 캡처 시각 |

## 3. 열거형 / 타입

- **`runtime_dimension`**(스펙 §9 verbatim, 8종): `Environment` · `Namespace` · `Cluster` · `Node` · `Container` · `Pod` · `Pipeline` · `Application`.

## 4. 실 substrate 매핑 (ABSENT · ground-truth 2편 미인용)

| 차원(스펙 §9) | 판정 | 근거 |
|---|---|---|
| Environment · Namespace · Cluster · Node · Container · Pod · Pipeline · Application (8종 전체) | **ABSENT** | 상위 ADR·ground-truth `DSAR_APPROVAL_SERVICE_EXISTING_IMPLEMENTATION`·`DSAR_APPROVAL_SERVICE_DUPLICATE_AUDIT` 어디에도 이 8개 차원 중 하나라도 file:line으로 인용된 바 없음(반날조 원칙상 스스로 grep하지 않고 그대로 ABSENT 등재) |

★ground-truth 총평(§0)은 "비인간 identity substrate 일부 실재(PARTIAL) — api_key가 유일한 실 내부 비인간 identity"라고만 확정하며, 그 api_key/Crypto/cron 서술 어디에도 Kubernetes·컨테이너·클러스터·네임스페이스·파이프라인 실행 환경에 대한 언급이 없다. 즉 "8개 차원이 실재하지 않는다"는 사실을 ground-truth가 적극 증명한 것이 아니라, **ground-truth 조사 자체가 이 차원들을 다루지 않았다**는 것이 정확한 상태다 — 이는 여전히 "설계 명세 단계에서 ABSENT로 등재"에 해당하나, "장래 재조사 시 발견될 가능성"을 배제하지 않는다는 점에서 §6 Gap-2와 함께 정직 표기한다.

## 5. 설계 원칙

1. **8개 차원 전부를 순신규으로 명시** — 임의로 "가장 가까운 기존 코드"를 근사 매핑하지 않는다. 근접 substrate가 ground-truth에 없으면 조사하지 않고 ABSENT 그대로 두는 것이 반날조 원칙(코드 0·설계 명세 단계이므로 스스로 grep해 근사치를 만들어내는 행위 자체가 금지).
2. **Part 3-5 Runtime Context(사용자 세션·`user_session`/`recordSessionMeta`/`listSessions`)와 본 엔티티를 혼동 금지** — 전자는 사람(Human) 세션의 Current Session/IP/User/Organization이고, 후자(§9)는 비인간 주체의 배치 환경(Environment/Namespace/Cluster/...)으로 스펙상 완전히 다른 차원 집합.
3. **Service Identity Registry(D-1) 확정 이후 Runtime Context Adapter를 별도 계층으로 신설** — 어떤 배치 인프라(전통 서버/컨테이너/서버리스 등)를 실제로 쓰는지는 ground-truth 재조사 대상.

## 6. Gap / BLOCKED_PREREQUISITE

- **BLOCKED_PREREQUISITE (RP-002)**: Runtime Context가 Service Role/Trust Level 결정 로직의 입력으로 배선되는 지점은 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실 구현 이후. 본 차수 코드 0.
- **Gap-1(전 차원 미인용)**: 8개 차원 전부 ground-truth grep 0 — 순신규 설계.
- **Gap-2(조사 공백 — 인프라 실체 미확인)**: GeniegoROI 백엔드가 실제로 어떤 런타임 인프라(전통 PHP-FPM 서버/컨테이너/K8s/서버리스) 위에서 동작하는지 이번 Part 3-6 ground-truth 2편은 조사하지 않았다. 향후 인프라 배포 구성(`docs/DEPLOY_*.md` 등)을 대상으로 한 별도 전수조사가 필요하며, 본 문서는 그 결과를 임의로 선취하지 않는다.
- **정직 부재**: "인프라를 안 쓴다"와 "인프라를 조사하지 않았다"를 혼동 금지 — 본 문서는 후자만 확정한다. 289차 재플래그 금지.
- **판정**: NOT_CERTIFIED · 실 엔진 = 선행 Permission Engine·Role Registry/Hierarchy/Assignment/Scoped/Dynamic·Decision Core 실 구현 + 별도 승인세션(RP-002).
