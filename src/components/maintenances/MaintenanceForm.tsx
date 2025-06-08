import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Maintenance = Database['public']['Tables']['maintenances']['Row'];
type MaintenanceInsert = Database['public']['Tables']['maintenances']['Insert'];

// Zod schema for maintenance form validation
const maintenanceSchema = z.object({
  vehicle_id: z.string().uuid({ message: 'Selecione um veículo' }),
  maintenance_type: z.string().min(1, { message: 'O tipo de manutenção é obrigatório' }),
  date: z.string().min(1, { message: 'A data é obrigatória' }),
  cost: z.number().min(0, { message: 'O custo deve ser positivo' }).optional(),
  description: z.string().optional(),
  supplier_id: z.string().optional().nullable(),
  parts_used: z.string().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

interface MaintenanceFormProps {
  maintenance?: Maintenance;
  isOpen: boolean;
  onClose: () => void;
}

const MaintenanceForm = ({ maintenance, isOpen, onClose }: MaintenanceFormProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch vehicles for dropdown
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, brand, model, plate')
        .eq('company_id', user.companyId)
        .order('brand, model');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });

  // Fetch suppliers for dropdown
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('company_id', user.companyId)
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      vehicle_id: '',
      maintenance_type: '',
      date: new Date().toISOString().split('T')[0],
      cost: undefined,
      description: '',
      supplier_id: null,
      parts_used: '',
    },
  });

  // Reset form when maintenance changes
  useEffect(() => {
    if (maintenance) {
      reset({
        vehicle_id: maintenance.vehicle_id,
        maintenance_type: maintenance.maintenance_type,
        date: maintenance.date.split('T')[0],
        cost: maintenance.cost || undefined,
        description: maintenance.description || '',
        supplier_id: maintenance.supplier_id || null,
        parts_used: maintenance.parts_used ? JSON.stringify(maintenance.parts_used) : '',
      });
    } else {
      reset({
        vehicle_id: '',
        maintenance_type: '',
        date: new Date().toISOString().split('T')[0],
        cost: undefined,
        description: '',
        supplier_id: null,
        parts_used: '',
      });
    }
  }, [maintenance, reset]);

  const onSubmit = async (data: MaintenanceFormData) => {
    setError('');
    setLoading(true);

    try {
      if (!user?.companyId) {
        throw new Error(t('errors.noCompany'));
      }

      const maintenanceData: MaintenanceInsert = {
        ...data,
        company_id: user.companyId,
        date: new Date(data.date).toISOString(),
        cost: data.cost || null,
        description: data.description || null,
        supplier_id: data.supplier_id || null,
        parts_used: data.parts_used ? JSON.parse(data.parts_used) : null,
      };

      if (maintenance?.id) {
        // Update existing maintenance
        const { error } = await supabase
          .from('maintenances')
          .update(maintenanceData)
          .eq('id', maintenance.id);

        if (error) throw error;
      } else {
        // Insert new maintenance
        const { error } = await supabase
          .from('maintenances')
          .insert([maintenanceData]);

        if (error) throw error;
      }

      // Invalidate and refetch maintenances query
      await queryClient.invalidateQueries({ queryKey: ['maintenances'] });
      onClose();
    } catch (err) {
      console.error('Error saving maintenance:', err);
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const maintenanceTypes = [
    'Preventiva',
    'Corretiva',
    'Troca de óleo',
    'Revisão geral',
    'Freios',
    'Pneus',
    'Suspensão',
    'Motor',
    'Elétrica',
    'Outros',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {maintenance ? 'Editar Manutenção' : 'Adicionar Manutenção'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-danger-50 p-4 text-sm text-danger-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vehicle_id" className="form-label">
                Veículo
              </label>
              <select
                id="vehicle_id"
                {...register('vehicle_id')}
                className={`form-input w-full ${errors.vehicle_id ? 'border-danger-500' : ''}`}
              >
                <option value="">Selecione um veículo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.brand} {vehicle.model} - {vehicle.plate}
                  </option>
                ))}
              </select>
              {errors.vehicle_id && (
                <p className="mt-1 text-sm text-danger-600">{errors.vehicle_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="maintenance_type" className="form-label">
                Tipo de Manutenção
              </label>
              <select
                id="maintenance_type"
                {...register('maintenance_type')}
                className={`form-input w-full ${errors.maintenance_type ? 'border-danger-500' : ''}`}
              >
                <option value="">Selecione o tipo</option>
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.maintenance_type && (
                <p className="mt-1 text-sm text-danger-600">{errors.maintenance_type.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="date" className="form-label">
                Data da Manutenção
              </label>
              <input
                id="date"
                type="date"
                {...register('date')}
                className={`form-input w-full ${errors.date ? 'border-danger-500' : ''}`}
              />
              {errors.date && (
                <p className="mt-1 text-sm text-danger-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="cost" className="form-label">
                Custo
              </label>
              <input
                id="cost"
                type="number"
                step="0.01"
                {...register('cost', { valueAsNumber: true })}
                className={`form-input w-full ${errors.cost ? 'border-danger-500' : ''}`}
              />
              {errors.cost && (
                <p className="mt-1 text-sm text-danger-600">{errors.cost.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="supplier_id" className="form-label">
                Fornecedor
              </label>
              <select
                id="supplier_id"
                {...register('supplier_id')}
                className={`form-input w-full ${errors.supplier_id ? 'border-danger-500' : ''}`}
              >
                <option value="">Nenhum fornecedor</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              {errors.supplier_id && (
                <p className="mt-1 text-sm text-danger-600">{errors.supplier_id.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="form-label">
              Descrição
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className={`form-input w-full ${errors.description ? 'border-danger-500' : ''}`}
              placeholder="Descreva os serviços realizados..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="parts_used" className="form-label">
              Peças Utilizadas (JSON)
            </label>
            <textarea
              id="parts_used"
              rows={3}
              {...register('parts_used')}
              className={`form-input w-full ${errors.parts_used ? 'border-danger-500' : ''}`}
              placeholder='{"filtro_oleo": 1, "oleo_motor": "5L"}'
            />
            {errors.parts_used && (
              <p className="mt-1 text-sm text-danger-600">{errors.parts_used.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaintenanceForm;