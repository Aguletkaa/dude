from database import create_alert, get_db
from typing import Dict
from datetime import datetime

previous_status_cache: Dict[int, str] = {}
_initialized = False

OFFLINE_THRESHOLD = 3  # ile kolejnych niepowodzeń offline

consecutive_failures: Dict[int, int] = {}

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


def record_success(device_id: int):
    """Urządzenie odpowiedziało - resetuj licznik niepowodzeń"""
    consecutive_failures[device_id] = 0


def record_failure(device_id: int) -> int:
    """Urządzenie nie odpowiedziało - zwiększ licznik, zwróć aktualną wartość"""
    consecutive_failures[device_id] = consecutive_failures.get(device_id, 0) + 1
    return consecutive_failures[device_id]


def is_confirmed_offline(device_id: int) -> bool:
    """Czy urządzenie przekroczyło próg niepowodzeń?"""
    return consecutive_failures.get(device_id, 0) >= OFFLINE_THRESHOLD


def get_failure_count(device_id: int) -> int:
    """Zwróć aktualny licznik niepowodzeń"""
    return consecutive_failures.get(device_id, 0)


def check_and_create_alerts(device_id: int, current_status: str, device_name: str, metrics: Dict = None):
    """
    Sprawdź zmianę statusu i stwórz alert jeśli potrzeba.
    
    WAŻNE: Dla statusu 'offline' alert jest tworzony TYLKO gdy
    urządzenie nie odpowiedziało OFFLINE_THRESHOLD razy z rzędu.
    Pojedyncze niepowodzenie SSH nie tworzy alertu.
    """
    global previous_status_cache, _initialized

    if not _initialized:
        initialize_status_cache()

    previous_status = previous_status_cache.get(device_id)

    if previous_status is None:
        previous_status_cache[device_id] = current_status
        if current_status != 'offline':
            record_success(device_id)
        return

    if previous_status == current_status:
        return

    if previous_status in ['online', 'warning'] and current_status == 'offline':
        if not is_confirmed_offline(device_id):
            fail_count = get_failure_count(device_id)
            print(f"⏳ {device_name}: niepowodzenie {fail_count}/{OFFLINE_THRESHOLD} - czekam na potwierdzenie")
            return  

        try:
            create_alert(
                device_id=device_id,
                severity='critical',
                alert_type='device_down',
                message=f'Urządzenie {device_name} przestało odpowiadać (brak odpowiedzi {OFFLINE_THRESHOLD}x)',
                context={
                    'previous_status': previous_status,
                    'new_status': current_status,
                    'consecutive_failures': get_failure_count(device_id),
                    'timestamp': datetime.now().isoformat(),
                },
            )
            print(f"🔴 ALERT KRYTYCZNY: {device_name} potwierdzone OFFLINE ({get_failure_count(device_id)} kolejnych niepowodzeń)")
        except Exception as e:
            print(f"Błąd tworzenia alertu dla {device_name}: {e}")

    elif previous_status == 'offline' and current_status in ['online', 'warning']:
        record_success(device_id)
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
            print(f"🟢 ODZYSKANO: {device_name} wróciło ONLINE")
        except Exception as e:
            print(f"Błąd tworzenia alertu recovery dla {device_name}: {e}")

    elif previous_status == 'online' and current_status == 'warning':
        record_success(device_id)  
        try:
            create_alert(
                device_id=device_id,
                severity='warning',
                alert_type='device_warning',
                message=f'Urządzenie {device_name}: pogorszone parametry',
                context={
                    'previous_status': previous_status,
                    'new_status': current_status,
                    'metrics': {
                        'cpu': metrics.get('cpu') if metrics else None,
                        'memory': metrics.get('memory') if metrics else None,
                        'signal': metrics.get('signal') if metrics else None,
                    },
                    'timestamp': datetime.now().isoformat(),
                },
            )
            print(f"⚠️ WARNING: {device_name} - pogorszone parametry")
        except Exception as e:
            print(f"Błąd tworzenia alertu warning dla {device_name}: {e}")

    previous_status_cache[device_id] = current_status