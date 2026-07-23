# GeniegoROI Claude Code Implementation Specification

# CCIS Part036 — Document Management, ECM, OCR & Digital Signature Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

Document Management(DMS)·ECM·OCR·IDP·Digital Signature 표준을 수립한다.

> ★**성격(축 분리 — "미디어/콘텐츠 저장" 실재 vs "ECM/OCR/전자서명" 대체로 사업범위 밖)**: 이 저장소는
> **마케팅/커머스 ROI SaaS**다. 명세가 다루는 **형식 ECM/DMS·OCR·IDP(Invoice/Receipt/Contract Extraction)·
> 전자서명(PAdES/XAdES/CAdES)·전자계약·Watermark·PDF 처리(merge/split/encrypt)·형식 문서 버전관리**는 이
> 제품의 **사업 범위 밖(out of scope)**이라 **부재**한다(grep 0·PDF 라이브러리 fpdf/tcpdf/dompdf 부재). ★결함이
> 아니라 정직한 비적용(MEA 064 "out of scope"·Part035 어휘 재적용). ★**실재 축(미디어/콘텐츠 substrate)**:
> **`MediaHost`**(278차·상품 이미지 **content-addressed(sha256) object storage**·중복0·dist 바깥 저장·public
> URL)·**`ChannelImage`**(전 채널 이미지 아키텍처·278차)·**`DataExport`**(csv/xlsx 리포트·Part026)·
> **`LegalDoc`**(약관/개인정보/환불 **다국어 편집 문서**·239차)·**크리에이티브 자산**(`CreativeStudio`/
> `CreativeStore`)·**`Reviews`**(UGC 이미지)·**`Dsar`**(문서 보존/Legal Hold·Part034 승계) 는 실재한다.
> Part001 §4 에 따라 실측 → ECM/OCR/전자서명 사업범위 밖 증명 → 실 미디어/콘텐츠 substrate 성문화했다. ★객체
> 저장 정본=**CCIS Part020(File/Object Storage)**·보존정책 정본=**Part034 `Dsar`**. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 문서/콘텐츠 스택

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| Document Architecture | Upload→Service→Metadata→Storage→Index | **부분(미디어 중심)** — `MediaHost`(content-addressed 저장). Metadata Repo→Search Index 문서 계층 아님 |
| Document Repository | PDF/DOCX/XLSX/Image | **부분** — 이미지(`MediaHost`/`ChannelImage`)·csv/xlsx(`DataExport`)·약관(`LegalDoc`). DOCX/PPTX/PDF 저장고 아님 |
| Document Metadata | ID/Owner/Category/Version | **부분** — `MediaHost` sha256 내용주소·`LegalDoc`(doc_key/lang). 형식 메타 리포지토리 아님 |
| Document Versioning | Major/Minor/Rollback | **부재** — `LegalDoc` DB 편집(graceful 폴백)·`MediaHost` 내용주소(불변). 형식 버전관리 아님 |
| Document Classification | Public/Internal/Confidential/Legal | **부분** — 공개(상품이미지·약관)·PII 미저장. 형식 5등급 taxonomy 아님(Part034) |
| OCR(다국어·Confidence) | 문자인식 | **부재(out of scope)** — OCR 엔진 없음 |
| IDP(Invoice/Receipt/Contract) | AI 문서이해 | **부재(out of scope)** — 문서추출 없음. AI=LLM(`ClaudeAI`)이나 문서 IDP 파이프라인 아님 |
| PDF Processing | Merge/Split/Encrypt/Watermark | **부재** — PDF 라이브러리(fpdf/tcpdf/dompdf) 없음. `DataExport`=csv/xlsx |
| Image Processing | Resize/Crop/Deskew | **부분** — `ChannelImage`(채널별 규격)·`CreativeStudio`. OCR 전처리(deskew/denoise) 대상 없음 |
| Full-Text Indexing | OCR/PDF Text 색인 | **부재** — 문서 전문색인 없음(Part029 검색=MySQL LIKE·문서 대상 아님) |
| Document Search | Keyword/Metadata/Semantic | **부재/부분** — 문서 검색 없음. Glossary/지식은 챗봇 Retriever(Part029) |
| Electronic Signature(PAdES/XAdES/CAdES) | 전자서명 검증 | **부재(out of scope)** — 전자서명 없음. (SAML ds:Signature 는 인증용·문서서명 아님·Part030) |
| Electronic Contract | 계약 생명주기 | **부재(out of scope)** — 전자계약 없음. 계약=채널 계약메타(`ChannelContract`)는 별개 |
| Watermark | Dynamic/User/Tenant | **부재(out of scope)** — 워터마크 없음 |
| Legal Hold | Hold Apply/Release/Audit | ★**대응물** — `Dsar`(법정 보존의무 데이터=삭제 아닌 익명화·Part034) |
| Retention Policy | Period/Archive/Secure Delete | ★**대응물** — `Dsar`(GDPR Art.17·삭제vs익명화)·`Crypto`. 문서 전용 보존 아님 |
| Document Security | Encrypt/Access/Signature Validation | ★**부분 준수** — TLS·`Crypto` AES·RBAC·`MediaHost`(파일명 추측불가·인증 write). 서명검증 대상 없음 |
| Document Workflow | Draft→Review→Approved→Archived | **부분** — `LegalDoc` admin 편집·`action_request` 승인. 형식 문서 워크플로 아님 |
| Monitoring | Upload/OCR/Storage Usage | **부분** — `MediaHost` 저장·`media_gc_cron`(GC)·`SystemMetrics`. OCR/서명 대상 없음 |
| Logging | Document/Version/Action | **부분** — `SecurityAudit`·error_log. 문서 버전 감사 대상 부분 |
| Compliance(ISO 15489/전자문서법) | 문서 규정 | **부분** — `Dsar`/`GdprConsent`(GDPR/PIPA). ISO 15489/전자문서법 형식 아님 |
| Disaster Recovery | Document/Object 복제 | **부분** — `MediaHost` 내용주소 재생성·DB 백업·git(약관). Object 복제 부분(Part020) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Document First/Immutable Version/Metadata Driven/Searchable/Legally Compliant/AI Ready/Tenant Isolated) | **부분(미디어축)** | ★Immutable(MediaHost 내용주소)·Tenant Isolated·Secure Storage. Document First/Searchable/전자서명=out of scope |
| §4 Document Architecture | **부분(미디어 중심)** | `MediaHost` 저장. 문서 Metadata→Index 계층 아님 |
| §5~§6 Repository/Metadata | **부분** | 이미지·csv/xlsx·약관. DOCX/PPTX/PDF 저장고·형식 메타 아님 |
| §7 Versioning | **부재** | `LegalDoc` 편집·`MediaHost` 불변. 형식 버전관리 아님 |
| §8 Classification | **부분** | 공개·PII 미저장. 형식 5등급 아님(Part034) |
| §9~§10 OCR/IDP | **부재(out of scope)** | OCR/문서추출 엔진 없음 |
| §11 PDF Processing | **부재** | PDF 라이브러리 없음. `DataExport`=csv/xlsx |
| §12 Image Processing | **부분** | `ChannelImage`/`CreativeStudio`. OCR 전처리 대상 없음 |
| §13~§14 Full-Text Index/Search | **부재/부분** | 문서 전문색인/검색 없음(Part029) |
| §15~§16 전자서명/전자계약 | **부재(out of scope)** | PAdES/XAdES/CAdES·전자계약 없음 |
| §17 Watermark | **부재(out of scope)** | 워터마크 없음 |
| §18 Legal Hold | **★대응물** | `Dsar`(법정보존=익명화·Part034) |
| §19 Retention Policy | **★대응물** | `Dsar`(GDPR Art.17·삭제vs익명화) |
| §20 Document Security | **부분 준수** | TLS·`Crypto`·RBAC·`MediaHost`(추측불가·인증 write) |
| §21 Document Workflow | **부분** | `LegalDoc` 편집·`action_request` 승인 |
| §22 Monitoring | **부분** | `MediaHost`·`media_gc_cron`·`SystemMetrics` |
| §23 Logging | **부분** | `SecurityAudit`·error_log |
| §24 Compliance | **부분** | `Dsar`/`GdprConsent`. ISO 15489/전자문서법 형식 아님 |
| §25 Disaster Recovery | **부분** | 내용주소 재생성·DB 백업·git. Object 복제 부분 |
| §26~§27 PHP/Claude(Document Service/OCR Adapter/PDF Service/Signature Validator) | **부분** | ★`MediaHost`·`DataExport`·`LegalDoc`. OCR/PDF/Signature Validator=out of scope |
| §28~§29 검증(document:health/ocr:test/signature:verify) | **대상 없음** | artisan 없음·OCR/서명 없음. `MediaHost`·`media_gc_cron`·`DataExport` 로 대체 |

