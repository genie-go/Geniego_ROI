# DSAR — Multi-Cloud Support (Part 3-16 §8)

> **거버넌스 상태**: 설계 명세 DSAR · 코드 변경 0 · NOT_CERTIFIED · BLOCKED_PREREQUISITE · 289차 후속(2026-07-20).
> 상위 SPEC: `docs/spec/EPIC_06A_PART3_16_UNIFIED_AUTHORIZATION_FABRIC_SPEC.md`(canonical v1.0) · ADR: `docs/architecture/ADR_DSAR_AUTHZ_FABRIC_GOVERNANCE.md`.
> Ground-Truth: `DSAR_APPROVAL_FABRIC_EXISTING_IMPLEMENTATION.md`(①)·`DSAR_APPROVAL_FABRIC_DUPLICATE_IMPLEMENTATION_AUDIT.md`(②). 본 문서 file:line 인용은 ①②/ADR 등장분만.

## 1. 계약(SPEC)

Multi-Cloud Support(§8)는 Unified Authorization Fabric을 이종 클라우드/온프레미스 provider에 걸쳐 배치·정합하는 provider-abstraction 계약이다. 계약 요소:

- **Provider Abstraction**: AWS/Azure/GCP/Oracle/Private Cloud/On-Premise를 단일 authz 계약으로 추상화.
- **Cross-Cloud Placement**: authz 노드/데이터를 provider 간 배치·이동.
- **Provider-Neutral Identity**: cloud IAM에 종속되지 않는 fabric 내부 identity/정책 표현.
- **Portable Deployment**: 배포 파이프라인이 provider별 차이를 흡수.

## 2. Substrate 매핑 (라이브 실측)

| Fabric 계약 요소 | 라이브 substrate | 상태 |
|---|---|---|
| Provider abstraction | 없음 — 단일 서버 배포 `deploy.ps1`·`deploy.sh` | **ABSENT** |
| AWS/Azure/GCP/Oracle authz plane | 없음 — 라이브는 단일 MySQL/PHP 호스트 `Db.php:120` | **ABSENT** |
| Cross-cloud placement | 없음 — `.github/workflows/deploy.yml` 단일 docroot rsync | **ABSENT** |
| Provider-neutral identity | 없음 — authz in-process `index.php:69-622` | **ABSENT** |
| Cloud IAM 의존 | 없음 — `composer.json:5-13` 클라우드/mesh SDK 의존 전무 | **ABSENT** |
| 데이터 export 목적지(참고) | `DataExport.php:11`·`:26`·`:131-133` 클라우드 목적지 자격증명 = **데이터 export**(authz 아님) | **PARTIAL(비-authz)** |

## 3. 설계 계약 (순신설 — 코드 0)

cloud-provider abstraction layer를 신규 도입한다. fabric은 provider-neutral authz 계약(정책·역할·결정)을 정의하고, provider adapter가 각 클라우드/온프레미스 위에 authz 노드를 배치한다. identity/정책 표현은 cloud IAM에 종속되지 않으며, 배포 파이프라인은 provider별 차이를 흡수하되 fail-secure 결정 계약은 provider 무관하게 동일 유지한다.

## 4. ★KEEP_SEPARATE — 오판 금지

- **DataExport 클라우드 목적지**: `DataExport.php:11`·`:26`·`:131-133`(및 `:154-156`)는 **데이터 export** 대상 클라우드 저장소 자격증명이다. 이는 분석 데이터를 외부로 내보내는 목적지이지 multi-cloud **authorization** plane이 아니다 — Multi-Cloud Support PRESENT 근거로 오용 절대 금지(KEEP_SEPARATE).
- **죽은 terraform/compose**: `infra/aws/terraform/*`(Postgres/ECS·blue-green·autoscaling)·`infra/docker-compose.yml`은 라이브(MySQL/PHP)와 엔진·언어·배포경로 전부 불일치하는 미연결 죽은 스캐폴딩이다 — PRESENT 근거 인용 금지.

## 5. 판정

**ABSENT.** 라이브는 단일 서버 배포(`deploy.ps1`·`deploy.sh`·`.github/workflows/deploy.yml`)의 단일 MySQL/PHP 호스트(`Db.php:120`)이며 provider abstraction·cross-cloud placement가 전무하다(`composer.json:5-13` 무의존). DataExport 클라우드 목적지는 데이터 export이지 authz가 아니고, 죽은 terraform/compose는 라이브 무연결이므로 둘 다 PRESENT 근거 아님. Multi-Cloud substrate는 순신설 대상이며 선행 provider-abstraction plane 부재로 **BLOCKED_PREREQUISITE**. 코드 변경 0 · NOT_CERTIFIED.
