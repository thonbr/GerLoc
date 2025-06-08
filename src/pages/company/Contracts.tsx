import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Filter, ArrowUpRight, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import ContractForm from '../../components/contracts/ContractForm';

type Contract = Database['public']['Tables']['contracts']['Row'];

const Contracts = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Contract['status']>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | undefined>();

  // Fetch contracts from Supabase
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          tenant:profiles!contracts_tenant_id_fkey(
            full_name,
            email
          ),
          vehicle:vehicles!contracts_vehicle_id_fkey(
            brand,
            model,
            plate
          )
        `)
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });

  // Filter contracts based on search term and status
  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.tenant?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.vehicle?.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.vehicle?.model.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleAddContract = () => {
    setSelectedContract(undefined);
    setIsFormOpen(true);
  };

  const handleEditContract = (contract: Contract) => {
    setSelectedContract(contract);
    setIsFormOpen(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('contracts.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('contracts.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddContract}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('contracts.addContract')}
          </button>
        </div>
      </div>

      {/* Filters and search */}
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{t('common.filter')}:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">{t('common.all')}</option>
            <option value="active">{t('contracts.status.active')}</option>
            <option value="pending">{t('contracts.status.pending')}</option>
            <option value="completed">{t('contracts.status.completed')}</option>
            <option value="canceled">{t('contracts.status.canceled')}</option>
          </select>
        </div>
        
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

      {/* Contracts table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('contracts.details.tenant')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('contracts.details.vehicle')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('contracts.details.period')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('contracts.details.amount')}
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
            {filteredContracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-primary-100 text-primary-600">
                      <div className="flex h-full w-full items-center justify-center">
                        <FileText className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{contract.tenant?.full_name}</div>
                      <div className="text-sm text-gray-500">{contract.tenant?.email}</div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {contract.vehicle?.brand} {contract.vehicle?.model}
                  </div>
                  <div className="text-sm text-gray-500">{contract.vehicle?.plate}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm text-gray-900">{formatDate(contract.start_date)}</div>
                  <div className="text-sm text-gray-500">até {formatDate(contract.end_date)}</div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{formatCurrency(contract.amount)}</div>
                  <div className={`text-sm ${
                    contract.payment_status === 'paid' ? 'text-success-600' :
                    contract.payment_status === 'pending' ? 'text-warning-600' :
                    'text-danger-600'
                  }`}>
                    {t(`contracts.payment.${contract.payment_status}`)}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    contract.status === 'active' ? 'bg-success-100 text-success-800' :
                    contract.status === 'pending' ? 'bg-warning-100 text-warning-800' :
                    contract.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                    'bg-danger-100 text-danger-800'
                  }`}>
                    {t(`contracts.status.${contract.status}`)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <button 
                    onClick={() => handleEditContract(contract)}
                    className="inline-flex items-center text-primary-600 hover:text-primary-700"
                  >
                    {t('common.viewDetails')} <ArrowUpRight className="ml-1 h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredContracts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">{t('contracts.noContracts')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm
                ? t('contracts.noResults', { search: searchTerm, status: t(`contracts.status.${statusFilter}`) })
                : t('contracts.empty')}
            </p>
            <button 
              onClick={handleAddContract}
              className="mt-4 btn btn-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> {t('contracts.addContract')}
            </button>
          </div>
        )}
      </div>

      {/* Contract Form Modal */}
      <ContractForm
        contract={selectedContract}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedContract(undefined);
        }}
      />
    </div>
  );
};

export default Contracts;