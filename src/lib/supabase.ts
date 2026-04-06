import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Get environment variables with fallbacks
const getEnvVar = (name: string): string => {
  // Vite env vars (build time)
  if (import.meta.env && import.meta.env[name]) {
    return import.meta.env[name] as string
  }
  // For potential runtime config (window注入)
  if (typeof window !== 'undefined' && (window as any).__ENV && (window as any).__ENV[name]) {
    return (window as any).__ENV[name]
  }
  return ''
}

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL')
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY')
const supabaseServiceKey = getEnvVar('VITE_SUPABASE_SERVICE_ROLE_KEY')

// Debug logging for deployment troubleshooting
if (typeof window !== 'undefined') {
  console.log('[Supabase] URL configured:', supabaseUrl ? 'Yes' : 'No')
  console.log('[Supabase] Key configured:', supabaseKey ? 'Yes (length: ' + supabaseKey.length + ')' : 'No')
}

// Validate URL format
const isValidUrl = (url: string) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Create client only if credentials are valid, otherwise create mock
let supabaseInstance: SupabaseClient | null = null

export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance
  
  if (isValidUrl(supabaseUrl) && supabaseKey) {
    console.log('[Supabase] Creating real client with URL:', supabaseUrl.substring(0, 30) + '...')
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        headers: {
          'x-application-name': 'aqua-vision'
        }
      }
    })
    return supabaseInstance
  }
  
  console.warn('[Supabase] Credentials not configured. Using mock client.')
  supabaseInstance = createMockClient()
  return supabaseInstance
}

// Main export - create on first use
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getSupabaseClient()
    return (client as any)[prop]
  }
})

// Verify connection is working
export const verifyConnection = async (): Promise<{ ok: boolean; error?: string }> => {
  try {
    const client = getSupabaseClient()
    const { error } = await client.from('locations').select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('[Supabase] Connection verification failed:', error)
      return { ok: false, error: error.message }
    }
    
    console.log('[Supabase] Connection verified successfully')
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Supabase] Connection verification error:', message)
    return { ok: false, error: message }
  }
}

// Check if using mock client
export const isMockClient = (): boolean => {
  return !isValidUrl(supabaseUrl) || !supabaseKey
}

// Admin client with service role key (bypasses RLS for admin operations)
export const supabaseAdmin = (() => {
  if (isValidUrl(supabaseUrl) && supabaseServiceKey) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  }
  // Fall back to regular client if no service key
  return supabase
})()

// Mock client for development without Supabase credentials
function createMockClient(): SupabaseClient {
  console.warn('[Supabase] Using mock client - no database connection')
  
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null }),
            single: () => Promise.resolve({ data: null, error: null }),
          }),
        }),
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      upsert: () => Promise.resolve({ data: null, error: null }),
      delete: () => Promise.resolve({ data: null, error: null }),
    }),
    rpc: (fn: string, params?: Record<string, unknown>) => {
      console.log(`[Mock] RPC call: ${fn}`, params)
      // Return mock data for dashboard functions
      if (fn === 'dashboard_fetch') {
        return Promise.resolve({
          data: {
            ok: true,
            ts: new Date().toISOString(),
            river_status: 'Normal',
            banner_color: '#16a34a',
            banner_emoji: '✅',
            warn_count: 0,
            alert_count: 0,
            dev_counts: { total: 0, active: 0, offline: 0, maint: 0 },
            devices: [],
            device_readings: {},
            alerts: [],
            logs: [],
            map_locations: [],
            chart_data: {
              temperature: Array(24).fill(null),
              pH: Array(24).fill(null),
              turbidity: Array(24).fill(null),
              dissolved_oxygen: Array(24).fill(null),
              water_level: Array(24).fill(null),
              sediments: Array(24).fill(null)
            },
            device_chart_data: {},
            maintenance: [],
            section_conditions: {
              upstream: {},
              midstream: {},
              downstream: {}
            }
          },
          error: null
        })
      }
      return Promise.resolve({ data: null, error: null })
    },
    auth: {
      signIn: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
      subscribe: () => {}
    })
  } as any
}
