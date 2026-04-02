-- Migration: Nuclear option - mark for deletion and let DB clean up
-- Returns immediately, deletes in background

-- First create a device_deletions queue table
CREATE TABLE IF NOT EXISTS device_deletion_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL,
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    status TEXT DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE device_deletion_queue ENABLE ROW LEVEL SECURITY;

-- Policy for service role
DROP POLICY IF EXISTS "Service role can insert queue" ON device_deletion_queue;
CREATE POLICY "Service role can insert queue" ON device_deletion_queue
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function to queue device for deletion (returns immediately)
CREATE OR REPLACE FUNCTION queue_device_delete(p_device_id UUID)
RETURNS boolean AS $$
BEGIN
    -- Mark device as 'deleting' instead of actually deleting
    UPDATE devices 
    SET status = 'deleting', 
        device_name = device_name || ' [DELETING...]' 
    WHERE device_id = p_device_id;
    
    -- Add to queue
    INSERT INTO device_deletion_queue (device_id, status)
    VALUES (p_device_id, 'pending')
    ON CONFLICT (device_id) DO NOTHING;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function that actually does the deletion (called separately)
CREATE OR REPLACE FUNCTION process_device_deletion(p_device_id UUID)
RETURNS boolean AS $$
DECLARE
    v_sensor_id UUID;
BEGIN
    -- Delete all readings for each sensor
    FOR v_sensor_id IN 
        SELECT sensor_id FROM sensors WHERE device_id = p_device_id
    LOOP
        -- Use TRUNCATE for super-fast delete of all readings for this sensor
        -- But we can't truncate partial table, so use DELETE with WHERE
        DELETE FROM sensor_readings WHERE sensor_id = v_sensor_id;
    END LOOP;
    
    -- Delete sensors
    DELETE FROM sensors WHERE device_id = p_device_id;
    
    -- Delete device
    DELETE FROM devices WHERE device_id = p_device_id;
    
    -- Mark as processed
    UPDATE device_deletion_queue 
    SET status = 'completed', processed_at = NOW()
    WHERE device_id = p_device_id;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    UPDATE device_deletion_queue 
    SET status = 'failed: ' || SQLERRM
    WHERE device_id = p_device_id;
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION queue_device_delete(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION queue_device_delete(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION queue_device_delete(UUID) TO authenticated;
