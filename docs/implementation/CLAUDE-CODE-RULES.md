# GeniegoROI Claude Code Rules of Engagement

> Claude Code 에이전트가 작업 수행 시 반드시 준수해야 하는 행동 규칙이다.

## 1. 분석 우선 (Analyze First)
- 코드를 작성하거나 수정하기 전에 파일 전체 구조, 기존 패턴 및 의존성을 분석한다.

## 2. 최소 파괴적 변경 (Minimal Disruptive Change)
- 정상 동작하는 코드를 무단 리팩토링하거나 불필요한 대규모 이동을 금지한다.

## 3. 정직한 보고 (Honest Reporting)
- 빌드 실패, 테스트 실패, 미검증 항목을 "성공"으로 위장하지 않고 있는 그대로 보고한다.

## 4. 백업 및 롤백 (Backup & Rollback)
- 대규모 변경이나 파괴적 수정 전에는 사전 백업 파일(`*.bak_*`)을 작성하거나 롤백 구조를 확보한다.
