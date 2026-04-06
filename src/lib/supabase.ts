import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || ''

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
export const supabase = isValidUrl(supabaseUrl) && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : createMockClient()

// Admin client with service role key (bypasses RLS for admin operations)
export const supabaseAdmin = isValidUrl(supabaseUrl) && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : supabase

// Mock client for development without Supabase credentials
function createMockClient() {
  console.warn('Supabase credentials not configured. Using mock client.')
  
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
      console.log(`Mock RPC call: ${fn}`, params)
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
