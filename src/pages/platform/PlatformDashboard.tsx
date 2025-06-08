import { useQuery } from '@tanstack/react-query';
import { Activity, Building, DollarSign, Package, TrendingUp, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import StatCard from '../../components/dashboard/StatCard';

const PlatformDashboard = () => {
  const { t } = useTranslation();

  // Fetch platform statistics
  const { data: stats = { companies: 0, activeSubscriptions: 0, mrr: 0 } } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, subscription_status, plan:plans(price)')
        .eq('status', 'active');

      if (companiesError) throw companiesError;

      const activeSubscriptions = companies.filter(c => c.subscription_status === 'active').length;
      const mrr = companies.reduce((sum, company) => {
        if (company.subscription_status === 'active' && company.plan?.price) {
          return sum + company.plan.price;
        }
        return sum;
      }, 0);

      return {
        companies: companies.length,
        activeSubscriptions,
        mrr,
      };
    },
  });

  // Fetch recent companies
  const { data: recentCompanies = [] } = useQuery({
    queryKey: ['recent-companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          id,
          name,
          created_at,
          plan:plans(name),
          profiles(id),
          status,
          subscription_status
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  // Fetch subscription distribution
  const { data: subscriptionStats = [] } = useQuery({
    queryKey: ['subscription-stats'],
    queryFn: async () => {
      const { data: plans, error: plansError } = await supabase
        .from('plans')
        .select('id, name');

      if (plansError) throw plansError;

      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('plan_id')
        .eq('subscription_status', 'active');

      if (companiesError) throw companiesError;

      const totalCompanies = companies.length;
      
      return plans.map(plan => {
        const count = companies.filter(c => c.plan_id === plan.id).length;
        return {
          name: plan.name,
          count,
          percentage: totalCompanies > 0 ? Math.round((count / totalCompanies) * 100) : 0,
        };
      });
    },
  });

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
        <h1 className="text-2xl font-bold text-gray-900">{t('platform.overview.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('platform.overview.subtitle')}
        </p>
      </div>
      
      {/* Stats overview */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title={t('platform.overview.stats.totalCompanies')}
          value={stats.companies.toString()}
          change="+3"
          changeText={t('common.lastMonth')}
          icon={Building}
          trend="up"
        />
        <StatCard 
          title={t('platform.overview.stats.activeSubscriptions')}
          value={stats.activeSubscriptions.toString()}
          change="+4"
          changeText={t('common.lastMonth')}
          icon={Package}
          trend="up"
        />
        <StatCard 
          title={t('platform.overview.stats.mrr')}
          value={formatCurrency(stats.mrr)}
          change="+22.5%"
          changeText={t('common.lastMonth')}
          icon={DollarSign}
          trend="up"
        />
        <StatCard 
          title={t('platform.overview.stats.systemUptime')}
          value="99.98%"
          change="+0.02%"
          changeText={t('common.lastMonth')}
          icon={Activity}
          trend="up"
        />
      </div>
      
      {/* Recent companies */}
      <div className="mb-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('platform.recentCompanies.title')}</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('common.company')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('common.plan')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('common.users')}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('common.status')}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentCompanies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-100 text-primary-600">
                        <div className="flex h-full w-full items-center justify-center font-medium">
                          {company.name.charAt(0)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        <div className="text-xs text-gray-500">
                          {t('platform.recentCompanies.addedOn')} {new Date(company.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">{company.plan?.name || t('platform.recentCompanies.noPlan')}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="text-sm text-gray-900">{company.profiles?.length || 0}</div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      company.status === 'active' 
                        ? 'bg-success-100 text-success-800' 
                        : 'bg-warning-100 text-warning-800'
                    }`}>
                      {t(`platform.company.statuses.${company.status}`)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <a href="#" className="inline-flex items-center text-primary-600 hover:text-primary-700">
                      {t('common.view')} <ArrowUpRight className="ml-1 h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Subscription distribution */}
      <div className="mb-6">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('platform.subscriptionDistribution.title')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {subscriptionStats.map((plan) => (
            <div key={plan.name} className="card p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{plan.name}</h3>
                <span className="font-medium text-gray-900">{plan.count}</span>
              </div>
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-primary-500"
                    style={{ width: `${plan.percentage}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">{plan.percentage}% {t('platform.subscriptionDistribution.percentageOfCompanies')}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Revenue trend */}
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">{t('platform.revenueTrend.title')}</h2>
        <div className="card p-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{t('platform.revenueTrend.monthlyRecurringRevenue')}</h3>
              <p className="text-sm text-gray-500">{t('platform.revenueTrend.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-success-500" />
              <span className="text-lg font-medium text-success-500">+18.3%</span>
            </div>
          </div>
          
          <div className="mt-4 flex items-end justify-between">
            {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'].map((month, i) => {
              const heights = [40, 55, 70, 65, 80, 95];
              
              return (
                <div key={month} className="flex flex-col items-center">
                  <div 
                    className="w-12 rounded-t bg-primary-500 transition-all hover:bg-primary-600"
                    style={{ height: `${heights[i]}px` }}
                  />
                  <div className="mt-2 text-xs text-gray-500">{month}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformDashboard;