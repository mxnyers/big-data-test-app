import React, { useState, useEffect } from 'react';
import './DynamicTable.css';

const DynamicTable = ({ endpoint, refreshInterval = 5000 }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [newRow, setNewRow] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editRowData, setEditRowData] = useState({});

  const fetchData = async () => {
    try {
      // Add cache-busting timestamp to prevent browser caching
      const timestamp = Date.now();
      const response = await fetch(`/api/${endpoint}?_=${timestamp}`);
      if (!response.ok) throw new Error('Data fetch failed');
      
      const result = await response.json();
      if (result && result.length > 0) {
        setData(result);
        setColumns(Object.keys(result[0]));
        setNewRow(Object.fromEntries(Object.keys(result[0]).map(key => [key, ''])));
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [endpoint, refreshInterval]);

  const handleInputChange = (column, value) => {
    setNewRow(prev => ({ ...prev, [column]: value }));
  };

  const handleEditChange = (column, value) => {
    setEditRowData(prev => ({ ...prev, [column]: value }));
  };

  const handleEditClick = (index, row) => {
    setEditingIndex(index);
    setEditRowData(row);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditRowData({});
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editRowData)
      });

      if (!response.ok) throw new Error('Failed to update row');

      // refresh and clear edit state
      await fetchData();
      setEditingIndex(null);
      setEditRowData({});
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRow)
      });
      
      if (!response.ok) throw new Error('Failed to add row');
      
      // Clear form and refresh data
      setNewRow(Object.fromEntries(columns.map(key => [key, ''])));
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="table-loading">Loading...</div>;
  if (error) return <div className="table-error">Error: {error}</div>;

  return (
    <div className="dynamic-table">
      <div className="table-wrapper">
        <table style={{ '--col-count': columns.length + 1 }}>
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column}>{column}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {columns.map((column, colIdx) => (
                  <td key={column}>
                    {editingIndex === i ? (
                      <input
                        className="edit-input"
                        value={editRowData[column] ?? ''}
                        onChange={(e) => handleEditChange(column, e.target.value)}
                      />
                    ) : (
                      <span>{row[column]}</span>
                    )}
                  </td>
                ))}
                <td>
                  {editingIndex === i ? (
                    <div className="row-actions">
                      <button className="btn btn-save" onClick={handleSaveEdit}>Save</button>
                      <button className="btn btn-cancel" onClick={handleCancelEdit}>Cancel</button>
                    </div>
                  ) : (
                    <div className="row-actions">
                      <button className="btn btn-edit" onClick={() => handleEditClick(i, row)}>Edit</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="new-row">
              {columns.map(column => (
                <td key={column}>
                  <input
                    type="text"
                    value={newRow[column] || ''}
                    onChange={(e) => handleInputChange(column, e.target.value)}
                    placeholder={`Enter ${column}`}
                  />
                </td>
              ))}
              <td>
                <button className="add-row-btn" onClick={handleSubmit}>Add</button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default DynamicTable;