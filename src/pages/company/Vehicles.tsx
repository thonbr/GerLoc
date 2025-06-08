import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bike, Plus, Filter, Search, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import VehicleForm from '../../components/vehicles/VehicleForm';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];

const Vehicles = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Vehicle['status']>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | undefined>();
  const [loading, setLoading] = useState<string | null>(null);
  
  // Fetch vehicles from Supabase
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('company_id', user.companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });
  
  // Filter vehicles based on search term and status
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.plate.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const handleAddVehicle = () => {
    setSelectedVehicle(undefined);
    setIsFormOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsFormOpen(true);
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!window.confirm(`Tem certeza que deseja excluir o veículo ${vehicle.brand} ${vehicle.model} (${vehicle.plate})?`)) {
      return;
    }

    setLoading(vehicle.id);
    try {
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicle.id);

      if (error) throw error;

      // Invalidate and refetch vehicles query
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (err) {
      console.error('Error deleting vehicle:', err);
      alert(t('errors.unknown'));
    } finally {
      setLoading(null);
    }
  };
  
  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('vehicles.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('vehicles.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddVehicle}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('vehicles.addVehicle')}
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
            <option value="available">{t('vehicles.status.available')}</option>
            <option value="rented">{t('vehicles.status.rented')}</option>
            <option value="maintenance">{t('vehicles.status.maintenance')}</option>
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
      
      {/* Vehicle grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredVehicles.map((vehicle) => (
          <div key={vehicle.id} className="card overflow-hidden transition-all hover:shadow-lg">
            <div className="aspect-video bg-gray-200">
              <div className="flex h-full items-center justify-center bg-gray-100">
                <Bike className="h-16 w-16 text-gray-400" />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {vehicle.brand} {vehicle.model}
                </h3>
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                  vehicle.status === 'available' ? 'bg-success-100 text-success-800' :
                  vehicle.status === 'rented' ? 'bg-primary-100 text-primary-800' :
                  'bg-warning-100 text-warning-800'
                }`}>
                  {t(`vehicles.status.${vehicle.status}`)}
                </span>
              </div>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <p>{t('vehicles.details.year')}: {vehicle.year}</p>
                <p>{t('vehicles.details.plate')}: {vehicle.plate}</p>
                <p>{t('vehicles.details.dailyRate')}: {formatCurrency(vehicle.daily_rate)}</p>
                {vehicle.mileage && (
                  <p>{t('vehicles.details.mileage')}: {vehicle.mileage.toLocaleString()} km</p>
                )}
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button 
                  onClick={() => handleEditVehicle(vehicle)}
                  className="rounded-md p-2 text-sm font-medium text-primary-600 hover:bg-primary-50 hover:text-primary-700"
                  title={t('common.edit')}
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDeleteVehicle(vehicle)}
                  className="rounded-md p-2 text-sm font-medium text-danger-600 hover:bg-danger-50 hover:text-danger-700"
                  disabled={loading === vehicle.id}
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Empty state */}
      {filteredVehicles.length === 0 && !isLoading && (
        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <Bike className="h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">{t('vehicles.noVehicles')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm
              ? t('vehicles.noResults', { search: searchTerm, status: t(`vehicles.status.${statusFilter}`) })
              : t('vehicles.empty')}
          </p>
          <button 
            onClick={handleAddVehicle}
            className="mt-4 btn btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" /> {t('vehicles.addVehicle')}
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      )}

      {/* Vehicle Form Modal */}
      <VehicleForm
        vehicle={selectedVehicle}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedVehicle(undefined);
        }}
      />
    </div>
  );
};

export default Vehicles;