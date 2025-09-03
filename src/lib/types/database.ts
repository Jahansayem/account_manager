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
      accounts: {
        Row: {
          id: string
          email: string
          platform_id: string | null
          account_type: 'private' | 'shared'
          max_customers: number
          purchase_date: string
          expiry_date: string
          total_amount: number
          currency: string
          status: 'active' | 'inactive' | 'suspended' | 'archived'
          login_instructions: string | null
          notes: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          email: string
          platform_id?: string | null
          account_type: 'private' | 'shared'
          max_customers?: number
          purchase_date: string
          expiry_date: string
          total_amount: number
          currency?: string
          status?: 'active' | 'inactive' | 'suspended' | 'archived'
          login_instructions?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          email?: string
          platform_id?: string | null
          account_type?: 'private' | 'shared'
          max_customers?: number
          purchase_date?: string
          expiry_date?: string
          total_amount?: number
          currency?: string
          status?: 'active' | 'inactive' | 'suspended' | 'archived'
          login_instructions?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      customers: {
        Row: {
          id: string
          account_id: string
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          purchase_date: string
          duration_days: number
          expiry_date: string
          amount_paid: number
          payment_status: 'paid' | 'due' | 'partial'
          notes: string | null
          slot_number: number
          renewal_status: 'pending' | 'renewed' | 'notRenewed'
          renewal_reminder_sent: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          purchase_date: string
          duration_days: number
          expiry_date: string
          amount_paid: number
          payment_status?: 'paid' | 'due' | 'partial'
          notes?: string | null
          slot_number: number
          renewal_status?: 'pending' | 'renewed' | 'notRenewed'
          renewal_reminder_sent?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          purchase_date?: string
          duration_days?: number
          expiry_date?: string
          amount_paid?: number
          payment_status?: 'paid' | 'due' | 'partial'
          notes?: string | null
          slot_number?: number
          renewal_status?: 'pending' | 'renewed' | 'notRenewed'
          renewal_reminder_sent?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      platforms: {
        Row: {
          id: string
          name: string
          description: string | null
          icon_type: 'emoji' | 'image' | 'text' | 'url'
          icon_data: string
          color_hex: string
          category: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon_type: 'emoji' | 'image' | 'text' | 'url'
          icon_data: string
          color_hex: string
          category?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon_type?: 'emoji' | 'image' | 'text' | 'url'
          icon_data?: string
          color_hex?: string
          category?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      customer_notes: {
        Row: {
          id: string
          customer_id: string
          account_id: string
          note_text: string
          timestamp: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          customer_id: string
          account_id: string
          note_text: string
          timestamp: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          customer_id?: string
          account_id?: string
          note_text?: string
          timestamp?: string
          created_at?: string
          updated_at?: string
        }
      }
      financial_records: {
        Row: {
          id: string
          account_id: string
          amount: number
          record_type: 'income' | 'expense'
          description: string
          date: string
          category: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          amount: number
          record_type: 'income' | 'expense'
          description: string
          date: string
          category?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          amount?: number
          record_type?: 'income' | 'expense'
          description?: string
          date?: string
          category?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}