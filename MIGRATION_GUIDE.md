# Aqua-Vision Supabase Migration Guide

This guide walks you through migrating your PHP/MySQL Aqua-Vision database to Supabase (PostgreSQL).

## Step 1: Update Environment Variables

Copy the credentials from `.env.example` to your `.env` file:

```bash
VITE_SUPABASE_URL=https://hqptxgzpzuhsrybuyjoy.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Vn85SyMOd3cToHzCliO5Jg_AX2BO_xY
```

## Step 2: Run SQL Migration in Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open `@c:\Users\lopez\it35b-web-electron\supabase\migration.sql`
6. Copy the entire file contents
7. Paste into the SQL Editor
8. Click **Run**

This creates:
- All 11 tables (users, locations, devices, sensors, readings, alerts, etc.)
- Indexes for performance
- Row Level Security (RLS) policies
- Default data (locations, admin users, settings)

## Step 3: Verify Tables Created

After running the migration, verify in Supabase:
1. Go to **Table Editor** (left sidebar)
2. You should see all tables listed
3. Check that `locations` table has 6 river boundary points
4. Check that `users` table has 4 default users

## Step 4: Start Development Server

```bash
npm run dev
```

## Step 5: Test Database Connection

Add this test to `App.tsx` temporarily:

```tsx
import { useEffect } from 'react'
import { supabase } from './lib/supabase'

function App() {
  useEffect(() => {
    async function testConnection() {
      const { data, error } = await supabase.from('locations').select('*')
      if (error) console.error('Error:', error)
      else console.log('Locations:', data)
    }
    testConnection()
  }, [])

  // ... rest of component
}
```

Check browser console for location data.

## Available Hooks

All hooks are in `@c:\Users\lopez\it35b-web-electron\src\hooks\useDatabase.ts`:

| Hook | Purpose |
|------|---------|
| `useUsers()` | Fetch all users |
| `useLocations()` | Fetch all locations |
| `useLocationsBySection(section)` | Filter by upstream/midstream/downstream |
| `useDevices()` | Fetch devices with location data |
| `useDevicesByStatus(status)` | Filter by status |
| `useSensors(deviceId?)` | Fetch sensors (optionally by device) |
| `useSensorReadings(sensorId, limit)` | Fetch readings with real-time updates |
| `useAlerts(status?)` | Fetch alerts with sensor data |
| `useMaintenanceLogs(deviceId?)` | Fetch maintenance history |
| `useNotifications(userId, unreadOnly?)` | User notifications |
| `useSystemLogs(limit?)` | System activity logs |

## Data Types

All TypeScript types are in `@c:\Users\lopez\it35b-web-electron\src\lib\database.types.ts`:

- `User` - System users (admin, operator, viewer, researcher)
- `Location` - River section boundaries (upstream/midstream/downstream)
- `Device` - Water quality stations, weather stations, flow meters
- `Sensor` - Temperature, pH, turbidity, dissolved oxygen, etc.
- `SensorReading` - Timestamped sensor values
- `Alert` - Threshold violation alerts
- `MaintenanceLog` - Device maintenance records
- `Notification` - User notifications
- `Report` - Generated reports
- `SystemLog` - Activity audit trail
- `SystemSetting` - Application configuration

## Enums (TypeScript)

```typescript
type UserRole = 'admin' | 'operator' | 'viewer' | 'researcher'
type RiverSection = 'upstream' | 'midstream' | 'downstream'
type DeviceStatus = 'active' | 'inactive' | 'maintenance' | 'offline' | 'unassigned'
type DeviceCondition = 'normal' | 'displaced' | 'damaged' | 'malfunctioning'
type SensorType = 'temperature' | 'ph_level' | 'turbidity' | 'dissolved_oxygen' | 'water_level' | 'sediments' | 'conductivity' | 'humidity' | 'pressure' | 'flow_rate'
type AlertType = 'low' | 'high' | 'critical'
type AlertStatus = 'active' | 'acknowledged' | 'resolved'
```

## Example Usage

```tsx
import { useDevices, useSensorReadings, updateDeviceStatus } from './hooks/useDatabase'

function Dashboard() {
  const { devices, loading: devicesLoading } = useDevices()
  const { readings, loading: readingsLoading } = useSensorReadings('sensor-uuid-here', 50)

  const handleStatusChange = async (deviceId: string) => {
    await updateDeviceStatus(deviceId, 'maintenance')
  }

  if (devicesLoading || readingsLoading) return <div>Loading...</div>

  return (
    <div>
      <h1>Devices: {devices.length}</h1>
      <h2>Recent Readings: {readings.length}</h2>
    </div>
  )
}
```

## Next Steps

1. **Migrate Data**: Export your MySQL data and import to Supabase
2. **Create Components**: Build React components for your PHP pages
3. **Add Routing**: Set up React Router for navigation
4. **Authentication**: Implement Supabase Auth for login/logout
5. **Real-time**: Use Supabase subscriptions for live sensor data

## Troubleshooting

**Connection Error**: Check `.env` has correct Supabase URL and key
**RLS Error**: Tables have Row Level Security - sign in or adjust policies
**Type Error**: Make sure all imports use correct type names from `database.types.ts`
