const fs = require('fs');
const path = require('path');

// 추가할 i18n 키들
const newKeys = {
    grantedScopes: {
        ko: "부여된 권한",
        en: "Granted Scopes",
        ja: "付与された権限",
        zh: "授予的权限",
        "zh-TW": "授予的權限",
        de: "Erteilte Berechtigungen",
        th: "สิทธิ์ที่ได้รับ",
        vi: "Quyền được cấp",
        id: "Izin yang Diberikan",
        ar: "الأذونات الممنوحة",
        es: "Permisos otorgados",
        fr: "Autorisations accordées",
        hi: "दी गई अनुमतियाँ",
        pt: "Permissões concedidas",
        ru: "Предоставленные разрешения"
    },
    tokenExpiry: {
        ko: "토큰 만료",
        en: "Token Expiry",
        ja: "トークン有効期限",
        zh: "令牌过期",
        "zh-TW": "令牌過期",
        de: "Token-Ablauf",
        th: "โทเค็นหมดอายุ",
        vi: "Hết hạn token",
        id: "Kedaluwarsa Token",
        ar: "انتهاء صلاحية الرمز",
        es: "Vencimiento del token",
        fr: "Expiration du jeton",
        hi: "टोकन समाप्ति",
        pt: "Expiração do token",
        ru: "Истечение токена"
    },
    oauthPrompt: {
        ko: "OAuth 인증으로 플랫폼에 연결하세요",
        en: "Connect to platform via OAuth authentication",
        ja: "OAuth認証でプラットフォームに接続",
        zh: "通过OAuth认证连接到平台",
        "zh-TW": "通過OAuth認證連接到平台",
        de: "Über OAuth-Authentifizierung mit Plattform verbinden",
        th: "เชื่อมต่อกับแพลตฟอร์มผ่าน OAuth",
        vi: "Kết nối với nền tảng qua xác thực OAuth",
        id: "Hubungkan ke platform melalui autentikasi OAuth",
        ar: "الاتصال بالمنصة عبر مصادقة OAuth",
        es: "Conectar a la plataforma mediante autenticación OAuth",
        fr: "Se connecter à la plateforme via l'authentification OAuth",
        hi: "OAuth प्रमाणीकरण के माध्यम से प्लेटफ़ॉर्म से कनेक्ट करें",
        pt: "Conectar à plataforma via autenticação OAuth",
        ru: "Подключиться к платформе через OAuth-аутентификацию"
    },
    btnOAuthConnect: {
        ko: "OAuth 연결",
        en: "OAuth Connect",
        ja: "OAuth接続",
        zh: "OAuth连接",
        "zh-TW": "OAuth連接",
        de: "OAuth-Verbindung",
        th: "เชื่อมต่อ OAuth",
        vi: "Kết nối OAuth",
        id: "Hubungkan OAuth",
        ar: "اتصال OAuth",
        es: "Conectar OAuth",
        fr: "Connexion OAuth",
        hi: "OAuth कनेक्ट करें",
        pt: "Conectar OAuth",
        ru: "Подключить OAuth"
    },
    oauthModalTitle: {
        ko: "{{platform}} OAuth 인증",
        en: "{{platform}} OAuth Authorization",
        ja: "{{platform}} OAuth認証",
        zh: "{{platform}} OAuth授权",
        "zh-TW": "{{platform}} OAuth授權",
        de: "{{platform}} OAuth-Autorisierung",
        th: "การอนุญาต OAuth ของ {{platform}}",
        vi: "Ủy quyền OAuth {{platform}}",
        id: "Otorisasi OAuth {{platform}}",
        ar: "تفويض OAuth لـ {{platform}}",
        es: "Autorización OAuth de {{platform}}",
        fr: "Autorisation OAuth {{platform}}",
        hi: "{{platform}} OAuth प्राधिकरण",
        pt: "Autorização OAuth {{platform}}",
        ru: "OAuth-авторизация {{platform}}"
    },
    oauthModalSub: {
        ko: "광고 계정 접근 권한 부여",
        en: "Grant access to your ad account",
        ja: "広告アカウントへのアクセス権を付与",
        zh: "授予对您的广告账户的访问权限",
        "zh-TW": "授予對您的廣告帳戶的訪問權限",
        de: "Zugriff auf Ihr Werbekonto gewähren",
        th: "อนุญาตการเข้าถึงบัญชีโฆษณาของคุณ",
        vi: "Cấp quyền truy cập vào tài khoản quảng cáo của bạn",
        id: "Berikan akses ke akun iklan Anda",
        ar: "منح الوصول إلى حساب الإعلانات الخاص بك",
        es: "Otorgar acceso a su cuenta publicitaria",
        fr: "Accorder l'accès à votre compte publicitaire",
        hi: "अपने विज्ञापन खाते तक पहुंच प्रदान करें",
        pt: "Conceder acesso à sua conta de anúncios",
        ru: "Предоставить доступ к вашему рекламному аккаунту"
    },
    oauthModalDesc: {
        ko: "{{platform}}에 안전하게 연결하여 광고 데이터를 자동으로 수집합니다. 언제든지 연결을 해제할 수 있습니다.",
        en: "Securely connect to {{platform}} to automatically collect ad data. You can disconnect at any time.",
        ja: "{{platform}}に安全に接続して広告データを自動収集します。いつでも接続を解除できます。",
        zh: "安全连接到{{platform}}以自动收集广告数据。您可以随时断开连接。",
        "zh-TW": "安全連接到{{platform}}以自動收集廣告數據。您可以隨時斷開連接。",
        de: "Sicher mit {{platform}} verbinden, um Werbedaten automatisch zu sammeln. Sie können die Verbindung jederzeit trennen.",
        th: "เชื่อมต่ออย่างปลอดภัยกับ {{platform}} เพื่อรวบรวมข้อมูลโฆษณาโดยอัตโนมัติ คุณสามารถยกเลิกการเชื่อมต่อได้ตลอดเวลา",
        vi: "Kết nối an toàn với {{platform}} để tự động thu thập dữ liệu quảng cáo. Bạn có thể ngắt kết nối bất cứ lúc nào.",
        id: "Hubungkan dengan aman ke {{platform}} untuk mengumpulkan data iklan secara otomatis. Anda dapat memutuskan koneksi kapan saja.",
        ar: "اتصل بأمان بـ {{platform}} لجمع بيانات الإعلانات تلقائيًا. يمكنك قطع الاتصال في أي وقت.",
        es: "Conéctese de forma segura a {{platform}} para recopilar datos publicitarios automáticamente. Puede desconectarse en cualquier momento.",
        fr: "Connectez-vous en toute sécurité à {{platform}} pour collecter automatiquement les données publicitaires. Vous pouvez vous déconnecter à tout moment.",
        hi: "विज्ञापन डेटा स्वचालित रूप से एकत्र करने के लिए {{platform}} से सुरक्षित रूप से कनेक्ट करें। आप किसी भी समय डिस्कनेक्ट कर सकते हैं।",
        pt: "Conecte-se com segurança ao {{platform}} para coletar dados de anúncios automaticamente. Você pode desconectar a qualquer momento.",
        ru: "Безопасно подключитесь к {{platform}} для автоматического сбора рекламных данных. Вы можете отключиться в любое время."
    },
    requestedPermissions: {
        ko: "요청된 권한",
        en: "Requested Permissions",
        ja: "要求された権限",
        zh: "请求的权限",
        "zh-TW": "請求的權限",
        de: "Angeforderte Berechtigungen",
        th: "สิทธิ์ที่ร้องขอ",
        vi: "Quyền được yêu cầu",
        id: "Izin yang Diminta",
        ar: "الأذونات المطلوبة",
        es: "Permisos solicitados",
        fr: "Autorisations demandées",
        hi: "अनुरोधित अनुमतियाँ",
        pt: "Permissões solicitadas",
        ru: "Запрошенные разрешения"
    },
    btnCancel: {
        ko: "취소",
        en: "Cancel",
        ja: "キャンセル",
        zh: "取消",
        "zh-TW": "取消",
        de: "Abbrechen",
        th: "ยกเลิก",
        vi: "Hủy",
        id: "Batal",
        ar: "إلغاء",
        es: "Cancelar",
        fr: "Annuler",
        hi: "रद्द करें",
        pt: "Cancelar",
        ru: "Отмена"
    },
    btnAuthorize: {
        ko: "인증하기",
        en: "Authorize",
        ja: "認証する",
        zh: "授权",
        "zh-TW": "授權",
        de: "Autorisieren",
        th: "อนุญาต",
        vi: "Ủy quyền",
        id: "Otorisasi",
        ar: "تفويض",
        es: "Autorizar",
        fr: "Autoriser",
        hi: "प्राधिकृत करें",
        pt: "Autorizar",
        ru: "Авторизовать"
    }
};

