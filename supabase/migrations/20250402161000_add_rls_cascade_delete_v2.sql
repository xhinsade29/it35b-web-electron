-- Migration: Add RLS policies for device cascade delete
-- Fixes timeout issues by allowing service role to delete related records

-- Enable RLS on tables (only if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sensors') THEN
        ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sensor_readings') THEN
        ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'alerts') THEN
        ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'threshold_configs') THEN
        ALTER TABLE threshold_configs ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'devices') THEN
        ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Service role can delete sensors" ON sensors;
DROP POLICY IF EXISTS "Service role can delete sensor_readings" ON sensor_readings;
DROP POLICY IF EXISTS "Service role can delete alerts" ON alerts;
DROP POLICY IF EXISTS "Service role can delete threshold_configs" ON threshold_configs;
DROP POLICY IF EXISTS "Service role can delete devices" ON devices;

-- Create policies for service role to delete records (only on existing tables)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sensors') THEN
        CREATE POLICY "Service role can delete sensors" ON sensors
            FOR DELETE USING (
                auth.jwt() ->> 'role' = 'service_role' 
                OR auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
            );
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'sensor_readings') THEN
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
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'alerts') THEN
        CREATE POLICY "Service role can delete alerts" ON alerts
            FOR DELETE USING (
                auth.jwt() ->> 'role' = 'service_role'
                OR auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
            );
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'threshold_configs') THEN
        CREATE POLICY "Service role can delete threshold_configs" ON threshold_configs
            FOR DELETE USING (
                auth.jwt() ->> 'role' = 'service_role'
                OR auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
            );
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'devices') THEN
        CREATE POLICY "Service role can delete devices" ON devices
            FOR DELETE USING (
                auth.jwt() ->> 'role' = 'service_role'
                OR auth.uid() IN (SELECT user_id FROM users WHERE role = 'admin')
            );
    END IF;
END $$;

-- Create cascade delete trigger function (handles missing tables)
CREATE OR REPLACE FUNCTION delete_device_cascade_fn()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete sensor readings (ignore if table doesn't exist)
    BEGIN
        DELETE FROM sensor_readings WHERE sensor_id IN (
            SELECT sensor_id FROM sensors WHERE device_id = OLD.device_id
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- Delete sensors
    BEGIN
        DELETE FROM sensors WHERE device_id = OLD.device_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- Delete alerts
    BEGIN
        DELETE FROM alerts WHERE device_id = OLD.device_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- Delete threshold configs (ignore if table doesn't exist)
    BEGIN
        DELETE FROM threshold_configs WHERE device_id = OLD.device_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS device_delete_cascade ON devices;

-- Create trigger for automatic cascade delete (only if devices table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'devices') THEN
        CREATE TRIGGER device_delete_cascade
            BEFORE DELETE ON devices
            FOR EACH ROW
            EXECUTE FUNCTION delete_device_cascade_fn();
    END IF;
END $$;
