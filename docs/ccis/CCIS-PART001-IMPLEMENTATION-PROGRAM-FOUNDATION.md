# GeniegoROI Claude Code Implementation Specification

# CCIS Part001 — Implementation Program Foundation

Version 1.0

---

# 1. 작업 목적

CCIS Part001은 GeniegoROI Master Enterprise Architecture Part001~065를 실제 실행 가능한 소프트웨어 시스템으로 구현하기 위한 전체 Implementation Program의 기준을 정의한다.

본 문서는 이후 CCIS Part002~070에서 작성되는 Repository, Domain, Database, API, Event, Security, Infrastructure, Deployment 및 Operations 구현 명세의 최상위 기준 문서이다.

Claude Code는 본 문서의 기준을 따라 다음 작업을 수행해야 한다.

* 기존 프로젝트 구조 분석
* 구현 범위 식별
* 기술 스택 검증
* 신규 파일 생성
* 기존 파일 안전 수정
* 데이터베이스 Migration
* API 및 Event 구현
* 테스트 코드 작성
* Build 및 실행 검증
* 구현 결과 보고

본 문서의 목적은 Claude Code가 단순 코드 생성 도구가 아니라, 통제된 Enterprise Implementation Agent로 동작하도록 만드는 것이다.

---

# 2. 구현 범위

본 Part에서 정의하는 범위

* 전체 Implementation Program
* 구현 단계와 순서
* Claude Code 역할과 책임
* 프로젝트 기술 방향
* 공통 구현 원칙
* 변경 통제
* 품질 통제
* 보안 통제
* 테스트 통제
* 완료 판정 기준
* 작업 결과 보고 체계
* Part 간 의존성 관리

---

# 3. 선행 조건

Claude Code는 작업을 시작하기 전에 다음 조건을 확인해야 한다.

## 3.1 프로젝트 접근
* 프로젝트 Root Directory 접근 가능
* Source Code 읽기 가능
* 신규 파일 생성 가능
* 기존 파일 수정 가능
* Git 상태 확인 가능
* Build Tool 실행 가능
* Test 실행 가능
* Docker 실행 가능 여부 확인

## 3.2 실행 전 확인
```text
1. 현재 Branch
2. Git 변경 상태
3. 프로젝트 Root
4. 사용 언어
5. Framework Version
6. Build Tool
7. Database
8. Message Broker
9. Test Framework
10. 실행 중인 서비스
```

---

# 4. 기술 스택 (Reference Stack & Existing Legacy Stack)

기존 프로젝트 기술을 최우선 유지하며 무단 교체하지 않는다.

```text
기존 프로젝트 기술 (React 18 / Vite 7 SPA + PHP Slim 4 API / MySQL + SQLite)
        ↓
승인된 ADR / 헌법 (docs/CONSTITUTION.md, docs/DATA_INTELLIGENCE_CONSTITUTION.md)
        ↓
CCIS Reference Stack (Spring Boot / Next.js / FastAPI / Kafka / Postgres)
        ↓
신규 기술 제안
```

---

# 5. 디렉터리 구조 및 가이드

기준 디렉터리 및 모노레포 매핑 구조 (`frontend/`, `backend/`, `docs/`, `tools/`, `scripts/`).

---

# 6. 생성 및 수립 문서

* `/docs/ccis/CCIS-PART001-IMPLEMENTATION-PROGRAM-FOUNDATION.md`
* `/docs/implementation/IMPLEMENTATION-PRINCIPLES.md`
* `/docs/implementation/DEFINITION-OF-DONE.md`
* `/docs/implementation/CHANGE-CONTROL.md`
* `/docs/implementation/QUALITY-GATE.md`
* `/docs/implementation/CLAUDE-CODE-RULES.md`
* `/docs/implementation/IMPLEMENTATION-STATUS.md`
* `/scripts/validation/check-environment.sh`
* `/scripts/validation/check-project-structure.sh`
* `/scripts/validation/check-git-status.sh`
