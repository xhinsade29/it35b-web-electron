-- Aqua-Vision Database Migration: MySQL to PostgreSQL (Supabase)
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('admin', 'operator', 'viewer', 'researcher')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Locations table
CREATE TABLE IF NOT EXISTS locations (
    location_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_name VARCHAR(100) NOT NULL,
    river_section VARCHAR(20) NOT NULL CHECK (river_section IN ('upstream', 'midstream', 'downstream')),
    location_type VARCHAR(20) DEFAULT 'start' CHECK (location_type IN ('start', 'end')),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
    device_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    location_id UUID REFERENCES locations(location_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance', 'offline', 'unassigned')),
    device_condition VARCHAR(20) DEFAULT 'normal' CHECK (device_condition IN ('normal', 'displaced', 'damaged', 'malfunctioning')),
    description TEXT,
    installation_date DATE,
    last_active TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sensors table
CREATE TABLE IF NOT EXISTS sensors (
    sensor_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    sensor_type VARCHAR(30) NOT NULL CHECK (sensor_type IN ('temperature', 'ph_level', 'turbidity', 'dissolved_oxygen', 'water_level', 'sediments', 'conductivity', 'humidity', 'pressure', 'flow_rate')),
    unit VARCHAR(20) NOT NULL,
    min_threshold DECIMAL(10, 4) NOT NULL,
    max_threshold DECIMAL(10, 4) NOT NULL,
    calibration_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(device_id, sensor_type)
);

-- Sensor readings table
CREATE TABLE IF NOT EXISTS sensor_readings (
    reading_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID NOT NULL REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    value DECIMAL(10, 4) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sensor_readings
CREATE INDEX idx_sensor_time ON sensor_readings(sensor_id, recorded_at);
CREATE INDEX idx_recorded_at ON sensor_readings(recorded_at DESC);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sensor_id UUID NOT NULL REFERENCES sensors(sensor_id) ON DELETE CASCADE,
    reading_id UUID NOT NULL REFERENCES sensor_readings(reading_id) ON DELETE CASCADE,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('low', 'high', 'critical')),
    message VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for alerts
CREATE INDEX idx_alerts_status_created ON alerts(status, created_at);
CREATE INDEX idx_alerts_sensor_created ON alerts(sensor_id, created_at);

-- Maintenance logs table
CREATE TABLE IF NOT EXISTS maintenance_logs (
    maintenance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id UUID NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    performed_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    maintenance_type VARCHAR(30) NOT NULL CHECK (maintenance_type IN ('calibration', 'repair', 'replacement', 'cleaning', 'inspection', 'malfunction_fix')),
    damage_level VARCHAR(20) DEFAULT 'none' CHECK (damage_level IN ('none', 'low', 'medium', 'high')),
    malfunction_type VARCHAR(100),
    notes TEXT,
    parts_used VARCHAR(255),
    cost DECIMAL(10, 2),
    duration_minutes INTEGER,
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for maintenance_logs
CREATE INDEX idx_maintenance_device_performed ON maintenance_logs(device_id, performed_at);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    alert_id UUID REFERENCES alerts(alert_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(20) DEFAULT 'info' CHECK (notification_type IN ('info', 'warning', 'error', 'success')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_name VARCHAR(255) NOT NULL,
    report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
    generated_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    parameters JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for reports
CREATE INDEX idx_reports_type_generated ON reports(report_type, generated_at);

-- System logs table
CREATE TABLE IF NOT EXISTS system_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for system_logs
CREATE INDEX idx_system_logs_action_created ON system_logs(action, created_at);
CREATE INDEX idx_system_logs_user_created ON system_logs(user_id, created_at);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (you can customize these)
CREATE POLICY "Allow authenticated read access" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON sensors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON sensor_readings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON maintenance_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow own notifications only" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Allow authenticated read access" ON reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON system_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read access" ON system_settings FOR SELECT TO authenticated USING (true);

-- Insert river section boundary locations
INSERT INTO locations (location_name, river_section, location_type, latitude, longitude, description) VALUES
('Upstream Start', 'upstream', 'start', 8.345958, 124.898607, 'Upper watershed entry point - Mangima River origin'),
('Upstream End', 'upstream', 'end', 8.369297, 124.876785, 'Upper watershed exit point - transition to midstream'),
('Midstream Start', 'midstream', 'start', 8.369297, 124.876785, 'Central monitoring entry - convergence from upstream'),
('Midstream End', 'midstream', 'end', 8.394873, 124.903068, 'Central monitoring exit - transition to downstream'),
('Downstream Start', 'downstream', 'start', 8.394873, 124.903068, 'Lower watershed entry - river widening point'),
('Downstream End', 'downstream', 'end', 8.413179, 124.909497, 'Lower watershed exit - river outlet/mouth')
ON CONFLICT DO NOTHING;

-- Insert default admin user (you should change the password hash in production)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@aqua-vision.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin'),
('operator', 'operator@aqua-vision.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Field Operator', 'operator'),
('viewer', 'viewer@aqua-vision.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Data Viewer', 'viewer'),
('researcher', 'researcher@aqua-vision.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Research Scientist', 'researcher')
ON CONFLICT DO NOTHING;

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('alert_email_enabled', 'true', 'boolean', 'Enable email alerts for critical notifications'),
('data_retention_days', '90', 'number', 'Number of days to retain sensor readings'),
('simulation_enabled', 'true', 'boolean', 'Enable data simulation for testing'),
('refresh_interval', '30', 'number', 'Dashboard refresh interval in seconds')
ON CONFLICT DO NOTHING;
