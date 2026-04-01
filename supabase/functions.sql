-- Supabase RPC Functions for Aqua-Vision Dashboard
-- Run these in Supabase SQL Editor to create database functions

-- =====================================================
-- 1. DASHBOARD FETCH FUNCTION
-- Replaces: av_overview_api_fetch() in PHP
-- Returns: Complete dashboard data payload
-- =====================================================

CREATE OR REPLACE FUNCTION dashboard_fetch()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    device_counts jsonb;
    devices_data jsonb;
    readings_data jsonb;
    alerts_data jsonb;
    chart_data jsonb;
    device_chart_data jsonb;
    logs_data jsonb;
    map_locations_data jsonb;
    maintenance_data jsonb;
    section_conditions jsonb;
    warn_count int := 0;
    alert_count int;
    river_status text;
    banner_color text;
    banner_emoji text;
BEGIN
    -- Get device counts
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'offline', COUNT(*) FILTER (WHERE status = 'inactive'),
        'maint', COUNT(*) FILTER (WHERE status = 'maintenance')
    ) INTO device_counts
    FROM devices;

    -- Get active devices with locations
    SELECT jsonb_agg(jsonb_build_object(
        'device_id', d.device_id,
        'device_name', d.device_name,
        'status', d.status,
        'location_name', l.location_name,
        'river_section', l.river_section,
        'last_active', d.last_active
    ) ORDER BY l.river_section, d.device_name)
    INTO devices_data
    FROM devices d
    LEFT JOIN locations l ON l.location_id = d.location_id
    WHERE d.status = 'active';

    -- Get latest readings per device (flattened like PHP)
    SELECT jsonb_object_agg(
        d.device_id::text,
        CASE 
            WHEN device_readings.reading_data IS NOT NULL THEN
                jsonb_build_object(
                    'temperature', (device_readings.reading_data->>'temperature')::numeric,
                    'ph_level', (device_readings.reading_data->>'ph_level')::numeric,
                    'turbidity', (device_readings.reading_data->>'turbidity')::numeric,
                    'dissolved_oxygen', (device_readings.reading_data->>'dissolved_oxygen')::numeric,
                    'water_level', (device_readings.reading_data->>'water_level')::numeric,
                    'sediments', (device_readings.reading_data->>'sediments')::numeric,
                    'recorded_at', device_readings.latest_ts
                )
            ELSE NULL
        END
    )
    INTO readings_data
    FROM devices d
    LEFT JOIN LATERAL (
        SELECT 
            jsonb_object_agg(sensor_type, value) as reading_data,
            MAX(recorded_at) as latest_ts
        FROM (
            SELECT DISTINCT ON (s.sensor_type)
                s.sensor_type,
                sr.value,
                sr.recorded_at
            FROM sensors s
            JOIN sensor_readings sr ON sr.sensor_id = s.sensor_id
            WHERE s.device_id = d.device_id
            ORDER BY s.sensor_type, sr.recorded_at DESC
        ) latest_per_type
    ) device_readings ON true;

    -- Get active alerts with details
    SELECT jsonb_agg(jsonb_build_object(
        'alert_id', a.alert_id,
        'alert_type', a.alert_type,
        'message', a.message,
        'created_at', a.created_at,
        'device_name', d.device_name,
        'location_name', l.location_name,
        'sensor_type', s.sensor_type
    ) ORDER BY a.created_at DESC)
    INTO alerts_data
    FROM alerts a
    JOIN sensors s ON s.sensor_id = a.sensor_id
    JOIN devices d ON d.device_id = s.device_id
    JOIN locations l ON l.location_id = d.location_id
    WHERE a.status = 'active'
    LIMIT 10;

    -- Get alert count
    SELECT COUNT(*) INTO alert_count
    FROM alerts WHERE status = 'active';

    -- Calculate 24-hour trend data (aggregated)
    SELECT jsonb_build_object(
        'temperature', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val))
            FROM dashboard_trend24('temperature')
        ), '[]'::jsonb),
        'pH', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val))
            FROM dashboard_trend24('ph_level')
        ), '[]'::jsonb),
        'turbidity', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val))
            FROM dashboard_trend24('turbidity')
        ), '[]'::jsonb),
        'dissolved_oxygen', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val))
            FROM dashboard_trend24('dissolved_oxygen')
        ), '[]'::jsonb),
        'water_level', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val))
            FROM dashboard_trend24('water_level')
        ), '[]'::jsonb),
        'sediments', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val))
            FROM dashboard_trend24('sediments')
        ), '[]'::jsonb)
    ) INTO chart_data;

    -- Get device-specific chart data (avoid nested aggregates by using CTEs)
    WITH device_trends AS (
        SELECT 
            d.device_id,
            'temperature' as sensor_type,
            COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val)) FROM dashboard_trend24_device('temperature', d.device_id)), '[]'::jsonb) as trend_data
        FROM devices d WHERE d.status = 'active'
        UNION ALL
        SELECT d.device_id, 'pH',
            COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val)) FROM dashboard_trend24_device('ph_level', d.device_id)), '[]'::jsonb)
        FROM devices d WHERE d.status = 'active'
        UNION ALL
        SELECT d.device_id, 'turbidity',
            COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val)) FROM dashboard_trend24_device('turbidity', d.device_id)), '[]'::jsonb)
        FROM devices d WHERE d.status = 'active'
        UNION ALL
        SELECT d.device_id, 'dissolved_oxygen',
            COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val)) FROM dashboard_trend24_device('dissolved_oxygen', d.device_id)), '[]'::jsonb)
        FROM devices d WHERE d.status = 'active'
        UNION ALL
        SELECT d.device_id, 'water_level',
            COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val)) FROM dashboard_trend24_device('water_level', d.device_id)), '[]'::jsonb)
        FROM devices d WHERE d.status = 'active'
        UNION ALL
        SELECT d.device_id, 'sediments',
            COALESCE((SELECT jsonb_agg(jsonb_build_object('hour', hr, 'avg_val', avg_val)) FROM dashboard_trend24_device('sediments', d.device_id)), '[]'::jsonb)
        FROM devices d WHERE d.status = 'active'
    ),
    device_trends_pivoted AS (
        SELECT 
            device_id,
            jsonb_object_agg(sensor_type, trend_data) as device_data
        FROM device_trends
        GROUP BY device_id
    )
    SELECT jsonb_object_agg(device_id::text, device_data)
    INTO device_chart_data
    FROM device_trends_pivoted;

    -- Get recent logs
    SELECT jsonb_agg(jsonb_build_object(
        'recorded_at', sr.recorded_at,
        'device_id', d.device_id,
        'device_name', d.device_name,
        'location_name', l.location_name,
        'river_section', l.river_section,
        'sensor_type', s.sensor_type,
        'unit', s.unit,
        'min_threshold', s.min_threshold,
        'max_threshold', s.max_threshold,
        'value', sr.value
    ) ORDER BY sr.recorded_at DESC)
    INTO logs_data
    FROM sensor_readings sr
    JOIN sensors s ON s.sensor_id = sr.sensor_id
    JOIN devices d ON d.device_id = s.device_id
    JOIN locations l ON l.location_id = d.location_id
    LIMIT 60;

    -- Get map locations
    SELECT jsonb_agg(jsonb_build_object(
        'location_id', l.location_id,
        'location_name', l.location_name,
        'river_section', l.river_section,
        'latitude', l.latitude,
        'longitude', l.longitude,
        'total_devices', COUNT(d.device_id),
        'active_devices', COUNT(*) FILTER (WHERE d.status = 'active'),
        'maint_devices', COUNT(*) FILTER (WHERE d.status = 'maintenance')
    ))
    INTO map_locations_data
    FROM locations l
    LEFT JOIN devices d ON d.location_id = l.location_id
    GROUP BY l.location_id, l.location_name, l.river_section, l.latitude, l.longitude;

    -- Get maintenance logs
    SELECT jsonb_agg(jsonb_build_object(
        'maintenance_type', ml.maintenance_type,
        'notes', ml.notes,
        'performed_at', ml.performed_at,
        'device_name', d.device_name,
        'full_name', u.full_name
    ) ORDER BY ml.performed_at DESC)
    INTO maintenance_data
    FROM maintenance_logs ml
    JOIN devices d ON d.device_id = ml.device_id
    JOIN users u ON u.user_id = ml.performed_by
    LIMIT 4;

    -- Calculate section conditions (like PHP)
    SELECT jsonb_build_object(
        'upstream', (
            SELECT jsonb_build_object(
                'temperature', (SELECT AVG(value) FROM latest_section_readings('upstream', 'temperature')),
                'ph_level', (SELECT AVG(value) FROM latest_section_readings('upstream', 'ph_level')),
                'turbidity', (SELECT AVG(value) FROM latest_section_readings('upstream', 'turbidity')),
                'dissolved_oxygen', (SELECT AVG(value) FROM latest_section_readings('upstream', 'dissolved_oxygen')),
                'water_level', (SELECT AVG(value) FROM latest_section_readings('upstream', 'water_level')),
                'sediments', (SELECT AVG(value) FROM latest_section_readings('upstream', 'sediments'))
            )
        ),
        'midstream', (
            SELECT jsonb_build_object(
                'temperature', (SELECT AVG(value) FROM latest_section_readings('midstream', 'temperature')),
                'ph_level', (SELECT AVG(value) FROM latest_section_readings('midstream', 'ph_level')),
                'turbidity', (SELECT AVG(value) FROM latest_section_readings('midstream', 'turbidity')),
                'dissolved_oxygen', (SELECT AVG(value) FROM latest_section_readings('midstream', 'dissolved_oxygen')),
                'water_level', (SELECT AVG(value) FROM latest_section_readings('midstream', 'water_level')),
                'sediments', (SELECT AVG(value) FROM latest_section_readings('midstream', 'sediments'))
            )
        ),
        'downstream', (
            SELECT jsonb_build_object(
                'temperature', (SELECT AVG(value) FROM latest_section_readings('downstream', 'temperature')),
                'ph_level', (SELECT AVG(value) FROM latest_section_readings('downstream', 'ph_level')),
                'turbidity', (SELECT AVG(value) FROM latest_section_readings('downstream', 'turbidity')),
                'dissolved_oxygen', (SELECT AVG(value) FROM latest_section_readings('downstream', 'dissolved_oxygen')),
                'water_level', (SELECT AVG(value) FROM latest_section_readings('downstream', 'water_level')),
                'sediments', (SELECT AVG(value) FROM latest_section_readings('downstream', 'sediments'))
            )
        )
    ) INTO section_conditions;

    -- Calculate warn count (matching PHP logic)
    SELECT COUNT(*) INTO warn_count
    FROM (
        SELECT (reading->>'temperature')::numeric as val FROM jsonb_each(readings_data) AS d(device_id, reading)
        UNION ALL
        SELECT (reading->>'ph_level')::numeric FROM jsonb_each(readings_data) AS d(device_id, reading)
        UNION ALL
        SELECT (reading->>'turbidity')::numeric FROM jsonb_each(readings_data) AS d(device_id, reading)
        UNION ALL
        SELECT (reading->>'dissolved_oxygen')::numeric FROM jsonb_each(readings_data) AS d(device_id, reading)
        UNION ALL
        SELECT (reading->>'water_level')::numeric FROM jsonb_each(readings_data) AS d(device_id, reading)
        UNION ALL
        SELECT (reading->>'sediments')::numeric FROM jsonb_each(readings_data) AS d(device_id, reading)
    ) all_readings
    WHERE (val < 20 AND val IS NOT NULL)  -- temperature min
       OR (val > 35 AND val IS NOT NULL)  -- temperature max
       OR (val < 6.5 AND val IS NOT NULL) -- ph min
       OR (val > 8.5 AND val IS NOT NULL) -- ph max
       OR (val < 0 AND val IS NOT NULL)   -- turbidity min
       OR (val > 50 AND val IS NOT NULL)  -- turbidity max
       OR (val < 5 AND val IS NOT NULL)   -- do min
       OR (val > 14 AND val IS NOT NULL)  -- do max
       OR (val < 0.5 AND val IS NOT NULL) -- water level min
       OR (val > 3.0 AND val IS NOT NULL) -- water level max
       OR (val < 0 AND val IS NOT NULL)   -- sediments min
       OR (val > 500 AND val IS NOT NULL); -- sediments max

    -- Determine river status
    IF warn_count = 0 THEN
        river_status := 'Normal';
        banner_color := '#16a34a';
        banner_emoji := '✅';
    ELSIF warn_count <= 2 THEN
        river_status := 'Moderate';
        banner_color := '#f59e0b';
        banner_emoji := '⚠️';
    ELSE
        river_status := 'Critical';
        banner_color := '#ef4444';
        banner_emoji := '🚨';
    END IF;

    -- Build final result
    result := jsonb_build_object(
        'ok', true,
        'ts', NOW(),
        'river_status', river_status,
        'banner_color', banner_color,
        'banner_emoji', banner_emoji,
        'warn_count', warn_count,
        'alert_count', alert_count,
        'dev_counts', device_counts,
        'devices', devices_data,
        'device_readings', readings_data,
        'alerts', COALESCE(alerts_data, '[]'::jsonb),
        'logs', COALESCE(logs_data, '[]'::jsonb),
        'map_locations', COALESCE(map_locations_data, '[]'::jsonb),
        'chart_data', chart_data,
        'device_chart_data', device_chart_data,
        'maintenance', COALESCE(maintenance_data, '[]'::jsonb),
        'section_conditions', section_conditions
    );

    RETURN result;
