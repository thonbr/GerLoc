import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];

// Zod schema for contract form validation
const contractSchema = z.object({
  tenant_id: z.string().uuid({ message: 'Selecione um locatário' }),
  vehicle_id: z.string().uuid({ message: 'Selecione um veículo' }),
  start_date: z.string().refine((date) => new Date(date) >= new Date(), {
    message: 'A data de início deve ser futura',
  }),
  end_date: z.string(),
  amount: z.number().positive({ message: 'O valor deve ser maior que zero' }),
  status: z.enum(['active', 'pending', 'completed', 'canceled']),
  payment_status: z.enum(['paid', 'pending', 'overdue']),
  notes: z.string().optional(),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
  message: 'A data de término deve ser posterior à data de início',
  path: ['end_date'],
});

type ContractFormData = z.infer<typeof contractSchema>;

interface ContractFormProps {
  contract?: Contract;
  isOpen: boolean;
  onClose: () => void;
}

const ContractForm = ({ contract, isOpen, onClose }: ContractFormProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      tenant_id: contract?.tenant_id || '',
      vehicle_id: contract?.vehicle_id || '',
      start_date: contract?.start_date?.split('.')[0] || new Date().toISOString().split('.')[0].slice(0, 16),
      end_date: contract?.end_date?.split('.')[0] || new Date(Date.now() + 86400000).toISOString().split('.')[0].slice(0, 16),
      status: contract?.status || 'pending',
      amount: contract?.amount || 0,
      payment_status: contract?.payment_status || 'pending',
      notes: contract?.notes || '',
    },
  });

  // Fetch tenants
  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery({
    queryKey: ['tenants', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', user.companyId)
        .eq('role', 'company_user')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });

  // Fetch vehicles
  const { data: vehicles = [], isLoading: isLoadingVehicles } = useQuery({
    queryKey: ['available-vehicles', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('vehicles')
        .select('id, brand, model, plate, daily_rate')
        .eq('company_id', user.companyId)
        .eq('status', 'available')
        .order('brand, model');

      if (error) throw error;
      return data;
    },
    enabled: !!user?.companyId,
  });

  const onSubmit = async (data: ContractFormData) => {
    setError('');
    setLoading(true);

    try {
      if (!user?.companyId) {
        throw new Error(t('errors.noCompany'));
      }

      const contractData: ContractInsert = {
        ...data,
        company_id: user.companyId,
      };

      if (contract?.id) {
        // Update existing contract
        const { error } = await supabase
          .from('contracts')
          .update(contractData)
          .eq('id', contract.id);

        if (error) throw error;
      } else {
        // Insert new contract
        const { error } = await supabase
          .from('contracts')
          .insert([contractData]);

        if (error) throw error;
      }

      // Invalidate and refetch contracts query
      await queryClient.invalidateQueries({ queryKey: ['contracts'] });
      onClose();
    } catch (err) {
      console.error('Error saving contract:', err);
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {contract ? t('contracts.edit') : t('contracts.add')}
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tenant_id" className="form-label">
                {t('contracts.details.tenant')}
              </label>
              <select
                id="tenant_id"
                {...register('tenant_id')}
                className={`form-input w-full ${errors.tenant_id ? 'border-danger-500' : ''}`}
                disabled={isLoadingTenants}
              >
                <option value="">{t('common.select')}</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.full_name}
                  </option>
                ))}
              </select>
              {errors.tenant_id && (
                <p className="mt-1 text-sm text-danger-600">{errors.tenant_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="vehicle_id" className="form-label">
                {t('contracts.details.vehicle')}
              </label>
              <select
                id="vehicle_id"
                {...register('vehicle_id')}
                className={`form-input w-full ${errors.vehicle_id ? 'border-danger-500' : ''}`}
                disabled={isLoadingVehicles}
                onChange={(e) => {
                  const vehicle = vehicles.find(v => v.id === e.target.value);
                  setValue('vehicle_id', e.target.value);
                  setValue('amount', vehicle ? vehicle.daily_rate * 30 : 0);
                }}
              >
                <option value="">{t('common.select')}</option>
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
              <label htmlFor="start_date" className="form-label">
                {t('contracts.details.startDate')}
              </label>
              <input
                id="start_date"
                type="datetime-local"
                {...register('start_date')}
                className={`form-input w-full ${errors.start_date ? 'border-danger-500' : ''}`}
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-danger-600">{errors.start_date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="end_date" className="form-label">
                {t('contracts.details.endDate')}
              </label>
              <input
                id="end_date"
                type="datetime-local"
                {...register('end_date')}
                className={`form-input w-full ${errors.end_date ? 'border-danger-500' : ''}`}
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-danger-600">{errors.end_date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="form-label">
                {t('contracts.details.amount')}
              </label>
              <input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className={`form-input w-full ${errors.amount ? 'border-danger-500' : ''}`}
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-danger-600">{errors.amount.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="status" className="form-label">
                {t('contracts.details.status')}
              </label>
              <select
                id="status"
                {...register('status')}
                className={`form-input w-full ${errors.status ? 'border-danger-500' : ''}`}
              >
                <option value="pending">{t('contracts.status.pending')}</option>
                <option value="active">{t('contracts.status.active')}</option>
                <option value="completed">{t('contracts.status.completed')}</option>
                <option value="canceled">{t('contracts.status.canceled')}</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-danger-600">{errors.status.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="payment_status" className="form-label">
                {t('contracts.details.paymentStatus')}
              </label>
              <select
                id="payment_status"
                {...register('payment_status')}
                className={`form-input w-full ${errors.payment_status ? 'border-danger-500' : ''}`}
              >
                <option value="pending">{t('contracts.payment.pending')}</option>
                <option value="paid">{t('contracts.payment.paid')}</option>
                <option value="overdue">{t('contracts.payment.overdue')}</option>
              </select>
              {errors.payment_status && (
                <p className="mt-1 text-sm text-danger-600">{errors.payment_status.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="form-label">
              {t('contracts.details.notes')}
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

export default ContractForm;