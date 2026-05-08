/**
 * AGRISAVE.IO - Main App Entry (React Router)
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import AuditPage from './pages/AuditPage';
import UsersPage from './pages/UsersPage';
import CryptoFlowPage from './pages/CryptoFlowPage';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#0a0c10', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', fontSize: '13px' },
          success: { iconTheme: { primary: '#bef264', secondary: '#000' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          duration: 3500,
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/crypto-flow" element={<CryptoFlowPage />} />

          <Route path="/audit" element={
            <ProtectedRoute roles={['SUPER_ADMIN','ADMIN']}>
              <AuditPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <UsersPage />
            </ProtectedRoute>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
