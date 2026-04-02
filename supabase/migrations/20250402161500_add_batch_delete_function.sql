-- Migration: Create efficient batched device delete function
-- Handles large datasets without timeout

CREATE OR REPLACE FUNCTION delete_device_batched(p_device_id UUID)
RETURNS void AS $$
DECLARE
    batch_size INT := 1000;
    rows_deleted INT;
BEGIN
    -- Delete sensor readings in batches
    LOOP
        WITH readings_to_delete AS (
            SELECT sr.reading_id 
            FROM sensor_readings sr
            JOIN sensors s ON sr.sensor_id = s.sensor_id
            WHERE s.device_id = p_device_id
            LIMIT batch_size
        )
        DELETE FROM sensor_readings 
        WHERE reading_id IN (SELECT reading_id FROM readings_to_delete);
        
        GET DIAGNOSTICS rows_deleted = ROW_COUNT;
        EXIT WHEN rows_deleted = 0;
    END LOOP;
    
    -- Delete sensors (usually small number, no batch needed)
    DELETE FROM sensors WHERE device_id = p_device_id;
    
    -- Delete alerts if they exist
    BEGIN
        DELETE FROM alerts WHERE device_id = p_device_id;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    -- Finally delete the device
    DELETE FROM devices WHERE device_id = p_device_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION delete_device_batched(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_device_batched(UUID) TO postgres;
