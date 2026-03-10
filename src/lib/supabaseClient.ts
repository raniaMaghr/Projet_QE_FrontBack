// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://faxmuldojxwkxwabrwzi.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZheG11bGRvanh3a3h3YWJyd3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjAzOTUsImV4cCI6MjA4NTYzNjM5NX0.kVVHxgQRRG5tsUv_SekTvwmuufuQLjwvamK7dj4qyHM'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `❌ Variables Supabase manquantes ! 
VITE_SUPABASE_URL: ${supabaseUrl || '❌'}
VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅' : '❌'}`
  )
}

// ✅ SINGLETON SANS TYPES COMPLIQUÉS
let supabaseInstance: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (supabaseInstance) {
    console.log('🔄 Supabase réutilisé')
    return supabaseInstance
  }

  console.log('✅ NOUVELLE instance Supabase')
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  })
  
  return supabaseInstance
}

export const supabases = getSupabase()

console.log('✅ Client Supabase initialisé')
console.log('URL:', supabaseUrl)
console.log('KEY:', supabaseAnonKey ? 'Présente' : 'Manquante')

// Debug
export async function checkSession() {
  const { data: { session }, error } = await supabases.auth.getSession()
  console.log('🔍 Session:', session?.user?.email || 'Aucune')
  return { session, error }
}