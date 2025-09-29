import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Only create clients if we have valid environment variables
const hasValidConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = hasValidConfig 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Type-safe client for authenticated requests
export const createClientComponentClient = () => {
  if (!hasValidConfig) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.')
  }
  return createClient(supabaseUrl, supabaseAnonKey)
}

// Server-side client for API routes
export const createServerComponentClient = () => {
  if (!hasValidConfig) {
    throw new Error('Supabase configuration is missing. Please check your environment variables.')
  }
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        persistSession: false,
      },
    }
  )
}