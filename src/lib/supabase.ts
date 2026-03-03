// src/lib/supabase.ts - SINGLETON SUPABASE
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://faxmuldojxwkxwabrwzi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheG11bGRvanh3a3h3YWJyd3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjAzOTUsImV4cCI6MjA4NTYzNjM5NX0.kVVHxgQRRG5tsUv_SekTvwmuufuQLjwvamK7dj4qyHM'

// ✅ SINGLETON : Une seule instance partout
let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (supabaseClient) return supabaseClient
  
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  console.log('✅ Supabase client créé (singleton)')
  return supabaseClient
}

export const supabase = getSupabase()

export type SupabaseProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  faculty: 'FMT' | 'FMS' | 'FMM' | 'FMSf' | null
  year: number | null
  preferences: Record<string, any>
  created_at: string
  updated_at: string
}

// Debug
export async function checkSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  console.log('🔍 SESSION:', session?.user?.email || 'Aucune')
  return { session, error }
}
