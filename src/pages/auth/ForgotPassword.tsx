import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <Link to="/login" className="flex items-center text-sm font-medium text-primary-600 hover:text-primary-500">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to sign in
        </Link>
      </div>

      {success ? (
        <div className="rounded-md bg-success-50 p-4 text-sm text-success-700">
          <p>Password reset link has been sent to your email. Please check your inbox.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-danger-50 p-4 text-sm text-danger-700">
              {error}
            </div>
          )}
          
          <div>
            <h2 className="text-lg font-medium">Reset your password</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>
          
          <div>
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input w-full"
              placeholder="name@company.com"
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
                  Sending...
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ForgotPassword;