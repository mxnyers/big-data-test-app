import React from 'react';
import DynamicTable from '../components/DynamicTable';

export default function TablePage({ tableId }) {
  // If used via route params, the router will pass props differently; we support
  // receiving tableId prop directly for programmatic use.
  return (
    <div style={{ padding: 16 }}>
      <DynamicTable endpoint={tableId} refreshInterval={5000} />
    </div>
  );
}
