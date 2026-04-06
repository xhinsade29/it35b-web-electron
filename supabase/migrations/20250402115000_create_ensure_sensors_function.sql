-- Migration: Create RPC function for ensuring device sensors
-- This bypasses RLS by using SECURITY DEFINER

CREATE OR REPLACE FUNCTION dashboard_ensure_device_sensors(p_device_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_existing_types TEXT[];
    v_missing_types TEXT[];
    v_sensor_type TEXT;
    v_unit TEXT;
    v_min NUMERIC;
    v_max NUMERIC;
    v_created_count INTEGER := 0;
BEGIN
    -- Get existing sensor types for this device
    SELECT ARRAY_AGG(sensor_type)
    INTO v_existing_types
    FROM sensors
    WHERE device_id = p_device_id;
    
    -- Define required sensors with their default values
    v_missing_types := ARRAY[
        'temperature', 'ph_level', 'turbidity', 
        'dissolved_oxygen', 'water_level', 'sediments'
    ];
    
    -- Create each missing sensor
    FOREACH v_sensor_type IN ARRAY v_missing_types
    LOOP
        IF v_existing_types IS NULL OR NOT v_sensor_type = ANY(v_existing_types) THEN
            -- Set default values based on sensor type
            CASE v_sensor_type
                WHEN 'temperature' THEN
                    v_unit := '°C';
                    v_min := 20;
                    v_max := 35;
                WHEN 'ph_level' THEN
                    v_unit := 'pH';
                    v_min := 6.5;
                    v_max := 8.5;
                WHEN 'turbidity' THEN
                    v_unit := 'NTU';
                    v_min := 0;
                    v_max := 50;
                WHEN 'dissolved_oxygen' THEN
                    v_unit := 'mg/L';
                    v_min := 5;
                    v_max := 14;
                WHEN 'water_level' THEN
                    v_unit := 'm';
                    v_min := 0.5;
                    v_max := 3.0;
                WHEN 'sediments' THEN
                    v_unit := 'mg/L';
                    v_min := 0;
                    v_max := 500;
            END CASE;
            
            INSERT INTO sensors (device_id, sensor_type, unit, min_threshold, max_threshold)
            VALUES (p_device_id, v_sensor_type, v_unit, v_min, v_max);
            
            v_created_count := v_created_count + 1;
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'device_id', p_device_id,
        'created_count', v_created_count,
        'total_sensors', COALESCE(array_length(v_existing_types, 1), 0) + v_created_count
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION dashboard_ensure_device_sensors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_ensure_device_sensors(UUID) TO service_role;
