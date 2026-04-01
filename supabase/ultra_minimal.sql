-- Ultra minimal dashboard_fetch - no nested aggregates
CREATE OR REPLACE FUNCTION dashboard_fetch()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    device_counts jsonb;
    devices_data jsonb;
    alerts_data jsonb;
    logs_data jsonb;
    map_locations_data jsonb;
    maintenance_data jsonb;
    alert_count int;
    device_count_total int;
    device_count_active int;
    device_count_offline int;
    device_count_maint int;
BEGIN
    -- Get device counts (separate queries to avoid nesting)
    SELECT COUNT(*) INTO device_count_total FROM devices;
    SELECT COUNT(*) INTO device_count_active FROM devices WHERE status = 'active';
    SELECT COUNT(*) INTO device_count_offline FROM devices WHERE status = 'inactive';
    SELECT COUNT(*) INTO device_count_maint FROM devices WHERE status = 'maintenance';
    
    device_counts := jsonb_build_object(
        'total', device_count_total,
        'active', device_count_active,
        'offline', device_count_offline,
        'maint', device_count_maint
    );

    -- Get active devices (simple query, no aggregates)
    SELECT jsonb_agg(
        jsonb_build_object(
            'device_id', d.device_id,
            'device_name', d.device_name,
            'status', d.status,
            'location_name', COALESCE(l.location_name, 'Unknown'),
            'river_section', COALESCE(l.river_section, 'unknown'),
            'last_active', d.last_active
        )
    )
    INTO devices_data
    FROM devices d
    LEFT JOIN locations l ON l.location_id = d.location_id
    WHERE d.status = 'active';

    -- Get active alerts (simple join, no nested aggregates)
    SELECT jsonb_agg(
        jsonb_build_object(
            'alert_id', a.alert_id,
            'alert_type', a.alert_type,
            'message', a.message,
            'created_at', a.created_at,
            'device_name', COALESCE(d.device_name, 'Unknown'),
            'location_name', COALESCE(l.location_name, 'Unknown'),
            'sensor_type', s.sensor_type
        )
    )
    INTO alerts_data
    FROM alerts a
    JOIN sensors s ON s.sensor_id = a.sensor_id
    JOIN devices d ON d.device_id = s.device_id
    JOIN locations l ON l.location_id = d.location_id
    WHERE a.status = 'active'
    ORDER BY a.created_at DESC
    LIMIT 10;

    SELECT COUNT(*) INTO alert_count FROM alerts WHERE status = 'active';

    -- Get recent logs (simple join)
    SELECT jsonb_agg(
        jsonb_build_object(
            'recorded_at', sr.recorded_at,
            'device_id', d.device_id,
            'device_name', d.device_name,
            'location_name', l.location_name,
            'river_section', l.river_section,
            'sensor_type', s.sensor_type,
            'unit', s.unit,
            'value', sr.value
        )
    )
    INTO logs_data
    FROM sensor_readings sr
    JOIN sensors s ON s.sensor_id = sr.sensor_id
    JOIN devices d ON d.device_id = s.device_id
    JOIN locations l ON l.location_id = d.location_id
    ORDER BY sr.recorded_at DESC
    LIMIT 50;

    -- Get map locations - use a CTE to avoid nested aggregates
    WITH location_counts AS (
        SELECT 
            l.location_id,
            l.location_name,
            l.river_section,
            l.latitude,
            l.longitude,
            COUNT(d.device_id) as total_devices
        FROM locations l
        LEFT JOIN devices d ON d.location_id = l.location_id
        GROUP BY l.location_id, l.location_name, l.river_section, l.latitude, l.longitude
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'location_id', lc.location_id,
            'location_name', lc.location_name,
            'river_section', lc.river_section,
            'latitude', lc.latitude,
            'longitude', lc.longitude,
            'total_devices', lc.total_devices,
            'active_devices', 0,
            'maint_devices', 0
        )
    )
    INTO map_locations_data
    FROM location_counts lc;

    -- Get maintenance logs
    SELECT jsonb_agg(
        jsonb_build_object(
            'maintenance_type', ml.maintenance_type,
            'notes', ml.notes,
            'performed_at', ml.performed_at,
            'device_name', d.device_name,
            'full_name', u.full_name
        )
    )
    INTO maintenance_data
    FROM maintenance_logs ml
    JOIN devices d ON d.device_id = ml.device_id
    JOIN users u ON u.user_id = ml.performed_by
    ORDER BY ml.performed_at DESC
    LIMIT 4;

    -- Build result with safe defaults
    result := jsonb_build_object(
        'ok', true,
        'ts', NOW(),
        'river_status', 'Normal',
        'banner_color', '#16a34a',
        'banner_emoji', '✅',
        'warn_count', 0,
        'alert_count', COALESCE(alert_count, 0),
        'dev_counts', device_counts,
        'devices', COALESCE(devices_data, '[]'::jsonb),
        'device_readings', '{}'::jsonb,
        'alerts', COALESCE(alerts_data, '[]'::jsonb),
        'logs', COALESCE(logs_data, '[]'::jsonb),
        'map_locations', COALESCE(map_locations_data, '[]'::jsonb),
        'chart_data', jsonb_build_object(
            'temperature', '[]'::jsonb,
            'pH', '[]'::jsonb,
            'turbidity', '[]'::jsonb,
            'dissolved_oxygen', '[]'::jsonb,
            'water_level', '[]'::jsonb,
            'sediments', '[]'::jsonb
        ),
        'device_chart_data', '{}'::jsonb,
        'maintenance', COALESCE(maintenance_data, '[]'::jsonb),
        'section_conditions', jsonb_build_object(
            'upstream', '{}'::jsonb,
            'midstream', '{}'::jsonb,
            'downstream', '{}'::jsonb
        )
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION dashboard_fetch() TO authenticated;
