import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Building, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { createCheckoutSession } from '../../lib/stripe';

// Zod schema for company details step
const companyDetailsSchema = z.object({
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
});

// Zod schema for plan selection step
const planSelectionSchema = z.object({
  plan_id: z.string().min(1, { message: 'Selecione um plano' }),
});

// Combined schema for the entire form
const companySchema = companyDetailsSchema.merge(planSelectionSchema);

type CompanyFormData = z.infer<typeof companySchema>;

const CompanySetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form setup with combined schema
  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  });

  // Fetch available plans
  const { data: plans = [], isLoading: isLoadingPlans } = useQuery({
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

  // Handle step navigation
  const handleNext = async () => {
    let fieldsToValidate: (keyof CompanyFormData)[] = [];

    // Determine which fields to validate based on current step
    if (currentStep === 0) {
      fieldsToValidate = [
        'name',
        'cpf_cnpj',
        'address_street',
        'address_city',
        'address_state',
        'address_zip_code',
      ];
    } else if (currentStep === 1) {
      fieldsToValidate = ['plan_id'];
    }

    // Validate fields for current step
    const isValid = await trigger(fieldsToValidate);

    if (isValid) {
      if (currentStep < 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    if (!user?.id) {
      setError('Usuário não encontrado');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Calculate trial end date (7 days from now)
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert([
          {
            ...data,
            status: 'active',
            subscription_status: 'active',
            trial_ends_at: trialEndsAt.toISOString(),
          },
        ])
        .select()
        .single();

      if (companyError) throw companyError;

      // Update user profile with company_id and role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: company.id,
          role: 'company_admin',
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      try {
        // Create Stripe checkout session
        const redirectUrl = await createCheckoutSession(data.plan_id, company.id);
        // Redirect to Stripe checkout or dashboard
        window.location.href = redirectUrl;
      } catch (stripeError) {
        console.error('Error creating Stripe checkout session:', stripeError);
        // If Stripe fails, redirect to dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Error creating company:', err);
      setError(err instanceof Error ? err.message : 'Falha ao criar empresa');
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  if (isLoadingPlans) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" />
          <p className="mt-2 text-sm text-gray-600">Carregando planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back to login link */}
      <Link 
        to="/login" 
        className="mb-8 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para login
      </Link>

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <Building className="h-6 w-6 text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Configure sua empresa</h1>
        <p className="mt-2 text-gray-600">
          {currentStep === 0 ? 'Preencha os dados da sua empresa' : 'Escolha um plano para começar'}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
            currentStep >= 0 ? 'bg-primary-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <div className="h-1 w-16 bg-gray-200">
            <div className={`h-full ${
              currentStep >= 1 ? 'bg-primary-600' : 'bg-gray-200'
            }`} />
          </div>
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
            currentStep >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-danger-50 p-4 text-sm text-danger-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Company Details */}
        {currentStep === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Dados da empresa</h2>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

            <div className="mt-6">
              <h3 className="mb-4 text-sm font-medium text-gray-900">Endereço</h3>
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
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
          </div>
        )}

        {/* Step 2: Plan Selection */}
        {currentStep === 1 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-medium text-gray-900">Escolha seu plano</h2>
            <p className="mb-6 text-sm text-gray-600">
              Todos os planos incluem 7 dias de teste grátis. Cancele a qualquer momento.
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <label
                  key={plan.id}
                  className={`relative cursor-pointer rounded-lg border p-4 hover:bg-gray-50 ${
                    errors.plan_id ? 'border-danger-500' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    {...register('plan_id')}
                    value={plan.id}
                    className="sr-only"
                  />
                  <div className="flex flex-col">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{plan.name}</h3>
                        <p className="text-sm text-gray-500">{plan.description}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-medium text-gray-900">
                      {formatCurrency(plan.price)}<span className="text-gray-500">/mês</span>
                    </p>
                    <ul className="mt-4 space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600">
                          <svg
                            className="mr-2 h-4 w-4 text-success-500"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </label>
              ))}
            </div>
            {errors.plan_id && (
              <p className="mt-2 text-sm text-danger-600">{errors.plan_id.message}</p>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between space-x-4">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="btn btn-outline flex items-center"
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </button>
          )}
          
          {currentStep === 0 ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn btn-primary ml-auto flex items-center"
              disabled={loading}
            >
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary ml-auto flex items-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando empresa...
                </>
              ) : (
                <>
                  Criar empresa
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default CompanySetup;