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

type Fine = Database['public']['Tables']['fines']['Row'];
type FineInsert = Database['public']['Tables']['fines']['Insert'];

// Zod schema for fine form validation
const fineSchema = z.object({
  vehicle_id: z.string().uuid({ message: 'Selecione um veículo' }),
  date: z.string().min(1, { message: 'A data é obrigatória' }),
  amount: z.number().positive({ message: 'O valor deve ser maior que zero' }),
  description: z.string().optional(),
  payment_status: z.enum(['pending', 'paid', 'disputed']),
});

type FineFormData = z.infer<typeof fineSchema>;

interface FineFormProps {
  fine?: Fine;
  isOpen: boolean;
  onClose: () => void;
}

const FineForm = ({ fine, isOpen, onClose }: FineFormProps) => {
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FineFormData>({
    resolver: zodResolver(fineSchema),
    defaultValues: {
      vehicle_id: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      payment_status: 'pending',
    },
  });

  // Reset form when fine changes
  useEffect(() => {
    if (fine) {
      reset({
        vehicle_id: fine.vehicle_id,
        date: fine.date.split('T')[0],
        amount: fine.amount,
        description: fine.description || '',
        payment_status: fine.payment_status,
      });
    } else {
      reset({
        vehicle_id: '',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        payment_status: 'pending',
      });
    }
  }, [fine, reset]);

  const onSubmit = async (data: FineFormData) => {
    setError('');
    setLoading(true);

    try {
      if (!user?.companyId) {
        throw new Error(t('errors.noCompany'));
      }

      const fineData: FineInsert = {
        ...data,
        company_id: user.companyId,
        date: new Date(data.date).toISOString(),
        description: data.description || null,
      };

      if (fine?.id) {
        // Update existing fine
        const { error } = await supabase
          .from('fines')
          .update(fineData)
          .eq('id', fine.id);

        if (error) throw error;
      } else {
        // Insert new fine
        const { error } = await supabase
          .from('fines')
          .insert([fineData]);

        if (error) throw error;
      }

      // Invalidate and refetch fines query
      await queryClient.invalidateQueries({ queryKey: ['fines'] });
      onClose();
    } catch (err) {
      console.error('Error saving fine:', err);
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
            {fine ? 'Editar Multa' : 'Adicionar Multa'}
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
              <label htmlFor="date" className="form-label">
                Data da Multa
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
              <label htmlFor="amount" className="form-label">
                Valor da Multa
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
              <label htmlFor="payment_status" className="form-label">
                Status do Pagamento
              </label>
              <select
                id="payment_status"
                {...register('payment_status')}
                className={`form-input w-full ${errors.payment_status ? 'border-danger-500' : ''}`}
              >
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="disputed">Contestado</option>
              </select>
              {errors.payment_status && (
                <p className="mt-1 text-sm text-danger-600">{errors.payment_status.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="form-label">
              Descrição da Multa
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className={`form-input w-full ${errors.description ? 'border-danger-500' : ''}`}
              placeholder="Descreva a infração..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
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

export default FineForm;