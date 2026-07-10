#!/usr/bin/env node
/**
 * [277차 신설] 채널 상품등록/수정 배선 회귀 가드.
 *
 * 왜 필요한가 — 277차에 같은 클래스의 결함이 반복 신고됐다:
 *   ① 어댑터 payload 에 채널 필수 블록이 빠져 어떤 상품도 등록되지 않음(naver: smartstoreChannelProduct 등)
 *   ② 큐가 'queued'(대기)를 반환하는데 UI 가 성공으로 표기 → 실패가 사용자에게 도달하지 않음
 *   ③ 채널 카테고리 코드를 얻을 수단 부재 / 어댑터마다 다른 키를 읽어 값이 도달하지 않음
 *   ④ 상세HTML·이미지가 전 채널에서 미전송
 *   ⑤ 기존 상품 수정 시 채널 상품 id 를 못 찾아 항상 신규등록으로 시도
 *
 * 이 가드는 그 배선들이 **다시 끊기면 즉시 실패**한다. 정적 검사이므로 외부 API 호출이 없다.
 * 사용: node tools/guard_channel_writeback.mjs   (exit 1 = 회귀)
 */
import fs from 'fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const CATALOG = read('backend/src/Handlers/Catalog.php');
const CHSYNC  = read('backend/src/Handlers/ChannelSync.php');
const PRICEOPT_JSX = read('frontend/src/pages/PriceOpt.jsx');
const CATSYNC_JSX  = read('frontend/src/pages/CatalogSync.jsx');

const failures = [];
const check = (name, cond, hint) => { if (!cond) failures.push(`${name}\n      → ${hint}`); };

/* ── ① 네이버 신규등록 필수 블록 (실 API 400 으로 확정) ─────────────────── */
check('naverWrite: smartstoreChannelProduct 전송',
  /'smartstoreChannelProduct'\s*=>/.test(CHSYNC),
  '네이버는 이 블록이 없으면 NotNull 400 — 어떤 상품도 등록되지 않는다');
check('naverWrite: detailAttribute(minorPurchasable·고시)',
  /naverDetailAttribute/.test(CHSYNC) && /minorPurchasable/.test(CHSYNC) && /productInfoProvidedNotice/.test(CHSYNC),
  'minorPurchasable(NotNull)·productInfoProvidedNotice(NotEmpty) 필수');
check('naverWrite: deliveryInfo(택배사·배송비 결제방식)',
  /naverDeliveryInfo/.test(CHSYNC) && /deliveryCompany/.test(CHSYNC) && /deliveryFeePayType/.test(CHSYNC),
  'deliveryCompany·deliveryFeePayType 는 신규등록 필수 enum');
check('naverWrite: 고시 필수필드 자가치유',
  /naverFillMissingFields/.test(CHSYNC),
  '품목마다 필수 고시필드가 다르다 — invalidInputs 를 읽어 채우는 재시도가 있어야 한다');
check('naverWrite: 날짜 포맷 자가치유',
  /naverFixDateFormat/.test(CHSYNC),
  'cosmetic.expirationDate 는 YYYY-MM — 파싱오류 메시지로 보정해야 한다');
check('naverWrite: 이미지 dataURL → 공개 URL 업로드',
  /naverUploadImages/.test(CHSYNC),
  '상품등록 폼은 base64 dataURL 로 보관 — 업로드 없이 보내면 400');

/* ── ② 기존 상품 수정(PUT) 경로 ──────────────────────────────────────── */
check('naverWrite: 수정 시 기존 상품 조회 후 머지',
  /originProduct 전체 교체|array_merge\(\$base, \$over\)/.test(CHSYNC),
  'PUT 은 전체 교체 — 조회 없이 보내면 채널의 상세·고시·배송이 지워진다');
check('priorChannelProductId: channel_products 폴백',
  /FROM channel_products[\s\S]{0,200}channel_product_id/.test(CATALOG) && /origin_product_id/.test(CATALOG),
  '수집한 기존 상품의 id 를 못 찾으면 항상 신규등록으로 시도해 실패한다');
check('channel_products: origin_product_id 저장',
  /origin_product_id/.test(CHSYNC) && /origin_product_no/.test(CHSYNC),
  '네이버 수정은 originProductNo 를 쓴다(channel_product_id 는 channelProductNo — 다른 번호)');

/* ── ③ 카테고리: 조회 수단 + 어댑터 키 정규화 ──────────────────────────── */
check('채널 카테고리 조회 EP',
  /function channelCategories/.test(CATALOG) && /naverCategoryCatalog/.test(CHSYNC),
  '코드를 얻을 수단이 없으면 사용자는 카테고리를 손으로 타이핑해야 한다');
check('어댑터 payload 키 정규화(category_id·channel_category)',
  /function normalizeAdapterPayload/.test(CATALOG) &&
  /'category_id'/.test(CATALOG) && /'channel_category'/.test(CATALOG),
  'shopee/lazada 는 category_id, walmart/qoo10 등은 channel_category 를 읽는다 — 별칭이 없으면 값이 도달하지 않는다');
check('정규화가 큐 소비 경로에서 호출됨',
  /\$product = self::normalizeAdapterPayload\(\$product\);/.test(CATALOG),
  '정의만 있고 호출되지 않으면 무의미');
check('빈 카테고리 시 별칭 미생성(honest-gate 보존)',
  /if \(\$code !== ''\)/.test(CATALOG),
  '빈 값으로 별칭을 만들면 어댑터의 정직한 거부가 무력화된다');

