import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Email ou senha inválidos. Por favor, verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-danger-50 p-4 text-sm text-danger-700">
            {error}
          </div>
        )}
        
        <div>
          <label htmlFor="email" className="form-label">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input w-full"
            placeholder="nome@empresa.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="form-label">
              {t('auth.password')}
            </label>
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary-600 hover:text-primary-500"
            >
              {t('auth.forgotPassword')}
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input w-full"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              t('auth.signIn')
            )}
          </button>
        </div>
      </form>

      <div className="mt-6">
        <div className="text-center text-sm text-gray-500">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
            {t('auth.getStarted')}
          </Link>
        </div>
      </div>

      <div className="mt-8 rounded-md bg-gray-50 p-4">
        <h3 className="text-sm font-medium text-gray-900">Credenciais de Demonstração</h3>
        <div className="mt-2 text-xs text-gray-600">
          <p><strong>Administrador:</strong> admin@motorent.com / @2025Motorent</p>
          <p><strong>Usuário:</strong> user@example.com / @2025Motorent</p>
        </div>
      </div>
    </div>
  );
};

export default Login;