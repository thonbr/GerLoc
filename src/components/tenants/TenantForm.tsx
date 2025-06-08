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

type Profile = Database['public']['Tables']['profiles']['Row'];

// Zod schema for tenant form validation
const tenantSchema = z.object({
  full_name: z.string().min(1, { message: 'O nome é obrigatório' }),
  email: z.string().email({ message: 'Email inválido' }),
  phone: z.string().optional(),
  rg: z.string().optional(),
  cnh: z.string().optional(),
  is_active: z.boolean(),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface TenantFormProps {
  tenant?: Profile;
  isOpen: boolean;
  onClose: () => void;
}

const TenantForm = ({ tenant, isOpen, onClose }: TenantFormProps) => {
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
  } = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      rg: '',
      cnh: '',
      is_active: true,
    },
  });

  // Reset form when tenant changes
  useEffect(() => {
    if (tenant) {
      reset({
        full_name: tenant.full_name,
        email: tenant.email,
        phone: tenant.phone || '',
        rg: tenant.rg || '',
        cnh: tenant.cnh || '',
        is_active: tenant.is_active,
      });
    } else {
      reset({
        full_name: '',
        email: '',
        phone: '',
        rg: '',
        cnh: '',
        is_active: true,
      });
    }
  }, [tenant, reset]);

  const onSubmit = async (data: TenantFormData) => {
    setError('');
    setLoading(true);

    try {
      if (!user?.companyId) {
        throw new Error(t('errors.noCompany'));
      }

      const profileData = {
        ...data,
        company_id: user.companyId,
        role: 'company_user' as const,
      };

      if (tenant?.id) {
        // Update existing tenant
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', tenant.id);

        if (error) throw error;
      } else {
        // Create new tenant
        const { error } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (error) throw error;
      }

      // Invalidate and refetch tenants query
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
      onClose();
    } catch (err) {
      console.error('Error saving tenant:', err);
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
            {tenant ? t('tenants.edit') : t('tenants.add')}
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
          {/* Informações Pessoais */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">Informações Pessoais</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="full_name" className="form-label">
                  {t('tenants.details.name')}
                </label>
                <input
                  id="full_name"
                  type="text"
                  {...register('full_name')}
                  className={`form-input w-full ${errors.full_name ? 'border-danger-500' : ''}`}
                />
                {errors.full_name && (
                  <p className="mt-1 text-sm text-danger-600">{errors.full_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="form-label">
                  {t('tenants.details.email')}
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

              <div className="flex items-center">
                <input
                  id="is_active"
                  type="checkbox"
                  {...register('is_active')}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  {t('tenants.details.active')}
                </label>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">Documentos</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rg" className="form-label">
                  RG
                </label>
                <input
                  id="rg"
                  type="text"
                  {...register('rg')}
                  className={`form-input w-full ${errors.rg ? 'border-danger-500' : ''}`}
                />
                {errors.rg && (
                  <p className="mt-1 text-sm text-danger-600">{errors.rg.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="cnh" className="form-label">
                  CNH
                </label>
                <input
                  id="cnh"
                  type="text"
                  {...register('cnh')}
                  className={`form-input w-full ${errors.cnh ? 'border-danger-500' : ''}`}
                />
                {errors.cnh && (
                  <p className="mt-1 text-sm text-danger-600">{errors.cnh.message}</p>
                )}
              </div>
            </div>
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

export default TenantForm;