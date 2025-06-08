import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Bike, Users, FileText, DollarSign, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import StatCard from '../components/dashboard/StatCard';
import RevenueChart from '../components/dashboard/RevenueChart';
import ActiveContracts from '../components/dashboard/ActiveContracts';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user?.role === 'platform_admin') {
      navigate('/platform');
    }
  }, [user, navigate]);

  // Fetch total vehicles count
  const { data: vehiclesCount = 0, isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles-count', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { count, error } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.companyId,
  });

  // Fetch active rentals count
  const { data: activeRentalsCount = 0, isLoading: loadingRentals } = useQuery({
    queryKey: ['active-rentals-count', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { count, error } = await supabase
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId)
        .eq('status', 'active');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.companyId,
  });

  // Fetch tenants count
  const { data: tenantsCount = 0, isLoading: loadingTenants } = useQuery({
    queryKey: ['tenants-count', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', user.companyId)
        .eq('role', 'company_user');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.companyId,
  });

  // Fetch monthly revenue
  const { data: monthlyRevenue = 0, isLoading: loadingRevenue } = useQuery({
    queryKey: ['monthly-revenue', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('contracts')
        .select('amount')
        .eq('company_id', user.companyId)
        .eq('payment_status', 'paid')
        .gte('created_at', firstDayOfMonth)
        .lte('created_at', lastDayOfMonth);

      if (error) throw error;
      return data.reduce((sum, contract) => sum + contract.amount, 0);
    },
    enabled: !!user?.companyId,
  });
  
  if (user?.role === 'platform_admin') {
    return null;
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };
  
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('dashboard.welcome', { name: user?.name })}
        </p>
      </div>
      
      {/* Stats overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title={t('dashboard.stats.totalVehicles')}
          value={vehiclesCount.toString()}
          change="+2"
          changeText="em relação ao mês anterior"
          icon={Bike}
          trend="up"
        />
        <StatCard 
          title={t('dashboard.stats.activeRentals')}
          value={activeRentalsCount.toString()}
          change="+5"
          changeText="em relação ao mês anterior"
          icon={FileText}
          trend="up"
        />
        <StatCard 
          title={t('dashboard.stats.tenants')}
          value={tenantsCount.toString()}
          change="+8"
          changeText="em relação ao mês anterior"
          icon={Users}
          trend="up"
        />
        <StatCard 
          title={t('dashboard.stats.monthlyRevenue')}
          value={formatCurrency(monthlyRevenue)}
          change="+12,5%"
          changeText="vs. mês anterior"
          icon={DollarSign}
          trend="up"
        />
      </div>
      
      {/* Charts and tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue chart */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold text-gray-900">{t('finances.revenue')}</h2>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-500">Últimos 6 meses</span>
            </div>
          </div>
          <div className="p-4">
            <RevenueChart />
          </div>
        </div>
        
        {/* Active contracts */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b p-4">
            <h2 className="font-semibold text-gray-900">{t('contracts.title')}</h2>
            <button className="flex items-center text-xs font-medium text-primary-600 hover:text-primary-700">
              {t('common.viewDetails')} <ArrowRight className="ml-1 h-3 w-3" />
            </button>
          </div>
          <div className="p-0">
            <ActiveContracts />
          </div>
        </div>
      </div>
      
      {/* Quick actions */}
      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-gray-900">{t('dashboard.quickActions.title')}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <button className="card flex flex-col items-center p-4 text-center transition-all hover:bg-gray-50">
            <Bike className="h-8 w-8 text-primary-600" />
            <span className="mt-2 font-medium">{t('dashboard.quickActions.addVehicle')}</span>
          </button>
          <button className="card flex flex-col items-center p-4 text-center transition-all hover:bg-gray-50">
            <Users className="h-8 w-8 text-secondary-500" />
            <span className="mt-2 font-medium">{t('dashboard.quickActions.newTenant')}</span>
          </button>
          <button className="card flex flex-col items-center p-4 text-center transition-all hover:bg-gray-50">
            <FileText className="h-8 w-8 text-accent-500" />
            <span className="mt-2 font-medium">{t('dashboard.quickActions.createContract')}</span>
          </button>
          <button className="card flex flex-col items-center p-4 text-center transition-all hover:bg-gray-50">
            <TrendingUp className="h-8 w-8 text-success-500" />
            <span className="mt-2 font-medium">{t('dashboard.quickActions.financialReport')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;