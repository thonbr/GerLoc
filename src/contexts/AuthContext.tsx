import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Company = Database['public']['Tables']['companies']['Row'] & {
  plan?: {
    id: string;
    name: string;
    price: number;
    limits: {
      maxUsers: number;
      maxVehicles: number;
      maxContracts: number;
    };
  };
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: Profile['role'];
  companyId?: string;
  avatarUrl?: string;
  company?: Company;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const fetchUserProfile = async (userId: string): Promise<{ profile: Profile; company?: Company } | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar perfil:', error.message);
        return null;
      }

      if (!profile) return null;

      if (profile.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select(`
            *,
            plan:plans(
              id,
              name,
              price,
              limits
            )
          `)
          .eq('id', profile.company_id)
          .maybeSingle();

        if (companyError) {
          console.error('Erro ao buscar empresa:', companyError.message);
          return { profile };
        }

        return { profile, company: company as Company };
      }

      return { profile };
    } catch (error) {
      console.error('Exceção ao buscar perfil:', error);
      return null;
    }
  };

  const buildUser = async (supabaseUser: SupabaseUser): Promise<User | null> => {
    try {
      const result = await fetchUserProfile(supabaseUser.id);
      
      if (!result?.profile) {
        return null;
      }

      return {
        id: supabaseUser.id,
        email: result.profile.email,
        name: result.profile.full_name,
        role: result.profile.role,
        companyId: result.profile.company_id,
        avatarUrl: result.profile.avatar_url,
        company: result.company,
      };
    } catch (error) {
      console.error('Erro ao construir objeto do usuário:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('=== INITIALIZING AUTH ===');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erro ao obter sessão:', error.message);
          setLoading(false);
          setInitialized(true);
          return;
        }

        console.log('Initial session:', session);

        if (session?.user) {
          console.log('Building user from initial session...');
          const user = await buildUser(session.user);
          console.log('Built user:', user);
          setUser(user);
        } else {
          console.log('No initial session found');
        }
      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
        console.log('Auth initialization completed');
      }
    };

    initializeAuth();

    console.log('Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('=== AUTH STATE CHANGE ===');
      console.log('Event:', event);
      console.log('Session:', session);
      console.log('Initialized:', initialized);
      
      if (!initialized) {
        console.log('Not initialized yet, skipping...');
        return;
      }
      
      if (session?.user) {
        console.log('Session exists, building user...');
        const user = await buildUser(session.user);
        console.log('Built user from session:', user);
        setUser(user);

        // Log audit event for login/logout
        if (event === 'SIGNED_IN') {
          console.log('Logging sign in event...');
          await supabase.from('audit_logs').insert([{
            user_id: session.user.id,
            action_type: 'user_login',
            details: { event }
          }]);
        }
      } else {
        console.log('No session, clearing user...');
        if (event === 'SIGNED_OUT') {
          console.log('Sign out event detected');
          // Try to log the logout event before clearing the user
          try {
            if (user?.id) {
              console.log('Logging sign out event for user:', user.id);
              await supabase.from('audit_logs').insert([{
                user_id: user.id,
                action_type: 'user_logout',
                details: { event }
              }]);
            }
          } catch (error) {
            console.error('Error logging logout:', error);
          }
        }
        setUser(null);
        console.log('User cleared');
      }
      
      console.log('=== AUTH STATE CHANGE END ===');
    });

    return () => {
      console.log('Cleaning up auth listener...');
      subscription.unsubscribe();
    };
  }, [initialized, user?.id]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Usuário não encontrado');

      const user = await buildUser(data.user);
      if (!user) throw new Error('Perfil de usuário não encontrado');

      setUser(user);
    } catch (error) {
      console.error('Erro durante login:', error);
      throw error instanceof Error ? error : new Error('Falha ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error('Falha ao criar usuário');

      const user = await buildUser(data.user);
      if (!user) throw new Error('Perfil de usuário não encontrado');

      setUser(user);
    } catch (error) {
      console.error('Erro no registro:', error);
      throw new Error('Falha ao registrar usuário');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('=== LOGOUT FUNCTION START ===');
    console.log('Current user before logout:', user);
    
    try {
      console.log('Calling supabase.auth.signOut()...');
      
      // Clear user state first
      setUser(null);
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear any Supabase storage keys specifically
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      
      if (error) {
        console.error('Supabase signOut error:', error);
      }
      
      console.log('Logout completed successfully');
      console.log('=== LOGOUT FUNCTION END ===');
      
    } catch (error) {
      console.error('Error in logout function:', error);
      // Even if there's an error, ensure user state is cleared
      setUser(null);
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (error) {
      console.error('Erro na recuperação de senha:', error);
      throw new Error('Falha ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        forgotPassword,
      }}
    >
      {initialized ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};