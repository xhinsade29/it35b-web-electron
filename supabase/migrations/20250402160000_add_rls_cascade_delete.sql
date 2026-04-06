-- Migration: Add RLS policies for device cascade delete
-- Fixes timeout issues by allowing service role to delete related records

-- Enable RLS on all tables if not already enabled
ALTER TABLE IF EXISTS sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS threshold_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS devices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Service role can delete sensors" ON sensors;
DROP POLICY IF EXISTS "Service role can delete sensor_readings" ON sensor_readings;
DROP POLICY IF EXISTS "Service role can delete alerts" ON alerts;
DROP POLICY IF EXISTS "Service role can delete threshold_configs" ON threshold_configs;
DROP POLICY IF EXISTS "Service role can delete devices" ON devices;

-- Create policies for service role (supabaseAdmin) to delete records
CREATE POLICY "Service role can delete sensors" ON sensors
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'service_role' 
        OR auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
    );

CREATE POLICY "Service role can delete sensor_readings" ON sensor_readings
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR EXISTS (
            SELECT 1 FROM sensors s 
            WHERE s.sensor_id = sensor_readings.sensor_id
            AND EXISTS (
                SELECT 1 FROM devices d 
                WHERE d.device_id = s.device_id
            )
        )
    );

CREATE POLICY "Service role can delete alerts" ON alerts
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
    );

CREATE POLICY "Service role can delete threshold_configs" ON threshold_configs
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
    );

CREATE POLICY "Service role can delete devices" ON devices
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
    );

-- Add cascade delete triggers as fallback for foreign key constraints
CREATE OR REPLACE FUNCTION delete_device_cascade_fn()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete sensor readings first (via sensors)
    DELETE FROM sensor_readings WHERE sensor_id IN (
        SELECT sensor_id FROM sensors WHERE device_id = OLD.device_id
    );
    
    -- Delete sensors
    DELETE FROM sensors WHERE device_id = OLD.device_id;
    
    -- Delete alerts
    DELETE FROM alerts WHERE device_id = OLD.device_id;
    
    -- Delete threshold configs
    DELETE FROM threshold_configs WHERE device_id = OLD.device_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS device_delete_cascade ON devices;

-- Create trigger for automatic cascade delete
CREATE TRIGGER device_delete_cascade
    BEFORE DELETE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION delete_device_cascade_fn();
