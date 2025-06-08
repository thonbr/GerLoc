import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const TrialExpired = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-warning-500" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Período de teste encerrado</h2>
          <p className="mt-2 text-gray-600">
            Seu período de teste gratuito terminou. Para continuar usando o sistema, escolha um plano que melhor atenda às suas necessidades.
          </p>
          
          {user?.company?.subscription_status === 'canceled' && (
            <div className="mt-4 rounded-md bg-warning-50 p-4 text-sm text-warning-700">
              Sua assinatura foi cancelada. Reative-a para continuar usando o sistema.
            </div>
          )}
          
          <button
            onClick={() => navigate('/billing')}
            className="btn btn-primary mt-6 w-full"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Escolher um plano
          </button>
          
          <p className="mt-4 text-sm text-gray-500">
            Precisa de ajuda? Entre em contato com nosso suporte.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrialExpired;