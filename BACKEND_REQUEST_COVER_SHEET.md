# 백엔드 팀 의뢰 패키지 — Cover Sheet

> **수신**: 백엔드 팀
> **발신**: 프론트엔드 + i18n 트랙 (Geniego ROI)
> **작성일**: 2026-05-24
> **상태**: 152~157차 누적 의뢰, **답변 대기 4 세션**

---

## 1. 한 줄 요약

**프론트엔드 PM Phase 2 작업이 백엔드 결정 3건 + 보안 조치 1건을 기다리고 있습니다.** 본 문서는 의뢰 우선순위 + 답변 양식 + 첨부 문서 매핑입니다.

---

## 2. 의뢰 항목 (우선순위 순)

### 🔴 P0 — 보안 (즉시, 백엔드 팀 ≠ 사용자)

| 항목 | 내용 | 소요 |
|---|---|---|
| **W0 사용자 credentials rotation** | admin 6계정 (admin1234! / master!@#1234 / geniego1721 / 172165 / GENIEGO-ADMIN 등) plaintext 가 CDN bundled JS 에 노출 중. **사용자가** 비밀번호 rotation 후 백엔드 audit log 로 비정상 로그인 확인 + "W0 rotation 완료" 통보 필요. | 사용자 1시간 + 백엔드 확인 |

**선결**: P0 완료 전에는 P1/P2/P3 답변해도 코드 수정 불가 (W0 코드 제거 commit 이 막힘).

**상세**: `W0_SECURITY_PLAINTEXT_CREDS.md` (106 lines)

---

### 🟡 P1 — Admin Menu Toggle API 6종 (T3 트랙)

| 항목 | 내용 |
|---|---|
| **endpoint 설계 확정** | 첨부 `T3_BACKEND_API_REQUEST.md` 289줄 의뢰서의 API 6종 (메뉴 트리 CRUD + visibility toggle + audit log) 백엔드 답변 |
| **menu_tree 테이블 스키마** | 의뢰서 §2 스키마 (id/parent_id/path/visibility/role_required/audit) 채택/수정 결정 |
| **RBAC 정책 합의** | super_admin / admin / moderator 3단계 권한 매핑 |

**프론트 진입 조건**: 백엔드가 endpoint URL + request/response schema + auth 방식 (JWT vs session) 확정 → 153차 Phase A 진입.

**상세**: `T3_BACKEND_API_REQUEST.md` (289 lines), `T3_MENU_TOGGLE_DESIGN.md` (314 lines)

---

### 🟡 P2 — PM Phase 2 백엔드 계약 (orders / claims / settlements)

| 항목 | 내용 |
|---|---|
| **API 존재 여부** | `/api/orders`, `/api/claims`, `/api/settlements` 백엔드 구현 상태 |
| **응답 스키마 4개** | order.buyer/channel/total, claimHistory[].type, settlement[].period/channel, 등 정확 필드명 + 타입 |
| **데모/실서비스 분기 정책** | `_isDemo` flag → Mock vs API 라우팅 정책 합의 |
| **인증 helper 통일** | `getJsonAuth` vs `requestJsonAuth` 중 선택 (현재 혼재) |
| **백엔드 가동 환경** | 프론트가 hit 해볼 dev/staging endpoint 제공 |

**프론트 진입 조건**: 위 5건 답변 → PM Phase 2 시작 (단, **새 채팅 세션 분리 의무** — N-152-F).

**상세**: `PM_HANDOVER.md` (85 lines)

**현재 코드 상태**: `GlobalDataContext.jsx` (1744 lines), orders/claims/settlement Mock-only. 실 API hit 0. 유일한 실 API = `/api/channel-sync/inventory`.

---

### 🟢 P3 — Locale 동기화 정책 검토 (T7 트랙)

| 항목 | 내용 |
|---|---|
| **AI 번역 API 선택** | Claude (Anthropic) / OpenAI / DeepL 중 회사 정책 결정 |
| **API key 발급** | 선택된 provider 의 backend-side proxy 또는 환경변수 관리 |
| **번역 trigger 정책** | 수동 (T7 도구 호출) / 자동 (CI hook) / 배포 시점 |

**우선순위 낮음**: T7 동기화는 ko.js 마스터 (현재 30,656 leaf, 152차 33,211 대비 -7.7%) 기준. P0/P1/P2 보다 후순위.

**상세**: `T7_LOCALE_SYNC_PLAN.md` (195 lines)

---

## 3. 응답 양식 (백엔드 팀 채워주실 항목)

각 P 항목에 대해 다음 4 항목 답변 요청:

```markdown
## P0 W0 — credentials rotation
- [ ] 사용자 rotation 완료 통보: (날짜)
- [ ] audit log 비정상 로그인 검토: (결과 요약)
- [ ] 후속 조치: (예: 이전 비밀번호 해시 invalidate, IP 화이트리스트 등)

## P1 T3 — Admin Menu Toggle
- [ ] menu_tree 스키마 (의뢰서 §2): 채택 / 수정 (수정 시 diff)
- [ ] API 6종 endpoint URL + method:
      GET    /api/admin/menu        : __________
      POST   /api/admin/menu        : __________
      PATCH  /api/admin/menu/:id    : __________
      ...
- [ ] auth 방식: JWT / session / 기타
- [ ] 구현 예상 완료일: __________

## P2 PM Phase 2 — orders/claims/settlements
- [ ] /api/orders 존재 여부: yes / no / WIP
- [ ] /api/orders 응답 스키마 (JSON sample):
      ```json
      { ... }
      ```
- [ ] /api/claims 동일
- [ ] /api/settlements 동일
- [ ] 데모/실서비스 분기 정책: __________
- [ ] auth helper 통일안: getJsonAuth / requestJsonAuth / 신규
- [ ] dev/staging endpoint URL: __________

## P3 T7 — Locale sync
- [ ] AI 번역 provider: Claude / OpenAI / DeepL / 기타
- [ ] API key 관리 방식: backend proxy / env var / vault
- [ ] trigger 정책: manual / CI / deploy
```

---

## 4. 의뢰 이력

| 세션 | 일자 | 의뢰 내용 | 답변 |
|---|---|---|---|
| 152 | 2026-05-23 | T3/T7/W0 초안 작성 | — |
| 153 | 2026-05-23~ | T3 의뢰서 finalization (289줄) | — |
| 154~157 | 2026-05-24 | 답변 대기, 프론트엔드 i18n 트랙 진행 중 | — |

**검수자 메모**: 4 세션 동안 답변이 없어 프론트엔드는 외부 의존 0 트랙 (i18n cleanup + detector 영구화) 으로 진행 중. 답변 지연이 길어질수록 PM Phase 2 진입이 늦어집니다.

---

## 5. 첨부 문서 (repo root)

| 파일 | 크기 | 우선순위 |
|---|---|---|
| `W0_SECURITY_PLAINTEXT_CREDS.md` | 4.1KB | 🔴 P0 |
| `T3_BACKEND_API_REQUEST.md` | 8.5KB | 🟡 P1 (메인 의뢰서) |
| `T3_MENU_TOGGLE_DESIGN.md` | 9.5KB | 🟡 P1 (설계 컨텍스트) |
| `PM_HANDOVER.md` | 12KB | 🟡 P2 |
| `PM_ANALYSIS_REPORT.md` | 9KB | 🟡 P2 (배경 분석) |
| `PM_PAGE_ANALYSIS.md` | 12KB | 🟡 P2 (배경 분석) |
| `T7_LOCALE_SYNC_PLAN.md` | 7KB | 🟢 P3 |

---

## 6. 회신 방법

- 슬랙 / 이메일 회신
- 또는 본 문서 §3 응답 양식을 채워 repo PR 로 제출

---

## 7. 검수자 권장 진행 순서

1. **사용자**: 본 cover sheet 를 백엔드 팀 리드 + W0 rotation 담당자에게 전달
2. **사용자 → 백엔드 팀**: P0 W0 rotation 먼저 (소요 1~2 시간)
3. **백엔드 팀**: P1 T3 + P2 PM Phase 2 답변 (소요 1~3 일 예상)
4. **사용자**: P0~P2 답변 수령 시 새 채팅 세션 (PM 트랙) 으로 진입 (N-152-F)
5. **i18n 트랙**: 그 동안 158차에서 자체 진행 가능 (외부 의존 0 트랙들)

---

**문서 종결.**
