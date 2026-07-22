# GeniegoROI Implementation Principles

> 본 문서는 GeniegoROI 개발 구현에 적용되는 최상위 공통 구현 원칙을 정의한다.

## 1. Golden Rule (Extend, Don't Replace)
- 기존에 정상 동작 중인 기능, API, DB 스키마, 테스트는 함부로 삭제하거나 파괴적인 덮어쓰기를 하지 않고 확장(Extend)을 원칙으로 한다.

## 2. Raw First (현태 실측 원칙)
- 기획서나 설계 문서의 표기와 실제 코드의 상태가 다를 수 있으므로, 반드시 작업 전 raw 코드 실측을 통해 현재 상태를 재판정한다.

## 3. Trust First (데이터 신뢰 최우선)
- `docs/DATA_INTELLIGENCE_CONSTITUTION.md`에 따라 검증되지 않은 데이터, 노이즈, 가짜 데이터는 자동화 및 AI 엔진 투입을 차단한다.

## 4. Fail-Closed & Safety Safeguards
- 결제, 인가, 멀티테넌트 격리 등 핵심 도메인에서는 오류 시 동작을 차단(Fail-Closed)하고 안전 상태를 유지한다.

## 5. Secret-Free Source Code
- 소스 코드 및 버전 관리 대상 문서 내에는 비밀번호, API 키, 개인 키 등의 실제 시크릿을 절대로 직접 하드코딩하지 않는다.