---

## 4. 확립된 표준 (신규 문서/콘텐츠 코드가 따를 정본)

- ★**미디어 저장 정본 = `MediaHost`**(content-addressed sha256·**CCIS Part020**). 신규 미디어는 이 호스팅 재사용. ★**내용주소=중복0·URL 안정(큐 재시도)·파일명 추측불가**. ★**dist 바깥 저장**(프론트 dist 는 배포 `rsync --delete` 로 교체 → dist 내 저장 시 배포마다 소실·278차 트랩). ★**쓰기 디렉터리 www-data 권한**·**공개 write 금지**(인증 writeback 경로만).
- ★**채널 이미지 = `ChannelImage`**(전 채널 규격 아키텍처·278차). 채널별 업로드 추측 금지(추측=400)·공개 URL 발급 계약.
- ★**리포트 문서 = `DataExport`**(csv/xlsx·Part026). PDF 라이브러리 미도입(신규 PDF 요구 시 별도 결정).
- ★**법적 문서 = `LegalDoc`**(약관/개인정보/환불·다국어 편집·SSOT `DOC_KEYS`). graceful 폴백(콘텐츠 없으면 프론트 하드코딩·무회귀). lite-markdown 안전파싱(innerHTML 미사용=XSS 없음).
- ★**보존/Legal Hold = `Dsar`**(Part034 승계): 법정 보존의무 데이터=삭제 아닌 **익명화**·fail-closed·`Crypto` 암호화. 문서 전용 retention 신설 금지(Dsar 확장).
- ★**테넌트 격리·PII 미저장**(상품 이미지=공개 자산·PII 없음)·`SecurityAudit` 기록.
- ★**사업범위 원칙**: **OCR/IDP/전자서명/전자계약/Watermark 는 이 제품 범위 밖** — 요구·제품결정 전 선이식 금지.

