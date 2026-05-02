const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];
const KEYS={
  ko:{platformPopup:'웹 팝업',platformKakao:'카카오 채널',aiImagePh:'AI 이미지 설명 (예: 여름 해변 배경에 선글라스와 서핑보드)'},
  en:{platformPopup:'Web Popup',platformKakao:'Kakao Channel',aiImagePh:'AI image description (e.g. summer beach with sunglasses)'},
  ja:{platformPopup:'Webポップアップ',platformKakao:'カカオチャネル',aiImagePh:'AI画像説明 (例: 夏のビーチにサングラス)'},
  zh:{platformPopup:'网页弹窗',platformKakao:'Kakao频道',aiImagePh:'AI图片描述 (例: 夏日海滩太阳镜)'},
  'zh-TW':{platformPopup:'網頁彈窗',platformKakao:'Kakao頻道',aiImagePh:'AI圖片描述'},
  de:{platformPopup:'Web-Popup',platformKakao:'Kakao-Kanal',aiImagePh:'KI-Bildbeschreibung'},
  th:{platformPopup:'เว็บป๊อปอัพ',platformKakao:'Kakao Channel',aiImagePh:'คำอธิบายรูปภาพ AI'},
  vi:{platformPopup:'Web Popup',platformKakao:'Kakao Channel',aiImagePh:'Mô tả hình ảnh AI'},
  id:{platformPopup:'Web Popup',platformKakao:'Kakao Channel',aiImagePh:'Deskripsi gambar AI'}
};

LANGS.forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  const keys = KEYS[lang] || KEYS.en;
  
  Object.entries(keys).forEach(([k, v]) => {
    if (code.indexOf(`${k}:"`) < 0 && code.indexOf(`${k}:'`) < 0) {
      const idx = code.indexOf('webPopup:{');
      if (idx > 0) {
        const pos = idx + 10;
        code = code.substring(0, pos) + `${k}:"${v}",` + code.substring(pos);
      }
    }
  });
  
  fs.writeFileSync(file, code, 'utf8');
  try {
    const fn = new Function(code.replace('export default', 'return'));
    const o = fn();
    console.log(`✅ ${lang}: platformPopup=${o.webPopup?.platformPopup}, aiImagePh=${(o.webPopup?.aiImagePh||'').substring(0,30)}`);
  } catch (e) {
    console.log(`❌ ${lang}: ${e.message.substring(0, 80)}`);
  }
});
