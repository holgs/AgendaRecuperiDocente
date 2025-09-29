import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Check if we have valid configuration
const hasValidConfig = supabaseUrl && supabaseAnonKey

// Export null if configuration is missing (build time)
export const supabase = hasValidConfig ? createClient(supabaseUrl, supabaseAnonKey) : null

// Client creation functions with proper error handling
export const createClientComponentClient = () => {
  if (!hasValidConfig) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

export const createServerComponentClient = () => {
  if (!hasValidConfig) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.')
  }
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false
      }
    }
  )
}