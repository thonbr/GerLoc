import { loadStripe } from '@stripe/stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// Initialize stripe only if public key is available
export const stripe = stripePublicKey ? loadStripe(stripePublicKey) : null;

export const createCheckoutSession = async (planId: string, companyId: string) => {
  // Check if Stripe is properly configured
  if (!stripePublicKey) {
    // Instead of throwing an error, redirect to dashboard with trial
    console.warn('Stripe is not configured, proceeding with trial only');
    return '/dashboard';
  }

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        planId,
        companyId,
        returnUrl: `${window.location.origin}/dashboard`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    const { url } = await response.json();
    return url;
  } catch (error) {
    console.error('Stripe checkout error:', error);
    // Return dashboard URL as fallback
    return '/dashboard';
  }
};