# DSAR — APPROVAL_CONTROL_PLANE (Part 3-16 §3)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 정의 (SPEC 근거)

APPROVAL_CONTROL_PLANE = 정책의 **저작·검증·버전관리·배포**를 담당하는 stateless 상위 평면(SPEC §3). 런타임 결정(Data Plane §4)과 분리되며, 자신은 결정 경로에 위치하지 않는다. 계약 구성요소:

- **Policy Lifecycle**: 정책 초안 → 검증 → 승인 → 게시(published)의 상태 기계.
- **Policy Distribution**: 게시된 정책 스냅샷을 다중 Data Plane 노드/리전에 전파.
- **Policy Version**: 불변 버전 식별자·해시 서명·이전 버전 롤백.
- **AI Recommendation Distribution**: AI 권고 정책(추천)의 신뢰검증 통과분만 배포 큐로 승격.
- **Compliance Sync**: 규제/승인정책 변경을 전 노드에 동기화하고 감사 원장에 기록.

Control Plane은 stateless — 상태는 정책 저장소·버전 원장에만 존재한다.

## 2. 실존 substrate 매핑 (PRESENT / PARTIAL / ABSENT)

| Control Plane 요소 | 상태 | 허용목록 근거 |
|---|---|---|
| Policy Lifecycle 상태기계 | **ABSENT (grep 0)** | — (현 정책 판정은 in-process 인라인 `index.php:69-622`) |
| Policy Distribution (다노드 전파) | **ABSENT (grep 0)** | — |
| Policy Version (불변버전·서명·롤백) | **ABSENT (grep 0)** | — (감사 해시체인은 결정용 아님 `backend/src/SecurityAudit.php:4-33`) |
| AI Recommendation Distribution | **ABSENT (grep 0)** | — |
| Compliance Sync | **ABSENT (grep 0)** | — |
| proto 미러(product-config sibling) | **PARTIAL(proto만)** | `backend/src/Handlers/AdminPlans.php:53-72` |
| — 미러 대상 예시(플랜/가격 config) | 참조 | `backend/src/Handlers/AdminPlans.php:64-70`, `:157`, `:180` |

★ 현 authz 정책 저작·집행은 Control/Data Plane 미분리로 in-process(`index.php:69-622`)에 인라인 — Control Plane은 **순신설**.

## 3. 설계 계약 (규칙)

1. **Stateless 원칙**: Control Plane은 요청별 결정에 참여하지 않는다. Data Plane(§4)의 결정 지연·가용성은 Control Plane 장애와 독립이어야 한다(정책은 최근 게시 스냅샷으로 계속 결정).
2. **버전 불변·서명**: 게시 정책은 불변 버전ID+해시 서명을 가진다. 서명 개념은 append-only 감사 원장(`SecurityAudit.php:4-33`, verify `:35-40`)을 **참조 모델**로 삼되 결정 경로와는 분리한다(원장은 사후 검증용).
3. **proto → 파이프라인 승격**: sibling 미러(`AdminPlans.php:53-72`)는 config 복제 원형일 뿐 버전/카나리/롤백이 없다. Control Plane은 이 proto를 대체가 아니라 **일반화**하여 정책 배포 파이프라인(버전·카나리·롤백)을 신설한다.
4. **AI 배포 게이트**: AI 권고 정책은 데이터 신뢰검증(READY) 통과분만 배포 큐 진입. 근거 없는 정책 자동 게시 금지.
5. **테넌트 격리 보존**: 배포된 정책은 멀티테넌트 경계(`index.php:614-619`)를 넘어 적용되지 않는다.

## 4. KEEP_SEPARATE

- `AdminPlans`의 플랜/가격 config 미러(`AdminPlans.php:53-72`)는 **product-config** 도메인 — 정책 배포의 proto로 참조하되, 인가 정책 저장소로 흡수하지 않는다(도메인 혼입 금지).
- `ChannelSync.php:12-25` 채널 동기화는 Control Plane 배포와 무관 — KEEP_SEPARATE.

## 5. 판정

- **NOT_CERTIFIED · BLOCKED_PREREQUISITE**: Policy Lifecycle/Distribution/Version/AI Rec Distribution/Compliance Sync **전부 ABSENT(grep 0)** — 순신설.
- **재활용 근거**: 유일 proto = sibling 미러(`AdminPlans.php:53-72`, PARTIAL·버전/카나리/롤백 없음). 서명 참조 모델 = 감사 원장(`SecurityAudit.php:4-33`·verify `:35-40`, 결정 경로 밖).
- **선행 의존**: Part 3-16 §0~§2 통합 골격(AUTH_FABRIC DSAR) 및 Data Plane(§4) 확정 선행. Control Plane은 stateless 상위 평면으로 현 in-process(`index.php:69-622`)에서 정책 저작·배포 책임을 분리·승격하는 신설 계층이며 코드 배선 0.
