# GeniegoROI Definition of Done (DoD)

> 모든 CCIS 구현 Part 및 마이크로서비스 기능 구현 완료 시 적용할 품질 판정 기준이다.

## 1. 코드 및 아키텍처 완료 기준
- [ ] 요구사항에 정의된 모든 기능 및 계약(Contract)이 완전히 작성되었음
- [ ] 무단 Refactoring이나 범위 밖의 파괴적 수정이 존재하지 않음
- [ ] Multi-Tenant 데이터 격리 및 권한 가드가 적용되었음

## 2. 정적 및 빌드 검증 기준
- [ ] 정적 구문 오류(Syntax Error) 및 ReferenceError가 없음
- [ ] 프론트엔드 빌드(`npm run build` / `vite build`)가 0 Error로 성공함
- [ ] 백엔드 라우트 및 스키마 자가 치유(Self-healing) 가드가 정상 작동함

## 3. 보안 및 시크릿 기준
- [ ] 소스 코드 내 하드코딩된 Secret 및 API Key가 존재하지 않음
- [ ] SQL Injection, XSS, CSRF, SSRF 방어 코드가 검증됨

## 4. 보고 및 문서화 기준
- [ ] 변경된 파일 및 생성된 자산이 실측 결과 보고서로 정리되었음
- [ ] 회귀 요소나 실패 항목에 대한 정직한 보고가 완료되었음
