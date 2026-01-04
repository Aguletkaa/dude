// src/screens/MapScreen.js - Mapa z PRAWDZIWYMI pozycjami z The Dude
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Svg, { Circle, Rect, Text as SvgText, Line } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';
import COLORS from '../constants/colors';

const API_URL = 'http://10.0.2.2:8000';

const MapScreen = ({ navigation }) => {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(0.5); // Zacznij od 50% bo mapa The Dude jest duża

  useEffect(() => {
    loadMapLayout();
  }, []);

  const loadMapLayout = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token') || 
                    await AsyncStorage.getItem('access_token');

      const response = await fetch(`${API_URL}/api/map/layout`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      processMapData(data);
    } catch (error) {
      console.error('Error loading map:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMapData = (data) => {
    if (!data.items || data.items.length === 0) {
      return;
    }

    // Znajdź rozmiar canvas (max X i Y)
    const maxX = Math.max(...data.items.map(i => i.x)) + 200;
    const maxY = Math.max(...data.items.map(i => i.y)) + 200;

    // Stwórz mapę itemId -> pozycja dla połączeń
    const itemsById = {};
    data.items.forEach(item => {
      itemsById[item.device_id] = item;
    });

    // Przetwórz połączenia
    const connections = [];
    if (data.connections) {
      data.connections.forEach(conn => {
        const fromItem = itemsById[conn.from_id];
        const toItem = itemsById[conn.to_id];
        
        if (fromItem && toItem) {
          connections.push({
            from: fromItem,
            to: toItem,
          });
        }
      });
    }

    setMapData({
      items: data.items,
      connections,
      canvasWidth: maxX,
      canvasHeight: maxY,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return COLORS.online;
      case 'offline': return COLORS.offline;
      case 'warning': return COLORS.warning;
      default: return COLORS.textMuted;
    }
  };

  const handleNodePress = (item) => {
    navigation.navigate('DeviceDetail', { deviceId: item.device_id });
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 2));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.2));
  };

  const resetZoom = () => {
    setScale(0.5);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!mapData || !mapData.items || mapData.items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="map" size={64} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>Brak danych mapy</Text>
      </View>
    );
  }

  const svgWidth = mapData.canvasWidth * scale;
  const svgHeight = mapData.canvasHeight * scale;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mapa sieci</Text>
        <Text style={styles.headerSubtitle}>
          {mapData.items.length} urządzeń • Layout z The Dude
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={zoomIn}>
          <Icon name="zoom-in" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={resetZoom}>
          <Text style={styles.scaleText}>{Math.round(scale * 100)}%</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={zoomOut}>
          <Icon name="zoom-out" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Mapa SVG - SCROLLABLE */}
      <ScrollView 
        style={styles.mapContainer}
        contentContainerStyle={{ 
          width: svgWidth, 
          height: svgHeight,
        }}
        horizontal={true}
      >
        <ScrollView>
          <Svg width={svgWidth} height={svgHeight}>
            {/* Linie połączeń */}
            {mapData.connections.map((conn, index) => (
              <Line
                key={`conn-${index}`}
                x1={conn.from.x * scale}
                y1={conn.from.y * scale}
                x2={conn.to.x * scale}
                y2={conn.to.y * scale}
                stroke={
                  conn.to.status === 'offline' 
                    ? COLORS.offline 
                    : COLORS.border
                }
                strokeWidth={2 * scale}
                strokeDasharray={
                  conn.to.status === 'offline' 
                    ? `${5 * scale},${5 * scale}` 
                    : "0"
                }
              />
            ))}

            {/* Nodes - urządzenia */}
            {mapData.items.map((item) => {
              const isRouter = item.type === 'router' || item.ip === '192.168.111.209';
              const size = isRouter ? 60 : 40;
              const color = getStatusColor(item.status);
              const scaledSize = size * scale;

              return (
                <React.Fragment key={`node-${item.device_id}`}>
                  {/* Kształt urządzenia */}
                  {isRouter ? (
                    <Circle
                      cx={item.x * scale}
                      cy={item.y * scale}
                      r={scaledSize / 2}
                      fill={color}
                      stroke={COLORS.text}
                      strokeWidth={3 * scale}
                      onPress={() => handleNodePress(item)}
                    />
                  ) : (
                    <Rect
                      x={(item.x - size / 2) * scale}
                      y={(item.y - size / 2) * scale}
                      width={scaledSize}
                      height={scaledSize}
                      rx={6 * scale}
                      fill={color}
                      stroke={COLORS.border}
                      strokeWidth={2 * scale}
                      onPress={() => handleNodePress(item)}
                    />
                  )}

                  {/* Nazwa urządzenia - tylko jeśli scale > 0.4 */}
                  {scale > 0.4 && (
                    <SvgText
                      x={item.x * scale}
                      y={(item.y + size / 2 + 15) * scale}
                      fontSize={Math.max(10 * scale, 8)}
                      fill={COLORS.text}
                      textAnchor="middle"
                      fontWeight="600"
                    >
                      {item.name.length > 18 
                        ? item.name.substring(0, 18) + '...' 
                        : item.name}
                    </SvgText>
                  )}

                  {/* IP - tylko jeśli scale > 0.6 */}
                  {scale > 0.6 && (
                    <SvgText
                      x={item.x * scale}
                      y={(item.y + size / 2 + 28) * scale}
                      fontSize={Math.max(8 * scale, 6)}
                      fill={COLORS.textSecondary}
                      textAnchor="middle"
                    >
                      {item.ip}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>
        </ScrollView>
      </ScrollView>

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.online }]} />
          <Text style={styles.legendText}>Online</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.offline }]} />
          <Text style={styles.legendText}>Offline</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>Warning</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.backgroundSecondary,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
    backgroundColor: COLORS.backgroundSecondary,
  },
  controlButton: {
    width: 60,
    height: 48,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scaleText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 16,
    gap: 20,
    backgroundColor: COLORS.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.text,
  },
});

export default MapScreen;