import React, { useState, useEffect, useRef, useCallback } from 'react';
import './DynamicTable.css';
import logger from '../../utils/logger';

// Merged DynamicTable: combines per-cell editing, buffered new rows, Save All,
// per-row cancel/revert, bulk actions, polling with merge, toasts, and telemetry.
const DynamicTable = ({ endpoint, refreshInterval = 5000, requiredFields = [], uniqueFields = [], numericFields = [], validators = {}, rowKey = 'id' }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editing model (index-based)
  const [editingCell, setEditingCell] = useState(null); // { rowIndex, column }
  const [changedCells, setChangedCells] = useState(new Map()); // key -> { rowIndex, column, value }
  const [newRows, setNewRows] = useState([]); // row indices that are new
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [savingRows, setSavingRows] = useState(new Set());
  const [selectedRows, setSelectedRows] = useState(new Set()); // rowIndex set
  const [originalData, setOriginalData] = useState(new Map());

  const tableBodyRef = useRef(null);
  const editingCellRef = useRef(null);
  const dataRef = useRef([]);
  const changedCellsRef = useRef(new Map());
  const newRowsRef = useRef([]);

  useEffect(() => { editingCellRef.current = editingCell; }, [editingCell]);
  useEffect(() => { dataRef.current = data; }, [data]);
  useEffect(() => { changedCellsRef.current = changedCells; }, [changedCells]);
  useEffect(() => { newRowsRef.current = newRows; }, [newRows]);

  const showToast = (message, type = 'info', duration = 5000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), duration);
  };

  const telemetry = (name, props) => { try { logger.trackEvent(name, props || {}); } catch { /* noop */ } };

  const replaceSqlPlaceholders = (s) => s; // client-side noop; kept for parity

  const fetchData = useCallback(async () => {
    try {
      const ts = Date.now();
      const url = `/api/${endpoint}?_=${ts}`;
      const res = await fetch(url);
      if (!res.ok) {
        let details = '';
        try { const text = await res.text(); details = text ? ` Body: ${text.substring(0,500)}` : ''; } catch {}
        const msg = `Data fetch failed (${res.status}) for ${url}.${details}`;
        console.error(msg);
        throw new Error(msg);
      }
      const result = await res.json();

      // Merge server result with local unsaved changes
      if (Array.isArray(result)) {
        const modifiedRowIndices = new Set();
        if (editingCellRef.current) modifiedRowIndices.add(editingCellRef.current.rowIndex);
        changedCellsRef.current.forEach((c) => modifiedRowIndices.add(c.rowIndex));
        newRowsRef.current.forEach((ri) => modifiedRowIndices.add(ri));

        const merged = result.map((serverRow, idx) => {
          if (modifiedRowIndices.has(idx) && idx < dataRef.current.length) {
            return dataRef.current[idx];
          }
          return serverRow;
        });

        // Append any local new rows that go beyond server length
        newRowsRef.current.forEach((ri) => {
          if (ri >= result.length && ri < dataRef.current.length) {
            merged.push(dataRef.current[ri]);
          }
        });

        setData(merged);
        if (result.length > 0) setColumns(Object.keys(result[0]));

        // store originals
        const originals = new Map();
        result.forEach((r, i) => originals.set(i, { ...r }));
        setOriginalData(originals);
      } else {
        logger.warn('fetchData returned non-array', { result });
      }
      setError(null);
    } catch (err) {
      logger.error('fetchData failed', err);
      setError(err.message || 'Unknown error while fetching data');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
    const iv = setInterval(() => { fetchData(); }, refreshInterval);
    return () => clearInterval(iv);
  }, [fetchData, refreshInterval]);

  const handleCellClick = (rowIndex, column) => {
    telemetry('CellClick', { endpoint, rowIndex, column });
    if (savingRows.has(rowIndex)) { showToast('Row is saving', 'info'); return; }
    setEditingCell({ rowIndex, column });
  };

  const handleCellChange = (rowIndex, column, value) => {
    const newData = [...dataRef.current];
    newData[rowIndex] = { ...newData[rowIndex], [column]: value };
    setData(newData);

    const changeKey = `${rowIndex}-${column}`;
    const next = new Map(changedCellsRef.current);
    next.set(changeKey, { rowIndex, column, value, row: newData[rowIndex] });
    setChangedCells(next);
    setHasUnsavedChanges(true);
    telemetry('CellChange', { endpoint, rowIndex, column });
  };

  const handleCellBlur = () => setEditingCell(null);

  const handleAddRow = () => {
    const newRow = Object.fromEntries((columns || []).map(c => [c, '']));
    const newIndex = dataRef.current.length;
    const newData = [...dataRef.current, newRow];
    setData(newData);
    setNewRows([...newRowsRef.current, newIndex]);
    setHasUnsavedChanges(true);
    showToast('New row added (unsaved)', 'info');
    telemetry('AddRow', { endpoint });

    // scroll to row after render
    setTimeout(() => {
      if (tableBodyRef.current) {
        const rows = tableBodyRef.current.querySelectorAll('tr');
        if (rows[newIndex]) rows[newIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleCancelNewRow = (rowIndex) => {
    const newData = dataRef.current.filter((_, i) => i !== rowIndex);
    setData(newData);
    setNewRows(newRowsRef.current.filter(i => i !== rowIndex).map(i => (i > rowIndex ? i - 1 : i)));
    setHasUnsavedChanges(newRowsRef.current.length > 1 || changedCellsRef.current.size > 0);
    showToast('New row cancelled', 'info');
    telemetry('CancelNewRow', { endpoint, rowIndex });
  };

  const handleRevertRow = (rowIndex) => {
    const original = originalData.get(rowIndex);
    if (!original) return;
    const newData = [...dataRef.current];
    newData[rowIndex] = { ...original };
    setData(newData);

    // remove related changedCells
    const next = new Map(changedCellsRef.current);
    for (const k of Array.from(next.keys())) {
      const c = next.get(k);
      if (c.rowIndex === rowIndex) next.delete(k);
    }
    setChangedCells(next);
    setHasUnsavedChanges(next.size > 0 || newRowsRef.current.length > 0);
    telemetry('RevertRow', { endpoint, rowIndex });
    showToast('Row changes reverted', 'info');
  };

  const handleSelectRow = (rowIndex, checked) => {
    const next = new Set(selectedRows);
    if (checked) next.add(rowIndex); else next.delete(rowIndex);
    setSelectedRows(next);
  };

  const handleSelectAll = (checked) => {
    if (!checked) { setSelectedRows(new Set()); return; }
    const s = new Set();
    dataRef.current.forEach((_, i) => s.add(i));
    newRowsRef.current.forEach(i => s.add(i));
    setSelectedRows(s);
  };

  const validateRowData = (row, rowIndex) => {
    const errors = [];
    requiredFields.forEach((f) => {
      const v = row[f];
      if (v === null || v === undefined || v === '') errors.push(`${f} is required`);
    });
    uniqueFields.forEach((f) => {
      const v = row[f];
      if (v !== null && v !== undefined && v !== '') {
        const dup = dataRef.current.some((r, idx) => idx !== rowIndex && r[f] === v);
        if (dup) errors.push(`${f} must be unique`);
      }
    });
    (numericFields || []).forEach((f) => {
      const v = row[f];
      if (v !== null && v !== undefined && v !== '' && Number.isNaN(Number(v))) errors.push(`${f} must be numeric`);
    });
    // custom validators
    Object.entries(validators || {}).forEach(([k, fn]) => {
      try { const out = fn(row[k]); if (out && out.valid === false) errors.push(out.message || `${k} invalid`); } catch (e) { errors.push(`${k} validation error`); }
    });
    return { valid: errors.length === 0, errors };
  };

  const handleSaveAll = async () => {
    if (!hasUnsavedChanges) return;
    setEditingCell(null);
    const rowsToSaveSet = new Set([...newRowsRef.current, ...Array.from(changedCellsRef.current.values()).map(c => c.rowIndex)]);
    const rowsToSave = Array.from(rowsToSaveSet).sort((a,b)=>a-b);
    const toInsert = rowsToSave.filter(i => newRowsRef.current.includes(i)).map(i => dataRef.current[i]);
    const toUpdate = rowsToSave.filter(i => !newRowsRef.current.includes(i)).map(i => dataRef.current[i]);

    // validate
    for (const ri of rowsToSave) {
      const v = validateRowData(dataRef.current[ri], ri);
      if (!v.valid) { showToast(`Validation failed: ${v.errors.join(', ')}`, 'error'); return; }
    }

    try {
      if (toInsert.length > 0) {
        const resp = await fetch(`/api/${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: toInsert }) });
        if (!resp.ok) { throw new Error(await resp.text()); }
      }
      if (toUpdate.length > 0) {
        const resp = await fetch(`/api/${endpoint}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: toUpdate }) });
        if (!resp.ok) { throw new Error(await resp.text()); }
      }

      // clear local state
      setChangedCells(new Map());
      setNewRows([]);
      setHasUnsavedChanges(false);
      showToast('✓ All changes saved to database successfully', 'success');
      telemetry('SaveAll', { endpoint, inserted: toInsert.length, updated: toUpdate.length });
      await fetchData();
    } catch (err) {
      logger.error('SaveAll failed', err);
      showToast(`Save failed: ${err.message || err}`, 'error');
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedRows).sort((a,b)=>b-a);
    if (ids.length === 0) return;
    try {
      for (const ri of ids) {
        if (newRowsRef.current.includes(ri)) {
          const nd = dataRef.current.filter((_,i)=>i !== ri);
          setData(nd);
          setNewRows(newRowsRef.current.filter(i=>i!==ri).map(i=> i>ri? i-1: i));
          continue;
        }
        const pk = dataRef.current[ri][rowKey];
        await fetch(`/api/${endpoint}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [rowKey]: pk }) });
      }
      showToast('Deleted selected rows', 'success');
      setSelectedRows(new Set());
      await fetchData();
    } catch (err) {
      logger.error('bulk delete failed', err);
      showToast(`Delete failed: ${err.message || err}`, 'error');
    }
  };

  if (loading) return <div className="table-loading">Loading...</div>;
  if (error) return <div className="table-error">Error: {error}</div>;

  return (
    <div className="dynamic-table">
      <div className="toast-container">
        {toasts.map((t, idx) => (
          <div key={t.id} className={`toast toast-${t.type}`} style={{ top: `${80 + idx * 72}px` }}>{t.message}</div>
        ))}
      </div>

      {hasUnsavedChanges && (
        <div className="toolbar">
          <button className="save-btn" onClick={handleSaveAll}>💾 Save All</button>
          <span className="unsaved-indicator">{changedCells.size} unsaved change{changedCells.size !== 1 ? 's' : ''}</span>
        </div>
      )}

      <div className="table-wrapper">
        <table style={{ '--col-count': (columns || []).length }}>
          <thead>
            <tr>
              <th className="col-select"><input type="checkbox" aria-label="select-all" onChange={(e)=>handleSelectAll(e.target.checked)} checked={selectedRows.size>0 && selectedRows.size >= (data.length)} /></th>
              {(columns||[]).map(col => <th key={col}>{col}</th>)}
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody ref={tableBodyRef}>
            {data.map((row, rowIndex) => {
              const isNew = newRows.includes(rowIndex);
              const isModified = Array.from(changedCells.values()).some(c=>c.rowIndex===rowIndex) || isNew;
              const isSaving = savingRows.has(rowIndex);
              const rowClass = isSaving ? 'row-saving' : isModified ? 'row-modified' : '';

              return (
                <tr key={`r-${rowIndex}`} className={rowClass}>
                  <td className="col-select"><input type="checkbox" checked={selectedRows.has(rowIndex)} onChange={(e)=>handleSelectRow(rowIndex, e.target.checked)} /></td>
                  {(columns||[]).map((column) => {
                    const isEditing = editingCell && editingCell.rowIndex===rowIndex && editingCell.column===column;
                    const cellValue = row[column] ?? '';
                    return (
                      <td key={column}>
                        {isEditing ? (
                          <input autoFocus className="cell-input" value={cellValue} onChange={(e)=>handleCellChange(rowIndex, column, e.target.value)} onBlur={handleCellBlur} onKeyDown={(e)=>{ if (e.key==='Enter') setEditingCell(null); if (e.key==='Escape') setEditingCell(null); }} />
                        ) : (
                          <div role="button" tabIndex={0} className={`cell-content ${isSaving ? 'disabled':''}`} onClick={()=>handleCellClick(rowIndex, column)} onKeyDown={(e)=>{ if (e.key==='Enter' || e.key===' ') handleCellClick(rowIndex, column); }}>{cellValue}</div>
                        )}
                      </td>
                    );
                  })}
                  <td className="actions-cell">
                    {isNew && <button className="cancel-row-btn" onClick={()=>handleCancelNewRow(rowIndex)}>✕</button>}
                    {!isNew && isModified && !isSaving && <button className="revert-row-btn" onClick={()=>handleRevertRow(rowIndex)}>↺</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={(columns||[]).length + 1}>
                <div className="bottom-row">
                  <button className="add-row-btn" onClick={handleAddRow}>+ Add Row</button>
                  <div className="bulk-actions">
                    <button className="btn" onClick={handleBulkDelete} disabled={selectedRows.size===0}>Delete Selected ({selectedRows.size})</button>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default DynamicTable;