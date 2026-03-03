// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

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

export const supabase = getSupabase()

console.log('✅ Client Supabase initialisé')
console.log('URL:', supabaseUrl)
console.log('KEY:', supabaseAnonKey ? 'Présente' : 'Manquante')

// Debug
export async function checkSession() {
  const { data: { session }, error } = await supabase.auth.getSession()
  console.log('🔍 Session:', session?.user?.email || 'Aucune')
  return { session, error }
}
