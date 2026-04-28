const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'frontend/src/i18n/locales');
const KEYS_BY_LANG = {
  ko: { ihubLinked: '채널 연동됨', ihubAutoDetect: '연동허브에서 자동 감지된 SMS 채널:', noHistory: '발송 이력이 없습니다.' },
  en: { ihubLinked: 'Channels Linked', ihubAutoDetect: 'Auto-detected SMS channels from Integration Hub:', noHistory: 'No message history found.' },
  ja: { ihubLinked: 'チャネル連携済み', ihubAutoDetect: '統合ハブから自動検出されたSMSチャネル：', noHistory: '送信履歴がありません。' },
  zh: { ihubLinked: '频道已连接', ihubAutoDetect: '从集成中心自动检测到的短信频道：', noHistory: '暂无发送记录。' },
  'zh-TW': { ihubLinked: '頻道已連接', ihubAutoDetect: '從整合中心自動偵測到的簡訊頻道：', noHistory: '暫無發送記錄。' },
  de: { ihubLinked: 'Kanäle verbunden', ihubAutoDetect: 'Automatisch erkannte SMS-Kanäle:', noHistory: 'Kein Sendeverlauf.' },
  th: { ihubLinked: 'เชื่อมต่อแล้ว', ihubAutoDetect: 'ช่อง SMS ที่ตรวจพบอัตโนมัติ:', noHistory: 'ไม่พบประวัติการส่ง' },
  vi: { ihubLinked: 'Kênh đã kết nối', ihubAutoDetect: 'Kênh SMS tự động phát hiện:', noHistory: 'Không tìm thấy lịch sử.' },
  id: { ihubLinked: 'Saluran Terhubung', ihubAutoDetect: 'Saluran SMS terdeteksi otomatis:', noHistory: 'Tidak ada riwayat.' },
};

['ko','en','ja','zh','zh-TW','de','th','vi','id'].forEach(lang => {
  const file = path.join(DIR, `${lang}.js`);
  let code = fs.readFileSync(file, 'utf8');
  const keys = KEYS_BY_LANG[lang] || KEYS_BY_LANG.en;
  let added = 0;
  for (const [k, v] of Object.entries(keys)) {
    if (code.includes(`'${k}':`)) continue;
    // Find last entry in sms block
    const idx = code.lastIndexOf("sms:");
    if (idx < 0) continue;
    // find the closing brace of sms block
    let braceCount = 0;
    let startBrace = -1;
    for (let i = idx; i < code.length; i++) {
      if (code[i] === '{') { braceCount++; if (startBrace < 0) startBrace = i; }
      if (code[i] === '}') { braceCount--; if (braceCount === 0) {
        // Insert before closing brace
        const safeVal = v.replace(/'/g, "\\'");
        code = code.slice(0, i) + `    '${k}': '${safeVal}',\n    ` + code.slice(i);
        added++;
        break;
      }}
    }
  }
  fs.writeFileSync(file, code, 'utf8');
  console.log(`✅ ${lang}: ${added} new keys`);
});
console.log('Done!');
