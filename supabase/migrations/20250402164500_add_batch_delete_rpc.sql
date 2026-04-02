-- Migration: Create optimized batch delete function for sensor readings
-- Uses CTE for faster deletion

CREATE OR REPLACE FUNCTION delete_sensor_readings_batch(
    p_sensor_id UUID,
    p_limit INT DEFAULT 1000
)
RETURNS INTEGER AS $$
DECLARE
    v_deleted INT;
BEGIN
    -- Use CTE with FOR UPDATE SKIP LOCKED for fast batch delete
    WITH rows_to_delete AS (
        SELECT reading_id 
        FROM sensor_readings 
        WHERE sensor_id = p_sensor_id 
        ORDER BY reading_id  -- Consistent ordering helps performance
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    DELETE FROM sensor_readings 
    WHERE reading_id IN (SELECT reading_id FROM rows_to_delete);
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_sensor_readings_batch(UUID, INTEGER) TO postgres;
GRANT EXECUTE ON FUNCTION delete_sensor_readings_batch(UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION delete_sensor_readings_batch(UUID, INTEGER) TO authenticated;
