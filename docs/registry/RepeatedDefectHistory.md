# RepeatedDefectHistory — 반복 재발 결함 클래스 이력

> 동일 유형 결함이 여러 차수 재발한 이력. 3차+ 반복 시 RootCauseAnalysis.md + 근본원인 제거(검출기/CI가드). 정본 보강: 메모리 `reference_audit_false_positives`.

| 재발 클래스 | 발생 차수 | 근본원인 | 제거 조치(정본) |
|------------|----------|---------|----------------|
| **스키마 드리프트**(존재X 컬럼 참조→무음실패) | 259(EventNorm/AdAdapters)·263(Payment)·265(UserAdmin·EventNorm·UserAuth·Health) | php-l 미검출·덤프 맹신·라이브 스키마 미대조 | 라이브 SHOW COLUMNS 정본화 + 드리프트 전수감사(Handlers+cron, 265차 5수정) |
| **라우트 Not found**($custom↔$register 불일치) | 265(DigitalShelf) | 2단계 등록 규약 누락 | **검출기 CI가드 G9**(tools/check_routes_registered.mjs·CI+pre-commit) |
| **화이트스크린**(조건부/early-return 뒤 훅) | 261(Attribution)·263(PlanPricing)·265(CRM/KakaoChannel/useDemo 잠복) | 수동감사 누락 | **rules-of-hooks CI가드 G10**(eslint plugin·CI+pre-commit) |
| **PHP 구문오류 배포유입** | (세션내 수동 php-l 반복) | CI 프론트만 빌드 | **php-l CI가드 G11**(backend 전체·index.php+cron) |
| **크로스탭 죽은발신자**(bcRef.current 미할당) | 259(5건) | ref 할당 누락 | 259차 수정·265 재감사 clean |
| **하드코딩 파생지표 운영유출**(reach=impr*0.72 등) | 239·259·263 | IS_DEMO 게이트 누락 | 전 site IS_DEMO 게이트(239차 종결·265 재확인) |
| **가짜버튼**(setTimeout 성공표기·백엔드 미호출) | 258·259·265(OperationsHub/DigitalShelf/WMS) | 미배선 | 실 백엔드 배선(265차) |
| **경쟁갭/미배선 오판**(구현분을 갭으로) | 다수 | 부재증명 누락 | FP레지스트리 주입 + 부재증명 강제 + PM 재증명 |
| **컨트롤 존재≠호출**(중앙게이트 있으나 일부 경로 미호출) | 289(EPIC06-A: /sms/send·/whatsapp/send·sendOne·/sms/broadcast 가 isMarketingSendAllowed 미호출) | 발송경로별 수동 게이트 삽입 | 리스크기록(SEG-C1~C4)·P0 백로그. 근본해소=발송 단일 진입점(verify+배포승인 후). 3차 도달 시 발송게이트 정적가드 검토 |

## 갱신 규칙
새 재발 클래스 발견 시 append. 3차 도달 시 RootCauseAnalysis.md 작성 필수. 근본원인 제거(검출기/가드/SSOT) 후 "제거 조치" 기록.
