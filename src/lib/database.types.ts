export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          created_at: string
          name: string
          email: string | null
          phone: string | null
          status: 'active' | 'inactive' | 'suspended'
          plan_id: string | null
          subscription_status: 'active' | 'past_due' | 'canceled' | null
          subscription_end_date: string | null
          stripe_customer_id: string | null
          settings: Json | null
          address_street: string | null
          address_city: string | null
          address_state: string | null
          address_zip_code: string | null
          cpf_cnpj: string | null
          trial_ends_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          email?: string | null
          phone?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          plan_id?: string | null
          subscription_status?: 'active' | 'past_due' | 'canceled' | null
          subscription_end_date?: string | null
          stripe_customer_id?: string | null
          settings?: Json | null
          address_street?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip_code?: string | null
          cpf_cnpj?: string | null
          trial_ends_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          email?: string | null
          phone?: string | null
          status?: 'active' | 'inactive' | 'suspended'
          plan_id?: string | null
          subscription_status?: 'active' | 'past_due' | 'canceled' | null
          subscription_end_date?: string | null
          stripe_customer_id?: string | null
          settings?: Json | null
          address_street?: string | null
          address_city?: string | null
          address_state?: string | null
          address_zip_code?: string | null
          cpf_cnpj?: string | null
          trial_ends_at?: string | null
        }
      }
      contracts: {
        Row: {
          id: string
          created_at: string
          tenant_id: string
          vehicle_id: string
          company_id: string
          start_date: string
          end_date: string
          status: 'active' | 'pending' | 'completed' | 'canceled'
          amount: number
          payment_status: 'paid' | 'pending' | 'overdue'
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          tenant_id: string
          vehicle_id: string
          company_id: string
          start_date: string
          end_date: string
          status?: 'active' | 'pending' | 'completed' | 'canceled'
          amount: number
          payment_status?: 'paid' | 'pending' | 'overdue'
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          tenant_id?: string
          vehicle_id?: string
          company_id?: string
          start_date?: string
          end_date?: string
          status?: 'active' | 'pending' | 'completed' | 'canceled'
          amount?: number
          payment_status?: 'paid' | 'pending' | 'overdue'
          notes?: string | null
        }
      }
      expenses: {
        Row: {
          id: string
          created_at: string
          company_id: string
          date: string
          amount: number
          description: string | null
          category: string
          notes: string | null
          vehicle_id: string | null
          contract_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          company_id: string
          date: string
          amount: number
          description?: string | null
          category: string
          notes?: string | null
          vehicle_id?: string | null
          contract_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          company_id?: string
          date?: string
          amount?: number
          description?: string | null
          category?: string
          notes?: string | null
          vehicle_id?: string | null
          contract_id?: string | null
        }
      }
      fines: {
        Row: {
          id: string
          created_at: string
          vehicle_id: string
          date: string
          amount: number
          description: string | null
          payment_status: 'pending' | 'paid' | 'disputed'
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          vehicle_id: string
          date: string
          amount: number
          description?: string | null
          payment_status?: 'pending' | 'paid' | 'disputed'
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          vehicle_id?: string
          date?: string
          amount?: number
          description?: string | null
          payment_status?: 'pending' | 'paid' | 'disputed'
          company_id?: string
        }
      }
      insurances: {
        Row: {
          id: string
          created_at: string
          vehicle_id: string
          policy_number: string
          provider: string | null
          start_date: string
          end_date: string
          value: number
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          vehicle_id: string
          policy_number: string
          provider?: string | null
          start_date: string
          end_date: string
          value: number
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          vehicle_id?: string
          policy_number?: string
          provider?: string | null
          start_date?: string
          end_date?: string
          value?: number
          company_id?: string
        }
      }
      maintenances: {
        Row: {
          id: string
          created_at: string
          vehicle_id: string
          maintenance_type: string
          date: string
          cost: number | null
          description: string | null
          supplier_id: string | null
          parts_used: Json | null
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          vehicle_id: string
          maintenance_type: string
          date: string
          cost?: number | null
          description?: string | null
          supplier_id?: string | null
          parts_used?: Json | null
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          vehicle_id?: string
          maintenance_type?: string
          date?: string
          cost?: number | null
          description?: string | null
          supplier_id?: string | null
          parts_used?: Json | null
          company_id?: string
        }
      }
      plans: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          price: number
          features: string[]
          limits: Json
          is_active: boolean
          stripe_price_id: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          price: number
          features?: string[]
          limits?: Json
          is_active?: boolean
          stripe_price_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          price?: number
          features?: string[]
          limits?: Json
          is_active?: boolean
          stripe_price_id?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          email: string
          full_name: string
          avatar_url: string | null
          company_id: string | null
          role: 'platform_admin' | 'company_admin' | 'company_user'
          is_active: boolean
          last_sign_in_at: string | null
          rg: string | null
          cnh: string | null
          phone: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          email: string
          full_name: string
          avatar_url?: string | null
          company_id?: string | null
          role?: 'platform_admin' | 'company_admin' | 'company_user'
          is_active?: boolean
          last_sign_in_at?: string | null
          rg?: string | null
          cnh?: string | null
          phone?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          email?: string
          full_name?: string
          avatar_url?: string | null
          company_id?: string | null
          role?: 'platform_admin' | 'company_admin' | 'company_user'
          is_active?: boolean
          last_sign_in_at?: string | null
          rg?: string | null
          cnh?: string | null
          phone?: string | null
        }
      }
      suppliers: {
        Row: {
          id: string
          created_at: string
          company_id: string
          name: string
          contact_person: string | null
          phone: string | null
          email: string | null
          address: string | null
          services_provided: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          created_at?: string
          company_id: string
          name: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          services_provided?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          created_at?: string
          company_id?: string
          name?: string
          contact_person?: string | null
          phone?: string | null
          email?: string | null
          address?: string | null
          services_provided?: string | null
          metadata?: Json | null
        }
      }
      tenant_documents: {
        Row: {
          id: string
          created_at: string
          tenant_id: string
          document_type: string
          file_url: string
          expiration_date: string | null
          notes: string | null
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          tenant_id: string
          document_type: string
          file_url: string
          expiration_date?: string | null
          notes?: string | null
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          tenant_id?: string
          document_type?: string
          file_url?: string
          expiration_date?: string | null
          notes?: string | null
          company_id?: string
        }
      }
      trackers: {
        Row: {
          id: string
          created_at: string
          vehicle_id: string
          serial_number: string
          provider: string | null
          status: 'active' | 'inactive' | 'maintenance'
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          vehicle_id: string
          serial_number: string
          provider?: string | null
          status?: 'active' | 'inactive' | 'maintenance'
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          vehicle_id?: string
          serial_number?: string
          provider?: string | null
          status?: 'active' | 'inactive' | 'maintenance'
          company_id?: string
        }
      }
      vehicle_documents: {
        Row: {
          id: string
          created_at: string
          vehicle_id: string
          document_type: string
          file_url: string
          expiration_date: string | null
          notes: string | null
          company_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          vehicle_id: string
          document_type: string
          file_url: string
          expiration_date?: string | null
          notes?: string | null
          company_id: string
        }
        Update: {
          id?: string
          created_at?: string
          vehicle_id?: string
          document_type?: string
          file_url?: string
          expiration_date?: string | null
          notes?: string | null
          company_id?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          created_at: string
          brand: string
          model: string
          year: number
          plate: string
          status: 'available' | 'rented' | 'maintenance'
          company_id: string
          daily_rate: number
          mileage: number | null
          last_maintenance: string | null
          next_maintenance: string | null
          notes: string | null
          metadata: Json | null
          chassi: string | null
          color: string | null
          purchase_value: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          brand: string
          model: string
          year: number
          plate: string
          status?: 'available' | 'rented' | 'maintenance'
          company_id: string
          daily_rate: number
          mileage?: number | null
          last_maintenance?: string | null
          next_maintenance?: string | null
          notes?: string | null
          metadata?: Json | null
          chassi?: string | null
          color?: string | null
          purchase_value?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          brand?: string
          model?: string
          year?: number
          plate?: string
          status?: 'available' | 'rented' | 'maintenance'
          company_id?: string
          daily_rate?: number
          mileage?: number | null
          last_maintenance?: string | null
          next_maintenance?: string | null
          notes?: string | null
          metadata?: Json | null
          chassi?: string | null
          color?: string | null
          purchase_value?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}