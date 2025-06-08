import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building, Plus, Search, ArrowUpRight, Check, X, CreditCard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import CompanyForm from '../../components/platform/CompanyForm';

type Company = Database['public']['Tables']['companies']['Row'] & {
  plan: {
    name: string;
  } | null;
  profiles: {
    id: string;
  }[];
};

const ManageCompanies = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | undefined>();
  const [loading, setLoading] = useState<string | null>(null);
  
  // Fetch companies from Supabase with billing information
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          plan:plans(name),
          profiles(id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Company[];
    },
  });

  // Filter companies based on search term
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddCompany = () => {
    setSelectedCompany(undefined);
    setIsFormOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setIsFormOpen(true);
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!window.confirm(t('platform.company.confirmDelete'))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', company.id);

      if (error) throw error;

      // Invalidate and refetch companies query
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
    } catch (err) {
      console.error('Error deleting company:', err);
      alert(t('errors.unknown'));
    }
  };

  const handleBillingPortal = async (company: Company) => {
    setLoading(company.id);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
        body: {
          companyId: company.id,
          returnUrl: window.location.href,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('No portal URL returned');

      window.location.href = data.url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      alert('Não foi possível abrir o portal de faturamento. Por favor, tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  // Format currency
  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('platform.companies')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('platform.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddCompany}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('platform.addCompany')}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-64"
          />
        </div>
      </div>

      {/* Companies table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
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
                {t('common.status')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Assinatura
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('common.users')}
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredCompanies.map((company) => (
              <tr key={company.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                        <Building className="h-5 w-5 text-primary-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{company.name}</div>
                      <div className="text-sm text-gray-500">{company.email}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="inline-flex rounded-full bg-primary-100 px-2 text-xs font-semibold leading-5 text-primary-800">
                    {company.plan?.name || t('common.none')}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    company.status === 'active'
                      ? 'bg-success-100 text-success-800'
                      : company.status === 'inactive'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-danger-100 text-danger-800'
                  }`}>
                    {company.status === 'active' ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : (
                      <X className="mr-1 h-3 w-3" />
                    )}
                    {t(`platform.company.statuses.${company.status}`)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex flex-col">
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                      company.subscription_status === 'active'
                        ? 'bg-success-100 text-success-800'
                        : company.subscription_status === 'past_due'
                        ? 'bg-warning-100 text-warning-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {company.subscription_status === 'active' ? 'Ativa' :
                       company.subscription_status === 'past_due' ? 'Atrasada' :
                       company.subscription_status === 'canceled' ? 'Cancelada' : '-'}
                    </span>
                    {company.subscription_end_date && (
                      <span className="mt-1 text-xs text-gray-500">
                        Até {formatDate(company.subscription_end_date)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {company.profiles?.length || 0} {t('common.users')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-3">
                    <button 
                      onClick={() => handleBillingPortal(company)}
                      className="text-primary-600 hover:text-primary-900"
                      disabled={loading === company.id}
                    >
                      <span className="flex items-center">
                        <CreditCard className="mr-1 h-4 w-4" />
                        {loading === company.id ? 'Carregando...' : 'Faturamento'}
                      </span>
                    </button>
                    <button 
                      onClick={() => handleEditCompany(company)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      <span className="flex items-center">
                        {t('common.edit')}
                        <ArrowUpRight className="ml-1 h-4 w-4" />
                      </span>
                    </button>
                    <button 
                      onClick={() => handleDeleteCompany(company)}
                      className="text-danger-600 hover:text-danger-900"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredCompanies.length === 0 && (
          <div className="py-8 text-center">
            <Building className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? t('companies.noResults') : t('companies.empty')}
            </h3>
            <div className="mt-6">
              <button 
                onClick={handleAddCompany}
                className="btn btn-primary inline-flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('platform.addCompany')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Company Form Modal */}
      <CompanyForm
        company={selectedCompany}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCompany(undefined);
        }}
      />
    </div>
  );
};

export default ManageCompanies;