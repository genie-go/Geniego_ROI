# RootCauseAnalysis — 근본원인 분석 (3차+ 반복수정 시 필수)

> Repeat-Modification Escalation 3차+ 시 표면패치 금지·근본원인 규명·제거. RepeatedDefectHistory.md 와 연동.

## RCA-265-1: 스키마 드리프트 (259/263/265 재발)
- **증상**: 핸들러 SQL이 존재하지 않는 컬럼 참조 → 매 쿼리 1054 예외 → try/catch 무음실패로 기능 영구사망(php-l 미검출).
- **근본원인**: ①스키마 판정을 덤프파일/메모리/주석에 의존(라이브 미대조) ②동적 INSERT(array_keys)로 정적키 유입 ③마이그레이션 미적용.
- **제거**: 라이브 SHOW COLUMNS를 스키마 판정 유일정본화(CHANGE_GATE·DatabaseRegistry) + 드리프트 전수감사(Handlers 88 + cron 8 raw-SQL, 265차 5수정). 향후 스키마변경은 라이브 대조 필수.

## RCA-265-2: 라우트 Not found (265 DigitalShelf)
- **증상**: $custom에 라우트 추가·$register 누락 → FastRoute 미등록 → 런타임 404 무음.
- **근본원인**: 라우팅이 $custom(정의)+$register(등록) 2단계인데 규약 미인지·기존 검출도구(bin/audit_routes.php)가 $pfx/api 오탐으로 미배선.
- **제거**: 검출기 CI가드 G9(node·$pfx/api 정확처리·CI+pre-commit). 기존 오탐 도구 통합제거.

## RCA-265-3: React 화이트스크린 (261/263/265)
- **증상**: 조건부/early-return 뒤 훅 → hook order 변동 → "Rendered more/fewer hooks" 화이트스크린.
- **근본원인**: 수동감사가 잠복 위반(try/catch 훅 등) 미검출.
- **제거**: rules-of-hooks CI가드 G10(공식 eslint 룰·무오탐).

## 갱신 규칙
반복수정 3차 도달 클래스마다 RCA 섹션 추가. 근본원인은 "표면"이 아닌 "왜 반복되는가"(구조/규약/검증부재)를 규명. 제거는 재발 불가 구조(가드/SSOT/정본).
