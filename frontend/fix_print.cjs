const fs=require('fs'),path=require('path'),D=path.join(__dirname,'src/i18n/locales');
function a(l,t){const f=path.join(D,l+'.js'),c=fs.readFileSync(f,'utf8'),m=c.match(/export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/),o=eval('('+m[1]+')');if(!o.wms)o.wms={};Object.assign(o.wms,t);fs.writeFileSync(f,'export default '+JSON.stringify(o)+'\n');console.log(l+':'+Object.keys(t).length);}

// Fix WMS print/report buttons with ??? prefix across all locales
const TRANS={
ja:{invcPrintBtn:'🖨️ インボイス印刷',auditPrintBtn:'🖨️ 印刷',auditDiffReport:'📊 差異レポート',pickPrintBtn:'🖨️ 印刷'},
zh:{invcPrintBtn:'🖨️ 打印发票',auditPrintBtn:'🖨️ 打印',auditDiffReport:'📊 差异报告',pickPrintBtn:'🖨️ 打印'},
'zh-TW':{invcPrintBtn:'🖨️ 列印發票',auditPrintBtn:'🖨️ 列印',auditDiffReport:'📊 差異報告',pickPrintBtn:'🖨️ 列印'},
es:{invcPrintBtn:'🖨️ Imprimir factura',auditPrintBtn:'🖨️ Imprimir',auditDiffReport:'📊 Informe diferencias',pickPrintBtn:'🖨️ Imprimir'},
fr:{invcPrintBtn:'🖨️ Imprimer facture',auditPrintBtn:'🖨️ Imprimer',auditDiffReport:'📊 Rapport écarts',pickPrintBtn:'🖨️ Imprimer'},
de:{invcPrintBtn:'🖨️ Rechnung drucken',auditPrintBtn:'🖨️ Drucken',auditDiffReport:'📊 Differenzbericht',pickPrintBtn:'🖨️ Drucken'},
pt:{invcPrintBtn:'🖨️ Imprimir fatura',auditPrintBtn:'🖨️ Imprimir',auditDiffReport:'📊 Relatório diferenças',pickPrintBtn:'🖨️ Imprimir'},
ru:{invcPrintBtn:'🖨️ Печать счёта',auditPrintBtn:'🖨️ Печать',auditDiffReport:'📊 Отчёт расхождений',pickPrintBtn:'🖨️ Печать'},
ar:{invcPrintBtn:'🖨️ طباعة الفاتورة',auditPrintBtn:'🖨️ طباعة',auditDiffReport:'📊 تقرير الفروقات',pickPrintBtn:'🖨️ طباعة'},
hi:{invcPrintBtn:'🖨️ इनवॉइस प्रिंट',auditPrintBtn:'🖨️ प्रिंट',auditDiffReport:'📊 अंतर रिपोर्ट',pickPrintBtn:'🖨️ प्रिंट'},
th:{invcPrintBtn:'🖨️ พิมพ์ใบแจ้งหนี้',auditPrintBtn:'🖨️ พิมพ์',auditDiffReport:'📊 รายงานส่วนต่าง',pickPrintBtn:'🖨️ พิมพ์'},
vi:{invcPrintBtn:'🖨️ In hóa đơn',auditPrintBtn:'🖨️ In',auditDiffReport:'📊 Báo cáo chênh lệch',pickPrintBtn:'🖨️ In'},
id:{invcPrintBtn:'🖨️ Cetak invoice',auditPrintBtn:'🖨️ Cetak',auditDiffReport:'📊 Laporan selisih',pickPrintBtn:'🖨️ Cetak'}
};

Object.entries(TRANS).forEach(([l,t])=>a(l,t));
console.log('Done! Print/report buttons fixed.');
