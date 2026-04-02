-- Migration: Ultra-fast delete with minimal batches and no subqueries
-- Uses temp table + cursor-like iteration to avoid timeouts

CREATE OR REPLACE FUNCTION delete_device_ultrafast(p_device_id UUID)
RETURNS boolean AS $$
DECLARE
    v_batch_size INT := 500;
    v_deleted INT;
    v_total_deleted INT := 0;
    v_sensor_id UUID;
    v_sensor_ids UUID[];
    v_start_time TIMESTAMP;
    v_max_duration INTERVAL := interval '10 seconds';
BEGIN
    v_start_time := clock_timestamp();
    
    -- Get sensor IDs array
    SELECT ARRAY_AGG(sensor_id) INTO v_sensor_ids
    FROM sensors WHERE device_id = p_device_id;
    
    IF v_sensor_ids IS NULL OR array_length(v_sensor_ids, 1) = 0 THEN
        -- No sensors, just delete device
        DELETE FROM devices WHERE device_id = p_device_id;
        RETURN FOUND;
    END IF;
    
    -- Delete readings for each sensor, one at a time in small batches
    FOREACH v_sensor_id IN ARRAY v_sensor_ids
    LOOP
        LOOP
            -- Check time limit
            IF clock_timestamp() - v_start_time > v_max_duration THEN
                RAISE EXCEPTION 'Delete timeout after 10 seconds, deleted % readings', v_total_deleted;
            END IF;
            
            -- Delete one batch for this sensor using ctid for speed
            DELETE FROM sensor_readings 
            WHERE ctid IN (
                SELECT ctid FROM sensor_readings 
                WHERE sensor_id = v_sensor_id 
                LIMIT v_batch_size
            );
            
            GET DIAGNOSTICS v_deleted = ROW_COUNT;
            v_total_deleted := v_total_deleted + v_deleted;
            
            EXIT WHEN v_deleted = 0;
        END LOOP;
    END LOOP;
    
    -- Delete sensors
    DELETE FROM sensors WHERE device_id = p_device_id;
    
    -- Delete device
    DELETE FROM devices WHERE device_id = p_device_id;
    
    RETURN FOUND;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Delete error for %: % (deleted % readings)', p_device_id, SQLERRM, v_total_deleted;
    RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_device_ultrafast(UUID) TO postgres;
GRANT EXECUTE ON FUNCTION delete_device_ultrafast(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION delete_device_ultrafast(UUID) TO authenticated;
