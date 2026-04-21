import React from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import App from '../App';
import Home from '../pages/Home';
import TablePage from '../pages/TablePage';

export default function Router() {
  return (
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Home />} />
        <Route path=":tableId" element={<TablePageWrapper />} />
      </Route>
    </Routes>
  );
}

function TablePageWrapper() {
  // small wrapper to read route param and render TablePage
  const { tableId } = useParams();
  return <TablePage tableId={tableId} />;
}
