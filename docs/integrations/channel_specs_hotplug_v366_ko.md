# V366 채널 스펙(공식 문서) 핫플러그 가이드

## 목표
Shopee/Qoo10/Rakuten의 **공식 API 문서/스코프/레이트리밋**을 받는 즉시,
코드 수정 없이 `channel_api_profiles`에 **정확 값(endpoint path / cursor / auth string-to-sign / 필드 매핑)**을 채워 넣어
즉시 실데이터 적재를 시작할 수 있도록 합니다.

## 어디에 값을 넣나요?
1) **관리 UI**: `/admin/channels/api-profiles/ui`
2) **API**: `POST /admin/channels/api-profiles/apply` (patch 방식)
3) **CLI**: `tools/apply_channel_api_profiles_patch.py`

## patch 방식(권장)
- 운영 중인 전체 프로파일을 통째로 덮어쓰지 않고, 필요한 부분만 패치합니다.
- V366은 **Fail-Closed** 정책:
  - placeholder 엔드포인트(`is_placeholder=true` 또는 path에 `__...__`)는 기본적으로 저장/실행이 차단됩니다.
  - 개발/샌드박스에서만 `allow_placeholders=true`로 열어두세요.

## patch 예시(채널별)
`specs/examples/shopee_patch.json` 같은 파일을 복사해서 아래 항목을 채우면 됩니다.
- `channels.<channel>.base_url`
- `channels.<channel>.auth` (type, key/secret 위치, string_to_sign 등)
- `channels.<channel>.rate_limit` (requests_per_minute, burst)
- `channels.<channel>.endpoints.<key>`:
  - `method`, `path`
  - `pagination.cursor_param`, `pagination.cursor_path`, `pagination.items_path`, `pagination.limit_param`
  - `query_params_schema` (허용 파라미터/타입/범위)
  - `entity_mapping` (필드 매핑)

## 적용 절차(안전한 순서)
1) Dry-run:
   - UI에서 Dry-run 버튼 또는
   - `POST /admin/channels/api-profiles/apply?dry_run=true`
2) 에러(placeholder/스키마) 없으면 Apply
3) 해당 채널 DataSource 생성 후 Sync 실행

## 문제 발생 시
- Audit Log에서 `CHANNEL_API_PROFILES_PATCH_REJECTED` / `..._APPLIED` 이벤트를 확인하세요.
