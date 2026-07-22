# docs/ — 문서 인덱스

루트 직속 문서 134개 + 하위 디렉터리 25개. 아래는 **어디부터 읽어야 하는지**의 안내다.

---

## 1. 최상위 정본 (다른 문서와 충돌 시 이쪽이 우선)

| 문서 | 역할 |
|------|------|
| [CONSTITUTION.md](CONSTITUTION.md) | 개발 헌법 — 사명·Golden Rule(Replace 아닌 Extend)·절대금지·완료의 정의 |
| [CHANGE_GATE.md](CHANGE_GATE.md) | 변경 착수 전 통과해야 하는 게이트 (수정 전 필수 절차의 정본) |
| [registry/](registry/README.md) | 기능·엔티티 레지스트리 — 중복 신설 방지의 기준 |
| [DATA_INTELLIGENCE_CONSTITUTION.md](DATA_INTELLIGENCE_CONSTITUTION.md) | 데이터 헌법 Vol.1 — 수집≠사용(Trust First)·테넌트 격리 |
| [DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md](DATA_SOURCE_ARCHITECTURE_CONSTITUTION.md) | Vol.2 — 데이터소스 12분류·커넥터 표준 |
| [DATA_TRUST_QUALITY_CONSTITUTION.md](DATA_TRUST_QUALITY_CONSTITUTION.md) | Vol.3 — Quality/Trust/Confidence Score·Intelligence Readiness |
| [UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md](UNIFIED_INTELLIGENCE_LAYER_CONSTITUTION.md) | Vol.4 — Unified Entity Model·Explainable AI·엔진 단일화 |
| [MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md](MARKETING_INTELLIGENCE_AUTOMATION_CONSTITUTION.md) | Vol.5 — 목표중심 추천·안전한 자동화·Safety Rule |

데이터 영역을 건드릴 때는 Vol.1~5 가 코드보다 우선한다. 구현 정본은 [data/DATA_ARCHITECTURE.md](data/DATA_ARCHITECTURE.md).

---

## 2. 자주 쓰는 진입점

| 목적 | 문서 |
|------|------|
| 현재 우선순위·스프린트 | `PM_CURRENT_STATUS.md` · `PM_PRIORITY_PLAN.md` |
| 버그 추적 | `BUGS_TRACKING.md` |
| 구현 완료 이력 | `IMPLEMENTATION_STATUS.md` (감사 착수 전 필독) |
| 경쟁 점수 이력 | `COMPETITIVE_SCORE_HISTORY.md` (283차에 기준 변경 — 구기준 직접 비교 금지) |
| 배포 가이드 | `DEPLOY_*.md` (AWS / Azure / Docker) |
| 버전별 기능 명세 | `V{NNN}_*.md` |

---

## 3. 하위 디렉터리 (25개)

| 디렉터리 | 내용 |
|----------|------|
| `architecture/` | **ADR 221개** (`ADR_*.md`) — 아키텍처 결정 기록 |
| `ccis/` | CCIS 구현 명세 (Part001~) |
| `implementation/` | 구현 원칙·DoD·변경통제·품질게이트·진행상태 |
| `development/` | 환경 구축(SETUP)·에디터 규약(IDE)·문제 해결(TROUBLESHOOTING) |
| `repository/` | 저장소 구조·모듈 소유권·브랜치 전략·기여 가이드·생성코드 정책·의존성 경계 |
| `registry/` | 기능/엔티티 레지스트리 |
| `data/` | 데이터 아키텍처 구현 정본 |
| `security/` | 보안 문서 |
| `approval/` | 승인 체인 |
| `entities/` · `metadata/` · `spec/` | 엔티티·메타데이터·명세 |
| `kg/` · `knowledge-graph/` · `semantic/` · `semantic-layer/` | 지식그래프·시맨틱 레이어 |
| `ai-memory/` | AI 메모리 |
| `segmentation/` · `customer-profile/` | 세그먼트·고객 프로파일 |
| `integrations/` | 외부 연동 |
| `onboarding/` | 온보딩 |
| `pm/` | PM 산출물 |
| `cc-tools/` | 진단 도구 |
| `archive/` · `legacy_versions/` · `V383_merge_conflicts/` | 보존용 이력 |

---

## 4. 문서 작성 규칙

- 한국어가 기본 작업 언어다.
- **중복 문서를 새로 만들지 않는다.** 같은 주제가 이미 있으면 그 문서를 확장한다.
- 실측 없이 단정하지 않는다. 수치·경로·명령은 확인 후 적고, 확인 시점을 남긴다.
- 산출 불가한 값은 0 이나 임의값이 아니라 **null + 사유**로 적는다(0 은 정상으로 오독된다).

---

*파일 위치 규칙은 [repository/REPOSITORY-STRUCTURE.md](repository/REPOSITORY-STRUCTURE.md) §4 참조*
