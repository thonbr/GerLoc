import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];

// Zod schema for vehicle form validation
const vehicleSchema = z.object({
  brand: z.string().min(1, { message: 'A marca é obrigatória' }),
  model: z.string().min(1, { message: 'O modelo é obrigatório' }),
  year: z.number()
    .int()
    .min(1900, { message: 'O ano deve ser maior que 1900' })
    .max(new Date().getFullYear() + 1, { message: 'Ano inválido' }),
  plate: z.string()
    .min(1, { message: 'A placa é obrigatória' })
    .max(10, { message: 'Placa muito longa' })
    .toUpperCase(),
  chassi: z.string().optional(),
  color: z.string().optional(),
  purchase_value: z.number().min(0, { message: 'O valor deve ser positivo' }).optional(),
  daily_rate: z.number()
    .positive({ message: 'A diária deve ser maior que zero' }),
  mileage: z.number()
    .min(0, { message: 'A quilometragem não pode ser negativa' })
    .optional(),
  status: z.enum(['available', 'rented', 'maintenance']),
  last_maintenance: z.string().nullable().optional(),
  next_maintenance: z.string().nullable().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.last_maintenance && data.next_maintenance) {
    return new Date(data.next_maintenance) > new Date(data.last_maintenance);
  }
  return true;
}, {
  message: 'A próxima manutenção deve ser posterior à última manutenção',
  path: ['next_maintenance'],
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  vehicle?: Vehicle;
  isOpen: boolean;
  onClose: () => void;
}

