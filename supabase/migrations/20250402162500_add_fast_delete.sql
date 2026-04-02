-- Migration: Create optimized delete function using temp table
-- Much faster than CTE for large datasets

CREATE OR REPLACE FUNCTION delete_device_fast(p_device_id UUID)
RETURNS boolean AS $$
DECLARE
    batch_size INT := 5000;
    rows_deleted INT;
    v_sensor_ids UUID[];
BEGIN
    -- Get all sensor IDs for this device into an array (single index scan)
    SELECT ARRAY_AGG(sensor_id) INTO v_sensor_ids
    FROM sensors 
    WHERE device_id = p_device_id;
    
    -- If there are sensors, delete their readings in batches
    IF v_sensor_ids IS NOT NULL AND array_length(v_sensor_ids, 1) > 0 THEN
        LOOP
            -- Delete readings for these sensor IDs in batches
            DELETE FROM sensor_readings 
            WHERE reading_id IN (
                SELECT reading_id 
                FROM sensor_readings 
                WHERE sensor_id = ANY(v_sensor_ids)
                LIMIT batch_size
            );
            
            GET DIAGNOSTICS rows_deleted = ROW_COUNT;
            EXIT WHEN rows_deleted = 0;
        END LOOP;
        
        -- Delete all sensors for this device
        DELETE FROM sensors WHERE device_id = p_device_id;
    END IF;
    
    -- Delete device
    DELETE FROM devices WHERE device_id = p_device_id;
    
    IF NOT FOUND THEN
        RETURN false;  -- Device not found
    END IF;
    
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- Log error and re-raise
    RAISE NOTICE 'Error deleting device %: %', p_device_id, SQLERRM;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant to all roles
GRANT EXECUTE ON FUNCTION delete_device_fast(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION delete_device_fast(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_device_fast(UUID) TO authenticated;