/* ── ④ 상세HTML·이미지 관통 ─────────────────────────────────────────── */
check('catalog_listing: detail_html·images_json·category_code 영속',
  /detail_html TEXT/.test(CATALOG) && /images_json TEXT/.test(CATALOG) && /category_code TEXT/.test(CATALOG),
  '큐 소비 시 currentListing 으로 복원되므로 컬럼이 없으면 값이 사라진다');
check('currentListing: 상세·이미지·카테고리코드 복원',
  /SELECT name,category,price,inventory,spec,action,detail_html,images_json,image_url,category_code/.test(CATALOG),
  '가격만 바꾸는 리프라이서가 채널 상세를 지우는 회귀를 막는다');
check('channel_meta(고시·배송·AS) 운반',
  /function pickChannelMeta/.test(CATALOG) && /channel_meta/.test(CATALOG),
  'catalog_listing 에 없는 채널 필수 메타는 job payload 로 운반해야 한다');
check('Shopify: detail_html + 이미지(attachment)',
  /function shopifyImages/.test(CATALOG) && /attachment/.test(CATALOG),
  'Shopify 는 base64 attachment 를 받아 CDN URL 을 발급한다');

/* ── ⑤ 정직한 결과 전달 (성공 오표기 금지) ──────────────────────────── */
check('writeback: 동기 실행 후 채널의 진짜 결과 반환',
  /function jobResultById/.test(CATALOG) && /function processJobById/.test(CATALOG)
  && /\$sum = self::processJobById\(\$pdo, \$jobId\)/.test(CATALOG),
  "'queued'(대기열 등록)를 성공으로 반환하면 사용자는 실패를 영원히 알 수 없다");
check('writeback: 자기가 만든 잡만 처리·조회(jobId 추적)',
  /\$jobId = self::logJob\(/.test(CATALOG) && /\$jr = self::jobResultById\(\$pdo, \$jobId\)/.test(CATALOG),
  '다른 상품/다른 operation 의 잡을 읽으면 사유 없는 queued 가 표시된다(실측 회귀)');
check('logJob: operation 을 가려 superseded 마감',
  /AND operation=\? AND status IN \('queued','awaiting_credentials','pending_approval'\)/.test(CATALOG),
  '등록(publish) 잡이 가격(price) 잡에 의해 처리 전 삭제되던 회귀');
check('bulkPrice: 미등록 상품에 price 잡을 만들지 않음',
  /priorChannelProductId\(\$pdo, \$tenant, \(string\)\$c\['channel'\], \(string\)\$c\['sku'\]\) === null/.test(CATALOG),
  '미등록 상품의 price 잡은 신규등록으로 오인돼 엉뚱한 오류를 남긴다');
check('writeback: 자격증명 없을 때 잡을 awaiting_credentials 로 기록',
  /'awaiting_credentials'\s*:\s*\$status|\$jobStatus = \(\$status === 'saved'\)/.test(CATALOG),
  "'saved' 잡은 processWritebackQueue 가 절대 소비하지 않는다(영구 미발송)");
check('PriceOpt: done 만 성공으로 표기',
  /successStates = \['done', 'unregistered'\]/.test(PRICEOPT_JSX),
  'queued 를 성공으로 표기하면 "동기화 성공인데 미등록"이 재발한다');
check('PriceOpt: 카테고리 필요 시 선택 모달',
  /leafCategoryId\|카테고리/.test(PRICEOPT_JSX) && /catModal/.test(PRICEOPT_JSX),
  '카테고리 코드를 얻을 UI 가 없으면 등록이 불가능하다');
check('CatalogSync: 채널 오류를 화면에 노출',
  /setResults\(results\)/.test(CATSYNC_JSX) && /r\.error/.test(CATSYNC_JSX),
  'console.warn 으로만 흘리면 화면은 성공처럼 보인다(문제 반복의 직접 원인)');
check('CatalogSync: 등록상품 payload 에 채널 필수 메타 동봉',
  /\.\.\.\(prod\._meta \|\| \{\}\)/.test(CATSYNC_JSX),
  '고시·배송·AS 없이 보내면 네이버가 400 으로 거부한다');

/* ── ⑥ 날조 금지 ──────────────────────────────────────────────────── */
check('CatalogSync: 정가(comparePrice) 합성 금지',
  !/comparePrice:\s*Math\.round\(\(Number\(p\.base_price\)[^)]*\)\s*\*\s*1\.2\)/.test(CATSYNC_JSX),
  'po_products 에 compare_price 컬럼이 없다 — 판매가×1.2 는 날조된 정가다');
check('자가치유가 enum/코드 필드를 임의 문자열로 채우지 않음',
  /noAutoFill/.test(CHSYNC) && /deliveryCompany/.test(CHSYNC),
  'enum 에 상품상세참조 를 넣으면 그대로 400 이며, 값을 지어내는 것이기도 하다');

/* ── 결과 ────────────────────────────────────────────────────────── */
if (failures.length) {
  console.error('\n❌ [guard_channel_writeback] 채널 등록/수정 배선 회귀 ' + failures.length + '건\n');
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  console.error('  ※ 이 가드는 277차에 실 API 로 확정한 배선을 지킨다. 의도적 변경이라면 가드도 함께 갱신하라.\n');
  process.exit(1);
}
console.log('✅ [guard_channel_writeback] 채널 등록/수정 배선 정합 (23 checks)');
