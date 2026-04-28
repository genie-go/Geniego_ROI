const fs = require('fs');

// Path configs
const enPath = 'frontend/src/i18n/locales/en.js';
const koPath = 'frontend/src/i18n/locales/ko.js';

// Patch en.js 
let enText = fs.readFileSync(enPath, 'utf8');

if (!enText.includes('unified: {')) {
    enText = enText.replace(/const en = \{/, `const en = {\n    unified: {\n        whichCategory: "Which industry are you advertising? (Category)",\n        catFashion: "👗 Fashion/Apparel",\n        catBeauty: "💄 Beauty/Cosmetics",\n        catFood: "🍔 Food/Health",\n        catTech: "💻 Electronics/IT",\n        catTravel: "✈️ Travel/Accommodation",\n        catSoftware: "☁️ Software/Platform",\n        catGeneral: "🛍️ General/Mall"\n    },`);
}

// Fix menu docs in en.js
enText = enText.replace(/"icon": "🚀",\s*"label": "Marketing Automation AI",\s*"path": "\/auto-marketing",\s*"desc": "AI auto-creates marketing strategies from monthly budget \+ product category.",\s*"how": \[\s*"Enter monthly budget",\s*"Select product category",\s*"Select ad channels",\s*"Click Generate AI Marketing Strategy",\s*"Preview budget allocation \+ estimated ROAS",\s*"Submit for Approval",\s*"Admin approves or rejects"\s*\],/m, 
`"icon": "💎",
                        "label": "Unified AI Campaign Builder",
                        "path": "/auto-marketing",
                        "desc": "Select a product category and enter an overall budget to automatically allocate budgets via AI, and launch campaigns instantly.",
                        "how": [
                            "Step 1: Select a product category (Fashion, Beauty, Travel, Software, etc.) and enter total budget.",
                            "Step 2: Review estimated ROAS and the budget allocation pie chart.",
                            "Step 3: Click 'Instant Payment & Launch' to automatically execute the campaigns."
                        ],`);

fs.writeFileSync(enPath, enText, 'utf8');


// Patch ko.js
let koText = fs.readFileSync(koPath, 'utf8');

if (!koText.includes('unified: {')) {
    koText = koText.replace(/const ko = \{/, `const ko = {\n    unified: {\n        whichCategory: "어떤 제품군을 광고하시나요? (카테고리 선택)",\n        catFashion: "👗 패션/의류",\n        catBeauty: "💄 뷰티/화장품",\n        catFood: "🍔 식품/건강",\n        catTech: "💻 가전/디지털",\n        catTravel: "✈️ 여행/숙박",\n        catSoftware: "☁️ 소프트웨어/플랫폼",\n        catGeneral: "🛍️ 기타/종합몰"\n    },`);
}

// Fix menu docs in ko.js to mention the specific categories
koText = koText.replace(/"① Step 1: 상품 카테고리를 선택하고 월 총 투자 예산을 입력"/g, '"① Step 1: 카테고리(패션, 뷰티, 식품, 가전, 여행/숙박, 소프트웨어 등)를 선택하고 월 총 매체 예산을 입력"');
koText = koText.replace(/"① Step 1: 상품 카테고리\(뷰티, 패션, 식품, 전자기기, 여행\/숙박, 소프트웨어 등\)를 선택하고 월 예산 입력"/g, '"① Step 1: 카테고리(패션, 뷰티, 식품, 가전, 여행/숙박, 소프트웨어 등)를 선택하고 월 총 매체 예산을 입력"');

fs.writeFileSync(koPath, koText, 'utf8');

console.log('done patching i18n locales');
