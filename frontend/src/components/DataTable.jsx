import React from "react";

export default function DataTable({ title, columns, rows, rowActions }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
      <table className="table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            {rowActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              {columns.map((c) => (
                <td key={c.key}>{String(r[c.key] ?? "")}</td>
              ))}
              {rowActions && <td>{rowActions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
