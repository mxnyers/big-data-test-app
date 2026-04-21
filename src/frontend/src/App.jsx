import React, { useState, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './App.css';

const SIDEBAR_ITEMS = [
  { id: 'sales', label: 'Sales', children: [
    { id: 'sales_transactions', label: 'Transactions' },
    { id: 'sales_customers', label: 'Customers' },
    { id: 'sales_franchises', label: 'Franchises' },
    { id: 'sales_suppliers', label: 'Suppliers' }
  ]},
  { id: 'media', label: 'Media', children: [
    { id: 'media_customer_reviews', label: 'Customer Reviews' },
    { id: 'media_gold_reviews_chunked', label: 'Gold Reviews' }
  ]}
];

function App() {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(() => new Set(['sales']));

  const toggleGroup = (id) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  const sidebarItems = useMemo(() => SIDEBAR_ITEMS, []);

  return (
    <div className="app app-layout">
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="logo">
          <img src="assets/frontend\assets\nytedawg_nd_transparent.png" alt="Logo" />
        </div>

        <nav className="tree">
          <div className="group">
            <button className="group-label group-toggle" aria-expanded={true} onClick={() => {}}>
              Main
            </button>
            <div className={`group-children expanded`}>
              <Link className={`nav-item ${isActive('/') ? 'active' : ''}`} to="/">Home</Link>
            </div>
          </div>

          {sidebarItems.map(group => {
            const open = openGroups.has(group.id);
            return (
              <div className="group" key={group.id}>
                <button
                  className={`group-label group-toggle ${open ? 'open' : ''}`}
                  aria-expanded={open}
                  onClick={() => toggleGroup(group.id)}
                >
                  {group.label}
                  <span className="chev" aria-hidden>{open ? '▾' : '▸'}</span>
                </button>

                <div className={`group-children ${open ? 'expanded' : 'collapsed'}`}>
                  {group.children.map(item => (
                    <Link key={item.id} to={`/${item.id}`} className={`nav-item ${isActive(`/${item.id}`) ? 'active' : ''}`}>{item.label}</Link>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="app-content">
        <header className="app-header">
          <h1>Big Data Test</h1>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

export default App;