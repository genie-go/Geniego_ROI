# V251 Multi-channel Execution Playbook (범용성 강화)

## Goal
- 계정 구조/채널 특성 때문에 "예산 자동 실행"이 실패하는 문제를 최소화.
- 실행 전에 **자동으로 실행 플랜(Execution Plan)** 을 생성하고, 위험/제약을 명확히 보여줌.

## What’s new
- `/v251/execution/plan/budget` : 구조 자동 탐지 + 안전 실행 플랜 생성
- Plan은 실행 단계(steps)와 안전장치(safety)를 포함

## Recommended rollout
1) Plan 생성 (always)
2) DRY_RUN 실행 2주
3) 승인 기반 실행 (AUTO_EXECUTE=true, DRY_RUN=false)
4) 채널별 예산 단위/정책을 테넌트 정책으로 고정

## Meta 실전 팁
- 대부분 계정은 AdSet 예산이 기준 -> target_level=adset 권장
- CBO 계정은 campaign 예산 가능 -> account_context.cbo=true로 plan이 campaign으로 감지
