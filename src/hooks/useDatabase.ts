import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { 
  User, Location, Device, Sensor, SensorReading, Alert, 
  MaintenanceLog, Notification, SystemLog, RiverSection, DeviceStatus 
} from '../lib/database.types'

// ========== USERS ==========
export function useUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setUsers(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return { users, loading, error, refetch: () => {} }
}

// ========== LOCATIONS ==========
export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .order('location_name')

        if (error) throw error
        setLocations(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [])

  return { locations, loading, error }
}

export function useLocationsBySection(section: RiverSection) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLocations() {
      try {
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .eq('river_section', section)
          .order('location_name')

        if (error) throw error
        setLocations(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [section])

  return { locations, loading, error }
}

// ========== DEVICES ==========
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('devices')
        .select('*, locations(*)')
        .order('device_name')

      if (error) throw error
      setDevices(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDevices()
  }, [fetchDevices])

  return { devices, loading, error, refetch: fetchDevices }
}

export function useDevicesByStatus(status: DeviceStatus) {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDevices() {
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('*, locations(*)')
          .eq('status', status)
          .order('device_name')

        if (error) throw error
        setDevices(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchDevices()
  }, [status])

  return { devices, loading, error }
}

export async function updateDeviceStatus(deviceId: string, status: DeviceStatus) {
  const { data, error } = await supabase
    .from('devices')
    .update({ status })
    .eq('device_id', deviceId)
    .select()
    .single()

  if (error) throw error
  return data as Device
}

// ========== SENSORS ==========
export function useSensors(deviceId?: string) {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSensors() {
      try {
        let query = supabase.from('sensors').select('*')
        
        if (deviceId) {
          query = query.eq('device_id', deviceId)
        }
        
        const { data, error } = await query.order('sensor_type')

        if (error) throw error
        setSensors(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchSensors()
  }, [deviceId])

  return { sensors, loading, error }
}

// ========== SENSOR READINGS ==========
export function useSensorReadings(sensorId: string, limit: number = 100) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReadings = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('sensor_id', sensorId)
        .order('recorded_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      setReadings(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [sensorId, limit])

  useEffect(() => {
    fetchReadings()
  }, [fetchReadings])

  // Real-time subscription
  useEffect(() => {
    const subscription = supabase
      .channel(`sensor-readings-${sensorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_readings',
          filter: `sensor_id=eq.${sensorId}`,
        },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown>; eventType: string }) => {
          setReadings((prev) => [(payload.new as unknown) as SensorReading, ...prev].slice(0, limit))
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [sensorId, limit])

  return { readings, loading, error, refetch: fetchReadings }
}

export async function insertSensorReading(sensorId: string, value: number) {
  const { data, error } = await supabase
    .from('sensor_readings')
    .insert([{ sensor_id: sensorId, value }])
    .select()
    .single()

  if (error) throw error
  return data as SensorReading
}

// ========== ALERTS ==========
export function useAlerts(status?: 'active' | 'acknowledged' | 'resolved') {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        let query = supabase
          .from('alerts')
          .select('*, sensors(*, devices(*))')
          .order('created_at', { ascending: false })

        if (status) {
          query = query.eq('status', status)
        }

        const { data, error } = await query

        if (error) throw error
        setAlerts(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchAlerts()
  }, [status])

  return { alerts, loading, error }
}

export async function acknowledgeAlert(alertId: string, userId: string) {
  const { data, error } = await supabase
    .from('alerts')
    .update({
      status: 'acknowledged',
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('alert_id', alertId)
    .select()
    .single()

  if (error) throw error
  return data as Alert
}

// ========== MAINTENANCE LOGS ==========
export function useMaintenanceLogs(deviceId?: string) {
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogs() {
      try {
        let query = supabase
          .from('maintenance_logs')
          .select('*, devices(*), users(*)')
          .order('performed_at', { ascending: false })

        if (deviceId) {
          query = query.eq('device_id', deviceId)
        }

        const { data, error } = await query.limit(50)

        if (error) throw error
        setLogs(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [deviceId])

  return { logs, loading, error }
}

export async function logMaintenance(
  deviceId: string,
  performedBy: string,
  maintenanceType: MaintenanceLog['maintenance_type'],
  notes?: string
) {
  const { data, error } = await supabase
    .from('maintenance_logs')
    .insert([
      {
        device_id: deviceId,
        performed_by: performedBy,
        maintenance_type: maintenanceType,
        notes,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data as MaintenanceLog
}

// ========== NOTIFICATIONS ==========
export function useNotifications(userId: string, unreadOnly: boolean = false) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchNotifications() {
      try {
        let query = supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (unreadOnly) {
          query = query.eq('is_read', false)
        }

        const { data, error } = await query.limit(20)

        if (error) throw error
        setNotifications(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [userId, unreadOnly])

  const markAsRead = async (notificationId: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('notification_id', notificationId)
      .select()
      .single()

    if (error) throw error
    setNotifications((prev) =>
      prev.map((n) => (n.notification_id === notificationId ? (data as Notification) : n))
    )
    return data as Notification
  }

  return { notifications, loading, error, markAsRead }
}

// ========== SYSTEM LOGS ==========
export function useSystemLogs(limit: number = 50) {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data, error } = await supabase
          .from('system_logs')
          .select('*, users(*)')
          .order('created_at', { ascending: false })
          .limit(limit)

        if (error) throw error
        setLogs(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [limit])

  return { logs, loading, error }
}

export async function logActivity(
  action: string,
  details?: string,
  userId?: string
) {
  const { data, error } = await supabase
    .from('system_logs')
    .insert([
      {
        user_id: userId,
        action,
        details,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data as SystemLog
}
