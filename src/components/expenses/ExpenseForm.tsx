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

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];

// Zod schema for expense form validation
const expenseSchema = z.object({
  date: z.string().min(1, { message: 'A data é obrigatória' }),
  amount: z.number().positive({ message: 'O valor deve ser maior que zero' }),
  description: z.string().optional(),
  category: z.string().min(1, { message: 'A categoria é obrigatória' }),
  notes: z.string().optional(),
  vehicle_id: z.string().optional().nullable(),
  contract_id: z.string().optional().nullable(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  expense?: Expense;
  isOpen: boolean;
  onClose: () => void;
}

const ExpenseForm = ({ expense, isOpen, onClose }: ExpenseFormProps) => {
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

  // Fetch contracts for dropdown
  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts', user?.companyId],
    queryFn: async () => {
      if (!user?.companyId) throw new Error(t('errors.noCompany'));

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          tenant:profiles!contracts_tenant_id_fkey(full_name),
          vehicle:vehicles!contracts_vehicle_id_fkey(brand, model, plate)
        `)
        .eq('company_id', user.companyId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

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
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      description: '',
      category: '',
      notes: '',
      vehicle_id: null,
      contract_id: null,
    },
  });

  // Reset form when expense changes
  useEffect(() => {
    if (expense) {
      reset({
        date: expense.date.split('T')[0],
        amount: expense.amount,
        description: expense.description || '',
        category: expense.category,
        notes: expense.notes || '',
        vehicle_id: expense.vehicle_id || null,
        contract_id: expense.contract_id || null,
      });
    } else {
      reset({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        category: '',
        notes: '',
        vehicle_id: null,
        contract_id: null,
      });
    }
  }, [expense, reset]);

  const onSubmit = async (data: ExpenseFormData) => {
    setError('');
    setLoading(true);

    try {
      if (!user?.companyId) {
        throw new Error(t('errors.noCompany'));
      }

      const expenseData: ExpenseInsert = {
        ...data,
        company_id: user.companyId,
        date: new Date(data.date).toISOString(),
        description: data.description || null,
        notes: data.notes || null,
        vehicle_id: data.vehicle_id || null,
        contract_id: data.contract_id || null,
      };

      if (expense?.id) {
        // Update existing expense
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', expense.id);

        if (error) throw error;
      } else {
        // Insert new expense
        const { error } = await supabase
          .from('expenses')
          .insert([expenseData]);

        if (error) throw error;
      }

      // Invalidate and refetch expenses query
      await queryClient.invalidateQueries({ queryKey: ['expenses'] });
      onClose();
    } catch (err) {
      console.error('Error saving expense:', err);
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    'Combustível',
    'Manutenção',
    'Seguro',
    'Documentação',
    'Lavagem',
    'Peças',
    'Multas',
    'Estacionamento',
    'Outros',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {expense ? 'Editar Despesa' : 'Adicionar Despesa'}
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
            <h3 className="mb-4 text-lg font-medium text-gray-900">Informações da Despesa</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="date" className="form-label">
                  Data
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
                  Valor
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
                <label htmlFor="category" className="form-label">
                  Categoria
                </label>
                <select
                  id="category"
                  {...register('category')}
                  className={`form-input w-full ${errors.category ? 'border-danger-500' : ''}`}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-danger-600">{errors.category.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="form-label">
                  Descrição
                </label>
                <input
                  id="description"
                  type="text"
                  {...register('description')}
                  className={`form-input w-full ${errors.description ? 'border-danger-500' : ''}`}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Associações */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">Associações (Opcional)</h3>
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
                  <option value="">Nenhum veículo</option>
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
                <label htmlFor="contract_id" className="form-label">
                  Contrato
                </label>
                <select
                  id="contract_id"
                  {...register('contract_id')}
                  className={`form-input w-full ${errors.contract_id ? 'border-danger-500' : ''}`}
                >
                  <option value="">Nenhum contrato</option>
                  {contracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.tenant?.full_name} - {contract.vehicle?.brand} {contract.vehicle?.model}
                    </option>
                  ))}
                </select>
                {errors.contract_id && (
                  <p className="mt-1 text-sm text-danger-600">{errors.contract_id.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="notes" className="form-label">
              Observações
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

export default ExpenseForm;