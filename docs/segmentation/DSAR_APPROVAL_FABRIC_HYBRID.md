# DSAR — Hybrid Authorization (Part 3-16 §9)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Hybrid Authorization(§9)은 Unified Authorization Fabric을 클라우드·온프레미스·엣지·격리망(air-gapped)이 혼재한 배치 위상에 걸쳐 일관되게 운용하는 계약이다. 계약 요소:

- **Cloud/On-Premise 혼합**: 클라우드 authz 노드와 온프레미스 노드가 단일 fabric으로 공존.
- **Edge Authorization**: 엣지 위치에서 국지적 authz 결정 수행.
- **Air-Gapped 운용**: 네트워크 단절 환경에서 로컬 정책만으로 결정(중앙 미도달 시).
- **Connectivity-Aware 수렴**: 연결 복구 시 로컬 결정/변경을 중앙과 정합.

## 2. Substrate 매핑 (라이브 실측)

| Fabric 계약 요소 | 라이브 substrate | 상태 |
|---|---|---|
| Cloud/On-Premise 혼합 plane | 없음 — 단일 클라우드 호스트 `Db.php:120` | **ABSENT** |
| Edge authorization | 없음 — authz in-process `index.php:69-622` | **ABSENT** |
| Air-Gapped 로컬 결정 | 없음 — 단일 프로세스·격리망 배치 개념 부재 | **ABSENT** |
| Connectivity-aware 수렴 | 없음 — §13 Sync도 ABSENT | **ABSENT** |
| 배포 위상(참고) | `deploy.ps1`·`deploy.sh` 단일 docroot | **ABSENT** |
| DB 폴백(참고·비-hybrid) | `Db.php:116-166` MySQL→SQLite 폴백 = 단일 호스트 내 **로컬 폴백**(엣지/air-gap 아님) | **PARTIAL(비-hybrid)** |

## 3. 설계 계약 (순신설 — 코드 0)

hybrid deployment plane을 신규 도입한다. fabric은 클라우드·온프레미스·엣지 노드를 동일 authz 계약으로 등록하고, 각 노드는 로컬 정책 캐시로 중앙 미도달 시에도 fail-secure 결정을 수행한다. air-gapped 노드는 오프라인 정책 번들로 운용하고 연결 복구 시 §13 Sync로 정합한다. 결정 계약은 배치 위상 무관하게 동일 유지한다.

## 4. ★KEEP_SEPARATE — 오판 금지

- `Db.php:116-166`의 MySQL→SQLite 폴백은 **단일 호스트 내부**의 로컬 저장소 폴백일 뿐 엣지/air-gapped hybrid 배치가 아니다 — Hybrid PRESENT 근거로 오용 금지.
- **죽은 terraform/compose**: `infra/aws/terraform/*`·`infra/docker-compose.yml`은 라이브와 엔진·언어·배포경로 불일치 미연결 죽은 스캐폴딩이다 — PRESENT 근거 인용 금지.

## 5. 판정

**ABSENT.** 라이브 authz는 단일 클라우드 호스트(`Db.php:120`)·단일 in-process(`index.php:69-622`)이며 cloud/on-prem 혼합·edge·air-gapped 운용이 전부 없다. DB 폴백(`Db.php:116-166`)은 호스트 내부 로컬 폴백이지 hybrid 배치가 아니다. Hybrid substrate는 순신설 대상이며 선행 노드 등록·오프라인 정책 번들·Sync plane 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