// 각 언어 파일에 키 추가
const locales = ['ko', 'en', 'ja', 'zh', 'zh-TW', 'de', 'th', 'vi', 'id', 'ar', 'es', 'fr', 'hi', 'pt', 'ru'];

locales.forEach(locale => {
    const filePath = path.join(__dirname, 'frontend', 'src', 'i18n', 'locales', `${locale}.js`);

    try {
        let content = fs.readFileSync(filePath, 'utf8');

        // conn 섹션 찾기
        const connMatch = content.match(/"conn":\s*\{[\s\S]*?\n\s{2}\}/);

        if (connMatch) {
            const connSection = connMatch[0];

            // 새로운 키들을 conn 섹션 끝에 추가
            let newConnSection = connSection.replace(/(\n\s{2}\})$/, (match) => {
                let additions = '';
                Object.keys(newKeys).forEach(key => {
                    additions += `,\n    "${key}": "${newKeys[key][locale]}"`;
                });
                return additions + match;
            });

            content = content.replace(connSection, newConnSection);

            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ ${locale}.js updated`);
        } else {
            console.log(`⚠️  ${locale}.js: conn section not found`);
        }
    } catch (error) {
        console.error(`❌ Error processing ${locale}.js:`, error.message);
    }
});

console.log('\n✅ i18n keys added successfully!');
