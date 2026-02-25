// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `❌ Variables Supabase manquantes ! 
VITE_SUPABASE_URL: ${supabaseUrl}
VITE_SUPABASE_ANON_KEY: ${supabaseAnonKey ? 'Définie' : 'Manquante'}`
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('✅ Client Supabase initialisé')
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY)