import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Company = Database['public']['Tables']['companies']['Row'];

// Zod schema for company form validation
const companySchema = z.object({
  name: z.string().min(1, { message: 'O nome é obrigatório' }),
  email: z.string().email({ message: 'Email inválido' }).optional().nullable(),
  phone: z.string().optional().nullable(),
  cpf_cnpj: z.string()
    .min(1, { message: 'CPF/CNPJ é obrigatório' })
    .refine(
      (value) => {
        // Remove non-digits
        const digits = value.replace(/\D/g, '');
        // Check if it's a valid CPF (11 digits) or CNPJ (14 digits)
        return digits.length === 11 || digits.length === 14;
      },
      { message: 'CPF/CNPJ inválido' }
    ),
  address_street: z.string().min(1, { message: 'Endereço é obrigatório' }),
  address_city: z.string().min(1, { message: 'Cidade é obrigatória' }),
  address_state: z.string().min(1, { message: 'Estado é obrigatório' }),
  address_zip_code: z.string().min(1, { message: 'CEP é obrigatório' }),
  status: z.enum(['active', 'inactive', 'suspended']),
  plan_id: z.string().uuid().optional().nullable(),
  subscription_status: z.enum(['active', 'past_due', 'canceled']).optional().nullable(),
  subscription_end_date: z.string().optional().nullable(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  company?: Company;
  isOpen: boolean;
  onClose: () => void;
}

const CompanyForm = ({ company, isOpen, onClose }: CompanyFormProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch available plans
  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price');

      if (error) throw error;
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company?.name || '',
      email: company?.email || '',
      phone: company?.phone || '',
      cpf_cnpj: company?.cpf_cnpj || '',
      address_street: company?.address_street || '',
      address_city: company?.address_city || '',
      address_state: company?.address_state || '',
      address_zip_code: company?.address_zip_code || '',
      status: company?.status || 'active',
      plan_id: company?.plan_id || null,
      subscription_status: company?.subscription_status || null,
      subscription_end_date: company?.subscription_end_date?.split('T')[0] || null,
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    setError('');
    setLoading(true);

    try {
      if (company?.id) {
        // Update existing company
        const { error } = await supabase
          .from('companies')
          .update(data)
          .eq('id', company.id);

        if (error) throw error;
      } else {
        // Create new company
        const { error } = await supabase
          .from('companies')
          .insert([data]);

        if (error) throw error;
      }

      // Invalidate and refetch companies query
      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      onClose();
      reset();
    } catch (err) {
      console.error('Error saving company:', err);
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
            {company ? t('platform.editCompany') : t('platform.addCompany')}
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
              <label htmlFor="name" className="form-label">
                Nome da empresa
              </label>
              <input
                id="name"
                type="text"
                {...register('name')}
                className={`form-input w-full ${errors.name ? 'border-danger-500' : ''}`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="cpf_cnpj" className="form-label">
                CPF/CNPJ
              </label>
              <input
                id="cpf_cnpj"
                type="text"
                {...register('cpf_cnpj')}
                className={`form-input w-full ${errors.cpf_cnpj ? 'border-danger-500' : ''}`}
              />
              {errors.cpf_cnpj && (
                <p className="mt-1 text-sm text-danger-600">{errors.cpf_cnpj.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`form-input w-full ${errors.email ? 'border-danger-500' : ''}`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-danger-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="form-label">
                Telefone
              </label>
              <input
                id="phone"
                type="tel"
                {...register('phone')}
                className={`form-input w-full ${errors.phone ? 'border-danger-500' : ''}`}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-danger-600">{errors.phone.message}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-900">Endereço</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="address_street" className="form-label">
                  Endereço
                </label>
                <input
                  id="address_street"
                  type="text"
                  {...register('address_street')}
                  className={`form-input w-full ${errors.address_street ? 'border-danger-500' : ''}`}
                />
                {errors.address_street && (
                  <p className="mt-1 text-sm text-danger-600">{errors.address_street.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="address_city" className="form-label">
                  Cidade
                </label>
                <input
                  id="address_city"
                  type="text"
                  {...register('address_city')}
                  className={`form-input w-full ${errors.address_city ? 'border-danger-500' : ''}`}
                />
                {errors.address_city && (
                  <p className="mt-1 text-sm text-danger-600">{errors.address_city.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="address_state" className="form-label">
                  Estado
                </label>
                <input
                  id="address_state"
                  type="text"
                  {...register('address_state')}
                  className={`form-input w-full ${errors.address_state ? 'border-danger-500' : ''}`}
                />
                {errors.address_state && (
                  <p className="mt-1 text-sm text-danger-600">{errors.address_state.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="address_zip_code" className="form-label">
                  CEP
                </label>
                <input
                  id="address_zip_code"
                  type="text"
                  {...register('address_zip_code')}
                  className={`form-input w-full ${errors.address_zip_code ? 'border-danger-500' : ''}`}
                />
                {errors.address_zip_code && (
                  <p className="mt-1 text-sm text-danger-600">{errors.address_zip_code.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="status" className="form-label">
                Status
              </label>
              <select
                id="status"
                {...register('status')}
                className={`form-input w-full ${errors.status ? 'border-danger-500' : ''}`}
              >
                <option value="active">Ativa</option>
                <option value="inactive">Inativa</option>
                <option value="suspended">Suspensa</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-danger-600">{errors.status.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="plan_id" className="form-label">
                Plano
              </label>
              <select
                id="plan_id"
                {...register('plan_id')}
                className={`form-input w-full ${errors.plan_id ? 'border-danger-500' : ''}`}
              >
                <option value="">Nenhum</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)})
                  </option>
                ))}
              </select>
              {errors.plan_id && (
                <p className="mt-1 text-sm text-danger-600">{errors.plan_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="subscription_status" className="form-label">
                Status da Assinatura
              </label>
              <select
                id="subscription_status"
                {...register('subscription_status')}
                className={`form-input w-full ${errors.subscription_status ? 'border-danger-500' : ''}`}
              >
                <option value="">Nenhum</option>
                <option value="active">Ativa</option>
                <option value="past_due">Atrasada</option>
                <option value="canceled">Cancelada</option>
              </select>
              {errors.subscription_status && (
                <p className="mt-1 text-sm text-danger-600">{errors.subscription_status.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="subscription_end_date" className="form-label">
                Data de Término da Assinatura
              </label>
              <input
                id="subscription_end_date"
                type="date"
                {...register('subscription_end_date')}
                className={`form-input w-full ${errors.subscription_end_date ? 'border-danger-500' : ''}`}
              />
              {errors.subscription_end_date && (
                <p className="mt-1 text-sm text-danger-600">{errors.subscription_end_date.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyForm;