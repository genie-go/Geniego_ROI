const fs = require('fs');
const path = require('path');
const LOCALE_DIR = path.join(__dirname, 'frontend', 'src', 'i18n', 'locales');

const KEYS = {
    ko: {
        excelImport: '엑셀 일괄등록',
        excelExport: '엑셀 내보내기',
        excelTemplate: '등록양식 다운로드',
        excelImportDone: '{{n}}개 상품 엑셀 일괄 등록 완료',
        excelImportEmpty: '엑셀 파일에 데이터가 없습니다',
        excelImportError: '엑셀 파일 파싱 오류',
        excelExportDone: '{{n}}개 상품 엑셀 내보내기 완료',
        templateDownloaded: '일괄등록 양식 다운로드 완료',
    },
    en: {
        excelImport: 'Excel Bulk Import',
        excelExport: 'Excel Export',
        excelTemplate: 'Download Template',
        excelImportDone: '{{n}} products imported from Excel',
        excelImportEmpty: 'No data in Excel file',
        excelImportError: 'Excel file parsing error',
        excelExportDone: '{{n}} products exported to Excel',
        templateDownloaded: 'Bulk import template downloaded',
    },
    ja: {
        excelImport: 'Excel一括登録',
        excelExport: 'Excelエクスポート',
        excelTemplate: 'テンプレートDL',
        excelImportDone: '{{n}}件の商品をExcelから一括登録しました',
        excelImportEmpty: 'Excelファイルにデータがありません',
        excelImportError: 'Excelファイル解析エラー',
        excelExportDone: '{{n}}件の商品をExcelにエクスポートしました',
        templateDownloaded: '一括登録テンプレートをダウンロードしました',
    },
    zh: {
        excelImport: 'Excel批量导入',
        excelExport: 'Excel导出',
        excelTemplate: '下载模板',
        excelImportDone: '{{n}}个商品Excel批量导入完成',
        excelImportEmpty: 'Excel文件中没有数据',
        excelImportError: 'Excel文件解析错误',
        excelExportDone: '{{n}}个商品Excel导出完成',
        templateDownloaded: '批量导入模板已下载',
    },
    'zh-TW': {
        excelImport: 'Excel批量匯入',
        excelExport: 'Excel匯出',
        excelTemplate: '下載範本',
        excelImportDone: '{{n}}個商品Excel批量匯入完成',
        excelImportEmpty: 'Excel檔案中沒有資料',
        excelImportError: 'Excel檔案解析錯誤',
        excelExportDone: '{{n}}個商品Excel匯出完成',
        templateDownloaded: '批量匯入範本已下載',
    },
    de: {
        excelImport: 'Excel-Massenimport',
        excelExport: 'Excel-Export',
        excelTemplate: 'Vorlage herunterladen',
        excelImportDone: '{{n}} Produkte aus Excel importiert',
        excelImportEmpty: 'Keine Daten in der Excel-Datei',
        excelImportError: 'Excel-Datei Parsing-Fehler',
        excelExportDone: '{{n}} Produkte nach Excel exportiert',
        templateDownloaded: 'Massenimport-Vorlage heruntergeladen',
    },
    th: {
        excelImport: 'นำเข้า Excel จำนวนมาก',
        excelExport: 'ส่งออก Excel',
        excelTemplate: 'ดาวน์โหลดแม่แบบ',
        excelImportDone: 'นำเข้า {{n}} สินค้าจาก Excel แล้ว',
        excelImportEmpty: 'ไม่มีข้อมูลในไฟล์ Excel',
        excelImportError: 'ข้อผิดพลาดในการแยกวิเคราะห์ไฟล์ Excel',
        excelExportDone: 'ส่งออก {{n}} สินค้าเป็น Excel แล้ว',
        templateDownloaded: 'ดาวน์โหลดแม่แบบนำเข้าจำนวนมากแล้ว',
    },
    vi: {
        excelImport: 'Nhập Excel hàng loạt',
        excelExport: 'Xuất Excel',
        excelTemplate: 'Tải mẫu',
        excelImportDone: 'Đã nhập {{n}} sản phẩm từ Excel',
        excelImportEmpty: 'Không có dữ liệu trong tệp Excel',
        excelImportError: 'Lỗi phân tích tệp Excel',
        excelExportDone: 'Đã xuất {{n}} sản phẩm sang Excel',
        templateDownloaded: 'Đã tải mẫu nhập hàng loạt',
    },
    id: {
        excelImport: 'Impor Massal Excel',
        excelExport: 'Ekspor Excel',
        excelTemplate: 'Unduh Template',
        excelImportDone: '{{n}} produk diimpor dari Excel',
        excelImportEmpty: 'Tidak ada data dalam file Excel',
        excelImportError: 'Kesalahan parsing file Excel',
        excelExportDone: '{{n}} produk diekspor ke Excel',
        templateDownloaded: 'Template impor massal telah diunduh',
    },
};

let total = 0;
for (const [lang, keys] of Object.entries(KEYS)) {
    const file = path.join(LOCALE_DIR, `${lang}.js`);
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf-8');
    let injected = 0;
    for (const [key, value] of Object.entries(keys)) {
        if (content.includes(`${key}:`)) continue;
        const marker = 'schedSaveBtn:';
        const alt = 'templateDownloaded:';
        const alt2 = 'csvImportError:';
        const search = content.includes(marker) ? marker : (content.includes(alt) ? alt : (content.includes(alt2) ? alt2 : 'heroDesc:'));
        const idx = content.lastIndexOf(search);
        if (idx === -1) continue;
        const lineEnd = content.indexOf('\n', idx);
        if (lineEnd === -1) continue;
        const escaped = value.replace(/'/g, "\\'");
        content = content.slice(0, lineEnd) + `\n        ${key}: '${escaped}',` + content.slice(lineEnd);
        injected++;
    }
    if (injected > 0) { fs.writeFileSync(file, content, 'utf-8'); total += injected; console.log(`✅ ${lang}.js — ${injected} keys`); }
}
console.log(`📊 Total: ${total}`);
