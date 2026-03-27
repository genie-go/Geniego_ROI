import React, { useEffect, useMemo, useRef, useState } from "react";

// Tree model:
// { combinator:"AND"|"OR", conditions:[{metric,operator,threshold,id}], groups:[Group], id }
// V409 enhancements:
// - Insertion preview during drag (placeholder line + highlight)
// - Keyboard editing: select node, Ctrl+ArrowUp/Down reorder within parent, Delete removes, Enter quick-edit
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function normalizeGroup(g) {
  const gg = { ...g };
  if (!gg.id) gg.id = uid();
  gg.combinator = gg.combinator || "AND";
  gg.conditions = (gg.conditions || []).map((c) => ({
    id: c.id || uid(),
    metric: c.metric || "roas",
    operator: c.operator || "lt",
    threshold: c.threshold ?? 1,
  }));
  gg.groups = (gg.groups || []).map(normalizeGroup);
  return gg;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function findGroup(root, groupId) {
  if (root.id === groupId) return root;
  for (const g of root.groups || []) {
    const r = findGroup(g, groupId);
    if (r) return r;
  }
  return null;
}

function removeCondition(root, condId) {
  root.conditions = (root.conditions || []).filter((c) => c.id !== condId);
  for (const g of root.groups || []) removeCondition(g, condId);
}

function removeGroup(root, groupId) {
  root.groups = (root.groups || []).filter((g) => g.id !== groupId);
  for (const g of root.groups || []) removeGroup(g, groupId);
}

function findParentOfCondition(root, condId) {
  if ((root.conditions || []).some((c) => c.id === condId)) return root;
  for (const g of root.groups || []) {
    const p = findParentOfCondition(g, condId);
    if (p) return p;
  }
  return null;
}

function findParentOfGroup(root, groupId) {
  if ((root.groups || []).some((g) => g.id === groupId)) return root;
  for (const g of root.groups || []) {
    const p = findParentOfGroup(g, groupId);
    if (p) return p;
  }
  return null;
}

function metricLabel(m) {
  const mm = (m || "").toLowerCase();
  const map = {
    roas: "ROAS",
    spend: "Spend",
    revenue: "Revenue",
    ctr: "CTR",
    cvr: "CVR",
    orders: "Orders",
    refunds: "Refunds",
    views: "Views",
    engagement_rate: "Engagement",
  };
  return map[mm] || m;
}

function operatorLabel(op) {
  const map = { lt: "<", lte: "≤", gt: ">", gte: "≥", pct_change_lt: "Δ% <", pct_change_gt: "Δ% >", abs_pct_change_gt: "|Δ%| >" };
  return map[op] || op;
}

export default function PolicyTreeEditor({ value, onChange }) {
  const root = useMemo(() => normalizeGroup(value || { combinator: "AND", conditions: [], groups: [] }), [value]);
  const containerRef = useRef(null);

  const [selected, setSelected] = useState(null); // {type:"cond"|"group", id}
  const [dragging, setDragging] = useState(null); // {type, id, fromGroupId}
  const [dropHint, setDropHint] = useState(null); // {type:"cond"|"group", groupId, index, pos:"before"|"after"}

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      if (!selected) return;
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key;

      if (key === "Delete" || key === "Backspace") {
        e.preventDefault();
        const next = clone(root);
        if (selected.type === "cond") removeCondition(next, selected.id);
        if (selected.type === "group") removeGroup(next, selected.id);
        onChange(next);
        setSelected(null);
        return;
      }

      if (key === "Enter") {
        e.preventDefault();
        const next = clone(root);
        if (selected.type === "cond") {
          const parent = findParentOfCondition(next, selected.id);
          const cond = (parent?.conditions || []).find((c) => c.id === selected.id);
          if (!cond) return;
          const metric = prompt("Metric (roas/spend/revenue/ctr/cvr/orders/refunds/views/engagement_rate):", cond.metric);
          if (metric) cond.metric = metric;
          const op = prompt("Operator (lt/lte/gt/gte/pct_change_lt/pct_change_gt/abs_pct_change_gt):", cond.operator);
          if (op) cond.operator = op;
          const thr = prompt("Threshold:", String(cond.threshold ?? 0));
          if (thr !== null && thr !== undefined && thr !== "") cond.threshold = Number(thr);
          onChange(next);
        } else if (selected.type === "group") {
          const g = findGroup(next, selected.id);
          if (!g) return;
          g.combinator = g.combinator === "AND" ? "OR" : "AND";
          onChange(next);
        }
        return;
      }

      if (isCtrl && (key === "ArrowUp" || key === "ArrowDown") && selected.type === "cond") {
        e.preventDefault();
        const next = clone(root);
        const parent = findParentOfCondition(next, selected.id);
        if (!parent) return;
        const idx = (parent.conditions || []).findIndex((c) => c.id === selected.id);
        if (idx < 0) return;
        const swapWith = key === "ArrowUp" ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= parent.conditions.length) return;
        const tmp = parent.conditions[idx];
        parent.conditions[idx] = parent.conditions[swapWith];
        parent.conditions[swapWith] = tmp;
        onChange(next);
        return;
      }

      if (isCtrl && (key === "ArrowUp" || key === "ArrowDown") && selected.type === "group") {
        e.preventDefault();
        const next = clone(root);
        const parent = findParentOfGroup(next, selected.id);
        if (!parent) return;
        const idx = (parent.groups || []).findIndex((g) => g.id === selected.id);
        if (idx < 0) return;
        const swapWith = key === "ArrowUp" ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= parent.groups.length) return;
        const tmp = parent.groups[idx];
        parent.groups[idx] = parent.groups[swapWith];
        parent.groups[swapWith] = tmp;
        onChange(next);
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [root, onChange, selected]);

  const onDragStartCond = (groupId, condId, e) => {
    setDragging({ type: "cond", id: condId, fromGroupId: groupId });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "cond", id: condId, fromGroupId: groupId }));
  };

  const onDragStartGroup = (groupId, e) => {
    setDragging({ type: "group", id: groupId });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify({ type: "group", id: groupId }));
  };

  const computeInsertIndex = (e, count) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const ratio = rect.height ? y / rect.height : 0.5;
    const idx = Math.min(count, Math.max(0, Math.floor(ratio * (count + 1))));
    return idx;
  };

  const onDragOverGroupBox = (groupId, kind, count, e) => {
    e.preventDefault();
    const idx = computeInsertIndex(e, count);
    setDropHint({ type: kind, groupId, index: idx });
  };

  const clearDnD = () => {
    setDragging(null);
    setDropHint(null);
  };

  const onDropIntoGroup = (groupId, kind, e) => {
    e.preventDefault();
    let data = null;
    try {
      data = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {}
    if (!data) return clearDnD();

    const targetIdx = dropHint?.groupId === groupId && dropHint?.type === kind ? dropHint.index : null;

    const next = clone(root);

    if (data.type === "cond") {
      const fromParent = findGroup(next, data.fromGroupId);
      const toParent = findGroup(next, groupId);
      if (!fromParent || !toParent) return clearDnD();
      const cond = (fromParent.conditions || []).find((c) => c.id === data.id);
      if (!cond) return clearDnD();
      fromParent.conditions = (fromParent.conditions || []).filter((c) => c.id !== data.id);

      const ins = typeof targetIdx === "number" ? targetIdx : (toParent.conditions || []).length;
      toParent.conditions = [...(toParent.conditions || [])];
      toParent.conditions.splice(ins, 0, cond);
      onChange(next);
    }

    if (data.type === "group") {
      if (data.id === groupId) return clearDnD();
      const fromParent = findParentOfGroup(next, data.id);
      const toParent = findGroup(next, groupId);
      const g = findGroup(next, data.id);
      if (!fromParent || !toParent || !g) return clearDnD();
      fromParent.groups = (fromParent.groups || []).filter((x) => x.id !== data.id);
      const ins = typeof targetIdx === "number" ? targetIdx : (toParent.groups || []).length;
      toParent.groups = [...(toParent.groups || [])];
      toParent.groups.splice(ins, 0, g);
      onChange(next);
    }

    clearDnD();
  };

  const addCondition = (groupId) => {
    const next = clone(root);
    const g = findGroup(next, groupId);
    if (!g) return;
    g.conditions = [...(g.conditions || []), { id: uid(), metric: "roas", operator: "lt", threshold: 1 }];
    onChange(next);
  };

  const addGroup = (groupId) => {
    const next = clone(root);
    const g = findGroup(next, groupId);
    if (!g) return;
    g.groups = [...(g.groups || []), normalizeGroup({ combinator: "AND", conditions: [], groups: [] })];
    onChange(next);
  };

  const renderGroup = (g, depth = 0) => {
    const isSelected = selected?.type === "group" && selected?.id === g.id;
    const border = isSelected ? "1px solid rgba(120,200,255,0.65)" : "1px solid rgba(255,255,255,0.10)";
    const bg = depth === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.03)";

    const condHint = dropHint?.type === "cond" && dropHint?.groupId === g.id ? dropHint.index : null;
    const groupHint = dropHint?.type === "group" && dropHint?.groupId === g.id ? dropHint.index : null;

    return (
      <div
        key={g.id}
        draggable={depth > 0}
        onDragStart={(e) => depth > 0 && onDragStartGroup(g.id, e)}
        onDragEnd={clearDnD}
        style={{
          border,
          background: bg,
          borderRadius: 16,
          padding: 12,
          marginTop: 10,
          transform: isSelected ? "translateZ(0)" : "none",
          boxShadow: isSelected ? "0 0 0 1px rgba(80,160,255,0.25), 0 18px 60px rgba(0,0,0,0.35)" : "none",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelected({ type: "group", id: g.id });
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span className="pill" style={{ cursor: "pointer" }} title="Enter to toggle AND/OR">
              {g.combinator}
            </span>
            <span className="sub">Group</span>
            <span className="sub" style={{ opacity: 0.7 }}>
              • Ctrl+↑/↓ reorder • Enter edit • Del remove
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => addCondition(g.id)}>
              + Condition
            </button>
            <button className="btn" onClick={() => addGroup(g.id)}>
              + Group
            </button>
          </div>
        </div>

        {/* Conditions */}
        <div
          style={{ marginTop: 10 }}
          onDragOver={(e) => onDragOverGroupBox(g.id, "cond", (g.conditions || []).length, e)}
          onDrop={(e) => onDropIntoGroup(g.id, "cond", e)}
        >
          {(g.conditions || []).map((c, idx) => (
            <React.Fragment key={c.id}>
              {condHint === idx ? <div className="dropHint" /> : null}
              <div
                draggable
                onDragStart={(e) => onDragStartCond(g.id, c.id, e)}
                onDragEnd={clearDnD}
                className="row"
                style={{
                  marginTop: 8,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border:
                    selected?.type === "cond" && selected?.id === c.id
                      ? "1px solid rgba(120,200,255,0.6)"
                      : "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected({ type: "cond", id: c.id });
                }}
                title="Drag to reorder. Ctrl+↑/↓ to reorder. Enter to edit."
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                  <span style={{ opacity: 0.8 }}>⋮⋮</span>
                  <span style={{ fontWeight: 800 }}>{metricLabel(c.metric)}</span>
                  <span className="pill">{operatorLabel(c.operator)}</span>
                  <span style={{ fontWeight: 800 }}>{String(c.threshold)}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = clone(root);
                      removeCondition(next, c.id);
                      onChange(next);
                      setSelected(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </React.Fragment>
          ))}
          {condHint === (g.conditions || []).length ? <div className="dropHint" /> : null}
        </div>

        {/* Nested groups */}
        <div
          style={{ marginTop: 12 }}
          onDragOver={(e) => onDragOverGroupBox(g.id, "group", (g.groups || []).length, e)}
          onDrop={(e) => onDropIntoGroup(g.id, "group", e)}
        >
          {(g.groups || []).map((gg, idx) => (
            <React.Fragment key={gg.id}>
              {groupHint === idx ? <div className="dropHint" /> : null}
              {renderGroup(gg, depth + 1)}
            </React.Fragment>
          ))}
          {groupHint === (g.groups || []).length ? <div className="dropHint" /> : null}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      style={{ outline: "none" }}
      onClick={() => setSelected(null)}
    >
      <div className="sub" style={{ marginBottom: 8 }}>
        Tip: Drag items to nest/reorder. Keyboard: Ctrl+↑/↓ reorder, Enter edit, Delete remove.
      </div>
      {renderGroup(root, 0)}
    </div>
  );
}

import { useI18n } from '../i18n/index.js';