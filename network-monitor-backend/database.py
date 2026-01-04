# database.py - Database functions for Network Monitor
import psycopg
from psycopg.rows import dict_row
from contextlib import contextmanager
from datetime import datetime
from typing import List, Dict, Optional

# =============== HELPER FUNCTIONS ===============
def parse_uptime_to_seconds(uptime_str):
    """Convert uptime string like '1222d 14h 21m' to seconds"""
    if not uptime_str or not isinstance(uptime_str, str):
        return None
    
    try:
        seconds = 0
        parts = uptime_str.split()
        
        for part in parts:
            if 'd' in part:
                seconds += int(part.replace('d', '')) * 86400
            elif 'h' in part:
                seconds += int(part.replace('h', '')) * 3600
            elif 'm' in part:
                seconds += int(part.replace('m', '')) * 60
            elif 's' in part:
                seconds += int(part.replace('s', ''))
        
        return seconds
    except:
        return None

# =============== CONFIG ===============
DB_CONFIG = {
    'host': 'localhost',
    'port': 5433,  # ZMIEŃ NA 5432 jeśli używasz standardowego portu
    'dbname': 'network_monitor',
    'user': 'postgres',
    'password': '4031'  # TWOJE HASŁO
}

# =============== CONNECTION ===============
@contextmanager
def get_db():
    """Context manager for database connection"""
    conn = psycopg.connect(**DB_CONFIG, row_factory=dict_row)
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

# =============== DEVICES ===============
def sync_device(device_data: Dict) -> None:
    """Sync device info to database (insert or update)"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO devices (id, name, ip, type, location, model, mac_address, last_seen)
            VALUES (%(id)s, %(name)s, %(ip)s, %(type)s, %(location)s, %(model)s, %(mac_address)s, NOW())
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                ip = EXCLUDED.ip,
                type = EXCLUDED.type,
                location = EXCLUDED.location,
                model = EXCLUDED.model,
                mac_address = EXCLUDED.mac_address,
                last_seen = NOW()
        """, device_data)

# =============== DEVICE HISTORY ===============
def save_device_metrics(device_id: int, metrics: Dict) -> None:
    """Save device metrics to history"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO device_history (
                device_id, status, cpu, memory, uptime,
                signal, rssi, tx_power, noise_floor, ccq, connections,
                airmax_quality, airmax_capacity,
                tx_rate, rx_rate, frequency, channel_width,
                metrics_source
            ) VALUES (
                %(device_id)s, %(status)s, %(cpu)s, %(memory)s, %(uptime)s,
                %(signal)s, %(rssi)s, %(tx_power)s, %(noise_floor)s, %(ccq)s, %(connections)s,
                %(airmax_quality)s, %(airmax_capacity)s,
                %(tx_rate)s, %(rx_rate)s, %(frequency)s, %(channel_width)s,
                %(metrics_source)s
            )
        """, {
            'device_id': device_id,
            'status': metrics.get('status', 'unknown'),
            'cpu': metrics.get('cpu'),
            'memory': metrics.get('memory'),
            'uptime': parse_uptime_to_seconds(metrics.get('uptime')),
            'signal': metrics.get('signal'),
            'rssi': metrics.get('rssi'),
            'tx_power': metrics.get('tx_power'),
            'noise_floor': metrics.get('noise_floor'),
            'ccq': metrics.get('ccq'),
            'connections': metrics.get('connections'),
            'airmax_quality': metrics.get('airmax_quality'),
            'airmax_capacity': metrics.get('airmax_capacity'),
            'tx_rate': metrics.get('tx_rate'),
            'rx_rate': metrics.get('rx_rate'),
            'frequency': metrics.get('frequency'),
            'channel_width': metrics.get('channel_width'),
            'metrics_source': metrics.get('metrics_source', 'unknown')
        })

# =============== ALERTS ===============
def create_alert(device_id: int, severity: str, alert_type: str, message: str, context: Dict = None) -> int:
    """Create new alert"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO alerts (device_id, severity, alert_type, message, context)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (device_id, severity, alert_type, message, psycopg.types.json.Jsonb(context or {})))
        alert_id = cursor.fetchone()['id']
        return alert_id

def get_active_alerts(device_id: Optional[int] = None) -> List[Dict]:
    """Get active (unresolved) alerts"""
    with get_db() as conn:
        cursor = conn.cursor()
        if device_id:
            cursor.execute("""
                SELECT a.*, d.name as device_name, d.ip as device_ip
                FROM alerts a
                JOIN devices d ON a.device_id = d.id
                WHERE a.resolved = FALSE AND a.device_id = %s
                ORDER BY a.triggered_at DESC
            """, (device_id,))
        else:
            cursor.execute("""
                SELECT a.*, d.name as device_name, d.ip as device_ip
                FROM alerts a
                JOIN devices d ON a.device_id = d.id
                WHERE a.resolved = FALSE
                ORDER BY a.triggered_at DESC
            """)
        return cursor.fetchall()

def acknowledge_alert(alert_id: int, user_id: int) -> None:
    """Acknowledge an alert"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE alerts 
            SET acknowledged = TRUE, 
                acknowledged_at = NOW(),
                acknowledged_by = %s
            WHERE id = %s
        """, (user_id, alert_id))

def resolve_alert(alert_id: int) -> None:
    """Resolve an alert"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE alerts 
            SET resolved = TRUE, resolved_at = NOW()
            WHERE id = %s
        """, (alert_id,))

# =============== STATISTICS ===============
def get_device_stats_24h(device_id: int) -> Dict:
    """Get device statistics for last 24 hours"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM device_stats_24h
            WHERE device_id = %s
        """, (device_id,))
        result = cursor.fetchone()
        return result if result else {}

def get_latest_device_status(device_id: int) -> Optional[Dict]:
    """Get latest status for a device"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM latest_device_status
            WHERE device_id = %s
        """, (device_id,))
        return cursor.fetchone()

# =============== CHARTS DATA ===============
def get_device_metrics_history(device_id: int, hours: int = 24) -> List[Dict]:
    """Get device metrics for charts"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                timestamp,
                cpu,
                memory,
                signal,
                connections,
                tx_rate,
                rx_rate
            FROM device_history
            WHERE device_id = %s 
              AND timestamp >= NOW() - INTERVAL '%s hours'
            ORDER BY timestamp ASC
        """, (device_id, hours))
        return cursor.fetchall()

# =============== TEST ===============
def test_connection():
    """Test database connection"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM users")
            result = cursor.fetchone()
            print(f"✅ Database OK! Users: {result['count']}")
            return True
    except Exception as e:
        print(f"❌ Database ERROR: {e}")
        return False

if __name__ == "__main__":
    test_connection()