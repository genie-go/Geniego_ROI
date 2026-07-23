# GeniegoROI Claude Code Implementation Specification

# CCIS Part020 — File Storage, Object Storage & Document Management Standards

Version 1.0 | 2026-07-23

---

## 1. 작업 목적

파일/객체 스토리지·문서 관리 표준을 수립한다.

> ★**성격(Part001~019 과 동일)**: 사용자가 Part020 명세(S3/Azure Blob/GCS/MinIO·Flysystem·Presigned
> URL·Multipart·Virus Scan·File Versioning·Lifecycle·CDN·Multi-Region DR)를 제공했으나 **그대로 따르지
> 않았다.** 실측 결과 **객체 스토리지(S3/Azure/GCS/MinIO)·Flysystem 은 부재**하고, 실 스토리지는 **로컬
> `MediaHost`/`ChannelImage`(278차)** + **상세HTML base64 인라인**이 정본이다. Part001 §4 에 따라 **실측
> → 객체 스토리지 부재 증명 → 로컬 MediaHost 성문화**했다. (문서 차수 — 코드 무변경.)

---

## 2. 실측 — 현행 스토리지 현실

| 항목 | 명세 요구 | **실측(정본)** |
|------|-----------|----------------|
| 객체 스토리지 | S3/Azure/GCS/MinIO | **부재**(aws-sdk/flysystem/azure/gcs 0·`S3Client`/`putObject` 0·"S3" 문자열=코드명 오탐·Part009) |
| Storage Driver 추상화 | `StorageInterface`+구현 | **부재**(Repository 없음·Part010). 핸들러 직접 파일 IO |
| 실 스토리지 | Object Storage First | ★**로컬 파일**: `MediaHost`·`ChannelImage`(278차·`mkdir 0755`·www-data) |
| 인라인 이미지 | 별도 파일 | ★**base64 data URI 인라인 152**(상세HTML·SummernoteEditor·외부 스토리지 없이 HTML 직접 삽입) |
| File Naming | UUID.ext(원본명 금지) | ★**준수** — `uniqid`/hash 파일명(64)·원본명 직접 저장 안 함 |
| Metadata | DB 관리 | **DB**(`ChannelImage` 등 채널 이미지 추적·tenant_id) |
| MIME 검증 | Magic Number | ★**finfo/getimagesize/image type(25)**·확장자만 신뢰 안 함 |
| Size 검증 | 상한 | **실재**(size 체크·예: 3MB 초과 거부) |
| Presigned URL | 만료 URL | **부재**(0) — 파일 직접 서빙(핸들러 인증) |
| Multipart/Resume | 대용량 | **부재** — 단일 업로드 |
| Virus Scan | ClamAV | **부재**(0) |
| 암호화 저장 | AES-256/KMS | **부재**(파일 평문·단 테넌트 자격증명은 `Crypto`·Part006) |
| Versioning/Lifecycle/Archive | 버전·수명주기 | **부재** |
| Soft Delete | 복원 | **부재**(hard delete·Part009 정합) |
| CDN | 정적 CDN | **부분**(CDN refs 9·Part017). 정적 dist=nginx 직접 |
| DR/Multi-Region | 복제 | **부재**(단일 서버·수동 백업) |

---

## 3. 명세 vs 현실 — 섹션별 판정

| 명세 § | verdict | 근거 |
|--------|---------|------|
| §3 원칙(Object Storage First/Immutable/Encryption/Versioned) | **부분** | ★비원본 파일명·MIME 검증·Metadata DB 준수. Object Storage/Encryption/Versioning 은 미적용 |
| §4~§6 Architecture/Provider/Driver | **미적용** | 객체 스토리지·Flysystem 부재. 핸들러 직접 로컬 IO |
| §7~§8 Bucket/Directory(tenant 구조) | **부분(대응물)** | Bucket 없음. 로컬 dir·DB 에 `tenant_id`(테넌트 격리) |
| §9 File Naming(UUID·원본명 금지) | **★준수** | uniqid/hash 파일명·원본명 미저장(파일명 불신) |
| §10 Metadata(DB) | **★준수** | DB 관리(ChannelImage·tenant_id) |
| §11~§12 Upload/Multipart | **부분** | 단일 업로드·검증. Multipart/Resume 부재 |
| §13~§14 Download/Presigned URL | **상이** | 직접 서빙(핸들러 인증). Presigned 부재 |
| §15 File Validation(MIME/Magic) | **★준수** | finfo/getimagesize·확장자 불신 |
| §16 Virus Scan | **미적용** | ClamAV 부재 |
| §17 Encryption | **부분** | 파일 평문. 테넌트 자격증명은 `Crypto` |
| §18~§20 Versioning/Lifecycle/Archive | **미적용** | 부재 |
| §21 Backup | **부분** | 수동 백업(dist/backend.filebak·Part015). 파일 전용 백업 정책 부분 |
| §22~§23 CDN/Cache Control | **부분** | 일부 CDN·nginx 캐시헤더. 전면 아님 |
| §24 Access Control(Public 금지) | **부분 준수** | 핸들러 인증·tenant. ★업로드 dir 공개 서빙 여부는 nginx 설정(278차 트랩 주의) |
| §25 Soft Delete | **미적용** | hard delete(Part009 정합) |
| §26 Audit | **부분** | SecurityAudit(일부). 파일 전용 audit 부분 |
| §27~§28 Monitoring/DR | **부분** | 디스크 사용(★dist.bak 누적 FS 100% 트랩·278차). Multi-Region 부재 |
| §29 PHP(Flysystem/Streaming/SHA-256) | **부분** | MIME 검증·해시 일부. Flysystem/Streaming 부재(base64 인라인) |
| §30 Claude(원본명 저장/MIME 생략/Public 금지) | **부분 준수** | 비원본 파일명·MIME 검증 준수. Virus Scan/Presigned 미적용 |
| §31~§32 검증(aws s3/mc/clamscan) | **대상 없음** | 객체 스토리지/ClamAV 없음. 로컬 dir·finfo |

