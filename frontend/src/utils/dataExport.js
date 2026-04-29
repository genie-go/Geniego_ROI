/**
 * Enterprise Data Export Utility
 * ================================
 * CSV/JSON export from any data array
 * Used across all table components
 */

/**
 * Export data as CSV file download
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Filename without extension
 * @param {Array<string>} [columns] - Column keys to include (defaults to all)
 */
export function exportCSV(data, filename = 'export', columns) {
  if (!data || !data.length) return;

  const keys = columns || Object.keys(data[0]);

  // Header row
  const header = keys.map(k => `"${String(k).replace(/"/g, '""')}"`).join(',');

  // Data rows
  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k];
      if (val == null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });

  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export data as JSON file download
 */
export function exportJSON(data, filename = 'export') {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Trigger file download from Blob
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Format data for print-friendly view
 */
export function printTable(data, title = 'Report', columns) {
  if (!data || !data.length) return;
  const keys = columns || Object.keys(data[0]);

  const html = `
    <!DOCTYPE html>
    <html><head>
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        .meta { font-size: 11px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; border: 1px solid #e2e8f0; }
        td { padding: 6px 10px; border: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <h1>${title}</h1>
      <div class="meta">Generated: ${new Date().toLocaleString()} · ${data.length} records · GeniegoROI</div>
      <table>
        <thead><tr>${keys.map(k => `<th>${k}</th>`).join('')}</tr></thead>
        <tbody>${data.map(row => `<tr>${keys.map(k => `<td>${row[k] ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </body></html>
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.print();
}

export default { exportCSV, exportJSON, printTable };
