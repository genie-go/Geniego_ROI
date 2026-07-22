# GeniegoROI Change Control & Governance

> 코드 및 스키마 변경 시 적용되는 통제 지침 및 절차이다.

## 1. 변경 통제 원칙
- 모든 소스 코드 및 아키텍처 변경은 명시적인 변경 목적과 영향을 사전 검토 후 수행한다.
- Breaking Change가 불가피한 경우 사전 문서화(영향 범위, 마이그레이션 방안, 롤백 절차)를 수립한다.

## 2. 데이터베이스 스키마 변경 통제
- DB 스키마 변경 시 직접 수동 수정 금지.
- Migration 파일 또는 자가 치유(`ensureTables`) 스크립트를 통한 멱등성(Idempotency) 보장.

## 3. API & Event 계약 변경 통제
- API URL 및 이벤트 페이로드의 하위 호환성을 유지한다.
- 필드 제거 시 Deprecation 기간을 두고 릴리스한다.
