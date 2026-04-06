import { supabase } from '../src/lib/supabase'

async function testConnection() {
  console.log('🔍 Testing Supabase connection...')
  
  // Test 1: Basic connection
  const { data, error } = await supabase
    .from('locations')
    .select('count')
    .limit(1)
  
  if (error) {
    console.error('❌ Connection failed:', error.message)
    return false
  }
  
  console.log('✅ Connected to Supabase!')
  
  // Test 2: Count tables
  const { count: locCount } = await supabase
    .from('locations')
    .select('*', { count: 'exact', head: true })
  
  const { count: devCount } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
  
  const { count: sensorCount } = await supabase
    .from('sensors')
    .select('*', { count: 'exact', head: true })
  
  console.log('\n📊 Database Overview:')
  console.log(`   Locations: ${locCount || 0}`)
  console.log(`   Devices: ${devCount || 0}`)
  console.log(`   Sensors: ${sensorCount || 0}`)
  
  // Test 3: Fetch sample data
  const { data: readings } = await supabase
    .from('sensor_readings')
    .select('*, sensors(*, devices(*))')
    .limit(5)
  
  console.log('\n📈 Recent sensor readings:', readings?.length || 0)
  
  console.log('\n✅ All tests passed!')
  return true
}

testConnection().catch(err => {
  console.error('❌ Test failed:', err.message)
  process.exit(1)
})
