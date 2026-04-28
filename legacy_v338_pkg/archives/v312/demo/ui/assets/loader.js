async function loadJson(path){ const res = await fetch(path); return await res.json(); }
function tableFromObjects(rows){
  if(!rows || !rows.length) return '<div class="muted">No data</div>';
  const cols = Object.keys(rows[0]);
  const head = '<tr>' + cols.map(c=>`<th>${c}</th>`).join('') + '</tr>';
  const body = rows.map(r=>'<tr>'+cols.map(c=>`<td>${JSON.stringify(r[c])}</td>`).join('')+'</tr>').join('');
  return '<table><thead>'+head+'</thead><tbody>'+body+'</tbody></table>';
}
