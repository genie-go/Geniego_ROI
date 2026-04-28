/**
 * CSV Import/Export + Schedule i18n 키 주입 스크립트 (9개 언어)
 */
const fs = require('fs');
const path = require('path');

const LOCALE_DIR = path.join(__dirname, 'frontend', 'src', 'i18n', 'locales');

const NEW_KEYS = {
    ko: {
        csvExport: 'CSV 내보내기',
        csvImport: 'CSV 가져오기',
        csvExportDone: '{{n}}개 상품 CSV 내보내기 완료',
        csvImportDone: '{{n}}개 상품 CSV 가져오기 완료',
        csvImportEmpty: 'CSV 파일에 데이터가 없습니다',
        csvImportError: 'CSV 파일 파싱 오류',
        scheduleTitle: '자동 동기화 스케줄',
        schedFreq30m: '30분마다',
        schedFreq1h: '1시간마다',
        schedFreq6h: '6시간마다',
        schedFreq12h: '12시간마다',
        schedFreqDaily: '매일',
        schedEnabled: '활성화',
        schedSaveBtn: '스케줄 저장',
    },
    en: {
        csvExport: 'CSV Export',
        csvImport: 'CSV Import',
        csvExportDone: '{{n}} products exported to CSV',
        csvImportDone: '{{n}} products imported from CSV',
        csvImportEmpty: 'No data in CSV file',
        csvImportError: 'CSV file parsing error',
        scheduleTitle: 'Auto Sync Schedule',
        schedFreq30m: 'Every 30 min',
        schedFreq1h: 'Every 1 hour',
        schedFreq6h: 'Every 6 hours',
        schedFreq12h: 'Every 12 hours',
        schedFreqDaily: 'Daily',
        schedEnabled: 'Enabled',
        schedSaveBtn: 'Save Schedule',
    },
    ja: {
        csvExport: 'CSVエクスポート',
        csvImport: 'CSVインポート',
        csvExportDone: '{{n}}件の商品をCSVにエクスポートしました',
        csvImportDone: '{{n}}件の商品をCSVからインポートしました',
        csvImportEmpty: 'CSVファイルにデータがありません',
        csvImportError: 'CSVファイル解析エラー',
        scheduleTitle: '自動同期スケジュール',
        schedFreq30m: '30分ごと',
        schedFreq1h: '1時間ごと',
        schedFreq6h: '6時間ごと',
        schedFreq12h: '12時間ごと',
        schedFreqDaily: '毎日',
        schedEnabled: '有効',
        schedSaveBtn: 'スケジュール保存',
    },
    zh: {
        csvExport: 'CSV导出',
        csvImport: 'CSV导入',
        csvExportDone: '{{n}}个商品CSV导出完成',
        csvImportDone: '{{n}}个商品CSV导入完成',
        csvImportEmpty: 'CSV文件中没有数据',
        csvImportError: 'CSV文件解析错误',
        scheduleTitle: '自动同步计划',
        schedFreq30m: '每30分钟',
        schedFreq1h: '每1小时',
        schedFreq6h: '每6小时',
        schedFreq12h: '每12小时',
        schedFreqDaily: '每天',
        schedEnabled: '启用',
        schedSaveBtn: '保存计划',
    },
    'zh-TW': {
        csvExport: 'CSV匯出',
        csvImport: 'CSV匯入',
        csvExportDone: '{{n}}個商品CSV匯出完成',
        csvImportDone: '{{n}}個商品CSV匯入完成',
        csvImportEmpty: 'CSV檔案中沒有資料',
        csvImportError: 'CSV檔案解析錯誤',
        scheduleTitle: '自動同步排程',
        schedFreq30m: '每30分鐘',
        schedFreq1h: '每1小時',
        schedFreq6h: '每6小時',
        schedFreq12h: '每12小時',
        schedFreqDaily: '每天',
        schedEnabled: '啟用',
        schedSaveBtn: '儲存排程',
    },
    de: {
        csvExport: 'CSV-Export',
        csvImport: 'CSV-Import',
        csvExportDone: '{{n}} Produkte CSV-exportiert',
        csvImportDone: '{{n}} Produkte CSV-importiert',
        csvImportEmpty: 'Keine Daten in CSV-Datei',
        csvImportError: 'CSV-Datei Parsing-Fehler',
        scheduleTitle: 'Auto-Sync-Zeitplan',
        schedFreq30m: 'Alle 30 Min.',
        schedFreq1h: 'Jede Stunde',
        schedFreq6h: 'Alle 6 Stunden',
        schedFreq12h: 'Alle 12 Stunden',
        schedFreqDaily: 'Täglich',
        schedEnabled: 'Aktiviert',
        schedSaveBtn: 'Zeitplan speichern',
    },
    th: {
        csvExport: 'ส่งออก CSV',
        csvImport: 'นำเข้า CSV',
        csvExportDone: 'ส่งออก {{n}} สินค้าเป็น CSV แล้ว',
        csvImportDone: 'นำเข้า {{n}} สินค้าจาก CSV แล้ว',
        csvImportEmpty: 'ไม่มีข้อมูลในไฟล์ CSV',
        csvImportError: 'ข้อผิดพลาดในการแยกวิเคราะห์ไฟล์ CSV',
        scheduleTitle: 'กำหนดเวลาซิงค์อัตโนมัติ',
        schedFreq30m: 'ทุก 30 นาที',
        schedFreq1h: 'ทุก 1 ชั่วโมง',
        schedFreq6h: 'ทุก 6 ชั่วโมง',
        schedFreq12h: 'ทุก 12 ชั่วโมง',
        schedFreqDaily: 'ทุกวัน',
        schedEnabled: 'เปิดใช้งาน',
        schedSaveBtn: 'บันทึกกำหนดเวลา',
    },
    vi: {
        csvExport: 'Xuất CSV',
        csvImport: 'Nhập CSV',
        csvExportDone: 'Đã xuất {{n}} sản phẩm CSV',
        csvImportDone: 'Đã nhập {{n}} sản phẩm từ CSV',
        csvImportEmpty: 'Không có dữ liệu trong tệp CSV',
        csvImportError: 'Lỗi phân tích tệp CSV',
        scheduleTitle: 'Lịch đồng bộ tự động',
        schedFreq30m: 'Mỗi 30 phút',
        schedFreq1h: 'Mỗi 1 giờ',
        schedFreq6h: 'Mỗi 6 giờ',
        schedFreq12h: 'Mỗi 12 giờ',
        schedFreqDaily: 'Hàng ngày',
        schedEnabled: 'Bật',
        schedSaveBtn: 'Lưu lịch trình',
    },
    id: {
        csvExport: 'Ekspor CSV',
        csvImport: 'Impor CSV',
        csvExportDone: '{{n}} produk diekspor ke CSV',
        csvImportDone: '{{n}} produk diimpor dari CSV',
        csvImportEmpty: 'Tidak ada data dalam file CSV',
        csvImportError: 'Kesalahan parsing file CSV',
        scheduleTitle: 'Jadwal Sinkronisasi Otomatis',
        schedFreq30m: 'Setiap 30 menit',
        schedFreq1h: 'Setiap 1 jam',
        schedFreq6h: 'Setiap 6 jam',
        schedFreq12h: 'Setiap 12 jam',
        schedFreqDaily: 'Setiap hari',
        schedEnabled: 'Aktif',
        schedSaveBtn: 'Simpan Jadwal',
    },
};