END;
$$;

-- =====================================================
-- 2. HELPER FUNCTIONS FOR TREND DATA
-- =====================================================

-- Aggregated 24-hour trend (all devices)
CREATE OR REPLACE FUNCTION dashboard_trend24(sensor_type_param text)
RETURNS TABLE(hr int, avg_val numeric)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        EXTRACT(HOUR FROM sr.recorded_at)::int as hr,
        ROUND(AVG(sr.value), 2) as avg_val
    FROM sensor_readings sr
    JOIN sensors s ON s.sensor_id = sr.sensor_id
    WHERE s.sensor_type = sensor_type_param
      AND sr.recorded_at >= NOW() - INTERVAL '24 hours'
    GROUP BY hr
    ORDER BY hr;
$$;

-- Device-specific 24-hour trend
CREATE OR REPLACE FUNCTION dashboard_trend24_device(
    sensor_type_param text,
    device_id_param uuid
)
RETURNS TABLE(hr int, avg_val numeric)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        EXTRACT(HOUR FROM sr.recorded_at)::int as hr,
        ROUND(AVG(sr.value), 2) as avg_val
    FROM sensor_readings sr
    JOIN sensors s ON s.sensor_id = sr.sensor_id
    WHERE s.sensor_type = sensor_type_param
      AND s.device_id = device_id_param
      AND sr.recorded_at >= NOW() - INTERVAL '24 hours'
    GROUP BY hr
    ORDER BY hr;