---

## 5. 의도적 미적용 + 사유 (정직 보고 — 상당수 out of scope)

1. **OCR·IDP(Invoice/Receipt/Contract Extraction)** — 안 함. **사업 범위 밖**(문서 인식/추출 제품 아님·마케팅/커머스 ROI SaaS). 요구 발생 시 외부 OCR API 어댑터.
2. **전자서명(PAdES/XAdES/CAdES)·전자계약** — 안 함. **사업 범위 밖**(전자계약 플랫폼 아님). SAML ds:Signature(Part030)는 인증용이지 문서서명 아님.
3. **Watermark(동적/사용자/테넌트)** — 안 함. **사업 범위 밖**. 상품 이미지는 공개 자산.
4. **PDF 처리(merge/split/encrypt·PDF 라이브러리)·형식 문서 버전관리·Full-Text 문서 색인** — 안 함. `DataExport`=csv/xlsx·`MediaHost` 내용주소 불변. PDF/버전관리=요구 발생 시 결정.
5. **형식 ECM/DMS·Metadata Repository API·Document Search** — 안 함. `MediaHost`(미디어)+`LegalDoc`(법적문서)+`DataExport`(리포트)가 실 콘텐츠 substrate. 형식 ECM=별도 도메인.
6. **Legal Hold/Retention 문서 전용 엔진** — `Dsar`(Part034)로 대응. 문서 전용 보존 신설 금지.
7. **artisan `document:*`/`ocr:*`/`signature:*` 명령** — 없음(Slim·OCR/서명 없음). `MediaHost`·`media_gc_cron`·`DataExport` 로 대체.

