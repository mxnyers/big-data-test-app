import React from 'react';
import DynamicTable from './components/DynamicTable';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Bakehouse Data Management</h1>
      </header>
      <main className="app-content">
        <div className="table-grid">
          <section className="table-card">
            <h2>Sales Transactions</h2>
            <DynamicTable endpoint="sales_transactions" refreshInterval={5000} />
          </section>
          <section className="table-card">
            <h2>Customers</h2>
            <DynamicTable endpoint="sales_customers" refreshInterval={5000} />
          </section>
          <section className="table-card">
            <h2>Franchises</h2>
            <DynamicTable endpoint="sales_franchises" refreshInterval={5000} />
          </section>
          <section className="table-card">
            <h2>Suppliers</h2>
            <DynamicTable endpoint="sales_suppliers" refreshInterval={5000} />
          </section>
          <section className="table-card">
            <h2>Customer Reviews</h2>
            <DynamicTable endpoint="media_customer_reviews" refreshInterval={5000} />
          </section>
          <section className="table-card">
            <h2>Gold Reviews</h2>
            <DynamicTable endpoint="media_gold_reviews_chunked" refreshInterval={5000} />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;