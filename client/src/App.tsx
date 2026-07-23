import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Billing from './pages/Billing';
import Customers from './pages/Customers';
import Vendors from './pages/Vendors';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Purchases from './pages/Purchases';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          

          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
              path="/categories"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Categories />
                </ProtectedRoute>
              }
            />

            <Route
              path="/products"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Products />
                </ProtectedRoute>
              }
            />

            <Route
              path="/customers"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Customers />
                </ProtectedRoute>
              }
            />

            <Route
              path="/vendors"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Vendors />
                </ProtectedRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Reports />
                </ProtectedRoute>
              }
            />

            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Users />
                </ProtectedRoute>
              }
            />

            <Route
              path="/purchases"
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <Purchases />
                </ProtectedRoute>
              }
            />

            <Route path="/billing" element={<Billing />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;