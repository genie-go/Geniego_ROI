# GeniegoROI Quality Gate Standard

> CI/CD 및 파이프라인 상의 품질 게이트 통과 기준이다.

## 1. Quality Gate Phases
1. **Gate 1: Static Code & Syntax Analysis**: 빌드 전 구문/문법 정적 분석 통과
2. **Gate 2: Security & Secret Scan**: 하드코딩 시크릿 탐지 및 보안 가드 검증
3. **Gate 3: Build Verification**: 프론트엔드/백엔드 아티팩트 빌드 성공
4. **Gate 4: Runtime & Health Smoke Test**: 주요 헬스체크 및 API 스모크 테스트 성공

## 2. Pass/Fail Thresholds
- **Critical / High Security Vulnerability**: 0건 (발생 시 즉시 ABORT)
- **Build Failure**: 0건
- **Secret Leakage**: 0건
