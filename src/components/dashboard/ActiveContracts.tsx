import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Contract = Database['public']['Tables']['contracts']['Row'] & {
  tenant: {
    full_name: string;
    email: string;
  } | null;
  vehicle: {
    brand: string;
    model: string;
    plate: string;
  } | null;
};

const ActiveContracts = () => {
  const { user } = useAuth();

  // Fetch active contracts from Supabase
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['active-contracts', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error('No company ID found');

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
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!user?.companyId,
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
    return new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <FileText className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">Nenhum contrato ativo no momento</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Locatário
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Veículo
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Período
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Valor
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Ação
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {contracts.map((contract) => (
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
                <div className="text-sm text-gray-700">
                  {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <div className="text-sm font-medium text-gray-900">{formatCurrency(contract.amount)}</div>
                <div className={`text-sm ${
                  contract.payment_status === 'paid' ? 'text-success-600' :
                  contract.payment_status === 'pending' ? 'text-warning-600' :
                  'text-danger-600'
                }`}>
                  {contract.payment_status === 'paid' ? 'Pago' :
                   contract.payment_status === 'pending' ? 'Pendente' :
                   'Atrasado'}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                <Link
                  to={`/contracts/${contract.id}`}
                  className="inline-flex items-center text-primary-600 hover:text-primary-700"
                >
                  Ver <ArrowUpRight className="ml-1 h-3 w-3" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActiveContracts;