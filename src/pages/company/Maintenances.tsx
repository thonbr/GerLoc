import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wrench, Plus, Search, Filter, Edit2, Trash2, Calendar, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import MaintenanceForm from '../../components/maintenances/MaintenanceForm';

type Maintenance = Database['public']['Tables']['maintenances']['Row'] & {
  vehicle: {
    brand: string;
    model: string;
    plate: string;
  } | null;
  supplier: {
    name: string;
  } | null;
};

const Maintenances = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<Maintenance | undefined>();
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch maintenances from Supabase
  const { data: maintenances = [], isLoading } = useQuery({
    queryKey: ['maintenances', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('maintenances')
        .select(`
          *,
          vehicle:vehicles(brand, model, plate),
          supplier:suppliers(name)
        `)
        .eq('company_id', user.companyId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Maintenance[];
    },
    enabled: !!user?.companyId,
  });

  // Filter maintenances based on search term and type
  const filteredMaintenances = maintenances.filter(maintenance => {
    const matchesSearch = 
      maintenance.maintenance_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.vehicle?.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.vehicle?.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      maintenance.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || maintenance.maintenance_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Get unique maintenance types for filter
  const maintenanceTypes = Array.from(new Set(maintenances.map(m => m.maintenance_type))).sort();

  // Calculate total cost
  const totalCost = filteredMaintenances.reduce((sum, maintenance) => sum + (maintenance.cost || 0), 0);

  const handleAddMaintenance = () => {
    setSelectedMaintenance(undefined);
    setIsFormOpen(true);
  };

  const handleEditMaintenance = (maintenance: Maintenance) => {
    setSelectedMaintenance(maintenance);
    setIsFormOpen(true);
  };

  const handleDeleteMaintenance = async (maintenance: Maintenance) => {
    if (!window.confirm(`Tem certeza que deseja excluir esta manutenção?`)) {
      return;
    }

    setLoading(maintenance.id);
    try {
      const { error } = await supabase
        .from('maintenances')
        .delete()
        .eq('id', maintenance.id);

      if (error) throw error;

      // Invalidate and refetch maintenances query
      await queryClient.invalidateQueries({ queryKey: ['maintenances'] });
    } catch (err) {
      console.error('Error deleting maintenance:', err);
      alert(t('errors.unknown'));
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
          <h1 className="text-2xl font-bold text-gray-900">Manutenções</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie o histórico de manutenções dos veículos
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddMaintenance}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Manutenção
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="mb-6 card p-6">
        <div className="flex items-center">
          <div className="rounded-full bg-warning-100 p-3 text-warning-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Custo Total de Manutenções</p>
            <h3 className="mt-1 text-2xl font-semibold text-gray-900">
              {formatCurrency(totalCost)}
            </h3>
          </div>
        </div>
      </div>

      {/* Filters and search */}
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Tipo:</span>
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">Todos</option>
            {maintenanceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar manutenções..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 md:w-64"
          />
        </div>
      </div>

      {/* Maintenances table */}
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
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Custo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Fornecedor
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredMaintenances.map((maintenance) => (
              <tr key={maintenance.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center text-sm text-gray-900">
                    <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                    {formatDate(maintenance.date)}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-warning-100 text-warning-600">
                      <div className="flex h-full w-full items-center justify-center">
                        <Wrench className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {maintenance.vehicle?.brand} {maintenance.vehicle?.model}
                      </div>
                      <div className="text-sm text-gray-500">{maintenance.vehicle?.plate}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{maintenance.maintenance_type}</div>
                  {maintenance.description && (
                    <div className="text-sm text-gray-500 line-clamp-1">{maintenance.description}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(maintenance.cost)}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <div className="text-sm text-gray-900">
                    {maintenance.supplier?.name || '-'}
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => handleEditMaintenance(maintenance)}
                      className="rounded-md p-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteMaintenance(maintenance)}
                      className="rounded-md p-2 text-sm font-medium text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                      disabled={loading === maintenance.id}
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
        {filteredMaintenances.length === 0 && !isLoading && (
          <div className="py-8 text-center">
            <Wrench className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || typeFilter !== 'all' 
                ? 'Nenhuma manutenção encontrada' 
                : 'Nenhuma manutenção cadastrada'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || typeFilter !== 'all'
                ? 'Tente ajustar seus filtros de busca'
                : 'Comece adicionando a primeira manutenção'}
            </p>
            <button 
              onClick={handleAddMaintenance}
              className="mt-4 btn btn-primary"
            >
              <Plus className="mr-2 h-4 w-4" /> Adicionar Manutenção
            </button>
          </div>
        )}
      </div>

      {/* Maintenance Form Modal */}
      <MaintenanceForm
        maintenance={selectedMaintenance}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedMaintenance(undefined);
        }}
      />
    </div>
  );
};

export default Maintenances;