★**준수하는 실 원칙**: **content-addressed 미디어 저장(중복0·URL 안정·dist 바깥)·채널 이미지 아키텍처·csv/xlsx 리포트·법적문서 다국어 편집(graceful 폴백)·보존=Dsar(삭제vs익명화)·테넌트 격리·PII 미저장·공개 write 금지**. ★**out of scope 정직 선언**: OCR/전자서명/전자계약/Watermark 는 이 제품 범위 밖이며 부재는 결함이 아니다.

---

## 6. Claude Code 구현 규칙

1. 미디어 저장=`MediaHost`(content-addressed·Part020) 재사용. ★dist 바깥 저장(rsync --delete 소실 방지)·공개 write 금지·쓰기 디렉터리 www-data.
2. 채널 이미지=`ChannelImage`(규격 아키텍처). 리포트=`DataExport`(csv/xlsx·PDF 라이브러리 미도입).
3. 법적 문서=`LegalDoc`(다국어·graceful 폴백·lite-markdown 안전파싱). 보존/Legal Hold=`Dsar`(Part034·삭제vs익명화).
4. ★테넌트 격리·PII 미저장(상품이미지=공개자산)·`SecurityAudit` 기록.
5. ★**OCR/IDP/전자서명(PAdES 등)/전자계약/Watermark 를 선이식하지 않는다** — 사업 범위 밖(요구·제품결정 선행).
6. PDF 처리/형식 문서 버전관리/ECM/DMS 를 "명세에 있다"는 이유로 이식하지 않는다(MediaHost+LegalDoc+DataExport+Dsar 로 커버).

---

## 7. Completion Criteria

- [x] 문서/콘텐츠 스택 **실측**(OCR/전자서명/전자계약/Watermark/PDF라이브러리/ECM 부재·`MediaHost` 내용주소·`LegalDoc`·`DataExport`·`Dsar` 보존 실재)
- [x] 명세 §3~§29 **섹션별 매핑·판정**(OCR/IDP/전자서명/전자계약 **out of scope** 증명·미디어 substrate 실재)
- [x] 실 콘텐츠(MediaHost+ChannelImage+DataExport+LegalDoc+Dsar) 성문화(§4·객체저장=Part020·보존=Part034)
- [x] ★content-addressed 저장(중복0·dist 바깥·278차 트랩)·법적문서 graceful 폴백·보존=Dsar·테넌트 격리·**out of scope 정직 선언** 명시
- [x] 의도적 미적용 + 사유(§5) — OCR/IDP/전자서명/전자계약/Watermark/PDF/ECM(상당수 out of scope)
- [x] Claude Code 규칙(§6) · `MediaHost`·`ChannelImage`·`DataExport`·`LegalDoc`·`Dsar` 실 경로 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 **미디어/콘텐츠 substrate**(content-addressed `MediaHost` +
> `ChannelImage` + csv/xlsx `DataExport` + 다국어 `LegalDoc` + `Dsar` 보존)의 성문화이지 ECM/OCR/전자서명/전자
> 계약 이식이 아니다. ★**out of scope 정직 선언(MEA 064 어휘)**: OCR/IDP/전자서명/전자계약/Watermark 는 이
> 마케팅/커머스 SaaS 의 **사업 범위 밖**이며 부재는 결함이 아니다.

---

## 다음 Part

**CCIS Part037 — IoT, Edge Computing, Device Management & Digital Twin** — ★사전 실측 예고: 형식 IoT(MQTT/AMQP/OPC UA)·Edge·Firmware OTA·Digital Twin 은 **부재**(대체로 사업범위 밖·MEA 061 IoT/Edge weak·MEA 059 Digital Twin weak)하나, 디바이스 접점 실체는 **`WmsCctv`(창고 CCTV 브리지·274차·061 Device 축)·`Wms`(창고 재고/이동)·픽셀/이벤트 텔레메트리(`PixelTracking`)·`api_key`(디바이스 identity)**로 부분 실재. Part037 도 실측→MQTT/OPC UA/Digital Twin 부재증명→WmsCctv+텔레메트리 성문화. ★MEA 061 D-1 "WmsCctv=Device 축 편입"·059/061 weak·out of scope 어휘 승계.