$$;

-- Latest readings per river section
CREATE OR REPLACE FUNCTION latest_section_readings(
    section_param text,
    sensor_type_param text
)
RETURNS TABLE(value numeric)
LANGUAGE sql
STABLE
AS $$
    SELECT sr.value
    FROM sensor_readings sr
    JOIN sensors s ON s.sensor_id = sr.sensor_id
    JOIN devices d ON d.device_id = s.device_id
    JOIN locations l ON l.location_id = d.location_id
    WHERE l.river_section = section_param
      AND s.sensor_type = sensor_type_param
      AND sr.recorded_at >= NOW() - INTERVAL '1 hour'
    ORDER BY sr.recorded_at DESC
    LIMIT 10;
$$;

-- =====================================================
-- 3. SIMULATION FUNCTION
-- Replaces: av_overview_api_simulate() in PHP
-- Simulates sensor readings for a device with alert generation
-- =====================================================

CREATE OR REPLACE FUNCTION dashboard_simulate(
    device_id uuid,
    temperature numeric DEFAULT NULL,
    ph_level numeric DEFAULT NULL,
    turbidity numeric DEFAULT NULL,
    dissolved_oxygen numeric DEFAULT NULL,
    water_level numeric DEFAULT NULL,
    sediments numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    device_record record;
    sensor_record record;
    reading_id uuid;
    alerts_created jsonb := '[]'::jsonb;
    readings jsonb := '[]'::jsonb;
    result jsonb;
    sensor_limits jsonb;
    alert_type text;
    alert_message text;
BEGIN
    -- Get device info
    SELECT d.device_id, d.device_name, l.river_section
    INTO device_record
    FROM devices d
    LEFT JOIN locations l ON l.location_id = d.location_id
    WHERE d.device_id = dashboard_simulate.device_id
      AND d.status = 'active';

    IF device_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Device not found or inactive');
    END IF;

    -- Define sensor thresholds
    sensor_limits := jsonb_build_object(
        'temperature', jsonb_build_object('min', 20, 'max', 35, 'unit', '°C', 'label', 'Temperature'),
        'ph_level', jsonb_build_object('min', 6.5, 'max', 8.5, 'unit', 'pH', 'label', 'pH Level'),
        'turbidity', jsonb_build_object('min', 0, 'max', 50, 'unit', 'NTU', 'label', 'Turbidity'),
        'dissolved_oxygen', jsonb_build_object('min', 5, 'max', 14, 'unit', 'mg/L', 'label', 'Dissolved Oxygen'),
        'water_level', jsonb_build_object('min', 0.5, 'max', 3.0, 'unit', 'm', 'label', 'Water Level'),
        'sediments', jsonb_build_object('min', 0, 'max', 500, 'unit', 'mg/L', 'label', 'Sediments')
    );

    -- Process each sensor reading
    FOR sensor_record IN
        SELECT s.sensor_id, s.sensor_type, s.unit, s.min_threshold, s.max_threshold
        FROM sensors s
        WHERE s.device_id = dashboard_simulate.device_id
    LOOP
        -- Get value from parameter based on sensor_type
        DECLARE
            sensor_value numeric;
        BEGIN
            CASE sensor_record.sensor_type
                WHEN 'temperature' THEN sensor_value := temperature;
                WHEN 'ph_level' THEN sensor_value := ph_level;
                WHEN 'turbidity' THEN sensor_value := turbidity;
                WHEN 'dissolved_oxygen' THEN sensor_value := dissolved_oxygen;
                WHEN 'water_level' THEN sensor_value := water_level;
                WHEN 'sediments' THEN sensor_value := sediments;
                ELSE sensor_value := NULL;
            END CASE;

            IF sensor_value IS NOT NULL THEN
                -- Insert reading
                INSERT INTO sensor_readings (sensor_id, value, recorded_at)
                VALUES (sensor_record.sensor_id, sensor_value, NOW())
                RETURNING reading_id INTO reading_id;

                -- Add to readings array
                readings := readings || jsonb_build_object(
                    'sensor_id', sensor_record.sensor_id,
                    'sensor_type', sensor_record.sensor_type,
                    'value', sensor_value,
                    'unit', sensor_record.unit,
                    'reading_id', reading_id
                );

                -- Check for alerts
                IF sensor_value < sensor_record.min_threshold OR sensor_value > sensor_record.max_threshold THEN
                    alert_type := CASE 
                        WHEN sensor_value > sensor_record.max_threshold THEN 'high'
                        ELSE 'low'
                    END;

                    alert_message := sensor_record.sensor_type || ' ' || alert_type || ': ' || 
                                    sensor_value || ' (safe: ' || sensor_record.min_threshold || 
                                    ' - ' || sensor_record.max_threshold || ')';

                    -- Insert alert
                    INSERT INTO alerts (sensor_id, reading_id, alert_type, message, status, created_at)
                    VALUES (sensor_record.sensor_id, reading_id, alert_type, alert_message, 'active', NOW());

                    -- Add to alerts array
                    alerts_created := alerts_created || jsonb_build_object(
                        'type', alert_type,
                        'message', alert_message,
                        'sensor_type', sensor_record.sensor_type,
                        'value', sensor_value
                    );
                END IF;
            END IF;
        END;
    END LOOP;

    -- Update device last_active
    UPDATE devices SET last_active = NOW() 
    WHERE device_id = dashboard_simulate.device_id;

    -- Build result
    result := jsonb_build_object(
        'success', true,
        'reading_id', reading_id,
        'device_id', device_record.device_id,
        'device_name', device_record.device_name,
        'river_section', device_record.river_section,
        'readings', readings,
        'alerts_created', alerts_created,
        'timestamp', NOW()
    );

    RETURN result;
END;
$$;

-- =====================================================
-- 4. MONITOR STATE FUNCTIONS
-- Replaces: av_overview_api_monitor_state() in PHP
-- Save/retrieve simulation state
-- =====================================================

CREATE OR REPLACE FUNCTION dashboard_save_monitor_state(
    running boolean,
    mode text DEFAULT 'normal',
    device_id uuid DEFAULT NULL,
    interval_ms int DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    state jsonb;
    state_key text := 'live_monitor';
BEGIN
    state := jsonb_build_object(
        'running', running,
        'mode', mode,
        'device_id', device_id,
        'interval', interval_ms,
        'started_at', CASE WHEN running THEN NOW() ELSE NULL END,
        'started_by', auth.uid()
    );

    INSERT INTO system_settings (setting_key, setting_value)
    VALUES (state_key, state)
    ON CONFLICT (setting_key) 
    DO UPDATE SET 
        setting_value = state,
        updated_at = NOW();

    RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION dashboard_load_monitor_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    state jsonb;
BEGIN
    SELECT setting_value INTO state
    FROM system_settings
    WHERE setting_key = 'live_monitor';

    IF state IS NULL THEN
        state := jsonb_build_object('running', false);
    END IF;

    RETURN jsonb_build_object('ok', true, 'state', state);
END;
$$;

-- =====================================================
-- 5. ACKNOWLEDGE ALERT FUNCTION
-- Replaces: acknowledge alert functionality from PHP
-- =====================================================

CREATE OR REPLACE FUNCTION dashboard_acknowledge_alert(
    alert_id uuid,
    user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    UPDATE alerts
    SET 
        status = 'acknowledged',
        acknowledged_by = user_id,
        acknowledged_at = NOW()
    WHERE alerts.alert_id = dashboard_acknowledge_alert.alert_id
      AND status = 'active';

    IF FOUND THEN
        result := jsonb_build_object(
            'ok', true,
            'alert_id', alert_id,
            'acknowledged_by', user_id,
            'acknowledged_at', NOW()
        );
    ELSE
        result := jsonb_build_object('ok', false, 'error', 'Alert not found or already acknowledged');
    END IF;

    RETURN result;
END;
$$;

-- =====================================================
-- 6. RESOLVE ALERT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION dashboard_resolve_alert(
    alert_id uuid,
    user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
BEGIN
    UPDATE alerts
    SET 
        status = 'resolved',
        resolved_by = user_id,
        resolved_at = NOW()
    WHERE alerts.alert_id = dashboard_resolve_alert.alert_id
      AND status IN ('active', 'acknowledged');

    IF FOUND THEN
        result := jsonb_build_object(
            'ok', true,
            'alert_id', alert_id,
            'resolved_by', user_id,
            'resolved_at', NOW()
        );
    ELSE
        result := jsonb_build_object('ok', false, 'error', 'Alert not found');
    END IF;

    RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION dashboard_fetch() TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_simulate(uuid, numeric, numeric, numeric, numeric, numeric, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_save_monitor_state(boolean, text, uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_load_monitor_state() TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_acknowledge_alert(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION dashboard_resolve_alert(uuid, uuid) TO authenticated;

-- Also grant to anon if you want public access (adjust as needed)
-- GRANT EXECUTE ON FUNCTION dashboard_fetch() TO anon;
