from database import create_alert, get_db
from typing import Dict
from datetime import datetime

previous_status_cache: Dict[int, str] = {}
_initialized = False


def initialize_status_cache():
    global previous_status_cache, _initialized

    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT DISTINCT ON (device_id)
                    device_id,
                    status
                FROM device_history
                ORDER BY device_id, timestamp DESC
            """)
            results = cursor.fetchall()
            for row in results:
                previous_status_cache[row['device_id']] = row['status']

            _initialized = True
            print(f"Alert detector zainicjalizowany dla {len(previous_status_cache)} urządzeń")
    except Exception as e:
        print(f"Ostrzeżenie: nie można zainicjalizować cache alertów: {e}")
        _initialized = True


def check_and_create_alerts(device_id: int, current_status: str, device_name: str, metrics: Dict = None):
    global previous_status_cache, _initialized

    if not _initialized:
        initialize_status_cache()

    previous_status = previous_status_cache.get(device_id)

    if previous_status is None:
        previous_status_cache[device_id] = current_status
        return

    if previous_status == current_status:
        return

    if previous_status in ['online', 'warning'] and current_status == 'offline':
        try:
            create_alert(
                device_id=device_id,
                severity='critical',
                alert_type='device_down',
                message=f'Urządzenie {device_name} przestało odpowiadać',
                context={
                    'previous_status': previous_status,
                    'new_status': current_status,
                    'timestamp': datetime.now().isoformat(),
                },
            )
            print(f"ALERT KRYTYCZNY: {device_name} przeszło OFFLINE")
        except Exception as e:
            print(f"Błąd tworzenia alertu dla {device_name}: {e}")

    elif previous_status == 'offline' and current_status in ['online', 'warning']:
        try:
            create_alert(
                device_id=device_id,
                severity='info',
                alert_type='device_up',
                message=f'Urządzenie {device_name} wróciło do pracy',
                context={
                    'previous_status': previous_status,
                    'new_status': current_status,
                    'timestamp': datetime.now().isoformat(),
                },
            )
            print(f"ODZYSKANO: {device_name} wróciło ONLINE")
        except Exception as e:
            print(f"Błąd tworzenia alertu recovery dla {device_name}: {e}")

    previous_status_cache[device_id] = current_status