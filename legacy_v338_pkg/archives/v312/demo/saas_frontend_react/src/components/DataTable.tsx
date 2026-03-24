import React from "react";

type Props<T> = {
  rows: T[];
  columns: { key: keyof T; label: string; render?: (v: any, row: T) => React.ReactNode }[];
  rowKey: (r: T) => string;
  searchKeys?: (keyof T)[];
  bulkActions?: { label: string; kind?: "primary"|"danger"; onRun: (selected: T[]) => void }[];
};

export function DataTable<T extends object>({ rows, columns, rowKey, searchKeys, bulkActions }: Props<T>) {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    const keys = searchKeys?.length ? searchKeys : (Object.keys(rows[0] ?? {}) as (keyof T)[]);
    return rows.filter(r => keys.some(k => String((r as any)[k] ?? "").toLowerCase().includes(qq)));
  }, [rows, q, searchKeys]);

  const selectedRows = filtered.filter(r => selected[rowKey(r)]);
  const toggleAll = (on: boolean) => {
    const next: Record<string, boolean> = { ...selected };
    filtered.forEach(r => { next[rowKey(r)] = on; });
    setSelected(next);
  };

  return (
    <div>
      <div className="toolbar" style={{marginBottom:10}}>
        <input className="input" style={{width:320}} value={q} onChange={e=>setQ(e.target.value)} placeholder="필터/검색…" />
        {bulkActions?.map((a, idx) => (
          <button key={idx} className={"btn "+(a.kind==="primary"?"primary":a.kind==="danger"?"danger":"")} disabled={selectedRows.length===0}
                  onClick={()=>a.onRun(selectedRows)}>
            {a.label} ({selectedRows.length})
          </button>
        ))}
        <span className="badge">rows: {filtered.length}</span>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th style={{width:34}}>
              <input type="checkbox" onChange={e=>toggleAll(e.target.checked)} />
            </th>
            {columns.map(c => <th key={String(c.key)}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={rowKey(r)}>
              <td><input type="checkbox" checked={!!selected[rowKey(r)]} onChange={e=>setSelected(s=>({...s,[rowKey(r)]:e.target.checked}))} /></td>
              {columns.map(c => (
                <td key={String(c.key)}>{c.render ? c.render((r as any)[c.key], r) : String((r as any)[c.key] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
