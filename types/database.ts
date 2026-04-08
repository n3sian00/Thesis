// Auto-generoidun tyypityksen placeholder.
// Korvaa ajamalla: npx supabase gen types typescript --project-id <id> > types/database.ts

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          city: string | null
          cancellation_hours: number
          theme: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['businesses']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>
      }
      services: {
        Row: {
          id: string
          business_id: string
          name: string
          description: string | null
          duration_minutes: number
          price: number
          active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['services']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['services']['Insert']>
      }
      bookings: {
        Row: {
          id: string
          business_id: string
          service_id: string
          customer_name: string
          customer_email: string
          customer_phone: string | null
          starts_at: string
          ends_at: string
          status: string
          reminder_sent: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['bookings']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
      }
      waitlist: {
        Row: {
          id: string
          business_id: string
          service_id: string
          customer_name: string
          customer_email: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['waitlist']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['waitlist']['Insert']>
      }
    }
  }
}
