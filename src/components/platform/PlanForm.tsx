import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';

type Plan = Database['public']['Tables']['plans']['Row'];

// Zod schema for plan form validation
const planSchema = z.object({
  name: z.string().min(1, { message: 'O nome é obrigatório' }),
  description: z.string().optional().nullable(),
  price: z.number().min(0, { message: 'O preço deve ser maior ou igual a zero' }),
  features: z.array(z.string()).default([]),
  limits: z.object({
    maxUsers: z.number().min(1).default(5),
    maxVehicles: z.number().min(1).default(10),
    maxContracts: z.number().min(1).default(50),
  }).default({
    maxUsers: 5,
    maxVehicles: 10,
    maxContracts: 50,
  }),
  is_active: z.boolean().default(true),
  stripe_price_id: z.string().optional().nullable(),
});

type PlanFormData = z.infer<typeof planSchema>;

interface PlanFormProps {
  plan?: Plan;
  isOpen: boolean;
  onClose: () => void;
}

const PlanForm = ({ plan, isOpen, onClose }: PlanFormProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newFeature, setNewFeature] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      features: [],
      limits: {
        maxUsers: 5,
        maxVehicles: 10,
        maxContracts: 50,
      },
      is_active: true,
      stripe_price_id: null,
    },
  });

  // Reset form when plan changes
  useEffect(() => {
    if (plan) {
      reset({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        features: plan.features || [],
        limits: plan.limits || {
          maxUsers: 5,
          maxVehicles: 10,
          maxContracts: 50,
        },
        is_active: plan.is_active ?? true,
        stripe_price_id: plan.stripe_price_id,
      });
    } else {
      reset({
        name: '',
        description: '',
        price: 0,
        features: [],
        limits: {
          maxUsers: 5,
          maxVehicles: 10,
          maxContracts: 50,
        },
        is_active: true,
        stripe_price_id: null,
      });
    }
  }, [plan, reset]);

  const features = watch('features');

  const addFeature = () => {
    if (newFeature.trim()) {
      setValue('features', [...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setValue('features', features.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PlanFormData) => {
    setError('');
    setLoading(true);

    try {
      if (plan?.id) {
        // Update existing plan
        const { error } = await supabase
          .from('plans')
          .update(data)
          .eq('id', plan.id);

        if (error) throw error;
      } else {
        // Create new plan
        const { error } = await supabase
          .from('plans')
          .insert([data]);

        if (error) throw error;
      }

      // Invalidate and refetch plans query
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
      onClose();
      reset();
    } catch (err) {
      console.error('Error saving plan:', err);
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
            {plan ? t('platform.plans.edit') : t('platform.plans.add')}
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
                {t('platform.plans.details.name')}
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
              <label htmlFor="price" className="form-label">
                {t('platform.plans.details.price')}
              </label>
              <input
                id="price"
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                className={`form-input w-full ${errors.price ? 'border-danger-500' : ''}`}
              />
              {errors.price && (
                <p className="mt-1 text-sm text-danger-600">{errors.price.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="description" className="form-label">
              {t('platform.plans.details.description')}
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className={`form-input w-full ${errors.description ? 'border-danger-500' : ''}`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-danger-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">
              {t('platform.plans.details.features')}
            </label>
            <div className="mb-2 flex">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                className="form-input flex-1"
                placeholder={t('platform.plans.details.featurePlaceholder')}
              />
              <button
                type="button"
                onClick={addFeature}
                className="ml-2 rounded-md bg-primary-600 px-3 py-2 text-white hover:bg-primary-700"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                  <span>{feature}</span>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="text-gray-400 hover:text-danger-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-medium text-gray-900">
              {t('platform.plans.details.limits')}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="maxUsers" className="form-label">
                  {t('platform.plans.details.maxUsers')}
                </label>
                <input
                  id="maxUsers"
                  type="number"
                  {...register('limits.maxUsers', { valueAsNumber: true })}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label htmlFor="maxVehicles" className="form-label">
                  {t('platform.plans.details.maxVehicles')}
                </label>
                <input
                  id="maxVehicles"
                  type="number"
                  {...register('limits.maxVehicles', { valueAsNumber: true })}
                  className="form-input w-full"
                />
              </div>
              <div>
                <label htmlFor="maxContracts" className="form-label">
                  {t('platform.plans.details.maxContracts')}
                </label>
                <input
                  id="maxContracts"
                  type="number"
                  {...register('limits.maxContracts', { valueAsNumber: true })}
                  className="form-input w-full"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="is_active"
              type="checkbox"
              {...register('is_active')}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
              {t('platform.plans.details.active')}
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

export default PlanForm;