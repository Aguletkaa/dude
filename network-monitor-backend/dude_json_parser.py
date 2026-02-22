import json
from typing import List, Dict, Optional

class DudeJSONParser:
    def __init__(self, json_path: str = "dane.txt"):
        self.json_path = json_path
        self.data = None
        self.load_json()
    
    def load_json(self):
        """Wczytaj plik JSON z The Dude"""
        try:
            with open(self.json_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
        except Exception as e:
            print(f"Error loading JSON: {e}")
            self.data = {}
    
    def get_map_layout(self) -> List[Dict]:
        """
        Pobierz layout mapy z The Dude (pozycje X,Y urządzeń)
        """
        try:
            if not self.data or 'networkMapElement' not in self.data:
                return []
            
            items = []
            for element in self.data['networkMapElement']:
                # Tylko urządzenia (itemType = 0)
                if element.get('itemType') == 0:
                    items.append({
                        'device_id': element.get('itemId'),
                        'x': element.get('itemX', 0),
                        'y': element.get('itemY', 0),
                        'map_id': element.get('mapId'),
                        'item_type': element.get('itemType'),
                        'link_from': element.get('linkFrom', -1),
                        'link_to': element.get('linkTo', -1),
                        'object_id': element.get('objectId'),
                    })
            
            return items
            
        except Exception as e:
            print(f"Error getting map layout: {e}")
            return []

    def get_map_connections(self) -> List[Dict]:
        """
        Pobierz połączenia (linie) między urządzeniami
        """
        try:
            if not self.data or 'networkMapElement' not in self.data:
                return []
            
            connections = []
            for element in self.data['networkMapElement']:
                if element.get('type') == 1:
                    link_from = element.get('linkFrom')
                    link_to = element.get('linkTo')
                    
                    if link_from and link_to and link_from != -1 and link_to != -1:
                        connections.append({
                            'from_id': link_from,
                            'to_id': link_to,
                            'map_id': element.get('mapId'),
                        })
            
            return connections
            
        except Exception as e:
            print(f"Error getting connections: {e}")
            return []


# Test
if __name__ == "__main__":
    parser = DudeJSONParser("dane.txt")
    
    print("=" * 60)
    print("TEST JSON PARSERA - MAPA")
    print("=" * 60)
    
    layout = parser.get_map_layout()
    connections = parser.get_map_connections()
    
    print(f"\n✅ Znaleziono {len(layout)} pozycji na mapie")
    print(f"✅ Znaleziono {len(connections)} połączeń\n")
    
    # Pokaż pierwsze 10 pozycji
    print("Pierwsze 10 urządzeń na mapie:\n")
    for item in layout[:10]:
        print(f"Device ID {item['device_id']}: X={item['x']}, Y={item['y']}, MapID={item['map_id']}")
    
    print(f"\nPierwsze 5 połączeń:\n")
    for conn in connections[:5]:
        print(f"Połączenie: {conn['from_id']} → {conn['to_id']}")
