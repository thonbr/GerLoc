import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import AppLayout from './components/layouts/AppLayout';
import AuthLayout from './components/layouts/AuthLayout';
import LoadingScreen from './components/ui/LoadingScreen';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './pages/Dashboard';

// Auth pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

// Onboarding pages
const CompanySetup = lazy(() => import('./pages/onboarding/CompanySetup'));
const TrialExpired = lazy(() => import('./pages/TrialExpired'));

// Platform Admin pages
const PlatformDashboard = lazy(() => import('./pages/platform/PlatformDashboard'));
const ManageCompanies = lazy(() => import('./pages/platform/ManageCompanies'));
const ManageUsers = lazy(() => import('./pages/platform/ManageUsers'));
const ManagePlans = lazy(() => import('./pages/platform/ManagePlans'));
const SystemHealth = lazy(() => import('./pages/platform/SystemHealth'));
const AuditLogs = lazy(() => import('./pages/platform/AuditLogs'));

// Company pages
const Vehicles = lazy(() => import('./pages/company/Vehicles'));
const Tenants = lazy(() => import('./pages/company/Tenants'));
const Contracts = lazy(() => import('./pages/company/Contracts'));
const Finances = lazy(() => import('./pages/company/Finances'));
const Users = lazy(() => import('./pages/company/Users'));
const Billing = lazy(() => import('./pages/company/Billing'));
const Suppliers = lazy(() => import('./pages/company/Suppliers'));
const Expenses = lazy(() => import('./pages/company/Expenses'));
const VehicleDocuments = lazy(() => import('./pages/company/VehicleDocuments'));
const Maintenances = lazy(() => import('./pages/company/Maintenances'));
const Fines = lazy(() => import('./pages/company/Fines'));
const TenantDocuments = lazy(() => import('./pages/company/TenantDocuments'));

// Support pages
const Support = lazy(() => import('./pages/Support'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Tutorials = lazy(() => import('./pages/Tutorials'));

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            {/* Onboarding routes */}
            <Route path="/onboarding">
              <Route path="company-setup" element={<CompanySetup />} />
            </Route>

            <Route path="/trial-expired" element={<TrialExpired />} />

            <Route element={<AppLayout />}>
              {/* Common dashboard redirect */}
              <Route index element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Platform admin routes */}
              <Route path="/platform">
                <Route index element={<PlatformDashboard />} />
                <Route path="companies" element={<ManageCompanies />} />
                <Route path="users" element={<ManageUsers />} />
                <Route path="plans" element={<ManagePlans />} />
                <Route path="health" element={<SystemHealth />} />
                <Route path="audit-logs" element={<AuditLogs />} />
              </Route>
              
              {/* Company routes */}
              <Route path="/vehicles">
                <Route index element={<Vehicles />} />
                <Route path=":id" element={<Vehicles />} />
              </Route>
              <Route path="/vehicle-documents" element={<VehicleDocuments />} />
              <Route path="/maintenances" element={<Maintenances />} />
              <Route path="/fines" element={<Fines />} />
              <Route path="/tenants">
                <Route index element={<Tenants />} />
                <Route path=":id" element={<Tenants />} />
              </Route>
              <Route path="/tenant-documents" element={<TenantDocuments />} />
              <Route path="/contracts">
                <Route index element={<Contracts />} />
                <Route path=":id" element={<Contracts />} />
              </Route>
              <Route path="/finances">
                <Route index element={<Finances />} />
              </Route>
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/users">
                <Route index element={<Users />} />
              </Route>
              <Route path="/billing" element={<Billing />} />

              {/* Support routes */}
              <Route path="/support" element={<Support />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/tutorials" element={<Tutorials />} />
            </Route>
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard\" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}

export default App;