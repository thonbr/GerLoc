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

type Profile = Database['public']['Tables']['profiles']['Row'];

// Zod schema for user form validation
const userSchema = z.object({
  full_name: z.string().min(1, { message: 'O nome é obrigatório' }),
  email: z.string().email({ message: 'Email inválido' }),
  role: z.enum(['platform_admin', 'company_admin', 'company_user']),
  company_id: z.string().uuid().optional().nullable(),
  is_active: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: Profile;
  isOpen: boolean;
  onClose: () => void;
  isPlatformAdmin?: boolean;
}

const UserForm = ({ user, isOpen, onClose, isPlatformAdmin = false }: UserFormProps) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch companies for platform admin
  const { data: companies = [] } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: isPlatformAdmin,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'company_user',
      company_id: null,
      is_active: true,
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      reset({
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        company_id: user.company_id,
        is_active: user.is_active,
      });
    } else {
      reset({
        full_name: '',
        email: '',
        role: 'company_user',
        company_id: null,
        is_active: true,
      });
    }
  }, [user, reset]);

  const onSubmit = async (data: UserFormData) => {
    setError('');
    setLoading(true);

    try {
      if (!isPlatformAdmin && !currentUser?.companyId) {
        throw new Error(t('errors.noCompany'));
      }

      const profileData = {
        ...data,
        company_id: isPlatformAdmin ? data.company_id : currentUser?.companyId,
      };

      if (user?.id) {
        // Update existing user
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id);

        if (error) throw error;
      } else {
        // Create new user
        const { error } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (error) throw error;
      }

      // Invalidate and refetch users query
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-users'] });
      onClose();
      reset();
    } catch (err) {
      console.error('Error saving user:', err);
      setError(err instanceof Error ? err.message : t('errors.unknown'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {user ? t('users.edit') : t('users.add')}
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
          <div>
            <label htmlFor="full_name" className="form-label">
              {t('users.details.name')}
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
              {t('users.details.email')}
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
            <label htmlFor="role" className="form-label">
              {t('users.details.role')}
            </label>
            <select
              id="role"
              {...register('role')}
              className={`form-input w-full ${errors.role ? 'border-danger-500' : ''}`}
            >
              {isPlatformAdmin && (
                <option value="platform_admin">{t('users.roles.platform_admin')}</option>
              )}
              <option value="company_admin">{t('users.roles.company_admin')}</option>
              <option value="company_user">{t('users.roles.company_user')}</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-danger-600">{errors.role.message}</p>
            )}
          </div>

          {isPlatformAdmin && (
            <div>
              <label htmlFor="company_id" className="form-label">
                {t('common.company')}
              </label>
              <select
                id="company_id"
                {...register('company_id')}
                className={`form-input w-full ${errors.company_id ? 'border-danger-500' : ''}`}
              >
                <option value="">{t('common.none')}</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {errors.company_id && (
                <p className="mt-1 text-sm text-danger-600">{errors.company_id.message}</p>
              )}
            </div>
          )}

          <div className="flex items-center">
            <input
              id="is_active"
              type="checkbox"
              {...register('is_active')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              {t('users.details.active')}
            </label>
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

export default UserForm;