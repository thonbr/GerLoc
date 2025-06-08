import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Plus, Search, ArrowUpRight, Check, X, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import TenantForm from '../../components/tenants/TenantForm';

type Profile = Database['public']['Tables']['profiles']['Row'];

const Tenants = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | boolean>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Profile | undefined>();

  // Fetch tenants from Supabase
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          created_at,
          full_name,
          email,
          is_active,
          last_sign_in_at,
          contracts:contracts(count)
        `)
        .eq('company_id', user.companyId)
        .eq('role', 'company_user')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });

  // Filter tenants based on search term and status
  const filteredTenants = tenants.filter(tenant => {
    const matchesSearch = 
      tenant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || tenant.is_active === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Format date to display in a more readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleAddTenant = () => {
    setSelectedTenant(undefined);
    setIsFormOpen(true);
  };

  const handleEditTenant = (tenant: Profile) => {
    setSelectedTenant(tenant);
    setIsFormOpen(true);
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
          <h1 className="text-2xl font-bold text-gray-900">{t('tenants.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('tenants.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddTenant}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('tenants.addTenant')}
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="relative w-64">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter === 'all' ? 'all' : statusFilter.toString()}
            onChange={(e) => setStatusFilter(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">{t('common.all')}</option>
            <option value="true">{t('tenants.status.active')}</option>
            <option value="false">{t('tenants.status.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Tenants table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('tenants.details.name')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('tenants.details.email')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('common.status')}
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('tenants.details.since')}
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                        <span className="text-sm font-medium text-primary-700">
                          {tenant.full_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{tenant.full_name}</div>
                      <div className="text-xs text-gray-500">
                        {tenant.contracts?.[0]?.count || 0} contratos
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <Mail className="mr-2 h-4 w-4" />
                    {tenant.email}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tenant.is_active
                      ? 'bg-success-100 text-success-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tenant.is_active ? (
                      <Check className="mr-1 h-3 w-3" />
                    ) : (
                      <X className="mr-1 h-3 w-3" />
                    )}
                    {tenant.is_active ? t('tenants.status.active') : t('tenants.status.inactive')}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm text-gray-500">
                    {formatDate(tenant.created_at)}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <button 
                    onClick={() => handleEditTenant(tenant)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <span className="flex items-center">
                      {t('common.viewDetails')}
                      <ArrowUpRight className="ml-1 h-4 w-4" />
                    </span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredTenants.length === 0 && (
          <div className="py-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? t('tenants.noResults') : t('tenants.empty')}
            </h3>
            <div className="mt-6">
              <button 
                onClick={handleAddTenant}
                className="btn btn-primary inline-flex items-center"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('tenants.addTenant')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tenant Form Modal */}
      <TenantForm
        tenant={selectedTenant}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedTenant(undefined);
        }}
      />
    </div>
  );
};

export default Tenants;