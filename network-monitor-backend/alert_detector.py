# alert_detector.py - Alert Detection Logic (tylko device_down/device_up)

from database import create_alert, get_db
from typing import Dict, Optional
from datetime import datetime

# Cache poprzednich statusów urządzeń
previous_status_cache: Dict[int, str] = {}

def check_and_create_alerts(device_id: int, current_status: str, device_name: str, metrics: Dict = None):
    """
    Sprawdź czy status się zmienił i utwórz alert jeśli potrzeba
    TYLKO alerty: device_down (CRITICAL) i device_up (INFO)
    
    Args:
        device_id: ID urządzenia
        current_status: Aktualny status (online/offline/warning)
        device_name: Nazwa urządzenia
        metrics: Opcjonalne metryki
    """
    global previous_status_cache
    
    # Pobierz poprzedni status z cache
    previous_status = previous_status_cache.get(device_id)
    
    # Jeśli to pierwsze sprawdzenie, zapisz tylko status
    if previous_status is None:
        previous_status_cache[device_id] = current_status
        return
    
    # Sprawdź czy status się zmienił
    if previous_status == current_status:
        return  # Brak zmiany, nie rób nic
    
    # STATUS ZMIENIŁ SIĘ - Utwórz alert
    
    # 1. ONLINE/WARNING → OFFLINE (CRITICAL)
    if (previous_status in ['online', 'warning']) and current_status == 'offline':
        create_alert(
            device_id=device_id,
            severity='critical',
            alert_type='device_down',
            message=f'Urzadzenie {device_name} przestalo odpowiadac',
            context={
                'previous_status': previous_status,
                'new_status': current_status,
                'timestamp': datetime.now().isoformat()
            }
        )
        print(f"🚨 ALERT: {device_name} went OFFLINE")
        
        # WYŚLIJ PUSH NOTIFICATION + EMAIL
        print(f"🚨 ALERT: {device_name} went OFFLINE")
    
    # 2. OFFLINE → ONLINE/WARNING (INFO - recovery)
    elif previous_status == 'offline' and current_status in ['online', 'warning']:
        create_alert(
            device_id=device_id,
            severity='info',
            alert_type='device_up',
            message=f'Urzadzenie {device_name} wrocilo do pracy',
            context={
                'previous_status': previous_status,
                'new_status': current_status,
                'timestamp': datetime.now().isoformat()
            }
        )
        print(f"✅ RECOVERY: {device_name} is back ONLINE")
        
        # NIE rozwiązujemy automatycznie alertu critical - zostawiamy w historii
        # Użytkownik zobaczy: alert critical (przestało) + alert info (wróciło)
    
    # UWAGA: Nie tworzymy alertów dla ONLINE ↔ WARNING
    # (pomijamy słaby sygnał, wysokie CPU, itp.)
    
    # Zaktualizuj cache
    previous_status_cache[device_id] = current_status


def initialize_status_cache():
    """Inicjalizuj cache statusów z bazy danych przy starcie"""
    global previous_status_cache
    
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            # Pobierz ostatni status każdego urządzenia
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
            
            print(f"✅ Alert detector initialized with {len(previous_status_cache)} devices")
    except Exception as e:
        print(f"⚠️  Could not initialize status cache: {e}")


# Test function
if __name__ == "__main__":
    from database import test_connection
    
    if test_connection():
        print("\n🧪 Testing alert detection...")
        
        # Test 1: Device goes offline
        check_and_create_alerts(
            device_id=555554,
            current_status='offline',
            device_name='Test Device',
            metrics={'cpu': 50, 'memory': 60}
        )
        
        # Test 2: Device comes back online
        check_and_create_alerts(
            device_id=555554,
            current_status='online',
            device_name='Test Device',
            metrics={'cpu': 20, 'memory': 40}
        )
        
        print("\n✅ Test completed!")