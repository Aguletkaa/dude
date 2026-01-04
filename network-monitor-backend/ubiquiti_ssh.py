"""
Ubiquiti SSH Client - Pobieranie metryk przez SSH
PEŁNA WERSJA - wszystkie metryki z mca-status
"""

import paramiko
import re
from typing import Dict, Optional

class UbiquitiSSHClient:
    """Klient SSH do pobierania metryk z urządzeń Ubiquiti"""
    
    def __init__(self, username: str = 'ubnt', password: str = 'ubnt', timeout: int = 10):
        self.username = username
        self.password = password
        self.timeout = timeout
    
    def _execute_command(self, host: str, command: str) -> Optional[str]:
        """Wykonaj komendę SSH i zwróć output"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            ssh.connect(
                hostname=host,
                username=self.username,
                password=self.password,
                timeout=self.timeout,
                look_for_keys=False,
                allow_agent=False
            )
            
            stdin, stdout, stderr = ssh.exec_command(command)
            output = stdout.read().decode('utf-8', errors='ignore')
            
            ssh.close()
            
            return output
            
        except Exception as e:
            print(f"SSH error for {host}: {e}")
            return None
    
    def get_metrics(self, host: str, debug: bool = False) -> Dict:
        """Pobierz WSZYSTKIE metryki z urządzenia Ubiquiti przez SSH"""
        metrics = {
            # Podstawowe
            'cpu': 0,
            'memory': 0,
            'uptime': None,
            'uptime_seconds': 0,
            
            # Wireless
            'connections': 0,
            'signal': None,           # Signal strength (dBm)
            'rssi': None,             # RSSI (może być to samo co signal)
            'tx_power': None,         # TX Power (dBm)
            'noise_floor': None,      # Noise floor (dBm)
            'ccq': None,              # Client Connection Quality (%)
            'tx_ccq': None,           # Transmit CCQ (%)
            
            # airMAX
            'airmax_enabled': False,
            'airmax_quality': 0,
            'airmax_capacity': 0,
            
            # Identyfikacja
            'mac_address': None,      # AP MAC
            'model': None,            # Device Model (np. Rocket M5)
            'version': None,          # Firmware version
            'device_name': None,      # Device Name
            'ssid': None,             # SSID
            
            # Dodatkowe info
            'frequency': None,        # Frequency (MHz)
            'channel': None,          # Channel
            'channel_width': None,    # Channel width (MHz)
            'wireless_mode': None,    # Access Point, Station, etc.
            'security': None,         # WPA2-AES, etc.
            'lan_speed': None,        # LAN0 speed
        }
        
        # Komenda mca-status pokazuje wszystkie metryki
        output = self._execute_command(host, 'mca-status')
        
        if not output:
            return metrics
        
        if debug:
            print("\n" + "="*60)
            print("DEBUG - Surowy output z mca-status:")
            print("="*60)
            print(output)
            print("="*60 + "\n")
        
        # Format: key=value,key2=value2 lub key=value na osobnych liniach
        # Zamień przecinki na nowe linie dla łatwiejszego parsowania
        output = output.replace(',', '\n')
        
        # Tymczasowe zmienne
        mem_total = 0
        mem_free = 0
        
        # Parsuj output
        lines = output.split('\n')
        
        for line in lines:
            line = line.strip()
            
            if '=' not in line:
                continue
            
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip()
            
            try:
                # ============ CPU ============
                # cpuUsage=97.1 (to jest IDLE, więc użycie = 100 - idle)
                if key == 'cpuUsage':
                    # Niektóre wersje firmware pokazują idle, inne użycie
                    cpu_val = float(value)
                    # Jeśli > 50, prawdopodobnie to idle
                    if cpu_val > 50:
                        metrics['cpu'] = round(100 - cpu_val, 1)
                    else:
                        metrics['cpu'] = round(cpu_val, 1)
                
                # ============ MEMORY ============
                elif key == 'memTotal':
                    mem_total = int(value)
                elif key == 'memFree':
                    mem_free = int(value)
                    if mem_total > 0:
                        mem_used = mem_total - mem_free
                        metrics['memory'] = round((mem_used / mem_total) * 100, 1)
                
                # ============ UPTIME ============
                elif key == 'uptime':
                    seconds = int(value)
                    metrics['uptime_seconds'] = seconds
                    days = seconds // 86400
                    hours = (seconds % 86400) // 3600
                    minutes = (seconds % 3600) // 60
                    metrics['uptime'] = f"{days}d {hours}h {minutes}m"
                
                # ============ CONNECTIONS ============
                elif key == 'wlanConnections':
                    metrics['connections'] = int(value)
                
                # ============ SIGNAL / RSSI ============
                elif key == 'signal':
                    metrics['signal'] = int(value)
                    metrics['rssi'] = int(value)  # Często to samo
                elif key == 'rssi':
                    metrics['rssi'] = int(value)
                
                # ============ TX POWER ============
                elif key == 'txPower':
                    metrics['tx_power'] = int(value)
                
                # ============ NOISE FLOOR ============
                elif key == 'noise' or key == 'noiseFloor':
                    metrics['noise_floor'] = int(value)
                
                # ============ CCQ ============
                elif key == 'ccq':
                    metrics['ccq'] = round(float(value), 1)
                elif key == 'txCcq':
                    metrics['tx_ccq'] = round(float(value), 1)
                
                # ============ airMAX ============
                elif key == 'wlanPolling':
                    metrics['airmax_enabled'] = value == '1' or value.lower() == 'enabled'
                elif key == 'wlanPollingQuality':
                    metrics['airmax_quality'] = int(value)
                elif key == 'wlanPollingCapacity':
                    metrics['airmax_capacity'] = int(value)
                
                # ============ IDENTYFIKACJA ============
                elif key == 'apMac' or key == 'wlanMac':
                    metrics['mac_address'] = value
                elif key == 'platform':
                    metrics['model'] = value
                elif key == 'firmwareVersion':
                    # Wyciągnij tylko wersję (np. v6.3.14 z XM.ar7240.v6.3.14...)
                    version_match = re.search(r'v[\d.]+', value)
                    if version_match:
                        metrics['version'] = version_match.group()
                    else:
                        metrics['version'] = value[:20]  # Skróć jeśli za długie
                elif key == 'hostname' or key == 'deviceName':
                    metrics['device_name'] = value
                elif key == 'essid' or key == 'wlanSsid':
                    metrics['ssid'] = value
                
                # ============ WIRELESS INFO ============
                elif key == 'freq' or key == 'frequency':
                    metrics['frequency'] = int(value)
                elif key == 'channel':
                    metrics['channel'] = value
                elif key == 'chanbw' or key == 'channelWidth':
                    metrics['channel_width'] = int(value)
                elif key == 'wlanOpmode':
                    mode_map = {
                        '1': 'Station',
                        '2': 'Access Point',
                        '3': 'Access Point WDS',
                        '4': 'Station WDS',
                    }
                    metrics['wireless_mode'] = mode_map.get(value, value)
                elif key == 'wlanSecurity' or key == 'security':
                    metrics['security'] = value
                elif key == 'lanSpeed':
                    metrics['lan_speed'] = value
                    
            except (ValueError, KeyError) as e:
                if debug:
                    print(f"   ⚠️  Parse error for {key}={value}: {e}")
        
        # Cleanup - usuń tymczasowe pola
        metrics.pop('_mem_total', None)
        
        return metrics
    
    def test_connection(self, host: str) -> bool:
        """Test połączenia SSH"""
        output = self._execute_command(host, 'echo OK')
        return output is not None and 'OK' in output
    
    def get_raw_mca_status(self, host: str) -> Optional[str]:
        """Pobierz surowy output mca-status (do debugowania)"""
        return self._execute_command(host, 'mca-status')


# Test
if __name__ == "__main__":
    print("=" * 60)
    print("TEST MODUŁU UBIQUITI SSH - PEŁNE METRYKI")
    print("=" * 60)
    
    password = input("Podaj hasło SSH (lub Enter dla 'ubnt'): ").strip() or 'ubnt'
    
    client = UbiquitiSSHClient(username='admin', password=password, timeout=10)
    
    test_host = '192.168.10.244'
    
    print(f"\n🔍 Testuję: {test_host}")
    
    if client.test_connection(test_host):
        print(f"✅ Połączono!\n")
        
        # Pokaż surowy output
        print("="*60)
        print("SUROWY OUTPUT mca-status:")
        print("="*60)
        raw = client.get_raw_mca_status(test_host)
        print(raw)
        print("="*60)
        
        # Sparsowane metryki
        metrics = client.get_metrics(test_host)
        
        print("\n📊 SPARSOWANE METRYKI:")
        print("-"*40)
        
        print(f"\n🖥️  SYSTEM:")
        print(f"   CPU: {metrics['cpu']}%")
        print(f"   Memory: {metrics['memory']}%")
        print(f"   Uptime: {metrics['uptime']}")
        
        print(f"\n📡 WIRELESS:")
        print(f"   Connections: {metrics['connections']}")
        print(f"   Signal: {metrics['signal']} dBm")
        print(f"   RSSI: {metrics['rssi']} dBm")
        print(f"   TX Power: {metrics['tx_power']} dBm")
        print(f"   Noise Floor: {metrics['noise_floor']} dBm")
        print(f"   CCQ: {metrics['ccq']}%")
        
        print(f"\n✨ airMAX:")
        print(f"   Enabled: {metrics['airmax_enabled']}")
        print(f"   Quality: {metrics['airmax_quality']}%")
        print(f"   Capacity: {metrics['airmax_capacity']}%")
        
        print(f"\n🏷️  IDENTYFIKACJA:")
        print(f"   Model: {metrics['model']}")
        print(f"   Version: {metrics['version']}")
        print(f"   MAC: {metrics['mac_address']}")
        print(f"   Device Name: {metrics['device_name']}")
        print(f"   SSID: {metrics['ssid']}")
        
        print(f"\n📻 RADIO:")
        print(f"   Frequency: {metrics['frequency']} MHz")
        print(f"   Channel: {metrics['channel']}")
        print(f"   Width: {metrics['channel_width']} MHz")
        print(f"   Mode: {metrics['wireless_mode']}")
        
    else:
        print(f"❌ Nie można połączyć")