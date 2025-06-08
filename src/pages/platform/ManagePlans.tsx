import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Edit2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../lib/database.types';
import PlanForm from '../../components/platform/PlanForm';

type Plan = Database['public']['Tables']['plans']['Row'];

const ManagePlans = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | undefined>();

  // Fetch plans from Supabase
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price');

      if (error) throw error;
      return data;
    },
  });

  const handleAddPlan = () => {
    setSelectedPlan(undefined);
    setIsFormOpen(true);
  };

  const handleEditPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  const handleDeletePlan = async (plan: Plan) => {
    if (!window.confirm(t('platform.plans.confirmDelete'))) {
      return;
    }

    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', plan.id);

      if (error) throw error;

      // Invalidate and refetch plans query
      await queryClient.invalidateQueries({ queryKey: ['plans'] });
    } catch (err) {
      console.error('Error deleting plan:', err);
      alert(t('errors.unknown'));
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('platform.plans.title')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('platform.plans.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button 
            onClick={handleAddPlan}
            className="btn btn-primary flex items-center"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('platform.plans.add')}
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="card overflow-hidden">
            <div className="border-b bg-gray-50 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="h-6 w-6 text-primary-600" />
                  <h3 className="ml-2 text-xl font-semibold text-gray-900">{plan.name}</h3>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleEditPlan(plan)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title={t('common.edit')}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-danger-600"
                    title={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">{formatCurrency(plan.price)}</span>
                <span className="text-gray-500">/mês</span>
              </div>
              {plan.description && (
                <p className="text-sm text-gray-600">{plan.description}</p>
              )}
            </div>
            
            <div className="p-6">
              <h4 className="mb-4 font-medium text-gray-900">{t('platform.plans.details.features')}</h4>
              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Package className="mr-2 h-5 w-5 flex-shrink-0 text-success-500" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-medium text-gray-900">{t('platform.plans.details.limits')}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('platform.plans.details.maxUsers')}:</span>
                    <span className="font-medium text-gray-900">
                      {plan.limits.maxUsers}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('platform.plans.details.maxVehicles')}:</span>
                    <span className="font-medium text-gray-900">
                      {plan.limits.maxVehicles}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('platform.plans.details.maxContracts')}:</span>
                    <span className="font-medium text-gray-900">
                      {plan.limits.maxContracts}
                    </span>
                  </div>
                </div>
              </div>

              {!plan.is_active && (
                <div className="mt-4 rounded-md bg-warning-50 p-2 text-center text-sm text-warning-800">
                  {t('platform.plans.inactive')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
          <Package className="h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">{t('platform.plans.empty')}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('platform.plans.emptyDescription')}
          </p>
          <button 
            onClick={handleAddPlan}
            className="mt-4 btn btn-primary"
          >
            <Plus className="mr-2 h-4 w-4" /> {t('platform.plans.add')}
          </button>
        </div>
      )}

      {/* Plan Form Modal */}
      <PlanForm
        plan={selectedPlan}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedPlan(undefined);
        }}
      />
    </div>
  );
};

export default ManagePlans;