const VehicleForm = ({ vehicle, isOpen, onClose }: VehicleFormProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      plate: '',
      chassi: '',
      color: '',
      purchase_value: undefined,
      daily_rate: 0,
      mileage: 0,
      status: 'available',
      last_maintenance: null,
      next_maintenance: null,
      notes: '',
    },
  });

  // Reset form when vehicle changes
  useEffect(() => {
    if (vehicle) {
      reset({
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        plate: vehicle.plate,
        chassi: vehicle.chassi || '',
        color: vehicle.color || '',
        purchase_value: vehicle.purchase_value || undefined,
        daily_rate: vehicle.daily_rate,
        mileage: vehicle.mileage || 0,
        status: vehicle.status,
        last_maintenance: vehicle.last_maintenance?.split('T')[0] || null,
        next_maintenance: vehicle.next_maintenance?.split('T')[0] || null,
        notes: vehicle.notes || '',
      });
    } else {
      reset({
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        plate: '',
        chassi: '',
        color: '',
        purchase_value: undefined,
        daily_rate: 0,
        mileage: 0,
        status: 'available',
        last_maintenance: null,
        next_maintenance: null,
        notes: '',
      });
    }
  }, [vehicle, reset]);

  const onSubmit = async (data: VehicleFormData) => {
    setError('');
    setLoading(true);

    try {
      if (!user?.companyId) {
        throw new Error(t('errors.noCompany'));
      }

      // Prepare vehicle data
      const vehicleData: VehicleInsert = {
        brand: data.brand,
        model: data.model,
        year: data.year,
        plate: data.plate.toUpperCase(),
        chassi: data.chassi || null,
        color: data.color || null,
        purchase_value: data.purchase_value || null,
        daily_rate: data.daily_rate,
        mileage: data.mileage || 0,
        status: data.status,
        company_id: user.companyId,
        last_maintenance: data.last_maintenance ? new Date(data.last_maintenance).toISOString() : null,
        next_maintenance: data.next_maintenance ? new Date(data.next_maintenance).toISOString() : null,
        notes: data.notes || null,
      };

      if (vehicle?.id) {
        // Update existing vehicle
        const { error } = await supabase
          .from('vehicles')
          .update(vehicleData)
          .eq('id', vehicle.id);

        if (error) throw error;
      } else {
        // Insert new vehicle
        const { error } = await supabase
          .from('vehicles')
          .insert([vehicleData]);

        if (error) throw error;
      }

      // Invalidate and refetch vehicles query
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      onClose();
    } catch (err) {
      console.error('Error saving vehicle:', err);
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {vehicle ? t('vehicles.edit') : t('vehicles.add')}
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
          {/* Informações Básicas */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">Informações Básicas</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="brand" className="form-label">
                  {t('vehicles.details.brand')}
                </label>
                <input
                  id="brand"
                  type="text"
                  {...register('brand')}
                  className={`form-input w-full ${errors.brand ? 'border-danger-500' : ''}`}
                />
                {errors.brand && (
                  <p className="mt-1 text-sm text-danger-600">{errors.brand.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="model" className="form-label">
                  {t('vehicles.details.model')}
                </label>
                <input
                  id="model"
                  type="text"
                  {...register('model')}
                  className={`form-input w-full ${errors.model ? 'border-danger-500' : ''}`}
                />
                {errors.model && (
                  <p className="mt-1 text-sm text-danger-600">{errors.model.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="year" className="form-label">
                  {t('vehicles.details.year')}
                </label>
                <input
                  id="year"
                  type="number"
                  {...register('year', { valueAsNumber: true })}
                  className={`form-input w-full ${errors.year ? 'border-danger-500' : ''}`}
                />
                {errors.year && (
                  <p className="mt-1 text-sm text-danger-600">{errors.year.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="plate" className="form-label">
                  {t('vehicles.details.plate')}
                </label>
                <input
                  id="plate"
                  type="text"
                  {...register('plate')}
                  className={`form-input w-full uppercase ${errors.plate ? 'border-danger-500' : ''}`}
                />
                {errors.plate && (
                  <p className="mt-1 text-sm text-danger-600">{errors.plate.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="chassi" className="form-label">
                  Chassi
                </label>
                <input
                  id="chassi"
                  type="text"
                  {...register('chassi')}
                  className={`form-input w-full ${errors.chassi ? 'border-danger-500' : ''}`}
                />
                {errors.chassi && (
                  <p className="mt-1 text-sm text-danger-600">{errors.chassi.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="color" className="form-label">
                  Cor
                </label>
                <input
                  id="color"
                  type="text"
                  {...register('color')}
                  className={`form-input w-full ${errors.color ? 'border-danger-500' : ''}`}
                />
                {errors.color && (
                  <p className="mt-1 text-sm text-danger-600">{errors.color.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Informações Financeiras */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">Informações Financeiras</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="purchase_value" className="form-label">
                  Valor de Compra
                </label>
                <input
                  id="purchase_value"
                  type="number"
                  step="0.01"
                  {...register('purchase_value', { valueAsNumber: true })}
                  className={`form-input w-full ${errors.purchase_value ? 'border-danger-500' : ''}`}
                />
                {errors.purchase_value && (
                  <p className="mt-1 text-sm text-danger-600">{errors.purchase_value.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="daily_rate" className="form-label">
                  {t('vehicles.details.dailyRate')}
                </label>
                <input
                  id="daily_rate"
                  type="number"
                  step="0.01"
                  {...register('daily_rate', { valueAsNumber: true })}
                  className={`form-input w-full ${errors.daily_rate ? 'border-danger-500' : ''}`}
                />
                {errors.daily_rate && (
                  <p className="mt-1 text-sm text-danger-600">{errors.daily_rate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status e Quilometragem */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">Status e Quilometragem</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="status" className="form-label">
                  {t('vehicles.details.status')}
                </label>
                <select
                  id="status"
                  {...register('status')}
                  className={`form-input w-full ${errors.status ? 'border-danger-500' : ''}`}
                >
                  <option value="available">{t('vehicles.status.available')}</option>
                  <option value="maintenance">{t('vehicles.status.maintenance')}</option>
                  <option value="rented">{t('vehicles.status.rented')}</option>
                </select>
                {errors.status && (
                  <p className="mt-1 text-sm text-danger-600">{errors.status.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="mileage" className="form-label">
                  {t('vehicles.details.mileage')}
                </label>
                <input
                  id="mileage"
                  type="number"
                  {...register('mileage', { valueAsNumber: true })}
                  className={`form-input w-full ${errors.mileage ? 'border-danger-500' : ''}`}
                />
                {errors.mileage && (
                  <p className="mt-1 text-sm text-danger-600">{errors.mileage.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Manutenção */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">Manutenção</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="last_maintenance" className="form-label">
                  {t('vehicles.details.lastMaintenance')}
                </label>
                <input
                  id="last_maintenance"
                  type="date"
                  {...register('last_maintenance')}
                  className={`form-input w-full ${errors.last_maintenance ? 'border-danger-500' : ''}`}
                />
                {errors.last_maintenance && (
                  <p className="mt-1 text-sm text-danger-600">{errors.last_maintenance.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="next_maintenance" className="form-label">
                  {t('vehicles.details.nextMaintenance')}
                </label>
                <input
                  id="next_maintenance"
                  type="date"
                  {...register('next_maintenance')}
                  className={`form-input w-full ${errors.next_maintenance ? 'border-danger-500' : ''}`}
                />
                {errors.next_maintenance && (
                  <p className="mt-1 text-sm text-danger-600">{errors.next_maintenance.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="notes" className="form-label">
              {t('vehicles.details.notes')}
            </label>
            <textarea
              id="notes"
              rows={3}
              {...register('notes')}
              className={`form-input w-full ${errors.notes ? 'border-danger-500' : ''}`}
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-danger-600">{errors.notes.message}</p>
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

export default VehicleForm;