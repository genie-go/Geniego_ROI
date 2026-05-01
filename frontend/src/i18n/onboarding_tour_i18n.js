/**
 * 온보딩 투어 다국어 번역
 * 이 파일을 각 언어 파일(ko.js, en.js 등)의 onboarding 섹션에 추가하세요
 */

export const onboardingTourTranslations = {
    ko: {
        tour: {
            skip: '건너뛰기',
            next: '다음',
            finish: '시작하기',
            welcome: {
                title: '지니고 ROI에 오신 것을 환영합니다! 👋',
                desc: '마케팅 ROI 최적화를 위한 올인원 플랫폼입니다. 주요 기능을 빠르게 둘러보겠습니다.',
            },
            dashboard: {
                title: '대시보드에서 모든 것을 한눈에',
                desc: '실시간 KPI, 채널별 성과, 예산 현황을 통합 대시보드에서 확인하세요.',
            },
            marketing: {
                title: 'AI 마케팅 자동화',
                desc: 'AI가 캠페인을 자동으로 최적화하고, 예산을 효율적으로 배분합니다.',
            },
            integration: {
                title: '채널 연동하기',
                desc: 'Meta, Google, TikTok, Naver 등 주요 광고 채널을 연결하여 데이터를 통합 관리하세요.',
            },
            complete: {
                title: '준비 완료! 🎉',
                desc: '이제 지니고 ROI의 모든 기능을 사용할 수 있습니다. 궁금한 점이 있으면 언제든지 도움말을 참고하세요.',
            },
        },
    },
    en: {
        tour: {
            skip: 'Skip',
            next: 'Next',
            finish: 'Get Started',
            welcome: {
                title: 'Welcome to Geniego ROI! 👋',
                desc: 'An all-in-one platform for marketing ROI optimization. Let\'s take a quick tour of key features.',
            },
            dashboard: {
                title: 'See Everything at a Glance',
                desc: 'Monitor real-time KPIs, channel performance, and budget status on the unified dashboard.',
            },
            marketing: {
                title: 'AI Marketing Automation',
                desc: 'AI automatically optimizes campaigns and allocates budgets efficiently.',
            },
            integration: {
                title: 'Connect Your Channels',
                desc: 'Integrate major ad channels like Meta, Google, TikTok, and Naver to manage data centrally.',
            },
            complete: {
                title: 'You\'re All Set! 🎉',
                desc: 'You can now use all features of Geniego ROI. Check the help section anytime if you have questions.',
            },
        },
    },
    ja: {
        tour: {
            skip: 'スキップ',
            next: '次へ',
            finish: '始める',
            welcome: {
                title: 'Geniego ROIへようこそ！👋',
                desc: 'マーケティングROI最適化のためのオールインワンプラットフォームです。主要機能を簡単にご案内します。',
            },
            dashboard: {
                title: 'ダッシュボードで一目瞭然',
                desc: 'リアルタイムKPI、チャネル別パフォーマンス、予算状況を統合ダッシュボードで確認できます。',
            },
            marketing: {
                title: 'AIマーケティング自動化',
                desc: 'AIがキャンペーンを自動最適化し、予算を効率的に配分します。',
            },
            integration: {
                title: 'チャネル連携',
                desc: 'Meta、Google、TikTok、Naverなどの主要広告チャネルを接続してデータを統合管理します。',
            },
            complete: {
                title: '準備完了！🎉',
                desc: 'Geniego ROIのすべての機能をご利用いただけます。ご不明な点がございましたら、いつでもヘルプをご参照ください。',
            },
        },
    },
    zh: {
        tour: {
            skip: '跳过',
            next: '下一步',
            finish: '开始使用',
            welcome: {
                title: '欢迎使用 Geniego ROI！👋',
                desc: '营销ROI优化的一体化平台。让我们快速浏览主要功能。',
            },
            dashboard: {
                title: '仪表板一览全局',
                desc: '在统一仪表板上查看实时KPI、渠道表现和预算状况。',
            },
            marketing: {
                title: 'AI营销自动化',
                desc: 'AI自动优化营销活动并高效分配预算。',
            },
            integration: {
                title: '连接渠道',
                desc: '集成Meta、Google、TikTok、Naver等主要广告渠道，集中管理数据。',
            },
            complete: {
                title: '准备就绪！🎉',
                desc: '现在您可以使用Geniego ROI的所有功能。如有疑问，请随时查看帮助部分。',
            },
        },
    },
};

// 사용 예시:
// import { onboardingTourTranslations } from './onboarding_tour_i18n.js';
//
// ko.js에 추가:
// export default {
//   ...existingTranslations,
//   onboarding: {
//     ...existingOnboarding,
//     ...onboardingTourTranslations.ko,
//   },
// };
