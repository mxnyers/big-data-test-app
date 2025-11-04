import React, { useState, useEffect } from 'react';
import './DynamicTable.css';

const DynamicTable = ({ endpoint, refreshInterval = 5000 }) => {
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [newRow, setNewRow] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/${endpoint}`);
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
      <table>
        <thead>
          <tr>
            {columns.map(column => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map(column => (
                <td key={column}>{row[column]}</td>
              ))}
            </tr>
          ))}
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
          </tr>
        </tbody>
      </table>
      <button 
        className="add-row-btn"
        onClick={handleSubmit}
      >
        Add Row
      </button>
    </div>
  );
};

export default DynamicTable;