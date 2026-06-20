import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import OrderCreate from './pages/OrderCreate';
import QualityInspection from './pages/QualityInspection';
import SupplierList from './pages/SupplierList';
import SupplierPerformance from './pages/SupplierPerformance';

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/orders/new" element={<OrderCreate />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/quality" element={<QualityInspection />} />
          <Route path="/suppliers" element={<SupplierList />} />
          <Route path="/suppliers/performance" element={<SupplierPerformance />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
