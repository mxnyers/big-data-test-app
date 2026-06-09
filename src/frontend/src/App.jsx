import React, { useState, useMemo } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './App.css';
import logo from '../assets/nytech_clean_logo_trimmed.svg';

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
  ]},
  {id: 'user', label: 'Users', children: [
    { id: 'users', label: 'Profiles' },
  ]},
];

function App() {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState(() => new Set(['sales']));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
    <div className={`app app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-top">
          <button
            className="sidebar-menu-toggle"
            type="button"
            aria-label={sidebarCollapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
            aria-expanded={!sidebarCollapsed}
            onClick={() => setSidebarCollapsed(prev => !prev)}
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
          <div className="logo">
            <img src={logo} alt="Nytech logo" />
          </div>
        </div>

        <nav className="tree">
          <div className="group">
            <button className="group-label group-toggle" aria-expanded={true} onClick={() => {}}>
              <span className="nav-text">Main</span>
            </button>
            <div className={`group-children expanded`}>
              <Link className={`nav-item ${isActive('/') ? 'active' : ''}`} to="/" title="Home">
                <span className="nav-text">Home</span>
              </Link>
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
                  <span className="nav-text">{group.label}</span>
                  <span className="chev" aria-hidden>{open ? '▾' : '▸'}</span>
                </button>

                <div className={`group-children ${open ? 'expanded' : 'collapsed'}`}>
                  {group.children.map(item => (
                    <Link
                      key={item.id}
                      to={`/${item.id}`}
                      className={`nav-item ${isActive(`/${item.id}`) ? 'active' : ''}`}
                      title={item.label}
                    >
                      <span className="nav-text">{item.label}</span>
                    </Link>
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
