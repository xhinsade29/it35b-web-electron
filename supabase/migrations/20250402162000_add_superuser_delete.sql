-- Migration: Create superuser delete function that bypasses all RLS
-- Runs as SECURITY DEFINER with postgres privileges

CREATE OR REPLACE FUNCTION delete_device_superuser(p_device_id UUID)
RETURNS void AS $$
DECLARE
    batch_size INT := 2000;
    rows_deleted INT;
    sensor_count INT;
BEGIN
    -- Count sensors first
    SELECT COUNT(*) INTO sensor_count FROM sensors WHERE device_id = p_device_id;
    
    -- If many sensors with readings, do batched delete
    IF sensor_count > 0 THEN
        -- Delete sensor readings in batches using CTE for efficiency
        LOOP
            WITH target_readings AS (
                SELECT sr.reading_id 
                FROM sensor_readings sr
                INNER JOIN sensors s ON sr.sensor_id = s.sensor_id
                WHERE s.device_id = p_device_id
                LIMIT batch_size
            )
            DELETE FROM sensor_readings 
            WHERE reading_id IN (SELECT reading_id FROM target_readings);
            
            GET DIAGNOSTICS rows_deleted = ROW_COUNT;
            EXIT WHEN rows_deleted = 0;
            
            -- Small pause to let other queries through
            PERFORM pg_sleep(0.01);
        END LOOP;
        
        -- Delete sensors
        DELETE FROM sensors WHERE device_id = p_device_id;
    END IF;
    
    -- Delete from any other tables that reference devices (ignore errors if not exist)
    BEGIN
        DELETE FROM alerts WHERE device_id = p_device_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DELETE FROM threshold_configs WHERE device_id = p_device_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    BEGIN
        DELETE FROM device_status_history WHERE device_id = p_device_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    
    -- Finally delete the device itself
    DELETE FROM devices WHERE device_id = p_device_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Device % not found', p_device_id;
    END IF;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to postgres and authenticated users (function runs with definer's privileges)
GRANT EXECUTE ON FUNCTION delete_device_superuser(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION delete_device_superuser(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_device_superuser(UUID) TO authenticated;

-- Ensure RLS is disabled for service role operations on these tables
-- (Service role bypasses RLS by default in Supabase)

COMMENT ON FUNCTION delete_device_superuser(UUID) IS 'Deletes device and all related data with elevated privileges';
