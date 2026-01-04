import sqlite3
import re
from typing import List, Dict, Optional
from datetime import datetime

class DudeParser:
    def __init__(self, db_path: str = "dude.db"):
        self.db_path = db_path
    
    
    
    def get_all_devices(self) -> List[Dict]:
        """Wyciągnij wszystkie urządzenia z bazy The Dude"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Pobierz wszystkie obiekty
        cursor.execute("SELECT id, obj FROM objs")
        all_objects = cursor.fetchall()
        
        devices = []
        
        for obj_id, obj_blob in all_objects:
            try:
                # Dekoduj BLOB
                text = obj_blob.decode('utf-8', errors='ignore')
                
                # Szukaj IP w tekście
                ips = re.findall(r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b', text)
                
                # Szukaj IP w bajtach (dla urządzeń 192.168.x.x)
                binary_ips = []
                for i in range(len(obj_blob) - 3):
                    byte1 = obj_blob[i]
                    byte2 = obj_blob[i+1] 
                    byte3 = obj_blob[i+2]
                    byte4 = obj_blob[i+3]
                    
                    # Sprawdź czy to IP z sieci 192.168
                    if byte1 == 192 and byte2 == 168:
                        binary_ip = f"{byte1}.{byte2}.{byte3}.{byte4}"
                        if binary_ip not in binary_ips:
                            binary_ips.append(binary_ip)
                
                # Połącz IP z obu źródeł
                all_ips = list(set(ips + binary_ips))
                
                # Jeśli nie ma IP, to nie jest urządzenie - pomiń
                if not all_ips:
                    continue
                
                ip = all_ips[0]  # Pierwszy IP
                
                # Szukaj nazwy - bierz WSZYSTKIE słowa
                names = re.findall(r'[A-Z][A-Za-z0-9_\-]{2,}', text)
                
                # Filtruj adminD, admin, public - to nie są nazwy urządzeń
                excluded_names = ['admin', 'admind', 'public']
                valid_names = [n for n in names if n.lower() not in excluded_names]
                
                # Weź pierwszą prawdziwą nazwę lub Device_ID
                name = valid_names[0] if valid_names else f"Device_{obj_id}"
                
                # Określ typ urządzenia na podstawie nazwy
                device_type = "unknown"
                
                if "AP_" in name or "ap_" in name.lower():
                    device_type = "access_point"
                elif "CL_" in name or "cl_" in name.lower():
                    device_type = "client"
                elif "SW_" in name or "switch" in name.lower():
                    device_type = "switch"
                elif "router" in name.lower():
                    device_type = "router"
                elif "bridge" in text.lower():
                    device_type = "bridge"
                
                # Wyciągnij lokalizację z nazwy (jeśli jest)
                location = None
                if "_" in name and not name.startswith("Device_"):
                    parts = name.split("_")
                    if len(parts) > 1:
                        location = "_".join(parts[1:])
                
                # Pobierz ostatnią awarię dla tego urządzenia
                cursor.execute("""
                    SELECT time, status, duration 
                    FROM outages 
                    WHERE deviceID = ? 
                    ORDER BY time DESC 
                    LIMIT 1
                """, (obj_id,))
                
                last_outage = cursor.fetchone()
                
                # Określ status
                status = "online"
                last_check = datetime.now().isoformat()
                
                if last_outage:
                    last_time = datetime.fromtimestamp(last_outage[0])
                    last_check = last_time.isoformat()
                    
                    # Jeśli ostatnia awaria była w ciągu ostatnich 10 minut
                    time_diff = (datetime.now() - last_time).total_seconds()
                    if time_diff < 600:  # 10 minut
                        status = "offline"
                
                # Policz liczbę awarii
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM outages 
                    WHERE deviceID = ?
                """, (obj_id,))
                
                outage_count = cursor.fetchone()[0]
                
                device = {
                    "id": obj_id,
                    "name": name,
                    "ip": ip,
                    "type": device_type,
                    "status": status,
                    "lastCheck": last_check,
                    "outageCount": outage_count,
                    "location": location
                }
                
                devices.append(device)
                
            except Exception as e:
                # Pomiń obiekty których nie można sparsować
                continue
        
        conn.close()
        
        # Zwróć wszystkie urządzenia bez deduplikacji
        return devices
    
    def get_device_by_id(self, device_id: int) -> Optional[Dict]:
        """Pobierz szczegóły konkretnego urządzenia"""
        devices = self.get_all_devices()
        for device in devices:
            if device["id"] == device_id:
                return device
        return None
    
    def get_device_outages(self, device_id: int, limit: int = 50) -> List[Dict]:
        """Pobierz historię awarii urządzenia"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT time, status, duration 
            FROM outages 
            WHERE deviceID = ? 
            ORDER BY time DESC 
            LIMIT ?
        """, (device_id, limit))
        
        outages = []
        for row in cursor.fetchall():
            time_unix, status, duration = row
            outages.append({
                "timestamp": datetime.fromtimestamp(time_unix).isoformat(),
                "status": status,
                "duration": duration / 60  # w minutach
            })
        
        conn.close()
        return outages
    
    def get_map_layout(self) -> List[Dict]:
        """
        Pobierz layout mapy z The Dude (pozycje X,Y urządzeń)
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pobierz mapItem (pozycje urządzeń na mapie)
            cursor.execute("""
                SELECT 
                    mi.itemId as device_id,
                    mi.itemX as x,
                    mi.itemY as y,
                    mi.mapId as map_id,
                    mi.type as item_type,
                    mi.linkFrom,
                    mi.linkTo
                FROM mapItem mi
                WHERE mi.itemType = 0
            """)
            
            items = []
            for row in cursor.fetchall():
                items.append({
                    'device_id': row[0],
                    'x': row[1],
                    'y': row[2],
                    'map_id': row[3],
                    'item_type': row[4],
                    'link_from': row[5],
                    'link_to': row[6],
                })
            
            conn.close()
            return items
            
        except Exception as e:
            print(f"Error getting map layout: {e}")
            return []

    def get_map_connections(self) -> List[Dict]:
        """
        Pobierz połączenia (linie) między urządzeniami
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Pobierz mapItem typu 1 (połączenia/linie)
            cursor.execute("""
                SELECT 
                    mi.linkFrom,
                    mi.linkTo,
                    mi.mapId
                FROM mapItem mi
                WHERE mi.type = 1
                  AND mi.linkFrom != -1
                  AND mi.linkTo != -1
            """)
            
            connections = []
            for row in cursor.fetchall():
                connections.append({
                    'from_id': row[0],
                    'to_id': row[1],
                    'map_id': row[2],
                })
            
            conn.close()
            return connections
            
        except Exception as e:
            print(f"Error getting connections: {e}")
            return []


