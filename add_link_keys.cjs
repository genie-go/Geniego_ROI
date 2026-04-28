const fs=require('fs'),path=require('path');
const DIR=path.join(__dirname,'frontend/src/i18n/locales');
const LANGS=['ko','en','ja','zh','zh-TW','de','th','vi','id'];

const KEYS={
ko:{linkUrl:'바로가기 URL',linkUrlPh:'https://example.com/landing-page',linkUrlDesc:'팝업 클릭 시 이동할 랜딩 페이지 URL',linkEnabled:'바로가기 링크 사용',linkOpen:'새 탭에서 열기',linkBadge:'바로가기',linkCopy:'URL 복사',linkCopied:'복사완료!'},
en:{linkUrl:'Shortcut URL',linkUrlPh:'https://example.com/landing-page',linkUrlDesc:'Landing page URL to redirect when popup is clicked',linkEnabled:'Enable Shortcut Link',linkOpen:'Open in New Tab',linkBadge:'Shortcut',linkCopy:'Copy URL',linkCopied:'Copied!'},
ja:{linkUrl:'ショートカットURL',linkUrlPh:'https://example.com/landing-page',linkUrlDesc:'ポップアップクリック時のランディングページURL',linkEnabled:'ショートカットリンク有効',linkOpen:'新しいタブで開く',linkBadge:'ショートカット',linkCopy:'URLコピー',linkCopied:'コピー完了!'},
zh:{linkUrl:'快捷链接URL',linkUrlPh:'https://example.com/landing-page',linkUrlDesc:'点击弹窗时跳转的目标页面URL',linkEnabled:'启用快捷链接',linkOpen:'新标签页打开',linkBadge:'快捷',linkCopy:'复制URL',linkCopied:'已复制!'},
'zh-TW':{linkUrl:'快捷連結URL',linkUrlPh:'https://example.com/landing-page',linkUrlDesc:'點擊彈窗時跳轉的目標頁面',linkEnabled:'啟用快捷連結',linkOpen:'新分頁開啟',linkBadge:'快捷',linkCopy:'複製URL',linkCopied:'已複製!'},
de:{linkUrl:'Shortcut-URL',linkUrlPh:'https://example.com/landing-page',linkUrlDesc:'Ziel-URL beim Klick auf das Popup',linkEnabled:'Shortcut-Link aktivieren',linkOpen:'In neuem Tab öffnen',linkBadge:'Shortcut',linkCopy:'URL kopieren',linkCopied:'Kopiert!'},
th:{linkUrl:'URL ทางลัด',linkUrlPh:'https://example.com/landing-page',linkUrlDesc:'URL หน้า Landing เมื่อคลิกป๊อปอัพ',linkEnabled:'เปิดใช้ลิงก์ทางลัด',linkOpen:'เปิดแท็บใหม่',linkBadge:'ทางลัด',linkCopy:'คัดลอก URL',linkCopied:'คัดลอกแล้ว!'},
vi:{linkUrl:'URL Truy cập nhanh',linkUrlPh:'https://example.com/landing-page',linkUrlDesc:'URL trang đích khi click popup',linkEnabled:'Bật liên kết nhanh',linkOpen:'Mở tab mới',linkBadge:'Truy cập',linkCopy:'Sao chép URL',linkCopied:'Đã sao chép!'},
id:{linkUrl:'URL Pintasan',linkUrlPh:'https://example.com/landing-page',linkUrlDesc:'URL halaman tujuan saat popup diklik',linkEnabled:'Aktifkan Tautan Pintasan',linkOpen:'Buka di Tab Baru',linkBadge:'Pintasan',linkCopy:'Salin URL',linkCopied:'Disalin!'}
};

function findBlockEnd(code,startBrace){let d=0,s=false,e=false;for(let i=startBrace;i<code.length;i++){const c=code[i];if(e){e=false;continue}if(c==='\\'&&s){e=true;continue}if(s){if(c==='"')s=false;continue}if(c==='"'){s=true;continue}if(c==='{')d++;if(c==='}'){d--;if(d===0)return i}}return -1}

LANGS.forEach(lang=>{
  const file=path.join(DIR,`${lang}.js`);
  let code=fs.readFileSync(file,'utf8');
  const keys=KEYS[lang]||KEYS.en;
  
  // Find webPopup block and insert keys
  const idx=code.indexOf('webPopup:{');
  if(idx>0){
    const pos=idx+10;
    const entries=Object.entries(keys).map(([k,v])=>`${k}:"${v}"`).join(',');
    code=code.substring(0,pos)+entries+','+code.substring(pos);
  }
  
  fs.writeFileSync(file,code,'utf8');
  try{
    const fn=new Function(code.replace('export default','return'));
    const o=fn();
    console.log(`✅ ${lang}: linkUrl=${o.webPopup?.linkUrl}, linkEnabled=${o.webPopup?.linkEnabled}`);
  }catch(e){console.log(`❌ ${lang}: ${e.message.substring(0,80)}`)}
});
