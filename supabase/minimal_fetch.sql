-- Minimal working dashboard_fetch
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
BEGIN
    -- Get device counts
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'offline', COUNT(*) FILTER (WHERE status = 'inactive'),
        'maint', COUNT(*) FILTER (WHERE status = 'maintenance')
    ) INTO device_counts
    FROM devices;

    -- Get active devices
    SELECT jsonb_agg(jsonb_build_object(
        'device_id', d.device_id,
        'device_name', d.device_name,
        'status', d.status,
        'location_name', COALESCE(l.location_name, 'Unknown'),
        'river_section', COALESCE(l.river_section, 'unknown'),
        'last_active', d.last_active
    ))
    INTO devices_data
    FROM devices d
    LEFT JOIN locations l ON l.location_id = d.location_id
    WHERE d.status = 'active';

    -- Get active alerts
    SELECT jsonb_agg(jsonb_build_object(
        'alert_id', a.alert_id,
        'alert_type', a.alert_type,
        'message', a.message,
        'created_at', a.created_at,
        'device_name', COALESCE(d.device_name, 'Unknown'),
        'location_name', COALESCE(l.location_name, 'Unknown'),
        'sensor_type', s.sensor_type
    ) ORDER BY a.created_at DESC)
    INTO alerts_data
    FROM alerts a
    JOIN sensors s ON s.sensor_id = a.sensor_id
    JOIN devices d ON d.device_id = s.device_id
    JOIN locations l ON l.location_id = d.location_id
    WHERE a.status = 'active'
    LIMIT 10;

    SELECT COUNT(*) INTO alert_count FROM alerts WHERE status = 'active';

    -- Get recent logs
    SELECT jsonb_agg(jsonb_build_object(
        'recorded_at', sr.recorded_at,
        'device_id', d.device_id,
        'device_name', d.device_name,
        'location_name', l.location_name,
        'river_section', l.river_section,
        'sensor_type', s.sensor_type,
        'unit', s.unit,
        'value', sr.value
    ) ORDER BY sr.recorded_at DESC)
    INTO logs_data
    FROM sensor_readings sr
    JOIN sensors s ON s.sensor_id = sr.sensor_id
    JOIN devices d ON d.device_id = s.device_id
    JOIN locations l ON l.location_id = d.location_id
    LIMIT 50;

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

    -- Build result with safe defaults
    result := jsonb_build_object(
        'ok', true,
        'ts', NOW(),
        'river_status', 'Normal',
        'banner_color', '#16a34a',
        'banner_emoji', '✅',
        'warn_count', 0,
        'alert_count', COALESCE(alert_count, 0),
        'dev_counts', COALESCE(device_counts, '{"total":0,"active":0,"offline":0,"maint":0}'::jsonb),
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
