import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const Billing = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  if (!user?.company) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-warning-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Empresa não encontrada</h3>
          <p className="mt-1 text-sm text-gray-500">
            Você precisa estar associado a uma empresa para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  const { company } = user;
  const isTrialActive = company.trial_ends_at && new Date(company.trial_ends_at) > new Date();
  const trialEndsIn = company.trial_ends_at
    ? Math.ceil((new Date(company.trial_ends_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleManageBilling = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if company has Stripe customer ID
      if (!company.stripe_customer_id) {
        setError('Configuração de pagamento pendente. Por favor, aguarde até o final do período de teste.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('stripe-customer-portal', {
        body: {
          companyId: company.id,
          returnUrl: window.location.href,
        },
      });

      if (error) throw error;
      if (!data?.url) {
        setError('Portal de faturamento temporariamente indisponível. Por favor, tente novamente mais tarde.');
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (err) {
      console.error('Error opening billing portal:', err);
      setError('Portal de faturamento temporariamente indisponível. Por favor, tente novamente mais tarde.');
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.functions.invoke('stripe-cancel-subscription', {
        body: { companyId: company.id },
      });

      if (error) throw error;

      setShowConfirmation(false);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error canceling subscription:', err);
      setError('Não foi possível cancelar a assinatura. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Faturamento</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gerencie sua assinatura e informações de faturamento
        </p>
      </div>

      {/* Trial Banner */}
      {isTrialActive && (
        <div className="mb-6 rounded-lg bg-primary-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-primary-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-primary-800">
                Período de teste ativo
              </h3>
              <div className="mt-2 text-sm text-primary-700">
                <p>
                  Seu período de teste gratuito termina em {trialEndsIn} dias.
                  {company.subscription_status !== 'active' && (
                    ' Escolha um plano para continuar usando o sistema após o período de teste.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="mb-8 overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Plano Atual
          </h3>
          
          <div className="mt-5 border-t border-gray-200">
            <dl className="divide-y divide-gray-200">
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Nome do plano</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {company.plan?.name || 'Plano não selecionado'}
                </dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Valor mensal</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {company.plan?.price ? formatCurrency(company.plan.price) : 'N/A'}
                </dd>
              </div>
              
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Status da assinatura</dt>
                <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                  <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    company.subscription_status === 'active' ? 'bg-success-100 text-success-800' :
                    company.subscription_status === 'past_due' ? 'bg-warning-100 text-warning-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {company.subscription_status === 'active' ? 'Ativa' :
                     company.subscription_status === 'past_due' ? 'Pagamento Pendente' :
                     company.subscription_status === 'canceled' ? 'Cancelada' : 'N/A'}
                  </span>
                </dd>
              </div>

              {company.subscription_end_date && (
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Válido até</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    {new Date(company.subscription_end_date).toLocaleDateString()}
                  </dd>
                </div>
              )}

              {company.plan?.limits && (
                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Limites do plano</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                    <ul className="list-inside list-disc space-y-1">
                      <li>
                        Usuários: {company.plan.limits.maxUsers === -1 ? 'Ilimitado' : company.plan.limits.maxUsers}
                      </li>
                      <li>
                        Veículos: {company.plan.limits.maxVehicles === -1 ? 'Ilimitado' : company.plan.limits.maxVehicles}
                      </li>
                      <li>
                        Contratos: {company.plan.limits.maxContracts === -1 ? 'Ilimitado' : company.plan.limits.maxContracts}
                      </li>
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        
        <div className="bg-gray-50 px-4 py-5 sm:p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Gerenciar assinatura
              </h3>
              <div className="mt-1 max-w-xl text-sm text-gray-500">
                <p>
                  Atualize seu plano, método de pagamento ou visualize faturas anteriores.
                </p>
              </div>
            </div>
            <div className="mt-5 space-x-3 sm:ml-6 sm:mt-0">
              <button
                type="button"
                onClick={handleManageBilling}
                className="btn btn-primary inline-flex items-center"
                disabled={loading}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {loading ? 'Carregando...' : 'Portal de Faturamento'}
              </button>

              {company.subscription_status === 'active' && (
                <button
                  type="button"
                  onClick={() => setShowConfirmation(true)}
                  className="btn btn-danger"
                  disabled={loading}
                >
                  Cancelar assinatura
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warning-100">
                  <AlertTriangle className="h-6 w-6 text-warning-600" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Confirmar cancelamento
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Tem certeza que deseja cancelar sua assinatura? Você perderá acesso aos recursos premium ao final do período atual.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-md bg-danger-50 p-4 text-sm text-danger-700">
                  {error}
                </div>
              )}

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  className="btn btn-danger sm:col-start-2"
                  onClick={handleCancelSubscription}
                  disabled={loading}
                >
                  {loading ? 'Cancelando...' : 'Confirmar cancelamento'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline mt-3 sm:col-start-1 sm:mt-0"
                  onClick={() => setShowConfirmation(false)}
                  disabled={loading}
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;