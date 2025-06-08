import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, Search, Filter, Edit2, Trash2, Calendar, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import FineForm from '../../components/fines/FineForm';

type Fine = Database['public']['Tables']['fines']['Row'] & {
  vehicle: {
    brand: string;
    model: string;
    plate: string;
  } | null;
};

const Fines = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<Fine | undefined>();
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch fines from Supabase
  const { data: fines = [], isLoading } = useQuery({
    queryKey: ['fines', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('fines')
        .select(`
          *,
          vehicle:vehicles(brand, model, plate)
        `)
        .eq('company_id', user.companyId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Fine[];
    },
    enabled: !!user?.companyId,
  });

  // Filter fines based on search term and status
  const filteredFines = fines.filter(fine => {
    const matchesSearch = 
      fine.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.vehicle?.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.vehicle?.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fine.vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || fine.payment_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalAmount = filteredFines.reduce((sum, fine) => sum + fine.amount, 0);
  const paidAmount = filteredFines.filter(f => f.payment_status === 'paid').reduce((sum, fine) => sum + fine.amount, 0);
  const pendingAmount = filteredFines.filter(f => f.payment_status === 'pending').reduce((sum, fine) => sum + fine.amount, 0);

  const handleAddFine = () => {
    setSelectedFine(undefined);
    setIsFormOpen(true);
  };

  const handleEditFine = (fine: Fine) => {
    setSelectedFine(fine);
    setIsFormOpen(true);
  };

  const handleDeleteFine = async (fine: Fine) => {
    if (!window.confirm(`Tem certeza que deseja excluir esta multa?`)) {
      return;
    }

    setLoading(fine.id);
    try {
      const { error } = await supabase
        .from('fines')
        .delete()
        .eq('id', fine.id);

      if (error) throw error;

      // Invalidate and refetch fines query
      await queryClient.invalidateQueries({ queryKey: ['fines'] });
    } catch (err) {
      console.error('Error deleting fine:', err);
      alert(t('errors.unknown'));
    } finally {
      setLoading(null);
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Multas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie multas e infrações dos veículos
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddFine}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Multa
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="rounded-full bg-danger-100 p-3 text-danger-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total em Multas</p>
              <h3 className="mt-1 text-xl font-semibold text-gray-900">
                {formatCurrency(totalAmount)}
              </h3>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="rounded-full bg-success-100 p-3 text-success-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Multas Pagas</p>
              <h3 className="mt-1 text-xl font-semibold text-gray-900">
                {formatCurrency(paidAmount)}
              </h3>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="rounded-full bg-warning-100 p-3 text-warning-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Multas Pendentes</p>
              <h3 className="mt-1 text-xl font-semibold text-gray-900">
                {formatCurrency(pendingAmount)}
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and search */}
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="disputed">Contestado</option>
          </select>
        </div>
        
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar multas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-64"
          />
        </div>
      </div>

      {/* Fines table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Data
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Veículo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Descrição
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Valor
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredFines.map((fine) => (
              <tr key={fine.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {formatDate(fine.date)}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-danger-100 text-danger-600">
                      <div className="flex h-full w-full items-center justify-center">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {fine.vehicle?.brand} {fine.vehicle?.model}
                      </div>
                      <div className="text-sm text-gray-500">{fine.vehicle?.plate}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {fine.description || 'Sem descrição'}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm font-medium text-danger-600">
                    {formatCurrency(fine.amount)}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    fine.payment_status === 'paid' ? 'bg-success-100 text-success-800' :
                    fine.payment_status === 'pending' ? 'bg-warning-100 text-warning-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {fine.payment_status === 'paid' ? 'Pago' :
                     fine.payment_status === 'pending' ? 'Pendente' :
                     'Contestado'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleEditFine(fine)}
                      className="rounded-md p-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteFine(fine)}
                      className="rounded-md p-2 text-sm font-medium text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                      disabled={loading === fine.id}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filteredFines.length === 0 && !isLoading && (
          <div className="py-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || statusFilter !== 'all' 
                ? 'Nenhuma multa encontrada' 
                : 'Nenhuma multa cadastrada'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar seus filtros de busca'
                : 'Comece adicionando a primeira multa'}
            </p>
            <button 
              onClick={handleAddFine}
              className="mt-4 btn btn-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar Multa
            </button>
          </div>
        )}
      </div>

      {/* Fine Form Modal */}
      <FineForm
        fine={selectedFine}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedFine(undefined);
        }}
      />
    </div>
  );
};

export default Fines;