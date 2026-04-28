const fs=require('fs'),path=require('path'),D=path.join(__dirname,'src/i18n/locales');
function a(l,t){const f=path.join(D,l+'.js'),c=fs.readFileSync(f,'utf8'),m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/),o=eval('('+m[1]+')');if(!o.wms)o.wms={};Object.assign(o.wms,t);fs.writeFileSync(f,'export default '+JSON.stringify(o)+'\n');console.log(l+': '+Object.keys(t).length+' keys');}

// Fix Thai WMS hero title and other broken ?-character keys
a('th',{
    wmsHeroTitle:'WMS ระบบจัดการคลังสินค้าครบวงจร',
    wmsHeroDesc:'จัดการคลังสินค้า · รับ-จ่ายสินค้า · จัดการสต็อก · รวมส่ง · ขนส่ง/พิเศษ · ใบแจ้งหนี้การค้า',
    // Fix sidebar items that show as ???
    heroDesc:'แพลตฟอร์มวิเคราะห์ ROI การตลาดด้วย AI สำหรับการค้าดิจิทัลที่ครบวงจร',
    heroTitle:'Geniego-ROI',
    guideTitle:'คู่มือการใช้งานฉบับสมบูรณ์',
    enabled:'เปิดใช้งาน'
});

// Fix Arabic WMS hero
a('ar',{
    wmsHeroTitle:'إدارة المستودعات WMS المتكاملة',
    wmsHeroDesc:'تسجيل المستودعات · الدخول/الخروج · إدارة المخزون · التجميع · التوصيل/السريع · فاتورة تجارية',
    heroDesc:'منصة تحليل عائد الاستثمار للتسويق بالذكاء الاصطناعي للتجارة الإلكترونية',
    heroTitle:'Geniego-ROI',
    guideTitle:'دليل المستخدم الكامل',
    enabled:'مفعّل'
});

// Fix Hindi WMS hero
a('hi',{
    wmsHeroTitle:'WMS समग्र गोदाम प्रबंधन',
    wmsHeroDesc:'गोदाम पंजीकरण · इनबाउंड/आउटबाउंड · इन्वेंटरी प्रबंधन · बंडल · कूरियर/एक्सप्रेस · वाणिज्यिक इनवॉइस',
    heroDesc:'AI मार्केटिंग ROI विश्लेषण प्लेटफॉर्म डिजिटल कॉमर्स के लिए',
    heroTitle:'Geniego-ROI',
    guideTitle:'संपूर्ण उपयोग मार्गदर्शिका',
    enabled:'सक्रिय'
});

console.log('Done! Hero titles fixed.');
