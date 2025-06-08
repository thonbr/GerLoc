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

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];

// Zod schema for supplier form validation
const supplierSchema = z.object({
  name: z.string().min(1, { message: 'O nome é obrigatório' }),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email({ message: 'Email inválido' }).optional().or(z.literal('')),
  address: z.string().optional(),
  services_provided: z.string().optional(),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface SupplierFormProps {
  supplier?: Supplier;
  isOpen: boolean;
  onClose: () => void;
}

const SupplierForm = ({ supplier, isOpen, onClose }: SupplierFormProps) => {
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
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      services_provided: '',
    },
  });

  // Reset form when supplier changes
  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name,
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        services_provided: supplier.services_provided || '',
      });
    } else {
      reset({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        services_provided: '',
      });
    }
  }, [supplier, reset]);

  const onSubmit = async (data: SupplierFormData) => {
    setError('');
    setLoading(true);

    try {
      if (!user?.companyId) {
        throw new Error(t('errors.noCompany'));
      }

      const supplierData: SupplierInsert = {
        ...data,
        company_id: user.companyId,
        email: data.email || null,
        contact_person: data.contact_person || null,
        phone: data.phone || null,
        address: data.address || null,
        services_provided: data.services_provided || null,
      };

      if (supplier?.id) {
        // Update existing supplier
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', supplier.id);

        if (error) throw error;
      } else {
        // Insert new supplier
        const { error } = await supabase
          .from('suppliers')
          .insert([supplierData]);

        if (error) throw error;
      }

      // Invalidate and refetch suppliers query
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
    } catch (err) {
      console.error('Error saving supplier:', err);
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
            {supplier ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="form-label">
                  Nome do Fornecedor
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
                <label htmlFor="contact_person" className="form-label">
                  Pessoa de Contato
                </label>
                <input
                  id="contact_person"
                  type="text"
                  {...register('contact_person')}
                  className={`form-input w-full ${errors.contact_person ? 'border-danger-500' : ''}`}
                />
                {errors.contact_person && (
                  <p className="mt-1 text-sm text-danger-600">{errors.contact_person.message}</p>
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
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">Endereço</h3>
            <div>
              <label htmlFor="address" className="form-label">
                Endereço Completo
              </label>
              <textarea
                id="address"
                rows={3}
                {...register('address')}
                className={`form-input w-full ${errors.address ? 'border-danger-500' : ''}`}
              />
              {errors.address && (
                <p className="mt-1 text-sm text-danger-600">{errors.address.message}</p>
              )}
            </div>
          </div>

          {/* Serviços */}
          <div>
            <h3 className="mb-4 text-lg font-medium text-gray-900">Serviços</h3>
            <div>
              <label htmlFor="services_provided" className="form-label">
                Serviços Fornecidos
              </label>
              <textarea
                id="services_provided"
                rows={3}
                {...register('services_provided')}
                className={`form-input w-full ${errors.services_provided ? 'border-danger-500' : ''}`}
                placeholder="Descreva os serviços ou produtos fornecidos..."
              />
              {errors.services_provided && (
                <p className="mt-1 text-sm text-danger-600">{errors.services_provided.message}</p>
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

export default SupplierForm;