let totalInjected = 0;

for (const [lang, keys] of Object.entries(NEW_KEYS)) {
    const file = path.join(LOCALE_DIR, `${lang}.js`);
    if (!fs.existsSync(file)) { console.log(`⚠️ ${lang}.js not found`); continue; }

    let content = fs.readFileSync(file, 'utf-8');
    let injected = 0;

    // Find catalogSync section and inject keys
    for (const [key, value] of Object.entries(keys)) {
        const fullKey = `${key}:`;
        if (content.includes(`${key}:`)) continue; // already exists

        // Find last key in catalogSync section
        const marker = 'guideStep4Desc:';
        const altMarker = 'guideTip3:';
        const searchFor = content.includes(marker) ? marker : (content.includes(altMarker) ? altMarker : 'heroDesc:');

        const idx = content.lastIndexOf(searchFor);
        if (idx === -1) continue;

        // Find end of line after marker
        const lineEnd = content.indexOf('\n', idx);
        if (lineEnd === -1) continue;

        const escapedValue = value.replace(/'/g, "\\'");
        const injection = `\n        ${key}: '${escapedValue}',`;
        content = content.slice(0, lineEnd) + injection + content.slice(lineEnd);
        injected++;
    }

    if (injected > 0) {
        fs.writeFileSync(file, content, 'utf-8');
        totalInjected += injected;
        console.log(`✅ ${lang}.js — ${injected} keys injected`);
    } else {
        console.log(`⏭️ ${lang}.js — all keys exist`);
    }
}

console.log(`\n📊 Total: ${totalInjected} keys injected across ${Object.keys(NEW_KEYS).length} locales`);
