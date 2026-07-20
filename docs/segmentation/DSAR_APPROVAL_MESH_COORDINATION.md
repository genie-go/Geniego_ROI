# DSAR — Cross-Domain Coordination Engine (Part 3-24 §12)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_24_UNIVERSAL_GOVERNANCE_MESH_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_GOVERNANCE_MESH_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_MESH_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_MESH_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약 (SPEC §12)

Cross-Domain Coordination Engine은 서로 다른 격리 경계(boundary)에 속한 권한 결정을 **하나의 정합된 결정으로 조정**한다. SPEC이 요구하는 5개 조정 축:

- **Cross-Tenant** — 테넌트 경계를 넘는 조정(위임/공유 리소스)에서의 유효 권한 확정.
- **Cross-Region** — 지역별 배치 간 정책 정합(데이터 주권·지연 고려).
- **Cross-Cloud** — 이종 클라우드 배치 간 결정 조정.
- **Cross-Organization** — 조직 경계(파트너/대행사) 간 권한 계약 조정.
- **Cross-Platform** — 플랫폼(제품 라인) 간 권한 도메인 조정.

## 2. Substrate 매핑

| SPEC §12 축 | 현행 substrate | file:line | 판정 |
|---|---|---|---|
| Cross-Tenant coordination | 테넌트 **격리**만 존재(공용 경로도 __shared__ 스코프 강제) | `index.php:98` | ABSENT(조정 부재) |
| Cross-Region | 부재 | — | ABSENT |
| Cross-Cloud | 부재 | — | ABSENT |
| Cross-Organization | 부재(로컬 대행 제외) | — | ABSENT |
| Cross-Platform | 부재 | — | ABSENT |
| (참고) 권한 결정 지점 | 로컬 PDP(단일 프로세스 정책 평가) | `TeamPermissions.php:695-700` | 로컬만 |

현행 아키텍처의 기본 원칙은 **조정이 아니라 격리**다. `index.php:98`은 요청을 테넌트 경계 안에 가두며(공용 스코프도 분리), cross-domain 조정 경로는 grep 0이다. 권한 결정은 `TeamPermissions.php:695-700`의 **로컬 PDP** — 단일 배치·단일 프로세스 내부 정책 평가로, 경계를 넘는 합의(consensus)·조정 프로토콜을 보유하지 않는다.

## 3. 설계 계약 (신설 대상)

1. **Coordination Context** — `{domains[], subject, resource, requested_action, boundary_type}` 정규화 입력.
2. **Domain PDP 페더레이션 호출** — 각 도메인 로컬 PDP(`TeamPermissions.php:695-700` 계열) 결정을 수집.
3. **Decision Combining 규칙** — deny-overrides 기본 + 경계별 권위 서열(SPEC §12 축별).
4. **격리 불변식 보존** — `index.php:98` 테넌트 격리를 침해하지 않는 명시적 공유 계약(explicit grant)만 조정 대상.
5. **감사** — 조정 결정 전체 체인을 append-only 기록(`SecurityAudit.php:27` hook 지점).

## 4. KEEP_SEPARATE

- **테넌트 격리 미들웨어** — `index.php:98`. 조정 엔진이 아니라 격리 불변식의 **소스**다. Coordination Engine은 이를 소비(불변식으로 존중)하되 대체하지 않는다.
- **로컬 PDP** — `TeamPermissions.php:695-700`. 단일 도메인 결정기로, cross-domain 조정 계층과 층위가 다르다 → 흡수 금지, 피조정 노드로만 참조.

## 5. 판정

**ABSENT — greenfield(cross-domain coordination grep 0).** 현행은 조정이 아닌 격리(`index.php:98`)·로컬 PDP(`TeamPermissions.php:695-700`)만 존재. 5개 조정 축(Tenant/Region/Cloud/Organization/Platform) 전부 substrate 없음 → **순신설**. 격리 불변식을 침해하지 않는 명시적 공유 계약 위에서만 조정 가능. 선행 부재로 **BLOCKED_PREREQUISITE**, 코드 변경 0, NOT_CERTIFIED.
