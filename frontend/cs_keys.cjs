const fs=require('fs'),p=require('path');
const D=p.join(__dirname,'src','i18n','locales');
const NEW_KEYS={
csFilterAll:'전체',csStatusApproved:'승인',csStatusReview:'검토중',csStatusActive:'활성',
csConv:'전환',csUseCampaign:'캠페인 활용',csAiGenTitle:'AI 크리에이티브 생성',
csAiGenDesc:'카테고리와 채널을 선택하면 AI가 최적의 광고 소재를 자동 생성합니다.',
csStartFromSetup:'캠페인 설정에서 시작하기',csTypeCarousel:'카루셀 광고',
csTypeCarouselDesc:'여러 이미지를 슬라이드로 구성',csTypeVideo:'동영상 광고',
csTypeVideoDesc:'15~60초 숏폼 영상 자동 제작',csTypeBanner:'배너 광고',
csTypeBannerDesc:'반응형 디스플레이 배너 생성',csTypeStory:'스토리 광고',
csTypeStoryDesc:'9:16 세로형 풀스크린 소재',csTypeShopping:'쇼핑 광고',
csTypeShoppingDesc:'상품 피드 기반 DPA 소재',csTypeMessage:'메시지 광고',
csTypeMessageDesc:'카카오톡·LINE 템플릿',csPerfAvgCtr:'평균 CTR',
csPerfAvgConv:'평균 전환율',csPerfTotalConv:'총 전환수',csPerfEffScore:'소재 효율 점수',
csPerfTable:'소재별 성과 테이블',csColName:'소재명',csColFormat:'포맷',
csColPlatform:'플랫폼',csColStatus:'상태',csAiOptTitle:'AI 소재 최적화 제안',
csAiOpt1:'동영상 소재의 CTR이 카루셀 대비 1.5배 높습니다. 동영상 비율을 확대하세요.',
csAiOpt2:'TikTok 숏폼 소재의 전환율이 가장 높습니다. 15초 이내 소재를 추가 제작하세요.',
csAiOpt3:'2주 이상 된 소재는 광고 피로도가 상승합니다. 새로운 크리에이티브를 교체하세요.',
csBrandTitle:'브랜드 에셋 관리',csBrandDesc:'브랜드 가이드라인에 따른 일관된 소재 관리',
csUploadAsset:'에셋 업로드',csPreview:'미리보기',csDownload:'다운로드',
csBrandCheck:'브랜드 일관성 검사',csColorComp:'컬러 준수율',csFontComp:'폰트 일관성',
csLogoComp:'로고 사용 준수',csGuideViolation:'가이드라인 위반',csUnitCount:'건',
csLastSync:'마지막 동기화: 방금',csFmtCarousel:'카루셀',csFmtVideo:'동영상',
csFmtBanner:'배너',csFmtShort:'숏폼'
};
// Inject into ko.js marketing.g section
let c=fs.readFileSync(p.join(D,'ko.js'),'utf8');
const anchor='"csSystemOk": "시스템 정상 운영 중"';
if(c.includes(anchor)&&!c.includes('"csFilterAll"')){
  const lines=Object.entries(NEW_KEYS).map(([k,v])=>`    "${k}": "${v}"`).join(',\n');
  c=c.replace(anchor, anchor+',\n'+lines);
  fs.writeFileSync(p.join(D,'ko.js'),c,'utf8');
  console.log('[OK] ko.js: '+Object.keys(NEW_KEYS).length+' keys');
} else console.log('[SKIP] ko.js');
