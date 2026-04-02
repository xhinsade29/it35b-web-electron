-- Create batch simulation function for inserting all device readings at once
-- This ensures all devices get the same timestamp

CREATE OR REPLACE FUNCTION dashboard_simulate_batch(p_devices_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    device_data JSONB;
    v_device_id UUID;
    v_temperature NUMERIC;
    v_ph_level NUMERIC;
    v_turbidity NUMERIC;
    v_dissolved_oxygen NUMERIC;
    v_water_level NUMERIC;
    v_sediments NUMERIC;
    
    result JSONB := '[]'::JSONB;
    device_result JSONB;
    reading_id UUID;
    v_device_name TEXT;
    v_river_section TEXT;
    v_location_id UUID;
    v_alerts JSONB := '[]'::JSONB;
    v_timestamp TIMESTAMPTZ := NOW();
BEGIN
    -- Process each device in the batch
    FOR device_data IN SELECT jsonb_array_elements(p_devices_data)
    LOOP
        -- Extract device data
        v_device_id := (device_data->>'device_id')::UUID;
        v_temperature := (device_data->>'temperature')::NUMERIC;
        v_ph_level := (device_data->>'ph_level')::NUMERIC;
        v_turbidity := (device_data->>'turbidity')::NUMERIC;
        v_dissolved_oxygen := (device_data->>'dissolved_oxygen')::NUMERIC;
        v_water_level := (device_data->>'water_level')::NUMERIC;
        v_sediments := (device_data->>'sediments')::NUMERIC;
        
        -- Get device info
        SELECT d.device_name, d.location_id, l.river_section
        INTO v_device_name, v_location_id, v_river_section
        FROM devices d
        JOIN locations l ON d.location_id = l.location_id
        WHERE d.device_id = v_device_id;
        
        -- Insert temperature reading
        IF v_temperature IS NOT NULL THEN
            INSERT INTO sensor_readings (sensor_id, value, recorded_at)
            SELECT s.sensor_id, v_temperature, v_timestamp
            FROM sensors s
            WHERE s.device_id = v_device_id AND s.sensor_type = 'temperature';
        END IF;
        
        -- Insert pH level reading
        IF v_ph_level IS NOT NULL THEN
            INSERT INTO sensor_readings (sensor_id, value, recorded_at)
            SELECT s.sensor_id, v_ph_level, v_timestamp
            FROM sensors s
            WHERE s.device_id = v_device_id AND s.sensor_type = 'ph_level';
        END IF;
        
        -- Insert turbidity reading
        IF v_turbidity IS NOT NULL THEN
            INSERT INTO sensor_readings (sensor_id, value, recorded_at)
            SELECT s.sensor_id, v_turbidity, v_timestamp
            FROM sensors s
            WHERE s.device_id = v_device_id AND s.sensor_type = 'turbidity';
        END IF;
        
        -- Insert dissolved_oxygen reading
        IF v_dissolved_oxygen IS NOT NULL THEN
            INSERT INTO sensor_readings (sensor_id, value, recorded_at)
            SELECT s.sensor_id, v_dissolved_oxygen, v_timestamp
            FROM sensors s
            WHERE s.device_id = v_device_id AND s.sensor_type = 'dissolved_oxygen';
        END IF;
        
        -- Insert water_level reading
        IF v_water_level IS NOT NULL THEN
            INSERT INTO sensor_readings (sensor_id, value, recorded_at)
            SELECT s.sensor_id, v_water_level, v_timestamp
            FROM sensors s
            WHERE s.device_id = v_device_id AND s.sensor_type = 'water_level';
        END IF;
        
        -- Insert sediments reading
        IF v_sediments IS NOT NULL THEN
            INSERT INTO sensor_readings (sensor_id, value, recorded_at)
            SELECT s.sensor_id, v_sediments, v_timestamp
            FROM sensors s
            WHERE s.device_id = v_device_id AND s.sensor_type = 'sediments';
        END IF;
        
        -- Check for alerts (values outside thresholds)
        v_alerts := '[]'::JSONB;
        
        -- Check each sensor for threshold violations
        SELECT jsonb_agg(alert_data) INTO v_alerts
        FROM (
            SELECT jsonb_build_object(
                'type', CASE 
                    WHEN sr.value < s.min_threshold THEN 'low'
                    WHEN sr.value > s.max_threshold THEN 'high'
                END,
                'sensor_type', s.sensor_type,
                'value', sr.value,
                'threshold', CASE 
                    WHEN sr.value < s.min_threshold THEN s.min_threshold
                    WHEN sr.value > s.max_threshold THEN s.max_threshold
                END
            ) as alert_data
            FROM sensor_readings sr
            JOIN sensors s ON sr.sensor_id = s.sensor_id
            WHERE s.device_id = v_device_id 
              AND sr.recorded_at = v_timestamp
              AND (sr.value < s.min_threshold OR sr.value > s.max_threshold)
        ) alerts;
        
        IF v_alerts IS NULL THEN
            v_alerts := '[]'::JSONB;
        END IF;
        
        -- Build device result
        device_result := jsonb_build_object(
            'success', true,
            'reading_id', gen_random_uuid(),
            'device_id', v_device_id,
            'device_name', v_device_name,
            'river_section', v_river_section,
            'readings', jsonb_build_array(
                jsonb_build_object('sensor_type', 'temperature', 'value', v_temperature),
                jsonb_build_object('sensor_type', 'ph_level', 'value', v_ph_level),
                jsonb_build_object('sensor_type', 'turbidity', 'value', v_turbidity),
                jsonb_build_object('sensor_type', 'dissolved_oxygen', 'value', v_dissolved_oxygen),
                jsonb_build_object('sensor_type', 'water_level', 'value', v_water_level),
                jsonb_build_object('sensor_type', 'sediments', 'value', v_sediments)
            ),
            'alerts_created', v_alerts,
            'timestamp', v_timestamp
        );
        
        result := result || device_result;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'results', result,
        'errors', '[]'::JSONB
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION dashboard_simulate_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_simulate_batch(JSONB) TO service_role;