---

## 4. 확립된 표준 (신규 파일코드가 따를 정본)

- **스토리지 = 로컬**: `MediaHost`/`ChannelImage`(278차). 객체 스토리지(S3 등)·Flysystem 신설 금지.
- ★**파일명 = uniqid/hash + ext**(원본명 직접 저장·경로 사용 금지 — 신뢰 안 함). 저장 dir=`mkdir 0755`·**www-data 소유**(278차 트랩 — 쓰기권한).
- **인라인 이미지**: 상세HTML 등은 **base64 data URI 인라인**(외부 스토리지 없이)·크기 상한(예 3MB) 검증.
- ★**MIME 검증**(finfo/getimagesize)·**Size 상한**·확장자 불신. 실행가능 파일 업로드 차단.
- **Metadata**: DB(`tenant_id` 격리·original name/mime/size/hash). 파일 접근=핸들러 인증(tenant/role).
- **트랩 주의(278차)**: ① 쓰기 dir www-data 소유 ② `/health` SPA 폴백 착시 ③ **`dist.bak` 누적 = FS 100%**(주기적 prune·Part015).

---

## 5. 의도적 미적용 + 사유 (정직 보고)

1. **S3/Azure/GCS/MinIO 객체 스토리지·Flysystem·Presigned URL·Multipart** — 안 함. 로컬 `MediaHost` 정본. 객체 스토리지=인프라 추가·Part006 정합.
2. **Virus Scan(ClamAV)·File Encryption·Versioning/Lifecycle/Archive** — 안 함. MIME/size 검증·비원본 파일명으로 기본 방어. 심화는 별도 인프라.
3. **Soft Delete(파일)** — 안 함(hard·Part009). 
4. **Multi-Region DR/Replication** — 안 함(단일 서버·수동 백업).
5. **Flysystem/Streaming 대용량** — 안 함. base64 인라인/단일 업로드.

★**준수하는 실 원칙**: 비원본 파일명(경로/명령 불신)·MIME 검증(Magic)·Size 상한·Metadata DB(tenant 격리)·핸들러 인증 접근제어.

---

## 6. Claude Code 구현 규칙

1. 스토리지=로컬 `MediaHost`/`ChannelImage`. S3/Flysystem 신설 금지. 인라인=base64(크기상한).
2. ★**파일명=uniqid/hash+ext**. **원본 파일명을 경로/명령/저장명에 직접 사용 금지**(신뢰 안 함).
3. ★**MIME 검증(finfo/getimagesize)·Size 상한·확장자 불신**. 실행가능 파일 차단.
4. Metadata=DB(`tenant_id` 격리). 접근=핸들러 인증(tenant/role). 업로드 dir 공개 서빙 금지.
5. ★쓰기 dir=www-data 소유(278차)·`dist.bak` 누적 prune(FS 100% 트랩).
6. S3/Presigned/Virus Scan/Versioning/Lifecycle 을 "명세에 있다"는 이유로 이식하지 않는다(인프라 결정).

---

## 7. Completion Criteria

- [x] 스토리지 **실측**(객체 스토리지 0·MediaHost/ChannelImage·uniqid 파일명·finfo MIME·base64 인라인 152)
- [x] 명세 §3~§32 **섹션별 매핑·판정**(S3/Flysystem/Presigned/Virus Scan/Versioning 부재 증명)
- [x] 실 로컬 스토리지(MediaHost·비원본 파일명·MIME 검증·Metadata DB) 성문화(§4)
- [x] File Naming(§9)·MIME 검증(§15)·Metadata(§10)·Access Control(§24) 준수 명시
- [x] 의도적 미적용 + 사유(§5) — 객체 스토리지/Virus Scan/Encryption/Versioning
- [x] ★278차 트랩(www-data·dist.bak FS 100%) 경고 · Claude Code 규칙(§6) · `phpstan analyse` 정합

> ★**"명세 완결 ≠ 구현 완결"**: 본 Part 는 실재하는 로컬 MediaHost + MIME검증 + 비원본 파일명 스토리지의 성문화이지 S3/Flysystem 이식이 아니다.

---

## 다음 Part

**CCIS Part021 — AI Service Integration, LLM Gateway & Prompt Engineering** — ★사전 경고: ★AI 는 실재·핵심(헌법 V4). LLM Gateway=**`ClaudeAI::gateway`/`complete` 단일 통과점**(053·`ai_call_log` 감사·BYO 우선·quota). 멀티LLM=Claude 위주(OpenAI/Gemini 부분). RAG=`geniegoFeatureDetails`(Citation·055). Vector DB=보류(표본0). Part021 은 실측→매핑→실 AI Gateway 성문화 + 실 갭 있으면 수정(보안처럼 게이트 가치).
