import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingScreen from '../ui/LoadingScreen';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login\" replace />;
  }

  // Check if user needs to complete onboarding
  if (!user.companyId && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding/company-setup" replace />;
  }

  // Check trial/subscription status for non-platform admins
  if (
    user.role !== 'platform_admin' &&
    user.company &&
    user.company.subscription_status !== 'active' &&
    (!user.company.trial_ends_at || new Date(user.company.trial_ends_at) < new Date()) &&
    !['/trial-expired', '/billing'].includes(location.pathname)
  ) {
    return <Navigate to="/trial-expired\" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;