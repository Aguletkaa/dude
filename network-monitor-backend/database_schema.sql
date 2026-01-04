-- ============================================
-- SCHEMAT BAZY DANYCH - Network Monitor
-- UTF-8 Compatible Version
-- ============================================

-- Drop existing tables
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS device_history CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS devices CASCADE;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================
-- TABLE: devices
-- ============================================
CREATE TABLE devices (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    type VARCHAR(50),
    location VARCHAR(200),
    model VARCHAR(100),
    mac_address VARCHAR(17),
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP,
    notes TEXT
);

-- ============================================
-- TABLE: device_history
-- ============================================
CREATE TABLE device_history (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    status VARCHAR(20) NOT NULL,
    
    cpu DECIMAL(5,2),
    memory DECIMAL(5,2),
    uptime BIGINT,
    
    signal INTEGER,
    rssi INTEGER,
    tx_power INTEGER,
    noise_floor INTEGER,
    ccq INTEGER,
    connections INTEGER,
    
    airmax_quality INTEGER,
    airmax_capacity INTEGER,
    
    tx_rate DECIMAL(10,2),
    rx_rate DECIMAL(10,2),
    
    frequency INTEGER,
    channel_width INTEGER,
    
    metrics_source VARCHAR(50)
);

CREATE INDEX idx_device_history_device_time ON device_history(device_id, timestamp DESC);
CREATE INDEX idx_device_history_timestamp ON device_history(timestamp DESC);

-- ============================================
-- TABLE: alerts
-- ============================================
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
    
    severity VARCHAR(20) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES users(id),
    
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    
    context JSONB
);

CREATE INDEX idx_alerts_device_severity ON alerts(device_id, severity);
CREATE INDEX idx_alerts_triggered ON alerts(triggered_at DESC);
CREATE INDEX idx_alerts_unacknowledged ON alerts(acknowledged) WHERE acknowledged = FALSE;

-- ============================================
-- TABLE: alert_history
-- ============================================
CREATE TABLE alert_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES alerts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    
    notification_type VARCHAR(20),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT
);

-- ============================================
-- TABLE: notification_settings
-- ============================================
CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    email_enabled BOOLEAN DEFAULT TRUE,
    
    notification_interval INTEGER DEFAULT 15,
    
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    
    min_severity VARCHAR(20) DEFAULT 'warning',
    
    phone_number VARCHAR(20),
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TEST DATA
-- ============================================

INSERT INTO users (username, email, password_hash, full_name) VALUES
('admin', 'admin@networkmonitor.com', 'admin123', 'Administrator'),
('user', 'user@networkmonitor.com', 'user123', 'Test User');

INSERT INTO notification_settings (user_id, push_enabled, email_enabled, notification_interval) 
VALUES (1, TRUE, TRUE, 15);

-- ============================================
-- VIEWS
-- ============================================

CREATE OR REPLACE VIEW latest_device_status AS
SELECT DISTINCT ON (device_id)
    device_id,
    status,
    cpu,
    memory,
    uptime,
    signal,
    connections,
    timestamp
FROM device_history
ORDER BY device_id, timestamp DESC;

CREATE OR REPLACE VIEW active_alerts AS
SELECT 
    a.*,
    d.name as device_name,
    d.ip as device_ip,
    d.location as device_location
FROM alerts a
JOIN devices d ON a.device_id = d.id
WHERE a.resolved = FALSE
ORDER BY a.triggered_at DESC;

CREATE OR REPLACE VIEW device_stats_24h AS
SELECT 
    dh.device_id,
    d.name,
    d.ip,
    AVG(dh.cpu) as avg_cpu,
    MAX(dh.cpu) as max_cpu,
    AVG(dh.memory) as avg_memory,
    MAX(dh.memory) as max_memory,
    AVG(dh.signal) as avg_signal,
    MIN(dh.signal) as min_signal,
    COUNT(*) as measurements,
    COUNT(CASE WHEN dh.status = 'offline' THEN 1 END) as downtime_count
FROM device_history dh
JOIN devices d ON dh.device_id = d.id
WHERE dh.timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY dh.device_id, d.name, d.ip;

-- ============================================
-- SUCCESS
-- ============================================
SELECT 'Database schema created successfully!' as status;