# Test
if __name__ == "__main__":
    parser = DudeParser()
    
    print("=" * 60)
    print("TEST PARSERA THE DUDE")
    print("=" * 60)
    
    devices = parser.get_all_devices()
    
    print(f"\n✅ Znaleziono {len(devices)} urządzeń\n")
    
    # Pokaż pierwsze 10
    for device in devices[:10]:
        print(f"📱 {device['name']}")
        print(f"   IP: {device['ip']}")
        print(f"   Type: {device['type']}")
        print(f"   Status: {device['status']}")
        print(f"   Location: {device.get('location', 'N/A')}")
        print(f"   Awarie: {device['outageCount']}")
        print()
    
    # Pokaż najczęściej padające
    sorted_devices = sorted(devices, key=lambda x: x['outageCount'], reverse=True)
    print("\n🔥 Top 5 urządzeń z największą liczbą awarii:")
    for device in sorted_devices[:5]:
        print(f"   {device['name']} ({device['ip']}): {device['outageCount']} awarii")
    
    # Test mapy
    print("\n" + "=" * 60)
    print("TEST MAPY")
    print("=" * 60)
    
    layout = parser.get_map_layout()
    connections = parser.get_map_connections()
    
    print(f"\n✅ Znaleziono {len(layout)} pozycji na mapie")
    print(f"✅ Znaleziono {len(connections)} połączeń\n")
    
    # Pokaż pierwsze 5 pozycji
    for item in layout[:5]:
        print(f"📍 Device ID {item['device_id']}: X={item['x']}, Y={item['y']}")